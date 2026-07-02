require("dotenv").config();
const { query, pool } = require("./src/config/db");
const { randomUUID } = require("crypto");

const schoolId = "a0000000-0000-0000-0000-000000000001";

// KICD rationalized (2024 reform) learning areas
const curriculum = {
  // Lower Primary
  "Grade 1": ["Indigenous Language Activities","Kiswahili Language Activities","English Language Activities","Mathematical Activities","Religious Education Activities","Environmental Activities","Creative Activities"],
  "Grade 2": ["Indigenous Language Activities","Kiswahili Language Activities","English Language Activities","Mathematical Activities","Religious Education Activities","Environmental Activities","Creative Activities"],
  "Grade 3": ["Indigenous Language Activities","Kiswahili Language Activities","English Language Activities","Mathematical Activities","Religious Education Activities","Environmental Activities","Creative Activities"],
  // Upper Primary
  "Grade 4": ["English","Kiswahili","Mathematics","Religious Education","Agriculture and Nutrition","Social Studies","Creative Arts","Science and Technology"],
  "Grade 5": ["English","Kiswahili","Mathematics","Religious Education","Agriculture and Nutrition","Social Studies","Creative Arts","Science and Technology"],
  "Grade 6": ["English","Kiswahili","Mathematics","Religious Education","Agriculture and Nutrition","Social Studies","Creative Arts","Science and Technology"],
  // Junior School (rationalized)
  "Grade 7": ["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Agriculture and Nutrition","Creative Arts and Sports","Religious Education"],
  "Grade 8": ["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Agriculture and Nutrition","Creative Arts and Sports","Religious Education"],
  "Grade 9": ["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Agriculture and Nutrition","Creative Arts and Sports","Religious Education"],
};

(async () => {
  let inserted = 0, skipped = 0;
  for (const [grade, subjects] of Object.entries(curriculum)) {
    for (const name of subjects) {
      const { rows: existing } = await query(
        "SELECT id FROM subjects WHERE school_id=$1 AND grade=$2 AND name=$3",
        [schoolId, grade, name]
      );
      if (existing.length > 0) { skipped++; continue; }
      await query(
        "INSERT INTO subjects (id, school_id, name, grade) VALUES ($1,$2,$3,$4)",
        [randomUUID(), schoolId, name, grade]
      );
      inserted++;
    }
  }
  console.log(`Inserted ${inserted} new subjects, skipped ${skipped} duplicates.`);
  const { rows } = await query("SELECT grade, name FROM subjects WHERE school_id=$1 ORDER BY grade, name", [schoolId]);
  console.table(rows);
  await pool.end();
})();
