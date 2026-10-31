<?php
namespace Espo\ORM;

/**
 * Class EntityManager
 * 
 * Central ORM engine in EspoCRM.
 * Manages repository registry, entity creation, and transactional persistence.
 */
class EntityManager
{
    /** @var array<string, Repository> */
    private array $repositories = [];

    /**
     * Get or lazy-load the repository for an entity type.
     */
    public function getRepository(string $entityType): Repository
    {
        if (!isset($this->repositories[$entityType])) {
            $this->repositories[$entityType] = new Repository($entityType, $this);
        }
        return $this->repositories[$entityType];
    }

    /**
     * Create an unpersisted entity instance.
     */
    public function getEntity(string $entityType, array $attributes = []): Entity
    {
        return new Entity($entityType, $attributes, true);
    }

    /**
     * Persist an entity through its registered repository.
     */
    public function saveEntity(Entity $entity): bool
    {
        return $this->getRepository($entity->getEntityType())->save($entity);
    }

    /**
     * Delete an entity.
     */
    public function deleteEntity(Entity $entity): bool
    {
        return $this->getRepository($entity->getEntityType())->delete($entity);
    }
}
