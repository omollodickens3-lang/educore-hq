require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');

(async () => {
  const r = await pool.query("SELECT email, password_hash FROM users WHERE email='admin@westside.ac.ke'");
  console.log(r.rows);
  if (r.rows.length) {
    const match = await bcrypt.compare('Admin@2026', r.rows[0].password_hash);
    console.log('Match:', match);
  }
  process.exit();
})();
