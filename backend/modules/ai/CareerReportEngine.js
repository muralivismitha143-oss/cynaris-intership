/**
 * CareerReportEngine.js
 *
 * Week 8 Day 3: Career Intelligence Report — Archetype Map + Employability Score
 *
 * Responsibilities:
 * 1. Defines 6 Career Archetypes (Builder, Analyst, Leader, Innovator, Specialist, Generalist),
 *    each with a 10-attribute trait profile scored 0-10.
 * 2. Maps intern skill scores, learning style, and project performance into a 10-trait
 *    vector and scores similarity against all 6 archetypes.
 * 3. Computes Employability Score, AI Readiness Score, and Placement Readiness Score (0-100)
 *    reusing ReadinessScoringEngine clamping & grading helpers.
 * 4. Builds structured Groq/OpenRouter prompts for Career Intelligence Report generation
 *    and renders valid binary %PDF-1.4 reports for Express API downloads.
 */

const {
  parseClampedMetric,
  assignReadinessGrade,
  calculatePlacementReadiness,
} = require('./ReadinessScoringEngine');

const TRAIT_KEYS = [
  'system_architecture',
  'hands_on_execution',
  'analytical_rigor',
  'strategic_leadership',
  'cross_team_communication',
  'creative_experimentation',
  'domain_depth',
  'cross_functional_adaptability',
  'ai_tooling_fluency',
  'quality_reliability_focus',
];

const CAREER_ARCHETYPES = [
  {
    name: 'Builder',
    tagline: 'End-to-End Production Engineer & Systems Shipper',
    best_fit_roles: ['Full Stack Engineer', 'Product Engineer', 'Backend Systems Engineer'],
    traits: {
      system_architecture: 8.8,
      hands_on_execution: 9.6,
      analytical_rigor: 7.8,
      strategic_leadership: 7.4,
      cross_team_communication: 7.6,
      creative_experimentation: 8.0,
      domain_depth: 8.2,
      cross_functional_adaptability: 8.0,
      ai_tooling_fluency: 8.4,
      quality_reliability_focus: 8.9,
    },
  },
  {
    name: 'Analyst',
    tagline: 'Data-Driven Problem Solver & Performance Diagnostician',
    best_fit_roles: ['Data Engineer', 'Database Performance Engineer', 'Backend Analyst'],
    traits: {
      system_architecture: 7.6,
      hands_on_execution: 7.8,
      analytical_rigor: 9.7,
      strategic_leadership: 6.8,
      cross_team_communication: 7.5,
      creative_experimentation: 7.0,
      domain_depth: 8.8,
      cross_functional_adaptability: 7.0,
      ai_tooling_fluency: 8.2,
      quality_reliability_focus: 9.2,
    },
  },
  {
    name: 'Leader',
    tagline: 'Technical Coordinator, Mentor & Architecture Owner',
    best_fit_roles: ['Engineering Lead', 'Technical Product Manager', 'Solutions Architect'],
    traits: {
      system_architecture: 8.6,
      hands_on_execution: 7.4,
      analytical_rigor: 8.0,
      strategic_leadership: 9.6,
      cross_team_communication: 9.5,
      creative_experimentation: 7.6,
      domain_depth: 7.4,
      cross_functional_adaptability: 8.8,
      ai_tooling_fluency: 7.8,
      quality_reliability_focus: 8.4,
    },
  },
  {
    name: 'Innovator',
    tagline: 'AI-First Prototyper & Applied R&D Pioneer',
    best_fit_roles: ['AI Systems Engineer', 'Applied LLM Engineer', 'R&D Prototyper'],
    traits: {
      system_architecture: 8.2,
      hands_on_execution: 8.6,
      analytical_rigor: 8.3,
      strategic_leadership: 7.5,
      cross_team_communication: 7.8,
      creative_experimentation: 9.7,
      domain_depth: 8.0,
      cross_functional_adaptability: 8.6,
      ai_tooling_fluency: 9.6,
      quality_reliability_focus: 7.6,
    },
  },
  {
    name: 'Specialist',
    tagline: 'Deep-Domain Authority & High-Precision Craftsperson',
    best_fit_roles: ['Security / DevOps Specialist', 'Core Infrastructure Engineer', 'ML Specialist'],
    traits: {
      system_architecture: 8.4,
      hands_on_execution: 8.5,
      analytical_rigor: 8.9,
      strategic_leadership: 6.9,
      cross_team_communication: 7.0,
      creative_experimentation: 7.4,
      domain_depth: 9.8,
      cross_functional_adaptability: 6.4,
      ai_tooling_fluency: 8.0,
      quality_reliability_focus: 9.3,
    },
  },
  {
    name: 'Generalist',
    tagline: 'Full-Lifecycle Polyglot & Rapid Cross-Stack Adapter',
    best_fit_roles: ['Founding Engineer', 'Full Stack Generalist', 'Forward Deployed Engineer'],
    traits: {
      system_architecture: 7.9,
      hands_on_execution: 8.4,
      analytical_rigor: 7.6,
      strategic_leadership: 8.0,
      cross_team_communication: 8.7,
      creative_experimentation: 8.3,
      domain_depth: 7.0,
      cross_functional_adaptability: 9.6,
      ai_tooling_fluency: 8.3,
      quality_reliability_focus: 7.9,
    },
  },
];

const LEARNING_STYLE_BOOSTS = {
  hands_on: { hands_on_execution: 1.4, quality_reliability_focus: 0.7, system_architecture: 0.6 },
  analytical: { analytical_rigor: 1.5, domain_depth: 0.8, quality_reliability_focus: 0.7 },
  collaborative: { strategic_leadership: 1.4, cross_team_communication: 1.5, cross_functional_adaptability: 0.7 },
  exploratory: { creative_experimentation: 1.5, ai_tooling_fluency: 1.2, cross_functional_adaptability: 0.6 },
  deep_dive: { domain_depth: 1.5, analytical_rigor: 0.9, system_architecture: 0.7 },
  versatile: { cross_functional_adaptability: 1.5, cross_team_communication: 0.8, hands_on_execution: 0.6 },
};

function clampTrait(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 5.0;
  return Math.round(Math.min(10.0, Math.max(0.0, n)) * 10) / 10;
}

/**
 * Derive normalized 10-attribute intern trait profile (0-10) from skill scores,
 * learning style, and project performance metrics.
 */
function buildInternTraitProfile(input = {}) {
  const skillScores = input.skill_scores || input.skillScores || {};
  const learningStyle = String(input.learning_style || input.learningStyle || 'hands_on').toLowerCase().trim();
  const projectPerformance = parseClampedMetric(
    input.project_performance ?? input.projectPerformance ?? input.project_quality ?? input.project_completion_pct,
    'project_performance',
    85
  );
  const assessmentScore = parseClampedMetric(
    input.assessment_scores ?? input.assessment_score ?? input.assessmentScore,
    'assessment_scores',
    84
  );
  const aiToolsCount = Array.isArray(input.ai_tools_used)
    ? input.ai_tools_used.length
    : Number(input.ai_tools_used ?? input.aiToolsUsed ?? 5);
  const aiTasksCompleted = Number(input.ai_tasks_completed ?? input.aiTasksCompleted ?? 8);

  // Average skill score on 0-10 scale (supports either 0-5 or 0-100 input values)
  const rawSkillVals = Object.values(skillScores).map((v) => {
    const lvl = typeof v === 'object' && v !== null ? Number(v.level ?? v.score ?? 3.5) : Number(v);
    if (!Number.isFinite(lvl)) return 7.0;
    return lvl <= 5 ? lvl * 2.0 : lvl / 10.0;
  });
  const avgSkill10 = rawSkillVals.length > 0
    ? rawSkillVals.reduce((a, b) => a + b, 0) / rawSkillVals.length
    : 8.0;
  const skillBreadth10 = Math.min(10, Math.max(4, rawSkillVals.length * 1.15));

  const perf10 = projectPerformance / 10.0;
  const assess10 = assessmentScore / 10.0;
  const ai10 = Math.min(10, ((Math.min(10, aiTasksCompleted) / 10) * 6) + ((Math.min(6, aiToolsCount) / 6) * 4));

  const baseProfile = {
    system_architecture: (avgSkill10 * 0.5 + perf10 * 0.5),
    hands_on_execution: (perf10 * 0.65 + avgSkill10 * 0.35),
    analytical_rigor: (assess10 * 0.65 + avgSkill10 * 0.35),
    strategic_leadership: (perf10 * 0.45 + assess10 * 0.35 + 1.5),
    cross_team_communication: (perf10 * 0.4 + assess10 * 0.4 + 1.5),
    creative_experimentation: (ai10 * 0.55 + perf10 * 0.45),
    domain_depth: (avgSkill10 * 0.6 + assess10 * 0.4),
    cross_functional_adaptability: (skillBreadth10 * 0.55 + perf10 * 0.45),
    ai_tooling_fluency: ai10,
    quality_reliability_focus: (perf10 * 0.5 + assess10 * 0.5),
  };

  const boosts = LEARNING_STYLE_BOOSTS[learningStyle] || LEARNING_STYLE_BOOSTS.hands_on;
  for (const [k, boost] of Object.entries(boosts)) {
    baseProfile[k] = (baseProfile[k] || 7.0) + boost;
  }

  // Allow explicit trait overrides if provided
  const overrides = input.trait_overrides || input.traits || {};
  const finalProfile = {};
  for (const key of TRAIT_KEYS) {
    finalProfile[key] = clampTrait(overrides[key] !== undefined ? overrides[key] : baseProfile[key]);
  }
  return finalProfile;
}

/**
 * Score intern trait vector against all 6 Career Archetypes (0-100 match score).
 */
function scoreCareerArchetypes(input = {}) {
  const internTraits = buildInternTraitProfile(input);
  const internVec = TRAIT_KEYS.map((k) => internTraits[k]);

  const archetypeScores = CAREER_ARCHETYPES.map((arch) => {
    const archVec = TRAIT_KEYS.map((k) => arch.traits[k]);

    let dot = 0;
    let normA = 0;
    let normB = 0;
    let sqDist = 0;
    for (let i = 0; i < TRAIT_KEYS.length; i++) {
      dot += internVec[i] * archVec[i];
      normA += internVec[i] * internVec[i];
      normB += archVec[i] * archVec[i];
      const diff = internVec[i] - archVec[i];
      sqDist += diff * diff;
    }

    const cosine = (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    const maxDist = Math.sqrt(TRAIT_KEYS.length * 100);
    const proximity = 1.0 - (Math.sqrt(sqDist) / maxDist);

    const matchScore = Math.round(Math.min(99.5, Math.max(25.0, ((cosine * 0.65) + (proximity * 0.35)) * 100)) * 10) / 10;

    return {
      archetype: arch.name,
      tagline: arch.tagline,
      match_score: matchScore,
      best_fit_roles: arch.best_fit_roles,
      trait_profile: arch.traits,
    };
  });

  archetypeScores.sort((a, b) => b.match_score - a.match_score);

  return {
    primary_archetype: archetypeScores[0].archetype,
    secondary_archetype: archetypeScores[1].archetype,
    archetype_scores: archetypeScores,
    trait_profile: internTraits,
  };
}

/**
 * Calculate Employability Score, AI Readiness Score, and Placement Readiness Score (0-100).
 */
function calculateCompositeCareerScores(input = {}) {
  const skillCompleteness = parseClampedMetric(
    input.skill_completeness ?? input.skillCompleteness,
    'skill_completeness',
    86
  );
  const projectQuality = parseClampedMetric(
    input.project_quality ?? input.projectQuality ?? input.project_completion_pct,
    'project_quality',
    90
  );
  const assessmentScores = parseClampedMetric(
    input.assessment_scores ?? input.assessmentScores ?? input.assessment_score,
    'assessment_scores',
    88
  );

  // Employability Score: weighted average (40% skill completeness, 35% project quality, 25% assessments)
  const employabilityScore = Math.round(
    ((skillCompleteness * 0.40) + (projectQuality * 0.35) + (assessmentScores * 0.25)) * 10
  ) / 10;

  // AI Readiness Score: AI tasks completed (60%, benchmark 10) + AI tools used (40%, benchmark 6)
  const aiTasksCompleted = parseClampedMetric(
    input.ai_tasks_completed ?? input.aiTasksCompleted,
    'ai_tasks_completed',
    9,
    0,
    100
  );
  const rawTools = input.ai_tools_used ?? input.aiToolsUsed;
  const aiToolsCount = Array.isArray(rawTools)
    ? rawTools.length
    : parseClampedMetric(rawTools, 'ai_tools_used', 5, 0, 50);

  const aiTasksPct = Math.min(100, (aiTasksCompleted / 10.0) * 100);
  const aiToolsPct = Math.min(100, (aiToolsCount / 6.0) * 100);
  const aiReadinessScore = Math.round(((aiTasksPct * 0.60) + (aiToolsPct * 0.40)) * 10) / 10;

  // Placement Readiness Score: delegate to Module 6 engine for exact 40/30/10/20 consistency
  const placement = calculatePlacementReadiness({
    project_completion_pct: input.project_completion_pct ?? projectQuality,
    assessment_score: input.assessment_score ?? assessmentScores,
    cia_usage_hours: input.cia_usage_hours ?? 18,
    documentation_quality: input.documentation_quality ?? 88,
  });

  return {
    employability_score: employabilityScore,
    employability_grade: assignReadinessGrade(employabilityScore),
    employability_breakdown: {
      skill_completeness: skillCompleteness,
      project_quality: projectQuality,
      assessment_scores: assessmentScores,
    },
    ai_readiness_score: aiReadinessScore,
    ai_readiness_grade: assignReadinessGrade(aiReadinessScore),
    ai_readiness_breakdown: {
      ai_tasks_completed: aiTasksCompleted,
      ai_tools_count: aiToolsCount,
      ai_tools_list: Array.isArray(rawTools) ? rawTools : ['Groq', 'OpenRouter', 'ChromaDB', 'LangGraph', 'Docling'],
    },
    placement_readiness_score: placement.score,
    placement_readiness_grade: placement.grade,
    placement_breakdown: placement.breakdown,
  };
}

/**
 * Build prompt for Groq/OpenRouter Career Intelligence Report generation.
 */
function buildCareerReportPrompt(candidateName, targetRole, archetypeResult, scores) {
  const systemPrompt = `You are a Senior Career Intelligence Advisor at Cynaris Solutions.
Generate a concise, structured Career Intelligence Report grounded strictly in the candidate's archetype map and verified composite scores.
Return strictly valid JSON with keys: "report_narrative" (string) and "recommendations" (array of 3 strings).
Do not include markdown code fences.`;

  const userPrompt = `Candidate: ${candidateName}
Target Role: ${targetRole}
Primary Archetype: ${archetypeResult.primary_archetype} (${archetypeResult.archetype_scores[0].match_score}%)
Secondary Archetype: ${archetypeResult.secondary_archetype} (${archetypeResult.archetype_scores[1].match_score}%)
Scores:
- Employability Score: ${scores.employability_score}/100 (Grade ${scores.employability_grade})
- AI Readiness Score: ${scores.ai_readiness_score}/100 (Grade ${scores.ai_readiness_grade})
- Placement Readiness Score: ${scores.placement_readiness_score}/100 (Grade ${scores.placement_readiness_grade})

Trait Profile (0-10): ${JSON.stringify(archetypeResult.trait_profile)}

Return JSON:
{
  "report_narrative": "3-4 sentence executive career intelligence narrative referencing archetype fit, technical strengths, and readiness.",
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}`;

  return { systemPrompt, userPrompt };
}

function escapePdfText(str) {
  return String(str || '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Render a valid binary %PDF-1.4 document buffer for a Career Intelligence Report.
 */
function generateCareerReportPdfBuffer(report) {
  const lines = [
    `CYNARIS CAREER INTELLIGENCE REPORT (ID #${report.id || 1})`,
    `Candidate: ${report.candidate_name} | Target Role: ${report.target_role}`,
    `Generated By: ${report.ai_provider} (${report.ai_model})`,
    '------------------------------------------------------------------------',
    `Primary Archetype: ${report.primary_archetype} | Secondary Archetype: ${report.secondary_archetype}`,
    `Employability Score: ${report.employability_score}/100`,
    `AI Readiness Score: ${report.ai_readiness_score}/100`,
    `Placement Readiness Score: ${report.placement_readiness_score}/100`,
    '------------------------------------------------------------------------',
    'Archetype Match Rankings:',
    ...(report.archetype_scores || []).map((a) => `  - ${a.archetype}: ${a.match_score}%`),
    '------------------------------------------------------------------------',
    'Executive Narrative:',
    ...String(report.report_narrative || '').match(/.{1,78}(\s|$)/g) || [String(report.report_narrative || '')],
    '------------------------------------------------------------------------',
    'Strategic Recommendations:',
    ...(report.recommendations || []).map((r, i) => `  ${i + 1}. ${r}`),
  ];

  const streamOps = ['BT', '/F1 11 Tf', '50 760 Td', '14 TL'];
  lines.forEach((line, idx) => {
    const safe = escapePdfText(line.trimEnd());
    if (idx === 0) {
      streamOps.push('/F2 14 Tf', `(${safe}) Tj`, '/F1 10 Tf', 'T*');
    } else {
      streamOps.push(`(${safe}) Tj`, 'T*');
    }
  });
  streamOps.push('ET');
  const contentStream = streamOps.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

module.exports = {
  TRAIT_KEYS,
  CAREER_ARCHETYPES,
  buildInternTraitProfile,
  scoreCareerArchetypes,
  calculateCompositeCareerScores,
  buildCareerReportPrompt,
  generateCareerReportPdfBuffer,
};
