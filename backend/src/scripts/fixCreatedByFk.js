const { query } = require("../config/db");
(async () => {
  await query(`ALTER TABLE exams DROP CONSTRAINT exams_created_by_fkey`);
  await query(`ALTER TABLE exams ADD CONSTRAINT exams_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)`);
  console.log("created_by FK now points to users(id).");
  process.exit(0);
})();
