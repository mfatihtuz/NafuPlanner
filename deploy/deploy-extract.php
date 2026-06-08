<?php

declare(strict_types=1);

/**
 * Sunucu tarafi dagitim cikartici. CI bu dosyayi olustururken
 * __DEPLOY_KEY__ yerine CRON_SECRET yazar ve public_html koküne yukler.
 *
 *   https://ALANADI/_deploy.php?key=CRON_SECRET
 *
 * Yanindaki site.zip'i (uygulamanin tamami) bulundugu dizine cikartir, sonra
 * zip'i siler. Boylece FTP ile 950 dosya yerine tek zip yuklenir; cok hizli.
 * NOT: config.php (sirlar) bu zip'in ICINDE DEGILDIR; ayrica api/'ye yuklenir.
 */

header('Content-Type: text/plain; charset=utf-8');

$expected = '__DEPLOY_KEY__';
$given = isset($_GET['key']) ? (string) $_GET['key'] : '';

// Yerine konmamis (yapilandirilmamis) veya yanlis anahtar -> reddet.
if ($expected === '__DEPLOY' . '_KEY__' || $given === '' || !hash_equals($expected, $given)) {
    http_response_code(403);
    exit("Gecersiz anahtar.\n");
}

$zipPath = __DIR__ . '/site.zip';
if (!is_file($zipPath)) {
    http_response_code(500);
    exit("site.zip bulunamadi.\n");
}
if (!class_exists('ZipArchive')) {
    http_response_code(500);
    exit("ZipArchive (php-zip) sunucuda yok.\n");
}

$za = new ZipArchive();
if ($za->open($zipPath) !== true) {
    http_response_code(500);
    exit("Zip acilamadi.\n");
}
$count = $za->numFiles;
$ok = $za->extractTo(__DIR__);
$za->close();

if (!$ok) {
    http_response_code(500);
    exit("Cikartma basarisiz (yazma izni?).\n");
}

@unlink($zipPath);

$indexOk = is_file(__DIR__ . '/index.html') ? 'var' : 'YOK';
echo "OK: {$count} dosya cikartildi. index.html: {$indexOk}\n";
