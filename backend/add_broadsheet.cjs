const fs = require('fs');
const path = './src/controllers/examController.js';
let content = fs.readFileSync(path, 'utf8');

const newFunction = `
async function getBroadsheet(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream } = req.query;
    if (!grade || !term || !stream) return res.status(400).json({ error: 'grade, term and stream required' });

    const subjectsResult = await query(
      \`SELECT DISTINCT s.subject
       FROM scores s
       JOIN exams e ON e.id = s.exam_id
       JOIN learners l ON l.id = s.learner_id
       WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5
       ORDER BY s.subject\`,
      [req.user.school_id, grade, termToInt(term), academicYear, stream]
    );
    const subjects = subjectsResult.rows.map(r => r.subject);

    const rowsResult = await query(
      \`SELECT l.id AS learner_id, l.first_name, l.last_name, l.admission_no,
        json_object_agg(s.subject, json_build_object('score', s.score, 'grade_label', s.grade_label)) AS subjects,
        SUM(s.score) AS total,
        ROUND(AVG(s.score),1) AS average,
        RANK() OVER (ORDER BY SUM(s.score) DESC) AS rank
       FROM scores s
       JOIN exams e ON e.id = s.exam_id
       JOIN learners l ON l.id = s.learner_id
       WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5
       GROUP BY l.id, l.first_name, l.last_name, l.admission_no
       ORDER BY total DESC\`,
      [req.user.school_id, grade, termToInt(term), academicYear, stream]
    );

    res.json({ subjects, broadsheet: rowsResult.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch broadsheet' }); }
}

`;

const exportsAnchor = content.match(/module\.exports = \{[^}]*\};/)[0];
if (!exportsAnchor) {
  console.error("ERROR: module.exports not found. No changes made.");
  process.exit(1);
}
if (content.includes('getBroadsheet')) {
  console.error("ERROR: getBroadsheet already exists. No changes made.");
  process.exit(1);
}

const newExports = exportsAnchor.replace('};', ', getBroadsheet };');
content = content.replace(exportsAnchor, newFunction + newExports);

fs.writeFileSync(path, content, 'utf8');

const verify = fs.readFileSync(path, 'utf8');
console.log("Verify getBroadsheet function present:", verify.includes('async function getBroadsheet'));
console.log("Verify export present:", verify.includes('getBroadsheet };') || /getBroadsheet\s*};/.test(verify));
console.log("SUCCESS: broadsheet endpoint added.");