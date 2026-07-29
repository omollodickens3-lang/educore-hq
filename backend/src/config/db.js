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

// Prevent silent-forever hangs: cap pool size and fail fast if no
// connection becomes available, instead of queuing requests indefinitely.
pool.options.max = pool.options.max || 20;
pool.options.idleTimeoutMillis = pool.options.idleTimeoutMillis || 30000;
pool.options.connectionTimeoutMillis = pool.options.connectionTimeoutMillis || 10000;

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
