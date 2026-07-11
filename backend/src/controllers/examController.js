const { query, getClient } = require('../config/db');
const { v4: uuid } = require('uuid');

const { termToInt, cbcGrade } = require('../utils/examUtils');

async function getExams(req, res) {
  try {
    const { grade, term, examType, academicYear = '2025/2026' } = req.query;
    let sql = `SELECT e.*, s.name AS subject FROM exams e LEFT JOIN subjects s ON s.id = e.subject_id WHERE e.school_id=$1 AND e.academic_year=$2`;
    const params = [req.user.school_id, academicYear];
    let idx = 3;
    if (grade)    { sql += ` AND e.grade=$${idx++}`;      params.push(grade); }
    if (term)     { sql += ` AND e.term=$${idx++}`;       params.push(termToInt(term)); }
    if (examType) { sql += ` AND e.exam_type=$${idx++}`;  params.push(examType); }
    sql += ` ORDER BY e.term, e.exam_type, e.grade`;
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
    const { rows: examRows } = await query(
      `SELECT * FROM exams WHERE id=$1 AND school_id=$2`,
      [req.params.examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];

    const { rows } = await query(`
      SELECT
        l.id AS learner_id,
        l.first_name,
        l.last_name,
        l.admission_no,
        l.grade,
        l.stream,
        s.id AS score_id,
        s.exam_id,
        s.subject,
        s.score,
        s.max_score,
        s.grade_label,
        s.remarks,
        s.entered_at,
        s.updated_at
      FROM learners l
      LEFT JOIN scores s ON s.learner_id = l.id AND s.exam_id = $1
      WHERE l.school_id = $2 AND l.grade = $3
      ORDER BY l.last_name, l.first_name`,
      [req.params.examId, req.user.school_id, exam.grade]
    );
    res.json({ scores: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch scores' }); }
}

async function upsertScores(req, res) {
  const client = await getClient();
  try {
    const { scores } = req.body;
    if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });
    await client.query('BEGIN');
    let upserted = 0;
    for (const item of scores) {
      const { learnerId, subject, score, remarks } = item;
      if (score === null || score === undefined) continue;
      const pct = Math.min(100, Math.max(0, parseFloat(score)));
      const { rows: lr } = await client.query(`SELECT section FROM learners WHERE id=$1`, [learnerId]);
      const section = lr[0]?.section || 'primary';
      const gradeLabel = cbcGrade(pct, section);
      await client.query(`
        INSERT INTO scores (id, exam_id, learner_id, school_id, subject, score, grade_label, remarks, entered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (exam_id, learner_id, subject) DO UPDATE
        SET score=$6, grade_label=$7, remarks=$8, entered_by=$9, updated_at=NOW()`,
        [uuid(), req.params.examId, learnerId, req.user.school_id, subject, pct, gradeLabel, remarks ?? null, req.user.id]
      );
      upserted++;
    }
    await client.query('COMMIT');
    res.json({ message: `${upserted} scores saved`, upserted });
  } catch (err) {
    console.error(err);
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
      [req.user.school_id, grade, termToInt(term), academicYear]
    );
    res.json({ subjectAverages: subjAvgs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch analysis' }); }
}

async function getTrends(req, res) {
  try {
    const { grade, subject } = req.query;
    if (!grade || !subject) return res.status(400).json({ error: 'grade and subject required' });
    const { rows } = await query(`
      SELECT e.academic_year, e.term, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.grade=$2 AND s.subject=$3
      GROUP BY e.academic_year, e.term
      ORDER BY e.academic_year, e.term`,
      [req.user.school_id, grade, subject]
    );
    res.json({ trends: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch trends' }); }
}

async function getSchoolOverview(req, res) {
  try {
    const { term, academicYear = '2025/2026' } = req.query;
    let sql = `
      SELECT e.grade, s.subject, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.academic_year=$2`;
    const params = [req.user.school_id, academicYear];
    if (term) { sql += ` AND e.term=$3`; params.push(parseInt(term)); }
    sql += ` GROUP BY e.grade, s.subject ORDER BY e.grade, avg_score DESC`;
    const { rows } = await query(sql, params);
    res.json({ overview: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch school overview' }); }
}

module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview };


