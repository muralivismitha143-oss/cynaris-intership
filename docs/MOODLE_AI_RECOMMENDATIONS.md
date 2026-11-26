# Moodle LMS AI Learning Recommendations Architecture
## Groq Primary, OpenRouter Fallback & Multi-Tier Student Trajectory Synthesis
### Cynaris Full Stack Development Internship — Week 6 Day 3

**Author:** Murali  
**Branch:** `feat/cynaris-w6d3-murali`  
**Date:** November 19, 2026  
**Subsystems:** Moodle LMS (`block_cynaris_stats`, `moodle/local/cynaris_recommendations/RecommendationService.php`) & Cynaris Express API Bridge (`backend/modules/ai/AiRecommendationService.js`, `backend/routes/moodleRouter.js`)  
**Test Suite:** [`tests/test_moodle_ai_recommendations.js`](../tests/test_moodle_ai_recommendations.js)  

---

## 1. Architectural Overview & Problem Context

In enterprise learning management and candidate skill evaluation pipelines, students progress through modular technical tracks at varying speeds. Traditional LMS dashboards display raw numerical scores (e.g. *"92% on Quiz 501"*) and completion flags (`status: 1`), but fail to synthesize what those metrics mean pedagogically:
- Which specific technical competencies has the candidate truly mastered?
- What are the critical knowledge gaps or at-risk modules?
- What concrete, prioritized actions should the student take next to reach full production readiness?

The **Cynaris AI Learning Recommendations Engine** bridges this gap by automatically ingesting the candidate's historical record from the **5 Core Moodle Tables** (`mdl_user`, `mdl_course`, `mdl_grade_grades`, `mdl_course_completions`, and `mdl_log`) and feeding that rich context into a multi-tiered, resilient LLM pipeline.

```
                              ┌────────────────────────────────────────────────────────┐
                              │ Candidate / Mentor in Moodle Block Plugin              │
                              │ (blocks/cynaris_stats/block_cynaris_stats.php)         │
                              └───────────────────────────┬────────────────────────────┘
                                                          │ GET /api/moodle/users/:id/recommendations
                                                          ▼
                              ┌────────────────────────────────────────────────────────┐
                              │ MoodleService.getCandidateProgress(userId)             │
                              │ Aggregates mdl_user, mdl_grade_grades,                 │
                              │ mdl_course_completions, and mdl_course                 │
                              └───────────────────────────┬────────────────────────────┘
                                                          │
                                                          ▼
                              ┌────────────────────────────────────────────────────────┐
                              │ AiRecommendationService.generateRecommendations()     │
                              │ - Injects grades, completions, and feedback            │
                              │ - Sets 6000ms AbortController timeout                  │
                              └───────────┬───────────────────┬───────────────────┬────┘
                                          │                   │                   │
                    ┌─────────────────────┘                   │                   └─────────────────────┐
                    ▼ (Primary Attempt)                       ▼ (Failover on Error)                     ▼ (Dual Outage)
        ┌────────────────────────┐               ┌────────────────────────┐                ┌────────────────────────┐
        │     Tier 1: Groq       │               │  Tier 2: OpenRouter    │                │  Tier 3: Local Engine  │
        │ llama-3.3-70b-versat.  │               │ meta-llama/llama-3.3   │                │ deterministic fallback │
        │ Latency: < 350ms       │               │ Latency: ~900-1400ms   │                │ Latency: < 2ms (Zero)  │
        └───────────┬────────────┘               └───────────┬────────────┘                └───────────┬────────────┘
                    │ (Success)                              │ (Success)                               │ (Success)
                    └─────────────────────┬──────────────────┴─────────────────────────────────────────┘
                                          ▼
                              ┌────────────────────────────────────────────────────────┐
                              │ Strict JSON Schema & Contract Validation               │
                              │ (studentSummary, strengths, growthAreas, actions)      │
                              └───────────────────────────┬────────────────────────────┘
                                                          │
                                                          ▼
                              ┌────────────────────────────────────────────────────────┐
                              │ W3C ARIA Accessible UI Presentation & Telemetry Deck   │
                              │ Live Badge, Tier Highlights, Action Plan & Milestones  │
                              └────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion from 5 Core Moodle Tables

The recommendation engine queries the 5 fundamental Moodle tables established in Week 5 Day 2:

| Table Name | Entity Domain | Harvested Fields for AI Prompt | Purpose in Recommendations |
|---|---|---|---|
| `mdl_user` | Candidate Identity | `id`, `firstname`, `lastname`, `email`, `department` | Personalizes coaching persona and contextualizes training role. |
| `mdl_course` | Curriculum Metadata | `id`, `fullname`, `shortname`, `summary` | Maps grades to concrete learning domains (e.g. Node.js, EspoCRM, DevOps). |
| `mdl_grade_grades` | Assessment Scores | `finalgrade`, `rawgrademax`, `feedback`, `itemid` | Establishes quantified technical mastery ($\ge 80\%$) vs gaps ($< 80\%$). |
| `mdl_course_completions` | Track Progression | `status` (1 = completed, 0 = in progress), `timecompleted` | Quantifies course completion percentage and remaining requirements. |
| `mdl_log` | Candidate Engagement | `time`, `action` (`login`), `module` | Assesses recent study velocity and consistency. |

---

## 3. Socratic Prompt Engineering & Strict Output Schema

### 3.1 System Prompt Design
The system prompt defines an authoritative, empathetic pedagogical persona:
```text
You are a Lead AI Learning Path Architect and Senior Staff Mentor at Cynaris Training Academy.
Analyze candidate assessment grades (mdl_grade_grades) and course completion records (mdl_course_completions) to generate personalized, data-driven learning recommendations.
Rules:
1. Analyze grade percentages: >=80% = strength/mastery, 60-79% = proficient but needs refinement, <60% or incomplete = critical growth area.
2. Formulate prioritized, actionable learning steps with concrete study topics and realistic estimated hours.
3. Classify candidate into a performance tier: 'Advanced', 'Proficient', or 'Needs Support'.
4. Provide a supportive, motivating pedagogical encouragement message tailored to their velocity.
5. Return ONLY a valid JSON object matching the requested schema. Never include markdown fences or introductory text.
```

### 3.2 User Prompt Contract & Output Schema
The user prompt feeds the candidate's actual grades, completed courses, and pending tracks into the model:
```json
{
  "studentSummary": {
    "tier": "Advanced" | "Proficient" | "Needs Support",
    "averageGrade": 95.5,
    "completionRate": 66.7,
    "analysis": "Executive overview of candidate technical velocity and readiness."
  },
  "strengths": [
    { "topic": "Node.js & MySQL CRUD", "evidence": "Score 96.5% on Week 4 Assessment" }
  ],
  "growthAreas": [
    { "topic": "DevOps & CI/CD Pipelines", "evidence": "Course #103 pending completion" }
  ],
  "recommendedActions": [
    { "priority": 1, "action": "Complete Docker multi-stage build optimization lab", "targetCourse": "CYN-OPS-103", "estimatedHours": 3 }
  ],
  "nextMilestone": {
    "goal": "Full Stack Production Certification",
    "targetDateDays": 5,
    "readinessScore": 95
  },
  "pedagogicalEncouragement": "Consistent high achievement. Focus on CI/CD deployment for full sign-off."
}
```

### 3.3 Student Performance Tier Classification Matrix

| Performance Tier | Grade Threshold | Completion Threshold | Architectural Learning Focus |
|---|---|---|---|
| **Advanced** | Average Grade $\ge 90\%$ | Completion Rate $\ge 50\%$ | Production deployment, system performance profiling, architecture trade-offs. |
| **Proficient** | Average Grade $80\% - 89\%$ | Completion Rate $\ge 40\%$ | Targeted practice on growth areas, refining async I/O and query sargability. |
| **Needs Support** | Average Grade $< 80\%$ | Completion Rate $< 40\%$ | Core syntax review, foundation concepts, retaking Question Bank practice quizzes. |

---

## 4. Multi-Tier Failover Lifecycle & Resilience

```
                                  [Start: generateRecommendations]
                                                 │
                                                 ▼
                                     Check GROQ_API_KEY set?
                                    ├── No ──────────────┐
                                    │                    │
                                   Yes                   │
                                    │                    ▼
                                    │           Check OPENROUTER_API_KEY?
                                    │          ├── No ──────────────┐
                                    │         Yes                   │
                                    ▼          │                    ▼
                          Invoke Groq API      │            Local Deterministic
                          (6000ms timeout)     │            Fallback Engine
                                    │          │            (Instant, Zero Net)
                        ┌───────────┴──────────┤                    │
                        ▼                      ▼                    │
                     Success?                Fail?                  │
                    ├── Yes                (Timeout / 429 / Err)    │
                    │                          │                    │
                    │                          ▼                    │
                    │                 Invoke OpenRouter API         │
                    │                 (6000ms timeout)              │
                    │                          │                    │
                    │              ┌───────────┴──────────┐         │
                    │              ▼                      ▼         │
                    │           Success?                Fail?       │
                    │          ├── Yes                    │         │
                    │          │                          ▼         │
                    │          │                Fallback to Local ──┘
                    │          │                          │
                    ▼          ▼                          ▼
                  Clean & Parse JSON Response ────────────┘
                                    │
                                    ▼
                     validateRecommendationStructure()
                                    │
                                    ▼
                  [Return: { success, data, ... }]
```

---

## 5. Moodle PHP Service Parity (`moodle/local/cynaris_recommendations/RecommendationService.php`)

To support native Moodle Frankenstyle execution without mandatory external Node.js dependencies, the system includes complete PHP parity:
- Class: `\local_cynaris_recommendations\RecommendationService`
- Methods:
  - `buildPrompt(array $studentProfile): array`
  - `generateRecommendations(array $studentProfile, array $options = []): array`
  - `localDeterministicFallback(array $studentProfile): array`
  - `validateRecommendationStructure(array $data): bool`
  - `cleanAndParseJson(string $rawText): ?array`

---

## 6. Express REST API Specifications

| Method | Endpoint | Description | Request / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/api/moodle/recommendations/health` | Health check & provider status | None | `{ status: "operational", primaryProvider: {...}, fallbackProvider: {...} }` |
| `POST` | `/api/moodle/recommendations/generate` | Generate recommendations for custom profile | `{ studentProfile: {...} }` | `{ success: true, provider: "...", data: {...} }` |
| `GET` | `/api/moodle/users/:id/recommendations` | Generate recommendations for Moodle student | None | `{ success: true, student: { id: 2, name: "Murali V" }, data: {...} }` |

---

## 7. Moodle Block Plugin UI (`block_cynaris_stats.php`)

The Cynaris Stats block plugin integrates an interactive AI recommendation card:
- **Card Container:** `#cynaris-recommendations-section`
- **Candidate Selector:** `#cynaris-rec-user-select` allowing mentors to toggle between candidates (Murali V, Rahul, Ananya, Vikram).
- **Trigger Button:** `#cynaris-get-recommendations-btn` executing `fetchLearningRecommendations()`.
- **Live Status Region:** `#cynaris-rec-result` with `aria-live="polite"` and `role="status"` for W3C accessibility compliance.
- **Provider Status Indicator:** `#cynaris-rec-badge` displaying `Groq Active` or `Fallback`.

---

## 8. Verification & Test Commands

To execute the Week 6 Day 3 dedicated test suite:
```bash
npm run test:w6d3
```

To execute all 25 platform regression test suites:
```bash
npm test
```
