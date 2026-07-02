const pool = require("./src/config/db");
pool.query("SELECT id, first_name, last_name, grade, class_id FROM learners WHERE first_name ILIKE '%Brian%' OR first_name ILIKE '%Faith%' OR first_name ILIKE '%Samuel%'")
  .then(r => { console.table(r.rows); process.exit(); })
  .catch(e => { console.error(e); process.exit(1); });