// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.PGHOST,
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port:     process.env.PGPORT,
});

module.exports = pool;