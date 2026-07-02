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
      `SELECT id, school_id, email, role, is_active, full_name FROM users WHERE id = $1`,
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
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

module.exports = {
  authenticate, authorize, authorizeLevel,
  requirePermission, sameSchool, parentChildOnly,
  ROLE_LEVELS, ROLE_LABELS,
};
