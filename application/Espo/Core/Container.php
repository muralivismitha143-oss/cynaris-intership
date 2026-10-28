<?php
namespace Espo\Core;

/**
 * Class Container
 * 
 * Dependency Injection & Service Locator container for EspoCRM.
 * Manages service lifecycles, lazy-instantiation of repositories,
 * controllers, metadata loaders, and database connection pools.
 */
class Container
{
    /** @var array<string, callable|object> */
    private array $services = [];

    /** @var array<string, object> */
    private array $instances = [];

    /**
     * Register a service factory or direct instance.
     */
    public function set(string $name, $service): void
    {
        $this->services[$name] = $service;
        unset($this->instances[$name]);
    }

    /**
     * Resolve a service by name.
     */
    public function get(string $name)
    {
        if (isset($this->instances[$name])) {
            return $this->instances[$name];
        }

        if (!isset($this->services[$name])) {
            throw new \RuntimeException("Service '{$name}' not registered in EspoCRM container.");
        }

        $service = $this->services[$name];
        if (is_callable($service)) {
            $this->instances[$name] = $service($this);
            return $this->instances[$name];
        }

        return $service;
    }

    public function has(string $name): bool
    {
        return isset($this->services[$name]) || isset($this->instances[$name]);
    }
}
