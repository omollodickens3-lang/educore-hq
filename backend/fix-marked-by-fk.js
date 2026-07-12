const { query } = require('./src/config/db');
(async () => {
  console.log('Dropping old FK...');
  await query(`ALTER TABLE attendance DROP CONSTRAINT attendance_marked_by_fkey;`);
  console.log('Adding new FK pointing to users(id)...');
  await query(`
    ALTER TABLE attendance
    ADD CONSTRAINT attendance_marked_by_fkey
    FOREIGN KEY (marked_by) REFERENCES users(id);
  `);
  console.log('SUCCESS: marked_by now references users(id).');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
