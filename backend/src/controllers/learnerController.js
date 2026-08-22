const { query } = require('../config/db');
const { v4: uuid } = require('uuid');
const ExcelJS = require('exceljs');

// KEMIS Registration Worksheet -- one row per learner, columns matching
// the official KEMIS Data Capture form. Fields EduCore already has are
// pre-filled (green); everything else is left blank (yellow) or set to
// KEMIS's own common default (gray) for quick verification.
async function generateKemisWorksheet(req, res) {
  try {
    const { grade, stream } = req.query;
    const schoolId = req.user.school_id;

    let sql = `SELECT admission_no, first_name, last_name, date_of_birth, gender,
                      grade, stream, parent_name, parent_phone
               FROM learners WHERE school_id = $1 AND status = 'active'`;
    const params = [schoolId];
    let idx = 2;
    if (grade)  { sql += ` AND grade = $${idx++}`;  params.push(grade); }
    if (stream) { sql += ` AND stream = $${idx++}`; params.push(stream); }
    sql += ` ORDER BY grade, stream, last_name, first_name`;
    const { rows: learners } = await query(sql, params);

    const { rows: schoolRows } = await query(`SELECT name FROM schools WHERE id = $1`, [schoolId]);
    const schoolName = schoolRows[0]?.name || 'School';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('KEMIS Worksheet');

    const GREEN = 'FFDCFCE7';   // pre-filled from EduCore
    const YELLOW = 'FFFEF9C3';  // needs your input
    const GRAY = 'FFF1F5F9';    // KEMIS's own common default, verify

    // Legend
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'KEMIS Registration Worksheet -- ' + schoolName + ' -- generated ' + new Date().toLocaleDateString();
    sheet.getCell('A1').font = { bold: true, size: 13 };
    sheet.mergeCells('A2:N2');
    sheet.getCell('A2').value =
      'Green = filled in from EduCore. Yellow = please fill in. Gray = common KEMIS default -- verify per learner.';
    sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

    const headers = [
      'Adm. No. (ref)', 'Grade', 'Stream',
      'ID Method (KNEC No. / Birth Cert.)', 'KNEC Assessment No.',
      'First Name', 'Middle Name', 'Last Name',
      'Learner Interests', 'Medical Condition', 'Religion',
      'Country of Birth', 'County of Birth', 'Sub County of Birth', 'Location of Birth',
      'Sex', 'Date of Birth', 'Orphan', 'SNE/Disability',
      'Nationality', 'ID Document Type', 'ID Number', 'Boarding Status',
      'Guardian 1 Full Name', 'Guardian 1 Relationship', 'Guardian 1 ID No.', 'Guardian 1 Phone',
      'Guardian 2 Full Name', 'Guardian 2 Relationship', 'Guardian 2 ID No.', 'Guardian 2 Phone',
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1628' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    sheet.getRow(3).height = 30;

    const colFill = (rowIdx, colLetter, color) => {
      sheet.getCell(colLetter + rowIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    };

    learners.forEach((l) => {
      const row = sheet.addRow([
        l.admission_no,
        l.grade,
        l.stream || '',
        '',                                            // ID method -- choose
        '',                                             // KNEC Assessment No.
        l.first_name,
        '',                                             // Middle name
        l.last_name,
        '', '', '',                                     // interests, medical, religion
        'Kenya', '', '', '',                             // country/county/subcounty/location of birth
        l.gender === 'Male' ? 'Male' : l.gender === 'Female' ? 'Female' : '',
        l.date_of_birth ? new Date(l.date_of_birth).toLocaleDateString('en-GB') : '',
        'No',                                            // Orphan default
        'No',                                            // SNE/Disability default
        'Kenyan',                                        // Nationality default
        '', '',                                          // ID doc type, ID number
        'Day Scholar',                                    // Boarding status default
        l.parent_name || '', '', '', l.parent_phone || '',
        '', '', '', '',
      ]);
      const r = row.number;
      colFill(r, 'F', GREEN); colFill(r, 'H', GREEN);           // first/last name
      colFill(r, 'L', GRAY);                                     // country of birth default
      colFill(r, 'P', GREEN);                                    // sex
      colFill(r, 'Q', l.date_of_birth ? GREEN : YELLOW);         // date of birth
      colFill(r, 'R', GRAY); colFill(r, 'S', GRAY);              // orphan, SNE defaults
      colFill(r, 'T', GRAY);                                     // nationality default
      colFill(r, 'W', GRAY);                                     // boarding status default
      colFill(r, 'X', l.parent_name ? GREEN : YELLOW);           // guardian 1 name
      colFill(r, 'AA', l.parent_phone ? GREEN : YELLOW);         // guardian 1 phone
      ['E', 'G', 'I', 'J', 'K', 'M', 'N', 'O', 'U', 'V', 'Y', 'Z'].forEach((c) => colFill(r, c, YELLOW));
    });

    sheet.columns.forEach((col) => { col.width = 16; });
    sheet.getColumn(1).width = 12;
    sheet.getColumn(6).width = 14;
    sheet.getColumn(8).width = 14;

    const safeName = schoolName.replace(/[^a-z0-9]/gi, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="KEMIS-Worksheet-' + safeName + '.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('generateKemisWorksheet error:', err.message);
    res.status(500).json({ error: 'Failed to generate KEMIS worksheet' });
  }
}

async function getLearners(req, res) {
  try {
    const { grade, stream, status, search } = req.query;
    const schoolId = req.user.school_id;
    let sql = `SELECT * FROM learners WHERE school_id = $1`;
    const params = [schoolId];
    let idx = 2;
    if (grade)  { sql += ` AND grade = $${idx++}`;  params.push(grade); }
    if (stream) { sql += ` AND stream = $${idx++}`; params.push(stream); }
    if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
    if (search) { sql += ` AND (first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR admission_no ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    sql += ` ORDER BY grade, stream, last_name`;
    const { rows } = await query(sql, params);
    res.json({ count: rows.length, learners: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch learners' }); }
}

async function getLearnerById(req, res) {
  try {
    const { rows } = await query(
      `SELECT * FROM learners WHERE id = $1 AND school_id = $2`,
      [req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    const { rows: strands } = await query(`SELECT * FROM learner_strands WHERE learner_id = $1`, [req.params.id]);
    res.json({ ...rows[0], strands, overallMean: 0, remediationFlag: rows[0].status === 'remediation' });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch learner' }); }
}

async function createLearner(req, res) {
  try {
    const { firstName, lastName, admissionNo, dateOfBirth, gender, grade, stream, parentName, parentPhone, parentEmail, notes } = req.body;
    const schoolId = req.user.school_id;
    if (!firstName || !lastName || !grade) return res.status(400).json({ error: 'First name, last name and grade are required' });
    const section = ['Grade 7','Grade 8','Grade 9'].includes(grade) ? 'js' : 'primary';
    const { rows } = await query(`
      INSERT INTO learners (id, school_id, admission_no, first_name, last_name, date_of_birth, gender, grade, stream, section, parent_name, parent_phone, parent_email, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [uuid(), schoolId, admissionNo || `2025/${Date.now().toString().slice(-4)}`, firstName, lastName, dateOfBirth || null, gender || null, grade, stream || null, section, parentName || null, parentPhone || null, parentEmail || null, notes || null]
    );
    res.status(201).json({ message: 'Learner created', learner: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Admission number already exists' });
    res.status(500).json({ error: 'Failed to create learner' });
  }
}

async function updateLearner(req, res) {
  try {
    const { firstName, lastName, dateOfBirth, gender, grade, stream, status, parentName, parentPhone, parentEmail, notes } = req.body;
    const { rows } = await query(`
      UPDATE learners SET first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, grade=$5, stream=$6, status=$7, parent_name=$8, parent_phone=$9, parent_email=$10, notes=$11, updated_at=NOW()
      WHERE id=$12 AND school_id=$13 RETURNING *`,
      [firstName, lastName, dateOfBirth||null, gender||null, grade, stream||null, status||'active', parentName||null, parentPhone||null, parentEmail||null, notes||null, req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    res.json({ message: 'Learner updated', learner: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to update learner' }); }
}

async function deleteLearner(req, res) {
  try {
    const { rows } = await query(`DELETE FROM learners WHERE id=$1 AND school_id=$2 RETURNING id`, [req.params.id, req.user.school_id]);
    if (!rows.length) return res.status(404).json({ error: 'Learner not found' });
    res.json({ message: 'Learner deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete learner' }); }
}

async function getLearnerProgress(req, res) {
  try {
    const { rows: strands } = await query(`SELECT * FROM learner_strands WHERE learner_id=$1 ORDER BY term`, [req.params.id]);
    res.json({ scores: [], strands });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch progress' }); }
}

async function updateStrands(req, res) {
  try {
    const { term, academicYear = '2025/2026', ...s } = req.body;
    const { rows } = await query(`
      INSERT INTO learner_strands (id, learner_id, term, academic_year, communication, critical_thinking, creativity, citizenship, collaboration, learning_to_learn, self_efficacy, digital_literacy)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (learner_id, term, academic_year) DO UPDATE SET communication=$5, critical_thinking=$6, creativity=$7, citizenship=$8, collaboration=$9, learning_to_learn=$10, self_efficacy=$11, digital_literacy=$12
      RETURNING *`,
      [uuid(), req.params.id, term, academicYear, s.communication||0, s.criticalThinking||0, s.creativity||0, s.citizenship||0, s.collaboration||0, s.learningToLearn||0, s.selfEfficacy||0, s.digitalLiteracy||0]
    );
    res.json({ message: 'Strands updated', strands: rows[0] });
  } catch (err) {
    console.error('updateStrands error:', err.message);
    res.status(500).json({ error: `Failed to update strands: ${err.message}` });
  }
}

async function getStats(req, res) {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active') AS active,
        COUNT(*) FILTER (WHERE status='remediation') AS remediation,
        COUNT(*) FILTER (WHERE status='transferred') AS transferred,
        COUNT(*) FILTER (WHERE gender='Male') AS male,
        COUNT(*) FILTER (WHERE gender='Female') AS female,
        COUNT(*) FILTER (WHERE section='primary') AS primary_count,
        COUNT(*) FILTER (WHERE section='js') AS js_count
      FROM learners WHERE school_id=$1`, [req.user.school_id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
}

// Bulk import: unlike createLearner, this retries with a freshly generated
// admission number if the provided one collides with an existing learner,
// instead of failing the row outright. Bulk imports from real class lists
// almost always have messy or duplicate admission numbers, and a
// non-technical teacher shouldn't have to fix that by hand row by row.
async function bulkCreateLearners(req, res) {
  const { learners: rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'No learners provided' });
  }
  const schoolId = req.user.school_id;
  const created = [];
  const failed = [];

  for (const r of rows) {
    const firstName = (r.firstName || '').trim();
    const lastName = (r.lastName || '').trim();
    const grade = (r.grade || '').trim();
    if (!firstName || !lastName || !grade) {
      failed.push({ row: r, error: 'Missing first name, last name, or grade' });
      continue;
    }
    const section = ['Grade 7', 'Grade 8', 'Grade 9'].includes(grade) ? 'js' : 'primary';

    const MAX_ATTEMPTS = 5;
    const providedAdmissionNo = (r.admissionNo || '').trim();
    let attempt = 0;
    let lastErr = null;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      const admissionNo = (attempt === 1 && providedAdmissionNo)
        ? providedAdmissionNo
        : `2025/${Date.now().toString().slice(-4)}${created.length}${attempt}`;
      try {
        const { rows: inserted } = await query(`
          INSERT INTO learners (id, school_id, admission_no, first_name, last_name, date_of_birth, gender, grade, stream, section, parent_name, parent_phone, parent_email, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [uuid(), schoolId, admissionNo,
            firstName, lastName, r.dateOfBirth || null, r.gender || null, grade,
            r.stream || null, section, r.parentName || null, r.parentPhone || null,
            r.parentEmail || null, r.notes || null]
        );
        created.push(inserted[0]);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (err.code === '23505') continue; // collision — try again with a fresh number
        break; // any other error: stop retrying, report it
      }
    }

    if (lastErr) {
      failed.push({
        row: r,
        error: lastErr.code === '23505'
          ? 'Could not generate a unique admission number after several attempts'
          : lastErr.message,
      });
    }
  }

  res.status(201).json({ message: `${created.length} learner(s) created`, created, failed });
}

// ═══════════════════════════════════════════════════════════════════════
// EARLY WARNING SYSTEM — cross-references three data sources EduCore
// already collects separately (attendance, exam scores, conduct logs) to
// surface learners showing MULTIPLE co-occurring warning signs. A single
// bad exam or one late mark isn't flagged — this is specifically about
// catching the learner whose attendance AND grades AND conduct are all
// slipping in the same window, which is much easier to miss when each
// signal lives in its own separate page.
// ═══════════════════════════════════════════════════════════════════════
async function getAtRiskLearners(req, res) {
  try {
    const schoolId = req.user.school_id;
    const { grade, stream } = req.query;

    let learnerWhere = 'school_id = $1';
    const learnerParams = [schoolId];
    if (grade) { learnerParams.push(grade); learnerWhere += ` AND grade = $${learnerParams.length}`; }
    if (stream) { learnerParams.push(stream); learnerWhere += ` AND stream = $${learnerParams.length}`; }

    const { rows: learners } = await query(
      `SELECT id, first_name, last_name, admission_no, grade, stream, parent_name, parent_phone
       FROM learners WHERE ${learnerWhere} AND status = 'active' ORDER BY grade, stream, last_name`,
      learnerParams
    );
    if (!learners.length) return res.json({ atRisk: [] });

    const learnerIds = learners.map((l) => l.id);

    // Signal 1: attendance rate over the last 60 days (AM session), needs
    // at least 10 marked days to avoid flagging on too little data.
    const { rows: attendanceRows } = await query(
      `SELECT learner_id,
         COUNT(*) FILTER (WHERE status IN ('P','L')) AS present_days,
         COUNT(*) AS total_days
       FROM attendance
       WHERE school_id = $1 AND session = 'AM' AND date >= (CURRENT_DATE - INTERVAL '60 days')
         AND learner_id = ANY($2::uuid[])
       GROUP BY learner_id`,
      [schoolId, learnerIds]
    );
    const attendanceByLearner = {};
    attendanceRows.forEach((r) => {
      const total = parseInt(r.total_days, 10);
      if (total < 10) return; // not enough data to judge fairly
      const rate = (parseInt(r.present_days, 10) / total) * 100;
      attendanceByLearner[r.learner_id] = { rate: Math.round(rate), totalDays: total };
    });

    // Signal 2: score decline between a learner's two most recent exams
    // (each exam's score averaged across all subjects taken).
    const { rows: examAvgRows } = await query(
      `WITH learner_exam_avg AS (
         SELECT s.learner_id, s.exam_id, e.academic_year, e.term, e.created_at,
                AVG(s.score::float / NULLIF(s.max_score, 0) * 100) AS avg_pct
         FROM scores s JOIN exams e ON e.id = s.exam_id
         WHERE s.school_id = $1 AND s.learner_id = ANY($2::uuid[])
         GROUP BY s.learner_id, s.exam_id, e.academic_year, e.term, e.created_at
       ),
       ranked AS (
         SELECT *, ROW_NUMBER() OVER (
           PARTITION BY learner_id ORDER BY academic_year DESC, term DESC, created_at DESC
         ) AS rn
         FROM learner_exam_avg
       )
       SELECT r1.learner_id, r1.avg_pct AS latest_avg, r2.avg_pct AS previous_avg
       FROM ranked r1 LEFT JOIN ranked r2 ON r2.learner_id = r1.learner_id AND r2.rn = 2
       WHERE r1.rn = 1`,
      [schoolId, learnerIds]
    );
    const scoreDeclineByLearner = {};
    const DECLINE_THRESHOLD = 10; // percentage points
    examAvgRows.forEach((r) => {
      if (r.previous_avg == null) return; // only one exam on record, no trend yet
      const drop = Number(r.previous_avg) - Number(r.latest_avg);
      if (drop >= DECLINE_THRESHOLD) {
        scoreDeclineByLearner[r.learner_id] = {
          latestAvg: Math.round(Number(r.latest_avg)),
          previousAvg: Math.round(Number(r.previous_avg)),
          drop: Math.round(drop),
        };
      }
    });

    // Signal 3: 2+ "concern" conduct logs in the last 60 days.
    const { rows: conductRows } = await query(
      `SELECT learner_id, COUNT(*) AS concern_count
       FROM conduct_logs
       WHERE school_id = $1 AND type = 'concern' AND learner_id = ANY($2::uuid[])
         AND created_at >= (NOW() - INTERVAL '60 days')
       GROUP BY learner_id`,
      [schoolId, learnerIds]
    );
    const conductByLearner = {};
    conductRows.forEach((r) => {
      const count = parseInt(r.concern_count, 10);
      if (count >= 2) conductByLearner[r.learner_id] = { concernCount: count };
    });

    // Combine — only surface learners with at least one real flag, sorted
    // so the most urgent (most co-occurring signals) show up first.
    const atRisk = learners
      .map((l) => {
        const flags = [];
        const attendance = attendanceByLearner[l.id];
        if (attendance && attendance.rate < 75) {
          flags.push({ type: 'attendance', detail: `${attendance.rate}% attendance over the last 60 days` });
        }
        const decline = scoreDeclineByLearner[l.id];
        if (decline) {
          flags.push({ type: 'scores', detail: `Dropped from ${decline.previousAvg}% to ${decline.latestAvg}% (-${decline.drop} pts) in the most recent exam` });
        }
        const conduct = conductByLearner[l.id];
        if (conduct) {
          flags.push({ type: 'conduct', detail: `${conduct.concernCount} behavior concerns logged in the last 60 days` });
        }
        return { learner: l, flags, riskScore: flags.length };
      })
      .filter((r) => r.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json({ atRisk });
  } catch (err) {
    console.error('getAtRiskLearners error:', err.message);
    res.status(500).json({ error: 'Failed to compute at-risk learners' });
  }
}

module.exports = {
  getLearners,
  getLearnerById,
  createLearner,
  updateLearner,
  deleteLearner,
  getLearnerProgress,
  updateStrands,
  getStats,
  bulkCreateLearners,
  getAtRiskLearners,
  generateKemisWorksheet,
};
