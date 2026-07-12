const { query } = require("../config/db");
const { v4: uuid } = require("uuid");

// Create a new assignment
async function createAssignment(req, res) {
  try {
    const { subject, grade, stream, title, description, dueDate } = req.body;
    if (!subject || !grade || !title || !dueDate) {
      return res.status(400).json({ error: "subject, grade, title, and dueDate are required" });
    }

    const assignmentId = uuid();
    await query(
      `INSERT INTO assignments (id, school_id, teacher_id, subject, grade, stream, title, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [assignmentId, req.user.school_id, req.user.id, subject, grade, stream || null, title, description || null, dueDate]
    );

    const { rows: learners } = await query(
      `SELECT id FROM learners WHERE school_id=$1 AND grade=$2 AND ($3::text IS NULL OR stream=$3)`,
      [req.user.school_id, grade, stream || null]
    );

    for (const l of learners) {
      await query(
        `INSERT INTO assignment_submissions (id, assignment_id, learner_id, status)
         VALUES ($1,$2,$3,'pending')`,
        [uuid(), assignmentId, l.id]
      );
    }

    res.json({ message: "Assignment created", assignmentId, learnersAssigned: learners.length });
  } catch (err) {
    console.error("createAssignment error:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
}

async function getAssignments(req, res) {
  try {
    const { grade, subject } = req.query;
    const { rows } = await query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS total_learners,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status != 'pending') AS total_responded
       FROM assignments a
       WHERE a.school_id = $1
         AND ($2::text IS NULL OR a.grade = $2)
         AND ($3::text IS NULL OR a.subject = $3)
       ORDER BY a.due_date DESC`,
      [req.user.school_id, grade || null, subject || null]
    );
    res.json({ assignments: rows });
  } catch (err) {
    console.error("getAssignments error:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
}

async function getAssignmentDetail(req, res) {
  try {
    const { id } = req.params;
    const { rows: assignmentRows } = await query(`SELECT * FROM assignments WHERE id=$1`, [id]);
    if (assignmentRows.length === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const { rows: roster } = await query(
      `SELECT s.id AS submission_id, s.status, s.grade, s.feedback, s.submitted_at, s.graded_at,
              l.id AS learner_id, l.first_name, l.last_name, l.admission_no
       FROM assignment_submissions s
       JOIN learners l ON l.id = s.learner_id
       WHERE s.assignment_id = $1
       ORDER BY l.first_name`,
      [id]
    );

    res.json({ assignment: assignmentRows[0], roster });
  } catch (err) {
    console.error("getAssignmentDetail error:", err);
    res.status(500).json({ error: "Failed to fetch assignment detail" });
  }
}

async function updateSubmission(req, res) {
  try {
    const { submissionId } = req.params;
    const { status, grade, feedback } = req.body;
    if (!["pending", "submitted", "graded"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await query(
      `UPDATE assignment_submissions
       SET status=$1, grade=$2, feedback=$3,
           submitted_at = COALESCE(submitted_at, CASE WHEN $1 IN ('submitted','graded') THEN now() ELSE NULL END),
           graded_at = CASE WHEN $1 = 'graded' THEN now() ELSE graded_at END
       WHERE id=$4`,
      [status, grade || null, feedback || null, submissionId]
    );

    res.json({ message: "Submission updated" });
  } catch (err) {
    console.error("updateSubmission error:", err);
    res.status(500).json({ error: "Failed to update submission" });
  }
}

module.exports = { createAssignment, getAssignments, getAssignmentDetail, updateSubmission };
