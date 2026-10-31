<?php
namespace Espo\ORM;

/**
 * Class Repository
 * 
 * Base Repository for entity data access in EspoCRM.
 * Handles entity persistence, query generation, lifecycle hooks, and filtering.
 */
class Repository
{
    protected string $entityType;
    protected EntityManager $entityManager;
    protected array $records = [];

    public function __construct(string $entityType, EntityManager $entityManager)
    {
        $this->entityType = $entityType;
        $this->entityManager = $entityManager;
    }

    public function getEntityType(): string
    {
        return $this->entityType;
    }

    public function getById(string $id): ?Entity
    {
        return $this->records[$id] ?? null;
    }

    public function save(Entity $entity): bool
    {
        $this->beforeSave($entity);
        $id = $entity->get('id');
        if (!$id) {
            $id = uniqid($this->entityType . '_', true);
            $entity->set('id', $id);
        }
        $entity->setIsNew(false);
        $this->records[$id] = $entity;
        $this->afterSave($entity);
        return true;
    }

    public function delete(Entity $entity): bool
    {
        $id = $entity->get('id');
        if ($id && isset($this->records[$id])) {
            $this->beforeDelete($entity);
            unset($this->records[$id]);
            return true;
        }
        return false;
    }

    public function find(array $criteria = []): array
    {
        $result = array_values($this->records);
        if (!empty($criteria['where'])) {
            $result = array_filter($result, function (Entity $item) use ($criteria) {
                foreach ($criteria['where'] as $field => $val) {
                    if ($item->get($field) !== $val) {
                        return false;
                    }
                }
                return true;
            });
        }
        return array_values($result);
    }

    // Lifecycle Hooks (Customizable in domain repositories)
    protected function beforeSave(Entity $entity): void {}
    protected function afterSave(Entity $entity): void {}
    protected function beforeDelete(Entity $entity): void {}
}
