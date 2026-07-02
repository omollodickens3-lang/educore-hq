require("dotenv").config();
const { query, pool } = require("./src/config/db");
(async () => {
  const { rows } = await query("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'exams_exam_type_check'");
  console.log(rows[0].def);
  await pool.end();
})();
