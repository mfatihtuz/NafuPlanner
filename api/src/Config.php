<?php

declare(strict_types=1);

namespace Nafu;

/**
 * Yapilandirmayi api/config.php dosyasindan yukler ve degerlere erisim saglar.
 *
 * config.php bir PHP dizisi dondurur (config.example.php sablonuna bakin).
 * Dosya yoksa RuntimeException firlatir; on denetleyici bunu net bir 500'e cevirir.
 */
final class Config
{
    /** @var array<string,mixed>|null */
    private static ?array $data = null;

    /**
     * Yapilandirma dosyasinin yolunu belirler.
     */
    private static function path(): string
    {
        return dirname(__DIR__) . '/config.php';
    }

    /**
     * Yapilandirmanin mevcut olup olmadigini sessizce kontrol eder.
     */
    public static function exists(): bool
    {
        return is_file(self::path());
    }

    /**
     * Tum yapilandirma dizisini yukler (bir kez okunur, onbelleklenir).
     *
     * @return array<string,mixed>
     */
    public static function all(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $path = self::path();
        if (!is_file($path)) {
            throw new \RuntimeException(
                'Yapilandirma dosyasi bulunamadi. config.example.php dosyasini config.php olarak kopyalayin.'
            );
        }

        $data = require $path;
        if (!is_array($data)) {
            throw new \RuntimeException('Yapilandirma dosyasi bir dizi dondurmeli.');
        }

        self::$data = $data;

        return self::$data;
    }

    /**
     * Nokta ile ayrilmis anahtarla deger okur. Ornek: get('db.host').
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $data = self::all();
        $segments = explode('.', $key);

        $current = $data;
        foreach ($segments as $segment) {
            if (is_array($current) && array_key_exists($segment, $current)) {
                $current = $current[$segment];
            } else {
                return $default;
            }
        }

        return $current;
    }

    /**
     * Test/yerel calistirma icin yapilandirmayi elle enjekte eder.
     *
     * @param array<string,mixed> $data
     */
    public static function set(array $data): void
    {
        self::$data = $data;
    }
}
