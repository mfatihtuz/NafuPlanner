<?php

declare(strict_types=1);

namespace Nafu\Support;

/**
 * Dogrulama hatasi. 422 durum koduyla ve alan bazli hata listesiyle zarfa cevrilir.
 *
 * Zarf bicimi:
 *   {"ok":false,"error":{"code":"validation_error","message":"...","fields":{...}}}
 */
final class ValidationException extends ApiException
{
    /** @param array<string,string> $fields alan adi -> Turkce hata mesaji */
    public function __construct(
        private array $fields = [],
        string $message = 'Girilen bilgiler gecersiz.'
    ) {
        parent::__construct('validation_error', $message, 422);
    }

    /** @return array<string,string> */
    public function fields(): array
    {
        return $this->fields;
    }
}
