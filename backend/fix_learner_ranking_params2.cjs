const fs = require('fs');
const path = './src/controllers/examController.js';
let content = fs.readFileSync(path, 'utf8');

const oldStream = "if (stream) { sql += ` AND l.stream=${idx}`; params.push(stream); idx++; }";
const oldSubject = "if (subject) { sql += ` AND s.subject=${idx}`; params.push(subject); idx++; }";

const hasStream = content.includes(oldStream);
const hasSubject = content.includes(oldSubject);
console.log("Found oldStream:", hasStream);
console.log("Found oldSubject:", hasSubject);

if (!hasStream || !hasSubject) {
  console.error("ERROR: exact buggy lines not found. No changes made.");
  process.exit(1);
}

const newStream = "if (stream) { sql += ' AND l.stream=$' + idx; params.push(stream); idx++; }";
const newSubject = "if (subject) { sql += ' AND s.subject=$' + idx; params.push(subject); idx++; }";

content = content.split(oldStream).join(newStream);
content = content.split(oldSubject).join(newSubject);

fs.writeFileSync(path, content, 'utf8');

// self-verify by re-reading from disk
const verify = fs.readFileSync(path, 'utf8');
console.log("Verify newStream present:", verify.includes(newStream));
console.log("Verify newSubject present:", verify.includes(newSubject));
console.log("Verify oldStream gone:", !verify.includes(oldStream));
console.log("Verify oldSubject gone:", !verify.includes(oldSubject));