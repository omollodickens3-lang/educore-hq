const { query } = require('./src/config/db');

(async () => {
  const { rows: assignments } = await query(`SELECT id FROM assignments ORDER BY created_at DESC LIMIT 1;`);
  if (!assignments.length) { console.log('No assignments found.'); process.exit(0); }
  const id = assignments[0].id;
  console.log('Testing with assignment id:', id);

  try {
    const { rows: assignmentRows } = await query(`SELECT * FROM assignments WHERE id=$1`, [id]);
    console.log('Assignment fetch: OK');

    const { rows: roster } = await query(
      `SELECT s.id AS submission_id, s.status, s.grade_label AS grade, s.feedback, s.submitted_at, s.graded_at,
              l.id AS learner_id, l.first_name, l.last_name, l.admission_no
       FROM assignment_submissions s
       JOIN learners l ON l.id = s.learner_id
       WHERE s.assignment_id = $1
       ORDER BY l.first_name`,
      [id]
    );
    console.log('Roster fetch: OK, rows:', roster.length);
    console.log('SUCCESS overall');
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error('Detail:', err.detail);
    console.error('Column:', err.column);
  }
  process.exit(0);
})().catch(e => { console.error('Script crashed:', e); process.exit(1); });

