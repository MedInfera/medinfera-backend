// PostgreSQL connection pool
// A pool allows multiple requests to use the database simultaneously
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message);
  process.exit(1);
});

// Run a single query
const query = (text, params) => pool.query(text, params);

// Get a client for transactions (multiple queries as one atomic unit)
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };