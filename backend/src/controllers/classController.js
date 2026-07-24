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

async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { grade, stream, section, classTeacherId, academicYear } = req.body;
    const { rowCount, rows } = await query(
      `UPDATE classes SET grade=$1, stream=$2, section=$3, class_teacher_id=$4, academic_year=$5
       WHERE id=$6 AND school_id=$7
       RETURNING id, grade, stream, section, class_teacher_id, academic_year`,
      [grade, stream, section || null, classTeacherId || null, academicYear || null, id, req.user.school_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Class not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Update class error:", err.message);
    res.status(500).json({ error: "Failed to update class" });
  }
}

async function getMyClass(req, res) {
  try {
    const { rows: teacherRows } = await query(
      `SELECT id FROM teachers WHERE user_id=$1 AND school_id=$2`,
      [req.user.id, req.user.school_id]
    );
    const teacherId = teacherRows[0]?.id || null;
    if (!teacherId) return res.json({ classes: [] });

    const { rows } = await query(
      `SELECT id, grade, stream, section, academic_year
       FROM classes
       WHERE school_id=$1 AND class_teacher_id=$2
       ORDER BY academic_year DESC, grade, stream`,
      [req.user.school_id, teacherId]
    );
    res.json({ classes: rows });
  } catch (err) {
    console.error("Get my class error:", err.message);
    res.status(500).json({ error: "Failed to fetch your class" });
  }
}

module.exports = { getClasses, createClass, updateClass, deleteClass, getMyClass };