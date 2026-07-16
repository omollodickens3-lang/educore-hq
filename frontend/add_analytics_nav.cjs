const fs = require('fs');
const path = 'src/components/layout/AppLayout.jsx';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const oldLine = "{ to: '/examinations',icon: '📝', label: 'Examinations' },";
const newLine = "{ to: '/examinations',icon: '📝', label: 'Examinations' },\n  { to: '/analytics', icon: '📊', label: 'Analytics' },";

if (!content.includes(oldLine)) {
  console.error('ERROR: anchor line not found - no changes made. Check exact spacing.');
  process.exit(1);
}

content = content.replace(oldLine, newLine);
if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Analytics sidebar link added.');