require("dotenv").config();
const { query } = require("./src/config/db");

query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  .then(r => console.log(r.rows.map(x => x.table_name).join("\n")))
  .catch(e => console.error(e.message))
  .finally(() => process.exit(0));
