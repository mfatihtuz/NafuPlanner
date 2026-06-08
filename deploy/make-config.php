<?php

declare(strict_types=1);

/**
 * CI (GitHub Actions) icin: ortam degiskenlerindeki (GitHub Secrets) degerlerden
 * sunucu icin config.php uretir. Sirlar git'e KONMAZ; yalnizca CI calismasinda
 * uretilip FTP ile sunucuya yuklenir.
 *
 * Ortam degiskenleri: DB_NAME, DB_USER, DB_PASS, GOOGLE_CLIENT_ID,
 *                     JWT_SECRET, CRON_SECRET, APP_URL, OUT (cikti yolu)
 *
 * Yerel test:
 *   OUT=/tmp/config.php DB_NAME=x DB_USER=y DB_PASS=z APP_URL=https://a php deploy/make-config.php
 */

$out = getenv('OUT') ?: (__DIR__ . '/output/public_html/api/config.php');

$db = [
    'host'    => 'localhost',
    'name'    => getenv('DB_NAME') ?: '',
    'user'    => getenv('DB_USER') ?: '',
    'pass'    => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',
];

$appUrl = getenv('APP_URL') ?: 'https://nafuplanner.mftyazilim.com';

$lines = [
    '<?php',
    '',
    '// CI (GitHub Actions) tarafindan otomatik uretildi. Elle duzenlemeyin.',
    '// Degerler GitHub Secrets uzerinden gelir; bu dosya git deposunda tutulmaz.',
    'return [',
    '    "db" => ' . var_export($db, true) . ',',
    '    "google_client_id" => ' . var_export(getenv('GOOGLE_CLIENT_ID') ?: '', true) . ',',
    '    "jwt_secret" => ' . var_export(getenv('JWT_SECRET') ?: '', true) . ',',
    '    "cron_secret" => ' . var_export(getenv('CRON_SECRET') ?: '', true) . ',',
    '    "vapid" => ["public" => "", "private" => "", "subject" => "mailto:admin@nafuplanner.mftyazilim.com"],',
    '    "app_url" => ' . var_export($appUrl, true) . ',',
    '    "upload_dir" => __DIR__ . "/uploads",',
    '];',
    '',
];

if (!is_dir(dirname($out))) {
    @mkdir(dirname($out), 0775, true);
}
file_put_contents($out, implode("\n", $lines));
echo "config.php yazildi: {$out}\n";
