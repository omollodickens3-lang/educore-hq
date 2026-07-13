const { v4: uuid } = require('uuid');
const { query } = require('../config/db');

// Was hardcoded `const MOCK_MODE = true;` — now controlled by env var.
// Set SMS_MOCK_MODE=false in .env / Render once your Africa's Talking
// sandbox or production key is ready. Defaults to true (safe) if unset.
const MOCK_MODE = process.env.SMS_MOCK_MODE !== 'false';

let africastalking = null;
if (!MOCK_MODE) {
  africastalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME, // 'sandbox' while testing, your app name once live
  });
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `+254${digits}`;
  return null;
}

async function sendViaProvider(channel, phone, message) {
  if (MOCK_MODE) {
    console.log(`[MOCK ${channel.toUpperCase()}] To: ${phone} | Message: ${message}`);
    return { success: true };
  }

  if (channel === 'sms') {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new Error(`Invalid phone format: ${phone}`);
    }
    const response = await africastalking.SMS.send({
      to: [normalized],
      message,
      // from: process.env.AT_SENDER_ID, // add once you have an approved Sender ID
    });
    const recipient = response?.SMSMessageData?.Recipients?.[0];
    if (recipient?.status !== 'Success') {
      throw new Error(recipient?.status || 'Unknown Africa\'s Talking error');
    }
    return { success: true, raw: response };
  }

  throw new Error(`No live provider configured for channel: ${channel}`);
}

async function notify({ schoolId, learnerId, triggerType, recipientPhone, message, channel = "sms" }) {
  const id = uuid();
  try {
    await sendViaProvider(channel, recipientPhone, message);
    await query(
      `INSERT INTO learner_notifications (id, school_id, learner_id, trigger_type, channel, recipient_phone, message, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',now())`,
      [id, schoolId, learnerId, triggerType, MOCK_MODE ? "mock" : channel, recipientPhone, message]
    );
    return { id, status: "sent" };
  } catch (err) {
    await query(
      `INSERT INTO learner_notifications (id, school_id, learner_id, trigger_type, channel, recipient_phone, message, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'failed',$8)`,
      [id, schoolId, learnerId, triggerType, channel, recipientPhone, message, err.message]
    );
    return { id, status: "failed", error: err.message };
  }
}

module.exports = { notify };
