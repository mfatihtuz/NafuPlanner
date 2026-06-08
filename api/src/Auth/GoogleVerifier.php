<?php

declare(strict_types=1);

namespace Nafu\Auth;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT as FirebaseJwt;
use Nafu\Config;
use Nafu\Support\ApiException;
use Throwable;

/**
 * Google ID token (OpenID Connect) dogrulayici.
 *
 * - Google'in genel anahtarlarini (JWKS) sertifika uc noktasindan ceker ve
 *   kisa sureli (varsayilan 1 saat) dosya onbelleginde tutar.
 * - firebase/php-jwt ile RS256 imzasini dogrular.
 * - aud (== google_client_id), iss ve exp/iat kontrol edilir.
 *
 * Basarili dogrulamada [sub, email, name, picture] doner; aksi halde
 * 401 ApiException firlatir.
 */
final class GoogleVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

    /** JWKS onbellek omru (saniye). */
    private const CACHE_TTL = 3600;

    /**
     * Bir Google ID token'i dogrular.
     *
     * @return array{sub:string,email:string,name:string,picture:?string}
     * @throws ApiException dogrulama basarisizsa
     */
    public function verify(string $idToken): array
    {
        $clientId = (string) Config::get('google_client_id', '');
        if ($clientId === '') {
            throw new ApiException('config_error', 'Google istemci kimligi yapilandirilmamis.', 500);
        }

        $idToken = trim($idToken);
        if ($idToken === '') {
            throw ApiException::unauthorized('Google kimlik jetonu eksik.');
        }

        try {
            $keys = JWK::parseKeySet($this->fetchJwks());
            // firebase/php-jwt aud kontrolu yapmaz; iss/exp/imza dogrular.
            $decoded = (array) FirebaseJwt::decode($idToken, $keys);
        } catch (Throwable $e) {
            throw ApiException::unauthorized('Google kimlik dogrulamasi basarisiz oldu.');
        }

        // Issuer kontrolu
        $iss = (string) ($decoded['iss'] ?? '');
        if (!in_array($iss, self::ISSUERS, true)) {
            throw ApiException::unauthorized('Kimlik jetonunun kaynagi gecersiz.');
        }

        // Audience kontrolu (jeton bu uygulama icin mi uretildi)
        $aud = (string) ($decoded['aud'] ?? '');
        if (!hash_equals($clientId, $aud)) {
            throw ApiException::unauthorized('Kimlik jetonu bu uygulama icin gecerli degil.');
        }

        $sub = (string) ($decoded['sub'] ?? '');
        if ($sub === '') {
            throw ApiException::unauthorized('Kimlik jetonu eksik bilgi iceriyor.');
        }

        return [
            'sub'     => $sub,
            'email'   => (string) ($decoded['email'] ?? ''),
            'name'    => (string) ($decoded['name'] ?? ($decoded['email'] ?? '')),
            'picture' => isset($decoded['picture']) ? (string) $decoded['picture'] : null,
        ];
    }

    /**
     * JWKS'i kisa onbellekle ceker.
     *
     * @return array<string,mixed>
     */
    private function fetchJwks(): array
    {
        $cacheFile = sys_get_temp_dir() . '/nafu_google_jwks.json';

        if (is_file($cacheFile) && (time() - (int) filemtime($cacheFile)) < self::CACHE_TTL) {
            $cached = file_get_contents($cacheFile);
            if ($cached !== false) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded) && isset($decoded['keys'])) {
                    return $decoded;
                }
            }
        }

        $json = $this->httpGet(self::CERTS_URL);
        $decoded = json_decode($json, true);
        if (!is_array($decoded) || !isset($decoded['keys'])) {
            // Onbellek bayatsa bile son care olarak dene.
            if (is_file($cacheFile)) {
                $stale = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($stale) && isset($stale['keys'])) {
                    return $stale;
                }
            }
            throw ApiException::unauthorized('Google anahtarlari alinamadi.');
        }

        @file_put_contents($cacheFile, $json, LOCK_EX);

        return $decoded;
    }

    private function httpGet(string $url): string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            ]);
            $body = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (is_string($body) && $status >= 200 && $status < 300) {
                return $body;
            }
            throw ApiException::unauthorized('Google anahtar sunucusuna ulasilamadi.');
        }

        // curl yoksa akis sarmalayicisi ile dene.
        $context = stream_context_create([
            'http' => ['method' => 'GET', 'timeout' => 10, 'header' => "Accept: application/json\r\n"],
        ]);
        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            throw ApiException::unauthorized('Google anahtar sunucusuna ulasilamadi.');
        }
        return $body;
    }
}
