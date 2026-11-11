const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
let mongo, db, app, token, itemId, userId;
const account = {firstName:'Test',lastName:'Learner',email:'test-' + randomUUID() + '@example.invalid',password:'CapstoneTest!2026'};
before(async () => {
  if (!process.env.MONGO_URL) {
    const {MongoMemoryServer}=require('mongodb-memory-server-core');
    mongo=await MongoMemoryServer.create({binary:{version:'8.0.15',downloadDir:path.join(__dirname,'../.runtime/cache')}});
    process.env.MONGO_URL=mongo.getUri();
    process.env.MONGO_DB='secondchance_test';
  }
  process.env.JWT_SECRET=process.env.JWT_SECRET || 'integration-tests-only-not-a-production-secret';
  db=await require('../secondChance-backend/models/db')();
  await require('../secondChance-backend/util/import-mongo/index').loadData();
  app=require('../secondChance-backend/app');
});
after(async () => {
  if (userId) {const {ObjectId}=require('mongodb'); await db.collection('users').deleteOne({_id:new ObjectId(userId)});}
  if (itemId) await db.collection('secondChanceItems').deleteOne({id:itemId});
  await require('../secondChance-backend/models/db').closeDatabase();
  if(mongo) await mongo.stop();
});
test('imports exactly 16 original documents and lists all of them', async () => {
  const response=await request(app).get('/api/secondchanceitems').expect(200);
  assert.equal(response.body.length,16);
  assert.equal(await db.collection('secondChanceItems').countDocuments(),16);
});
test('item details return the requested original item', async () => {
  const response=await request(app).get('/api/secondchanceitems/875').expect(200);
  assert.equal(response.body.name,'Lamp'); assert.equal(response.body.id,'875');
  await request(app).get('/api/secondchanceitems/missing').expect(404);
});
test('search filters category, name, condition and maximum age', async () => {
  const response=await request(app).get('/api/secondchance/search').query({category:'Office',name:'stand',condition:'Like New',age_years:1}).expect(200);
  assert.equal(response.body.length,1); assert.equal(response.body[0].name,'Laptop Stand');
  const literal=await request(app).get('/api/secondchance/search').query({name:'[.*'}).expect(200);
  assert.equal(literal.body.length,0);
  await request(app).get('/api/secondchance/search?age_years=-1').expect(400);
});
test('registration validates input, stores a hash and rejects duplicate accounts', async () => {
  await request(app).post('/api/auth/register').send({...account,password:'short'}).expect(400);
  const response=await request(app).post('/api/auth/register').send(account).expect(201);
  userId=response.body.user.id; assert.equal(response.body.user.email,account.email);
  assert.equal(response.body.user.passwordHash,undefined);
  const stored=await db.collection('users').findOne({email:account.email});
  assert.notEqual(stored.passwordHash,account.password);
  await request(app).post('/api/auth/register').send(account).expect(409);
});
test('login rejects bad credentials, returns a token and allows profile updates', async () => {
  await request(app).post('/api/auth/login').send({email:account.email,password:'wrong'}).expect(401);
  const response=await request(app).post('/api/auth/login').send(account).expect(200);
  token=response.body.token; assert.ok(token);
  const updated=await request(app).put('/api/auth/update').set('Authorization','Bearer '+token).send({firstName:'Updated'}).expect(200);
  assert.equal(updated.body.user.firstName,'Updated');
  await request(app).put('/api/auth/update').send({firstName:'Unauthorized'}).expect(401);
});
test('uploads a photo, updates and deletes an owned item; protects it from other users', async () => {
  await request(app).post('/api/secondchanceitems').send({name:'Unauthorized'}).expect(401);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const response=await request(app).post('/api/secondchanceitems').set('Authorization','Bearer '+token)
    .field('name','Integration Test Item').field('category','Office').field('condition','New').field('description','Temporary integration-test item').field('age_years','0').attach('file',png,{filename:'test.png',contentType:'image/png'}).expect(201);
  itemId=response.body.id; assert.match(response.body.image,/^\/uploads\/.+\.png$/);
  await request(app).get(response.body.image).expect(200);
  const jwt=require('jsonwebtoken');
  const other=jwt.sign({id:'000000000000000000000001'},process.env.JWT_SECRET);
  await request(app).delete('/api/secondchanceitems/'+itemId).set('Authorization','Bearer '+other).expect(403);
  const updated=await request(app).put('/api/secondchanceitems/'+itemId).set('Authorization','Bearer '+token).send({name:'Updated Test Item'}).expect(200);
  assert.equal(updated.body.name,'Updated Test Item');
  const deleted=await request(app).delete('/api/secondchanceitems/'+itemId).set('Authorization','Bearer '+token).expect(200);
  assert.equal(deleted.body.deletedCount,1);
  await request(app).get('/api/secondchanceitems/'+itemId).expect(404);
  itemId=null;
  assert.equal(await db.collection('secondChanceItems').countDocuments(),16);
});
test('Natural sentiment service supports positive, negative and empty input', async () => {
  const sentiment=require('../sentiment/index');
  assert.equal((await request(sentiment).post('/sentiment').send({sentence:'I love this wonderful item'}).expect(200)).body.sentiment,'positive');
  assert.equal((await request(sentiment).post('/sentiment').send({sentence:'This is awful and terrible'}).expect(200)).body.sentiment,'negative');
  await request(sentiment).post('/sentiment').send({sentence:''}).expect(400);
});
