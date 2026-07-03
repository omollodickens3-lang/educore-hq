const { query } = require('../config/db');

(async () => {
  try {
    const { rows } = await query(
      `SELECT * FROM exams WHERE id = $1`,
      ['5f95f3a4-7138-49a7-99b8-eeb50bdb1288']
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();

