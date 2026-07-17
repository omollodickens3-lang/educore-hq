const pool = require('./src/config/db');

async function main() {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, exam_type, term, academic_year, grade, stream, start_date
       FROM exams ORDER BY created_at DESC LIMIT 3`
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('QUERY ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
