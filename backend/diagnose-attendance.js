const { query, getClient } = require('./src/config/db');

async function main() {
  console.log('--- 1. Checking uuid package ---');
  try {
    const { v4: uuid } = require('uuid');
    console.log('uuid loaded OK, sample:', uuid());
  } catch (err) {
    console.error('uuid FAILED to load:', err.message);
  }

  console.log('\n--- 2. Checking attendance table columns ---');
  const { rows: cols } = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'attendance'
    ORDER BY ordinal_position;
  `);
  cols.forEach(c => console.log(`  ${c.column_name} | ${c.data_type} | nullable=${c.is_nullable}`));

  console.log('\n--- 3. Checking learners table for a real learner_id + school_id ---');
  const { rows: learners } = await query(`SELECT id, school_id FROM learners LIMIT 1;`);
  if (learners.length === 0) {
    console.log('No learners found -- cannot test insert.');
    process.exit(0);
  }
  const testLearner = learners[0];
  console.log('Using test learner:', testLearner);

  console.log('\n--- 4. Attempting a real test INSERT (same as markBulk) ---');
  const { v4: uuid } = require('uuid');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO attendance (id, school_id, learner_id, class_id, date, session, status, marked_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (learner_id, date, session) DO UPDATE SET status=$7, marked_by=$8
    `, [uuid(), testLearner.school_id, testLearner.id, null, '2099-01-01', 'AM', 'P', testLearner.school_id]);
    await client.query('ROLLBACK'); // don't actually keep the test row
    console.log('SUCCESS: test insert worked fine. The bug is likely in req.user.school_id or req.user.id being undefined at runtime.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('INSERT FAILED. Real Postgres error below:');
    console.error(err);
  } finally {
    client.release();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});

