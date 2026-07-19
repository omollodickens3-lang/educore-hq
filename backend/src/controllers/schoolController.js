const { query } = require('../config/db');
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

async function registerSchool(req, res) {
  try {
    const { schoolName, subdomain, county, contactName, contactPhone, contactEmail, password } = req.body;
    if (!schoolName || !subdomain || !contactName || !contactPhone || !contactEmail || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(`
      INSERT INTO school_registrations
        (id, school_name, subdomain, county, contact_name, contact_phone, contact_email, password_hash, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id, school_name, subdomain, status`,
      [uuid(), schoolName, subdomain.toLowerCase(), county||null, contactName, contactPhone, contactEmail.toLowerCase(), passwordHash]
    );
    res.status(201).json({ message: 'Registration submitted!', registration: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Subdomain already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function checkSubdomain(req, res) {
  try {
    const { subdomain } = req.query;
    if (!subdomain) return res.status(400).json({ error: 'subdomain required' });
    const { rows } = await query(`
      SELECT 1 FROM schools WHERE subdomain=$1
      UNION SELECT 1 FROM school_registrations WHERE subdomain=$1`,
      [subdomain.toLowerCase()]
    );
    res.json({ subdomain: subdomain.toLowerCase(), available: rows.length === 0 });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
}

async function listRegistrations(req, res) {
  try {
    const { rows } = await query(`SELECT * FROM school_registrations WHERE status='pending' ORDER BY created_at DESC`);
    res.json({ registrations: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
}

async function approveRegistration(req, res) {
  try {
    const { id } = req.params;

    const regRes = await query("SELECT * FROM school_registrations WHERE id = $1", [id]);
    if (!regRes.rows.length) return res.status(404).json({ error: "Registration not found" });
    const reg = regRes.rows[0];

    if (reg.status !== "pending") {
      return res.status(409).json({ error: "This registration is already " + reg.status });
    }

    // Create the live school record from the pending registration.
    const schoolRes = await query(
      "INSERT INTO schools (id, name, subdomain, county, level) " +
      "VALUES (uuid_generate_v4(), $1, $2, $3, $4) " +
      "RETURNING id, name, subdomain",
      [reg.school_name, reg.subdomain, reg.county, reg.level]
    );
    const school = schoolRes.rows[0];

    // Create the first admin user for this school, reusing the password they set at sign-up.
    const userRes = await query(
      "INSERT INTO users (id, school_id, email, password_hash, role, full_name, is_active) " +
      "VALUES (uuid_generate_v4(), $1, $2, $3, 'admin', $4, true) " +
      "RETURNING id, email, role, full_name",
      [school.id, reg.contact_email, reg.password_hash, reg.contact_name]
    );
    const adminUser = userRes.rows[0];

    await query(
      "UPDATE school_registrations SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2",
      [req.user.id, id]
    );

    res.json({
      message: "School approved and activated",
      school,
      admin: adminUser,
    });
  } catch (err) {
    console.error("approveRegistration error:", err.message);
    res.status(500).json({ error: "Failed to approve registration" });
  }
}

async function rejectRegistration(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const regRes = await query("SELECT status FROM school_registrations WHERE id = $1", [id]);
    if (!regRes.rows.length) return res.status(404).json({ error: "Registration not found" });
    if (regRes.rows[0].status !== "pending") {
      return res.status(409).json({ error: "This registration is already " + regRes.rows[0].status });
    }

    await query(
      "UPDATE school_registrations SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_note = $2 WHERE id = $3",
      [req.user.id, reason || null, id]
    );

    res.json({ message: "Registration rejected" });
  } catch (err) {
    console.error("rejectRegistration error:", err.message);
    res.status(500).json({ error: "Failed to reject registration" });
  }
}

async function getPlatformAnalytics(req, res) {
  res.json({ schools: [] });
}

module.exports = {
  registerSchool,
  checkSubdomain,
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  getPlatformAnalytics
};