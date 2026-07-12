const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'notifications'
    ORDER BY ordinal_position;
  `);
  rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable=${r.is_nullable}`));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
