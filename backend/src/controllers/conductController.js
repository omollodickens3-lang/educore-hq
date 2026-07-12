const { query } = require("../config/db");
const { v4: uuid } = require("uuid");
const { notify } = require("../services/notificationService");

const CATEGORIES = ["Punctuality", "Respect", "Teamwork", "Responsibility", "Honesty", "Effort", "Other"];

async function createConductLog(req, res) {
  try {
    const { learnerId, type, category, description } = req.body;
    if (!learnerId || !type || !description) {
      return res.status(400).json({ error: "learnerId, type, and description are required" });
    }
    if (!["positive", "concern"].includes(type)) {
      return res.status(400).json({ error: "type must be 'positive' or 'concern'" });
    }

    const { rows: learnerRows } = await query(
      `SELECT id, first_name, last_name, parent_phone FROM learners WHERE id=$1 AND school_id=$2`,
      [learnerId, req.user.school_id]
    );
    if (learnerRows.length === 0) {
      return res.status(404).json({ error: "Learner not found" });
    }
    const learner = learnerRows[0];

    const logId = uuid();
    await query(
      `INSERT INTO conduct_logs (id, school_id, learner_id, logged_by, type, category, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [logId, req.user.school_id, learnerId, req.user.id, type, category || null, description]
    );

    let notification = null;
    if (learner.parent_phone) {
      const tone = type === "positive" ? "Good news" : "A note";
      const message = `${tone} about ${learner.first_name} ${learner.last_name}: ${category ? category + " - " : ""}${description}`;
      notification = await notify({
        schoolId: req.user.school_id,
        learnerId: learner.id,
        triggerType: "conduct_log",
        recipientPhone: learner.parent_phone,
        message,
      });
    }

    res.json({ message: "Conduct logged", logId, notification });
  } catch (err) {
    console.error("createConductLog error:", err);
    res.status(500).json({ error: "Failed to log conduct" });
  }
}

async function getConductLogs(req, res) {
  try {
    const { learnerId } = req.query;
    const { rows } = await query(
      `SELECT c.*, l.first_name, l.last_name, l.admission_no
       FROM conduct_logs c
       JOIN learners l ON l.id = c.learner_id
       WHERE c.school_id = $1
         AND ($2::uuid IS NULL OR c.learner_id = $2)
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [req.user.school_id, learnerId || null]
    );
    res.json({ logs: rows, categories: CATEGORIES });
  } catch (err) {
    console.error("getConductLogs error:", err);
    res.status(500).json({ error: "Failed to fetch conduct logs" });
  }
}

module.exports = { createConductLog, getConductLogs, CATEGORIES };
