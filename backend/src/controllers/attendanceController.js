const { query, getClient } = require('../config/db');
const { v4: uuid } = require('uuid');

async function getAttendance(req, res) {
  try {
    const { grade, stream, date, month, year } = req.query;
    const schoolId = req.user.school_id;
    let sql = `SELECT a.*, l.first_name, l.last_name, l.admission_no, l.grade, l.stream
               FROM attendance a JOIN learners l ON l.id = a.learner_id
               WHERE a.school_id=$1`;
    const params = [schoolId];
    let idx = 2;
    if (grade)  { sql += ` AND l.grade=$${idx++}`;  params.push(grade); }
    if (stream) { sql += ` AND l.stream=$${idx++}`; params.push(stream); }
    if (date)   { sql += ` AND a.date=$${idx++}`;   params.push(date); }
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM a.date)=$${idx++} AND EXTRACT(YEAR FROM a.date)=$${idx++}`;
      params.push(parseInt(month), parseInt(year));
    }
    sql += ` ORDER BY l.last_name, a.date, a.session`;
    const { rows } = await query(sql, params);
    res.json({ count: rows.length, records: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch attendance' }); }
}

async function markBulk(req, res) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { records, date, session = 'AM' } = req.body;
    if (!Array.isArray(records) || !date) return res.status(400).json({ error: 'records array and date required' });
    let marked = 0;
    for (const r of records) {
      await client.query(`
        INSERT INTO attendance (id, school_id, learner_id, class_id, date, session, status, marked_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (learner_id, date, session) DO UPDATE SET status=$7, marked_by=$8`,
        [uuid(), req.user.school_id, r.learnerId, r.classId||null, date, session, r.status||'P', req.user.id]
      );
      marked++;
    }
    await client.query('COMMIT');

    const { notify } = require('../services/notificationService');
    for (const r of records) {
      if (r.status === 'A') {
        try {
          const { rows: statRows } = await query(
            `SELECT COUNT(*) FILTER (WHERE status='P') AS present, COUNT(*) FILTER (WHERE status='L') AS late, COUNT(*) AS total FROM attendance WHERE learner_id=$1 AND school_id=$2`,
            [r.learnerId, req.user.school_id]
          );
          const s = statRows[0];
          const total = parseInt(s.total) || 1;
          const rate = Math.round(((parseInt(s.present) + parseInt(s.late)) / total) * 100);
          if (rate < 75) {
            const { rows: learnerRows } = await query(`SELECT first_name, last_name, parent_phone FROM learners WHERE id=$1`, [r.learnerId]);
            const l = learnerRows[0];
            if (l && l.parent_phone) {
              await notify({
                schoolId: req.user.school_id,
                learnerId: r.learnerId,
                triggerType: 'chronic_absenteeism',
                recipientPhone: l.parent_phone,
                message: `Attendance alert: ${l.first_name} ${l.last_name}'s attendance rate is ${rate}%, below the 75% threshold.`,
              });
            }
          }
        } catch (notifyErr) {
          console.error('Absenteeism notify error:', notifyErr);
        }
      }
    }
    res.json({ message: `${marked} records saved`, marked });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to mark attendance' });
  } finally { client.release(); }
}

async function getLearnerStats(req, res) {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='P') AS present,
        COUNT(*) FILTER (WHERE status='A') AS absent,
        COUNT(*) FILTER (WHERE status='L') AS late,
        COUNT(*) FILTER (WHERE status='E') AS excused,
        COUNT(*) AS total_marked
      FROM attendance WHERE learner_id=$1 AND school_id=$2 AND session='AM'`,
      [req.params.learnerId, req.user.school_id]
    );
    const stats = rows[0];
    const total = parseInt(stats.total_marked) || 1;
    const present = parseInt(stats.present) + parseInt(stats.late);
    stats.rate = Math.round(present / total * 100);
    stats.chronicAbsentee = stats.rate < 75;
    res.json(stats);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
}

async function getAlerts(req, res) {
  try {
    const schoolId = req.user.school_id;
    const today = new Date().toISOString().split('T')[0];
    const { rows: absentToday } = await query(`
      SELECT l.id, l.first_name, l.last_name, l.grade, l.stream, l.parent_name, l.parent_phone
      FROM attendance a JOIN learners l ON l.id = a.learner_id
      WHERE a.school_id=$1 AND a.date=$2 AND a.status='A' AND a.session='AM'`,
      [schoolId, today]
    );
    res.json({ absentToday, chronic: [] });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch alerts' }); }
}

module.exports = { getAttendance, markBulk, getLearnerStats, getAlerts };