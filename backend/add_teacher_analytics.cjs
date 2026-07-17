const fs = require('fs');
const path = './src/controllers/examController.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "async function getStreamRanking";
const endMarker = "async function getLearnerRanking";
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error("ERROR: could not locate getStreamRanking block. No changes made.");
  process.exit(1);
}
let block = content.slice(startIdx, endIdx);

// --- Patch 1: single-line anchor for the learners JOIN ---
const joinAnchor = "JOIN learners l ON l.id = s.learner_id";
if (!block.includes(joinAnchor)) {
  console.error("ERROR: join anchor not found in getStreamRanking. No changes made.");
  process.exit(1);
}
const joinReplacement = joinAnchor + "\n      LEFT JOIN classes c ON c.school_id = s.school_id AND c.grade = e.grade AND c.stream = l.stream\n      LEFT JOIN users ut ON ut.id = c.class_teacher_id";
block = block.replace(joinAnchor, joinReplacement);

// --- Patch 2: single-line anchor for RANK ---
const rankAnchor = "RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank";
if (!block.includes(rankAnchor)) {
  console.error("ERROR: rank anchor not found in getStreamRanking. No changes made.");
  process.exit(1);
}
block = block.replace(rankAnchor, rankAnchor + ",\n        MAX(ut.full_name) AS class_teacher");

content = content.slice(0, startIdx) + block + content.slice(endIdx);

const newFunction = `
async function getSubjectRankingByStream(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream } = req.query;
    if (!grade || !term || !stream) return res.status(400).json({ error: 'grade, term and stream required' });
    const sql = \`
      SELECT s.subject,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(DISTINCT s.learner_id) AS learners_marked,
        COUNT(*) FILTER (WHERE s.grade_label IN ('EE','EE1','EE2')) AS ee_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('ME','ME1','ME2')) AS me_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('AE','AE1','AE2')) AS ae_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('BE','BE1','BE2')) AS be_count,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank,
        MAX(ut.full_name) AS subject_teacher
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      LEFT JOIN LATERAL (
        SELECT ts.teacher_id,
          CASE
            WHEN ts.stream = l.stream THEN 1
            WHEN ts.stream IS NULL AND ts.grade = e.grade THEN 2
            WHEN ts.stream IS NULL AND ts.grade IS NULL THEN 3
          END AS priority
        FROM teacher_subjects ts
        WHERE ts.school_id = s.school_id AND ts.subject = s.subject
          AND (ts.stream = l.stream OR ts.stream IS NULL)
          AND (ts.grade = e.grade OR ts.grade IS NULL)
        ORDER BY priority ASC
        LIMIT 1
      ) tsub ON true
      LEFT JOIN users ut ON ut.id = tsub.teacher_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5
      GROUP BY s.subject
      ORDER BY avg_score DESC\`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear, stream];
    const { rows } = await query(sql, params);
    res.json({ subjectRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch subject ranking' }); }
}

`;

const exportsAnchor = "module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking, getLearnerRanking };";
if (!content.includes(exportsAnchor)) {
  console.error("ERROR: module.exports anchor not found. No changes made.");
  process.exit(1);
}
content = content.replace(
  exportsAnchor,
  newFunction + "module.exports = { getExams, createExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking, getLearnerRanking, getSubjectRankingByStream };"
);

fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS: examController.js patched.");