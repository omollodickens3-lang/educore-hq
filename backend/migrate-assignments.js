const { query } = require('./src/config/db');

async function main() {
  console.log('Creating assignments table...');
  await query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id UUID PRIMARY KEY,
      school_id UUID NOT NULL REFERENCES schools(id),
      created_by UUID NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      stream TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('assignments table ready.');

  console.log('Creating assignment_submissions table...');
  await query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id UUID PRIMARY KEY,
      assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','graded')),
      grade TEXT,
      feedback TEXT,
      submitted_at TIMESTAMPTZ,
      graded_at TIMESTAMPTZ,
      UNIQUE (assignment_id, learner_id)
    );
  `);
  console.log('assignment_submissions table ready.');

  process.exit(0);
}

main().catch(err => { console.error('FAILED:', err); process.exit(1); });
