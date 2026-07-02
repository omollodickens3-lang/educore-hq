const { query, pool } = require('./src/config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'exams'
      ORDER BY ordinal_position
    `);
    console.log('=== exams table columns ===');
    rows.forEach(r => {
      console.log(r.column_name + ' | ' + r.data_type + ' | nullable=' + r.is_nullable + ' | default=' + (r.column_default || ''));
    });

    const { rows: subjRows } = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'subjects'
      ORDER BY ordinal_position
    `);
    console.log('=== subjects table columns ===');
    subjRows.forEach(r => {
      console.log(r.column_name + ' | ' + r.data_type);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();