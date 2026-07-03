const { query } = require('../config/db');

(async () => {
  try {
    const { rows } = await query(`SELECT * FROM subjects LIMIT 3`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
