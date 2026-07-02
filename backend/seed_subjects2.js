require("dotenv").config();
const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
const schoolId = "a0000000-0000-0000-0000-000000000001";
const grade = "Grade 7";
const subjects = ["English","Kiswahili","Mathematics","Science","Social Studies","CRE","Agriculture","Creative Arts","Physical Education"];
(async () => {
  for (const name of subjects) {
    await pool.query(
      "INSERT INTO subjects (id, school_id, name, grade) VALUES ($1, $2, $3, $4)",
      [randomUUID(), schoolId, name, grade]
    );
  }
  const r = await pool.query("SELECT id, name, grade FROM subjects WHERE school_id=$1 ORDER BY name", [schoolId]);
  console.log(r.rows);
  await pool.end();
})();
