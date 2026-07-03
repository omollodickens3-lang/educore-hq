const { query } = require('../config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT e.id AS exam_id, e.name AS exam_name, e.subject_id, s.id AS resolved_subject_id, s.name AS resolved_subject_name
      FROM exams e
      LEFT JOIN subjects s ON s.id = e.subject_id
      WHERE e.id = '5f95f3a4-7138-49a7-99b8-eeb50bdb1288'
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
