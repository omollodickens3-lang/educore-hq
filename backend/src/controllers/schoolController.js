const { query, getClient } = require('../config/db');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

async function registerSchool(req, res) {
  try {
    const { schoolName, subdomain, county, contactName, contactPhone, contactEmail, password } = req.body;
    if (!schoolName || !subdomain || !contactName || !contactPhone || !contactEmail || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const emailCheck = await query("SELECT 1 FROM users WHERE email = $1", [contactEmail.toLowerCase()]);
    if (emailCheck.rows.length) {
      return res.status(409).json({ error: "This email is already associated with an EduCore account. Please use a different email, such as a school or office email." });
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
    console.error("registerSchool error:", err.message, err.code, err.detail);
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
  const client = await getClient();
  try {
    const { id } = req.params;

    const regRes = await client.query("SELECT * FROM school_registrations WHERE id = $1", [id]);
    if (!regRes.rows.length) return res.status(404).json({ error: "Registration not found" });
    const reg = regRes.rows[0];

    if (reg.status !== "pending") {
      return res.status(409).json({ error: "This registration is already " + reg.status });
    }

    await client.query('BEGIN');

    const schoolRes = await client.query(
      "INSERT INTO schools (id, name, subdomain, county, level) " +
      "VALUES (uuid_generate_v4(), $1, $2, $3, $4) " +
      "RETURNING id, name, subdomain",
      [reg.school_name, reg.subdomain, reg.county, reg.level]
    );
    const school = schoolRes.rows[0];

    // Create the first admin user for this school, reusing the password they set at sign-up.
    const userRes = await client.query(
      "INSERT INTO users (id, school_id, email, password_hash, role, full_name, is_active) " +
      "VALUES (uuid_generate_v4(), $1, $2, $3, 'admin', $4, true) " +
      "RETURNING id, email, role, full_name",
      [school.id, reg.contact_email, reg.password_hash, reg.contact_name]
    );
    const adminUser = userRes.rows[0];

    await client.query(
      "UPDATE school_registrations SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2",
      [req.user.id, id]
    );

    await client.query('COMMIT');

    try {
      await sendApprovalEmail({
        to: reg.contact_email,
        schoolName: school.name,
        contactName: reg.contact_name,
      });
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr.message);
    }

    res.json({
      message: "School approved and activated",
      school,
      admin: adminUser,
    });
  } catch (err) {
    client._hadError = true;
    await client.query('ROLLBACK').catch(() => {});
    console.error("approveRegistration error:", err.message);
    if (err.code === '23505') {
      if (err.constraint === 'users_email_key') {
        return res.status(409).json({ error: "A user with this contact email already exists. Use a different admin email for this school, or resolve the existing account first." });
      }
      if (err.constraint === 'schools_subdomain_key') {
        return res.status(409).json({ error: "A school with this subdomain already exists." });
      }
      return res.status(409).json({ error: "Duplicate record â€” this registration conflicts with existing data." });
    }
    res.status(500).json({ error: "Failed to approve registration" });
  } finally {
    client.release(client._hadError === true);
  }
}

async function rejectRegistration(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const regRes = await query("SELECT * FROM school_registrations WHERE id = $1", [id]);
    if (!regRes.rows.length) return res.status(404).json({ error: "Registration not found" });
    const reg = regRes.rows[0];
    if (reg.status !== "pending") {
      return res.status(409).json({ error: "This registration is already " + reg.status });
    }

    await query(
      "UPDATE school_registrations SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_note = $2 WHERE id = $3",
      [req.user.id, reason || null, id]
    );

    try {
      await sendRejectionEmail({
        to: reg.contact_email,
        schoolName: reg.school_name,
        contactName: reg.contact_name,
        reason: reason || null,
      });
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr.message);
    }

    res.json({ message: "Registration rejected" });
  } catch (err) {
    console.error("rejectRegistration error:", err.message);
    res.status(500).json({ error: "Failed to reject registration" });
  }
}

const PLATFORM_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

async function listSchoolsStatus(req, res) {
  try {
    const result = await query(
      `SELECT id, name, status, created_at FROM schools ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('listSchoolsStatus error:', err.message);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
}

async function getSchoolStatusHistory(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT l.id, l.action, l.reason, l.created_at, u.full_name AS performed_by_name
       FROM school_status_log l
       JOIN users u ON u.id = l.performed_by
       WHERE l.school_id = $1
       ORDER BY l.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getSchoolStatusHistory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch school history' });
  }
}

async function deactivateSchool(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (id === PLATFORM_SCHOOL_ID) {
      return res.status(400).json({ error: 'The platform school cannot be deactivated.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason is required to deactivate a school.' });
    }

    const check = await query('SELECT status FROM schools WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'School not found' });
    if (check.rows[0].status === 'deactivated') {
      return res.status(400).json({ error: 'School is already deactivated' });
    }

    await query('UPDATE schools SET status = $1 WHERE id = $2', ['deactivated', id]);
    await query(
      `INSERT INTO school_status_log (school_id, action, reason, performed_by) VALUES ($1, 'deactivate', $2, $3)`,
      [id, reason.trim(), req.user.id]
    );

    res.json({ message: 'School deactivated', schoolId: id });
  } catch (err) {
    console.error('deactivateSchool error:', err.message);
    res.status(500).json({ error: 'Failed to deactivate school' });
  }
}

async function reactivateSchool(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason is required to reactivate a school.' });
    }

    const check = await query('SELECT status FROM schools WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'School not found' });
    if (check.rows[0].status === 'active') {
      return res.status(400).json({ error: 'School is already active' });
    }

    await query('UPDATE schools SET status = $1 WHERE id = $2', ['active', id]);
    await query(
      `INSERT INTO school_status_log (school_id, action, reason, performed_by) VALUES ($1, 'reactivate', $2, $3)`,
      [id, reason.trim(), req.user.id]
    );

    res.json({ message: 'School reactivated', schoolId: id });
  } catch (err) {
    console.error('reactivateSchool error:', err.message);
    res.status(500).json({ error: 'Failed to reactivate school' });
  }
}

async function getPlatformAnalytics(req, res) {
  res.json({ schools: [] });
}


async function uploadStamp(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No stamp image uploaded' });
    const schoolId = req.user.school_id;
    const base64 = req.file.buffer.toString('base64');
    await query(
      'UPDATE schools SET stamp_data = $1, stamp_mime = $2 WHERE id = $3',
      [base64, req.file.mimetype, schoolId]
    );
    res.json({ message: 'School stamp uploaded successfully' });
  } catch (err) {
    console.error('uploadStamp error:', err.message);
    res.status(500).json({ error: 'Failed to upload school stamp' });
  }
}

// ---- Term dates ----
// Lets a school record when each term opens/closes (plus optional opener/midterm/
// end-term sub-windows), so reports can tell parents exactly when next term begins.

async function getTermDates(req, res) {
  try {
    const schoolId = req.user.school_id;
    const { academicYear, term } = req.query;

    let sql = 'SELECT * FROM term_dates WHERE school_id = $1';
    const params = [schoolId];
    if (academicYear) {
      params.push(academicYear);
      sql += ` AND academic_year = $${params.length}`;
    }
    if (term) {
      params.push(term);
      sql += ` AND term = $${params.length}`;
    }
    sql += ' ORDER BY academic_year DESC, term ASC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('getTermDates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch term dates' });
  }
}

async function upsertTermDates(req, res) {
  try {
    const schoolId = req.user.school_id;
    const {
      academicYear, term, openDate, closeDate,
      openerStart, openerEnd, midtermStart, midtermEnd, endTermStart, endTermEnd,
    } = req.body;

    if (!academicYear || !term) {
      return res.status(400).json({ error: 'academicYear and term are required' });
    }

    const existing = await query(
      'SELECT id FROM term_dates WHERE school_id = $1 AND academic_year = $2 AND term = $3',
      [schoolId, academicYear, term]
    );

    let row;
    if (existing.rows.length) {
      const result = await query(
        `UPDATE term_dates SET
          open_date = COALESCE($1, open_date),
          close_date = COALESCE($2, close_date),
          opener_start = COALESCE($3, opener_start),
          opener_end = COALESCE($4, opener_end),
          midterm_start = COALESCE($5, midterm_start),
          midterm_end = COALESCE($6, midterm_end),
          end_term_start = COALESCE($7, end_term_start),
          end_term_end = COALESCE($8, end_term_end)
         WHERE id = $9
         RETURNING *`,
        [
          openDate || null, closeDate || null, openerStart || null, openerEnd || null,
          midtermStart || null, midtermEnd || null, endTermStart || null, endTermEnd || null,
          existing.rows[0].id,
        ]
      );
      row = result.rows[0];
    } else {
      const result = await query(
        `INSERT INTO term_dates
          (id, school_id, academic_year, term, open_date, close_date,
           opener_start, opener_end, midterm_start, midterm_end, end_term_start, end_term_end)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          uuid(), schoolId, academicYear, term, openDate || null, closeDate || null,
          openerStart || null, openerEnd || null, midtermStart || null, midtermEnd || null,
          endTermStart || null, endTermEnd || null,
        ]
      );
      row = result.rows[0];
    }

    res.json({ message: 'Term dates saved', termDates: row });
  } catch (err) {
    console.error('upsertTermDates error:', err.message);
    res.status(500).json({ error: 'Failed to save term dates' });
  }
}

module.exports = {
  registerSchool,
  checkSubdomain,
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  getPlatformAnalytics,
  listSchoolsStatus,
  getSchoolStatusHistory,
  deactivateSchool,  reactivateSchool,
  uploadStamp,
  getTermDates,
  upsertTermDates,
};
