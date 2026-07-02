require("dotenv").config();
const { query, pool } = require("./src/config/db");
(async () => {
  const { rows } = await query("SELECT id, name, grade, term, academic_year, exam_type FROM exams ORDER BY created_at DESC");
  console.table(rows);
  await pool.end();
})();
