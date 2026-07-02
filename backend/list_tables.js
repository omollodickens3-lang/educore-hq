const { query, pool } = require('./src/config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('=== all tables ===');
    rows.forEach(r => console.log(r.table_name));
  } finally {
    await pool.end();
  }
})();