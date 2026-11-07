<?php
namespace Espo\Core\Api;

/**
 * Class Response
 * 
 * EspoCRM REST API Response representation.
 * Handles standard JSON payloads, status codes, and pagination headers.
 */
class Response
{
    private int $statusCode;
    private array $data;
    private array $headers;

    public function __construct(int $statusCode = 200, array $data = [], array $headers = [])
    {
        $this->statusCode = $statusCode;
        $this->data = $data;
        $this->headers = array_merge([
            'Content-Type' => 'application/json; charset=utf-8',
            'X-Espo-Version' => '8.3.0',
        ], $headers);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getData(): array
    {
        return $this->data;
    }

    public function getHeaders(): array
    {
        return $this->headers;
    }

    public function toJson(): string
    {
        return json_encode($this->data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }

    public static function ok(array $data): self
    {
        return new self(200, $data);
    }

    public static function created(array $data): self
    {
        return new self(201, $data);
    }

    public static function error(string $message, int $code = 400): self
    {
        return new self($code, ['error' => true, 'message' => $message]);
    }
}
