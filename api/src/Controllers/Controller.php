<?php

declare(strict_types=1);

namespace Nafu\Controllers;

use Nafu\Auth\Auth;
use Nafu\Http\Request;
use PDO;
use Nafu\Database;

/**
 * Denetleyiciler icin ortak temel: istek, kimlik dogrulama ve PDO erisimi.
 */
abstract class Controller
{
    protected Auth $auth;

    public function __construct(protected Request $request)
    {
        $this->auth = new Auth($request);
    }

    protected function db(): PDO
    {
        return Database::pdo();
    }

    /**
     * URL parametresini guvenli sekilde pozitif tam sayiya cevirir.
     */
    protected function intParam(array $params, string $key): int
    {
        return (int) ($params[$key] ?? 0);
    }
}
