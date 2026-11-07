<?php
namespace Espo\ORM;

/**
 * Class Entity
 * 
 * Base Entity representation in EspoCRM's ORM.
 * Stores attributes dynamically based on metadata definitions.
 */
class Entity
{
    protected string $entityType;
    protected array $attributes = [];
    protected array $modifiedAttributes = [];
    protected bool $isNew = true;

    public function __construct(string $entityType, array $attributes = [], bool $isNew = true)
    {
        $this->entityType = $entityType;
        $this->attributes = $attributes;
        $this->isNew = $isNew;
    }

    public function getEntityType(): string
    {
        return $this->entityType;
    }

    public function get(string $name, $default = null)
    {
        return $this->attributes[$name] ?? $default;
    }

    public function set(string $name, $value): self
    {
        if (!array_key_exists($name, $this->attributes) || $this->attributes[$name] !== $value) {
            $this->attributes[$name] = $value;
            $this->modifiedAttributes[$name] = true;
        }
        return $this;
    }

    public function has(string $name): bool
    {
        return isset($this->attributes[$name]);
    }

    public function isNew(): bool
    {
        return $this->isNew;
    }

    public function setIsNew(bool $isNew): self
    {
        $this->isNew = $isNew;
        return $this;
    }

    public function toArray(): array
    {
        return $this->attributes;
    }
}
