const fs = require('fs');
const path = './src/pages/ExaminationsPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldPiece = 'grade: "", year: THIS_YEAR });';
const newPiece = 'grade: "", year: THIS_YEAR - 1 });';

const found = content.includes(oldPiece);
console.log("Found old piece:", found);

if (!found) {
  console.error("ERROR: exact piece not found. No changes made.");
  process.exit(1);
}

content = content.split(oldPiece).join(newPiece);
fs.writeFileSync(path, content, 'utf8');

const verify = fs.readFileSync(path, 'utf8');
console.log("Verify fix present:", verify.includes(newPiece));
console.log("SUCCESS: Examinations default year fixed to THIS_YEAR - 1.");