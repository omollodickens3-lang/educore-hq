const jwt      = require('jsonwebtoken');
const { query } = require('../config/db');

const ROLE_LEVELS = {
  super_admin:         0,
  admin:               1,
  director_of_studies: 2,
  deputy:              3,
  hod:                 4,
  class_teacher:       5,
  subject_teacher:     6,
  parent:              7,
};

const ROLE_LABELS = {
  super_admin:         'EduCore Super Admin',
  admin:               'Principal',
  director_of_studies: 'Director of Studies',
  deputy:              'Deputy Principal',
  hod:                 'Head of Department',
  class_teacher:       'Class Teacher',
  subject_teacher:     'Subject Teacher',
  parent:              'Parent / Guardian',
};

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      `SELECT u.id, u.school_id, u.email, u.role, u.is_active, u.full_name, s.status AS school_status
       FROM users u LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1`,
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    if (rows[0].role !== 'super_admin' && rows[0].school_status === 'deactivated') {
      return res.status(403).json({ error: 'This school has been deactivated. Please contact EduCore support.' });
    }
    req.user = {
      ...rows[0],
      roleLevel:   ROLE_LEVELS[rows[0].role] ?? 99,
      roleLabel:   ROLE_LABELS[rows[0].role] || rows[0].role,
      isSuperAdmin: rows[0].role === 'super_admin',
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.isSuperAdmin) return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required: ${roles.map(r => ROLE_LABELS[r] || r).join(' or ')}`,
        yourRole: req.user.roleLabel,
      });
    }
    next();
  };
}

function authorizeLevel(maxLevel) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.isSuperAdmin) return next();
    if (req.user.roleLevel <= maxLevel) return next();
    return res.status(403).json({
      error: 'Insufficient access level',
      yourRole: req.user.roleLabel,
    });
  };
}

function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.isSuperAdmin) return next();
    try {
      const { rows } = await query(
        `SELECT check_permission($1, $2) AS allowed`,
        [req.user.role, permission]
      );
      if (rows[0]?.allowed) return next();
      return res.status(403).json({
        error: `Permission denied: ${permission.replace(/_/g, ' ')}`,
        yourRole: req.user.roleLabel,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

function sameSchool(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.isSuperAdmin) return next();
  const requestedSchoolId = req.params.schoolId || req.body.schoolId || req.query.schoolId;
  if (requestedSchoolId && requestedSchoolId !== req.user.school_id) {
    return res.status(403).json({ error: 'Cross-school access denied' });
  }
  next();
}

async function parentChildOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'parent') return next();
  const learnerId = req.params.learnerId || req.params.id;
  if (!learnerId) return next();
  try {
    const { rows } = await query(
      `SELECT id FROM learners WHERE id = $1 AND parent_user_id = $2 AND school_id = $3`,
      [learnerId, req.user.id, req.user.school_id]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Access denied — you can only view your own child' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

// Platform-level check: only the hardcoded EduCore owner account can approve/reject
// new school registrations. This is deliberately simple (not a DB role) since there is
// currently no dedicated super_admin role in the users table CHECK constraint.
const SUPERADMIN_EMAIL = "omollodickens3@gmail.com";

function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if ((req.user.email || "").toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: "EduCore admin access only" });
  }
  next();
}

// ─────────────────────────────────────────────
// TEACHER-SCOPED ACCESS CONTROL
// Restricts subject_teacher / class_teacher accounts to only the
// subjects/classes/learners they're actually assigned to.
// Admin-tier roles (admin, director_of_studies, deputy, hod) and
// super_admin bypass these checks entirely.
// ─────────────────────────────────────────────
const ADMIN_TIER_ROLES = ['admin', 'director_of_studies', 'deputy', 'hod'];

async function getTeacherId(userId, schoolId) {
  const { rows } = await query(
    `SELECT id FROM teachers WHERE user_id=$1 AND school_id=$2`,
    [userId, schoolId]
  );
  return rows[0]?.id || null;
}

// Gate: POST /exams/:examId/scores — only the subject's assigned teacher can enter marks
async function requireExamSubjectAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.isSuperAdmin || ADMIN_TIER_ROLES.includes(req.user.role)) return next();
  try {
    const { rows: examRows } = await query(
      `SELECT subject, grade, stream FROM exams WHERE id=$1 AND school_id=$2`,
      [req.params.examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRows[0];

    const teacherId = await getTeacherId(req.user.id, req.user.school_id);
    if (!teacherId) return res.status(403).json({ error: 'No teacher profile linked to this account' });

    const { rows: matchRows } = await query(
      `SELECT id FROM teacher_subjects
       WHERE teacher_id=$1 AND school_id=$2 AND subject=$3
         AND (grade=$4 OR grade IS NULL)
         AND (stream=$5 OR stream IS NULL OR $5::text IS NULL)`,
      [teacherId, req.user.school_id, exam.subject, exam.grade, exam.stream]
    );
    if (!matchRows.length) {
      // Grace mode: if this school hasn't configured any subject-teacher assignments yet,
      // don't lock every teacher out of marks entry — fall back to unrestricted access
      // until the school actually sets up teacher_subjects.
      const { rows: anyAssignments } = await query(
        `SELECT 1 FROM teacher_subjects WHERE school_id=$1 LIMIT 1`,
        [req.user.school_id]
      );
      if (!anyAssignments.length) {
        console.warn(`[requireExamSubjectAccess] school ${req.user.school_id} has no teacher_subjects configured — allowing unrestricted marks entry`);
        return next();
      }
      return res.status(403).json({ error: `You are not assigned to teach ${exam.subject} for ${exam.grade}` });
    }
    next();
  } catch (err) {
    console.error('requireExamSubjectAccess error:', err);
    res.status(500).json({ error: 'Access check failed' });
  }
}

// Gate: POST /attendance/bulk — only the class teacher of the learners' class can mark attendance
async function requireClassTeacherAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.isSuperAdmin || ADMIN_TIER_ROLES.includes(req.user.role)) return next();
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length) return next();

    const teacherId = await getTeacherId(req.user.id, req.user.school_id);
    if (!teacherId) return res.status(403).json({ error: 'No teacher profile linked to this account' });

    const learnerIds = [...new Set(records.map(r => r.learnerId))];
    const { rows: classRows } = await query(
      `SELECT DISTINCT c.id, c.grade, c.stream, c.class_teacher_id
       FROM learners l
       JOIN classes c ON c.id = l.class_id
       WHERE l.id = ANY($1::uuid[]) AND l.school_id=$2`,
      [learnerIds, req.user.school_id]
    );
    // Only enforce for classes that actually have a class teacher assigned —
    // an unassigned class can't be checked against, so let it through rather than blocking everyone.
    const unauthorized = classRows.filter(c => c.class_teacher_id && c.class_teacher_id !== teacherId);
    if (unauthorized.length) {
      const names = unauthorized.map(c => `${c.grade} ${c.stream}`).join(', ');
      return res.status(403).json({ error: `You are not the class teacher for: ${names}` });
    }
    next();
  } catch (err) {
    console.error('requireClassTeacherAccess error:', err);
    res.status(500).json({ error: 'Access check failed' });
  }
}

// Gate: POST /conduct — class teacher of the learner, or any subject teacher assigned to their grade
async function requireLearnerTeacherAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.isSuperAdmin || ADMIN_TIER_ROLES.includes(req.user.role)) return next();
  try {
    const { learnerId } = req.body;
    if (!learnerId) return next();

    const teacherId = await getTeacherId(req.user.id, req.user.school_id);
    if (!teacherId) return res.status(403).json({ error: 'No teacher profile linked to this account' });

    const { rows: learnerRows } = await query(
      `SELECT l.grade, l.stream, c.class_teacher_id
       FROM learners l LEFT JOIN classes c ON c.id = l.class_id
       WHERE l.id=$1 AND l.school_id=$2`,
      [learnerId, req.user.school_id]
    );
    if (!learnerRows.length) return res.status(404).json({ error: 'Learner not found' });
    const l = learnerRows[0];

    if (l.class_teacher_id === teacherId) return next();

    const { rows: subjRows } = await query(
      `SELECT id FROM teacher_subjects
       WHERE teacher_id=$1 AND school_id=$2
         AND (grade=$3 OR grade IS NULL)
         AND (stream=$4 OR stream IS NULL OR $4::text IS NULL)`,
      [teacherId, req.user.school_id, l.grade, l.stream]
    );
    if (!subjRows.length) {
      // Grace mode: if the school hasn't configured any subject-teacher assignments yet
      // and this learner's class has no class teacher assigned either, don't block staff entirely.
      const { rows: anyAssignments } = await query(
        `SELECT 1 FROM teacher_subjects WHERE school_id=$1 LIMIT 1`,
        [req.user.school_id]
      );
      if (!anyAssignments.length && !l.class_teacher_id) {
        console.warn(`[requireLearnerTeacherAccess] school ${req.user.school_id} has no teacher_subjects configured — allowing unrestricted conduct logging`);
        return next();
      }
      return res.status(403).json({ error: "You are not assigned to this learner's class or subjects" });
    }
    next();
  } catch (err) {
    console.error('requireLearnerTeacherAccess error:', err);
    res.status(500).json({ error: 'Access check failed' });
  }
}

module.exports = {
  authenticate, authorize, authorizeLevel,
  requirePermission, sameSchool, parentChildOnly,
  requireSuperAdmin,
  requireExamSubjectAccess, requireClassTeacherAccess, requireLearnerTeacherAccess,
  ROLE_LEVELS, ROLE_LABELS,
};
