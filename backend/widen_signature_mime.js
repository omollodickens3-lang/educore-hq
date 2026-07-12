const { query } = require('./src/config/db');
(async () => {
  try {
    await query("ALTER TABLE teachers ALTER COLUMN signature_mime TYPE VARCHAR(255)");
    console.log("Migration complete: signature_mime widened to VARCHAR(255)");
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
  process.exit(0);
})();
