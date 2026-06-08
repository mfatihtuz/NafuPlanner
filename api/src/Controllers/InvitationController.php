<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Config;
use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Str;
use Nafu\Support\Validator;

/**
 * Davet uc noktalari.
 *
 *   POST /api/groups/{id}/invitations      davet olustur -> { token, url }
 *   GET  /api/invitations/{token}          onizleme (grup adi, gecerli mi)
 *   POST /api/invitations/{token}/accept   davetle gruba katil
 */
final class InvitationController extends Controller
{
    /**
     * Grup icin davet jetonu olusturur.
     *
     * @return array{token:string,url:string}
     */
    public function create(Request $request, array $params): array
    {
        $groupId = $this->intParam($params, 'id');
        // Davet olusturmak yalnizca uyelere; rol atamasi yalnizca owner'a acik.
        $member = $this->auth->requireGroupMember($groupId);
        $userId = (int) $member['user_id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->in('role', ['owner', 'member'])->integer('max_uses')->integer('ttl_days')->check();

        $role = ($body['role'] ?? 'member') === 'owner' ? 'owner' : 'member';
        if ($role === 'owner' && ($member['role'] ?? '') !== 'owner') {
            throw ApiException::forbidden('Yalnizca grup sahibi sahip yetkisiyle davet olusturabilir.');
        }

        $maxUses = isset($body['max_uses']) && $body['max_uses'] !== null
            ? max(1, (int) $body['max_uses']) : null;

        $expiresAt = null;
        if (isset($body['ttl_days']) && $body['ttl_days'] !== null) {
            $days = max(1, (int) $body['ttl_days']);
            $expiresAt = gmdate('Y-m-d H:i:s', time() + $days * 86400);
        }

        $token = Str::inviteToken();

        $stmt = $this->db()->prepare(
            'INSERT INTO np_invitations (group_id, token, created_by, role, expires_at, max_uses)
             VALUES (:gid, :token, :uid, :role, :expires_at, :max_uses)'
        );
        $stmt->execute([
            ':gid'        => $groupId,
            ':token'      => $token,
            ':uid'        => $userId,
            ':role'       => $role,
            ':expires_at' => $expiresAt,
            ':max_uses'   => $maxUses,
        ]);

        return [
            'token' => $token,
            'url'   => $this->inviteUrl($token),
        ];
    }

    /**
     * Davet onizlemesi: grup adi ve gecerlilik. Kimlik dogrulama gerektirmez
     * (link onizlemesi giris ekraninda gosterilebilir).
     *
     * @return array{valid:bool,group_name:?string,role:?string,expired:bool,full:bool}
     */
    public function preview(Request $request, array $params): array
    {
        $token = (string) ($params['token'] ?? '');
        $inv = $this->findByToken($token);

        if ($inv === null) {
            return [
                'valid'      => false,
                'group_name' => null,
                'role'       => null,
                'expired'    => false,
                'full'       => false,
            ];
        }

        $expired = $this->isExpired($inv);
        $full = $this->isFull($inv);
        $revoked = $inv['revoked_at'] !== null;

        return [
            'valid'      => !$expired && !$full && !$revoked,
            'group_name' => (string) $inv['group_name'],
            'role'       => (string) $inv['role'],
            'expired'    => $expired,
            'full'       => $full,
        ];
    }

    /**
     * Daveti kabul eder: kullaniciyi gruba ekler, used_count artirir.
     *
     * @return array{group:array<string,mixed>,already_member:bool}
     */
    public function accept(Request $request, array $params): array
    {
        $userId = $this->auth->requireUserId();
        $token = (string) ($params['token'] ?? '');

        $pdo = $this->db();
        $pdo->beginTransaction();
        try {
            // Jetonu satir kilidiyle al (eszamanli kabulu guvenli kil).
            $stmt = $pdo->prepare(
                'SELECT i.id, i.group_id, i.role, i.expires_at, i.max_uses, i.used_count, i.revoked_at,
                        g.name AS group_name
                   FROM np_invitations i
                   JOIN np_groups g ON g.id = i.group_id
                  WHERE i.token = :token
                  LIMIT 1
                  FOR UPDATE'
            );
            $stmt->execute([':token' => $token]);
            $inv = $stmt->fetch();

            if ($inv === false) {
                throw ApiException::notFound('Davet bulunamadi.');
            }
            if ($inv['revoked_at'] !== null) {
                throw ApiException::badRequest('Bu davet iptal edilmis.');
            }
            if ($this->isExpired($inv)) {
                throw ApiException::badRequest('Bu davetin suresi dolmus.');
            }
            if ($this->isFull($inv)) {
                throw ApiException::badRequest('Bu davet kullanim sinirina ulasmis.');
            }

            $groupId = (int) $inv['group_id'];

            // Zaten uye mi?
            $check = $pdo->prepare(
                'SELECT id FROM np_group_members WHERE group_id = :gid AND user_id = :uid LIMIT 1'
            );
            $check->execute([':gid' => $groupId, ':uid' => $userId]);
            $already = $check->fetchColumn() !== false;

            if (!$already) {
                $mem = $pdo->prepare(
                    'INSERT INTO np_group_members (group_id, user_id, role)
                     VALUES (:gid, :uid, :role)'
                );
                $mem->execute([
                    ':gid'  => $groupId,
                    ':uid'  => $userId,
                    ':role' => $inv['role'] === 'owner' ? 'owner' : 'member',
                ]);

                // Yalnizca yeni katilimda kullanim sayacini artir.
                $bump = $pdo->prepare(
                    'UPDATE np_invitations SET used_count = used_count + 1 WHERE id = :id'
                );
                $bump->execute([':id' => (int) $inv['id']]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return [
            'group'          => $this->loadGroupForUser($groupId, $userId),
            'already_member' => $already,
        ];
    }

    // --- Yardimcilar -------------------------------------------------------

    private function inviteUrl(string $token): string
    {
        $base = rtrim((string) Config::get('app_url', ''), '/');
        return $base . '/davet/' . $token;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }
        $stmt = $this->db()->prepare(
            'SELECT i.id, i.group_id, i.role, i.expires_at, i.max_uses, i.used_count, i.revoked_at,
                    g.name AS group_name
               FROM np_invitations i
               JOIN np_groups g ON g.id = i.group_id
              WHERE i.token = :token
              LIMIT 1'
        );
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @param array<string,mixed> $inv */
    private function isExpired(array $inv): bool
    {
        if ($inv['expires_at'] === null) {
            return false;
        }
        return strtotime((string) $inv['expires_at'] . ' UTC') < time();
    }

    /** @param array<string,mixed> $inv */
    private function isFull(array $inv): bool
    {
        if ($inv['max_uses'] === null) {
            return false;
        }
        return (int) $inv['used_count'] >= (int) $inv['max_uses'];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadGroupForUser(int $groupId, int $userId): array
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
            throw ApiException::notFound('Grup bulunamadi.');
        }
        return Serialize::row($row, Serialize::GROUP);
    }
}
