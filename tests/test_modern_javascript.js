/**
 * Unit Tests for Modern JavaScript Features
 * Run using: node tests/test_modern_javascript.js
 */

const assert = require("assert");

// Simulate the ES Module utilities in CommonJS test runner
function formatCandidateSnapshot(candidate = {}) {
  const {
    id = 0,
    name = "Anonymous",
    job_title,
    pipeline_stage,
    experience_years,
    skills,
    ai_resume_summary
  } = candidate;

  const role = job_title ?? "Full Stack Engineer";
  const stage = pipeline_stage ?? "Screening";
  const exp = experience_years ?? 0;
  const skillsList = skills ?? "General Software Engineering";

  const hasAISummary = (ai_resume_summary?.length ?? 0) > 0;
  const summaryWordCount = ai_resume_summary?.trim()?.split(/\s+/)?.length ?? 0;

  return { id, name, role, stage, exp, skillsList, hasAISummary, summaryWordCount };
}

function mergeCandidateUpdate(existingCandidate, stageUpdates, ...auditTags) {
  return {
    ...existingCandidate,
    ...stageUpdates,
    updated_at: new Date().toISOString(),
    tags: [...(existingCandidate?.tags ?? []), ...auditTags]
  };
}

function partitionCandidates(applicants = []) {
  if (!applicants.length) return { topCandidate: null, otherCandidates: [] };
  const [topCandidate, ...otherCandidates] = applicants;
  return { topCandidate: topCandidate ?? null, otherCandidates };
}

function getPrimarySkill(applicant) {
  return applicant?.skills?.split?.(",")?.[0]?.trim() ?? "Full Stack";
}

// ==========================================
// Test Suite Execution
// ==========================================

console.log("Running Modern JavaScript (ES6+) Verification Tests...\n");

// Test 1: Destructuring and Nullish Coalescing
{
  const candidate = {
    id: 101,
    name: "Aarav Patel",
    experience_years: 0, // 0 is a valid falsy value that should NOT be overwritten by ??
    skills: null
  };
  const snapshot = formatCandidateSnapshot(candidate);
  assert.strictEqual(snapshot.id, 101);
  assert.strictEqual(snapshot.name, "Aarav Patel");
  assert.strictEqual(snapshot.exp, 0, "Nullish coalescing must preserve 0 years of experience");
  assert.strictEqual(snapshot.skillsList, "General Software Engineering", "Nullish coalescing should fallback on null");
  assert.strictEqual(snapshot.role, "Full Stack Engineer");
  assert.strictEqual(snapshot.hasAISummary, false);
  console.log("✓ Test 1 Passed: Object Destructuring & Nullish Coalescing (??)");
}

// Test 2: Spread and Rest Operators (...)
{
  const original = { id: 1, name: "Priya", pipeline_stage: "Screening", tags: ["priority"] };
  const updated = mergeCandidateUpdate(original, { pipeline_stage: "Technical Round 1" }, "auto-screened", "w2d5");

  assert.strictEqual(updated.pipeline_stage, "Technical Round 1");
  assert.strictEqual(original.pipeline_stage, "Screening", "Spread operator must not mutate original object");
  assert.deepStrictEqual(updated.tags, ["priority", "auto-screened", "w2d5"], "Rest parameters must be concatenated");
  console.log("✓ Test 2 Passed: Spread Operator (...) & Rest Parameters");
}

// Test 3: Array Destructuring
{
  const candidates = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const { topCandidate, otherCandidates } = partitionCandidates(candidates);
  assert.strictEqual(topCandidate.id, 1);
  assert.strictEqual(otherCandidates.length, 2);
  assert.strictEqual(otherCandidates[0].id, 2);
  console.log("✓ Test 3 Passed: Array Destructuring & Rest Elements");
}

// Test 4: Optional Chaining (?.)
{
  const emptyCandidate = null;
  const validCandidate = { skills: "React, Node.js, Python" };

  assert.strictEqual(getPrimarySkill(emptyCandidate), "Full Stack", "Optional chaining on null must not throw");
  assert.strictEqual(getPrimarySkill(validCandidate), "React", "Optional chaining on method call must work");
  console.log("✓ Test 4 Passed: Optional Chaining (?.) with safe fallback");
}

// Test 5: Production Deployment Configs Check
{
  const fs = require("fs");
  assert.ok(fs.existsSync("package.json"), "package.json exists in root");
  assert.ok(fs.existsSync("railway.json"), "railway.json exists in root");
  assert.ok(fs.existsSync("render.yaml"), "render.yaml exists in root");
  assert.ok(fs.existsSync("Procfile"), "Procfile exists in root");
  assert.ok(fs.existsSync(".env.example"), ".env.example exists in root");
  console.log("✓ Test 5 Passed: All PaaS deployment blueprints verified");
}

console.log("\n==========================================");
console.log("All 5 Modern JavaScript & Deployment Tests Passed!");
console.log("==========================================");
