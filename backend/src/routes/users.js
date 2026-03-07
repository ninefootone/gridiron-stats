const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/users/me — returns or creates the current user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(req.dbUser);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
