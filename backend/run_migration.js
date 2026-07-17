const { query } = require('./src/config/db');
const fs = require('fs');

async function run() {
  const sql = fs.readFileSync('migrations/003_add_exam_subject.sql', 'utf8');
  console.log('Running migration...');
  await query(sql);
  console.log('SUCCESS: migration 003 applied.');
  process.exit(0);
}

run().catch(err => {
  console.error('MIGRATION FAILED:', err.message);
  process.exit(1);
});