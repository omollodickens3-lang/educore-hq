require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='schools' ORDER BY ordinal_position")
  .then(r => {
    console.log('classes columns:', r.rows);
    return p.query("SELECT * FROM schools LIMIT 5");
  })
  .then(r => {
    console.log('classes sample rows:', r.rows);
    p.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    p.end();
  });
