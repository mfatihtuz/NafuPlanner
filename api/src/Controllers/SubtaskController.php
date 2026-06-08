<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Alt gorev uc noktalari.
 *
 *   POST   /api/tasks/{id}/subtasks   gorevin altina alt gorev ekle
 *   PATCH  /api/subtasks/{id}         alt gorevi guncelle (baslik / done / sira)
 *   DELETE /api/subtasks/{id}         alt gorevi sil
 *
 * Yetki: alt gorevin grubu gorevden cozulur; kullanici o grubun uyesi olmali.
 */
final class SubtaskController extends Controller
{
    /**
     * Goreve alt gorev ekler.
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $taskId = $this->intParam($params, 'id');
        $this->requireTaskAsMember($taskId);

        $body = $request->json();
        $v = new Validator($body);
        $v->required('title')->string('title', 1, 255)->integer('sort_order')->check();

        $title = trim((string) $body['title']);
        $sort = isset($body['sort_order']) && $body['sort_order'] !== null
            ? (int) $body['sort_order'] : $this->nextSort($taskId);

        $stmt = $this->db()->prepare(
            'INSERT INTO np_subtasks (task_id, title, sort_order) VALUES (:tid, :title, :sort)'
        );
        $stmt->execute([':tid' => $taskId, ':title' => $title, ':sort' => $sort]);

        return $this->loadSubtask((int) $this->db()->lastInsertId());
    }

    /**
     * Alt gorev guncelleme (title, done, sort_order).
     *
     * @return array<string,mixed>
     */
    public function update(Request $request, array $params): array
    {
        $subtaskId = $this->intParam($params, 'id');
        $this->requireSubtaskAsMember($subtaskId);

        $body = $request->json();
        $v = new Validator($body);
        $v->string('title', 1, 255)->integer('sort_order')->check();

        $fields = [];
        $args = [':id' => $subtaskId];
        if (array_key_exists('title', $body) && $body['title'] !== null && trim((string) $body['title']) !== '') {
            $fields[] = 'title = :title';
            $args[':title'] = trim((string) $body['title']);
        }
        if (array_key_exists('done', $body)) {
            $fields[] = 'done = :done';
            $args[':done'] = !empty($body['done']) ? 1 : 0;
        }
        if (array_key_exists('sort_order', $body) && $body['sort_order'] !== null) {
            $fields[] = 'sort_order = :sort';
            $args[':sort'] = (int) $body['sort_order'];
        }

        if ($fields !== []) {
            $sql = 'UPDATE np_subtasks SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $this->db()->prepare($sql)->execute($args);
        }

        return $this->loadSubtask($subtaskId);
    }

    /**
     * Alt gorev silme.
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $subtaskId = $this->intParam($params, 'id');
        $this->requireSubtaskAsMember($subtaskId);

        $stmt = $this->db()->prepare('DELETE FROM np_subtasks WHERE id = :id');
        $stmt->execute([':id' => $subtaskId]);

        return ['deleted' => true];
    }

    // --- Yardimcilar -------------------------------------------------------

    private function nextSort(int $taskId): int
    {
        $stmt = $this->db()->prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 FROM np_subtasks WHERE task_id = :tid'
        );
        $stmt->execute([':tid' => $taskId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Alt gorevi getirir ve gorevin grubuna uyeligi dogrular.
     *
     * @return array<string,mixed>
     */
    private function requireSubtaskAsMember(int $subtaskId): array
    {
        $stmt = $this->db()->prepare('SELECT id, task_id FROM np_subtasks WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $subtaskId]);
        $sub = $stmt->fetch();
        if ($sub === false) {
            throw ApiException::notFound('Alt görev bulunamadı.');
        }
        $this->requireTaskAsMember((int) $sub['task_id']);
        return $sub;
    }

    /**
     * @return array<string,mixed>
     */
    private function loadSubtask(int $subtaskId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, task_id, title, done, sort_order, created_at
               FROM np_subtasks WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $subtaskId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Alt görev bulunamadı.');
        }
        return Serialize::row($row, Serialize::SUBTASK);
    }
}
