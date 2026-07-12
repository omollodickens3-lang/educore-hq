const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function getTeachers(req, res) {
  try {
    const { rows } = await query(
      `SELECT t.id, t.user_id, t.first_name, t.last_name, t.tsc_number, t.phone, t.email,
              t.gender, t.qualification, t.role, t.status, t.created_at,
              u.email AS login_email
       FROM teachers t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.school_id = $1
       ORDER BY t.first_name, t.last_name`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getTeachers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
}

async function getTeacherById(req, res) {
  try {
    const { rows } = await query(
      `SELECT t.*, u.email AS login_email
       FROM teachers t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.school_id = $2`,
      [req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });

    const { rows: subjects } = await query(
      `SELECT id, subject, grade, stream FROM teacher_subjects WHERE teacher_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], subjects });
  } catch (err) {
    console.error('getTeacherById error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
}

async function createTeacher(req, res) {
  try {
    const {
      firstName, lastName, tscNumber, phone, email,
      gender, qualification, role, createLogin, password
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First and last name required' });
    }

    const validRoles = ['admin', 'deputy', 'hod', 'class_teacher', 'subject_teacher'];
    const teacherRole = validRoles.includes(role) ? role : 'subject_teacher';

    let userId = null;

    if (createLogin) {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required to create a login' });
      }
      const hash = await bcrypt.hash(password, 12);
      const { rows: userRows } = await query(
        `INSERT INTO users (id, school_id, email, password_hash, role, full_name)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [uuid(), req.user.school_id, email.toLowerCase().trim(), hash,
         teacherRole === 'admin' || teacherRole === 'deputy' ? 'admin' : 'class_teacher',
         `${firstName} ${lastName}`]
      );
      if (!userRows.length) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      userId = userRows[0].id;
    }

    const teacherId = uuid();
    const { rows } = await query(
      `INSERT INTO teachers
        (id, user_id, school_id, first_name, last_name, tsc_number, phone, email, gender, qualification, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [teacherId, userId, req.user.school_id, firstName, lastName,
       tscNumber || null, phone || null, email || null, gender || null,
       qualification || null, teacherRole]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createTeacher error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A teacher with this TSC number or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create teacher' });
  }
}

async function updateTeacher(req, res) {
  try {
    const {
      firstName, lastName, tscNumber, phone, email,
      gender, qualification, role, status
    } = req.body;

    const { rows } = await query(
      `UPDATE teachers SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        tsc_number = COALESCE($3, tsc_number),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        gender = COALESCE($6, gender),
        qualification = COALESCE($7, qualification),
        role = COALESCE($8, role),
        status = COALESCE($9, status),
        updated_at = NOW()
       WHERE id = $10 AND school_id = $11
       RETURNING *`,
      [firstName, lastName, tscNumber, phone, email, gender, qualification, role, status,
       req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateTeacher error:', err.message);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
}

async function deleteTeacher(req, res) {
  try {
    const { rows } = await query(
      `DELETE FROM teachers WHERE id = $1 AND school_id = $2 RETURNING id`,
      [req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    console.error('deleteTeacher error:', err.message);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
}

async function assignSubjects(req, res) {
  try {
    const { subjects } = req.body; // [{ subject, grade, stream }]
    if (!Array.isArray(subjects) || !subjects.length) {
      return res.status(400).json({ error: 'subjects array required' });
    }

    const inserted = [];
    for (const s of subjects) {
      const { rows } = await query(
        `INSERT INTO teacher_subjects (id, teacher_id, subject, grade, stream, school_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (teacher_id, subject, grade, stream) DO NOTHING
         RETURNING *`,
        [uuid(), req.params.id, s.subject, s.grade || null, s.stream || null, req.user.school_id]
      );
      if (rows.length) inserted.push(rows[0]);
    }
    res.status(201).json({ message: 'Subjects assigned', subjects: inserted });
  } catch (err) {
    console.error('assignSubjects error:', err.message);
    res.status(500).json({ error: 'Failed to assign subjects' });
  }
}

async function removeSubject(req, res) {
  try {
    await query(`DELETE FROM teacher_subjects WHERE id = $1`, [req.params.subjectId]);
    res.json({ message: 'Subject assignment removed' });
  } catch (err) {
    console.error('removeSubject error:', err.message);
    res.status(500).json({ error: 'Failed to remove subject assignment' });
  }
}

module.exports = {
  getTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher,
  assignSubjects, removeSubject
};

async function uploadSignature(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No signature file uploaded" });
    const base64 = req.file.buffer.toString("base64");
    await query(
      "UPDATE teachers SET signature_data = $1, signature_mime = $2 WHERE id = $3",
      [base64, req.file.mimetype, id]
    );
    res.json({ message: "Signature uploaded successfully" });
  } catch (err) {
    console.error("uploadSignature error:", err.message);
    res.status(500).json({ error: "Failed to upload signature" });
  }
}

module.exports.uploadSignature = uploadSignature;
