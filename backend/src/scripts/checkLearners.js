const { query } = require("../config/db");
(async () => {
  const { rows } = await query(`SELECT first_name, last_name, admission_no FROM learners LIMIT 5`);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
