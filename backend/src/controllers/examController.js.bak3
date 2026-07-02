const { query, getClient } = require('../config/db');
const { v4: uuid } = require('uuid');

function cbcGrade(score, section) {
  const pct = Math.round(score);
  if (section === 'js') {
    if (pct >= 90) return 'EE1';
    if (pct >= 75) return 'EE2';
    if (pct >= 58) return 'ME1';
    if (pct >= 41) return 'ME2';
    if (pct >= 31) return 'AE1';
    if (pct >= 21) return 'AE2';
    if (pct >= 11) return 'BE1';
    return 'BE2';
  }
  if (pct >= 80) return 'EE';
  if (pct >= 60) return 'ME';
  if (pct >= 40) return 'AE';
  return 'BE';
}

async function getExams(req, res) {
  try {
    const { grade, term, examType, academicYear = '2025/2026' } = req.query;
    let sql = `SELECT * FROM exams WHERE school_id=$1 AND academic_year=$2`;
    const params = [req.user.school_id, academicYear];
    let idx = 3;
    if (grade)    { sql += ` AND grade=$${idx++}`;     params.push(grade); }
    if (term)     { sql += ` AND term=$${idx++}`;      params.push(parseInt(term)); }
    if (examType) { sql += ` AND exam_type=$${idx++}`; params.push(examType); }
    sql += ` ORDER BY term, exam_type, grade`;
    const { rows } = await query(sql, params);
    res.json({ exams: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch exams' }); }
}

async function createExam(req, res) {
  try {
    const { name, examType, term, academicYear = '2025/2026', grade, stream, startDate, endDate } = req.body;
    if (!grade || !term || !examType) return res.status(400).json({ error: 'grade, term and examType required' });
    const { rows } = await query(`
      INSERT INTO exams (id, school_id, name, exam_type, term, academic_year, grade, stream, start_date, end_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(), req.user.school_id, name || `${grade} Term ${term} ${examType}`, examType, term, academicYear, grade, stream||null, startDate||null, endDate||null, req.user.id]
    );
    res.status(201).json({ message: 'Exam created', exam: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create exam' }); }
}

async function getScores(req, res) {
  try {
    const { rows } = await query(`
      SELECT s.*, l.first_name, l.last_name, l.admission_no, l.grade, l.section
      FROM scores s JOIN learners l ON l.id = s.learner_id
      WHERE s.exam_id=$1 AND s.school_id=$2 ORDER BY l.last_name, s.subject`,
      [req.params.examId, req.user.school_id]
    );
    res.json({ scores: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch scores' }); }
}

async function upsertScores(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { scores } = req.body;
    if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });
    let upserted = 0;
    for (const item of scores) {
      const { learnerId, subject, score } = item;
      if (score === null || score === undefined) continue;
      const pct = Math.min(100, Math.max(0, parseFloat(score)));
      const { rows: lr } = await client.query(`SELECT section FROM learners WHERE id=$1`, [learnerId]);
      const section = lr[0]?.section || 'primary';
      const gradeLabel = cbcGrade(pct, section);
      await client.query(`
        INSERT INTO scores (id, exam_id, learner_id, school_id, subject, score, grade_label, entered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (exam_id, learner_id, subject) DO UPDATE SET score=$6, grade_label=$7, entered_by=$8, updated_at=NOW()`,
        [uuid(), req.params.examId, learnerId, req.user.school_id, subject, pct, gradeLabel, req.user.id]
      );
      upserted++;
    }
    await client.query('COMMIT');
    res.json({ message: `${upserted} scores saved`, upserted });
  } catch (err) { console.error(err);
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to save scores' });
  } finally { client.release(); }
}

async function getAnalysis(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026' } = req.query;
    const { rows: subjAvgs } = await query(`
      SELECT s.subject, ROUND(AVG(s.score),1) AS avg_score, MAX(s.score) AS highest, MIN(s.score) AS lowest
      FROM scores s JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4
      GROUP BY s.subject ORDER BY avg_score DESC`,
      [req.user.school_id, grade, parseInt(term), academicYear]
    );
    res.json({ subjectAverages: subjAvgs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch analysis' }); }
}

module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis };
