const fs = require('fs');
const path = 'src/App.jsx';
let raw = fs.readFileSync(path, 'utf8');
const usesCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

let patches = 0;

// 1. Add import
const oldImport = "import ManageClassesPage from './pages/ManageClassesPage';";
const newImport = "import ManageClassesPage from './pages/ManageClassesPage';\nimport AnalyticsPage from './pages/AnalyticsPage';";

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  patches++;
  console.log('✔ import added');
} else {
  console.error('✘ import anchor not found');
}

// 2. Add route
const oldRoute = '        <Route path="examinations" element={<ExaminationsPage />} />';
const newRoute = '        <Route path="examinations" element={<ExaminationsPage />} />\n        <Route path="analytics" element={<AnalyticsPage />} />';

if (content.includes(oldRoute)) {
  content = content.replace(oldRoute, newRoute);
  patches++;
  console.log('✔ route added');
} else {
  console.error('✘ route anchor not found');
}

if (patches < 2) {
  console.error('Not all patches applied - review before proceeding.');
}

if (usesCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log(`Done. ${patches}/2 patches applied.`);