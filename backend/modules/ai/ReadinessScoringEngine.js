/**
 * ReadinessScoringEngine.js
 *
 * Week 8 Day 2: Module 6 & 7 — Placement Readiness Score + Interview Readiness Score
 *
 * Responsibilities:
 * 1. Deterministic weighted scoring for Placement Readiness (40/30/10/20%) and
 *    Interview Readiness (40/30/20/10%) bounded strictly to [0, 100].
 * 2. Standardized letter grade assignment (A/B/C/D) and component-level recommendations.
 * 3. Vector-grounded prompt engineering & multi-tier LLM reasoning (Groq -> OpenRouter -> Local)
 *    generating exactly Top 3 personalized improvement actions in structured JSON.
 * 4. RFC 4180 CSV serialization with formula-injection neutralization for Admin cohort exports.
 */

const CIA_HOURS_BENCHMARK = 20.0;

const PLACEMENT_WEIGHTS = [
  { key: 'project_completion_pct', label: 'Project Completion %', weight: 0.40 },
  { key: 'assessment_score', label: 'Assessment Scores', weight: 0.30 },
  { key: 'cia_usage_normalized', label: 'CIA Usage Hours', weight: 0.10 },
  { key: 'documentation_quality', label: 'Documentation Quality', weight: 0.20 },
];

const INTERVIEW_WEIGHTS = [
  { key: 'viva_score', label: 'Viva Scores', weight: 0.40 },
  { key: 'code_review_score', label: 'Code Review Scores', weight: 0.30 },
  { key: 'demo_clarity_score', label: 'Communication Clarity in Demos', weight: 0.20 },
  { key: 'git_workflow_score', label: 'Git Workflow Quality', weight: 0.10 },
];

/**
 * Parse and strictly clamp a score to [min, max]. Throws on non-numeric values.
 */
function parseClampedMetric(value, fieldName, fallback = 0, min = 0, max = 100) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid numeric value for ${fieldName}: '${value}'`);
  }
  const clamped = Math.min(max, Math.max(min, num));
  return Math.round(clamped * 10) / 10;
}

/**
 * Assign letter grade (A/B/C/D) for any 0-100 readiness score.
 */
function assignReadinessGrade(score) {
  const s = Number(score) || 0;
  if (s >= 85.0) return 'A';
  if (s >= 70.0) return 'B';
  if (s >= 55.0) return 'C';
  return 'D';
}

/**
 * Return human-readable tier label for a letter grade.
 */
function getGradeLabel(grade) {
  switch (grade) {
    case 'A': return 'Ready for Placement / Interview (Distinction)';
    case 'B': return 'Proficient — Minor Targeted Polish Needed';
    case 'C': return 'Developing — Structured Remediation Recommended';
    default: return 'Needs Intensive Coaching & Milestone Completion';
  }
}

/**
 * Calculate Module 6: Placement Readiness Score (0-100, A/B/C/D).
 * Weights: Project Completion 40%, Assessment 30%, CIA Hours 10%, Documentation 20%.
 */
function calculatePlacementReadiness(input = {}) {
  const projectCompletionPct = parseClampedMetric(
    input.project_completion_pct ?? input.projectCompletionPct,
    'project_completion_pct',
    75
  );
  const assessmentScore = parseClampedMetric(
    input.assessment_score ?? input.assessmentScore,
    'assessment_score',
    75
  );
  const ciaUsageHours = parseClampedMetric(
    input.cia_usage_hours ?? input.ciaUsageHours,
    'cia_usage_hours',
    12,
    0,
    200
  );
  const documentationQuality = parseClampedMetric(
    input.documentation_quality ?? input.documentationQuality,
    'documentation_quality',
    75
  );

  const ciaUsageNormalized = Math.round(Math.min(100, (ciaUsageHours / CIA_HOURS_BENCHMARK) * 100) * 10) / 10;

  const metricMap = {
    project_completion_pct: projectCompletionPct,
    assessment_score: assessmentScore,
    cia_usage_normalized: ciaUsageNormalized,
    documentation_quality: documentationQuality,
  };

  let weightedSum = 0;
  const breakdown = PLACEMENT_WEIGHTS.map((w) => {
    const raw = metricMap[w.key];
    const weightedContribution = Math.round(raw * w.weight * 100) / 100;
    weightedSum += raw * w.weight;
    return {
      key: w.key,
      label: w.label,
      weight_pct: Math.round(w.weight * 100),
      raw_score: raw,
      raw_hours: w.key === 'cia_usage_normalized' ? ciaUsageHours : undefined,
      benchmark_hours: w.key === 'cia_usage_normalized' ? CIA_HOURS_BENCHMARK : undefined,
      weighted_contribution: weightedContribution,
    };
  });

  const score = Math.round(Math.min(100, Math.max(0, weightedSum)) * 10) / 10;
  const grade = assignReadinessGrade(score);

  const improvementRecommendations = [...breakdown]
    .sort((a, b) => a.raw_score - b.raw_score)
    .filter((item) => item.raw_score < 90)
    .slice(0, 3)
    .map((item) => {
      if (item.key === 'cia_usage_normalized') {
        return `Increase CIA usage from ${ciaUsageHours}h toward the ${CIA_HOURS_BENCHMARK}h benchmark using Mentor & Code Mode reviews.`;
      }
      if (item.key === 'documentation_quality') {
        return `Elevate ${item.label} (${item.raw_score}%) with architecture diagrams, API schemas, and concise README walkthroughs.`;
      }
      if (item.key === 'project_completion_pct') {
        return `Raise ${item.label} (${item.raw_score}%) by closing remaining module deliverables and automated unit tests.`;
      }
      return `Improve ${item.label} (${item.raw_score}%) through targeted quiz remediation and timed technical drills.`;
    });

  if (improvementRecommendations.length === 0) {
    improvementRecommendations.push('Maintain strong execution consistency across deliverables and peer documentation reviews.');
  }

  return {
    score,
    grade,
    grade_label: getGradeLabel(grade),
    inputs: {
      project_completion_pct: projectCompletionPct,
      assessment_score: assessmentScore,
      cia_usage_hours: ciaUsageHours,
      cia_usage_normalized: ciaUsageNormalized,
      documentation_quality: documentationQuality,
    },
    breakdown,
    improvement_recommendations: improvementRecommendations,
  };
}

/**
 * Calculate Module 7: Interview Readiness Score (0-100, A/B/C/D).
 * Weights: Viva 40%, Code Review 30%, Demo Clarity 20%, Git Workflow 10%.
 */
function calculateInterviewReadiness(input = {}) {
  const vivaScore = parseClampedMetric(
    input.viva_score ?? input.vivaScore,
    'viva_score',
    75
  );
  const codeReviewScore = parseClampedMetric(
    input.code_review_score ?? input.codeReviewScore,
    'code_review_score',
    75
  );
  const demoClarityScore = parseClampedMetric(
    input.demo_clarity_score ?? input.demoClarityScore ?? input.communication_clarity_score ?? input.communicationClarityScore,
    'demo_clarity_score',
    75
  );
  const gitWorkflowScore = parseClampedMetric(
    input.git_workflow_score ?? input.gitWorkflowScore,
    'git_workflow_score',
    75
  );

  const metricMap = {
    viva_score: vivaScore,
    code_review_score: codeReviewScore,
    demo_clarity_score: demoClarityScore,
    git_workflow_score: gitWorkflowScore,
  };

  let weightedSum = 0;
  const breakdown = INTERVIEW_WEIGHTS.map((w) => {
    const raw = metricMap[w.key];
    const weightedContribution = Math.round(raw * w.weight * 100) / 100;
    weightedSum += raw * w.weight;
    return {
      key: w.key,
      label: w.label,
      weight_pct: Math.round(w.weight * 100),
      raw_score: raw,
      weighted_contribution: weightedContribution,
    };
  });

  const score = Math.round(Math.min(100, Math.max(0, weightedSum)) * 10) / 10;
  const grade = assignReadinessGrade(score);

  const improvementRecommendations = [...breakdown]
    .sort((a, b) => a.raw_score - b.raw_score)
    .filter((item) => item.raw_score < 90)
    .slice(0, 3)
    .map((item) => {
      if (item.key === 'viva_score') {
        return `Strengthen ${item.label} (${item.raw_score}%) by practicing architectural tradeoff answers and live code walkthroughs.`;
      }
      if (item.key === 'code_review_score') {
        return `Improve ${item.label} (${item.raw_score}%) by eliminating code duplication, validating inputs, and guarding async edge cases.`;
      }
      if (item.key === 'demo_clarity_score') {
        return `Sharpen ${item.label} (${item.raw_score}%) using structured 3-minute demos (Problem -> Architecture -> Live Proof).`;
      }
      return `Upgrade ${item.label} (${item.raw_score}%) with atomic conventional commits, clean rebases, and descriptive PR templates.`;
    });

  if (improvementRecommendations.length === 0) {
    improvementRecommendations.push('Ready for panel interviews — continue mock system design and behavioral storytelling drills.');
  }

  return {
    score,
    grade,
    grade_label: getGradeLabel(grade),
    inputs: {
      viva_score: vivaScore,
      code_review_score: codeReviewScore,
      demo_clarity_score: demoClarityScore,
      git_workflow_score: gitWorkflowScore,
    },
    breakdown,
    improvement_recommendations: improvementRecommendations,
  };
}

/**
 * Build deterministic Top 3 improvement actions ranked by lowest weighted gap across both scores.
 */
function buildDeterministicTop3Actions(placement, interview) {
  const allComponents = [
    ...placement.breakdown.map((b) => ({
      ...b,
      dimension: 'Placement Readiness',
      impact_gap: (100 - b.raw_score) * (b.weight_pct / 100),
    })),
    ...interview.breakdown.map((b) => ({
      ...b,
      dimension: 'Interview Readiness',
      impact_gap: (100 - b.raw_score) * (b.weight_pct / 100),
    })),
  ].sort((a, b) => b.impact_gap - a.impact_gap);

  const templates = {
    project_completion_pct: {
      title: 'Complete Pending Capstone & Weekly Module Deliverables',
      action_plan: 'Prioritize unfinished functional endpoints, database migrations, and automated unit tests to push completion above 90%.',
      estimated_hours: 6,
    },
    assessment_score: {
      title: 'Close Core Assessment & Quiz Competency Gaps',
      action_plan: 'Review missed assessment questions on REST status codes, SQL indexing, and async Node.js patterns.',
      estimated_hours: 4,
    },
    cia_usage_normalized: {
      title: 'Increase Structured CIA Mentor & Code Mode Sessions',
      action_plan: 'Log 2 daily CIA sessions (Mentor review before commit + Code Mode edge-case audit) toward the 20h benchmark.',
      estimated_hours: 4,
    },
    documentation_quality: {
      title: 'Upgrade Technical Documentation & Architecture Diagrams',
      action_plan: 'Add Mermaid sequence diagrams, API contracts, and viva defense notes to submission reports and README.',
      estimated_hours: 3,
    },
    viva_score: {
      title: 'Run Mock Technical Viva & Tradeoff Defense Drills',
      action_plan: 'Practice concise 90-second answers covering architecture choices, fallback resilience, and production risks.',
      estimated_hours: 4,
    },
    code_review_score: {
      title: 'Harden Code Quality, Error Handling & Edge-Case Guards',
      action_plan: 'Refactor duplicated logic into shared helpers, enforce input validation, and verify 100% test pass rate.',
      estimated_hours: 3,
    },
    demo_clarity_score: {
      title: 'Refine Demo Storytelling & Live Walkthrough Pacing',
      action_plan: 'Structure feature demos around problem context, live UI/API proof, and measurable engineering metrics.',
      estimated_hours: 2,
    },
    git_workflow_score: {
      title: 'Enforce Atomic Conventional Commits & Clean Rebase Hygiene',
      action_plan: 'Split changes into >= 2 focused commits (type(scope): description), rebase cleanly, and complete PR templates.',
      estimated_hours: 2,
    },
  };

  return allComponents.slice(0, 3).map((comp, idx) => {
    const tpl = templates[comp.key] || {
      title: `Improve ${comp.label}`,
      action_plan: `Focus remediation effort on ${comp.label} to raise ${comp.dimension}.`,
      estimated_hours: 3,
    };
    const priority = comp.raw_score < 60 ? 'Critical' : comp.raw_score < 75 ? 'High' : comp.raw_score < 88 ? 'Medium' : 'Low';
    return {
      rank: idx + 1,
      title: tpl.title,
      dimension: comp.dimension,
      target_metric: comp.key,
      current_score: comp.raw_score,
      target_score: Math.min(95, Math.max(85, Math.round(comp.raw_score + 12))),
      priority,
      estimated_hours: tpl.estimated_hours,
      action_plan: tpl.action_plan,
    };
  });
}

/**
 * Construct structured prompt for Groq/OpenRouter to generate Top 3 Improvement Actions.
 */
function buildReadinessActionsPrompt(internProfile, placement, interview, vectorMatches = []) {
  const systemPrompt = `You are a Principal Engineering Placement Advisor at Cynaris Solutions.
Analyze the intern's quantitative Placement Readiness and Interview Readiness breakdowns alongside retrieved competency benchmarks.
Return strictly valid JSON matching the schema with an array "top_3_improvement_actions" of length exactly 3.
Do not wrap output in markdown code blocks.`;

  const vectorContext = vectorMatches.length > 0
    ? vectorMatches.map((m) => `- ${m.title || m.role} (similarity: ${m.similarity || m.matchPercentage})`).join('\n')
    : '- Senior Full Stack Engineer Competency Rubric';

  const userPrompt = `Intern: ${internProfile.intern_name || 'Candidate'} (Target Role: ${internProfile.target_role || 'Full Stack Developer'})
Placement Readiness Score: ${placement.score}/100 (Grade ${placement.grade})
- Project Completion (40%): ${placement.inputs.project_completion_pct}%
- Assessment Score (30%): ${placement.inputs.assessment_score}%
- CIA Usage Hours (10%): ${placement.inputs.cia_usage_hours}h (Normalized: ${placement.inputs.cia_usage_normalized}%)
- Documentation Quality (20%): ${placement.inputs.documentation_quality}%

Interview Readiness Score: ${interview.score}/100 (Grade ${interview.grade})
- Viva Score (40%): ${interview.inputs.viva_score}%
- Code Review Score (30%): ${interview.inputs.code_review_score}%
- Demo Clarity (20%): ${interview.inputs.demo_clarity_score}%
- Git Workflow (10%): ${interview.inputs.git_workflow_score}%

Vector-Retrieved Role Benchmarks:
${vectorContext}

Return JSON strictly with:
{
  "executive_summary": "2-sentence readiness summary",
  "top_3_improvement_actions": [
    {
      "rank": 1,
      "title": "Action title",
      "dimension": "Placement Readiness or Interview Readiness",
      "target_metric": "metric_key",
      "current_score": 0,
      "target_score": 85,
      "priority": "Critical|High|Medium|Low",
      "estimated_hours": 4,
      "action_plan": "Concrete engineering action"
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Escape a single CSV cell per RFC 4180 and neutralize spreadsheet formula injection.
 */
function escapeCsvCell(value) {
  let str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize intern readiness rows into an RFC 4180 CSV document.
 */
function formatReadinessCsv(records = []) {
  const headers = [
    'Intern ID',
    'Intern Name',
    'Email',
    'Target Role',
    'Placement Readiness Score',
    'Placement Grade',
    'Project Completion %',
    'Assessment Score',
    'CIA Usage Hours',
    'Documentation Quality',
    'Interview Readiness Score',
    'Interview Grade',
    'Viva Score',
    'Code Review Score',
    'Demo Clarity Score',
    'Git Workflow Score',
    'AI Provider',
    'Updated At',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of records) {
    lines.push(
      [
        row.intern_id,
        row.intern_name,
        row.intern_email || '',
        row.target_role || '',
        row.placement_readiness_score,
        row.placement_grade,
        row.project_completion_pct,
        row.assessment_score,
        row.cia_usage_hours,
        row.documentation_quality,
        row.interview_readiness_score,
        row.interview_grade,
        row.viva_score,
        row.code_review_score,
        row.demo_clarity_score,
        row.git_workflow_score,
        row.ai_provider || '',
        row.updated_at || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

module.exports = {
  CIA_HOURS_BENCHMARK,
  PLACEMENT_WEIGHTS,
  INTERVIEW_WEIGHTS,
  parseClampedMetric,
  assignReadinessGrade,
  getGradeLabel,
  calculatePlacementReadiness,
  calculateInterviewReadiness,
  buildDeterministicTop3Actions,
  buildReadinessActionsPrompt,
  escapeCsvCell,
  formatReadinessCsv,
};
