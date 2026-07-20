const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await query(
      `SELECT u.id, u.school_id, u.email, u.password_hash, u.role, u.is_active,
              s.name AS school_name
       FROM users u JOIN schools s ON s.id = u.school_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    console.log('DEBUG login attempt - email received:', JSON.stringify(email));

    console.log('DEBUG rows found:', rows.length);

    if (rows.length) {

      console.log('DEBUG row email:', JSON.stringify(rows[0].email));

      console.log('DEBUG is_active:', rows[0].is_active);

      console.log('DEBUG password_hash from DB:', JSON.stringify(rows[0].password_hash));
      console.log('DEBUG password_hash length:', rows[0].password_hash.length);
      console.log('DEBUG password_hash char codes:', Array.from(rows[0].password_hash).map(c => c.charCodeAt(0)).join(','));

    }

    if (!rows.length || !rows[0].is_active) return res.status(401).json({ error: 'Invalid email or password' });
    console.log('DEBUG password received:', JSON.stringify(password));
    console.log('DEBUG password length:', password.length);
    console.log('DEBUG password char codes:', Array.from(password).map(c => c.charCodeAt(0)).join(','));
    const match = await bcrypt.compare(password, rows[0].password_hash);
    console.log('DEBUG bcrypt match result:', match);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [rows[0].id]);
    const { rows: tp } = await query(
      `SELECT id, first_name, last_name, tsc_number, role FROM teachers WHERE user_id = $1`,
      [rows[0].id]
    );
    const token = signToken(rows[0].id);
    res.json({
      token,
      user: {
        id: rows[0].id,
        schoolId: rows[0].school_id,
        schoolName: rows[0].school_name,
        email: rows[0].email,
        role: rows[0].role,
        teacher: tp[0] || null,
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
      `SELECT u.id, u.school_id, u.email, u.role, s.name AS school_name
       FROM users u JOIN schools s ON s.id = u.school_id WHERE u.id = $1`,
      [req.user.id]
    );
    const { rows: teacher } = await query(
      `SELECT id, first_name, last_name, tsc_number, role FROM teachers WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ ...rows[0], teacher: teacher[0] || null });
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
