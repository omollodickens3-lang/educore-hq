const fs = require('fs');
const path = 'src/controllers/examController.js';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const newFunction = `
async function getLearnerRanking(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream, subject } = req.query;
    if (!grade || !term) return res.status(400).json({ error: 'grade and term required' });
    let sql = \`
      SELECT l.id AS learner_id, l.first_name, l.last_name, l.admission_no, l.stream,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(s.id) AS subjects_marked,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4\`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    let idx = 5;
    if (stream) { sql += \` AND l.stream=$\${idx}\`; params.push(stream); idx++; }
    if (subject) { sql += \` AND s.subject=$\${idx}\`; params.push(subject); idx++; }
    sql += \` GROUP BY l.id, l.first_name, l.last_name, l.admission_no, l.stream ORDER BY avg_score DESC\`;
    const { rows } = await query(sql, params);
    res.json({ learnerRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch learner ranking' }); }
}
`;

const exportsMarker = 'module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking };';

if (!content.includes(exportsMarker)) {
  console.error('ERROR: module.exports line not found in expected form - no changes made.');
  process.exit(1);
}

content = content.replace(
  exportsMarker,
  newFunction + '\nmodule.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking, getLearnerRanking };'
);

if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: getLearnerRanking added and exported.');