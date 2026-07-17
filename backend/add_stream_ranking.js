const fs = require('fs');
const path = 'src/controllers/examController.js';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const newFunction = `
async function getStreamRanking(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', subject } = req.query;
    if (!grade || !term) return res.status(400).json({ error: 'grade and term required' });
    let sql = \`
      SELECT l.stream,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(DISTINCT s.learner_id) AS learners_marked,
        COUNT(*) FILTER (WHERE s.grade_label IN ('EE','EE1','EE2')) AS ee_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('ME','ME1','ME2')) AS me_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('AE','AE1','AE2')) AS ae_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('BE','BE1','BE2')) AS be_count,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4\`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    if (subject) { sql += \` AND s.subject=$5\`; params.push(subject); }
    sql += \` GROUP BY l.stream ORDER BY avg_score DESC\`;
    const { rows } = await query(sql, params);
    res.json({ streamRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch stream ranking' }); }
}
`;

// Insert the new function right before module.exports
const exportsMarker = 'module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview };';

if (!content.includes(exportsMarker)) {
  console.error('ERROR: module.exports line not found in expected form - no changes made.');
  process.exit(1);
}

content = content.replace(
  exportsMarker,
  newFunction + '\nmodule.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking };'
);

if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: getStreamRanking added and exported.');