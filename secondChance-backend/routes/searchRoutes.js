const express = require('express');
const connectToDatabase = require('../models/db');
const router = express.Router();
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const query = {};
    if (req.query.name) query.name = { $regex: escapeRegex(String(req.query.name)), $options: 'i' };
    if (req.query.category) query.category = { $regex: '^' + escapeRegex(String(req.query.category)) + '$', $options: 'i' };
    if (req.query.condition) query.condition = { $regex: '^' + escapeRegex(String(req.query.condition)) + '$', $options: 'i' };
    if (req.query.age_years !== undefined && req.query.age_years !== '') {
      const age = Number(req.query.age_years);
      if (!Number.isFinite(age) || age < 0) return res.status(400).json({ error: 'age_years must be a non-negative number' });
      query.age_years = { $lte: age };
    }
    res.json(await db.collection('secondChanceItems').find(query).toArray());
  } catch (error) { next(error); }
});
module.exports = router;
