const { query } = require('../config/db');

async function getNotifications(req, res) {
  try {
    const schoolId = req.user.school_id;
    const { status, triggerType, search, limit = 50 } = req.query;

    let sql = `
      SELECT n.id, n.trigger_type, n.channel, n.recipient_phone, n.message, n.status, n.sent_at, n.error,
             l.first_name, l.last_name, l.admission_no, l.grade, l.stream
      FROM learner_notifications n
      JOIN learners l ON l.id = n.learner_id
      WHERE n.school_id = $1
    `;
    const params = [schoolId];
    let idx = 2;

    if (status) {
      sql += ` AND n.status = $${idx++}`;
      params.push(status);
    }
    if (triggerType) {
      sql += ` AND n.trigger_type = $${idx++}`;
      params.push(triggerType);
    }
    if (search) {
      sql += ` AND (l.first_name ILIKE $${idx} OR l.last_name ILIKE $${idx} OR l.admission_no ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY n.sent_at DESC NULLS LAST LIMIT $${idx}`;
    params.push(Number(limit) || 50);

    const { rows } = await query(sql, params);
    res.json({ count: rows.length, notifications: rows });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function getNotificationStats(req, res) {
  try {
    const schoolId = req.user.school_id;
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sent') AS sent,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE trigger_type = 'chronic_absenteeism') AS absenteeism_alerts
       FROM learner_notifications WHERE school_id = $1`,
      [schoolId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('getNotificationStats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
}

module.exports = { getNotifications, getNotificationStats };