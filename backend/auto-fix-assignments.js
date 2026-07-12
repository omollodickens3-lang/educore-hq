const { query } = require('./src/config/db');
const { v4: uuid } = require('uuid');

async function main() {
  console.log('--- Getting a real admin user + a real learner for testing ---');
  const { rows: users } = await query(`SELECT id FROM users WHERE role='admin' LIMIT 1;`);
  const { rows: learners } = await query(`SELECT id, school_id, grade, stream FROM learners LIMIT 1;`);
  if (!users.length || !learners.length) {
    console.log('Missing test data (no admin or no learner). Cannot proceed.');
    process.exit(0);
  }
  const admin = users[0];
  const learner = learners[0];
  console.log('Using admin:', admin.id, '| learner grade/stream:', learner.grade, learner.stream);

  const assignmentId = uuid();

  async function tryInsertAssignment() {
    await query(
      `INSERT INTO assignments (id, school_id, created_by, subject, grade, stream, title, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [assignmentId, learner.school_id, admin.id, 'Mathematics', learner.grade, learner.stream, 'Test Assignment', 'test', '2099-01-01']
    );
  }

  console.log('\n--- Attempting test INSERT into assignments ---');
  try {
    await tryInsertAssignment();
    console.log('SUCCESS: assignments insert worked fine.');
    await query(`DELETE FROM assignments WHERE id=$1`, [assignmentId]);
  } catch (err) {
    console.error('FAILED. Error code:', err.code, '| constraint:', err.constraint);
    console.error('Detail:', err.detail);

    if (err.constraint && err.constraint.includes('fkey')) {
      // Extract referenced table from error detail e.g. "is not present in table \"teachers\""
      const match = /is not present in table "(\w+)"/.exec(err.detail || '');
      const wrongTable = match ? match[1] : null;
      console.log('\nDetected bad FK pointing at:', wrongTable);
      console.log('Attempting to repoint constraint', err.constraint, 'to users(id)...');
      try {
        await query(`ALTER TABLE assignments DROP CONSTRAINT ${err.constraint};`);
        const colMatch = /\((\w+)\)/.exec(err.detail || '');
        const col = colMatch ? colMatch[1] : 'created_by';
        await query(`ALTER TABLE assignments ADD CONSTRAINT ${err.constraint} FOREIGN KEY (${col}) REFERENCES users(id);`);
        console.log('SUCCESS: constraint repointed to users(id). Retrying insert...');
        await tryInsertAssignment();
        console.log('SUCCESS: retry insert worked.');
        await query(`DELETE FROM assignments WHERE id=$1`, [assignmentId]);
      } catch (fixErr) {
        console.error('AUTO-FIX FAILED:', fixErr.message);
      }
    } else if (err.code === '23514') {
      console.log('\nThis is a CHECK constraint violation:', err.constraint);
      console.log('Likely a value (e.g. subject/grade) not in an allowed list. Needs manual review.');
    } else {
      console.log('\nUnrecognized error type -- needs manual review.');
    }
  }

  process.exit(0);
}

main().catch(e => { console.error('Script crashed:', e); process.exit(1); });
