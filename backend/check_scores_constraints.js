const { query, pool } = require('./src/config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT con.conname AS constraint_name, con.contype AS type,
             pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'scores'
    `);
    console.log('=== scores constraints ===');
    rows.forEach(r => console.log(r.constraint_name + ' | ' + r.type + ' | ' + r.definition));
  } finally {
    await pool.end();
  }
})();
