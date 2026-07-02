const { query } = require("./src/config/db");
(async () => {
  await query(`ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_entered_by_fkey`);
  console.log("Done");
  process.exit(0);
})();
