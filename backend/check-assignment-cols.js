const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'assignments'
    ORDER BY ordinal_position;
  `);
  console.log('assignments columns:');
  rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type}`));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
