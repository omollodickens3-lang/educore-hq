const { query } = require("../config/db");
const { v4: uuid } = require("uuid");

async function getClasses(req, res) {
  try {
    const { rows } = await query(
      `SELECT c.id, c.grade, c.stream, c.section, c.academic_year, c.class_teacher_id,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM classes c
       LEFT JOIN teachers t ON t.id = c.class_teacher_id
       WHERE c.school_id = $1
       ORDER BY c.grade, c.stream`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get classes error:", err.message);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
}

async function createClass(req, res) {
  try {
    const { grade, stream, section, academicYear, classTeacherId } = req.body;
    if (!grade || !stream) {
      return res.status(400).json({ error: "Grade and stream are required" });
    }

    const { rows: existing } = await query(
      `SELECT id FROM classes WHERE school_id=$1 AND grade=$2 AND stream=$3`,
      [req.user.school_id, grade, stream]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: `${grade} Stream ${stream} already exists` });
    }

    const id = uuid();
    await query(
      `INSERT INTO classes (id, school_id, grade, stream, section, class_teacher_id, academic_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user.school_id, grade, stream, section || null, classTeacherId || null, academicYear || null]
    );

    res.status(201).json({ id, grade, stream, section, academicYear, classTeacherId });
  } catch (err) {
    console.error("Create class error:", err.message);
    res.status(500).json({ error: "Failed to create class" });
  }
}

async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    const { rowCount } = await query(
      `DELETE FROM classes WHERE id=$1 AND school_id=$2`,
      [id, req.user.school_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Class not found" });
    }
    res.json({ message: "Class deleted" });
  } catch (err) {
    console.error("Delete class error:", err.message);
    res.status(500).json({ error: "Failed to delete class" });
  }
}

module.exports = { getClasses, createClass, deleteClass };