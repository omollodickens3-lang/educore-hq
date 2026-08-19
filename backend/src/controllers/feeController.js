const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { initiateStkPush, checkPaymentStatus } = require('../services/intasendService');
const { notify } = require('../services/notificationService');

// ---- Fee structures (admin sets how much each grade owes per term) ----

async function getFeeStructures(req, res) {
  try {
    const { grade, term, academicYear } = req.query;
    let sql = `SELECT * FROM fee_structures WHERE school_id = $1`;
    const params = [req.user.school_id];
    if (grade) { params.push(grade); sql += ` AND grade = $${params.length}`; }
    if (term) { params.push(Number(term)); sql += ` AND term = $${params.length}`; }
    if (academicYear) { params.push(academicYear); sql += ` AND academic_year = $${params.length}`; }
    sql += ` ORDER BY academic_year DESC, term, grade`;
    const { rows } = await query(sql, params);
    res.json({ feeStructures: rows });
  } catch (err) {
    console.error('getFeeStructures error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fee structures' });
  }
}

async function setFeeStructure(req, res) {
  try {
    const { grade, term, academicYear, amount, description } = req.body;
    if (!grade || !term || !academicYear || amount === undefined) {
      return res.status(400).json({ error: 'grade, term, academicYear, and amount are required' });
    }
    const { rows } = await query(
      `INSERT INTO fee_structures (id, school_id, grade, term, academic_year, amount, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (school_id, grade, term, academic_year)
       DO UPDATE SET amount = $6, description = $7, updated_at = NOW()
       RETURNING *`,
      [uuid(), req.user.school_id, grade, Number(term), academicYear, amount, description || null]
    );
    res.json({ feeStructure: rows[0] });
  } catch (err) {
    console.error('setFeeStructure error:', err.message);
    res.status(500).json({ error: 'Failed to save fee structure' });
  }
}

// ---- Balance ----
// School fees: what's owed (fee_structures for this learner's grade/term/year)
// minus what's been confirmed paid. Exam fees: same idea, per exam, using
// the existing exams.fee column.

async function getBalance(req, res) {
  try {
    const { learnerId } = req.params;
    const { term, academicYear } = req.query;
    if (!term || !academicYear) {
      return res.status(400).json({ error: 'term and academicYear are required' });
    }

    const { rows: learnerRows } = await query(
      `SELECT id, grade, school_id FROM learners WHERE id = $1 AND school_id = $2`,
      [learnerId, req.user.school_id]
    );
    if (!learnerRows.length) return res.status(404).json({ error: 'Learner not found' });
    const learner = learnerRows[0];

    const { rows: feeRows } = await query(
      `SELECT amount FROM fee_structures WHERE school_id=$1 AND grade=$2 AND term=$3 AND academic_year=$4`,
      [req.user.school_id, learner.grade, Number(term), academicYear]
    );
    const schoolFeeDue = feeRows[0] ? Number(feeRows[0].amount) : 0;

    const { rows: paidRows } = await query(
      `SELECT COALESCE(SUM(amount),0) AS paid FROM payments
       WHERE learner_id=$1 AND school_id=$2 AND purpose='school_fee' AND status='confirmed'
         AND term=$3 AND academic_year=$4`,
      [learnerId, req.user.school_id, Number(term), academicYear]
    );
    const schoolFeePaid = Number(paidRows[0].paid);

    const { rows: examRows } = await query(
      `SELECT id, name, fee FROM exams
       WHERE school_id=$1 AND grade=$2 AND term=$3 AND academic_year=$4 AND fee > 0`,
      [req.user.school_id, learner.grade, Number(term), academicYear]
    );
    const examFees = [];
    for (const exam of examRows) {
      const { rows: examPaidRows } = await query(
        `SELECT COALESCE(SUM(amount),0) AS paid FROM payments
         WHERE learner_id=$1 AND exam_id=$2 AND purpose='exam_fee' AND status='confirmed'`,
        [learnerId, exam.id]
      );
      examFees.push({
        examId: exam.id,
        examName: exam.name,
        due: Number(exam.fee),
        paid: Number(examPaidRows[0].paid),
        balance: Number(exam.fee) - Number(examPaidRows[0].paid),
      });
    }

    res.json({
      schoolFee: { due: schoolFeeDue, paid: schoolFeePaid, balance: schoolFeeDue - schoolFeePaid },
      examFees,
    });
  } catch (err) {
    console.error('getBalance error:', err.message);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
}

// ---- Initiate payment (STK Push) ----

async function initiatePayment(req, res) {
  try {
    const { learnerId } = req.params;
    const { purpose, amount, phone, examId, term, academicYear } = req.body;

    if (!purpose || !['school_fee', 'exam_fee'].includes(purpose)) {
      return res.status(400).json({ error: "purpose must be 'school_fee' or 'exam_fee'" });
    }
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'A valid amount is required' });
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    if (purpose === 'exam_fee' && !examId) return res.status(400).json({ error: 'examId is required for exam_fee payments' });
    if (purpose === 'school_fee' && (!term || !academicYear)) {
      return res.status(400).json({ error: 'term and academicYear are required for school_fee payments' });
    }

    const { rows: learnerRows } = await query(
      `SELECT id, first_name, last_name, school_id FROM learners WHERE id = $1 AND school_id = $2`,
      [learnerId, req.user.school_id]
    );
    if (!learnerRows.length) return res.status(404).json({ error: 'Learner not found' });
    const learner = learnerRows[0];

    const paymentId = uuid();
    const apiRef = `EDU-${paymentId.slice(0, 8)}`;

    let invoiceId, state;
    try {
      const result = await initiateStkPush({
        amount: Number(amount),
        phone,
        apiRef,
        name: `${learner.first_name} ${learner.last_name}`,
      });
      invoiceId = result.invoiceId;
      state = result.state;
    } catch (stkErr) {
      console.error('initiateStkPush failed:', stkErr.message);
      return res.status(502).json({ error: 'Could not start M-Pesa payment: ' + stkErr.message });
    }

    await query(
      `INSERT INTO payments
        (id, school_id, learner_id, exam_id, phone, amount, purpose, status, intasend_invoice_id, term, academic_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10)`,
      [paymentId, req.user.school_id, learnerId, examId || null, phone, amount, purpose, invoiceId,
        term ? Number(term) : null, academicYear || null]
    );

    res.json({ paymentId, invoiceId, state, message: 'STK push sent — ask the parent to check their phone and enter their M-Pesa PIN.' });
  } catch (err) {
    console.error('initiatePayment error:', err.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
}

// ---- Webhook (called by IntaSend when a payment completes/fails) ----
// No `authenticate` middleware — this is called by IntaSend's servers, not
// a logged-in user. Protected instead by a shared secret in the URL.

async function intasendWebhook(req, res) {
  try {
    if (req.query.secret !== process.env.INTASEND_WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }

    const invoiceId = req.body?.invoice_id || req.body?.invoice?.invoice_id;
    if (!invoiceId) return res.status(400).json({ error: 'Missing invoice_id' });

    const { rows } = await query(`SELECT * FROM payments WHERE intasend_invoice_id = $1`, [invoiceId]);
    if (!rows.length) return res.status(404).json({ error: 'Payment not found for this invoice' });
    const payment = rows[0];

    // Confirm directly with IntaSend rather than trusting the webhook body
    // alone, since webhook payloads can be spoofed if the secret leaks.
    const statusResult = await checkPaymentStatus(invoiceId);
    const newStatus = statusResult.state === 'COMPLETE' ? 'confirmed'
      : statusResult.state === 'FAILED' ? 'failed'
      : 'pending';

    await query(
      `UPDATE payments SET status=$1, mpesa_receipt=$2, paid_at=CASE WHEN $1='confirmed' THEN NOW() ELSE paid_at END, updated_at=NOW()
       WHERE id=$3`,
      [newStatus, JSON.stringify(statusResult.raw || {}), payment.id]
    );

    if (newStatus === 'confirmed' && !payment.notified) {
      const { rows: learnerRows } = await query(`SELECT first_name FROM learners WHERE id=$1`, [payment.learner_id]);
      const learnerName = learnerRows[0]?.first_name || 'your learner';
      await notify({
        schoolId: payment.school_id,
        learnerId: payment.learner_id,
        triggerType: 'fee_payment_confirmed',
        recipientPhone: payment.phone,
        message: `Payment of KES ${payment.amount} for ${learnerName} received. Thank you! - EduCore`,
      });
      await query(`UPDATE payments SET notified=true WHERE id=$1`, [payment.id]);
    }

    res.json({ received: true, status: newStatus });
  } catch (err) {
    console.error('intasendWebhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ---- History ----

async function getPaymentHistory(req, res) {
  try {
    const { learnerId } = req.params;
    const { rows } = await query(
      `SELECT id, amount, purpose, status, mpesa_code, phone, term, academic_year, paid_at, created_at
       FROM payments WHERE learner_id = $1 AND school_id = $2
       ORDER BY created_at DESC`,
      [learnerId, req.user.school_id]
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error('getPaymentHistory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
}

module.exports = { getFeeStructures, setFeeStructure, getBalance, initiatePayment, intasendWebhook, getPaymentHistory };
