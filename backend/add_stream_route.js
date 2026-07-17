const fs = require('fs');
const path = 'src/routes/index.js';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const oldLine = "router.get('/exams/school-overview', authenticate, exams.getSchoolOverview);";
const newLine = "router.get('/exams/school-overview', authenticate, exams.getSchoolOverview);\nrouter.get('/exams/stream-ranking', authenticate, exams.getStreamRanking);";

if (!content.includes(oldLine)) {
  console.error('ERROR: anchor line not found - no changes made.');
  process.exit(1);
}

content = content.replace(oldLine, newLine);
if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: stream-ranking route added.');