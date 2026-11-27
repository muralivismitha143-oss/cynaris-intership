/**
 * readinessRepository.js
 *
 * Week 8 Day 2: Module 6 & 7 — Placement Readiness Score + Interview Readiness Score
 *
 * Implements Repository Pattern over MySQL Connection Pool (`mysqlClient`):
 * - Uses strictly parameterized prepared statements (`?`) to prevent SQL injection.
 * - Persists and retrieves intern readiness scores from `intern_readiness_scores`.
 * - Executes atomic upsert + audit log transactions via `getConnection()`.
 */

const { mysqlClient } = require('./mysqlClient');

class ReadinessRepository {
  constructor(client = mysqlClient) {
    this.client = client;
  }

  /**
   * Normalize database row into clean API representation.
   */
  _formatRow(row) {
    if (!row) return null;
    let parsedRecommendations = row.improvement_recommendations;
    if (typeof parsedRecommendations === 'string') {
      try {
        parsedRecommendations = JSON.parse(parsedRecommendations);
      } catch {
        parsedRecommendations = null;
      }
    }

    return {
      id: Number(row.id),
      intern_id: Number(row.intern_id),
      intern_name: row.intern_name,
      intern_email: row.intern_email || '',
      target_role: row.target_role || 'Full Stack Developer',
      project_completion_pct: Number(row.project_completion_pct),
      assessment_score: Number(row.assessment_score),
      cia_usage_hours: Number(row.cia_usage_hours),
      documentation_quality: Number(row.documentation_quality),
      placement_readiness_score: Number(row.placement_readiness_score),
      placement_grade: row.placement_grade,
      viva_score: Number(row.viva_score),
      code_review_score: Number(row.code_review_score),
      demo_clarity_score: Number(row.demo_clarity_score),
      git_workflow_score: Number(row.git_workflow_score),
      interview_readiness_score: Number(row.interview_readiness_score),
      interview_grade: row.interview_grade,
      improvement_recommendations: parsedRecommendations,
      ai_provider: row.ai_provider || 'Groq',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Retrieve all interns' readiness scores sorted by placement readiness descending.
   */
  async findAll() {
    const sql = 'SELECT * FROM `intern_readiness_scores` ORDER BY `placement_readiness_score` DESC';
    const [rows] = await this.client.execute(sql, []);
    return (rows || []).map((r) => this._formatRow(r));
  }

  /**
   * Retrieve readiness score record for a single intern by `intern_id`.
   */
  async findByInternId(internId) {
    const numId = Number(internId);
    if (!Number.isInteger(numId) || numId < 1) {
      return null;
    }

    const sql = 'SELECT * FROM `intern_readiness_scores` WHERE `intern_id` = ?';
    const [rows] = await this.client.execute(sql, [numId]);
    if (!rows || rows.length === 0) {
      return null;
    }
    return this._formatRow(rows[0]);
  }

  /**
   * Atomically persist (insert or update) an intern's readiness scores and log an audit entry.
   */
  async upsertScore(record) {
    const internId = Number(record.intern_id);
    if (!Number.isInteger(internId) || internId < 1) {
      throw new Error('Valid positive integer intern_id is required');
    }

    const conn = await this.client.getConnection();
    try {
      await conn.beginTransaction();

      const recommendationsJson =
        typeof record.improvement_recommendations === 'string'
          ? record.improvement_recommendations
          : JSON.stringify(record.improvement_recommendations || {});

      const existing = await this.findByInternId(internId);
      const now = new Date().toISOString();

      if (existing) {
        const updateSql = `
          UPDATE \`intern_readiness_scores\`
          SET \`intern_name\` = ?, \`intern_email\` = ?, \`target_role\` = ?,
              \`project_completion_pct\` = ?, \`assessment_score\` = ?, \`cia_usage_hours\` = ?, \`documentation_quality\` = ?,
              \`placement_readiness_score\` = ?, \`placement_grade\` = ?,
              \`viva_score\` = ?, \`code_review_score\` = ?, \`demo_clarity_score\` = ?, \`git_workflow_score\` = ?,
              \`interview_readiness_score\` = ?, \`interview_grade\` = ?,
              \`improvement_recommendations\` = ?, \`ai_provider\` = ?, \`updated_at\` = ?
          WHERE \`intern_id\` = ?
        `;
        await conn.execute(updateSql, [
          record.intern_name,
          record.intern_email || '',
          record.target_role || 'Full Stack Developer',
          record.project_completion_pct,
          record.assessment_score,
          record.cia_usage_hours,
          record.documentation_quality,
          record.placement_readiness_score,
          record.placement_grade,
          record.viva_score,
          record.code_review_score,
          record.demo_clarity_score,
          record.git_workflow_score,
          record.interview_readiness_score,
          record.interview_grade,
          recommendationsJson,
          record.ai_provider || 'Groq',
          now,
          internId,
        ]);
      } else {
        const insertSql = `
          INSERT INTO \`intern_readiness_scores\` (
            \`intern_id\`, \`intern_name\`, \`intern_email\`, \`target_role\`,
            \`project_completion_pct\`, \`assessment_score\`, \`cia_usage_hours\`, \`documentation_quality\`,
            \`placement_readiness_score\`, \`placement_grade\`,
            \`viva_score\`, \`code_review_score\`, \`demo_clarity_score\`, \`git_workflow_score\`,
            \`interview_readiness_score\`, \`interview_grade\`,
            \`improvement_recommendations\`, \`ai_provider\`
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await conn.execute(insertSql, [
          internId,
          record.intern_name,
          record.intern_email || '',
          record.target_role || 'Full Stack Developer',
          record.project_completion_pct,
          record.assessment_score,
          record.cia_usage_hours,
          record.documentation_quality,
          record.placement_readiness_score,
          record.placement_grade,
          record.viva_score,
          record.code_review_score,
          record.demo_clarity_score,
          record.git_workflow_score,
          record.interview_readiness_score,
          record.interview_grade,
          recommendationsJson,
          record.ai_provider || 'Groq',
        ]);
      }

      const auditSql = `
        INSERT INTO \`audit_logs\` (\`event_type\`, \`action\`, \`entity_type\`, \`entity_id\`, \`details\`)
        VALUES (?, ?, ?, ?, ?)
      `;
      await conn.execute(auditSql, [
        'READINESS_SCORE_EVALUATION',
        existing ? 'UPDATE' : 'INSERT',
        'InternReadinessScore',
        String(internId),
        JSON.stringify({
          placement_readiness_score: record.placement_readiness_score,
          placement_grade: record.placement_grade,
          interview_readiness_score: record.interview_readiness_score,
          interview_grade: record.interview_grade,
          timestamp: now,
        }),
      ]);

      await conn.commit();
      return await this.findByInternId(internId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

const readinessRepository = new ReadinessRepository(mysqlClient);

module.exports = {
  ReadinessRepository,
  readinessRepository,
};
