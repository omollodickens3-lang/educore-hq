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
const subjects = ["English","Kiswahili","Mathematics","Science","Social Studies","CRE","Agriculture","Creative Arts","Physical Education"];
(async () => {
  for (const name of subjects) {
    await pool.query("INSERT INTO subjects (id, name) VALUES ($1, $2)", [randomUUID(), name]);
  }
  const r = await pool.query("SELECT id, name FROM subjects ORDER BY name");
  console.log(r.rows);
  await pool.end();
})();
