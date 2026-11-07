/**
 * Modern JavaScript Recruitment Pipeline Utilities (ES Modules)
 * Demonstrating 5 Core ES6+ Capabilities:
 * 1. Destructuring (Object & Array)
 * 2. Spread & Rest operators (...)
 * 3. Optional Chaining (?.)
 * 4. Nullish Coalescing (??)
 * 5. ES Module exports/imports
 */

// 1. Destructuring & 4. Nullish Coalescing
export function formatCandidateSnapshot(candidate = {}) {
  // Object Destructuring with default values
  const {
    id = 0,
    name = "Anonymous",
    job_title,
    pipeline_stage,
    experience_years,
    skills,
    ai_resume_summary
  } = candidate;

  // Nullish Coalescing (??) - returns right-hand operand only if null or undefined
  const role = job_title ?? "Full Stack Engineer";
  const stage = pipeline_stage ?? "Screening";
  const exp = experience_years ?? 0;
  const skillsList = skills ?? "General Software Engineering";

  // Optional Chaining (?.) - safely reading deeply nested properties
  const hasAISummary = (ai_resume_summary?.length ?? 0) > 0;
  const summaryWordCount = ai_resume_summary?.trim()?.split(/\s+/)?.length ?? 0;

  return {
    id,
    name,
    role,
    stage,
    exp,
    skillsList,
    hasAISummary,
    summaryWordCount
  };
}

// 2. Spread & Rest Operators (...)
export function mergeCandidateUpdate(existingCandidate, stageUpdates, ...auditTags) {
  // Spread operator (...) for immutable object copying
  const updatedCandidate = {
    ...existingCandidate,
    ...stageUpdates,
    updated_at: new Date().toISOString(),
    // Rest parameter (...) collects extra arguments into an array
    tags: [...(existingCandidate?.tags ?? []), ...auditTags]
  };

  return updatedCandidate;
}

// Array Destructuring & Rest Elements
export function partitionCandidates(applicants = []) {
  if (!applicants.length) return { topCandidate: null, otherCandidates: [] };

  // Array destructuring with rest operator
  const [topCandidate, ...otherCandidates] = applicants;

  return {
    topCandidate: topCandidate ?? null,
    otherCandidates
  };
}

// Optional Chaining on Function Invocations & Arrays
export function getPrimarySkill(applicant) {
  // Safe optional call to split and array indexing
  return applicant?.skills?.split?.(",")?.[0]?.trim() ?? "Full Stack";
}

// Aggregate Calculation using Array Reduce & Spread
export function calculatePipelineMetrics(...candidateLists) {
  // Flattens candidate arrays using spread
  const allCandidates = candidateLists.flat();
  const total = allCandidates.length;

  if (total === 0) return { total: 0, avgExperience: 0 };

  const totalExp = allCandidates.reduce(
    (sum, c) => sum + (c?.experience_years ?? 0),
    0
  );

  return {
    total,
    avgExperience: Math.round((totalExp / total) * 10) / 10
  };
}

// Default export
const PipelineUtils = {
  formatCandidateSnapshot,
  mergeCandidateUpdate,
  partitionCandidates,
  getPrimarySkill,
  calculatePipelineMetrics
};

export default PipelineUtils;
