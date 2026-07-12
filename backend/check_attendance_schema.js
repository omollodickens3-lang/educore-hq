const { query } = require('./src/config/db');
(async () => {
  try {
    const r = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance' ORDER BY ordinal_position");
    if (r.rows.length === 0) console.log("attendance table not found");
    r.rows.forEach(c => console.log(c.column_name + " (" + c.data_type + ")"));
  } catch (e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
})();
