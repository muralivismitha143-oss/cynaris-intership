/**
 * candidateReportRepository.js
 *
 * Week 8 Day 3: Career Intelligence Report — Archetype Map + Employability Score
 *
 * Repository Pattern over MySQL (`mysqlClient`) persisting generated Career Intelligence
 * Reports in `candidate_reports` with parameterized prepared statements and atomic transactions.
 */

const { mysqlClient } = require('./mysqlClient');

class CandidateReportRepository {
  constructor(client = mysqlClient) {
    this.client = client;
  }

  _parseJsonField(val, fallback) {
    if (val === null || val === undefined) return fallback;
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  _formatRow(row) {
    if (!row) return null;
    return {
      id: Number(row.id),
      candidate_id: Number(row.candidate_id),
      candidate_name: row.candidate_name,
      target_role: row.target_role,
      primary_archetype: row.primary_archetype,
      secondary_archetype: row.secondary_archetype,
      archetype_scores: this._parseJsonField(row.archetype_scores, []),
      trait_profile: this._parseJsonField(row.trait_profile, {}),
      employability_score: Number(row.employability_score),
      ai_readiness_score: Number(row.ai_readiness_score),
      placement_readiness_score: Number(row.placement_readiness_score),
      report_narrative: row.report_narrative,
      recommendations: this._parseJsonField(row.recommendations, []),
      ai_provider: row.ai_provider,
      ai_model: row.ai_model,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async findAll() {
    const sql = 'SELECT * FROM `candidate_reports` ORDER BY `id` DESC';
    const [rows] = await this.client.execute(sql, []);
    return (rows || []).map((r) => this._formatRow(r));
  }

  async findById(id) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) return null;
    const sql = 'SELECT * FROM `candidate_reports` WHERE `id` = ?';
    const [rows] = await this.client.execute(sql, [numId]);
    return rows && rows.length > 0 ? this._formatRow(rows[0]) : null;
  }

  async findByCandidateId(candidateId) {
    const numId = Number(candidateId);
    if (!Number.isInteger(numId) || numId < 1) return [];
    const sql = 'SELECT * FROM `candidate_reports` WHERE `candidate_id` = ? ORDER BY `id` DESC';
    const [rows] = await this.client.execute(sql, [numId]);
    return (rows || []).map((r) => this._formatRow(r));
  }

  async createReport(report) {
    const candidateId = Number(report.candidate_id);
    if (!Number.isInteger(candidateId) || candidateId < 1) {
      throw new Error('candidate_id must be a positive integer');
    }

    const conn = await this.client.getConnection();
    try {
      await conn.beginTransaction();

      const insertSql = `
        INSERT INTO \`candidate_reports\` (
          \`candidate_id\`, \`candidate_name\`, \`target_role\`,
          \`primary_archetype\`, \`secondary_archetype\`,
          \`archetype_scores\`, \`trait_profile\`,
          \`employability_score\`, \`ai_readiness_score\`, \`placement_readiness_score\`,
          \`report_narrative\`, \`recommendations\`, \`ai_provider\`, \`ai_model\`
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [res] = await conn.execute(insertSql, [
        candidateId,
        report.candidate_name,
        report.target_role || 'Senior Full Stack Engineer',
        report.primary_archetype,
        report.secondary_archetype,
        JSON.stringify(report.archetype_scores || []),
        JSON.stringify(report.trait_profile || {}),
        report.employability_score,
        report.ai_readiness_score,
        report.placement_readiness_score,
        report.report_narrative,
        JSON.stringify(report.recommendations || []),
        report.ai_provider || 'Groq',
        report.ai_model || 'llama-3.3-70b-versatile',
      ]);

      await conn.execute(
        'INSERT INTO `audit_logs` (`event_type`, `action`, `entity_type`, `entity_id`, `details`) VALUES (?, ?, ?, ?, ?)',
        [
          'CAREER_REPORT_GENERATED',
          'INSERT',
          'CandidateReport',
          String(res.insertId),
          JSON.stringify({
            candidate_id: candidateId,
            primary_archetype: report.primary_archetype,
            employability_score: report.employability_score,
            ai_readiness_score: report.ai_readiness_score,
            placement_readiness_score: report.placement_readiness_score,
          }),
        ]
      );

      await conn.commit();
      return await this.findById(res.insertId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

const candidateReportRepository = new CandidateReportRepository(mysqlClient);

module.exports = {
  CandidateReportRepository,
  candidateReportRepository,
};
