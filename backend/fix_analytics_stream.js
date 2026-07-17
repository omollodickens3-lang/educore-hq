const fs = require('fs');
const path = 'src/controllers/examController.js';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

let patches = 0;

// 1. getAnalysis - add optional stream filter
const oldAnalysis = `async function getAnalysis(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026' } = req.query;
    const { rows: subjAvgs } = await query(\`
      SELECT s.subject, ROUND(AVG(s.score),1) AS avg_score, MAX(s.score) AS highest, MIN(s.score) AS lowest
      FROM scores s JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4
      GROUP BY s.subject ORDER BY avg_score DESC\`,
      [req.user.school_id, grade, termToInt(term), academicYear]
    );
    res.json({ subjectAverages: subjAvgs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch analysis' }); }
}`;

const newAnalysis = `async function getAnalysis(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream } = req.query;
    let sql = \`
      SELECT s.subject, ROUND(AVG(s.score),1) AS avg_score, MAX(s.score) AS highest, MIN(s.score) AS lowest, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4\`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    if (stream) { sql += \` AND l.stream=$5\`; params.push(stream); }
    sql += \` GROUP BY s.subject ORDER BY avg_score DESC\`;
    const { rows: subjAvgs } = await query(sql, params);
    res.json({ subjectAverages: subjAvgs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch analysis' }); }
}`;

if (content.includes(oldAnalysis)) {
  content = content.replace(oldAnalysis, newAnalysis);
  patches++;
  console.log('✔ getAnalysis patched');
} else {
  console.error('✘ getAnalysis: old block not found, skipped');
}

// 2. getTrends - add optional stream filter
const oldTrends = `async function getTrends(req, res) {
  try {
    const { grade, subject } = req.query;
    if (!grade || !subject) return res.status(400).json({ error: 'grade and subject required' });
    const { rows } = await query(\`
      SELECT e.academic_year, e.term, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.grade=$2 AND s.subject=$3
      GROUP BY e.academic_year, e.term
      ORDER BY e.academic_year, e.term\`,
      [req.user.school_id, grade, subject]
    );
    res.json({ trends: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch trends' }); }
}`;

const newTrends = `async function getTrends(req, res) {
  try {
    const { grade, subject, stream } = req.query;
    if (!grade || !subject) return res.status(400).json({ error: 'grade and subject required' });
    let sql = \`
      SELECT e.academic_year, e.term, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND s.subject=$3\`;
    const params = [req.user.school_id, grade, subject];
    if (stream) { sql += \` AND l.stream=$4\`; params.push(stream); }
    sql += \` GROUP BY e.academic_year, e.term ORDER BY e.academic_year, e.term\`;
    const { rows } = await query(sql, params);
    res.json({ trends: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch trends' }); }
}`;

if (content.includes(oldTrends)) {
  content = content.replace(oldTrends, newTrends);
  patches++;
  console.log('✔ getTrends patched');
} else {
  console.error('✘ getTrends: old block not found, skipped');
}

// 3. getSchoolOverview - always break out by stream
const oldOverview = `async function getSchoolOverview(req, res) {
  try {
    const { term, academicYear = '2025/2026' } = req.query;
    let sql = \`
      SELECT e.grade, s.subject, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.school_id=$1 AND e.academic_year=$2\`;
    const params = [req.user.school_id, academicYear];
    if (term) { sql += \` AND e.term=$3\`; params.push(parseInt(term)); }
    sql += \` GROUP BY e.grade, s.subject ORDER BY e.grade, avg_score DESC\`;
    const { rows } = await query(sql, params);
    res.json({ overview: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch school overview' }); }
}`;

const newOverview = `async function getSchoolOverview(req, res) {
  try {
    const { term, academicYear = '2025/2026' } = req.query;
    let sql = \`
      SELECT e.grade, l.stream, s.subject, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.academic_year=$2\`;
    const params = [req.user.school_id, academicYear];
    if (term) { sql += \` AND e.term=$3\`; params.push(parseInt(term)); }
    sql += \` GROUP BY e.grade, l.stream, s.subject ORDER BY e.grade, l.stream, avg_score DESC\`;
    const { rows } = await query(sql, params);
    res.json({ overview: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch school overview' }); }
}`;

if (content.includes(oldOverview)) {
  content = content.replace(oldOverview, newOverview);
  patches++;
  console.log('✔ getSchoolOverview patched');
} else {
  console.error('✘ getSchoolOverview: old block not found, skipped');
}

if (patches === 0) {
  console.error('No patches applied. File unchanged.');
  process.exit(1);
}

if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log(`Done. ${patches}/3 patches applied.`);