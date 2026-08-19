const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const LOGIN_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/login`
  : 'https://educore-hq.vercel.app/login';

async function sendApprovalEmail({ to, schoolName, contactName }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color:#185fa5; margin-bottom: 4px;">Welcome to EduCore!</h2>
      <p>Hi ${contactName},</p>
      <p>Great news — <strong>${schoolName}</strong> has been approved and is now live on EduCore.</p>
      <p>You can log in using the email address and password you set during registration:</p>
      <p style="margin: 24px 0;">
        <a href="${LOGIN_URL}" style="background:#185fa5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
          Log in to EduCore
        </a>
      </p>
      <p style="color:#666; font-size:13px;">If you have any questions, just reply to this email — we're happy to help you get set up.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EduCore" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${schoolName} is approved on EduCore!`,
    html,
  });
}

async function sendRejectionEmail({ to, schoolName, contactName, reason }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color:#185fa5; margin-bottom: 4px;">EduCore Registration Update</h2>
      <p>Hi ${contactName},</p>
      <p>Thanks for registering <strong>${schoolName}</strong> with EduCore. Unfortunately we're unable to approve this registration at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is a mistake, or would like to resubmit with corrected details, just reply to this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EduCore" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Update on your EduCore registration for ${schoolName}`,
    html,
  });
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color:#185fa5; margin-bottom: 4px;">Reset your EduCore password</h2>
      <p>We received a request to reset the password for this account. Click below to set a new one:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#185fa5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#666; font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EduCore" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your EduCore password',
    html,
  });
}

module.exports = { sendApprovalEmail, sendRejectionEmail, sendPasswordResetEmail };
