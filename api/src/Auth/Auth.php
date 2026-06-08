<?php

declare(strict_types=1);

namespace Nafu\Auth;

use Nafu\Database;
use Nafu\Http\Request;
use Nafu\Support\ApiException;

/**
 * Kimlik dogrulama ara katmani.
 *
 * - currentUser(): oturum cerezinden gecerli kullaniciyi cozer (yoksa null).
 * - requireUser(): kullanici yoksa 401 firlatir.
 * - requireGroupMember(): kullanicinin gruba uyeligini dogrular (yoksa 403/404).
 */
final class Auth
{
    /** @var array<string,mixed>|null */
    private ?array $user = null;
    private bool $resolved = false;

    public function __construct(private Request $request)
    {
    }

    /**
     * Gecerli kullaniciyi (np_users satiri) dondurur veya null.
     *
     * @return array<string,mixed>|null
     */
    public function currentUser(): ?array
    {
        if ($this->resolved) {
            return $this->user;
        }
        $this->resolved = true;

        $token = Session::readCookie($this->request) ?? $this->request->bearerToken();
        if ($token === null || $token === '') {
            return $this->user = null;
        }

        $uid = Jwt::uid($token);
        if ($uid === null) {
            return $this->user = null;
        }

        $stmt = Database::pdo()->prepare(
            'SELECT id, google_sub, email, name, avatar_url, locale, timezone,
                    created_at, updated_at, last_seen_at
               FROM np_users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $uid]);
        $row = $stmt->fetch();

        return $this->user = ($row === false ? null : $row);
    }

    /**
     * Gecerli kullaniciyi dondurur; yoksa 401 firlatir.
     *
     * @return array<string,mixed>
     */
    public function requireUser(): array
    {
        $user = $this->currentUser();
        if ($user === null) {
            throw ApiException::unauthorized();
        }
        return $user;
    }

    /**
     * Gecerli kullanicinin kimligini dondurur (oturum acik olmali).
     */
    public function requireUserId(): int
    {
        return (int) $this->requireUser()['id'];
    }

    /**
     * Kullanicinin belirtilen gruba uyeligini dogrular ve uyelik satirini dondurur.
     * Uye degilse 403 firlatir. (Var olmayan grup da uye olmadigindan 403 doner;
     * boylece grup varliginin sizmasi engellenir.)
     *
     * @return array<string,mixed> np_group_members satiri
     */
    public function requireGroupMember(int $groupId): array
    {
        $userId = $this->requireUserId();

        $stmt = Database::pdo()->prepare(
            'SELECT id, group_id, user_id, role, display_name, points,
                    streak_current, streak_best, last_completed_date, joined_at
               FROM np_group_members
              WHERE group_id = :gid AND user_id = :uid
              LIMIT 1'
        );
        $stmt->execute([':gid' => $groupId, ':uid' => $userId]);
        $row = $stmt->fetch();

        if ($row === false) {
            throw ApiException::forbidden('Bu gruba erişim yetkiniz yok.');
        }

        return $row;
    }

    /**
     * Kullanicinin grupta 'owner' rolunde olmasini zorunlu kilar.
     *
     * @return array<string,mixed> uyelik satiri
     */
    public function requireGroupOwner(int $groupId): array
    {
        $member = $this->requireGroupMember($groupId);
        if (($member['role'] ?? '') !== 'owner') {
            throw ApiException::forbidden('Bu işlem yalnızca grup sahibine açık.');
        }
        return $member;
    }
}
