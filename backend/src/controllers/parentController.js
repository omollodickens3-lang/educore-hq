const { query } = require('../config/db');

async function getMyChild(req, res) {
  try {
    const { rows: learnerRows } = await query(
      `SELECT id, first_name, last_name, admission_no, grade, stream, parent_name, parent_phone, parent_email
       FROM learners WHERE parent_user_id = $1`,
      [req.user.id]
    );
    if (!learnerRows.length) {
      return res.status(404).json({ error: 'No learner linked to this parent account' });
    }
    const learner = learnerRows[0];
    const learnerId = learner.id;

    const { rows: attendance } = await query(
      `SELECT date, status, session FROM attendance WHERE learner_id = $1 ORDER BY date DESC LIMIT 30`,
      [learnerId]
    );

    const { rows: statsRows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status='P') AS present,
        COUNT(*) FILTER (WHERE status='L') AS late,
        COUNT(*) AS total
       FROM attendance WHERE learner_id = $1`,
      [learnerId]
    );
    const s = statsRows[0];
    const total = parseInt(s.total) || 1;
    const attendanceRate = Math.round(((parseInt(s.present) + parseInt(s.late)) / total) * 100);

    const { rows: scores } = await query(
      `SELECT s.subject, s.score, s.max_score, s.grade_label, s.remarks, s.updated_at, e.name AS exam_name
       FROM scores s JOIN exams e ON e.id = s.exam_id
       WHERE s.learner_id = $1 ORDER BY s.updated_at DESC LIMIT 30`,
      [learnerId]
    );

    const { rows: conduct } = await query(
      `SELECT category, type, description, created_at FROM conduct_logs WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [learnerId]
    );

    const { rows: notifications } = await query(
      `SELECT trigger_type, message, status, created_at FROM learner_notifications WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [learnerId]
    );

    res.json({
      learner,
      attendanceRate,
      attendance,
      scores,
      conduct,
      notifications,
    });
  } catch (err) {
    console.error('Parent portal fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch parent portal data' });
  }
}

module.exports = { getMyChild };
