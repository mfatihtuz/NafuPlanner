<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Config;
use Nafu\Http\Request;

/**
 * Saglik kontrolu. Veritabani GEREKTIRMEZ; her zaman temiz bir zarf doner.
 * Dagitimdan sonra '/api/health' ile uygulamanin ayakta oldugu dogrulanir.
 */
final class HealthController
{
    public function getHealth(Request $request, array $params): array
    {
        return [
            'status' => 'ok',
            'time'   => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    /**
     * Istemcinin calisma aninda ihtiyac duydugu ACIK yapilandirma.
     * Yalnizca herkese acik degerler doner (gizli anahtar yok). DB GEREKTIRMEZ.
     * Boylece arayuz, Google Client ID'yi derleme aninda gommek yerine buradan
     * okur; tek config dosyasi (config.php) yeterli olur, yeniden derleme gerekmez.
     */
    public function getConfig(Request $request, array $params): array
    {
        return [
            'google_client_id' => Config::get('google_client_id') ?: null,
            'app_url'          => Config::get('app_url') ?: null,
        ];
    }
}
