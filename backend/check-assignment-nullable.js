const { query } = require('./src/config/db');
(async () => {
  const { rows } = await query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'assignments'
    ORDER BY ordinal_position;
  `);
  rows.forEach(r => console.log(`  ${r.column_name} | nullable=${r.is_nullable} | default=${r.column_default}`));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
