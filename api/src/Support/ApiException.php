<?php

declare(strict_types=1);

namespace Nafu\Support;

use RuntimeException;
use Throwable;

/**
 * Denetleyiciler tarafindan firlatilan, hata zarfina cevrilebilen istisna.
 *
 * Tasidigi alanlar dogrudan {"ok":false,"error":{"code","message"}} zarfina
 * ve HTTP durum koduna eslenir. Mesajlar Turkce'dir.
 */
class ApiException extends RuntimeException
{
    public function __construct(
        private string $errorCode,
        string $message,
        private int $status = 400,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function status(): int
    {
        return $this->status;
    }

    // --- Sik kullanilan kisayollar ----------------------------------------

    public static function unauthorized(string $message = 'Oturum açmanız gerekiyor.'): self
    {
        return new self('unauthorized', $message, 401);
    }

    public static function forbidden(string $message = 'Bu işlem için yetkiniz yok.'): self
    {
        return new self('forbidden', $message, 403);
    }

    public static function notFound(string $message = 'Kayıt bulunamadı.'): self
    {
        return new self('not_found', $message, 404);
    }

    public static function conflict(string $message = 'Çakışma oldu.'): self
    {
        return new self('conflict', $message, 409);
    }

    public static function badRequest(string $message = 'Geçersiz istek.'): self
    {
        return new self('bad_request', $message, 400);
    }

    public static function notImplemented(string $message = 'Bu uç nokta henüz hazır değil.'): self
    {
        return new self('not_implemented', $message, 501);
    }
}
