require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectToDatabase = require('../../models/db');
async function loadData() {
  const db = await connectToDatabase();
  const collection = db.collection('secondChanceItems');
  const existing = await collection.countDocuments();
  if (existing > 0) {
    console.log('Seed skipped: collection already contains ' + existing + ' documents.');
    return { insertedCount: 0, totalCount: existing };
  }
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'secondChanceItems.json'), 'utf8')).docs;
  const result = await collection.insertMany(data);
  console.log('Connected successfully to MongoDB');
  console.log('Database: ' + db.databaseName);
  console.log('Collection: secondChanceItems');
  console.log('Inserted documents: ' + result.insertedCount);
  console.log('Documents in collection: ' + await collection.countDocuments());
  return result;
}
if (require.main === module) loadData().then(() => connectToDatabase.closeDatabase()).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { loadData };
