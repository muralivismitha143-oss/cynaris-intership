<?php
namespace Espo\Core\Bpm;

use Espo\ORM\Entity;

/**
 * Class ProcessEngine
 * 
 * EspoCRM BPM (Business Process Management) Execution Engine.
 * Implements a lightweight BPMN 2.0 runtime for enterprise process orchestration.
 * Manages process instances, token navigation, gateway branching, and automated activity execution.
 */
class ProcessEngine
{
    /** @var array<string, array> */
    private array $processDefinitions = [];
    /** @var array<string, array> */
    private array $instances = [];

    public function registerDefinition(string $id, array $flow): void
    {
        $this->processDefinitions[$id] = $flow;
    }

    /**
     * Start a new process instance for a given entity.
     */
    public function startProcess(string $definitionId, Entity $entity): array
    {
        if (!isset($this->processDefinitions[$definitionId])) {
            throw new \RuntimeException("Process definition '{$definitionId}' not found.");
        }

        $flow = $this->processDefinitions[$definitionId];
        $instanceId = uniqid('proc_inst_');
        $instance = [
            'id' => $instanceId,
            'definitionId' => $definitionId,
            'targetEntityType' => $entity->getEntityType(),
            'targetEntityId' => $entity->get('id'),
            'status' => 'Running',
            'currentNode' => $flow['startNode'] ?? 'StartEvent',
            'history' => [
                ['node' => $flow['startNode'] ?? 'StartEvent', 'timestamp' => date('Y-m-d H:i:s')]
            ],
        ];

        // Execute initial transition
        $this->instances[$instanceId] = $instance;
        return $instance;
    }

    /**
     * Advance a process instance through its next BPMN node.
     */
    public function advance(string $instanceId, array $context = []): array
    {
        if (!isset($this->instances[$instanceId])) {
            throw new \RuntimeException("Process instance '{$instanceId}' not found.");
        }

        $inst = &$this->instances[$instanceId];
        $flow = $this->processDefinitions[$inst['definitionId']];
        $current = $inst['currentNode'];

        $transitions = $flow['transitions'][$current] ?? [];
        if (empty($transitions)) {
            $inst['status'] = 'Completed';
            return $inst;
        }

        // Evaluate next node from transitions
        $nextNode = null;
        foreach ($transitions as $trans) {
            if (!isset($trans['condition']) || $this->evalBpmCondition($trans['condition'], $context)) {
                $nextNode = $trans['target'];
                break;
            }
        }

        if ($nextNode) {
            $inst['currentNode'] = $nextNode;
            $inst['history'][] = ['node' => $nextNode, 'timestamp' => date('Y-m-d H:i:s')];
            if (isset($flow['endNodes']) && in_array($nextNode, $flow['endNodes'], true)) {
                $inst['status'] = 'Completed';
            }
        } else {
            $inst['status'] = 'Terminated';
        }

        return $inst;
    }

    protected function evalBpmCondition(string $expression, array $context): bool
    {
        // Simple evaluator for expressions like 'approved == true' or 'amount > 500000'
        if ($expression === 'true') {
            return true;
        }
        foreach ($context as $key => $val) {
            if (strpos($expression, $key) !== false) {
                if (is_bool($val)) {
                    return $val === (strpos($expression, 'true') !== false);
                }
            }
        }
        return true;
    }

    public function getInstance(string $id): ?array
    {
        return $this->instances[$id] ?? null;
    }
}
