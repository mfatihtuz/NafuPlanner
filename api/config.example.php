<?php
/**
 * NafuPlanner yapilandirma sablonu.
 *
 * Bu dosyayi `config.php` olarak kopyalayin ve degerleri doldurun.
 * `config.php` git'e KOYULMAZ (.gitignore'da). Sirlar buraya yazilir.
 *
 *   cp config.example.php config.php
 *
 * Alanlar CONVENTIONS.md ile birebir ayni yapidadir.
 */

return [
    // MySQL baglanti bilgileri (Hostinger paylasimli hosting)
    'db' => [
        'host'    => 'localhost',
        'name'    => '',           // veritabani adi
        'user'    => '',           // veritabani kullanicisi
        'pass'    => '',           // veritabani parolasi
        'charset' => 'utf8mb4',
    ],

    // Google OAuth istemci kimligi (ID token audience dogrulamasi icin)
    'google_client_id' => '',

    // Oturum JWT'lerini imzalamak icin uzun rastgele dize.
    // Uretmek icin: php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"
    'jwt_secret' => '',

    // Cron uc noktasini koruyan gizli anahtar (/api/cron/run?key=...).
    // Uretmek icin: php -r "echo bin2hex(random_bytes(24)).PHP_EOL;"
    'cron_secret' => '',

    // Web Push (VAPID) anahtarlari.
    // Uretmek icin (vendor kurulu ise):
    //   php -r "require 'vendor/autoload.php'; var_export(Minishlink\WebPush\VAPID::createVapidKeys());"
    'vapid' => [
        'public'  => '',
        'private' => '',
        'subject' => 'mailto:ornek@alanadi',
    ],

    // Uygulamanin genel adresi (davet linkleri ve cerez kapsami icin)
    'app_url' => 'https://alanadi',

    // Yuklenen dosyalarin saklandigi dizin
    'upload_dir' => __DIR__ . '/uploads',
];
