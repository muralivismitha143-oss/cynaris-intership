# Moodle LMS AI Quiz Generation Architecture
## Groq Primary, OpenRouter Fallback, Question Bank API & Programmatic Quiz Engine
### Cynaris Full Stack Development Internship — Week 6 Day 2

**Author:** Murali  
**Branch:** `feat/cynaris-w6d2-murali`  
**Date:** November 19, 2026  
**Subsystems:** Moodle LMS (`mod_quiz`, `question_bank_api`, `moodle/mod/quiz/locallib.php`, `moodle/mod/quiz/view.php`) & Cynaris Express API Bridge (`backend/modules/ai/AiQuizGeneratorService.js`, `backend/routes/moodleRouter.js`)  
**Test Suite:** [`tests/test_moodle_ai_quiz_generation.js`](../tests/test_moodle_ai_quiz_generation.js)  

---

## 1. Architectural Overview & Engineering Motivation

In enterprise e-learning platforms and corporate technical training ecosystems (such as Moodle LMS deployed across universities and tech enterprises like Infosys, TCS, and Wipro), generating high-quality multiple choice question (MCQ) assessments is traditionally labor-intensive. Course instructors must manually author technical questions, devise plausible distractors, calculate fractional grading scores, and organize questions within hierarchical Question Bank categories.

The **Cynaris AI Quiz Generation Engine** automates this end-to-end curriculum pipeline:
1. **Curriculum Ingestion:** Dynamically inspects course metadata (`mdl_course.fullname`, `mdl_course.summary`) and contextual topics.
2. **Multi-Tiered LLM Inference:** Generates pedagogically rigorous MCQs using Groq LPU as primary inference, OpenRouter as automated cloud failover, and a local deterministic engine as zero-downtime offline fallback.
3. **Strict Structural Validation:** Enforces an invariant 7-field JSON contract per question, verifying all options ('A', 'B', 'C', 'D') and authoritative explanation strings.
4. **Moodle Question Bank API Integration:** Imports validated questions into Moodle's decoupled question bank (`mdl_question`, `mdl_question_answers`) with compliant fractional credit weights ($1.0$ for correct, $0.0$ for distractors).
5. **Programmatic Quiz Assembly:** Instantiates standard Moodle quizzes (`mdl_quiz`) and binds question bank items via slot mappings (`mdl_quiz_slots`).

```
                               ┌────────────────────────────────────────────────────────┐
                               │ Instructor / Admin in Moodle Quiz UI                   │
                               │ (mod/quiz/view.php #cynaris-quiz-generator-container)  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ POST /api/moodle/quiz/generate
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │ Cynaris Express API Bridge (moodleRouter.js)          │
                               │ - Extracts courseId & question count                   │
                               │ - Retrieves course curriculum profile                  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │ AiQuizGeneratorService Core Engine                     │
                               │ - Builds strict MCQ JSON Prompt                        │
                               │ - Dispatches Inference with 6000ms AbortController     │
                               └───────────┬───────────────────┬───────────────────┬────┘
                                           │                   │                   │
                     ┌─────────────────────┘                   │                   └─────────────────────┐
                     ▼ (Primary)                               ▼ (Failover)                              ▼ (Dual Outage)
         ┌────────────────────────┐               ┌────────────────────────┐                ┌────────────────────────┐
         │     Tier 1: Groq       │               │  Tier 2: OpenRouter    │                │  Tier 3: Local Engine  │
         │ llama-3.3-70b-versat.  │               │ meta-llama/llama-3.3   │                │ deterministic fallback │
         │ Latency: < 350ms       │               │ Latency: ~900-1400ms   │                │ Latency: < 2ms (Zero)  │
         └───────────┬────────────┘               └───────────┬────────────┘                └───────────┬────────────┘
                     │ (Success)                              │ (Success)                               │ (Success)
                     └─────────────────────┬──────────────────┴─────────────────────────────────────────┘
                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │ Question Structure Validator (validateQuestionStructure│
                               │ Checks: question, opt A/B/C/D, correct_answer in A-D   │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │ Moodle Question Bank API (importToQuestionBank)        │
                               │ Persists to mdl_question & mdl_question_answers        │
                               │ Assigns fraction=1.0 (correct) & fraction=0.0 (wrong)  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │ Programmatic Quiz Factory (createQuizFromQuestions)    │
                               │ Persists to mdl_quiz & mdl_quiz_slots                  │
                               └────────────────────────────────────────────────────────┘
```

---

## 2. Prompt Engineering & Strict Output Schema

### 2.1 System Persona & Prompt Construction
The system prompt establishes an authoritative role as a **Senior Lead Technical Educator and Psychometrics Assessment Specialist**:

```text
You are a Senior Lead Technical Educator and Psychometrics Assessment Specialist for the Cynaris Training Academy.
Generate rigorous, practical, industry-standard Multiple Choice Questions (MCQs) evaluating real engineering skills.
Rules:
1. Each question must evaluate deep conceptual understanding, code reasoning, or debugging skills.
2. Provide exactly four mutually exclusive options: option_a, option_b, option_c, option_d.
3. Plausible distractors must represent realistic junior developer misunderstandings.
4. Exactly one answer is correct. Field 'correct_answer' must be strictly one of: 'A', 'B', 'C', or 'D'.
5. Include a clear, authoritative explanation in 'explanation'.
6. Return ONLY a valid JSON array of objects. Never wrap with markdown backticks or commentary.
```

### 2.2 User Prompt Construction
The user prompt provides course name, course code, curriculum summary, and the requested question count:

```text
Generate exactly {count} Multiple Choice Questions for the following course:
Course Code: {courseCode}
Course Name: {courseName}
Curriculum Summary: {courseSummary}

Return strictly a JSON array adhering to this schema:
[
  {
    "question": "Clear question text?",
    "option_a": "First option description",
    "option_b": "Second option description",
    "option_c": "Third option description",
    "option_d": "Fourth option description",
    "correct_answer": "A",
    "explanation": "Authoritative explanation explaining why option A is correct."
  }
]
```

### 2.3 Strict Validation Pipeline
In `AiQuizGeneratorService.validateQuestionStructure(questions)`:
- Verifies input is a non-empty array.
- Asserts each question item contains all 7 keys: `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `explanation`.
- Enforces `['A', 'B', 'C', 'D'].includes(q.correct_answer.toUpperCase())`.
- Throws descriptive descriptive validation errors if any schema requirement is breached.

---

## 3. Moodle Question Bank Architecture & Relational Mapping

In Moodle, **questions are decoupled from quizzes**. Questions reside in the course Question Bank category and can be reused across multiple quizzes, adaptive lessons, and practice exams.

### 3.1 Relational Schema Diagram
```
┌─────────────────────────────────┐
│     mdl_question_categories     │
├─────────────────────────────────┤
│ id (PK)                         │
│ course (FK -> mdl_course.id)    │
│ name ("Default for Course")     │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐            ┌───────────────────────────────────┐
│          mdl_question           │ 1        * │       mdl_question_answers        │
├─────────────────────────────────┼────────────┼───────────────────────────────────┤
│ id (PK)                         │            │ id (PK)                           │
│ category (FK)                   │            │ question (FK -> mdl_question.id)  │
│ qtype ('multichoice')           │            │ answer (Option Text)              │
│ name (Question Title)           │            │ fraction (1.0000000 or 0.0000000) │
│ questiontext (Question Prompt)  │            │ feedback (Option Feedback)        │
│ defaultmark (1.0000000)         │            └───────────────────────────────────┘
│ timecreated / timemodified      │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐            ┌───────────────────────────────────┐
│         mdl_quiz_slots          │ *        1 │             mdl_quiz              │
├─────────────────────────────────┼────────────┼───────────────────────────────────┤
│ id (PK)                         │            │ id (PK)                           │
│ quizid (FK -> mdl_quiz.id)      │            │ course (FK -> mdl_course.id)      │
│ slot (1, 2, 3...)               │            │ name (Quiz Name)                  │
│ questionid (FK)                 │            │ sumgrades (Total Points)          │
│ maxmark (1.0000000)             │            │ grade (Max Score Scale, e.g. 100) │
└─────────────────────────────────┘            └───────────────────────────────────┘
```

### 3.2 Fractional Answer Weighting
In Moodle's single-answer `multichoice` question type (`qtype = 'multichoice'`):
- The designated correct option receives `fraction = 1.0` (100% of the mark).
- All incorrect distractor options receive `fraction = 0.0` (0% credit).
- For multiple-selection MCQs, fractions can be split (e.g. 0.50 each) with negative penalties for incorrect selections.

---

## 4. Multi-Tier Failover Lifecycle & Resilience

```
                                  [Start: generateQuizQuestions]
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
                   │                Invoke OpenRouter API          │
                   │                (6000ms timeout)               │
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
                    validateQuestionStructure()
                                   │
                                   ▼
                 [Return: { success, questions, ... }]
```

---

## 5. Moodle PHP Library Parity (`moodle/mod/quiz/locallib.php`)

In Moodle LMS, core quiz routines and Question Bank abstractions are implemented in `mod/quiz/locallib.php`. The Cynaris implementation provides complete PHP function signatures mirroring the Node.js service:

1. **`generate_quiz_questions(int $course_id, int $count = 5): array`**
   - Retrieves course record using `$DB->get_record('course', ['id' => $course_id])`.
   - Dispatches cURL requests to Groq Cloud API with OpenRouter fallback.
   - Parses JSON response, strips markdown codeblocks, and validates schema.
   - On offline/fallback mode, delivers course-grounded deterministic MCQs.

2. **`question_bank_api::import_questions(int $course_id, array $questions): array`**
   - Resolves or creates the question bank category for the course in `mdl_question_categories`.
   - Inserts parent records into `mdl_question`.
   - Iterates through options A, B, C, D and inserts child records into `mdl_question_answers` with appropriate `fraction` fields ($1.0$ vs $0.0$).
   - Returns list of created question IDs.

3. **`quiz_add_quiz(int $course_id, string $quiz_name, array $question_ids): int`**
   - Inserts record into `mdl_quiz` with `grade = 100` and `sumgrades = count($question_ids)`.
   - Iterates over question IDs and assigns slots in `mdl_quiz_slots`.
   - Returns the created quiz ID.

4. **`validate_quiz_structure(array $questions): bool`**
   - Validates that every question has all required keys and valid `correct_answer`.

---

## 6. Express REST API Bridge Specifications

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `POST` | `/api/moodle/quiz/generate` | Generate AI MCQs from course content | `{ courseId: 101, count: 5 }` | `{ success: true, count: 5, provider: "...", questions: [...] }` |
| `POST` | `/api/moodle/quiz/import-to-bank` | Save questions to Question Bank | `{ courseId: 101, questions: [...] }` | `{ success: true, importedCount: 5, questionIds: [1,2,3,4,5] }` |
| `POST` | `/api/moodle/quiz/create` | Create Quiz & map Question Bank slots | `{ courseId: 101, quizName: "...", questionIds: [...] }` | `{ success: true, quiz: { id: 201, courseId: 101, questionCount: 5 } }` |
| `GET` | `/api/moodle/courses/:id/question-bank` | List Course Question Bank items | None | `{ success: true, courseId: 101, totalQuestions: 15, questions: [...] }` |
| `GET` | `/api/moodle/courses/:id/quizzes` | List Course Quizzes | None | `{ success: true, courseId: 101, totalQuizzes: 1, quizzes: [...] }` |

---

## 7. Moodle User Interface (`moodle/mod/quiz/view.php`)

The Moodle Quiz View includes an interactive instructor control deck:
- **Container:** `#cynaris-quiz-generator-container` with modern CSS card layout.
- **Controls:**
  - `#cynaris-quizgen-count`: Select dropdown choosing 3, 5, or 10 questions.
  - `#cynaris-quizgen-btn`: Trigger button initiating asynchronous generation.
  - `#cynaris-quizgen-status`: Accessible live region (`role="status"`, `aria-live="polite"`).
  - `#cynaris-quizgen-preview`: Interactive preview card showing generated questions with badge highlights for correct answers, full options list, and pedagogical explanations.
  - `#cynaris-quizgen-import-btn`: One-click button to import validated preview questions directly into Moodle's Question Bank.

---

## 8. Automated Test Suite & Verification

The feature is verified by [`tests/test_moodle_ai_quiz_generation.js`](../tests/test_moodle_ai_quiz_generation.js), covering 10 distinct test groups:
1. Prompt construction & schema enforcement.
2. Primary provider inference via Groq (`llama-3.3-70b-versatile`).
3. Automated failover to OpenRouter (`meta-llama/llama-3.3-70b-instruct`).
4. Local deterministic curriculum engine failover on dual provider error.
5. Strict question structure validation (rejecting incomplete schemas).
6. Moodle Question Bank API (`importToQuestionBank`) fraction calculations.
7. Programmatic Quiz creation (`createQuizFromQuestions`) and slot mapping.
8. Moodle PHP library parity in `locallib.php`.
9. Express REST API endpoints (`/quiz/generate`, `/quiz/import-to-bank`, `/courses/:id/question-bank`).
10. Moodle UI markup assertions in `moodle/mod/quiz/view.php`.

To run the dedicated test suite:
```bash
npm run test:w6d2
```

To run all 24 platform regression suites:
```bash
npm test
```
