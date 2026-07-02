const { query, pool } = require('./src/config/db');

(async () => {
  try {
    await query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100`);
    console.log('max_score column added (or already existed).');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();