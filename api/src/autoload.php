<?php
/**
 * Elle yazilmis basit PSR-4 otomatik yukleyici.
 *
 * Yalnizca Composer'in vendor/autoload.php dosyasi yoksa devreye girer
 * (ag composer'i tumden engellediyse). "Nafu\" ad alanini api/src/ ile esler.
 *
 * Not: firebase/php-jwt ve minishlink/web-push gibi ucuncu taraf paketler
 * yalnizca Composer ile gelir; bu yedek yukleyici yalnizca cekirdek API'nin
 * ve health uc noktasinin Composer olmadan da ayaga kalkmasini saglar.
 */

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'Nafu\\';
    $baseDir = __DIR__ . '/';

    $len = strlen($prefix);
    if (strncmp($class, $prefix, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (is_file($file)) {
        require $file;
    }
});
