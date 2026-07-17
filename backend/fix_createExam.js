const fs = require('fs');
const path = 'src/controllers/examController.js';
let raw = fs.readFileSync(path, 'utf8');

// Normalize to LF for matching/replacing, remember if file used CRLF
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const oldBlock = `    const { name, examType, term, academicYear = '2025/2026', grade, stream, startDate, endDate } = req.body;
    if (!grade || !term || !examType) return res.status(400).json({ error: 'grade, term and examType required' });
    const { rows } = await query(\`
      INSERT INTO exams (id, school_id, name, exam_type, term, academic_year, grade, stream, start_date, end_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *\`,
      [uuid(), req.user.school_id, name || \`\${grade} Term \${term} \${examType}\`, examType, term, academicYear, grade, stream||null, startDate||null, endDate||null, req.user.id]`;

const newBlock = `    const { name, examType, term, academicYear = '2025/2026', grade, stream, startDate, endDate, subject } = req.body;
    if (!grade || !term || !examType || !subject) return res.status(400).json({ error: 'grade, term, examType and subject required' });
    const { rows } = await query(\`
      INSERT INTO exams (id, school_id, name, exam_type, term, academic_year, grade, stream, start_date, end_date, created_by, subject)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *\`,
      [uuid(), req.user.school_id, name || \`\${grade} Term \${term} \${examType}\`, examType, term, academicYear, grade, stream||null, startDate||null, endDate||null, req.user.id, subject]`;

if (!content.includes(oldBlock)) {
  console.error('ERROR: old block not found - no changes made. File is unchanged.');
  console.error('DEBUG: file uses CRLF? ' + usesCRLF);
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);

// Restore original line ending style
if (usesCRLF) content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: createExam patched.');