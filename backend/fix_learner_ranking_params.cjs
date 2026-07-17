const fs = require('fs');
const path = './src/controllers/examController.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "async function getLearnerRanking";
const endMarker = "async function getSubjectRankingByStream";
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error("ERROR: could not locate getLearnerRanking block. No changes made.");
  process.exit(1);
}
let block = content.slice(startIdx, endIdx);

const streamBug = "if (stream) { sql += ` AND l.stream=${idx}`; params.push(stream); idx++; }";
const subjectBug = "if (subject) { sql += ` AND s.subject=${idx}`; params.push(subject); idx++; }";

if (!block.includes(streamBug) || !block.includes(subjectBug)) {
  console.error("ERROR: exact buggy lines not found. No changes made.");
  process.exit(1);
}

block = block.replace(streamBug, "if (stream) { sql += ` AND l.stream=$${idx}`; params.push(stream); idx++; }");
block = block.replace(subjectBug, "if (subject) { sql += ` AND s.subject=$${idx}`; params.push(subject); idx++; }");

content = content.slice(0, startIdx) + block + content.slice(endIdx);
fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS: fixed missing $ in getLearnerRanking parameter placeholders.");