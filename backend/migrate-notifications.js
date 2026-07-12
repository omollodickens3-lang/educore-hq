const { query } = require('./src/config/db');

async function main() {
  console.log('Creating conduct_logs table...');
  await query(`
    CREATE TABLE IF NOT EXISTS conduct_logs (
      id UUID PRIMARY KEY,
      school_id UUID NOT NULL REFERENCES schools(id),
      learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      logged_by UUID NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK (type IN ('positive','concern')),
      category TEXT,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('conduct_logs ready.');

  console.log('Creating notifications table...');
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      school_id UUID NOT NULL REFERENCES schools(id),
      learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
      trigger_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'mock',
      recipient_phone TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      sent_at TIMESTAMPTZ
    );
  `);
  console.log('notifications ready.');

  process.exit(0);
}

main().catch(err => { console.error('FAILED:', err); process.exit(1); });
