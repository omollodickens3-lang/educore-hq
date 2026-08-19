const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { sendPasswordResetEmail } = require('../services/emailService');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await query(
      `SELECT u.id, u.school_id, u.email, u.password_hash, u.role, u.is_active,
              s.name AS school_name, s.status AS school_status,
              t.id AS teacher_id, t.first_name AS teacher_first_name,
              t.last_name AS teacher_last_name, t.tsc_number AS teacher_tsc_number,
              t.role AS teacher_role
       FROM users u
       JOIN schools s ON s.id = u.school_id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ error: 'Invalid email or password' });
    if (rows[0].school_status === 'deactivated') {
      return res.status(403).json({ error: 'This school has been deactivated. Please contact EduCore support.' });
    }
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Fire-and-forget: the client doesn't need to wait for this to complete
    // before logging in, it's just a timestamp for admin visibility.
    query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [rows[0].id])
      .catch((e) => console.error('last_login update failed:', e.message));

    const token = signToken(rows[0].id);
    res.json({
      token,
      user: {
        id: rows[0].id,
        schoolId: rows[0].school_id,
        schoolName: rows[0].school_name,
        email: rows[0].email,
        role: rows[0].role,
        teacher: rows[0].teacher_id ? {
          id: rows[0].teacher_id,
          first_name: rows[0].teacher_first_name,
          last_name: rows[0].teacher_last_name,
          tsc_number: rows[0].teacher_tsc_number,
          role: rows[0].teacher_role,
        } : null,
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const { rows } = await query(
      `SELECT u.id, u.school_id, u.email, u.role, s.name AS school_name,
              t.id AS teacher_id, t.first_name AS teacher_first_name,
              t.last_name AS teacher_last_name, t.tsc_number AS teacher_tsc_number,
              t.role AS teacher_role
       FROM users u
       JOIN schools s ON s.id = u.school_id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const r = rows[0];
    res.json({
      id: r.id, school_id: r.school_id, email: r.email, role: r.role, school_name: r.school_name,
      teacher: r.teacher_id ? {
        id: r.teacher_id, first_name: r.teacher_first_name, last_name: r.teacher_last_name,
        tsc_number: r.teacher_tsc_number, role: r.teacher_role,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
}

module.exports = { login, me, changePassword };

// ── Self-service password reset ──────────────────────────────────────────
// Always responds with the same generic message whether or not the email
// exists, to avoid letting someone probe which emails have EduCore accounts.
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const genericResponse = { message: "If an account exists for that email, we've sent a reset link." };

    const { rows } = await query('SELECT id FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase().trim()]);
    if (!rows.length) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
      [tokenHash, expires, rows[0].id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://educore-hq.vercel.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: email.toLowerCase().trim(), resetUrl });
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
      // Don't leak email-sending failures to the client — still return the
      // generic success message so we don't reveal account existence.
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
      'SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires > NOW()',
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

// ── Self-service account deletion ────────────────────────────────────────
// Non-parent accounts (teachers/admins) are DEACTIVATED rather than hard-
// deleted, since their id is referenced by scores, exams, conduct logs,
// classes, etc. — hard-deleting would either fail (FK constraint) or
// silently break historical records. Deactivating immediately blocks
// login (see authenticate middleware) which is what "delete my account"
// means from the user's side, while preserving the audit trail. Parent
// accounts have no such dependents, so those ARE hard-deleted on request.
async function deleteMyAccount(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Please confirm your password to delete your account' });

    const { rows } = await query('SELECT id, role, password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    if (rows[0].role === 'parent') {
      await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    } else {
      await query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
    }

    res.json({ message: 'Your account has been deleted' });
  } catch (err) {
    console.error('deleteMyAccount error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
}

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;
module.exports.deleteMyAccount = deleteMyAccount;
