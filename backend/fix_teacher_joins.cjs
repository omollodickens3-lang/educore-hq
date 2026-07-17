const fs = require('fs');
const path = './src/controllers/examController.js';
let content = fs.readFileSync(path, 'utf8');

// --- Fix 1: getStreamRanking join (class_teacher) ---
const oldStreamJoin = "LEFT JOIN classes c ON c.school_id = s.school_id AND c.grade = e.grade AND c.stream = l.stream\n      LEFT JOIN users ut ON ut.id = c.class_teacher_id";
const newStreamJoin = "LEFT JOIN classes c ON c.school_id = s.school_id AND c.grade = e.grade AND c.stream = l.stream\n      LEFT JOIN teachers ut ON ut.id = c.class_teacher_id";

const hasStreamJoin = content.includes(oldStreamJoin);
console.log("Found stream join to fix:", hasStreamJoin);
if (hasStreamJoin) {
  content = content.split(oldStreamJoin).join(newStreamJoin);
}

// --- Fix 2: MAX(ut.full_name) -> MAX(ut.first_name || ' ' || ut.last_name) for class_teacher ---
const oldClassTeacherSelect = "MAX(ut.full_name) AS class_teacher";
const newClassTeacherSelect = "MAX(ut.first_name || ' ' || ut.last_name) AS class_teacher";
const hasClassTeacherSelect = content.includes(oldClassTeacherSelect);
console.log("Found class_teacher select to fix:", hasClassTeacherSelect);
if (hasClassTeacherSelect) {
  content = content.split(oldClassTeacherSelect).join(newClassTeacherSelect);
}

// --- Fix 3: getSubjectRankingByStream join (subject_teacher) ---
const oldSubjectJoin = "LEFT JOIN users ut ON ut.id = tsub.teacher_id";
const newSubjectJoin = "LEFT JOIN teachers ut ON ut.id = tsub.teacher_id";
const hasSubjectJoin = content.includes(oldSubjectJoin);
console.log("Found subject join to fix:", hasSubjectJoin);
if (hasSubjectJoin) {
  content = content.split(oldSubjectJoin).join(newSubjectJoin);
}

// --- Fix 4: MAX(ut.full_name) -> ... for subject_teacher ---
const oldSubjectTeacherSelect = "MAX(ut.full_name) AS subject_teacher";
const newSubjectTeacherSelect = "MAX(ut.first_name || ' ' || ut.last_name) AS subject_teacher";
const hasSubjectTeacherSelect = content.includes(oldSubjectTeacherSelect);
console.log("Found subject_teacher select to fix:", hasSubjectTeacherSelect);
if (hasSubjectTeacherSelect) {
  content = content.split(oldSubjectTeacherSelect).join(newSubjectTeacherSelect);
}

if (!hasStreamJoin || !hasClassTeacherSelect || !hasSubjectJoin || !hasSubjectTeacherSelect) {
  console.error("ERROR: one or more anchors not found. Review before proceeding — file may be partially patched.");
  process.exit(1);
}

fs.writeFileSync(path, content, 'utf8');

// self-verify
const verify = fs.readFileSync(path, 'utf8');
console.log("Verify newStreamJoin present:", verify.includes(newStreamJoin));
console.log("Verify newClassTeacherSelect present:", verify.includes(newClassTeacherSelect));
console.log("Verify newSubjectJoin present:", verify.includes(newSubjectJoin));
console.log("Verify newSubjectTeacherSelect present:", verify.includes(newSubjectTeacherSelect));
console.log("SUCCESS: all teacher joins fixed to reference teachers table.");