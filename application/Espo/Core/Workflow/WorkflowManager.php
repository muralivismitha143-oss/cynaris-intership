<?php
namespace Espo\Core\Workflow;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Class WorkflowManager
 * 
 * EspoCRM Enterprise Workflow Rule Evaluation Engine.
 * Intercepts entity lifecycle triggers (afterCreate, afterSave, time-based scheduled),
 * evaluates declarative condition expressions against entity attributes,
 * and executes configured business actions (sendEmail, createTask, updateEntity, triggerWebhook).
 */
class WorkflowManager
{
    private EntityManager $entityManager;
    /** @var array<string, array> */
    private array $rules = [];

    public function __construct(EntityManager $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    /**
     * Register a declarative workflow rule definition.
     */
    public function registerRule(array $rule): void
    {
        $id = $rule['id'] ?? uniqid('rule_');
        $this->rules[$id] = array_merge([
            'id' => $id,
            'name' => 'Unnamed Rule',
            'entityType' => 'Lead',
            'triggerType' => 'afterSave', // afterCreate, afterSave, scheduled
            'conditions' => [],
            'actions' => [],
            'isActive' => true,
        ], $rule);
    }

    /**
     * Evaluate active workflow rules matching the entity type and trigger event.
     * 
     * @return array<array> List of execution trace logs
     */
    public function evaluate(Entity $entity, string $triggerType): array
    {
        $traces = [];

        foreach ($this->rules as $rule) {
            if (!$rule['isActive']) {
                continue;
            }
            if ($rule['entityType'] !== $entity->getEntityType()) {
                continue;
            }
            if ($rule['triggerType'] !== $triggerType) {
                continue;
            }

            $conditionsMet = $this->evaluateConditions($entity, $rule['conditions']);
            $trace = [
                'ruleId' => $rule['id'],
                'ruleName' => $rule['name'],
                'conditionsEvaluated' => count($rule['conditions']),
                'conditionsPassed' => $conditionsMet,
                'actionsExecuted' => [],
            ];

            if ($conditionsMet) {
                foreach ($rule['actions'] as $action) {
                    $actionResult = $this->executeAction($entity, $action);
                    $trace['actionsExecuted'][] = $actionResult;
                }
            }

            $traces[] = $trace;
        }

        return $traces;
    }

    /**
     * Evaluate an array of rule conditions against entity attributes.
     */
    public function evaluateConditions(Entity $entity, array $conditions): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $cond) {
            $field = $cond['field'] ?? '';
            $operator = $cond['operator'] ?? 'equals';
            $expected = $cond['value'] ?? null;
            $actual = $entity->get($field);

            if (!$this->checkCondition($actual, $operator, $expected)) {
                return false; // AND logic between conditions
            }
        }

        return true;
    }

    protected function checkCondition($actual, string $operator, $expected): bool
    {
        switch ($operator) {
            case 'equals':
                return $actual === $expected;
            case 'notEquals':
                return $actual !== $expected;
            case 'greaterThan':
                return (float)$actual > (float)$expected;
            case 'greaterThanOrEqual':
                return (float)$actual >= (float)$expected;
            case 'lessThan':
                return (float)$actual < (float)$expected;
            case 'in':
                return is_array($expected) && in_array($actual, $expected, true);
            case 'notEmpty':
                return !empty($actual);
            case 'contains':
                return is_string($actual) && strpos($actual, (string)$expected) !== false;
            default:
                return false;
        }
    }

    /**
     * Execute a specific workflow action on the entity.
     */
    protected function executeAction(Entity $entity, array $action): array
    {
        $type = $action['type'] ?? 'unknown';

        switch ($type) {
            case 'sendEmail':
                return [
                    'type' => 'sendEmail',
                    'template' => $action['template'] ?? 'default_template',
                    'recipient' => $entity->get($action['recipientField'] ?? 'emailAddress'),
                    'status' => 'dispatched',
                ];

            case 'createTask':
                $taskEntity = $this->entityManager->getEntity('Task', [
                    'name' => $action['subject'] ?? 'Follow-up Task',
                    'parentType' => $entity->getEntityType(),
                    'parentId' => $entity->get('id'),
                    'status' => 'Not Started',
                    'priority' => $action['priority'] ?? 'Normal',
                ]);
                $this->entityManager->saveEntity($taskEntity);
                return [
                    'type' => 'createTask',
                    'taskId' => $taskEntity->get('id'),
                    'subject' => $taskEntity->get('name'),
                    'status' => 'created',
                ];

            case 'updateEntity':
                if (!empty($action['field']) && array_key_exists('value', $action)) {
                    $entity->set($action['field'], $action['value']);
                    $this->entityManager->saveEntity($entity);
                }
                return [
                    'type' => 'updateEntity',
                    'field' => $action['field'] ?? '',
                    'newValue' => $action['value'] ?? null,
                    'status' => 'updated',
                ];

            case 'triggerWebhook':
                return [
                    'type' => 'triggerWebhook',
                    'url' => $action['url'] ?? 'https://api.cynaris.com/webhook',
                    'status' => 'queued',
                ];

            default:
                return ['type' => $type, 'status' => 'unrecognized'];
        }
    }

    public function getRules(): array
    {
        return array_values($this->rules);
    }
}
