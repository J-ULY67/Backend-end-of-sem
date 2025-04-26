// backend/routes/applications.js
const express = require('express');
const pool    = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/applications
 * - admin: all applications
 * - student: only their own
 */
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role === 'admin') {
    const { rows } = await pool.query(`
      SELECT
        a.id                AS id,
        u.email             AS "userEmail",
        h.name              AS hostel,
        h.type              AS type,
        a.status            AS status
      FROM applications a
      JOIN users u   ON a.user_id   = u.id
      JOIN hostels h ON a.hostel_id = h.id
      ORDER BY a.id
    `);
    return res.json(rows);
  }

  // student
  const { rows } = await pool.query(`
    SELECT
      a.id, h.id AS hostelId, h.name AS hostel,
      h.type, a.status
    FROM applications a
    JOIN hostels h ON a.hostel_id = h.id
    WHERE a.user_id = $1
  `, [req.user.userId]);
  res.json(rows);
});

/**
 * POST /api/applications   (student)
 * body: { hostelId }
 * upserts application => status = Pending
 */
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ message: 'Students only' });

  const userId   = req.user.userId;
  const hostelId = req.body.hostelId;

  // 1) check capacity (only count 'accepted' apps)
  const capRes = await pool.query(`
    SELECT h.capacity,
      COUNT(a.*) FILTER (WHERE a.status='accepted') AS occupancy
    FROM hostels h
    LEFT JOIN applications a
      ON h.id = a.hostel_id AND a.status='accepted'
    WHERE h.id = $1
    GROUP BY h.capacity
  `, [hostelId]);

  if (!capRes.rows.length)
    return res.status(400).json({ message: 'Invalid hostel' });

  const { capacity, occupancy } = capRes.rows[0];
  if (occupancy >= capacity)
    return res.status(400).json({ message: 'Hostel is full' });

  // 2) upsert
  const exist = await pool.query(
    'SELECT id FROM applications WHERE user_id=$1', [userId]
  );

  let app;
  if (exist.rows.length) {
    const { rows } = await pool.query(`
      UPDATE applications
      SET hostel_id=$1, status='pending', created_at=NOW()
      WHERE user_id=$2
      RETURNING *
    `, [hostelId, userId]);
    app = rows[0];
  } else {
    const { rows } = await pool.query(`
      INSERT INTO applications(user_id, hostel_id)
      VALUES($1,$2) RETURNING *
    `, [userId, hostelId]);
    app = rows[0];
  }

  res.status(201).json(app);
});

/**
 * PUT /api/applications/:id   (admin)
 * body: { status: 'Approved'|'Rejected' }
 */
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  // accept both uppercase/lowercase and map "approved" → "accepted"
  let { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }
  const s = status.toString().toLowerCase();
  let newStatus;
  if (s === 'approved' || s === 'accepted') {
    newStatus = 'accepted';
  } else if (s === 'rejected') {
    newStatus = 'rejected';
  } else {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const { rows } = await pool.query(`
    UPDATE applications
    SET status = $1
    WHERE id = $2
    RETURNING *
  `, [newStatus, req.params.id]);

  res.json(rows[0]);
});

/**
 * DELETE /api/applications/:id   (admin)
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;