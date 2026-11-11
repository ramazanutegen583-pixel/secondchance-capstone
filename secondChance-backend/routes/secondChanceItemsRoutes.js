const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const connectToDatabase = require('../models/db');
const authenticate = require('../middleware/auth');
const router = express.Router();
const uploadDir = path.join(__dirname, '../public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => callback(null, randomUUID() + extensions[file.mimetype])
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(extensions[file.mimetype] ? null : Object.assign(new Error('Only JPEG, PNG and WebP images are accepted'), { status: 400 }), Boolean(extensions[file.mimetype]))
});
function fields(body) {
  const result = {};
  for (const key of ['name', 'category', 'condition', 'description', 'zipcode']) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || !body[key].trim()) throw Object.assign(new Error(key + ' must not be empty'), { status: 400 });
      result[key] = body[key].trim().slice(0, key === 'description' ? 3000 : 120);
    }
  }
  if (body.age_years !== undefined) {
    const years = Number(body.age_years);
    if (!Number.isFinite(years) || years < 0) throw Object.assign(new Error('age_years must be a non-negative number'), { status: 400 });
    result.age_years = years;
  }
  return result;
}
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    res.json(await db.collection('secondChanceItems').find({}).toArray());
  } catch (error) { next(error); }
});
router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const item = fields(req.body);
    if (!item.name || !item.category || !item.condition || !item.description) return res.status(400).json({ error: 'name, category, condition and description are required' });
    Object.assign(item, { id: randomUUID(), posted_by: req.user.id, date_added: Math.floor(Date.now() / 1000), comments: [] });
    if (req.file) item.image = '/uploads/' + req.file.filename;
    const db = await connectToDatabase();
    const result = await db.collection('secondChanceItems').insertOne(item);
    res.status(201).json({ ...item, _id: result.insertedId });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (error) { next(error); }
});
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const item = await collection.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.posted_by !== req.user.id) return res.status(403).json({ error: 'You can update only your own items' });
    const updates = fields(req.body);
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Provide fields to update' });
    await collection.updateOne({ id: req.params.id }, { $set: updates });
    res.json(await collection.findOne({ id: req.params.id }));
  } catch (error) { next(error); }
});
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const item = await collection.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.posted_by !== req.user.id) return res.status(403).json({ error: 'You can delete only your own items' });
    const result = await collection.deleteOne({ id: req.params.id });
    res.json({ message: 'Item deleted successfully', deletedCount: result.deletedCount });
  } catch (error) { next(error); }
});
module.exports = router;
