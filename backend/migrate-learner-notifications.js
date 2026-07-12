const { query } = require('./src/config/db');
(async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS learner_notifications (
      id UUID PRIMARY KEY,
      school_id UUID REFERENCES schools(id),
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
  console.log('learner_notifications table ready.');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
