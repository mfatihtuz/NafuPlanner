<?php

declare(strict_types=1);

namespace Nafu\Support;

/**
 * Kucuk dize yardimcilari (jeton uretimi vb.).
 */
final class Str
{
    /**
     * Kriptografik olarak guvenli, URL'de kullanilabilir onaltilik jeton uretir.
     *
     * @param int $bytes Ham bayt sayisi (uretilen dize uzunlugu 2 * $bytes olur).
     */
    public static function token(int $bytes = 20): string
    {
        return bin2hex(random_bytes($bytes));
    }

    /**
     * Davet tablosundaki CHAR(40) sutununa uyan 40 karakterlik jeton.
     */
    public static function inviteToken(): string
    {
        return self::token(20); // 20 bayt -> 40 onaltilik karakter
    }

    /**
     * Yenileme oturumu icin daha uzun bir jeton (gizli; yalnizca hash'i saklanir).
     */
    public static function sessionToken(): string
    {
        return self::token(32); // 32 bayt -> 64 onaltilik karakter
    }

    /**
     * Jetonun SHA-256 ozetini (CHAR(64)) dondurur.
     */
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
