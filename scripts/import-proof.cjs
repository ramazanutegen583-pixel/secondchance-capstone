const {MongoMemoryServer}=require('mongodb-memory-server-core');
const path=require('node:path');
(async()=>{
  const mongod=await MongoMemoryServer.create({binary:{version:'8.0.15',downloadDir:path.join(__dirname,'../.runtime/cache')}});
  process.env.MONGO_URL=mongod.getUri(); process.env.MONGO_DB='secondChance';
  const connect=require('../secondChance-backend/models/db');
  try {
    await require('../secondChance-backend/util/import-mongo/index').loadData();
    const db=await connect();
    const docs=await db.collection('secondChanceItems').find({}).project({_id:0,id:1,name:1,category:1}).toArray();
    console.log(JSON.stringify(docs,null,2));
    if(docs.length!==16) throw new Error('Expected exactly 16 documents');
    console.log('Verified: 16 documents imported into MongoDB successfully.');
  } finally { await connect.closeDatabase(); await mongod.stop(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
