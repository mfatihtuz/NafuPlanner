<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Grup uc noktalari.
 *
 *   GET    /api/groups              uyesi olunan gruplar
 *   POST   /api/groups              grup olustur (+ owner uyeligi + varsayilan kategoriler)
 *   GET    /api/groups/{id}         grup ayrintisi
 *   PATCH  /api/groups/{id}         grup guncelle (yalniz owner)
 *   DELETE /api/groups/{id}         grup sil (yalniz owner)
 *   GET    /api/groups/{id}/members uye listesi
 */
final class GroupController extends Controller
{
    /**
     * Yeni grup olusturulurken tohumlanan varsayilan kategoriler.
     * Renkler palet anahtarlari, ikonlar Lucide adlaridir.
     *
     * @var array<int,array{name:string,color:string,icon:string}>
     */
    private const DEFAULT_CATEGORIES = [
        ['name' => 'Ev İşleri',     'color' => 'tropical_teal', 'icon' => 'home'],
        ['name' => 'Yapılacaklar',  'color' => 'stormy_teal',   'icon' => 'list-checks'],
        ['name' => 'Alışveriş',     'color' => 'pearl_aqua',    'icon' => 'shopping-cart'],
        ['name' => 'Faturalar',     'color' => 'teal',          'icon' => 'receipt'],
    ];

    /**
     * Kullanicinin uyesi oldugu gruplar.
     *
     * @return array<int,array<string,mixed>>
     */
    public function list(Request $request, array $params): array
    {
        $userId = $this->auth->requireUserId();

        $stmt = $this->db()->prepare(
            'SELECT g.id, g.name, g.color, g.icon, g.created_by, g.created_at, g.updated_at,
                    m.role, m.display_name, m.points, m.streak_current, m.streak_best, m.joined_at
               FROM np_group_members m
               JOIN np_groups g ON g.id = m.group_id
              WHERE m.user_id = :uid
              ORDER BY g.created_at ASC'
        );
        $stmt->execute([':uid' => $userId]);
        return Serialize::rows($stmt->fetchAll(), Serialize::GROUP);
    }

    /**
     * Grup olusturur: grup satiri + owner uyeligi + varsayilan kategoriler.
     */
    public function create(Request $request, array $params): array
    {
        $userId = $this->auth->requireUserId();

        $body = $request->json();
        $v = new Validator($body);
        $v->required('name')->string('name', 1, 120)
          ->string('color', 0, 24)->string('icon', 0, 50)->check();

        $name  = trim((string) $body['name']);
        $color = isset($body['color']) && trim((string) $body['color']) !== ''
            ? trim((string) $body['color']) : 'tropical_teal';
        $icon  = isset($body['icon']) && trim((string) $body['icon']) !== ''
            ? trim((string) $body['icon']) : 'home';

        $pdo = $this->db();
        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO np_groups (name, color, icon, created_by)
                 VALUES (:name, :color, :icon, :uid)'
            );
            $ins->execute([':name' => $name, ':color' => $color, ':icon' => $icon, ':uid' => $userId]);
            $groupId = (int) $pdo->lastInsertId();

            // Olusturan kisi owner olarak uye edilir.
            $mem = $pdo->prepare(
                'INSERT INTO np_group_members (group_id, user_id, role)
                 VALUES (:gid, :uid, :role)'
            );
            $mem->execute([':gid' => $groupId, ':uid' => $userId, ':role' => 'owner']);

            // Varsayilan kategorileri tohumla.
            $this->seedDefaultCategories($pdo, $groupId);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $this->loadGroup($groupId, $userId);
    }

    /**
     * Grup ayrintisi (uye olmak gerekir).
     */
    public function get(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);
        $userId = $this->auth->requireUserId();

        return $this->loadGroup($groupId, $userId);
    }

    /**
     * Grup guncelleme (yalniz owner).
     */
    public function update(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupOwner($groupId);
        $userId = $this->auth->requireUserId();

        $body = $request->json();
        $v = new Validator($body);
        $v->string('name', 1, 120)->string('color', 0, 24)->string('icon', 0, 50)->check();

        $fields = [];
        $args = [':gid' => $groupId];
        foreach (['name', 'color', 'icon'] as $col) {
            if (array_key_exists($col, $body) && $body[$col] !== null && trim((string) $body[$col]) !== '') {
                $fields[] = "$col = :$col";
                $args[":$col"] = trim((string) $body[$col]);
            }
        }

        if ($fields !== []) {
            $sql = 'UPDATE np_groups SET ' . implode(', ', $fields) . ' WHERE id = :gid';
            $this->db()->prepare($sql)->execute($args);
        }

        return $this->loadGroup($groupId, $userId);
    }

    /**
     * Grup silme (yalniz owner). Iliskili veriler FK CASCADE ile silinir.
     *
     * @return array{deleted:bool}
     */
    public function delete(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupOwner($groupId);

        $stmt = $this->db()->prepare('DELETE FROM np_groups WHERE id = :gid');
        $stmt->execute([':gid' => $groupId]);

        return ['deleted' => true];
    }

    /**
     * Grup uyeleri (kullanici bilgileriyle).
     *
     * @return array<int,array<string,mixed>>
     */
    public function members(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        $this->auth->requireGroupMember($groupId);

        $stmt = $this->db()->prepare(
            'SELECT m.id AS member_id, m.user_id, m.role, m.display_name, m.points,
                    m.streak_current, m.streak_best, m.last_completed_date, m.joined_at,
                    u.name, u.email, u.avatar_url
               FROM np_group_members m
               JOIN np_users u ON u.id = m.user_id
              WHERE m.group_id = :gid
              ORDER BY m.role = \'owner\' DESC, m.joined_at ASC'
        );
        $stmt->execute([':gid' => $groupId]);

        // Her uye satirini GroupMember sozlesmesine cevir; gomulu user ozeti ekle.
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $row['id'] = $row['member_id'];
            unset($row['member_id']);
            $user = [
                'id'         => $row['user_id'],
                'name'       => $row['name'],
                'avatar_url' => $row['avatar_url'],
            ];
            unset($row['name'], $row['email'], $row['avatar_url']);
            $row = Serialize::row($row, Serialize::MEMBER);
            $row['user'] = Serialize::row($user, Serialize::USER_SUMMARY);
            $out[] = $row;
        }
        return $out;
    }

    // --- Yardimcilar -------------------------------------------------------

    private function seedDefaultCategories(\PDO $pdo, int $groupId): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO np_categories (group_id, name, color, icon, sort_order, is_default)
             VALUES (:gid, :name, :color, :icon, :sort, 1)'
        );
        foreach (self::DEFAULT_CATEGORIES as $i => $cat) {
            $stmt->execute([
                ':gid'   => $groupId,
                ':name'  => $cat['name'],
                ':color' => $cat['color'],
                ':icon'  => $cat['icon'],
                ':sort'  => $i,
            ]);
        }
    }

    /**
     * Tek grup + kullanicinin o gruptaki rolu/sayaclari.
     *
     * @return array<string,mixed>
     */
    private function loadGroup(int $groupId, int $userId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT g.id, g.name, g.color, g.icon, g.created_by, g.created_at, g.updated_at,
                    m.role, m.display_name, m.points, m.streak_current, m.streak_best, m.joined_at
               FROM np_groups g
               JOIN np_group_members m ON m.group_id = g.id AND m.user_id = :uid
              WHERE g.id = :gid
              LIMIT 1'
        );
        $stmt->execute([':gid' => $groupId, ':uid' => $userId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Grup bulunamadı.');
        }
        return Serialize::row($row, Serialize::GROUP);
    }
}
