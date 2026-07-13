const { query } = require('../config/db');
const { v4: uuid } = require('uuid');

async function getClasses(req, res) {
  try {
    const { grade } = req.query;
    const schoolId = req.user.school_id;

    let sql = `
      SELECT c.*,
        t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
        (SELECT COUNT(*) FROM learners l WHERE l.class_id = c.id AND l.status = 'active') AS learner_count
      FROM classes c
      LEFT JOIN teachers t ON t.id = c.class_teacher_id
      WHERE c.school_id = $1
    `;
    const params = [schoolId];

    if (grade) {
      sql += ` AND c.grade = $2`;
      params.push(grade);
    }

    sql += ` ORDER BY c.grade, c.stream`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
}

async function createClass(req, res) {
  try {
    const { grade, stream, section, academicYear, classTeacherId } = req.body;
    const schoolId = req.user.school_id;

    if (!grade || !stream) {
      return res.status(400).json({ error: 'Grade and stream name are required' });
    }

    const resolvedSection = section || (['Grade 7', 'Grade 8', 'Grade 9'].includes(grade) ? 'js' : 'primary');
    const resolvedYear = academicYear || '2025/2026';

    const { rows } = await query(
      `INSERT INTO classes (id, school_id, grade, stream, section, class_teacher_id, academic_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuid(), schoolId, grade, stream, resolvedSection, classTeacherId || null, resolvedYear]
    );

    res.status(201).json({ message: 'Stream created', class: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This stream already exists for that grade and year' });
    }
    res.status(500).json({ error: 'Failed to create stream' });
  }
}

async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { stream, classTeacherId } = req.body;
    const schoolId = req.user.school_id;

    const { rows } = await query(
      `UPDATE classes
       SET stream = COALESCE($1, stream),
           class_teacher_id = $2
       WHERE id = $3 AND school_id = $4
       RETURNING *`,
      [stream || null, classTeacherId || null, id, schoolId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Stream updated', class: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A stream with that name already exists for this grade' });
    }
    res.status(500).json({ error: 'Failed to update stream' });
  }
}

async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const { rows: learners } = await query(
      `SELECT COUNT(*) FROM learners WHERE class_id = $1`,
      [id]
    );

    if (parseInt(learners[0].count, 10) > 0) {
      return res.status(409).json({
        error: 'Cannot delete a stream with learners assigned to it. Move or reassign learners first.'
      });
    }

    const { rows } = await query(
      `DELETE FROM classes WHERE id = $1 AND school_id = $2 RETURNING id`,
      [id, schoolId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Stream deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete stream' });
  }
}

module.exports.getClasses = getClasses;
module.exports.createClass = createClass;
module.exports.updateClass = updateClass;
module.exports.deleteClass = deleteClass;
