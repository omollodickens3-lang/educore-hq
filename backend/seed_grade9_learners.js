require("dotenv").config();
const { query, pool } = require("./src/config/db");
const { randomUUID } = require("crypto");

const schoolId = "a0000000-0000-0000-0000-000000000001";

const learners = [
  { admNo: "2025/101", first: "Brian", last: "Otieno", grade: "Grade 9", section: "js", gender: "Male" },
  { admNo: "2025/102", first: "Faith", last: "Wanjiru", grade: "Grade 9", section: "js", gender: "Female" },
  { admNo: "2025/103", first: "Samuel", last: "Kiptoo", grade: "Grade 9", section: "js", gender: "Male" },
];

(async () => {
  let inserted = 0, skipped = 0;
  for (const l of learners) {
    const { rows: existing } = await query(
      "SELECT id FROM learners WHERE school_id=$1 AND admission_no=$2",
      [schoolId, l.admNo]
    );
    if (existing.length > 0) { skipped++; continue; }
    await query(
      "INSERT INTO learners (id, school_id, admission_no, first_name, last_name, grade, section, gender, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')",
      [randomUUID(), schoolId, l.admNo, l.first, l.last, l.grade, l.section, l.gender]
    );
    inserted++;
  }
  console.log(`Inserted ${inserted} new learners, skipped ${skipped} duplicates.`);
  const { rows } = await query("SELECT admission_no, first_name, last_name, grade, section FROM learners WHERE school_id=$1 AND grade='Grade 9'", [schoolId]);
  console.table(rows);
  await pool.end();
})();
