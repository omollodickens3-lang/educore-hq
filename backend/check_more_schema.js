const { query, pool } = require('./src/config/db');

(async () => {
  try {
    for (const table of ['scores', 'exam_scores', 'students']) {
      try {
        const { rows } = await query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        console.log(`=== ${table} ===`);
        if (rows.length === 0) console.log('(table does not exist)');
        rows.forEach(r => console.log(r.column_name + ' | ' + r.data_type));
        console.log('');
      } catch (e) {
        console.log(`=== ${table} === error: ${e.message}`);
      }
    }
  } finally {
    await pool.end();
  }
})();