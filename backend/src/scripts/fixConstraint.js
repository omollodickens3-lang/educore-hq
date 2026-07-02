const { query } = require("../config/db");
(async () => {
  await query(`ALTER TABLE exams DROP CONSTRAINT exams_exam_type_check`);
  await query(`ALTER TABLE exams ADD CONSTRAINT exams_exam_type_check
    CHECK (exam_type IN ('opener','midterm','end_term','cat','mock','assignment'))`);
  console.log("Constraint updated.");
  process.exit(0);
})();
