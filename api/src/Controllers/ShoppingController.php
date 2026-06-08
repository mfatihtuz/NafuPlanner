<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Alisveris listesi uc noktalari.
 *
 *   GET    /api/groups/{id}/shopping   liste (isaretsizler once)
 *   POST   /api/groups/{id}/shopping   urun ekle
 *   PATCH  /api/shopping/{id}          urun guncelle
 *   POST   /api/shopping/{id}/toggle   isaretle / kaldir
 *   DELETE /api/shopping/{id}          urun sil
 */
final class ShoppingController extends Controller
{
    /**
     * Grubun alisveris listesi. Isaretsizler once, sonra siraya/eklenme zamanina gore.
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, quantity, note, checked, checked_by, checked_at,
                    added_by, sort_order, created_at, updated_at
               FROM np_shopping_items
              WHERE group_id = :gid
              ORDER BY checked ASC, sort_order ASC, created_at ASC'
        );
        $stmt->execute([':gid' => $groupId]);
        return Serialize::rows($stmt->fetchAll(), Serialize::SHOPPING);
    }

    /**
     * Alisveris urunu ekler.
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $member  = $this->auth->requireGroupMember($groupId);
        $userId  = (int) $member['user_id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->required('name')->string('name', 1, 255)
          ->string('quantity', 0, 50)->string('note', 0, 255)->check();

        $name     = trim((string) $body['name']);
        $quantity = $this->nullable($body['quantity'] ?? null, 50);
        $note     = $this->nullable($body['note'] ?? null, 255);
        $sort     = $this->nextSort($groupId);

        $stmt = $this->db()->prepare(
            'INSERT INTO np_shopping_items (group_id, name, quantity, note, added_by, sort_order)
             VALUES (:gid, :name, :qty, :note, :uid, :sort)'
        );
        $stmt->execute([
            ':gid' => $groupId, ':name' => $name, ':qty' => $quantity,
            ':note' => $note, ':uid' => $userId, ':sort' => $sort,
        ]);
        $itemId = (int) $this->db()->lastInsertId();

        $this->logActivity(
            $groupId,
            $userId,
            'shopping_added',
            'shopping_item',
            $itemId,
            sprintf('%s alışveriş listesine ekledi: %s', $this->actorLabel($member['display_name'] ?? null, $userId), $name),
            ['name' => $name]
        );

        return $this->loadItem($itemId);
    }

    /**
     * Urun guncelleme (name, quantity, note, sort_order).
     *
     * @return array<string,mixed>
     */
    public function update(Request $request, array $params): array
    {
        $itemId = $this->intParam($params, 'id');
        $this->requireItemAsMember($itemId);

        $body = $request->json();
        $v = new Validator($body);
        $v->string('name', 1, 255)->string('quantity', 0, 50)
          ->string('note', 0, 255)->integer('sort_order')->check();

        $fields = [];
        $args = [':id' => $itemId];
        if (array_key_exists('name', $body) && $body['name'] !== null && trim((string) $body['name']) !== '') {
            $fields[] = 'name = :name';
            $args[':name'] = trim((string) $body['name']);
        }
        if (array_key_exists('quantity', $body)) {
            $fields[] = 'quantity = :qty';
            $args[':qty'] = $this->nullable($body['quantity'], 50);
        }
        if (array_key_exists('note', $body)) {
            $fields[] = 'note = :note';
            $args[':note'] = $this->nullable($body['note'], 255);
        }
        if (array_key_exists('sort_order', $body) && $body['sort_order'] !== null) {
            $fields[] = 'sort_order = :sort';
            $args[':sort'] = (int) $body['sort_order'];
        }

        if ($fields !== []) {
            $sql = 'UPDATE np_shopping_items SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $this->db()->prepare($sql)->execute($args);
        }

        return $this->loadItem($itemId);
    }

    /**
     * İsaretle/kaldir. Govdede 'checked' verilirse o deger, yoksa tersine cevirir.
     *
     * @return array<string,mixed>
     */
    public function toggle(Request $request, array $params): array
    {
        $itemId = $this->intParam($params, 'id');
        $item = $this->requireItemAsMember($itemId);
        $userId = $this->auth->requireUserId();
        $groupId = (int) $item['group_id'];

        $body = $request->json();
        $checked = array_key_exists('checked', $body)
            ? !empty($body['checked'])
            : !((int) $item['checked'] === 1);

        if ($checked) {
            $now = gmdate('Y-m-d H:i:s');
            $stmt = $this->db()->prepare(
                'UPDATE np_shopping_items
                    SET checked = 1, checked_by = :uid, checked_at = :now
                  WHERE id = :id'
            );
            $stmt->execute([':uid' => $userId, ':now' => $now, ':id' => $itemId]);
        } else {
            $stmt = $this->db()->prepare(
                'UPDATE np_shopping_items
                    SET checked = 0, checked_by = NULL, checked_at = NULL
                  WHERE id = :id'
            );
            $stmt->execute([':id' => $itemId]);
        }

        $this->logActivity(
            $groupId,
            $userId,
            $checked ? 'shopping_checked' : 'shopping_unchecked',
            'shopping_item',
            $itemId,
            sprintf(
                '%s %s',
                (string) $item['name'],
                $checked ? 'alındı olarak işaretlendi' : 'işareti kaldırıldı'
            ),
            ['name' => $item['name']]
        );

        return $this->loadItem($itemId);
    }

    /**
     * Urun silme.
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $itemId = $this->intParam($params, 'id');
        $this->requireItemAsMember($itemId);

        $stmt = $this->db()->prepare('DELETE FROM np_shopping_items WHERE id = :id');
        $stmt->execute([':id' => $itemId]);

        return ['deleted' => true];
    }

    // --- Yardimcilar -------------------------------------------------------

    private function nullable(mixed $value, int $max): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }
        return mb_substr($s, 0, $max);
    }

    private function nextSort(int $groupId): int
    {
        $stmt = $this->db()->prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 FROM np_shopping_items WHERE group_id = :gid'
        );
        $stmt->execute([':gid' => $groupId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Urunu getirir ve grubuna uyeligi dogrular.
     *
     * @return array<string,mixed>
     */
    private function requireItemAsMember(int $itemId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, checked FROM np_shopping_items WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $itemId]);
        $item = $stmt->fetch();
        if ($item === false) {
            throw ApiException::notFound('Ürün bulunamadı.');
        }
        $this->auth->requireGroupMember((int) $item['group_id']);
        return $item;
    }

    /**
     * @return array<string,mixed>
     */
    private function loadItem(int $itemId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, quantity, note, checked, checked_by, checked_at,
                    added_by, sort_order, created_at, updated_at
               FROM np_shopping_items WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $itemId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Ürün bulunamadı.');
        }
        return Serialize::row($row, Serialize::SHOPPING);
    }
}
