const { query } = require('../config/db');
const { v4: uuid } = require('uuid');

async function getLearners(req, res) {
  try {
    const { grade, stream, status, search } = req.query;
    const schoolId = req.user.school_id;
    let sql = `SELECT * FROM learners WHERE school_id = $1`;
    const params = [schoolId];
    let idx = 2;
    if (grade)  { sql += ` AND grade = $${idx++}`;  params.push(grade); }
    if (stream) { sql += ` AND stream = $${idx++}`; params.push(stream); }
    if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
    if (search) { sql += ` AND (first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR admission_no ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    sql += ` ORDER BY grade, stream, last_name`;
    const { rows } = await query(sql, params);
    res.json({ count: rows.length, learners: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch learners' }); }
}

async function getLearnerById(req, res) {
  try {
    const { rows } = await query(
      `SELECT * FROM learners WHERE id = $1 AND school_id = $2`,
      [req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    const { rows: strands } = await query(`SELECT * FROM learner_strands WHERE learner_id = $1`, [req.params.id]);
    res.json({ ...rows[0], strands, overallMean: 0, remediationFlag: rows[0].status === 'remediation' });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch learner' }); }
}

async function createLearner(req, res) {
  try {
    const { firstName, lastName, admissionNo, dateOfBirth, gender, grade, stream, parentName, parentPhone, parentEmail, notes } = req.body;
    const schoolId = req.user.school_id;
    if (!firstName || !lastName || !grade) return res.status(400).json({ error: 'First name, last name and grade are required' });
    const section = ['Grade 7','Grade 8','Grade 9'].includes(grade) ? 'js' : 'primary';
    const { rows } = await query(`
      INSERT INTO learners (id, school_id, admission_no, first_name, last_name, date_of_birth, gender, grade, stream, section, parent_name, parent_phone, parent_email, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [uuid(), schoolId, admissionNo || `2025/${Date.now().toString().slice(-4)}`, firstName, lastName, dateOfBirth || null, gender || null, grade, stream || 'A', section, parentName || null, parentPhone || null, parentEmail || null, notes || null]
    );
    res.status(201).json({ message: 'Learner created', learner: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Admission number already exists' });
    res.status(500).json({ error: 'Failed to create learner' });
  }
}

async function updateLearner(req, res) {
  try {
    const { firstName, lastName, dateOfBirth, gender, grade, stream, status, parentName, parentPhone, parentEmail, notes } = req.body;
    const { rows } = await query(`
      UPDATE learners SET first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, grade=$5, stream=$6, status=$7, parent_name=$8, parent_phone=$9, parent_email=$10, notes=$11, updated_at=NOW()
      WHERE id=$12 AND school_id=$13 RETURNING *`,
      [firstName, lastName, dateOfBirth||null, gender||null, grade, stream||'A', status||'active', parentName||null, parentPhone||null, parentEmail||null, notes||null, req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    res.json({ message: 'Learner updated', learner: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to update learner' }); }
}

async function deleteLearner(req, res) {
  try {
    const { rows } = await query(`DELETE FROM learners WHERE id=$1 AND school_id=$2 RETURNING id`, [req.params.id, req.user.school_id]);
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    res.json({ message: 'Learner deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete learner' }); }
}

async function getLearnerProgress(req, res) {
  try {
    const { rows: strands } = await query(`SELECT * FROM learner_strands WHERE learner_id=$1 ORDER BY term`, [req.params.id]);
    res.json({ scores: [], strands });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch progress' }); }
}

async function updateStrands(req, res) {
  try {
    const { term, academicYear = '2025/2026', ...s } = req.body;
    const { rows } = await query(`
      INSERT INTO learner_strands (id, learner_id, term, academic_year, communication, critical_thinking, creativity, citizenship, collaboration, learning_to_learn, self_efficacy, digital_literacy)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (learner_id, term, academic_year) DO UPDATE SET communication=$5, critical_thinking=$6, creativity=$7, citizenship=$8, collaboration=$9, learning_to_learn=$10, self_efficacy=$11, digital_literacy=$12
      RETURNING *`,
      [uuid(), req.params.id, term, academicYear, s.communication||0, s.criticalThinking||0, s.creativity||0, s.citizenship||0, s.collaboration||0, s.learningToLearn||0, s.selfEfficacy||0, s.digitalLiteracy||0]
    );
    res.json({ message: 'Strands updated', strands: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to update strands' }); }
}

async function getStats(req, res) {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active') AS active,
        COUNT(*) FILTER (WHERE status='remediation') AS remediation,
        COUNT(*) FILTER (WHERE status='transferred') AS transferred,
        COUNT(*) FILTER (WHERE gender='Male') AS male,
        COUNT(*) FILTER (WHERE gender='Female') AS female,
        COUNT(*) FILTER (WHERE section='primary') AS primary_count,
        COUNT(*) FILTER (WHERE section='js') AS js_count
      FROM learners WHERE school_id=$1`, [req.user.school_id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
}

module.exports = { getLearners, getLearnerById, createLearner, updateLearner, deleteLearner, getLearnerProgress, updateStrands, getStats };
async function bulkCreateLearners(req, res) {
  const { learners: rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'No learners provided' });
  }
  const schoolId = req.user.school_id;
  const created = [];
  const failed = [];

  for (const r of rows) {
    try {
      const firstName = (r.firstName || '').trim();
      const lastName = (r.lastName || '').trim();
      const grade = (r.grade || '').trim();
      if (!firstName || !lastName || !grade) {
        failed.push({ row: r, error: 'Missing first name, last name, or grade' });
        continue;
      }
      const section = ['Grade 7', 'Grade 8', 'Grade 9'].includes(grade) ? 'js' : 'primary';
      const { query } = require('../config/db');
      const { v4: uuid } = require('uuid');
      const { rows: inserted } = await query(`
        INSERT INTO learners (id, school_id, admission_no, first_name, last_name, date_of_birth, gender, grade, stream, section, parent_name, parent_phone, parent_email, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [uuid(), schoolId, r.admissionNo || `2025/${Date.now().toString().slice(-4)}${created.length}`,
         firstName, lastName, r.dateOfBirth || null, r.gender || null, grade,
         r.stream || 'A', section, r.parentName || null, r.parentPhone || null,
         r.parentEmail || null, r.notes || null]
      );
      created.push(inserted[0]);
    } catch (err) {
      failed.push({ row: r, error: err.code === '23505' ? 'Admission number already exists' : err.message });
    }
  }

  res.status(201).json({ message: `${created.length} learner(s) created`, created, failed });
}

module.exports.bulkCreateLearners = bulkCreateLearners;
