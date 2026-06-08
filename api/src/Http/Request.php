<?php

declare(strict_types=1);

namespace Nafu\Http;

/**
 * Gelen HTTP istegini sarmalar: yontem, yol, sorgu, JSON govde, basliklar,
 * cerezler ve yuklenen dosyalar.
 *
 * Hem Apache (mod_rewrite -> index.php) hem PHP yerlesik sunucusu altinda calisir.
 */
final class Request
{
    /** @var array<string,mixed> */
    private array $jsonCache;
    private bool $jsonParsed = false;

    /**
     * @param array<string,string>          $query
     * @param array<string,string>          $headers (kucuk harf anahtarli)
     * @param array<string,string>          $cookies
     * @param array<string,mixed>           $files
     */
    public function __construct(
        private string $method,
        private string $path,
        private array $query,
        private string $rawBody,
        private array $headers,
        private array $cookies,
        private array $files
    ) {
    }

    /**
     * Superglobal'lerden bir Request olusturur.
     */
    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        // Yol: sorgu dizesini ayir ve /api onekini normalize et.
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);
        $path = is_string($path) ? $path : '/';
        $path = rawurldecode($path);
        $path = self::normalizePath($path);

        $rawBody = file_get_contents('php://input');
        $rawBody = $rawBody === false ? '' : $rawBody;

        return new self(
            $method,
            $path,
            self::normalizeStringMap($_GET),
            $rawBody,
            self::collectHeaders(),
            self::normalizeStringMap($_COOKIE),
            $_FILES
        );
    }

    /**
     * Yolu normalize eder: bastaki betik adini ve /api onekini temizler,
     * sondaki gereksiz slash'i kaldirir. Sonuc her zaman '/' ile baslar.
     */
    private static function normalizePath(string $path): string
    {
        // PHP yerlesik sunucusu bazen tam betik yolunu icerebilir; sadeestir.
        $path = '/' . ltrim($path, '/');

        // Bastaki /api veya /api/ onekini kaldir (taban yol /api).
        if ($path === '/api') {
            $path = '/';
        } elseif (str_starts_with($path, '/api/')) {
            $path = substr($path, 4); // '/api' (4 karakter) cikar, bastaki '/' kalir
        }

        // Sondaki slash'i (kok haric) kaldir.
        if (strlen($path) > 1) {
            $path = rtrim($path, '/');
            if ($path === '') {
                $path = '/';
            }
        }

        return $path;
    }

    /** @param array<int|string,mixed> $arr @return array<string,string> */
    private static function normalizeStringMap(array $arr): array
    {
        $out = [];
        foreach ($arr as $k => $v) {
            if (is_string($v)) {
                $out[(string) $k] = $v;
            }
        }
        return $out;
    }

    /** @return array<string,string> kucuk harf anahtarli basliklar */
    private static function collectHeaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = (string) $value;
            }
        }
        // Bazi basliklar HTTP_ onekiyle gelmez.
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }
        if (isset($_SERVER['CONTENT_LENGTH'])) {
            $headers['content-length'] = (string) $_SERVER['CONTENT_LENGTH'];
        }
        return $headers;
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        return $this->query[$key] ?? $default;
    }

    /** @return array<string,string> */
    public function queryAll(): array
    {
        return $this->query;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    public function cookie(string $name, ?string $default = null): ?string
    {
        return $this->cookies[$name] ?? $default;
    }

    /** @return array<string,mixed> */
    public function files(): array
    {
        return $this->files;
    }

    public function file(string $name): ?array
    {
        $f = $this->files[$name] ?? null;
        return is_array($f) ? $f : null;
    }

    public function rawBody(): string
    {
        return $this->rawBody;
    }

    /**
     * JSON govdesini cozer. Govde bos veya gecersizse bos dizi doner.
     *
     * @return array<string,mixed>
     */
    public function json(): array
    {
        if ($this->jsonParsed) {
            return $this->jsonCache;
        }
        $this->jsonParsed = true;

        $body = trim($this->rawBody);
        if ($body === '') {
            return $this->jsonCache = [];
        }

        $decoded = json_decode($body, true);
        $this->jsonCache = is_array($decoded) ? $decoded : [];

        return $this->jsonCache;
    }

    /** JSON govdesinden tek bir alan okur. */
    public function input(string $key, mixed $default = null): mixed
    {
        $data = $this->json();
        return $data[$key] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization');
        if ($auth !== null && preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public function userAgent(): ?string
    {
        return $this->header('user-agent');
    }

    public function ip(): ?string
    {
        return $_SERVER['REMOTE_ADDR'] ?? null;
    }
}
