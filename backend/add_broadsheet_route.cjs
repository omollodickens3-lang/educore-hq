const fs = require('fs');
const path = './src/routes/index.js';
let content = fs.readFileSync(path, 'utf8');

const anchor = "router.get('/exams/subject-ranking-by-stream', authenticate, exams.getSubjectRankingByStream);";
if (!content.includes(anchor)) {
  console.error("ERROR: anchor route not found. No changes made.");
  process.exit(1);
}
if (content.includes('/exams/broadsheet')) {
  console.error("ERROR: route already exists. No changes made.");
  process.exit(1);
}

const newRoute = anchor + "\nrouter.get('/exams/broadsheet', authenticate, exams.getBroadsheet);";
content = content.replace(anchor, newRoute);

fs.writeFileSync(path, content, 'utf8');

const verify = fs.readFileSync(path, 'utf8');
console.log("Verify route present:", verify.includes("router.get('/exams/broadsheet'"));
console.log("SUCCESS: broadsheet route added.");