<?php
namespace Espo\Core\Reporting;

use Espo\ORM\EntityManager;

/**
 * Class ActivityReportService
 * 
 * Generates the "Activities per Account (last 30 days), grouped by type" analytical report.
 * Compiles and executes the union query across polymorphic activity entities (Call, Meeting, Email).
 */
class ActivityReportService
{
    private EntityManager $entityManager;

    public function __construct(EntityManager $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    /**
     * Return the parameterized SQL query for manual or reporting engine execution.
     */
    public function getSqlQuery(int $intervalDays = 30): string
    {
        return <<<SQL
SELECT 
    a.id AS account_id,
    a.name AS account_name,
    act.type AS activity_type,
    COUNT(act.id) AS activity_count,
    MAX(act.date_start) AS latest_activity_date
FROM account a
JOIN (
    SELECT id, name, 'Call' AS type, date_start, parent_id, parent_type 
    FROM `call` 
    WHERE date_start >= DATE_SUB(NOW(), INTERVAL {$intervalDays} DAY) AND deleted = 0
    
    UNION ALL
    
    SELECT id, name, 'Meeting' AS type, date_start, parent_id, parent_type 
    FROM meeting 
    WHERE date_start >= DATE_SUB(NOW(), INTERVAL {$intervalDays} DAY) AND deleted = 0
    
    UNION ALL
    
    SELECT id, name, 'Email' AS type, date_sent AS date_start, parent_id, parent_type 
    FROM email 
    WHERE date_sent >= DATE_SUB(NOW(), INTERVAL {$intervalDays} DAY) AND deleted = 0
) act ON act.parent_id = a.id AND act.parent_type = 'Account'
WHERE a.deleted = 0
GROUP BY a.id, a.name, act.type
ORDER BY a.name ASC, activity_count DESC;
SQL;
    }

    /**
     * Execute aggregation over a dataset and structure for Dashlet visualization.
     */
    public function buildDashletData(array $accounts, array $calls, array $meetings, array $emails, int $intervalDays = 30): array
    {
        $cutoffTimestamp = strtotime("-{$intervalDays} days");
        $results = [];
        $totalsByType = ['Call' => 0, 'Meeting' => 0, 'Email' => 0];

        foreach ($accounts as $acc) {
            $accId = $acc['id'];
            $accName = $acc['name'];

            $matchingCalls = array_filter($calls, fn($c) => 
                $c['parentId'] === $accId && 
                ($c['parentType'] ?? 'Account') === 'Account' && 
                strtotime($c['dateStart']) >= $cutoffTimestamp
            );
            $matchingMeetings = array_filter($meetings, fn($m) => 
                $m['parentId'] === $accId && 
                ($m['parentType'] ?? 'Account') === 'Account' && 
                strtotime($m['dateStart']) >= $cutoffTimestamp
            );
            $matchingEmails = array_filter($emails, fn($e) => 
                $e['parentId'] === $accId && 
                ($e['parentType'] ?? 'Account') === 'Account' && 
                strtotime($e['dateStart']) >= $cutoffTimestamp
            );

            $callCount = count($matchingCalls);
            $meetingCount = count($matchingMeetings);
            $emailCount = count($matchingEmails);
            $total = $callCount + $meetingCount + $emailCount;

            if ($total > 0) {
                $results[] = [
                    'accountId' => $accId,
                    'accountName' => $accName,
                    'calls' => $callCount,
                    'meetings' => $meetingCount,
                    'emails' => $emailCount,
                    'totalActivities' => $total,
                ];

                $totalsByType['Call'] += $callCount;
                $totalsByType['Meeting'] += $meetingCount;
                $totalsByType['Email'] += $emailCount;
            }
        }

        // Sort descending by total activities
        usort($results, fn($a, $b) => $b['totalActivities'] <=> $a['totalActivities']);

        return [
            'timeRangeDays' => $intervalDays,
            'accountCount' => count($results),
            'totalsByType' => $totalsByType,
            'grandTotalActivities' => array_sum($totalsByType),
            'data' => $results,
        ];
    }
}
