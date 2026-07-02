const { query } = require("../config/db");
(async () => {
  const exam = await query(`SELECT id, grade, school_id FROM exams ORDER BY created_at DESC LIMIT 1`);
  console.log("EXAM:", JSON.stringify(exam.rows, null, 2));
  const learners = await query(`SELECT id, grade, school_id FROM learners WHERE grade ILIKE '%7%'`);
  console.log("LEARNERS WITH 7:", JSON.stringify(learners.rows, null, 2));
  process.exit(0);
})();
