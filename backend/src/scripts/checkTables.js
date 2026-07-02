const { query } = require("../config/db");
(async () => {
  const { rows } = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('users','staff','teachers','admins')
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();
