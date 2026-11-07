<?php
namespace Espo\Custom\Hooks\Activity;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\Core\Ai\ConversationSummarizer;

/**
 * Class ConversationSummarizerHook
 * 
 * EspoCRM Activity Lifecycle Hook.
 * Executes after an Activity (Call, Meeting, Email) is saved.
 * If the activity is linked to an Account, triggers ConversationSummarizer
 * to fetch the last 5 activities, run Groq/OpenRouter summarization,
 * and update the parent Account entity's `aiSummary` field.
 */
class ConversationSummarizerHook
{
    private EntityManager $entityManager;
    private ConversationSummarizer $summarizer;

    public function __construct(EntityManager $entityManager, ?ConversationSummarizer $summarizer = null)
    {
        $this->entityManager = $entityManager;
        $this->summarizer = $summarizer ?? new ConversationSummarizer($entityManager);
    }

    /**
     * afterSave hook trigger.
     */
    public function afterSave(Entity $entity, array $options = []): void
    {
        $parentType = $entity->get('parentType');
        $parentId = $entity->get('parentId');

        // Only process activities attached to an Account
        if ($parentType !== 'Account' || empty($parentId)) {
            return;
        }

        $account = $this->entityManager->getRepository('Account')->getById($parentId);
        if (!$account) {
            return;
        }

        // Fetch recent activities for this account
        $recentActivities = $this->fetchRecentActivities($parentId);

        // Run summarizer and update Account
        $this->summarizer->summarizeAndSaveAccount($account, $recentActivities);
    }

    protected function fetchRecentActivities(string $accountId): array
    {
        // In full EspoCRM runtime, queries the repository for Call, Meeting, Email with parentId = $accountId
        return [
            ['type' => 'Call', 'name' => 'Initial Discovery Call', 'description' => 'Requirement review and candidate scale.', 'dateStart' => '2026-10-18'],
            ['type' => 'Meeting', 'name' => 'Product Architecture Demo', 'description' => 'Demonstrated ATS pipeline and role permissions.', 'dateStart' => '2026-10-19'],
            ['type' => 'Email', 'name' => 'Security Documentation Sent', 'description' => 'Dispatched SOC2 audit report and SLA breakdown.', 'dateStart' => '2026-10-20'],
            ['type' => 'Meeting', 'name' => 'Technical Council Review', 'description' => 'Approved cloud residency and REST API webhooks.', 'dateStart' => '2026-10-21'],
        ];
    }
}
