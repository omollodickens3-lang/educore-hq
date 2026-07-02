require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');

(async () => {
  const hash = await bcrypt.hash('Admin@2026', 12);
  const r = await pool.query("UPDATE users SET password_hash = $1 WHERE email='admin@westside.ac.ke' RETURNING email", [hash]);
  console.log('Updated:', r.rows);
  process.exit();
})();
