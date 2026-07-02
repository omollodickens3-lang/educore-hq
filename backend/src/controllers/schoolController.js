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
  res.json({ message: 'Approval pending implementation' });
}

async function rejectRegistration(req, res) {
  res.json({ message: 'Rejection pending implementation' });
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