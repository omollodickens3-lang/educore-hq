const { query } = require('./src/config/db');
(async () => {
  console.log('Dropping old FK...');
  await query(`ALTER TABLE assignments DROP CONSTRAINT assignments_teacher_id_fkey;`);
  console.log('Adding new FK pointing to users(id)...');
  await query(`
    ALTER TABLE assignments
    ADD CONSTRAINT assignments_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id);
  `);
  console.log('SUCCESS: teacher_id now references users(id).');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
