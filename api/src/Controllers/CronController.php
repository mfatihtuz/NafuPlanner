<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Config;
use Nafu\Http\Request;
use Nafu\Support\ApiException;

/**
 * Cron uc noktasi: GET /api/cron/run?key=CRON_SECRET
 *
 * Kullanici kimligi yoktur; gizli anahtarla korunur. Anahtar gecersizse 403
 * doner. Gercek zamanlanmis is mantigi (hatirlatma tarama/gonderme, seri
 * uretimi) henuz uygulanmadi: anahtar dogruysa 501 doner.
 */
final class CronController
{
    public function __construct(private Request $request)
    {
    }

    public function run(Request $request, array $params): mixed
    {
        $expected = (string) Config::get('cron_secret', '');
        $provided = (string) ($request->query('key', '') ?? '');

        if ($expected === '' || !hash_equals($expected, $provided)) {
            throw ApiException::forbidden('Cron anahtarı geçersiz.');
        }

        // Anahtar dogru; gercek is mantigi henuz hazir degil.
        throw ApiException::notImplemented();
    }
}
