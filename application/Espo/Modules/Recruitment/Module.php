<?php
namespace Espo\Modules\Recruitment;

use Espo\Core\Container;

/**
 * Class Module
 * 
 * EspoCRM Recruitment Module entrypoint.
 * Demonstrates EspoCRM's modular architecture: encapsulates custom entity definitions
 * (e.g., JobApplicant, InterviewPipeline), dependency hooks, and custom API routes.
 */
class Module
{
    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function getName(): string
    {
        return 'CynarisRecruitment';
    }

    public function getVersion(): string
    {
        return '1.0.0';
    }

    public function getEntityList(): array
    {
        return [
            'JobApplicant',
            'InterviewStage',
            'CandidateAssessment',
        ];
    }

    public function onLoad(): void
    {
        // Hook into EspoCRM initialization cycle
    }
}
