<?php

declare(strict_types=1);

namespace Nafu\Support;

/**
 * Basit girdi dogrulayici. Hatalar toplanir ve {@see ValidationException} (422)
 * olarak firlatilir. Tum mesajlar Turkce'dir.
 *
 * Kullanim:
 *   $v = new Validator($body);
 *   $name = $v->required('name')->string('name', 1, 120)->value('name');
 *   $v->check(); // hata varsa 422 firlatir
 */
final class Validator
{
    /** @var array<string,mixed> */
    private array $data;

    /** @var array<string,string> */
    private array $errors = [];

    /** @param array<string,mixed> $data */
    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /** Alanin var ve bos olmadigini dogrular. */
    public function required(string $field, string $message = 'Bu alan zorunludur.'): self
    {
        $value = $this->data[$field] ?? null;
        if ($value === null || (is_string($value) && trim($value) === '')) {
            $this->errors[$field] ??= $message;
        }

        return $this;
    }

    /** Alan varsa dize olmasini ve uzunluk araliginda olmasini dogrular. */
    public function string(string $field, int $min = 0, int $max = 65535): self
    {
        if (!array_key_exists($field, $this->data) || $this->data[$field] === null) {
            return $this;
        }
        $value = $this->data[$field];
        if (!is_string($value)) {
            $this->errors[$field] ??= 'Metin bekleniyor.';
            return $this;
        }
        $len = mb_strlen(trim($value));
        if ($len < $min) {
            $this->errors[$field] ??= sprintf('En az %d karakter olmalı.', $min);
        } elseif ($len > $max) {
            $this->errors[$field] ??= sprintf('En fazla %d karakter olabilir.', $max);
        }

        return $this;
    }

    /** Alan varsa tam sayi (veya sayisal dize) olmasini dogrular. */
    public function integer(string $field): self
    {
        if (!array_key_exists($field, $this->data) || $this->data[$field] === null) {
            return $this;
        }
        $value = $this->data[$field];
        if (!is_int($value) && !(is_string($value) && preg_match('/^-?\d+$/', $value))) {
            $this->errors[$field] ??= 'Sayı bekleniyor.';
        }

        return $this;
    }

    /** Alan varsa izinli degerlerden biri olmasini dogrular. */
    public function in(string $field, array $allowed): self
    {
        if (!array_key_exists($field, $this->data) || $this->data[$field] === null) {
            return $this;
        }
        if (!in_array($this->data[$field], $allowed, true)) {
            $this->errors[$field] ??= 'Geçersiz değer.';
        }

        return $this;
    }

    /** Alan varsa gecerli bir e-posta olmasini dogrular. */
    public function email(string $field): self
    {
        if (!array_key_exists($field, $this->data) || $this->data[$field] === null) {
            return $this;
        }
        if (!filter_var((string) $this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] ??= 'Geçerli bir e-posta adresi girin.';
        }

        return $this;
    }

    /** Elle hata ekler. */
    public function addError(string $field, string $message): self
    {
        $this->errors[$field] ??= $message;
        return $this;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /** Hata varsa 422 firlatir. */
    public function check(): void
    {
        if ($this->errors !== []) {
            throw new ValidationException($this->errors);
        }
    }

    /** Ham degeri dondurur (kontroller calistirildiktan sonra). */
    public function value(string $field, mixed $default = null): mixed
    {
        return $this->data[$field] ?? $default;
    }

    /** Kirpilmis dize degeri dondurur. */
    public function str(string $field, ?string $default = null): ?string
    {
        $value = $this->data[$field] ?? null;
        if ($value === null) {
            return $default;
        }
        return is_string($value) ? trim($value) : (string) $value;
    }

    /** Tam sayi degeri dondurur. */
    public function int(string $field, ?int $default = null): ?int
    {
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') {
            return $default;
        }
        return (int) $value;
    }
}
