<?php

declare(strict_types=1);

/**
 * PHP yerlesik sunucusu icin yonlendirme betigi.
 *
 * Kullanim (proje kokunden):
 *   php -S localhost:8000 api/router.php
 * veya api/ icinden:
 *   php -S localhost:8000 router.php
 *
 * Davranis:
 *   - Var olan statik dosyalar (uploads, vb.) dogrudan sunulur.
 *   - Hassas dosyalara (config.php, *.sql, vendor/, src/) dogrudan erisim 403.
 *   - Geri kalan tum istekler on denetleyiciye (index.php) yonlendirilir;
 *     boylece /api/* yollari Apache uretimiyle ayni calisir.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uri = rawurldecode($uri);

// Bu betigin bulundugu dizin api/ kokudur.
$apiRoot = __DIR__;

// /api oneki yerlesik sunucuda da gelebilir; dosya sistemi yolu icin kaldir.
$relative = $uri;
if ($relative === '/api') {
    $relative = '/';
} elseif (str_starts_with($relative, '/api/')) {
    $relative = substr($relative, 4);
}

$path = realpath($apiRoot . $relative);

// Hassas dosyalara dogrudan erisimi engelle (Apache .htaccess esdegeri).
$blocked = static function (string $p): bool {
    $name = basename($p);
    if (preg_match('/(?i)(^config\.php$|^config\.example\.php$|\.sql$|^composer\.(json|lock)$)/', $name)) {
        return true;
    }
    // vendor/ ve src/ altina dogrudan HTTP erisimi yok.
    return (bool) preg_match('#(?:^|/)(vendor|src)/#', str_replace('\\', '/', $p));
};

if (
    $path !== false
    && is_file($path)
    && str_starts_with($path, $apiRoot)
    && basename($path) !== 'index.php'
    && basename($path) !== 'router.php'
) {
    if ($blocked($path)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(
            ['ok' => false, 'error' => ['code' => 'forbidden', 'message' => 'Erisim engellendi.']],
            JSON_UNESCAPED_UNICODE
        );
        return true;
    }
    // Statik dosyayi yerlesik sunucu kendisi sunsun.
    return false;
}

// Diger her sey on denetleyiciye.
require $apiRoot . '/index.php';
