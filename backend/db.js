const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://hostel_thca_user:QICQScPeCxHvMceEMgCbtfPHk626C2hg@dpg-d069d6juibrs73ebrkng-a.oregon-postgres.render.com/hostel_thca';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

module.exports = pool;