const { query } = require('./src/config/db');
(async () => {
  try {
    await query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS signature_data TEXT");
    await query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS signature_mime VARCHAR(50)");
    console.log("Migration complete: signature_data and signature_mime added to teachers");
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
  process.exit(0);
})();
