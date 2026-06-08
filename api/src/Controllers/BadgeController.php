<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;

/**
 * Rozetler (oyunlastirma).
 *
 *   GET /api/groups/{id}/badges
 *
 * Tum rozet katalogunu; cagiran uyenin kazanip kazanmadigini ve olculebilen
 * turlerde ilerlemesini (mevcut deger) doner.
 */
final class BadgeController extends Controller
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $member = $this->auth->requireGroupMember($groupId);
        $memberId = (int) $member['id'];
        $userId = (int) $member['user_id'];

        // Kazanilan rozetler
        $earned = [];
        $e = $this->db()->prepare(
            'SELECT badge_id, earned_at FROM np_member_badges WHERE group_member_id = :m'
        );
        $e->execute([':m' => $memberId]);
        foreach ($e->fetchAll() as $r) {
            $earned[(int) $r['badge_id']] = $r['earned_at'];
        }

        // Ilerleme icin guncel degerler
        $points = (int) $member['points'];
        $streakBest = (int) $member['streak_best'];
        $tasksCompleted = (int) $this->scalarCompleted($groupId, $userId);

        $badges = $this->db()->query(
            'SELECT id, code, name, description, icon, threshold_type, threshold_value
               FROM np_badges
              ORDER BY threshold_type, threshold_value'
        )->fetchAll();

        $out = [];
        foreach ($badges as $b) {
            $bid = (int) $b['id'];
            $type = (string) $b['threshold_type'];
            $progress = match ($type) {
                'tasks_completed' => $tasksCompleted,
                'streak_days'     => $streakBest,
                'points_total'    => $points,
                default           => null, // erken bitirme vb. olculmuyor
            };
            $out[] = [
                'code'            => (string) $b['code'],
                'name'            => (string) $b['name'],
                'description'     => (string) $b['description'],
                'icon'            => (string) $b['icon'],
                'threshold_type'  => $type,
                'threshold_value' => (int) $b['threshold_value'],
                'earned'          => isset($earned[$bid]),
                'earned_at'       => $earned[$bid] ?? null,
                'progress'        => $progress,
            ];
        }
        return $out;
    }

    private function scalarCompleted(int $groupId, int $userId): int
    {
        $s = $this->db()->prepare(
            "SELECT COUNT(*) FROM np_tasks
              WHERE group_id = :g AND completed_by = :u AND status = 'done'"
        );
        $s->execute([':g' => $groupId, ':u' => $userId]);
        return (int) $s->fetchColumn();
    }
}
