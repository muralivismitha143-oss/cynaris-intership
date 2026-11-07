<?php
namespace Espo\Core\Reporting;

use Espo\ORM\EntityManager;

/**
 * Class ReportEngine
 * 
 * EspoCRM Analytical Reporting & Query Aggregation Engine.
 * Formulates multi-dimensional reporting queries, calculates aggregate measures
 * (SUM, AVG, COUNT, MIN, MAX), groups results by categorical dimensions,
 * and outputs structured data suitable for data visualization and tabular grids.
 */
class ReportEngine
{
    private EntityManager $entityManager;

    public function __construct(EntityManager $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    /**
     * Execute an aggregate reporting definition over in-memory or database entities.
     * 
     * @param array $config Report specification:
     *                      - entityType: string (e.g. 'Opportunity')
     *                      - groupBy: string (e.g. 'stage')
     *                      - measureFunction: string (e.g. 'SUM', 'AVG', 'COUNT')
     *                      - measureField: string (e.g. 'amount')
     *                      - filters: array<string, mixed>
     * 
     * @return array Analytical results with rows, group counts, and grand total
     */
    public function generateReport(array $config, array $dataset = []): array
    {
        $entityType = $config['entityType'] ?? 'Opportunity';
        $groupBy = $config['groupBy'] ?? 'stage';
        $measureFunc = strtoupper($config['measureFunction'] ?? 'COUNT');
        $measureField = $config['measureField'] ?? 'id';
        $filters = $config['filters'] ?? [];

        // Apply filters
        $filtered = array_filter($dataset, function ($row) use ($filters) {
            foreach ($filters as $key => $val) {
                if (!isset($row[$key]) || $row[$key] !== $val) {
                    return false;
                }
            }
            return true;
        });

        // Group rows
        $groups = [];
        foreach ($filtered as $row) {
            $groupKey = $row[$groupBy] ?? 'Unassigned';
            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'group' => $groupKey,
                    'recordCount' => 0,
                    'values' => [],
                ];
            }
            $groups[$groupKey]['recordCount']++;
            if (isset($row[$measureField]) && is_numeric($row[$measureField])) {
                $groups[$groupKey]['values'][] = (float)$row[$measureField];
            }
        }

        // Calculate measures per group
        $rows = [];
        $grandTotal = 0.0;
        $totalRecordCount = 0;

        foreach ($groups as $groupKey => $data) {
            $count = $data['recordCount'];
            $totalRecordCount += $count;
            $vals = $data['values'];
            $metricValue = 0.0;

            switch ($measureFunc) {
                case 'SUM':
                    $metricValue = array_sum($vals);
                    break;
                case 'AVG':
                    $metricValue = count($vals) > 0 ? (array_sum($vals) / count($vals)) : 0.0;
                    break;
                case 'MAX':
                    $metricValue = !empty($vals) ? max($vals) : 0.0;
                    break;
                case 'MIN':
                    $metricValue = !empty($vals) ? min($vals) : 0.0;
                    break;
                case 'COUNT':
                default:
                    $metricValue = (float)$count;
                    break;
            }

            $rows[] = [
                'dimension' => $groupKey,
                'recordCount' => $count,
                'measureValue' => round($metricValue, 2),
            ];

            if ($measureFunc === 'SUM' || $measureFunc === 'COUNT') {
                $grandTotal += $metricValue;
            }
        }

        // Sort descending by measureValue
        usort($rows, fn($a, $b) => $b['measureValue'] <=> $a['measureValue']);

        return [
            'entityType' => $entityType,
            'dimension' => $groupBy,
            'measure' => "{$measureFunc}({$measureField})",
            'rowCount' => count($rows),
            'totalRecordCount' => $totalRecordCount,
            'grandTotal' => round($grandTotal, 2),
            'rows' => $rows,
        ];
    }
}
