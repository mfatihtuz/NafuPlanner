<?php

declare(strict_types=1);

namespace Nafu\Http;

use Nafu\Support\ApiException;

/**
 * Basit, bagimliliksiz HTTP yonlendirici.
 *
 * - Yol desenleri {param} yer tutucularini destekler, orn. /groups/{id}.
 * - GET/POST/PATCH/DELETE icin kayit kisayollari var.
 * - Eslesme bulunamazsa 404, yol eslesip yontem eslesmezse 405 zarfi (ApiException) firlatir.
 *
 * Handler imzasi: function(Request $req, array $params): mixed
 * Donen deger Response::json ile zarflanir; handler kendisi de yanit gonderebilir.
 */
final class Router
{
    /** @var array<int,array{method:string,regex:string,params:array<int,string>,handler:callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function patch(string $pattern, callable $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable $handler): void
    {
        $params = [];
        // {param} -> yakalama grubu; her segment slash icermez.
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function (array $m) use (&$params): string {
                $params[] = $m[1];
                return '([^/]+)';
            },
            $pattern
        );

        $this->routes[] = [
            'method'  => $method,
            'regex'   => '#^' . $regex . '$#',
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    /**
     * Istegi uygun handler'a dagitir.
     *
     * Donen degeri (Response gonderilmediyse) cagiran tarafa verir; orada
     * Response::json ile zarflanir. Eslesme yoksa ApiException firlatir.
     */
    public function dispatch(Request $request): mixed
    {
        $method = $request->method();
        $path   = $request->path();

        $pathMatchedButMethodNot = false;

        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $path, $matches) === 1) {
                if ($route['method'] !== $method) {
                    $pathMatchedButMethodNot = true;
                    continue;
                }

                array_shift($matches); // tam eslesmeyi at
                $params = [];
                foreach ($route['params'] as $i => $name) {
                    $params[$name] = rawurldecode($matches[$i] ?? '');
                }

                return ($route['handler'])($request, $params);
            }
        }

        if ($pathMatchedButMethodNot) {
            throw new ApiException(
                'method_not_allowed',
                'Bu adres için kullanılan istek yöntemi desteklenmiyor.',
                405
            );
        }

        throw ApiException::notFound('Aradığınız adres bulunamadı.');
    }
}
