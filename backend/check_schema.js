const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});
(async () => {
  const tables = ['learners','exams','scores','schools','teachers','users'];
  for (const t of tables) {
    try {
      const r = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]
      );
      console.log("\n=== " + t + " ===");
      if (r.rows.length === 0) console.log("  (table not found)");
      r.rows.forEach(c => console.log("  " + c.column_name + " (" + c.data_type + ")"));
    } catch (e) {
      console.log("\n=== " + t + " === ERROR: " + e.message);
    }
  }
  process.exit(0);
})();
