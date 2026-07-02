const { query, pool } = require('./src/config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'learners'
      ORDER BY ordinal_position
    `);
    console.log('=== learners ===');
    rows.forEach(r => console.log(r.column_name + ' | ' + r.data_type));
  } finally {
    await pool.end();
  }
})();