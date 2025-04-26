// backend/server.js
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const pool        = require('./db');

const authRoutes        = require('./routes/auth');
const hostelRoutes      = require('./routes/hostels');
const applicationRoutes = require('./routes/applications');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-end-of-sem.onrender.com';
app.use(cors({ origin: FRONTEND_URL }));
app.use(bodyParser.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/applications', applicationRoutes);

// --- Initialize DB tables ---
async function initDb() {
  // 1) create ENUM types (if missing) via DO blocks
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_users_role'
      ) THEN
        CREATE TYPE enum_users_role AS ENUM ('student','admin');
      END IF;
    END
    $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_applications_status'
      ) THEN
        CREATE TYPE enum_applications_status AS ENUM ('pending','accepted','rejected');
      END IF;
    END
    $$;
  `);

  // 2) users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role enum_users_role NOT NULL DEFAULT 'student'
    );
  `);

  // 3) hostels table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hostels (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      type TEXT,
      capacity INTEGER
    );
  `);

  // 4) applications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      hostel_id INTEGER REFERENCES hostels(id) ON DELETE CASCADE,
      status enum_applications_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

initDb()
  .then(() => {
    app.listen(PORT, () =>
      console.log('🚀 Server running on http://localhost:' + PORT)
    );
  })
  .catch(err => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });