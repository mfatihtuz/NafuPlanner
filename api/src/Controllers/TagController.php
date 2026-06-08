<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Etiket uc noktalari.
 *
 *   GET    /api/groups/{id}/tags   grup etiketleri
 *   POST   /api/groups/{id}/tags   etiket olustur (grup icinde ad benzersiz)
 */
final class TagController extends Controller
{
    /**
     * Grubun etiketleri (ada gore sirali).
     *
     * @return array<int,array<string,mixed>>
     */
    public function index(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, color FROM np_tags WHERE group_id = :gid ORDER BY name ASC'
        );
        $stmt->execute([':gid' => $groupId]);
        return Serialize::rows($stmt->fetchAll(), Serialize::TAG);
    }

    /**
     * Etiket olusturur. Ayni ad varsa mevcut olani doner (idempotent).
     *
     * @return array<string,mixed>
     */
    public function create(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $body = $request->json();
        $v = new Validator($body);
        $v->required('name')->string('name', 1, 60)->string('color', 0, 24)->check();

        $name  = trim((string) $body['name']);
        $color = is_string($body['color'] ?? null) && trim((string) $body['color']) !== ''
            ? trim((string) $body['color']) : 'pearl_aqua';

        // Var olan ayni adli etiketi dene (grup icinde benzersiz).
        $existing = $this->db()->prepare(
            'SELECT id, group_id, name, color FROM np_tags WHERE group_id = :gid AND name = :name LIMIT 1'
        );
        $existing->execute([':gid' => $groupId, ':name' => $name]);
        $row = $existing->fetch();
        if ($row !== false) {
            return Serialize::row($row, Serialize::TAG);
        }

        $stmt = $this->db()->prepare(
            'INSERT INTO np_tags (group_id, name, color) VALUES (:gid, :name, :color)'
        );
        $stmt->execute([':gid' => $groupId, ':name' => $name, ':color' => $color]);

        return $this->loadTag((int) $this->db()->lastInsertId());
    }

    /**
     * @return array<string,mixed>
     */
    private function loadTag(int $tagId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, group_id, name, color FROM np_tags WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $tagId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Etiket bulunamadi.');
        }
        return Serialize::row($row, Serialize::TAG);
    }
}
