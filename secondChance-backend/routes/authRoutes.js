const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const connectToDatabase = require('../models/db');
const authenticate = require('../middleware/auth');
const router = express.Router();
function publicUser(user) {
  return { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName };
}
router.post('/register', async (req, res, next) => {
  try {
    const { password, firstName, lastName } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 ||
        typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Provide firstName, lastName, a valid email and a password of at least 8 characters' });
    }
    const db = await connectToDatabase();
    const user = { email, firstName: firstName.trim().slice(0, 80), lastName: lastName.trim().slice(0, 80), passwordHash: await bcrypt.hash(password, 12) };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    res.status(201).json({ message: 'User registered successfully', user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email is already registered' });
    next(error);
  }
});
router.post('/login', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: String(req.body.email || '').trim().toLowerCase() });
    if (!user || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured');
    const token = jwt.sign({ id: String(user._id), email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user: publicUser(user) });
  } catch (error) { next(error); }
});
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(publicUser(user));
  } catch (error) { next(error); }
});
async function updateUser(req, res, next) {
  try {
    const updates = {};
    for (const field of ['firstName', 'lastName']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' || !req.body[field].trim()) return res.status(400).json({ error: field + ' must not be empty' });
        updates[field] = req.body[field].trim().slice(0, 80);
      }
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Provide firstName or lastName' });
    const db = await connectToDatabase();
    await db.collection('users').updateOne({ _id: new ObjectId(req.user.id) }, { $set: updates });
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User information updated successfully', user: publicUser(user) });
  } catch (error) { next(error); }
}
router.put('/update', authenticate, updateUser);
router.put('/profile', authenticate, updateUser);
module.exports = router;
