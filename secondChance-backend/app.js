require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectToDatabase = require('./models/db');
const authRoutes = require('./routes/authRoutes');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/secondchance/search', searchRoutes);
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchanceitems', secondChanceItemsRoutes);
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/health', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    res.json({ status: 'ok', database: 'MongoDB', items: await db.collection('secondChanceItems').countDocuments() });
  } catch (error) { next(error); }
});
app.use(express.static(path.join(__dirname, '../secondChance-frontend/public')));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, req, res, next) => {
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 500;
  if (status === 500) console.error(error.message);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
});
if (require.main === module) {
  if (!process.env.JWT_SECRET) throw new Error('Set JWT_SECRET before starting the server');
  require('./util/import-mongo/index').loadData().then(() => {
    app.listen(process.env.PORT || 3060, () => console.log('SecondChance API: http://localhost:' + (process.env.PORT || 3060)));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = app;
