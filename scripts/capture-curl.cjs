const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const output=process.argv[2];
if(!output) throw new Error('Supply the evidence output directory');
fs.mkdirSync(output,{recursive:true});
const curl=process.platform==='win32'?'C:/Windows/System32/curl.exe':'curl';
const account={firstName:'Ramazan',lastName:'Utegen',email:'capstone-'+randomUUID()+'@example.invalid',password:'DemoOnly-SecondChance-2026!'};
function run(name,url,method='GET',body) {
  const args=['--fail-with-body','-s','-i'];
  let command='$ curl --fail-with-body -s -i';
  if(method!=='GET'){args.push('-X',method);command+=' -X '+method;}
  args.push(url);command+=' "'+url+'"';
  if(body){const json=JSON.stringify(body);args.push('-H','Content-Type: application/json','-d',json);command+=' -H "Content-Type: application/json" -d '+String.fromCharCode(39)+json+String.fromCharCode(39);}
  const result=spawnSync(curl,args,{encoding:'utf8'});
  if(result.status!==0) throw new Error(result.stdout+' '+result.stderr);
  const transcript=command+'\n'+result.stdout+'\n';
  fs.writeFileSync(path.join(output,name),transcript);
  fs.writeFileSync(path.join(output,name+'.txt'),transcript);
  const split=result.stdout.indexOf('\r\n\r\n');
  return JSON.parse(result.stdout.slice(split+4));
}
const all=run('mainpage','http://localhost:3060/api/secondchanceitems');
assert.equal(all.length,16);
const registered=run('register','http://localhost:3060/api/auth/register','POST',account);
assert.equal(registered.user.email,account.email);
const login=run('login','http://localhost:3060/api/auth/login','POST',{email:account.email,password:account.password});
assert.ok(login.token);
const detail=run('item_detail','http://localhost:3060/api/secondchanceitems/875');
assert.equal(detail.name,'Lamp');
const search=run('search_item','http://localhost:3060/api/secondchance/search?category=Office&condition=Like%20New&age_years=1');
assert.equal(search.length,1);assert.equal(search[0].name,'Laptop Stand');
console.log('Captured genuine curl responses: 16 items, registration, login, item details and filtered search.');
