<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\Gamification;

/**
 * Katki tablosu (oyunlastirma).
 *
 *   GET /api/groups/{id}/leaderboard
 *
 * Uyeleri toplam puana gore siralar; haftalik puan, seri, seviye, rozet sayisi
 * ve tamamlanan gorev sayisini doner.
 */
final class LeaderboardController extends Controller
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        // Son 7 gunluk puan (haftalik tablo) - puan defterinden
        $weekly = [];
        $w = $this->db()->prepare(
            "SELECT user_id, COALESCE(SUM(points), 0) AS wp
               FROM np_points_ledger
              WHERE group_id = :g AND created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
              GROUP BY user_id"
        );
        $w->execute([':g' => $groupId]);
        foreach ($w->fetchAll() as $r) {
            $weekly[(int) $r['user_id']] = (int) $r['wp'];
        }

        $stmt = $this->db()->prepare(
            "SELECT m.id AS member_id, m.user_id, m.points, m.streak_current, m.streak_best,
                    m.display_name, u.name, u.avatar_url,
                    (SELECT COUNT(*) FROM np_member_badges mb WHERE mb.group_member_id = m.id) AS badge_count,
                    (SELECT COUNT(*) FROM np_tasks t
                      WHERE t.group_id = m.group_id AND t.completed_by = m.user_id AND t.status = 'done'
                    ) AS tasks_completed
               FROM np_group_members m
               JOIN np_users u ON u.id = m.user_id
              WHERE m.group_id = :g
              ORDER BY m.points DESC, m.streak_current DESC, u.name ASC"
        );
        $stmt->execute([':g' => $groupId]);

        $out = [];
        $rank = 0;
        foreach ($stmt->fetchAll() as $r) {
            $rank++;
            $points = (int) $r['points'];
            $displayName = trim((string) ($r['display_name'] ?? ''));
            $out[] = [
                'user_id'         => (int) $r['user_id'],
                'name'            => $displayName !== '' ? $displayName : (string) $r['name'],
                'avatar_url'      => $r['avatar_url'],
                'rank'            => $rank,
                'points'          => $points,
                'weekly_points'   => $weekly[(int) $r['user_id']] ?? 0,
                'level'           => Gamification::levelFor($points),
                'streak_current'  => (int) $r['streak_current'],
                'streak_best'     => (int) $r['streak_best'],
                'badge_count'     => (int) $r['badge_count'],
                'tasks_completed' => (int) $r['tasks_completed'],
            ];
        }
        return $out;
    }
}
