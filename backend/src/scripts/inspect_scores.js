const { query } = require('../config/db');

(async () => {
  try {
    const { rows } = await query(`
      SELECT s.id, s.exam_id, s.learner_id, s.subject, s.score, s.remarks, s.entered_by, s.updated_at
      FROM scores s
      JOIN learners l ON l.id = s.learner_id
      WHERE l.admission_no IN ('2025/007', '2025/006')
      ORDER BY l.admission_no, s.id
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();

