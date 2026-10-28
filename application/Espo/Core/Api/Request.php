<?php
namespace Espo\Core\Api;

/**
 * Class Request
 * 
 * EspoCRM REST API Request abstraction.
 * Encapsulates HTTP verb, path params, query filtering, and request body.
 */
class Request
{
    private string $method;
    private string $path;
    private array $headers;
    private array $queryParams;
    private ?array $body;

    public function __construct(
        string $method = 'GET',
        string $path = '/',
        array $queryParams = [],
        ?array $body = null,
        array $headers = []
    ) {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->queryParams = $queryParams;
        $this->body = $body;
        $this->headers = array_change_key_case($headers, CASE_LOWER);
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getQueryParam(string $name, $default = null)
    {
        return $this->queryParams[$name] ?? $default;
    }

    public function getQueryParams(): array
    {
        return $this->queryParams;
    }

    public function getBody(): ?array
    {
        return $this->body;
    }

    public function getHeader(string $name): ?string
    {
        $normalized = strtolower($name);
        return $this->headers[$normalized] ?? null;
    }

    public function getBearerToken(): ?string
    {
        $auth = $this->getHeader('authorization');
        if ($auth && preg_match('/Bearer\s+(\S+)/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
