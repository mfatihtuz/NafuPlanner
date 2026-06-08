<?php

declare(strict_types=1);

/**
 * NafuPlanner - tek seferlik veritabani kurulumu (web uzerinden).
 *
 *   https://ALANADI/api/install.php?key=CRON_SECRET
 *
 * config.php'deki veritabani bilgileriyle baglanir; schema.sql ve seed.sql'i
 * calistirarak tablolari ve rozetleri olusturur. Tekrar calistirilabilir
 * (CREATE TABLE IF NOT EXISTS + INSERT ... ON DUPLICATE KEY UPDATE).
 *
 * Guvenlik: ?key parametresi config.php'deki cron_secret ile eslesmeli.
 * Kurulum bittikten sonra bu dosyayi silmen onerilir.
 *
 * Not: Multi-statement calistirma basarisiz olursa, alternatif olarak SQL
 * dosyalarini phpMyAdmin > Import ile yukleyebilirsin.
 */

header('Content-Type: text/plain; charset=utf-8');

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    exit("config.php bulunamadi. Once config.example.php'yi kopyalayip config.php yap ve doldur.\n");
}

/** @var array<string,mixed> $config */
$config = require $configFile;

$expected = (string) ($config['cron_secret'] ?? '');
$given    = (string) ($_GET['key'] ?? '');
if ($expected === '' || !hash_equals($expected, $given)) {
    http_response_code(403);
    exit("Gecersiz anahtar. URL'ye ?key=... ekle (config.php icindeki cron_secret degeri).\n");
}

$db = $config['db'] ?? [];
try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $db['host'] ?? 'localhost',
        $db['name'] ?? '',
        $db['charset'] ?? 'utf8mb4'
    );
    $pdo = new PDO($dsn, $db['user'] ?? '', $db['pass'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    exit("Veritabanina baglanilamadi. config.php icindeki db bilgilerini kontrol et.\n");
}

/** schema.sql / seed.sql dosyasini paket veya repo duzeninde bulur. */
function locateSql(string $name): ?string
{
    foreach ([__DIR__ . '/sql/' . $name, __DIR__ . '/../db/' . $name] as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function runSqlFile(PDO $pdo, string $name): void
{
    $path = locateSql($name);
    if ($path === null) {
        throw new RuntimeException($name . " bulunamadi (sql/ veya db/ altinda olmali).");
    }
    $sql = file_get_contents($path);
    if ($sql === false || trim($sql) === '') {
        throw new RuntimeException($name . " okunamadi.");
    }
    // Standart, tek-deyimli olmayan SQL; PDO_MYSQL coklu deyimi tek exec'te calistirir.
    $pdo->exec($sql);
}

try {
    runSqlFile($pdo, 'schema.sql');
    runSqlFile($pdo, 'seed.sql');
} catch (Throwable $e) {
    http_response_code(500);
    exit("Kurulum hatasi: " . $e->getMessage()
        . "\nAlternatif: SQL dosyalarini phpMyAdmin > Import ile yukle.\n");
}

$tables = (int) $pdo->query(
    "SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name LIKE 'np\\_%'"
)->fetchColumn();
$badges = (int) $pdo->query("SELECT COUNT(*) FROM np_badges")->fetchColumn();

echo "Kurulum tamamlandi.\n";
echo "Olusturulan tablo sayisi (np_*): {$tables}\n";
echo "Rozet sayisi: {$badges}\n";
echo "Guvenlik icin artik bu dosyayi (install.php) silebilirsin.\n";
