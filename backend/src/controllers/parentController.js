const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

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


async function registerParent(req, res) {
  try {
    const { admissionNo, lastName, fullName, email, password } = req.body;
    if (!admissionNo || !lastName || !fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const learnerRes = await query(
      'SELECT id, school_id, parent_user_id, last_name FROM learners WHERE admission_no = $1',
      [admissionNo.trim()]
    );
    if (!learnerRes.rows.length) {
      return res.status(404).json({ error: "No learner found with that admission number. Check with the school if you're unsure." });
    }
    const learner = learnerRes.rows[0];

    if ((learner.last_name || '').trim().toLowerCase() !== lastName.trim().toLowerCase()) {
      return res.status(400).json({ error: "The learner's last name doesn't match our records." });
    }

    if (learner.parent_user_id) {
      return res.status(409).json({ error: 'A parent account is already linked to this learner. Contact the school if this is a mistake.' });
    }

    const emailCheck = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userRes = await query(
      "INSERT INTO users (id, school_id, email, password_hash, role, full_name, is_active) " +
      "VALUES (uuid_generate_v4(), $1, $2, $3, 'parent', $4, true) RETURNING id, email, role, full_name",
      [learner.school_id, email.toLowerCase(), passwordHash, fullName]
    );
    const newUser = userRes.rows[0];

    await query('UPDATE learners SET parent_user_id = $1 WHERE id = $2', [newUser.id, learner.id]);

    res.status(201).json({ message: 'Account created! You can now log in.', user: newUser });
  } catch (err) {
    console.error('registerParent error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
}

module.exports = { getMyChild, registerParent };
