<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\Serialize;

/**
 * Aktivite akisi uc noktasi.
 *
 *   GET /api/groups/{id}/activity?before=<id>&limit=<n>
 *
 * Sayfalama: before verilirse o id'den kucuk (daha eski) kayitlar dondurulur;
 * yeni-eski siralidir. Her satira aktor (kullanici) ozeti gomulur.
 */
final class ActivityController extends Controller
{
    private const DEFAULT_LIMIT = 30;
    private const MAX_LIMIT = 100;

    /**
     * Grubun aktivite akisi (yeniden eskiye).
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $before = $request->query('before');
        $limit  = (int) ($request->query('limit', (string) self::DEFAULT_LIMIT) ?? self::DEFAULT_LIMIT);
        $limit  = max(1, min(self::MAX_LIMIT, $limit));

        $where = ['a.group_id = :gid'];
        $args  = [':gid' => $groupId];
        if ($before !== null && $before !== '' && ctype_digit($before)) {
            $where[] = 'a.id < :before';
            $args[':before'] = (int) $before;
        }

        // LIMIT degeri tamsayiya zorlandi (sanitize); guvenle gomulur.
        $sql = 'SELECT a.id, a.group_id, a.actor_user_id, a.action, a.target_type,
                       a.target_id, a.summary, a.meta, a.created_at,
                       u.name AS u_name, u.avatar_url AS u_avatar_url
                  FROM np_activity_log a
                  LEFT JOIN np_users u ON u.id = a.actor_user_id
                 WHERE ' . implode(' AND ', $where) . '
                 ORDER BY a.id DESC
                 LIMIT ' . $limit;

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($args);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $actor = null;
            if ($row['actor_user_id'] !== null) {
                $actor = Serialize::row([
                    'id'         => $row['actor_user_id'],
                    'name'       => $row['u_name'] ?? null,
                    'avatar_url' => $row['u_avatar_url'] ?? null,
                ], Serialize::USER_SUMMARY);
            }
            unset($row['u_name'], $row['u_avatar_url']);
            $activity = Serialize::row($row, Serialize::ACTIVITY);
            $activity['actor'] = $actor;
            $out[] = $activity;
        }
        return $out;
    }
}
