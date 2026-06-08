<?php

declare(strict_types=1);

namespace Nafu\Auth;

use Nafu\Config;
use Nafu\Database;
use Nafu\Http\Request;
use Nafu\Support\Str;

/**
 * Oturum cerezi ve yenileme oturumu yonetimi.
 *
 * - 'np_session' cerezi: httpOnly + Secure + SameSite=Lax, oturum JWT'sini tasir.
 * - np_auth_sessions: yenileme jetonunun yalnizca SHA-256 ozeti saklanir (ham
 *   jeton DB'de tutulmaz).
 */
final class Session
{
    public const COOKIE = 'np_session';

    /** Cerez/oturum omru (saniye): 30 gun (Jwt::TTL ile ayni). */
    private const TTL = Jwt::TTL;

    /**
     * Bir kullanici icin oturum baslatir: JWT uretir, cerezi ayarlar ve
     * yenileme kaydini olusturur. Uretilen JWT'yi dondurur.
     */
    public static function start(int $userId, Request $request): string
    {
        $jwt = Jwt::issue($userId, self::TTL);

        // Yenileme oturumu (rotasyon/cikis icin). Ham jeton saklanmaz.
        $refresh = Str::sessionToken();
        $hash = Str::hashToken($refresh);

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO np_auth_sessions (user_id, token_hash, user_agent, ip, expires_at)
             VALUES (:user_id, :token_hash, :ua, :ip, :expires_at)'
        );
        $stmt->execute([
            ':user_id'    => $userId,
            ':token_hash' => $hash,
            ':ua'         => self::truncate($request->userAgent(), 255),
            ':ip'         => self::truncate($request->ip(), 45),
            ':expires_at' => gmdate('Y-m-d H:i:s', time() + self::TTL),
        ]);

        self::setCookie($jwt, time() + self::TTL);

        return $jwt;
    }

    /**
     * Oturumu sonlandirir: cerezi siler ve (varsa) ilgili kullanicinin
     * yenileme oturumlarini iptal eder.
     */
    public static function destroy(?int $userId): void
    {
        if ($userId !== null) {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'UPDATE np_auth_sessions SET revoked_at = UTC_TIMESTAMP()
                 WHERE user_id = :uid AND revoked_at IS NULL'
            );
            $stmt->execute([':uid' => $userId]);
        }

        self::clearCookie();
    }

    /**
     * Istekteki oturum cerezini okur.
     */
    public static function readCookie(Request $request): ?string
    {
        return $request->cookie(self::COOKIE);
    }

    private static function setCookie(string $value, int $expires): void
    {
        if (headers_sent()) {
            return;
        }
        setcookie(self::COOKIE, $value, [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => self::secureCookies(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function clearCookie(): void
    {
        if (headers_sent()) {
            return;
        }
        setcookie(self::COOKIE, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => self::secureCookies(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Secure bayragi: app_url https ise (uretim) acik; aksi halde (yerel http)
     * kapali, boylece yerel gelistirmede de cerez calisir.
     */
    private static function secureCookies(): bool
    {
        $appUrl = (string) Config::get('app_url', '');
        return str_starts_with($appUrl, 'https://');
    }

    private static function truncate(?string $value, int $max): ?string
    {
        if ($value === null) {
            return null;
        }
        return mb_substr($value, 0, $max);
    }
}
