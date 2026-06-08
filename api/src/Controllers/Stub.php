<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Http\Request;
use Nafu\Support\ApiException;

/**
 * Henuz uygulanmamis denetleyiciler icin ortak yardimci.
 *
 * Frontend bu uc noktalari cagirdiginda temiz bir 501 zarfi alir:
 *   {"ok":false,"error":{"code":"not_implemented","message":"..."}}
 *
 * __call sayesinde route'lanan herhangi bir metot adi (getX, postX, ...) ayni
 * 501 yanitini uretir; ayrica yeni metot eklemeye gerek kalmaz.
 */
trait Stub
{
    public function __construct(protected Request $request)
    {
    }

    /**
     * Tanimsiz (ama route'lanmis) metot cagrildiginda 501 firlatir.
     *
     * @param array<int,mixed> $arguments
     */
    public function __call(string $name, array $arguments): mixed
    {
        return $this->notImplemented();
    }

    protected function notImplemented(): never
    {
        throw ApiException::notImplemented();
    }
}
