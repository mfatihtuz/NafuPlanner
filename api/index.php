<?php

declare(strict_types=1);

/**
 * NafuPlanner API — on denetleyici (front controller).
 *
 * Tum istekler buraya yonlendirilir (Apache: .htaccess; PHP yerlesik sunucusu:
 * router.php). Gorevleri:
 *   1. Otomatik yukleyiciyi devreye al (Composer; yoksa elle yazilmis yedek).
 *   2. Yapilandirmayi yukle (config.php yoksa uretimde net 500).
 *   3. JSON icerik tipini ve hata yakalamayi kur (her sey zarfa cevrilir).
 *   4. Yonlendiriciyi kur, tum uc noktalari bagla ve istegi dagit.
 *
 * Zarf bicimi (CONVENTIONS.md):
 *   Basari: {"ok":true,"data":...}
 *   Hata:   {"ok":false,"error":{"code","message"}}
 */

use Nafu\Config;
use Nafu\Http\Request;
use Nafu\Http\Response;
use Nafu\Http\Router;
use Nafu\Support\ApiException;
use Nafu\Support\ValidationException;

// ---------------------------------------------------------------------------
// 1. Otomatik yukleyici
// ---------------------------------------------------------------------------
$composerAutoload = __DIR__ . '/vendor/autoload.php';
if (is_file($composerAutoload)) {
    require $composerAutoload;
} else {
    // Composer yoksa cekirdek "Nafu\" siniflari icin yedek yukleyici.
    require __DIR__ . '/src/autoload.php';
}

// ---------------------------------------------------------------------------
// 2. Hata raporlamayi sustur (ciktiya sizmasin), tum hatalari biz yakalayalim
// ---------------------------------------------------------------------------
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ---------------------------------------------------------------------------
// 3. Calistir (tum kapsam tek try icinde; her hata zarfa cevrilir)
// ---------------------------------------------------------------------------
try {
    // Yapilandirma yoksa net 500 (sirlar gerekir).
    if (!Config::exists()) {
        Response::error(
            'config_missing',
            'Sunucu yapilandirmasi eksik. config.example.php dosyasini config.php olarak kopyalayip doldurun.',
            500
        );
    }
    // Yapilandirmayi onceden yukle (bicim hatasi varsa burada yakalanir).
    Config::all();

    $request = Request::fromGlobals();

    // OPTIONS on istegine (CORS olmadan da) hizli yanit.
    if ($request->method() === 'OPTIONS') {
        Response::json(null, 204);
    }

    $router = new Router();
    require __DIR__ . '/src/routes.php';
    bind_routes($router, $request);

    $result = $router->dispatch($request);

    // Handler kendisi yanit gondermediyse, donen degeri zarfla.
    Response::json($result);
} catch (ValidationException $e) {
    Response::error($e->errorCode(), $e->getMessage(), $e->status(), ['fields' => $e->fields()]);
} catch (ApiException $e) {
    Response::error($e->errorCode(), $e->getMessage(), $e->status());
} catch (\Throwable $e) {
    // Beklenmeyen hata: ayrinti loglanir, istemciye genel mesaj doner.
    error_log('[NafuPlanner] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Response::error('server_error', 'Sunucuda beklenmeyen bir hata olustu.', 500);
}
