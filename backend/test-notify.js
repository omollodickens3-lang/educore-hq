const { query } = require('./src/config/db');
const { notify } = require('./src/services/notificationService');

(async () => {
  const { rows: learners } = await query(`SELECT id, first_name, last_name, parent_phone FROM learners WHERE parent_phone IS NOT NULL LIMIT 1;`);
  if (!learners.length) { console.log('No learner with a parent_phone found.'); process.exit(0); }
  const l = learners[0];
  console.log('Testing notify() with learner:', l.first_name, l.last_name, '| phone:', l.parent_phone);
  const result = await notify({
    schoolId: null,
    learnerId: l.id,
    triggerType: 'test',
    recipientPhone: l.parent_phone,
    message: 'This is a test notification from EduCore.',
  });
  console.log('Result:', result);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
