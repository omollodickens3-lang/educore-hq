const { query } = require("../config/db");

(async () => {
  const { rows } = await query(`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conname = 'exams_exam_type_check'
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
