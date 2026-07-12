const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`SELECT DISTINCT role FROM users;`);
  console.log('Roles in users table:', rows);
  const { rows: fk } = await query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conname = 'attendance_marked_by_fkey';
  `);
  console.log('Current FK definition:', fk);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
