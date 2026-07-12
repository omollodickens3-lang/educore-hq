const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'assignment_submissions'
    ORDER BY ordinal_position;
  `);
  rows.forEach(r => console.log(`  ${r.column_name} | nullable=${r.is_nullable}`));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
