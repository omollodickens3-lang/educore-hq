const { query, getClient } = require('../config/db');
const { v4: uuid } = require('uuid');

const { termToInt, cbcGrade } = require('../utils/examUtils');
const { notify } = require('../services/notificationService');
const { getTeacherId } = require('../middleware/auth');

async function getExams(req, res) {
  try {
    const { grade, term, examType, academicYear = '2025/2026' } = req.query;
    let sql = `SELECT e.* FROM exams e WHERE e.school_id=$1 AND e.academic_year=$2`;
    const params = [req.user.school_id, academicYear];
    let idx = 3;
    if (grade)    { sql += ` AND e.grade=$${idx++}`;      params.push(grade); }
    if (term)     { sql += ` AND e.term=$${idx++}`;       params.push(termToInt(term)); }
    if (examType) { sql += ` AND e.exam_type=$${idx++}`;  params.push(examType); }
    sql += ` ORDER BY e.term, e.exam_type, e.grade`;
    const { rows } = await query(sql, params);
    res.json({ exams: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch exams' }); }
}

async function createExam(req, res) {
  try {
    const { name, examType, term, academicYear = '2025/2026', grade, stream, startDate, endDate, maxScore } = req.body;
    if (!grade || !term || !examType) return res.status(400).json({ error: 'grade, term and examType required' });
    const { rows } = await query(`
      INSERT INTO exams (id, school_id, name, exam_type, term, academic_year, grade, stream, start_date, end_date, created_by, max_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuid(), req.user.school_id, name || `${grade} Term ${term} ${examType}`, examType, term, academicYear, grade, stream||null, startDate||null, endDate||null, req.user.id, maxScore ? Number(maxScore) : 100]
    );
    res.status(201).json({ message: 'Exam created', exam: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create exam' }); }
}

async function updateExam(req, res) {
  try {
    const { examId } = req.params;
    const { name, examType, term, academicYear, grade, stream, startDate, endDate, maxScore } = req.body;
    if (!grade || !term || !examType) return res.status(400).json({ error: 'grade, term and examType required' });

    const check = await query('SELECT id FROM exams WHERE id=$1 AND school_id=$2', [examId, req.user.school_id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Exam not found' });

    const { rows } = await query(`
      UPDATE exams SET
        name=$1, exam_type=$2, term=$3, academic_year=$4, grade=$5, stream=$6,
        start_date=$7, end_date=$8, max_score=$9
      WHERE id=$10 AND school_id=$11
      RETURNING *`,
      [name || `${grade} Term ${term} ${examType}`, examType, term, academicYear || '2025/2026', grade, stream || null,
       startDate || null, endDate || null, maxScore ? Number(maxScore) : 100, examId, req.user.school_id]
    );
    res.json({ message: 'Exam updated', exam: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update exam' }); }
}

async function getScores(req, res) {
  try {
    const { rows: examRows } = await query(
      `SELECT * FROM exams WHERE id=$1 AND school_id=$2`,
      [req.params.examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];

    const { rows } = await query(`
      SELECT
        l.id AS learner_id,
        l.first_name,
        l.last_name,
        l.admission_no,
        l.grade,
        l.stream,
        s.id AS score_id,
        s.exam_id,
        s.subject,
        s.score,
        s.max_score,
        s.grade_label,
        s.remarks,
        s.entered_at,
        s.updated_at
      FROM learners l
      LEFT JOIN scores s ON s.learner_id = l.id AND s.exam_id = $1
      WHERE l.school_id = $2 AND l.grade = $3
      ORDER BY l.last_name, l.first_name`,
      [req.params.examId, req.user.school_id, exam.grade]
    );
    res.json({ scores: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch scores' }); }
}

async function upsertScores(req, res) {
  const client = await getClient();
  try {
    const { scores } = req.body;
    if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });
    await client.query('BEGIN');
    let upserted = 0;

    const { rows: examMaxRows } = await client.query(
      'SELECT max_score FROM exams WHERE id = $1 AND school_id = $2',
      [req.params.examId, req.user.school_id]
    );
    const examMaxScore = examMaxRows[0]?.max_score || 100;
    for (const item of scores) {
      const { learnerId, subject, score, remarks } = item;
      if (score === null || score === undefined) continue;
      const rawScore = Math.max(0, parseFloat(score));
      const pct = Math.min(100, (rawScore / examMaxScore) * 100);
      const { rows: lr } = await client.query(`SELECT section FROM learners WHERE id=$1`, [learnerId]);
      const section = lr[0]?.section || 'primary';
      const gradeLabel = cbcGrade(pct, section);
      await client.query(`
        INSERT INTO scores (id, exam_id, learner_id, school_id, subject, score, max_score, grade_label, remarks, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (exam_id, learner_id, subject) DO UPDATE
      SET score=$6, max_score=$7, grade_label=$8, remarks=$9, entered_by=$10, updated_at=NOW()`,
      [uuid(), req.params.examId, learnerId, req.user.school_id, subject, pct, examMaxScore, gradeLabel, remarks ?? null, req.user.id]
      );
      upserted++;
    }
    await client.query('COMMIT');


    try {
      const { rows: examRows2 } = await query(
        `SELECT name FROM exams WHERE id=$1 AND school_id=$2`,
        [req.params.examId, req.user.school_id]
      );
      const examName = examRows2[0]?.name || 'the exam';
      const uniqueLearnerIds = [...new Set(scores.map(s => s.learnerId))];
      for (const learnerId of uniqueLearnerIds) {
        const { rows: learnerRows } = await query(
          `SELECT first_name, last_name, parent_phone FROM learners WHERE id=$1`,
          [learnerId]
        );
        const l = learnerRows[0];
        if (l && l.parent_phone) {
          await notify({
            schoolId: req.user.school_id,
            learnerId,
            triggerType: 'exam_results',
            recipientPhone: l.parent_phone,
            message: `${l.first_name} ${l.last_name}'s results for ${examName} have been entered. Check the parent portal for details.`,
          });
        }
      }
    } catch (notifyErr) {
      console.error('Exam results notify error:', notifyErr);
    }
    res.json({ message: `${upserted} scores saved`, upserted });
  } catch (err) {
    console.error(err);
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'Failed to save scores' });
    client._hadError = true;
  } finally { client.release(client._hadError === true); }
}

async function getAnalysis(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream } = req.query;
    let sql = `
      SELECT s.subject, ROUND(AVG(s.score),1) AS avg_score, MAX(s.score) AS highest, MIN(s.score) AS lowest, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    if (stream) { sql += ` AND l.stream=$5`; params.push(stream); }
    sql += ` GROUP BY s.subject ORDER BY avg_score DESC`;
    const { rows: subjAvgs } = await query(sql, params);
    res.json({ subjectAverages: subjAvgs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch analysis' }); }
}

async function getTrends(req, res) {
  try {
    const { grade, subject, stream } = req.query;
    if (!grade || !subject) return res.status(400).json({ error: 'grade and subject required' });
    let sql = `
      SELECT e.academic_year, e.term, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND s.subject=$3`;
    const params = [req.user.school_id, grade, subject];
    if (stream) { sql += ` AND l.stream=$4`; params.push(stream); }
    sql += ` GROUP BY e.academic_year, e.term ORDER BY e.academic_year, e.term`;
    const { rows } = await query(sql, params);
    res.json({ trends: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch trends' }); }
}

// Returns the most-recently-created exam round (exam_type+term+year+grade)
// filtered to the logged-in teacher's assigned subjects — so teachers land
// straight on "the current exam" instead of hunting through dropdowns.
// Returns which subjects the logged-in teacher may enter for a specific exam's
// grade — used by MarkEntryTab to build the subject selector. Empty array means
// "no restriction" (admin-tier, or grace mode with no assignments configured).
async function getMySubjectsForExam(req, res) {
  try {
    if (req.user.isSuperAdmin || ['admin', 'director_of_studies', 'deputy', 'hod'].includes(req.user.role)) {
      return res.json({ subjects: [], restricted: false });
    }

    const { rows: examRows } = await query(
      `SELECT grade FROM exams WHERE id=$1 AND school_id=$2`,
      [req.params.examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const grade = examRows[0].grade;

    const { rows: teacherRows } = await query(
      `SELECT id FROM teachers WHERE user_id=$1 AND school_id=$2`,
      [req.user.id, req.user.school_id]
    );
    const teacherId = teacherRows[0]?.id || null;
    if (!teacherId) return res.json({ subjects: [], restricted: false });

    const { rows: assignedRows } = await query(
      `SELECT DISTINCT subject FROM teacher_subjects
       WHERE teacher_id=$1 AND school_id=$2 AND (grade=$3 OR grade IS NULL)`,
      [teacherId, req.user.school_id, grade]
    );

    if (!assignedRows.length) {
      // Grace mode check: has this school configured teacher_subjects at all?
      const { rows: anyAssignments } = await query(
        `SELECT 1 FROM teacher_subjects WHERE school_id=$1 LIMIT 1`,
        [req.user.school_id]
      );
      if (!anyAssignments.length) return res.json({ subjects: [], restricted: false });
      return res.json({ subjects: [], restricted: true }); // configured for others, just not this teacher
    }

    res.json({ subjects: assignedRows.map((r) => r.subject), restricted: true });
  } catch (err) {
    console.error('getMySubjectsForExam error:', err);
    res.status(500).json({ error: 'Failed to fetch your subjects for this exam' });
  }
}

async function getMyActiveExams(req, res) {
  try {
    if (req.user.isSuperAdmin || ['admin', 'director_of_studies', 'deputy', 'hod'].includes(req.user.role)) {
      const { rows } = await query(
        `SELECT * FROM exams WHERE school_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [req.user.school_id]
      );
      if (!rows.length) return res.json({ exam: null, subjects: [] });
      return res.json({ exam: rows[0], subjects: [] }); // admins see all subjects, no restriction needed
    }

    const { rows: teacherRows } = await query(
      `SELECT id FROM teachers WHERE user_id=$1 AND school_id=$2`,
      [req.user.id, req.user.school_id]
    );
    const teacherId = teacherRows[0]?.id || null;
    if (!teacherId) return res.json({ exam: null, subjects: [] });

    const { rows: assignedRows } = await query(
      `SELECT DISTINCT subject, grade FROM teacher_subjects WHERE teacher_id=$1 AND school_id=$2`,
      [teacherId, req.user.school_id]
    );

    let exam;
    if (assignedRows.length) {
      // Find the most recent exam for any grade this teacher is assigned to
      // (grade IS NULL on the assignment means "all grades").
      const grades = [...new Set(assignedRows.map((r) => r.grade).filter(Boolean))];
      const { rows } = await query(
        grades.length
          ? `SELECT * FROM exams WHERE school_id=$1 AND grade = ANY($2::text[]) ORDER BY created_at DESC LIMIT 1`
          : `SELECT * FROM exams WHERE school_id=$1 ORDER BY created_at DESC LIMIT 1`,
        grades.length ? [req.user.school_id, grades] : [req.user.school_id]
      );
      exam = rows[0];
    } else {
      // Grace mode: no subject assignments configured yet — fall back to the
      // school's most recent exam overall so teachers aren't locked out.
      const { rows } = await query(
        `SELECT * FROM exams WHERE school_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [req.user.school_id]
      );
      exam = rows[0];
    }

    if (!exam) return res.json({ exam: null, subjects: [] });

    const mySubjects = assignedRows
      .filter((r) => !r.grade || r.grade === exam.grade)
      .map((r) => r.subject);

    res.json({ exam, subjects: [...new Set(mySubjects)] });
  } catch (err) {
    console.error('getMyActiveExams error:', err);
    res.status(500).json({ error: 'Failed to fetch your active exams' });
  }
}

async function getSchoolOverview(req, res) {
  try {
    const { term, academicYear = '2025/2026', examType } = req.query;
    let sql = `
      SELECT e.grade, l.stream, s.subject, ROUND(AVG(s.score),1) AS avg_score, COUNT(DISTINCT s.learner_id) AS learners_marked
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.academic_year=$2`;
    const params = [req.user.school_id, academicYear];
    let idx = 3;
    if (term)     { sql += ` AND e.term=$${idx++}`;      params.push(parseInt(term)); }
    if (examType) { sql += ` AND e.exam_type=$${idx++}`; params.push(examType); }
    sql += ` GROUP BY e.grade, l.stream, s.subject ORDER BY e.grade, l.stream, avg_score DESC`;
    const { rows } = await query(sql, params);
    res.json({ overview: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch school overview' }); }
}


async function getStreamRanking(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', subject, examType } = req.query;
    if (!grade || !term) return res.status(400).json({ error: 'grade and term required' });
    let sql = `
      SELECT l.stream,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(DISTINCT s.learner_id) AS learners_marked,
        COUNT(*) FILTER (WHERE s.grade_label IN ('EE','EE1','EE2')) AS ee_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('ME','ME1','ME2')) AS me_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('AE','AE1','AE2')) AS ae_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('BE','BE1','BE2')) AS be_count,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank,
        MAX(ut.first_name || ' ' || ut.last_name) AS class_teacher
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      LEFT JOIN classes c ON c.school_id = s.school_id AND c.grade = e.grade AND c.stream = l.stream
      LEFT JOIN teachers ut ON ut.id = c.class_teacher_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    let idx = 5;
    if (subject)  { sql += ` AND s.subject=$${idx++}`;  params.push(subject); }
    if (examType) { sql += ` AND e.exam_type=$${idx++}`; params.push(examType); }
    sql += ` GROUP BY l.stream ORDER BY avg_score DESC`;
    const { rows } = await query(sql, params);
    res.json({ streamRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch stream ranking' }); }
}


async function getLearnerRanking(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream, subject, examType } = req.query;
    if (!grade || !term) return res.status(400).json({ error: 'grade and term required' });
    let sql = `
      SELECT l.id AS learner_id, l.first_name, l.last_name, l.admission_no, l.stream,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(s.id) AS subjects_marked,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear];
    let idx = 5;
    if (stream) { sql += ' AND l.stream=$' + idx; params.push(stream); idx++; }
    if (subject) { sql += ' AND s.subject=$' + idx; params.push(subject); idx++; }
    if (examType) { sql += ' AND e.exam_type=$' + idx; params.push(examType); idx++; }
    sql += ` GROUP BY l.id, l.first_name, l.last_name, l.admission_no, l.stream ORDER BY avg_score DESC`;
    const { rows } = await query(sql, params);
    res.json({ learnerRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch learner ranking' }); }
}


async function getSubjectRankingByStream(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream, examType } = req.query;
    if (!grade || !term || !stream) return res.status(400).json({ error: 'grade, term and stream required' });
    let sql = `
      SELECT s.subject,
        ROUND(AVG(s.score),1) AS avg_score,
        COUNT(DISTINCT s.learner_id) AS learners_marked,
        COUNT(*) FILTER (WHERE s.grade_label IN ('EE','EE1','EE2')) AS ee_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('ME','ME1','ME2')) AS me_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('AE','AE1','AE2')) AS ae_count,
        COUNT(*) FILTER (WHERE s.grade_label IN ('BE','BE1','BE2')) AS be_count,
        RANK() OVER (ORDER BY AVG(s.score) DESC) AS rank,
        MAX(ut.first_name || ' ' || ut.last_name) AS subject_teacher
      FROM scores s
      JOIN exams e ON e.id = s.exam_id
      JOIN learners l ON l.id = s.learner_id
      LEFT JOIN LATERAL (
        SELECT ts.teacher_id,
          CASE
            WHEN ts.stream = l.stream THEN 1
            WHEN ts.stream IS NULL AND ts.grade = e.grade THEN 2
            WHEN ts.stream IS NULL AND ts.grade IS NULL THEN 3
          END AS priority
        FROM teacher_subjects ts
        WHERE ts.school_id = s.school_id AND ts.subject = s.subject
          AND (ts.stream = l.stream OR ts.stream IS NULL)
          AND (ts.grade = e.grade OR ts.grade IS NULL)
        ORDER BY priority ASC
        LIMIT 1
      ) tsub ON true
      LEFT JOIN teachers ut ON ut.id = tsub.teacher_id
      WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5`;
    const params = [req.user.school_id, grade, termToInt(term), academicYear, stream];
    if (examType) { sql += ` AND e.exam_type=$6`; params.push(examType); }
    sql += ` GROUP BY s.subject ORDER BY avg_score DESC`;
    const { rows } = await query(sql, params);
    res.json({ subjectRanking: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch subject ranking' }); }
}


async function getBroadsheet(req, res) {
  try {
    const { grade, term, academicYear = '2025/2026', stream, examType } = req.query;
    if (!grade || !term || !stream) return res.status(400).json({ error: 'grade, term and stream required' });
    if (!examType) return res.status(400).json({ error: 'examType required — a broadsheet must be scoped to one exam type (e.g. end_term) so scores from different exam types are never merged together' });

    const subjectsResult = await query(
      `SELECT DISTINCT s.subject
       FROM scores s
       JOIN exams e ON e.id = s.exam_id
       JOIN learners l ON l.id = s.learner_id
       WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5 AND e.exam_type=$6 AND l.grade=$2
       ORDER BY s.subject`,
      [req.user.school_id, grade, termToInt(term), academicYear, stream, examType]
    );
    const subjects = subjectsResult.rows.map(r => r.subject);

    const rowsResult = await query(
      `SELECT l.id AS learner_id, l.first_name, l.last_name, l.admission_no,
        json_object_agg(s.subject, json_build_object('score', s.score, 'grade_label', s.grade_label)) AS subjects,
        SUM(s.score) AS total,
        ROUND(AVG(s.score),1) AS average,
        RANK() OVER (ORDER BY SUM(s.score) DESC) AS rank
       FROM scores s
       JOIN exams e ON e.id = s.exam_id
       JOIN learners l ON l.id = s.learner_id
       WHERE s.school_id=$1 AND e.grade=$2 AND e.term=$3 AND e.academic_year=$4 AND l.stream=$5 AND e.exam_type=$6 AND l.grade=$2
       GROUP BY l.id, l.first_name, l.last_name, l.admission_no
       ORDER BY total DESC`,
      [req.user.school_id, grade, termToInt(term), academicYear, stream, examType]
    );

    res.json({ subjects, broadsheet: rowsResult.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch broadsheet' }); }
}

async function deleteExam(req, res) {
  try {
    const { examId } = req.params;
    const check = await query(
      'SELECT id FROM exams WHERE id = $1 AND school_id = $2',
      [examId, req.user.school_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Exam not found' });

    await query('DELETE FROM scores WHERE exam_id = $1 AND school_id = $2', [examId, req.user.school_id]);
    await query('DELETE FROM exams WHERE id = $1 AND school_id = $2', [examId, req.user.school_id]);

    res.json({ message: 'Exam and its scores deleted' });
  } catch (err) {
    console.error('deleteExam error:', err.message);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
}

// Teacher submits a subject's marks for admin review. Resubmitting after
// a rejection is allowed (resets status back to 'pending').
async function submitMarks(req, res) {
  try {
    const { examId } = req.params;
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    const { rows: examRows } = await query(
      `SELECT id FROM exams WHERE id=$1 AND school_id=$2`,
      [examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });

    const teacherId = await getTeacherId(req.user.id, req.user.school_id);

    const { rows } = await query(
      `INSERT INTO mark_submissions (school_id, exam_id, subject, status, submitted_by, submitted_at, reviewed_by, reviewed_at, review_note)
       VALUES ($1, $2, $3, 'pending', $4, NOW(), NULL, NULL, NULL)
       ON CONFLICT (exam_id, subject)
       DO UPDATE SET status='pending', submitted_by=$4, submitted_at=NOW(), reviewed_by=NULL, reviewed_at=NULL, review_note=NULL
       RETURNING *`,
      [req.user.school_id, examId, subject, teacherId]
    );
    res.json({ submission: rows[0] });
  } catch (err) {
    console.error('submitMarks error:', err.message);
    res.status(500).json({ error: 'Failed to submit marks' });
  }
}

// Fetch submission status for every subject on an exam (used by both the
// submitting teacher's status banner and the admin review panel).
async function listSubmissions(req, res) {
  try {
    const { examId } = req.params;
    const { rows } = await query(
      `SELECT ms.*, t1.first_name AS submitted_by_first, t1.last_name AS submitted_by_last,
              t2.first_name AS reviewed_by_first, t2.last_name AS reviewed_by_last
       FROM mark_submissions ms
       LEFT JOIN teachers t1 ON t1.id = ms.submitted_by
       LEFT JOIN teachers t2 ON t2.id = ms.reviewed_by
       WHERE ms.exam_id=$1 AND ms.school_id=$2
       ORDER BY ms.submitted_at DESC`,
      [examId, req.user.school_id]
    );
    res.json({ submissions: rows });
  } catch (err) {
    console.error('listSubmissions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

// Admin-tier approves a pending submission. Route-level authorize()
// middleware already restricts who can call this.
async function approveSubmission(req, res) {
  try {
    const { examId } = req.params;
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    const reviewerId = await getTeacherId(req.user.id, req.user.school_id);
    const { rows } = await query(
      `UPDATE mark_submissions
       SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_note=NULL
       WHERE exam_id=$2 AND subject=$3 AND school_id=$4
       RETURNING *`,
      [reviewerId, examId, subject, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    res.json({ submission: rows[0] });
  } catch (err) {
    console.error('approveSubmission error:', err.message);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
}

// Admin-tier rejects a pending submission, re-opening it for editing.
async function rejectSubmission(req, res) {
  try {
    const { examId } = req.params;
    const { subject, note } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    const reviewerId = await getTeacherId(req.user.id, req.user.school_id);
    const { rows } = await query(
      `UPDATE mark_submissions
       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_note=$2
       WHERE exam_id=$3 AND subject=$4 AND school_id=$5
       RETURNING *`,
      [reviewerId, note || null, examId, subject, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    res.json({ submission: rows[0] });
  } catch (err) {
    console.error('rejectSubmission error:', err.message);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
}

module.exports = { getExams, createExam, updateExam, deleteExam, getScores, upsertScores, getAnalysis, getTrends, getSchoolOverview, getStreamRanking, getLearnerRanking, getSubjectRankingByStream, getBroadsheet, getMyActiveExams, getMySubjectsForExam, submitMarks, listSubmissions, approveSubmission, rejectSubmission };


