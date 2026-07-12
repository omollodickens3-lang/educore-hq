const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`SELECT id, role FROM users WHERE role='admin' LIMIT 3;`);
  console.log('Sample admin users:', rows);
  const { rows: teacherIds } = await query(`SELECT id FROM teachers LIMIT 3;`);
  console.log('Sample teacher ids:', teacherIds);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
