<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Auth\GoogleVerifier;
use Nafu\Auth\Session;
use Nafu\Http\Request;
use Nafu\Support\ApiException;
use Nafu\Support\Serialize;
use Nafu\Support\Validator;

/**
 * Kimlik dogrulama ve profil uc noktalari.
 *
 *   POST /api/auth/google   id_token dogrula, kullaniciyi upsert et, oturum ac
 *   POST /api/auth/logout   oturumu sonlandir
 *   GET  /api/me            kullanici + uyesi oldugu gruplar
 *   PATCH /api/me           ad ve saat dilimini guncelle
 */
final class AuthController extends Controller
{
    /**
     * Google ID token ile giris/kayit.
     *
     * @return array{user:array<string,mixed>}
     */
    public function postGoogle(Request $request, array $params): array
    {
        $v = new Validator($request->json());
        $v->required('id_token')->check();

        $idToken = (string) $request->input('id_token', '');

        $profile = (new GoogleVerifier())->verify($idToken);

        $pdo = $this->db();

        // google_sub uzerinden upsert: varsa profil bilgilerini tazele, yoksa olustur.
        $stmt = $pdo->prepare('SELECT id FROM np_users WHERE google_sub = :sub LIMIT 1');
        $stmt->execute([':sub' => $profile['sub']]);
        $existingId = $stmt->fetchColumn();

        if ($existingId !== false) {
            $userId = (int) $existingId;
            $upd = $pdo->prepare(
                'UPDATE np_users
                    SET email = :email,
                        name = :name,
                        avatar_url = :avatar,
                        last_seen_at = UTC_TIMESTAMP()
                  WHERE id = :id'
            );
            $upd->execute([
                ':email'  => $profile['email'],
                ':name'   => $profile['name'],
                ':avatar' => $profile['picture'],
                ':id'     => $userId,
            ]);
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO np_users (google_sub, email, name, avatar_url, last_seen_at)
                 VALUES (:sub, :email, :name, :avatar, UTC_TIMESTAMP())'
            );
            $ins->execute([
                ':sub'    => $profile['sub'],
                ':email'  => $profile['email'],
                ':name'   => $profile['name'],
                ':avatar' => $profile['picture'],
            ]);
            $userId = (int) $pdo->lastInsertId();
        }

        Session::start($userId, $request);

        return ['user' => $this->loadUser($userId)];
    }

    /**
     * Oturumu sonlandirir.
     *
     * @return array{logged_out:bool}
     */
    public function postLogout(Request $request, array $params): array
    {
        $user = $this->auth->currentUser();
        Session::destroy($user !== null ? (int) $user['id'] : null);

        return ['logged_out' => true];
    }

    /**
     * Gecerli kullanici + uyesi oldugu gruplar.
     *
     * @return array{user:array<string,mixed>,groups:array<int,array<string,mixed>>}
     */
    public function getMe(Request $request, array $params): array
    {
        $user = $this->auth->requireUser();
        $userId = (int) $user['id'];

        return [
            'user'   => $this->loadUser($userId),
            'groups' => $this->loadUserGroups($userId),
        ];
    }

    /**
     * Profil guncelleme (ad, saat dilimi).
     *
     * @return array{user:array<string,mixed>}
     */
    public function patchMe(Request $request, array $params): array
    {
        $user = $this->auth->requireUser();
        $userId = (int) $user['id'];

        $body = $request->json();
        $v = new Validator($body);
        $v->string('name', 1, 255)->string('timezone', 1, 64)->check();

        $fields = [];
        $args = [':id' => $userId];

        if (array_key_exists('name', $body) && $body['name'] !== null) {
            $fields[] = 'name = :name';
            $args[':name'] = trim((string) $body['name']);
        }
        if (array_key_exists('timezone', $body) && $body['timezone'] !== null) {
            $tz = trim((string) $body['timezone']);
            if (!in_array($tz, \DateTimeZone::listIdentifiers(), true)) {
                throw new ApiException('validation_error', 'Gecersiz saat dilimi.', 422);
            }
            $fields[] = 'timezone = :timezone';
            $args[':timezone'] = $tz;
        }

        if ($fields !== []) {
            $sql = 'UPDATE np_users SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $this->db()->prepare($sql)->execute($args);
        }

        return ['user' => $this->loadUser($userId)];
    }

    // --- Yardimcilar -------------------------------------------------------

    /**
     * Kullanici satirini (sir icermeden) dondurur.
     *
     * @return array<string,mixed>
     */
    private function loadUser(int $userId): array
    {
        $stmt = $this->db()->prepare(
            'SELECT id, email, name, avatar_url, locale, timezone,
                    created_at, updated_at, last_seen_at
               FROM np_users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw ApiException::notFound('Kullanici bulunamadi.');
        }
        return Serialize::row($row, Serialize::USER);
    }

    /**
     * Kullanicinin uyesi oldugu gruplari (rol ve oyunlastirma sayaclariyla) dondurur.
     *
     * @return array<int,array<string,mixed>>
     */
    private function loadUserGroups(int $userId): array
    {
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
}
