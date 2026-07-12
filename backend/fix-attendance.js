const { query } = require('./src/config/db');

async function main() {
  console.log('--- Checking existing unique constraints on "attendance" ---');
  const { rows: constraints } = await query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'attendance'::regclass AND contype = 'u';
  `);

  if (constraints.length === 0) {
    console.log('No unique constraints found on "attendance". This is the bug.');
  } else {
    console.log('Found constraints:');
    constraints.forEach(c => console.log(`  - ${c.conname}: ${c.def}`));
  }

  const hasTarget = constraints.some(c =>
    c.def.includes('learner_id') && c.def.includes('date') && c.def.includes('session')
  );

  if (hasTarget) {
    console.log('\nA matching unique constraint on (learner_id, date, session) already exists.');
    console.log('The ON CONFLICT clause should work -- the 500 is likely caused by something else (check uuid import, or column types).');
  } else {
    console.log('\nNo constraint matches (learner_id, date, session). Adding it now...');
    try {
      await query(`
        ALTER TABLE attendance
        ADD CONSTRAINT attendance_learner_date_session_unique
        UNIQUE (learner_id, date, session);
      `);
      console.log('SUCCESS: constraint "attendance_learner_date_session_unique" added.');
    } catch (err) {
      console.error('FAILED to add constraint. Full error below:');
      console.error(err);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});
