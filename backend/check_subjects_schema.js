require("dotenv").config();
const { query, pool } = require("./src/config/db");
(async () => {
  const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='subjects'");
  console.log("=== subjects columns ===");
  console.table(cols.rows);
  const schools = await query("SELECT id, name FROM schools");
  console.log("=== schools ===");
  console.table(schools.rows);
  await pool.end();
})();
