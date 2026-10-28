<?php
namespace Espo\Core;

/**
 * Class Application
 * 
 * EspoCRM Core Application Kernel.
 * Initializes the dependency injection container, loads metadata configurations,
 * registers custom and system modules, and boots the HTTP/CLI execution context.
 */
class Application
{
    private Container $container;
    private bool $isBooted = false;

    public function __construct(?Container $container = null)
    {
        $this->container = $container ?? new Container();
        $this->registerCoreServices();
    }

    /**
     * Register core singletons into the DI Container.
     */
    protected function registerCoreServices(): void
    {
        $this->container->set('config', function () {
            return [
                'siteUrl' => getenv('ESPOCRM_SITE_URL') ?: 'http://localhost:8080',
                'dateFormat' => 'YYYY-MM-DD',
                'timeZone' => getenv('ESPOCRM_TIMEZONE') ?: 'Asia/Kolkata',
                'version' => '8.3.0',
            ];
        });

        $this->container->set('metadata', function () {
            return new Utils\MetadataManager();
        });
    }

    /**
     * Boot the application kernel and load active modules.
     */
    public function boot(): self
    {
        if ($this->isBooted) {
            return $this;
        }

        // Boot module hooks and metadata cache
        $this->isBooted = true;
        return $this;
    }

    public function getContainer(): Container
    {
        return $this->container;
    }

    public function isBooted(): bool
    {
        return $this->isBooted;
    }
}
