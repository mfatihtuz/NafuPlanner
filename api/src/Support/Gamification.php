<?php

declare(strict_types=1);

namespace Nafu\Support;

use DateTimeImmutable;
use DateTimeZone;
use PDO;

/**
 * Oyunlastirma motoru: gorev tamamlaninca puan, seri (streak) ve rozet isler.
 *
 * - Puan: oncelik agirlikli (dusuk 5 / normal 10 / yuksek 15) + erken bitirme bonusu.
 * - Seri: kullanicinin kendi saat dilimine gore ardisik gun sayisi.
 * - Rozet: np_badges esiklerine ulasinca np_member_badges'e eklenir.
 *
 * Sayaclar np_group_members uzerinde onbelleklenir; kaynak np_points_ledger.
 */
final class Gamification
{
    /** Oncelik (0=dusuk,1=normal,2=yuksek) -> taban puan. */
    private const BASE_POINTS = [0 => 5, 1 => 10, 2 => 15];

    /** Son tarihten bu kadar saniye once bitirilirse erken bonusu. */
    private const EARLY_THRESHOLD_SEC = 86400; // 24 saat
    private const EARLY_BONUS = 5;

    public function __construct(private PDO $pdo)
    {
    }

    /** Toplam puandan basit seviye: her 100 puan bir seviye. */
    public static function levelFor(int $points): int
    {
        return 1 + intdiv(max(0, $points), 100);
    }

    /**
     * Gorev tamamlandiginda cagrilir. Puan/seri/rozet isler ve kutlama ozeti doner.
     *
     * @param array<string,mixed> $task np_tasks satiri (tamamlanmadan onceki)
     * @return array{points:int,total_points:int,streak:int,level:int,new_badges:array<int,array<string,string>>}
     */
    public function awardForCompletion(int $memberId, int $groupId, int $userId, array $task, string $tz): array
    {
        $priority = (int) ($task['priority'] ?? 1);
        $points = self::BASE_POINTS[$priority] ?? 10;

        // Erken bitirme bonusu (son tarihten >= 24 saat once)
        $early = false;
        if (!empty($task['due_at'])) {
            $due = strtotime((string) $task['due_at'] . ' UTC');
            if ($due !== false && ($due - time()) >= self::EARLY_THRESHOLD_SEC) {
                $points += self::EARLY_BONUS;
                $early = true;
            }
        }

        // Puan defterine yaz
        $this->pdo->prepare(
            'INSERT INTO np_points_ledger (group_id, user_id, task_id, points, reason)
             VALUES (:g, :u, :t, :p, :r)'
        )->execute([
            ':g' => $groupId, ':u' => $userId, ':t' => (int) $task['id'],
            ':p' => $points, ':r' => 'task_completed',
        ]);

        // Uye toplam puan onbellegini guncelle
        $this->pdo->prepare('UPDATE np_group_members SET points = points + :p WHERE id = :id')
            ->execute([':p' => $points, ':id' => $memberId]);

        // Seri (gunluk)
        $streak = $this->updateStreak($memberId, $tz);

        $totalPoints = (int) $this->scalar(
            'SELECT points FROM np_group_members WHERE id = :id',
            [':id' => $memberId]
        );

        $newBadges = $this->checkBadges($memberId, $groupId, $userId, $totalPoints, $streak, $early);

        return [
            'points' => $points,
            'total_points' => $totalPoints,
            'streak' => $streak,
            'level' => self::levelFor($totalPoints),
            'new_badges' => $newBadges,
        ];
    }

    /**
     * Tamamlama geri alininca bu gorev+kullanici icin puanlari geri al.
     * Seri ve rozetler kasitli olarak geri alinmaz (sadelik).
     */
    public function revokeForCompletion(int $memberId, int $userId, int $taskId): void
    {
        $sum = (int) $this->scalar(
            "SELECT COALESCE(SUM(points), 0) FROM np_points_ledger
              WHERE task_id = :t AND user_id = :u AND reason = 'task_completed'",
            [':t' => $taskId, ':u' => $userId]
        );
        if ($sum === 0) {
            return;
        }
        $this->pdo->prepare(
            "DELETE FROM np_points_ledger WHERE task_id = :t AND user_id = :u AND reason = 'task_completed'"
        )->execute([':t' => $taskId, ':u' => $userId]);
        $this->pdo->prepare('UPDATE np_group_members SET points = GREATEST(0, points - :p) WHERE id = :id')
            ->execute([':p' => $sum, ':id' => $memberId]);
    }

    /** Seriyi gunceller ve guncel ardisik gun sayisini doner. */
    private function updateStreak(int $memberId, string $tz): int
    {
        try {
            $zone = new DateTimeZone($tz);
        } catch (\Throwable) {
            $zone = new DateTimeZone('UTC');
        }
        $today = (new DateTimeImmutable('now', $zone))->format('Y-m-d');
        $yesterday = (new DateTimeImmutable('now', $zone))->modify('-1 day')->format('Y-m-d');

        $stmt = $this->pdo->prepare(
            'SELECT streak_current, streak_best, last_completed_date
               FROM np_group_members WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $memberId]);
        $m = $stmt->fetch();

        $cur = (int) ($m['streak_current'] ?? 0);
        $best = (int) ($m['streak_best'] ?? 0);
        $last = $m['last_completed_date'] ?? null;

        if ($last === $today) {
            return $cur; // bugun zaten sayildi
        }
        $cur = ($last === $yesterday) ? $cur + 1 : 1;
        $best = max($best, $cur);

        $this->pdo->prepare(
            'UPDATE np_group_members
                SET streak_current = :c, streak_best = :b, last_completed_date = :d
              WHERE id = :id'
        )->execute([':c' => $cur, ':b' => $best, ':d' => $today, ':id' => $memberId]);

        return $cur;
    }

    /**
     * Esigi yeni asilan rozetleri np_member_badges'e ekler ve listeler.
     *
     * @return array<int,array<string,string>>
     */
    private function checkBadges(int $memberId, int $groupId, int $userId, int $totalPoints, int $streak, bool $early): array
    {
        $tasksCompleted = (int) $this->scalar(
            "SELECT COUNT(*) FROM np_tasks
              WHERE group_id = :g AND completed_by = :u AND status = 'done'",
            [':g' => $groupId, ':u' => $userId]
        );

        $earned = [];
        $e = $this->pdo->prepare('SELECT badge_id FROM np_member_badges WHERE group_member_id = :m');
        $e->execute([':m' => $memberId]);
        foreach ($e->fetchAll(PDO::FETCH_COLUMN) as $bid) {
            $earned[(int) $bid] = true;
        }

        $badges = $this->pdo->query(
            'SELECT id, code, name, description, icon, threshold_type, threshold_value FROM np_badges'
        )->fetchAll();

        $new = [];
        foreach ($badges as $b) {
            $bid = (int) $b['id'];
            if (isset($earned[$bid])) {
                continue;
            }
            $val = (int) $b['threshold_value'];
            $met = match ((string) $b['threshold_type']) {
                'tasks_completed' => $tasksCompleted >= $val,
                'streak_days'     => $streak >= $val,
                'points_total'    => $totalPoints >= $val,
                'early_complete'  => $early,
                default           => false, // zero_overdue vb. su an otomatik islenmiyor
            };
            if (!$met) {
                continue;
            }
            try {
                $this->pdo->prepare(
                    'INSERT INTO np_member_badges (group_member_id, badge_id) VALUES (:m, :b)'
                )->execute([':m' => $memberId, ':b' => $bid]);
                $new[] = [
                    'code' => (string) $b['code'],
                    'name' => (string) $b['name'],
                    'description' => (string) $b['description'],
                    'icon' => (string) $b['icon'],
                ];
            } catch (\Throwable) {
                // yaris durumunda cift ekleme - yoksay
            }
        }
        return $new;
    }

    /** @param array<string,mixed> $args */
    private function scalar(string $sql, array $args): mixed
    {
        $s = $this->pdo->prepare($sql);
        $s->execute($args);
        return $s->fetchColumn();
    }
}
