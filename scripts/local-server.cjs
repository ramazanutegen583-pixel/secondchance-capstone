const { MongoMemoryServer } = require('mongodb-memory-server-core');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
(async () => {
  const runtime = path.join(__dirname, '../.runtime');
  fs.mkdirSync(path.join(runtime, 'data'), { recursive: true });
  const mongod = await MongoMemoryServer.create({
    binary: { version: '8.0.15', downloadDir: path.join(runtime, 'cache') },
    instance: { port: 27018, dbName: 'secondChance', dbPath: path.join(runtime, 'data') }
  });
  process.env.MONGO_URL = mongod.getUri();
  process.env.MONGO_DB = 'secondChance';
  process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
  await require('../secondChance-backend/util/import-mongo/index').loadData();
  const app = require('../secondChance-backend/app');
  const server = app.listen(3060, '127.0.0.1', () => console.log('Local: http://127.0.0.1:3060 — actual MongoDB on port 27018'));
  const sentiment = require('../sentiment/index').listen(3061, '127.0.0.1');
  async function stop() {
    server.close(); sentiment.close();
    await require('../secondChance-backend/models/db').closeDatabase();
    await mongod.stop(); process.exit(0);
  }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})().catch(error => { console.error(error); process.exit(1); });
