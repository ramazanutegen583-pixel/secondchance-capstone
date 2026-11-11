const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const file of ['secondChance-backend/app.js','secondChance-backend/models/db.js','secondChance-backend/middleware/auth.js','secondChance-backend/routes/authRoutes.js','secondChance-backend/routes/secondChanceItemsRoutes.js','secondChance-backend/routes/searchRoutes.js','secondChance-backend/util/import-mongo/index.js','sentiment/index.js','secondChance-frontend/public/app.js']) {
  const result = spawnSync(process.execPath, ['--check',path.join(__dirname,'..',file)], {stdio:'inherit'});
  if(result.status !== 0) process.exit(result.status || 1);
}
console.log('All implemented JavaScript files passed syntax validation.');
