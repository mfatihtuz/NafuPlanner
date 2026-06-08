<?php

declare(strict_types=1);

namespace Nafu;

use PDO;

/**
 * Yapilandirmadan tek (singleton) bir PDO baglantisi uretir.
 *
 * - utf8mb4 karakter kumesi
 * - ERRMODE_EXCEPTION (hatalar istisna olarak firlatilir)
 * - FETCH_ASSOC (varsayilan iliskisel dizi)
 * - emulate prepares kapali (gercek hazirlanmis ifadeler)
 *
 * Tum sorgular hazirlanmis ifadelerle calistirilir; kullanici girdisi asla
 * ham SQL'e gomulmez.
 */
final class Database
{
    private static ?PDO $pdo = null;

    /**
     * Paylasilan PDO ornegini dondurur (ilk cagrida olusturulur).
     */
    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host    = (string) Config::get('db.host', 'localhost');
        $name    = (string) Config::get('db.name', '');
        $user    = (string) Config::get('db.user', '');
        $pass    = (string) Config::get('db.pass', '');
        $charset = (string) Config::get('db.charset', 'utf8mb4');

        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $name, $charset);

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ];

        self::$pdo = new PDO($dsn, $user, $pass, $options);

        // Baglanti oturumunu UTC'ye sabitle: tum DATETIME/TIMESTAMP degerleri
        // UTC okunur/yazilir. Serilestirici (Serialize) saklanan degerin UTC
        // oldugunu varsayip sonuna 'Z' ekler; bu garanti onu dogru kilar.
        self::$pdo->exec("SET time_zone = '+00:00'");

        return self::$pdo;
    }

    /**
     * Test/yerel calistirma icin hazir bir PDO enjekte eder.
     */
    public static function setPdo(?PDO $pdo): void
    {
        self::$pdo = $pdo;
    }
}
