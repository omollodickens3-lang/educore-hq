const { query } = require('./src/config/db');
const { v4: uuid } = require('uuid');

(async () => {
  const { rows: users } = await query(`SELECT id, school_id FROM users WHERE role='admin' LIMIT 1;`);
  const { rows: learners } = await query(`SELECT school_id, grade, stream FROM learners LIMIT 1;`);
  const admin = users[0];
  const learner = learners[0];
  const id = uuid();
  try {
    await query(
      `INSERT INTO assignments (id, school_id, teacher_id, subject, grade, stream, title, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, learner.school_id, admin.id, 'Mathematics', learner.grade, learner.stream, 'Test', 'test', '2099-01-01']
    );
    console.log('SUCCESS');
    await query(`DELETE FROM assignments WHERE id=$1`, [id]);
  } catch (err) {
    console.error('FAILED:', err.message, err.detail);
  }
  process.exit(0);
})();
