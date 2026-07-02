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
  const r = await pool.query("SELECT id, name FROM subjects ORDER BY name");
  console.log(r.rows);
  await pool.end();
})();
