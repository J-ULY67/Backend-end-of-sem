// backend/routes/auth.js
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router = express.Router();

// --- Register ---
router.post('/register', async (req, res) => {
  let { name, studentId, email, password, role } = req.body;
  // default & validate role
  role = (role || 'student').toString().toLowerCase();
  if (!['student','admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  if (!name||!studentId||!email||!password)
    return res.status(400).json({ message: 'All fields required' });

  // 1) check existing
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email=$1', [email]
  );
  if (existing.length)
    return res.status(400).json({ message: 'Email already in use' });

  // 2) hash & insert
  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users(name, student_id, email, password, role)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [name, studentId, email, hashed, role]
  );
  const user = rows[0];

  // 3) sign token
  const token = jwt.sign({
    userId:    user.id,
    name:      user.name,
    studentId: user.student_id,
    email:     user.email,
    role:      user.role
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      studentId: user.student_id,
      email: user.email,
      role: user.role
    }
  });
});

// --- Login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email||!password)
    return res.status(400).json({ message: 'Email/password required' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email=$1', [email]
  );
  if (!rows.length)
    return res.status(400).json({ message: 'Invalid credentials' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({
    userId:    user.id,
    name:      user.name,
    studentId: user.student_id,
    email:     user.email,
    role:      user.role
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      studentId: user.student_id,
      email: user.email,
      role: user.role
    }
  });
});

// --- Get current user ---
const { verifyToken } = require('../middleware/auth');
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;