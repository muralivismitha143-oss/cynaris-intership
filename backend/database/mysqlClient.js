/**
 * mysqlClient.js
 * 
 * Week 4 Day 4: Connect Node.js to MySQL using mysql2
 * Demonstrates:
 * 1. Connection pooling with `mysql2/promise` (createPool, getConnection, query, execute).
 * 2. Prepared Statements (`?` parameter binding) to eliminate SQL injection vulnerabilities.
 * 3. Atomic Database Transactions (beginTransaction, commit, rollback).
 * 4. Schema Migrations (CREATE TABLE IF NOT EXISTS, index creation).
 * 5. Full CRUD operations with connection healthchecks and in-memory fallback.
 */

const fs = require('fs');
const path = require('path');

let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = null;
}

// Database Connection Configuration
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || process.env.ESPOCRM_DATABASE_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || process.env.ESPOCRM_DATABASE_USER || 'espocrm',
  password: process.env.MYSQL_PASSWORD || process.env.ESPOCRM_DATABASE_PASSWORD || 'espocrm_secret_pw',
  database: process.env.MYSQL_DATABASE || process.env.ESPOCRM_DATABASE_NAME || 'espocrm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 2000,
};

// ==============================================================================
// In-Memory Database Fallback Engine (for Local & CI Testing without live MySQL)
// ==============================================================================
class InMemoryMySQLEngine {
  constructor() {
    this.tables = {
      job_applicant: [
        {
          id: 1,
          name: 'Rahul Kumar',
          job_title: 'Full Stack Developer',
          pipeline_stage: 'Screening',
          experience_years: 2.0,
          skills: 'JavaScript, Node.js, Express, React, MongoDB, Git',
          education: 'B.Tech Computer Science (2024)',
          resume_text: 'Full Stack Engineer with 2 years of experience building web applications using React, Node.js, and Express.',
          ai_resume_summary: null,
          ai_summary_provider: null,
          ai_analyzed_at: null,
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 2,
          name: 'Priya Sharma',
          job_title: 'Backend Engineer',
          pipeline_stage: 'Technical Round 1',
          experience_years: 3.5,
          skills: 'Python, FastAPI, Django, PostgreSQL, Docker, Redis',
          education: 'M.Tech Software Engineering (2023)',
          resume_text: 'Backend Developer specializing in high-throughput microservices using Python, FastAPI, and PostgreSQL.',
          ai_resume_summary: null,
          ai_summary_provider: null,
          ai_analyzed_at: null,
          created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 54).toISOString(),
        },
        {
          id: 3,
          name: 'Arun Kumar',
          job_title: 'Frontend Developer',
          pipeline_stage: 'HR Round',
          experience_years: 1.5,
          skills: 'Vue.js 3, TypeScript, Tailwind CSS, Vite',
          education: 'B.Sc Computer Science (2025)',
          resume_text: 'Frontend Engineer passionate about responsive UX and state management.',
          ai_resume_summary: null,
          ai_summary_provider: null,
          ai_analyzed_at: null,
          created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: 4,
          name: 'Neha Gupta',
          job_title: 'Senior DevOps Specialist',
          pipeline_stage: 'Offered',
          experience_years: 5.0,
          skills: 'Kubernetes, Terraform, AWS, Prometheus',
          education: 'B.Tech IT (2021)',
          resume_text: 'Cloud DevOps Engineer designing resilient multi-region infrastructure.',
          ai_resume_summary: null,
          ai_summary_provider: null,
          ai_analyzed_at: null,
          created_at: new Date(Date.now() - 3600000 * 120).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 84).toISOString(),
        },
      ],
      automation_rules: [
        {
          id: 'rule-1',
          name: 'Stalled Technical Round Follow-up',
          entity_type: 'JobApplicant',
          trigger_stage: 'Technical Round 1',
          idle_threshold_hours: 48,
          urgency: 'High',
          channel_preference: 'Email',
          description: 'Trigger when applicant in Technical Round 1 has had no scorecard update for > 48 hours.',
          enabled: 1,
        },
        {
          id: 'rule-2',
          name: 'Offer Decision & Acceptance Check-in',
          entity_type: 'JobApplicant',
          trigger_stage: 'Offered',
          idle_threshold_hours: 72,
          urgency: 'Critical',
          channel_preference: 'WhatsApp',
          description: 'Trigger when offer letter pending acceptance > 72 hours.',
          enabled: 1,
        },
      ],
      smart_reminders: [],
      audit_logs: [],
      intern_readiness_scores: [
        {
          id: 1,
          intern_id: 1,
          intern_name: 'Murali V',
          intern_email: 'murali@cynaris.dev',
          target_role: 'Senior Full Stack Engineer',
          project_completion_pct: 94.0,
          assessment_score: 91.0,
          cia_usage_hours: 19.5,
          documentation_quality: 92.0,
          placement_readiness_score: 93.1,
          placement_grade: 'A',
          viva_score: 90.0,
          code_review_score: 92.0,
          demo_clarity_score: 89.0,
          git_workflow_score: 95.0,
          interview_readiness_score: 90.9,
          interview_grade: 'A',
          improvement_recommendations: JSON.stringify({
            top_3_improvement_actions: [
              {
                rank: 1,
                title: 'Polish Live System Architecture Demo Pacing',
                target_metric: 'demo_clarity_score',
                current_score: 89.0,
                target_score: 95.0,
                priority: 'Medium',
                estimated_hours: 2,
                action_plan: 'Structure 3-minute walkthroughs using Problem -> Architecture -> Tradeoffs -> Metrics.'
              },
              {
                rank: 2,
                title: 'Complete Remaining 0.5h CIA Edge-Case Reviews',
                target_metric: 'cia_usage_hours',
                current_score: 97.5,
                target_score: 100.0,
                priority: 'Low',
                estimated_hours: 1,
                action_plan: 'Log final CIA Code Mode session reviewing distributed concurrency edge cases.'
              },
              {
                rank: 3,
                title: 'Practice High-Scale Viva Tradeoff Drills',
                target_metric: 'viva_score',
                current_score: 90.0,
                target_score: 96.0,
                priority: 'Low',
                estimated_hours: 2,
                action_plan: 'Rehearse multi-region failover and MySQL composite index cardinality explanations.'
              }
            ]
          }),
          ai_provider: 'Groq',
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 2,
          intern_id: 2,
          intern_name: 'Priya Sharma',
          intern_email: 'priya.sharma@cynaris.dev',
          target_role: 'Backend Systems Architect',
          project_completion_pct: 88.0,
          assessment_score: 86.0,
          cia_usage_hours: 16.0,
          documentation_quality: 84.0,
          placement_readiness_score: 85.8,
          placement_grade: 'A',
          viva_score: 84.0,
          code_review_score: 88.0,
          demo_clarity_score: 82.0,
          git_workflow_score: 90.0,
          interview_readiness_score: 85.4,
          interview_grade: 'A',
          improvement_recommendations: JSON.stringify({
            top_3_improvement_actions: [
              {
                rank: 1,
                title: 'Boost CIA Usage Hours to 20h Benchmark',
                target_metric: 'cia_usage_hours',
                current_score: 80.0,
                target_score: 100.0,
                priority: 'Medium',
                estimated_hours: 4,
                action_plan: 'Schedule 2 focused CIA Mentor & Code Mode reviews on FastAPI async pooling.'
              },
              {
                rank: 2,
                title: 'Refine Demo Communication Storytelling',
                target_metric: 'demo_clarity_score',
                current_score: 82.0,
                target_score: 90.0,
                priority: 'Medium',
                estimated_hours: 2,
                action_plan: 'Add concise latency benchmarks and failure recovery live demos.'
              },
              {
                rank: 3,
                title: 'Expand Architecture Sequence Diagrams in Docs',
                target_metric: 'documentation_quality',
                current_score: 84.0,
                target_score: 92.0,
                priority: 'Low',
                estimated_hours: 2,
                action_plan: 'Document Redis cache invalidation flows with Mermaid sequence diagrams.'
              }
            ]
          }),
          ai_provider: 'Groq',
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
          id: 3,
          intern_id: 3,
          intern_name: 'Rahul Kumar',
          intern_email: 'rahul.kumar@cynaris.dev',
          target_role: 'Full Stack Developer',
          project_completion_pct: 76.0,
          assessment_score: 74.0,
          cia_usage_hours: 12.0,
          documentation_quality: 70.0,
          placement_readiness_score: 72.6,
          placement_grade: 'B',
          viva_score: 72.0,
          code_review_score: 75.0,
          demo_clarity_score: 74.0,
          git_workflow_score: 80.0,
          interview_readiness_score: 74.1,
          interview_grade: 'B',
          improvement_recommendations: JSON.stringify({
            top_3_improvement_actions: [
              {
                rank: 1,
                title: 'Increase CIA Usage Hours from 12h to 18h+',
                target_metric: 'cia_usage_hours',
                current_score: 60.0,
                target_score: 90.0,
                priority: 'High',
                estimated_hours: 6,
                action_plan: 'Use CIA Mentor Mode before every PR to validate REST error handling.'
              },
              {
                rank: 2,
                title: 'Upgrade Technical Documentation & API Specs',
                target_metric: 'documentation_quality',
                current_score: 70.0,
                target_score: 85.0,
                priority: 'High',
                estimated_hours: 3,
                action_plan: 'Add request/response JSON contracts, setup steps, and viva notes to docs.'
              },
              {
                rank: 3,
                title: 'Practice Mock Technical Viva Questions',
                target_metric: 'viva_score',
                current_score: 72.0,
                target_score: 85.0,
                priority: 'Medium',
                estimated_hours: 4,
                action_plan: 'Drill JWT stateless auth, SQL prepared statements, and React state flow.'
              }
            ]
          }),
          ai_provider: 'Groq',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        },
        {
          id: 4,
          intern_id: 4,
          intern_name: 'Arun Kumar',
          intern_email: 'arun.kumar@cynaris.dev',
          target_role: 'Frontend Engineer',
          project_completion_pct: 62.0,
          assessment_score: 65.0,
          cia_usage_hours: 8.0,
          documentation_quality: 58.0,
          placement_readiness_score: 59.9,
          placement_grade: 'C',
          viva_score: 60.0,
          code_review_score: 62.0,
          demo_clarity_score: 65.0,
          git_workflow_score: 68.0,
          interview_readiness_score: 62.4,
          interview_grade: 'C',
          improvement_recommendations: JSON.stringify({
            top_3_improvement_actions: [
              {
                rank: 1,
                title: 'Ramp CIA Usage Hours from 8h to 16h',
                target_metric: 'cia_usage_hours',
                current_score: 40.0,
                target_score: 80.0,
                priority: 'Critical',
                estimated_hours: 8,
                action_plan: 'Pair daily with CIA Code Mode to catch edge cases and accessibility gaps.'
              },
              {
                rank: 2,
                title: 'Remediate Documentation Quality Gaps',
                target_metric: 'documentation_quality',
                current_score: 58.0,
                target_score: 80.0,
                priority: 'High',
                estimated_hours: 4,
                action_plan: 'Complete README setup guides, component prop tables, and submission checklists.'
              },
              {
                rank: 3,
                title: 'Strengthen Core Viva Fundamentals',
                target_metric: 'viva_score',
                current_score: 60.0,
                target_score: 80.0,
                priority: 'High',
                estimated_hours: 5,
                action_plan: 'Review Virtual DOM reconciliation, async AbortController cleanup, and REST codes.'
              }
            ]
          }),
          ai_provider: 'OpenRouter (Fallback)',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 14).toISOString(),
        },
        {
          id: 5,
          intern_id: 5,
          intern_name: 'Vikram Nair',
          intern_email: 'vikram.nair@cynaris.dev',
          target_role: 'Junior Cloud Intern',
          project_completion_pct: 48.0,
          assessment_score: 50.0,
          cia_usage_hours: 5.0,
          documentation_quality: 45.0,
          placement_readiness_score: 45.7,
          placement_grade: 'D',
          viva_score: 46.0,
          code_review_score: 48.0,
          demo_clarity_score: 52.0,
          git_workflow_score: 55.0,
          interview_readiness_score: 48.7,
          interview_grade: 'D',
          improvement_recommendations: JSON.stringify({
            top_3_improvement_actions: [
              {
                rank: 1,
                title: 'Adopt Daily CIA Mentorship Workflow (5h -> 15h)',
                target_metric: 'cia_usage_hours',
                current_score: 25.0,
                target_score: 75.0,
                priority: 'Critical',
                estimated_hours: 10,
                action_plan: 'Log 2 structured CIA sessions per day for architecture review and debugging.'
              },
              {
                rank: 2,
                title: 'Complete Pending Milestone Project Tasks',
                target_metric: 'project_completion_pct',
                current_score: 48.0,
                target_score: 80.0,
                priority: 'Critical',
                estimated_hours: 12,
                action_plan: 'Finish container healthchecks, unit tests, and database migration scripts.'
              },
              {
                rank: 3,
                title: 'Intensive Viva & Code Review Coaching',
                target_metric: 'viva_score',
                current_score: 46.0,
                target_score: 75.0,
                priority: 'Critical',
                estimated_hours: 6,
                action_plan: 'Conduct mock viva walkthroughs focusing on explaining code line-by-line.'
              }
            ]
          }),
          ai_provider: 'Local Deterministic Engine',
          created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ],
    };
    this.nextApplicantId = 5;
    this.nextReadinessId = 6;
    this.inTransaction = false;
    this.transactionSnapshot = null;
  }

  execute(sql, params = []) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const upper = cleanSql.toUpperCase();

    // 1. CREATE TABLE
    if (upper.startsWith('CREATE TABLE')) {
      return Promise.resolve([{ affectedRows: 0, warningStatus: 0 }, []]);
    }

    // 2. INSERT INTO job_applicant
    if (upper.startsWith('INSERT INTO `JOB_APPLICANT`') || upper.startsWith('INSERT INTO JOB_APPLICANT')) {
      const newId = this.nextApplicantId++;
      const [name, jobTitle, stage, expYears, skills, education, resumeText] = params;
      const newRecord = {
        id: newId,
        name: name || '',
        job_title: jobTitle || 'Full Stack Developer',
        pipeline_stage: stage || 'Screening',
        experience_years: Number(expYears) || 1.0,
        skills: skills || '',
        education: education || 'B.Tech Computer Science',
        resume_text: resumeText || '',
        ai_resume_summary: null,
        ai_summary_provider: null,
        ai_analyzed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.tables.job_applicant.push(newRecord);
      return Promise.resolve([{ insertId: newId, affectedRows: 1 }, []]);
    }

    // 3. SELECT * FROM job_applicant WHERE id = ?
    if (upper.startsWith('SELECT') && (upper.includes('WHERE `ID` = ?') || upper.includes('WHERE ID = ?'))) {
      const targetId = Number(params[0]);
      const found = this.tables.job_applicant.filter((a) => a.id === targetId);
      return Promise.resolve([found, []]);
    }

    // 4. SELECT * FROM job_applicant WHERE pipeline_stage = ?
    if (upper.startsWith('SELECT') && (upper.includes('WHERE `PIPELINE_STAGE` = ?') || upper.includes('WHERE PIPELINE_STAGE = ?'))) {
      const targetStage = String(params[0]);
      const matched = this.tables.job_applicant.filter((a) => a.pipeline_stage === targetStage);
      return Promise.resolve([matched, []]);
    }

        // 5. Aggregation: SELECT pipeline_stage, COUNT(*)
    if (upper.includes('COUNT(*)') && upper.includes('GROUP BY')) {
      const counts = {};
      this.tables.job_applicant.forEach((a) => {
        counts[a.pipeline_stage] = (counts[a.pipeline_stage] || 0) + 1;
      });
      const rows = Object.entries(counts).map(([pipeline_stage, count]) => ({
        pipeline_stage,
        count,
      }));
      return Promise.resolve([rows, []]);
    }

    // 6. SELECT * FROM job_applicant (General Select)
    if (upper.startsWith('SELECT') && (upper.includes('FROM `JOB_APPLICANT`') || upper.includes('FROM JOB_APPLICANT'))) {
      return Promise.resolve([[...this.tables.job_applicant], []]);
    }

    // 6. UPDATE job_applicant SET ... WHERE id = ?
    if (upper.startsWith('UPDATE `JOB_APPLICANT`') || upper.startsWith('UPDATE JOB_APPLICANT')) {
      const targetId = Number(params[params.length - 1]);
      const index = this.tables.job_applicant.findIndex((a) => a.id === targetId);
      if (index === -1) {
        return Promise.resolve([{ affectedRows: 0, changedRows: 0 }, []]);
      }

      // If updating stage specifically
      if (upper.includes('PIPELINE_STAGE = ?') || upper.includes('`PIPELINE_STAGE` = ?')) {
        this.tables.job_applicant[index].pipeline_stage = params[0];
        this.tables.job_applicant[index].updated_at = new Date().toISOString();
      }

      return Promise.resolve([{ affectedRows: 1, changedRows: 1 }, []]);
    }

    // 7. DELETE FROM job_applicant WHERE id = ?
    if (upper.startsWith('DELETE FROM `JOB_APPLICANT`') || upper.startsWith('DELETE FROM JOB_APPLICANT')) {
      const targetId = Number(params[0]);
      const initLen = this.tables.job_applicant.length;
      this.tables.job_applicant = this.tables.job_applicant.filter((a) => a.id !== targetId);
      const affected = initLen - this.tables.job_applicant.length;
      return Promise.resolve([{ affectedRows: affected }, []]);
    }

    // 8. intern_readiness_scores queries (Week 8 Day 2: Module 6 & 7)
    if (upper.startsWith('SELECT') && upper.includes('INTERN_READINESS_SCORES')) {
      if (upper.includes('WHERE `INTERN_ID` = ?') || upper.includes('WHERE INTERN_ID = ?')) {
        const targetInternId = Number(params[0]);
        const found = this.tables.intern_readiness_scores.filter((r) => r.intern_id === targetInternId);
        return Promise.resolve([found, []]);
      }
      const sorted = [...this.tables.intern_readiness_scores].sort(
        (a, b) => Number(b.placement_readiness_score) - Number(a.placement_readiness_score)
      );
      return Promise.resolve([sorted, []]);
    }

    if (upper.startsWith('INSERT INTO `INTERN_READINESS_SCORES`') || upper.startsWith('INSERT INTO INTERN_READINESS_SCORES')) {
      const [
        internId, internName, internEmail, targetRole,
        projectCompletionPct, assessmentScore, ciaUsageHours, documentationQuality,
        placementReadinessScore, placementGrade,
        vivaScore, codeReviewScore, demoClarityScore, gitWorkflowScore,
        interviewReadinessScore, interviewGrade,
        improvementRecommendations, aiProvider
      ] = params;

      const numInternId = Number(internId);
      const existingIdx = this.tables.intern_readiness_scores.findIndex((r) => r.intern_id === numInternId);
      const now = new Date().toISOString();

      const row = {
        id: existingIdx !== -1 ? this.tables.intern_readiness_scores[existingIdx].id : this.nextReadinessId++,
        intern_id: numInternId,
        intern_name: internName,
        intern_email: internEmail || '',
        target_role: targetRole || 'Full Stack Developer',
        project_completion_pct: Number(projectCompletionPct),
        assessment_score: Number(assessmentScore),
        cia_usage_hours: Number(ciaUsageHours),
        documentation_quality: Number(documentationQuality),
        placement_readiness_score: Number(placementReadinessScore),
        placement_grade: placementGrade,
        viva_score: Number(vivaScore),
        code_review_score: Number(codeReviewScore),
        demo_clarity_score: Number(demoClarityScore),
        git_workflow_score: Number(gitWorkflowScore),
        interview_readiness_score: Number(interviewReadinessScore),
        interview_grade: interviewGrade,
        improvement_recommendations: improvementRecommendations,
        ai_provider: aiProvider || 'Groq',
        created_at: existingIdx !== -1 ? this.tables.intern_readiness_scores[existingIdx].created_at : now,
        updated_at: now,
      };

      if (existingIdx !== -1) {
        this.tables.intern_readiness_scores[existingIdx] = row;
        return Promise.resolve([{ insertId: row.id, affectedRows: 1 }, []]);
      }
      this.tables.intern_readiness_scores.push(row);
      return Promise.resolve([{ insertId: row.id, affectedRows: 1 }, []]);
    }

    if (upper.startsWith('UPDATE `INTERN_READINESS_SCORES`') || upper.startsWith('UPDATE INTERN_READINESS_SCORES')) {
      const targetInternId = Number(params[params.length - 1]);
      const idx = this.tables.intern_readiness_scores.findIndex((r) => r.intern_id === targetInternId);
      if (idx === -1) {
        return Promise.resolve([{ affectedRows: 0, changedRows: 0 }, []]);
      }
      const [
        internName, internEmail, targetRole,
        projectCompletionPct, assessmentScore, ciaUsageHours, documentationQuality,
        placementReadinessScore, placementGrade,
        vivaScore, codeReviewScore, demoClarityScore, gitWorkflowScore,
        interviewReadinessScore, interviewGrade,
        improvementRecommendations, aiProvider, updatedAt
      ] = params;

      this.tables.intern_readiness_scores[idx] = {
        ...this.tables.intern_readiness_scores[idx],
        intern_name: internName,
        intern_email: internEmail || this.tables.intern_readiness_scores[idx].intern_email,
        target_role: targetRole || this.tables.intern_readiness_scores[idx].target_role,
        project_completion_pct: Number(projectCompletionPct),
        assessment_score: Number(assessmentScore),
        cia_usage_hours: Number(ciaUsageHours),
        documentation_quality: Number(documentationQuality),
        placement_readiness_score: Number(placementReadinessScore),
        placement_grade: placementGrade,
        viva_score: Number(vivaScore),
        code_review_score: Number(codeReviewScore),
        demo_clarity_score: Number(demoClarityScore),
        git_workflow_score: Number(gitWorkflowScore),
        interview_readiness_score: Number(interviewReadinessScore),
        interview_grade: interviewGrade,
        improvement_recommendations: improvementRecommendations,
        ai_provider: aiProvider || 'Groq',
        updated_at: updatedAt || new Date().toISOString(),
      };
      return Promise.resolve([{ affectedRows: 1, changedRows: 1 }, []]);
    }

    if (upper.startsWith('INSERT INTO `AUDIT_LOGS`') || upper.startsWith('INSERT INTO AUDIT_LOGS')) {
      const [eventType, action, entityType, entityId, details] = params;
      this.tables.audit_logs.push({
        id: this.tables.audit_logs.length + 1,
        event_type: eventType,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        created_at: new Date().toISOString(),
      });
      return Promise.resolve([{ insertId: this.tables.audit_logs.length, affectedRows: 1 }, []]);
    }

    

    return Promise.resolve([[], []]);
  }

  beginTransaction() {
    this.inTransaction = true;
    this.transactionSnapshot = JSON.stringify(this.tables);
    return Promise.resolve();
  }

  commit() {
    this.inTransaction = false;
    this.transactionSnapshot = null;
    return Promise.resolve();
  }

  rollback() {
    if (this.transactionSnapshot) {
      this.tables = JSON.parse(this.transactionSnapshot);
    }
    this.inTransaction = false;
    this.transactionSnapshot = null;
    return Promise.resolve();
  }
}

// ==============================================================================
// MySQL Manager & Connection Pool Manager
// ==============================================================================
class MySQLManager {
  constructor(config = DB_CONFIG) {
    this.config = config;
    this.pool = null;
    this.isLiveConnected = false;
    this.mockEngine = new InMemoryMySQLEngine();
    this.metrics = {
      totalQueries: 0,
      preparedStatementsCount: 0,
      transactionsCount: 0,
      activeDriver: 'initializing',
    };
  }

  async init() {
    if (mysql) {
      try {
        const testPool = mysql.createPool(this.config);
        // Probe connection
        const conn = await testPool.getConnection();
        await conn.ping();
        conn.release();

        this.pool = testPool;
        this.isLiveConnected = true;
        this.metrics.activeDriver = 'mysql2/live-pool';
        console.log(`[MySQLManager] Connected to live MySQL at ${this.config.host}:${this.config.port}/${this.config.database}`);
        return;
      } catch (err) {
        // Fall back gracefully to mock engine
        this.isLiveConnected = false;
        this.metrics.activeDriver = 'mysql2/in-memory-engine';
        console.log(`[MySQLManager] Live MySQL not reachable (${err.message}). Using high-fidelity InMemoryMySQLEngine.`);
      }
    } else {
      this.isLiveConnected = false;
      this.metrics.activeDriver = 'mysql2/in-memory-engine';
      console.log('[MySQLManager] mysql2 package not found. Using InMemoryMySQLEngine.');
    }
  }

  /**
   * Execute prepared statement with parameter binding.
   * Parameter placeholders (?) protect against SQL injection.
   */
  async execute(sql, params = []) {
    this.metrics.totalQueries++;
    this.metrics.preparedStatementsCount++;

    if (this.isLiveConnected && this.pool) {
      return this.pool.execute(sql, params);
    }
    return this.mockEngine.execute(sql, params);
  }

  /**
   * Run raw SQL query.
   */
  async query(sql, params = []) {
    this.metrics.totalQueries++;
    if (this.isLiveConnected && this.pool) {
      return this.pool.query(sql, params);
    }
    return this.mockEngine.execute(sql, params);
  }

  /**
   * Acquire a connection for atomic transaction management.
   */
  async getConnection() {
    if (this.isLiveConnected && this.pool) {
      const conn = await this.pool.getConnection();
      this.metrics.transactionsCount++;
      return conn;
    }

    // In-memory mock connection
    this.metrics.transactionsCount++;
    return {
      execute: (sql, params) => this.mockEngine.execute(sql, params),
      query: (sql, params) => this.mockEngine.execute(sql, params),
      beginTransaction: () => this.mockEngine.beginTransaction(),
      commit: () => this.mockEngine.commit(),
      rollback: () => this.mockEngine.rollback(),
      release: () => {},
    };
  }

  /**
   * Run Schema Migrations (Creates tables and indexes).
   */
  async runMigrations() {
    const schemaFile = path.resolve(__dirname, 'schema.sql');
    let ddlStatements = [];

    if (fs.existsSync(schemaFile)) {
      const content = fs.readFileSync(schemaFile, 'utf8');
      const cleanContent = content.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      ddlStatements = cleanContent
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    for (const statement of ddlStatements) {
      await this.execute(statement);
    }

    return {
      success: true,
      appliedStatements: ddlStatements.length,
      driver: this.metrics.activeDriver,
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      isLiveConnected: this.isLiveConnected,
      database: this.config.database,
      host: this.config.host,
      connectionLimit: this.config.connectionLimit,
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isLiveConnected = false;
    }
  }
}

// Global singleton instance
const mysqlClient = new MySQLManager();

module.exports = {
  mysqlClient,
  MySQLManager,
  InMemoryMySQLEngine,
  DB_CONFIG,
};
