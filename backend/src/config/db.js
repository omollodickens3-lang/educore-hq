require('dns').setDefaultResultOrder('ipv4first');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'educore',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      }
);

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('❌ Database error:', err.message));

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
