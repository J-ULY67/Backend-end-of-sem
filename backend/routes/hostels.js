// backend/routes/hostels.js
const express = require('express');
const pool   = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/hostels
 * returns all hostels + occupancy count
 */
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      h.id, h.name, h.description, h.image, h.type, h.capacity,
      COUNT(a.*) FILTER (WHERE a.status='accepted') AS occupancy
    FROM hostels h
    LEFT JOIN applications a ON h.id = a.hostel_id
    GROUP BY h.id
    ORDER BY h.id
  `);
  res.json(rows);
});

/**
 * POST /api/hostels   (admin)
 */
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, description, image, type, capacity } = req.body;
  const { rows } = await pool.query(`
    INSERT INTO hostels(name, description, image, type, capacity)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [name, description, image, type, capacity]
  );
  res.status(201).json(rows[0]);
});

/**
 * DELETE /api/hostels/:id   (admin)
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM hostels WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;