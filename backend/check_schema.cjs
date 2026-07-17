const { query } = require('./src/config/db');

(async () => {
  const teacherSubjects = await query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teacher_subjects'"
  );
  console.log('--- teacher_subjects ---');
  console.log(teacherSubjects.rows);

  const classesTeacher = await query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'classes' AND column_name LIKE '%teacher%'"
  );
  console.log('--- classes (teacher cols) ---');
  console.log(classesTeacher.rows);

  process.exit();
})();