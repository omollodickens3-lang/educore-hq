const { query } = require("../config/db");
const { v4: uuid } = require("uuid");

const MOCK_MODE = true;

async function sendViaProvider(channel, phone, message) {
  if (MOCK_MODE) {
    console.log(`[MOCK ${channel.toUpperCase()}] To: ${phone} | Message: ${message}`);
    return { success: true };
  }
  throw new Error("No live provider configured yet");
}

async function notify({ schoolId, learnerId, triggerType, recipientPhone, message, channel = "sms" }) {
  const id = uuid();
  try {
    await sendViaProvider(channel, recipientPhone, message);
    await query(
      `INSERT INTO notifications (id, school_id, learner_id, trigger_type, channel, recipient_phone, message, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',now())`,
      [id, schoolId, learnerId, triggerType, MOCK_MODE ? "mock" : channel, recipientPhone, message]
    );
    return { id, status: "sent" };
  } catch (err) {
    await query(
      `INSERT INTO notifications (id, school_id, learner_id, trigger_type, channel, recipient_phone, message, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'failed',$8)`,
      [id, schoolId, learnerId, triggerType, channel, recipientPhone, message, err.message]
    );
    return { id, status: "failed", error: err.message };
  }
}

module.exports = { notify };

