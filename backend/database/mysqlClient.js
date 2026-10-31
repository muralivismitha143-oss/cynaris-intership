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
    };
    this.nextApplicantId = 5;
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
