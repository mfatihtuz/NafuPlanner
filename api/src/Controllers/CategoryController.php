<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Kategori uc noktalari.
 *
 *   GET    /api/groups/{id}/categories   grup kategorileri (sirali)
 *   POST   /api/groups/{id}/categories   kategori olustur
 *   PATCH  /api/categories/{id}          kategori guncelle
 *   DELETE /api/categories/{id}          kategori sil
 *
 * Not: grup olusturulurken varsayilan kategoriler GroupController tarafindan
 * tohumlanir; bu denetleyici sonraki CRUD islemleri icindir.
 */
final class CategoryController extends Controller
{
    /**
     * Grubun kategorileri (sort_order, sonra ad).
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, color, icon, sort_order, is_default, created_at
               FROM np_categories
              WHERE group_id = :gid
              ORDER BY sort_order ASC, name ASC'
        );
        $stmt->execute([':gid' => $groupId]);
        return Serialize::rows($stmt->fetchAll(), Serialize::CATEGORY);
    }

    /**
     * Kategori olusturur.
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $body = $request->json();
        $v = new Validator($body);
        $v->required('name')->string('name', 1, 80)
          ->string('color', 0, 24)->string('icon', 0, 50)->integer('sort_order')->check();

        $name  = trim((string) $body['name']);
        $color = $this->nonEmpty($body['color'] ?? null, 'teal');
        $icon  = $this->nonEmpty($body['icon'] ?? null, 'list');
        $sort  = isset($body['sort_order']) && $body['sort_order'] !== null
            ? (int) $body['sort_order'] : $this->nextSort($groupId);

        $stmt = $this->db()->prepare(
            'INSERT INTO np_categories (group_id, name, color, icon, sort_order, is_default)
             VALUES (:gid, :name, :color, :icon, :sort, 0)'
        );
        $stmt->execute([
            ':gid' => $groupId, ':name' => $name, ':color' => $color,
            ':icon' => $icon, ':sort' => $sort,
        ]);

        return $this->loadCategory((int) $this->db()->lastInsertId());
    }

    /**
     * Kategori guncelleme (alan-bazli).
     *
     * @return array<string,mixed>
     */
    public function update(Request $request, array $params): array
    {
        $categoryId = $this->intParam($params, 'id');
        $this->requireCategoryAsMember($categoryId);

        $body = $request->json();
        $v = new Validator($body);
        $v->string('name', 1, 80)->string('color', 0, 24)
          ->string('icon', 0, 50)->integer('sort_order')->check();

        $fields = [];
        $args = [':id' => $categoryId];
        foreach (['name', 'color', 'icon'] as $col) {
            if (array_key_exists($col, $body) && $body[$col] !== null && trim((string) $body[$col]) !== '') {
                $fields[] = "$col = :$col";
                $args[":$col"] = trim((string) $body[$col]);
            }
        }
        if (array_key_exists('sort_order', $body) && $body['sort_order'] !== null) {
            $fields[] = 'sort_order = :sort_order';
            $args[':sort_order'] = (int) $body['sort_order'];
        }

        if ($fields !== []) {
            $sql = 'UPDATE np_categories SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $this->db()->prepare($sql)->execute($args);
        }

        return $this->loadCategory($categoryId);
    }

    /**
     * Kategori siler. Iliskili gorevlerin category_id alani SET NULL olur (FK).
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $categoryId = $this->intParam($params, 'id');
        $this->requireCategoryAsMember($categoryId);

        $stmt = $this->db()->prepare('DELETE FROM np_categories WHERE id = :id');
        $stmt->execute([':id' => $categoryId]);

        return ['deleted' => true];
    }

    // --- Yardimcilar -------------------------------------------------------

    private function nonEmpty(mixed $value, string $default): string
    {
        $s = is_string($value) ? trim($value) : '';
        return $s !== '' ? $s : $default;
    }

    private function nextSort(int $groupId): int
    {
        $stmt = $this->db()->prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 FROM np_categories WHERE group_id = :gid'
        );
        $stmt->execute([':gid' => $groupId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Kategoriyi getirir ve kullanicinin grubuna uyeligini dogrular.
     *
     * @return array<string,mixed>
     */
    private function requireCategoryAsMember(int $categoryId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, group_id FROM np_categories WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $categoryId]);
        $cat = $stmt->fetch();
        if ($cat === false) {
            throw ApiException::notFound('Kategori bulunamadi.');
        }
        $this->auth->requireGroupMember((int) $cat['group_id']);
        return $cat;
    }

    /**
     * @return array<string,mixed>
     */
    private function loadCategory(int $categoryId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, color, icon, sort_order, is_default, created_at
               FROM np_categories WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $categoryId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Kategori bulunamadi.');
        }
        return Serialize::row($row, Serialize::CATEGORY);
    }
}
