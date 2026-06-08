<?php

declare(strict_types=1);

namespace Nafu\Controllers;

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
}
