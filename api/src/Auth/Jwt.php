<?php

declare(strict_types=1);

namespace Nafu\Auth;

use Firebase\JWT\JWT as FirebaseJwt;
use Firebase\JWT\Key;
use Nafu\Config;
use Throwable;

/**
 * Oturum jetonu (HS256) uretir ve dogrular.
 *
 * Imza anahtari config'teki jwt_secret'tir. Yuk (payload):
 *   - uid : kullanici kimligi
 *   - iat : uretilme zamani
 *   - exp : son kullanma zamani
 */
final class Jwt
{
    private const ALG = 'HS256';

    /** Varsayilan oturum jetonu omru (saniye): 30 gun. */
    public const TTL = 30 * 24 * 60 * 60;

    /**
     * Verilen kullanici kimligi icin imzali bir oturum jetonu uretir.
     */
    public static function issue(int $uid, int $ttl = self::TTL): string
    {
        $now = time();
        $payload = [
            'uid' => $uid,
            'iat' => $now,
            'exp' => $now + $ttl,
        ];

        return FirebaseJwt::encode($payload, self::secret(), self::ALG);
    }

    /**
     * Jetonu dogrular ve yuku (dizi) dondurur. Gecersizse null doner.
     *
     * @return array<string,mixed>|null
     */
    public static function verify(string $token): ?array
    {
        try {
            $decoded = FirebaseJwt::decode($token, new Key(self::secret(), self::ALG));
            return (array) $decoded;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Jetondan dogrulanmis kullanici kimligini cikarir. Gecersizse null.
     */
    public static function uid(string $token): ?int
    {
        $payload = self::verify($token);
        if ($payload === null || !isset($payload['uid'])) {
            return null;
        }
        return (int) $payload['uid'];
    }

    private static function secret(): string
    {
        $secret = (string) Config::get('jwt_secret', '');
        if ($secret === '') {
            throw new \RuntimeException('jwt_secret yapilandirilmamis.');
        }
        return $secret;
    }
}
