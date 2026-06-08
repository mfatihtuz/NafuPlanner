<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Gorev yorumu uc noktalari.
 *
 *   GET   /api/tasks/{id}/comments   gorevin yorumlari (eskiden yeniye)
 *   POST  /api/tasks/{id}/comments   yorum ekle
 *
 * Yetki: gorevin grubu cozulur; kullanici o grubun uyesi olmali.
 */
final class CommentController extends Controller
{
    /**
     * Gorevin yorumlari (kullanici ozetiyle).
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $this->requireTaskAsMember($taskId);

        $stmt = $this->db()->prepare(
            'SELECT c.id, c.task_id, c.user_id, c.body, c.created_at,
                    u.name AS u_name, u.avatar_url AS u_avatar_url
               FROM np_task_comments c
               JOIN np_users u ON u.id = c.user_id
              WHERE c.task_id = :tid
              ORDER BY c.created_at ASC, c.id ASC'
        );
        $stmt->execute([':tid' => $taskId]);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = $this->shapeComment($row);
        }
        return $out;
    }

    /**
     * Yorum ekler ve aktivite akisina yazar.
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $task = $this->requireTaskAsMember($taskId);
        $userId = $this->auth->requireUserId();
        $groupId = (int) $task['group_id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->required('body')->string('body', 1, 65535)->check();

        $text = trim((string) $body['body']);

        $stmt = $this->db()->prepare(
            'INSERT INTO np_task_comments (task_id, user_id, body) VALUES (:tid, :uid, :body)'
        );
        $stmt->execute([':tid' => $taskId, ':uid' => $userId, ':body' => $text]);
        $commentId = (int) $this->db()->lastInsertId();

        $this->logActivity(
            $groupId,
            $userId,
            'comment_added',
            'task',
            $taskId,
            sprintf('%s gorevine yorum ekledi', (string) $task['title']),
            ['title' => $task['title']]
        );

        return $this->loadComment($commentId);
    }

    // --- Yardimcilar -------------------------------------------------------

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function shapeComment(array $row): array
    {
        $user = [
            'id'         => $row['user_id'],
            'name'       => $row['u_name'] ?? null,
            'avatar_url' => $row['u_avatar_url'] ?? null,
        ];
        unset($row['u_name'], $row['u_avatar_url']);
        $comment = Serialize::row($row, Serialize::COMMENT);
        $comment['user'] = Serialize::row($user, Serialize::USER_SUMMARY);
        return $comment;
    }

    /**
     * @return array<string,mixed>
     */
    private function loadComment(int $commentId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT c.id, c.task_id, c.user_id, c.body, c.created_at,
                    u.name AS u_name, u.avatar_url AS u_avatar_url
               FROM np_task_comments c
               JOIN np_users u ON u.id = c.user_id
              WHERE c.id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $commentId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Yorum bulunamadi.');
        }
        return $this->shapeComment($row);
    }
}
