require("dotenv").config();
const { query, pool } = require("./src/config/db");
(async () => {
  const { rows } = await query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='learners' ORDER BY ordinal_position");
  console.table(rows);
  await pool.end();
})();
