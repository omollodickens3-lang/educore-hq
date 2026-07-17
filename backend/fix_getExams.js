const fs = require('fs');
const path = 'src/controllers/examController.js';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const oldLine = "    let sql = `SELECT e.*, s.name AS subject FROM exams e LEFT JOIN subjects s ON s.id = e.subject_id WHERE e.school_id=$1 AND e.academic_year=$2`;";
const newLine = "    let sql = `SELECT e.* FROM exams e WHERE e.school_id=$1 AND e.academic_year=$2`;";

if (!content.includes(oldLine)) {
  console.error('ERROR: old line not found - no changes made. File is unchanged.');
  process.exit(1);
}

content = content.replace(oldLine, newLine);
if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: getExams query fixed.');