const { query } = require("../config/db");
(async () => {
  const { rows } = await query(`SELECT column_name FROM information_schema.columns WHERE table_name='scores' ORDER BY ordinal_position`);
  console.log(rows.map(r => r.column_name).join(", "));
  process.exit(0);
})();
