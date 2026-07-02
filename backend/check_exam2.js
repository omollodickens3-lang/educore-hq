require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
(async () => {
  const r = await pool.query("SELECT id, school_id, grade, exam_type FROM exams WHERE id=$1", ["5f95f3a4-7138-49a7-99b8-eeb50bdb1288"]);
  console.log(r.rows);
  await pool.end();
})();
