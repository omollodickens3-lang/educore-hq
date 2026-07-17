const fs = require('fs');
const path = './src/routes/index.js';
let content = fs.readFileSync(path, 'utf8');

const anchor = "router.get('/exams/learner-ranking', authenticate, exams.getLearnerRanking);";
if (!content.includes(anchor)) {
  console.error("ERROR: anchor route not found. No changes made.");
  process.exit(1);
}
if (content.includes('/exams/subject-ranking-by-stream')) {
  console.error("ERROR: route already exists. No changes made.");
  process.exit(1);
}

const newRoute = anchor + "\nrouter.get('/exams/subject-ranking-by-stream', authenticate, exams.getSubjectRankingByStream);";
content = content.replace(anchor, newRoute);

fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS: route added.");