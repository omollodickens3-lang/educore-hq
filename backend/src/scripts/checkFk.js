const { query } = require("../config/db");
(async () => {
  const { rows } = await query(`
    SELECT
      tc.constraint_name, kcu.column_name,
      ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_name = 'exams_created_by_fkey'
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
