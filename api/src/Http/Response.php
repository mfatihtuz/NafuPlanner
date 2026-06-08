<?php

declare(strict_types=1);

namespace Nafu\Http;

/**
 * JSON yanit zarfini uretir ve gonderir.
 *
 * Zarf bicimi (CONVENTIONS.md):
 *   Basari: {"ok":true,"data":<icerik>}
 *   Hata:   {"ok":false,"error":{"code":"...","message":"Turkce mesaj"}}
 *
 * Tum anahtarlar snake_case, tum metinler UTF-8.
 */
final class Response
{
    /**
     * Basari zarfini gonderir ve istegi sonlandirir.
     */
    public static function json(mixed $data, int $status = 200): never
    {
        self::send(['ok' => true, 'data' => $data], $status);
    }

    /**
     * Hata zarfini gonderir ve istegi sonlandirir.
     *
     * @param array<string,mixed> $extra Zarftaki error nesnesine eklenecek alanlar (orn. fields)
     */
    public static function error(string $code, string $message, int $status = 400, array $extra = []): never
    {
        $error = ['code' => $code, 'message' => $message];
        foreach ($extra as $k => $v) {
            $error[$k] = $v;
        }
        self::send(['ok' => false, 'error' => $error], $status);
    }

    /**
     * Zarfi kodlar, basliklari ayarlar, yazar ve cikar.
     *
     * @param array<string,mixed> $payload
     */
    private static function send(array $payload, int $status): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        echo json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        exit;
    }
}
