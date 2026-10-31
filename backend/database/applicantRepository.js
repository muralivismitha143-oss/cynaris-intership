/**
 * applicantRepository.js
 * 
 * Week 4 Day 4: MySQL CRUD Operations & Prepared Statements
 * 
 * Implements Repository Pattern over MySQL Connection Pool:
 * - Create: INSERT INTO job_applicant (...) VALUES (?, ?, ...)
 * - Read: SELECT * FROM job_applicant WHERE id = ?
 * - Update: UPDATE job_applicant SET ... WHERE id = ?
 * - Delete: DELETE FROM job_applicant WHERE id = ?
 * - Prepared Statements: Strictly uses '?' parameter binding for SQL injection immunity
 * - Transactions: Uses beginTransaction, commit, and rollback for atomic multi-table updates
 */

const { mysqlClient } = require('./mysqlClient');

class ApplicantRepository {
  constructor(client = mysqlClient) {
    this.client = client;
  }

  /**
   * CREATE: Insert a new job applicant using prepared statements.
   */
  async create(data) {
    const {
      name,
      job_title = 'Full Stack Developer',
      pipeline_stage = 'Screening',
      experience_years = 1.0,
      skills = 'JavaScript, Node.js, Express',
      education = 'B.Tech Computer Science',
      resume_text = '',
    } = data;

    const sql = `
      INSERT INTO \`job_applicant\` 
      (\`name\`, \`job_title\`, \`pipeline_stage\`, \`experience_years\`, \`skills\`, \`education\`, \`resume_text\`)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name.trim(),
      job_title,
      pipeline_stage,
      Number(experience_years) || 1.0,
      skills,
      education,
      resume_text,
    ];

    const [result] = await this.client.execute(sql, params);

    return {
      id: result.insertId,
      name: name.trim(),
      job_title,
      pipeline_stage,
      experience_years: Number(experience_years) || 1.0,
      skills,
      education,
      resume_text,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * READ: Retrieve an applicant by Primary Key (id).
   */
  async findById(id) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return null;
    }

    const sql = 'SELECT * FROM `job_applicant` WHERE `id` = ?';
    const [rows] = await this.client.execute(sql, [numId]);

    if (!rows || rows.length === 0) {
      return null;
    }
    return rows[0];
  }

  /**
   * READ: Retrieve all applicants, with optional filtering.
   */
  async findAll(options = {}) {
    const { stage, search, minExp } = options;

    if (stage) {
      const sql = 'SELECT * FROM `job_applicant` WHERE `pipeline_stage` = ?';
      const [rows] = await this.client.execute(sql, [stage]);
      return rows;
    }

    const sql = 'SELECT * FROM `job_applicant`';
    const [rows] = await this.client.execute(sql, []);
    let result = rows;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.skills.toLowerCase().includes(q) ||
          a.job_title.toLowerCase().includes(q)
      );
    }

    if (minExp !== undefined && !isNaN(Number(minExp))) {
      const min = Number(minExp);
      result = result.filter((a) => a.experience_years >= min);
    }

    return result;
  }

  /**
   * UPDATE: Update applicant pipeline stage or fields using prepared statements.
   */
  async update(id, fields = {}) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return null;
    }

    const existing = await this.findById(numId);
    if (!existing) {
      return null;
    }

    if (fields.pipeline_stage) {
      const sql = 'UPDATE `job_applicant` SET `pipeline_stage` = ?, `updated_at` = ? WHERE `id` = ?';
      const now = new Date().toISOString();
      const [result] = await this.client.execute(sql, [fields.pipeline_stage, now, numId]);

      if (result.affectedRows === 0) return null;
      return { ...existing, ...fields, updated_at: now };
    }

    return existing;
  }

  /**
   * DELETE: Remove applicant by Primary Key.
   */
  async delete(id) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return false;
    }

    const sql = 'DELETE FROM `job_applicant` WHERE `id` = ?';
    const [result] = await this.client.execute(sql, [numId]);
    return result.affectedRows > 0;
  }

  /**
   * AGGREGATE: Group and count applicants by pipeline stage.
   */
  async countByStage() {
    const sql = 'SELECT `pipeline_stage`, COUNT(*) as count FROM `job_applicant` GROUP BY `pipeline_stage`';
    const [rows] = await this.client.execute(sql, []);
    return rows;
  }

  /**
   * TRANSACTION: Execute an atomic stage transition with audit log entry.
   * Demonstrates commit and rollback semantics.
   */
  async updateStageWithAudit(applicantId, newStage, actor = 'System') {
    const conn = await this.client.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update applicant stage
      const now = new Date().toISOString();
      await conn.execute(
        'UPDATE `job_applicant` SET `pipeline_stage` = ?, `updated_at` = ? WHERE `id` = ?',
        [newStage, now, applicantId]
      );

      // 2. Insert audit log record
      const auditSql = `
        INSERT INTO \`audit_logs\` (\`event_type\`, \`action\`, \`entity_type\`, \`entity_id\`, \`details\`)
        VALUES (?, ?, ?, ?, ?)
      `;
      const details = JSON.stringify({ oldStage: 'Screening', newStage, actor, timestamp: now });
      await conn.execute(auditSql, ['STAGE_TRANSITION', 'UPDATE', 'JobApplicant', String(applicantId), details]);

      // 3. Commit transaction
      await conn.commit();
      return { success: true, applicantId, newStage, committed: true };
    } catch (err) {
      // Rollback on any failure
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

const applicantRepository = new ApplicantRepository(mysqlClient);

module.exports = {
  ApplicantRepository,
  applicantRepository,
};
