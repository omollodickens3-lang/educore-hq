const PDFDocument = require("pdfkit");
const { query } = require("../config/db");
const { cbcGrade } = require("../utils/examUtils");

// CBC grading bands: Primary (PP1-Grade 6) uses 4 levels, Junior Secondary (Grade 7-9) uses 8 levels
function getGradingKey(gradeLabel) {
  const grade = String(gradeLabel || "").match(/\d+/);
  const gradeNum = grade ? parseInt(grade[0], 10) : null;
  if (gradeNum && gradeNum >= 7) {
    return ["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"];
  }
  return ["EE", "ME", "AE", "BE"];
}

// Turns a raw grade code (EE, EE1, EE2, ME, ME1... etc) into its full CBC
// Performance Level description, e.g. "EE1" -> "Exceeding Expectation (EE1)".
// Used for the Overall Performance line so parents see the same descriptive
// wording used nationally, not just a bare code.
function fullPerformanceLabel(code) {
  if (!code) return null;
  const prefix = code.slice(0, 2);
  const names = {
    EE: "Exceeding Expectation",
    ME: "Meeting Expectation",
    AE: "Approaching Expectation",
    BE: "Below Expectation",
  };
  const name = names[prefix];
  return name ? `${name} (${code})` : code;
}

// Auto-generated narrative comments based on overall percentage this term.
// Picked automatically at report-generation time — no manual entry needed.
function getPerformanceBand(meanPct) {
  const p = Number(meanPct);
  if (p >= 85) return "exceptional";
  if (p >= 70) return "very_good";
  if (p >= 55) return "good";
  if (p >= 40) return "needs_improvement";
  return "needs_support";
}

const CLASS_TEACHER_COMMENTS = {
  exceptional: (name) => name + " has posted an exceptional result this term. Keep up the outstanding work and keep challenging yourself.",
  very_good: (name) => name + " has performed very well this term. With a little more consistency, even higher grades are within reach.",
  good: (name) => name + " has put in a good effort this term. Focused revision in weaker subjects will help push the grades higher.",
  needs_improvement: (name) => name + " needs more consistent effort and revision this term. With focused support, improvement is achievable.",
  needs_support: (name) => name + " is finding several subjects challenging this term and needs close support both at home and in class.",
};

const HEAD_TEACHER_COMMENTS = {
  exceptional: (name) => name + " is a hardworking learner who continues to demonstrate excellent understanding across subjects. Well done.",
  very_good: (name) => name + " has shown commendable effort this term. We encourage continued dedication to reach even greater heights.",
  good: (name) => name + " is capable of achieving more with sustained effort. We encourage a stronger focus next term.",
  needs_improvement: (name) => name + " needs to put in extra effort next term. We encourage close monitoring and support at home.",
  needs_support: (name) => name + " requires urgent additional support. We strongly encourage a meeting with the class teacher to discuss a way forward.",
};

function generateComment(bank, meanPct, firstName) {
  const band = getPerformanceBand(meanPct);
  return bank[band](firstName || "The learner");
}

// ─────────────────────────────────────────────────────────────────────────
// Shared page renderer — draws ONE learner's report onto the CURRENT page
// of an already-open PDFDocument. Used by both the single-learner download
// and the bulk (whole class / whole grade) download, so the two can never
// drift out of sync with each other. Caller is responsible for opening the
// document, calling doc.addPage() between learners in a bulk run, and
// calling doc.end() once, at the very end.
// ─────────────────────────────────────────────────────────────────────────
function drawReportPage(doc, { learner, exam, school, scores, myRank, classTeacherRow, classTeacherName, headTeacherRow, headTeacherName, printSafe }) {
  const navy = "#0f172a";
  const gold = "#d4a94b";
  const blue = "#2563eb";
  const lightBlue = "#eff6ff";
  const gray = "#64748b";
  const lightGray = "#e2e8f0";
  const cardBg = "#f8fafc";
  const pageWidth = doc.page.width - 80; // minus margins

  const headerBg = printSafe ? "#ffffff" : navy;
  const schoolNameColor = printSafe ? "#000000" : "#ffffff";
  const subtitleColor = printSafe ? "#000000" : gold;
  const tableHeaderBg = printSafe ? "#ffffff" : navy;
  const tableHeaderTextColor = printSafe ? "#000000" : "#ffffff";

  // ---- Header (solid navy block, matching the school-brand report style) ----
  const headerHeight = 90;
  doc.rect(0, 0, doc.page.width, headerHeight).fill(headerBg);
  if (printSafe) {
    doc.moveTo(0, headerHeight).lineTo(doc.page.width, headerHeight)
      .lineWidth(1.5).strokeColor("#000000").stroke();
  }

  if (school.logo_data) {
    try {
      const logoBuffer = Buffer.from(school.logo_data, "base64");
      const logoSize = 50;
      doc.image(logoBuffer, 40, (headerHeight - logoSize) / 2, { fit: [logoSize, logoSize] });
    } catch (logoErr) {
      console.error("Failed to embed school logo:", logoErr.message);
    }
  }

  doc.fillColor(schoolNameColor).fontSize(21).font("Helvetica-Bold")
    .text(school.name || "School", 40, 30, { align: "center", width: pageWidth });
  doc.fillColor(subtitleColor).fontSize(9).font("Helvetica-Bold")
    .text("STUDENT ACADEMIC REPORT  \u00b7  CBC", { align: "center", width: pageWidth, characterSpacing: 1 });

  doc.y = headerHeight + 16;

  // ---- Info card (two columns, rounded card background) ----
  const infoTop = doc.y;
  const infoHeight = 96;
  const colWidth = pageWidth / 2;

  doc.roundedRect(40, infoTop, pageWidth, infoHeight, 8).fill(cardBg);

  function infoField(label, value, x, y) {
    doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
      .text(label.toUpperCase(), x, y, { width: colWidth - 40, characterSpacing: 0.5 });
    doc.fillColor(navy).fontSize(12).font("Helvetica-Bold").text(value || "N/A", x, y + 12, { width: colWidth - 40 });
  }

  const pad = 16;
  infoField("Learner", learner.first_name + " " + learner.last_name, 40 + pad, infoTop + pad);
  infoField("Exam", exam.name, 40 + colWidth, infoTop + pad);

  infoField("Admission No", learner.admission_no, 40 + pad, infoTop + pad + 30);
  infoField("Exam Type", exam.exam_type || "-", 40 + colWidth, infoTop + pad + 30);

  infoField("Grade / Stream", (learner.grade || "N/A") + " / " + (learner.stream || "N/A"), 40 + pad, infoTop + pad + 60);
  infoField("Term / Year", "Term " + exam.term + "  \u00b7  " + exam.academic_year, 40 + colWidth, infoTop + pad + 60);

  doc.y = infoTop + infoHeight + 14;

  // ---- Score table ----
  const tableTop = doc.y;
  const rowHeight = 18;
  const col = { subject: 40, score: 40 + pageWidth * 0.38, grade: 40 + pageWidth * 0.55, remarks: 40 + pageWidth * 0.68 };

  doc.roundedRect(40, tableTop, pageWidth, rowHeight + 2, 6).fill(tableHeaderBg);
  if (printSafe) {
    doc.roundedRect(40, tableTop, pageWidth, rowHeight + 2, 6)
      .lineWidth(1).strokeColor("#000000").stroke();
  }
  doc.fillColor(tableHeaderTextColor).fontSize(8).font("Helvetica-Bold");
  doc.text("SUBJECT", col.subject + 10, tableTop + 6);
  doc.text("SCORE", col.score, tableTop + 6);
  doc.text("GRADE", col.grade, tableTop + 6);
  doc.text("REMARKS", col.remarks, tableTop + 6, { width: 40 + pageWidth - col.remarks - 10 });

  let y = tableTop + rowHeight + 2;
  let totalScore = 0;
  let totalMax = 0;

  scores.forEach(function (s, idx) {
    const bg = idx % 2 === 0 ? cardBg : "#ffffff";
    doc.rect(40, y, pageWidth, rowHeight).fill(bg);
    doc.fillColor(navy).fontSize(8).font("Helvetica");
    doc.text(s.subject, col.subject + 10, y + 5, { width: col.score - col.subject - 18 });
    doc.text(s.score + "/" + s.max_score, col.score, y + 5);
    doc.fillColor(blue).font("Helvetica-Bold").text(s.grade_label || "-", col.grade, y + 5);
    doc.fillColor(navy).font("Helvetica").fontSize(7.5).text(s.remarks || "-", col.remarks, y + 5, { width: 40 + pageWidth - col.remarks - 10 });
    totalScore += Number(s.score);
    totalMax += Number(s.max_score);
    y += rowHeight;
  });

  if (!scores.length) {
    doc.rect(40, y, pageWidth, rowHeight).fill(cardBg);
    doc.fillColor(gray).fontSize(8).font("Helvetica-Oblique")
      .text("No scores recorded for this exam yet.", col.subject + 10, y + 5);
    y += rowHeight;
  }

  doc.roundedRect(40, tableTop, pageWidth, y - tableTop, 6).strokeColor(lightGray).lineWidth(1).stroke();

  doc.y = y + 14;

  // ---- Overall performance + Ranking (two cards side by side) ----
  const meanPct = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) : "0.0";
  const overallGrade = scores.length === 1 ? (scores[0].grade_label || "-") : null;

  const overallPerformanceCode = totalMax ? cbcGrade(Number(meanPct), learner.section) : null;
  const overallPerformanceLabel = fullPerformanceLabel(overallPerformanceCode);

  const perfTop = doc.y;
  const perfHeight = 44;
  const cardGap = 12;
  const perfWidth = (pageWidth - cardGap) / 2;

  doc.roundedRect(40, perfTop, perfWidth, perfHeight, 8).fill(lightBlue);
  doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
    .text("OVERALL PERFORMANCE", 40 + pad, perfTop + 9, { characterSpacing: 0.5 });
  doc.fillColor(navy).fontSize(12).font("Helvetica-Bold")
    .text(totalScore + "/" + totalMax + "  (" + meanPct + "%)", 40 + pad, perfTop + 21);
  if (overallPerformanceLabel) {
    doc.fillColor(blue).fontSize(8.5).font("Helvetica-Bold")
      .text(overallPerformanceLabel, 40 + pad, perfTop + 33, { width: perfWidth - pad * 2 });
  }

  const rankX = 40 + perfWidth + cardGap;
  doc.roundedRect(rankX, perfTop, perfWidth, perfHeight, 8).fill(lightBlue);
  doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
    .text("RANKING", rankX + pad, perfTop + 9, { characterSpacing: 0.5 });
  if (myRank) {
    doc.fillColor(navy).fontSize(10).font("Helvetica-Bold")
      .text("Stream: " + myRank.stream_rank + " of " + myRank.stream_size + "   \u00b7   Grade: " + myRank.overall_rank + " of " + myRank.overall_size, rankX + pad, perfTop + 23);
  } else {
    doc.fillColor(gray).fontSize(9).font("Helvetica-Oblique")
      .text("Not yet ranked", rankX + pad, perfTop + 23);
  }

  doc.y = perfTop + perfHeight + 14;

  // ---- CBC grading key strip ----
  const gradingKey = getGradingKey(learner.grade);
  const achievedGrade = overallGrade;
  const keyTop = doc.y;
  const chipGap = 5;
  const chipWidth = (pageWidth - chipGap * (gradingKey.length - 1)) / gradingKey.length;

  doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
    .text("CBC GRADING KEY  \u00b7  " + (gradingKey.length === 8 ? "JUNIOR SECONDARY" : "PRIMARY"), 40, keyTop, { characterSpacing: 0.5 });

  gradingKey.forEach(function (label, idx) {
    const x = 40 + idx * (chipWidth + chipGap);
    const isActive = achievedGrade && label === achievedGrade;
    doc.roundedRect(x, keyTop + 13, chipWidth, 20, 5).fill(isActive ? blue : lightGray);
    doc.fillColor(isActive ? "#ffffff" : navy).fontSize(8).font("Helvetica-Bold")
      .text(label, x, keyTop + 19, { width: chipWidth, align: "center" });
  });

  doc.y = keyTop + 42;

  // ---- Auto-generated Class Teacher's and Head Teacher's comments ----
  const commentBoxHeight = 36;
  const commentGap = 8;
  const postCommentPad = 10;
  const signatureBlockSpace = 60;
  const neededSpace = commentBoxHeight * 2 + commentGap + postCommentPad + signatureBlockSpace;
  if (doc.y + neededSpace > doc.page.height - 70) {
    doc.addPage();
    doc.y = 40;
  }

  const commentsTop = doc.y;

  function commentBox(label, name, text, y) {
    const headerLabel = name ? `${label.toUpperCase()} \u2014 ${name.toUpperCase()}` : label.toUpperCase();
    doc.roundedRect(40, y, pageWidth, commentBoxHeight, 8).fill(cardBg);
    doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
      .text(headerLabel, 40 + pad, y + 7, { characterSpacing: 0.5, height: 10, ellipsis: true, width: pageWidth - pad * 2 });
    doc.fillColor(navy).fontSize(8.5).font("Helvetica")
      .text(text, 40 + pad, y + 18, { width: pageWidth - pad * 2, height: commentBoxHeight - 20, ellipsis: true });
  }

  commentBox(
    "Class Teacher's Comments",
    classTeacherName,
    generateComment(CLASS_TEACHER_COMMENTS, meanPct, learner.first_name),
    commentsTop
  );
  commentBox(
    "Head Teacher's Comments",
    headTeacherName,
    generateComment(HEAD_TEACHER_COMMENTS, meanPct, learner.first_name),
    commentsTop + commentBoxHeight + commentGap
  );

  doc.y = commentsTop + commentBoxHeight * 2 + commentGap + postCommentPad;

  // ---- Signatures (side by side) ----
  const sigTop = doc.y;
  const sigColWidth = pageWidth / 2;

  if (classTeacherRow && classTeacherRow.signature_data) {
    const ctImgBuffer = Buffer.from(classTeacherRow.signature_data, "base64");
    doc.image(ctImgBuffer, 40, sigTop, { fit: [130, 36], align: "left" });
    doc.fillColor(navy).fontSize(8.5).font("Helvetica-Bold").text(classTeacherName, 40, sigTop + 40);
    doc.fillColor(gray).fontSize(7).font("Helvetica").text("Class Teacher", 40, sigTop + 51);
  } else {
    doc.moveTo(40, sigTop + 30).lineTo(40 + 170, sigTop + 30).strokeColor(lightGray).lineWidth(1).stroke();
    doc.fillColor(navy).fontSize(8.5).font("Helvetica-Bold").text(classTeacherName || "Class Teacher", 40, sigTop + 35);
    doc.fillColor(gray).fontSize(7).font("Helvetica").text("Signature & date", 40, sigTop + 46);
  }

  const rightX = 40 + sigColWidth;
  if (headTeacherRow && headTeacherRow.signature_data) {
    const htImgBuffer = Buffer.from(headTeacherRow.signature_data, "base64");
    doc.image(htImgBuffer, rightX, sigTop, { fit: [130, 36], align: "left" });
    doc.fillColor(navy).fontSize(8.5).font("Helvetica-Bold").text(headTeacherName, rightX, sigTop + 40);
    doc.fillColor(gray).fontSize(7).font("Helvetica").text("Head Teacher", rightX, sigTop + 51);
  } else {
    doc.moveTo(rightX, sigTop + 30).lineTo(rightX + 170, sigTop + 30).strokeColor(lightGray).lineWidth(1).stroke();
    doc.fillColor(navy).fontSize(8.5).font("Helvetica-Bold").text(headTeacherName || "Head Teacher", rightX, sigTop + 35);
    doc.fillColor(gray).fontSize(7).font("Helvetica").text("Signature & date", rightX, sigTop + 46);
  }

  // ---- School stamp (if uploaded) ----
  if (school.stamp_data) {
    try {
      const stampBuffer = Buffer.from(school.stamp_data, "base64");
      const stampSize = 74;
      const stampX = 40 + pageWidth / 2 - stampSize / 2;
      const stampY = sigTop - 16;
      doc.opacity(0.82);
      doc.image(stampBuffer, stampX, stampY, { fit: [stampSize, stampSize] });
      doc.opacity(1);
    } catch (stampErr) {
      console.error("Failed to embed school stamp:", stampErr.message);
    }
  }

  // ---- Footer ----
  doc.moveTo(40, doc.page.height - 70).lineTo(40 + pageWidth, doc.page.height - 70).strokeColor(lightGray).lineWidth(1).stroke();
  doc.fillColor(gray).fontSize(7).font("Helvetica")
    .text("Generated by EduCore Exam Analyzer on " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      40, doc.page.height - 58, { width: pageWidth, align: "center" });
}

// Real class teacher for a specific grade+stream (for the byline + signature).
async function getClassTeacher(schoolId, grade, stream) {
  const res = await query(
    `SELECT t.first_name, t.last_name, t.signature_data, t.role
     FROM classes c
     JOIN teachers t ON t.id = c.class_teacher_id
     WHERE c.school_id = $1 AND c.grade = $2 AND c.stream = $3
     ORDER BY c.academic_year DESC LIMIT 1`,
    [schoolId, grade, stream]
  );
  return res.rows[0] || null;
}

// Real head teacher / principal for the school (for the byline + signature).
async function getHeadTeacher(schoolId) {
  const res = await query(
    `SELECT first_name, last_name, signature_data, role FROM teachers
     WHERE school_id = $1 AND (role ILIKE '%head%' OR role = 'admin')
     ORDER BY (role ILIKE '%head%') DESC LIMIT 1`,
    [schoolId]
  );
  return res.rows[0] || null;
}

// A specific teacher by id, used when someone other than the default head
// teacher is signing (e.g. a deputy standing in) — still labeled with their
// own real role, never mislabeled as "Head Teacher".
async function getTeacherById(schoolId, teacherId) {
  const res = await query(
    `SELECT first_name, last_name, signature_data, role FROM teachers
     WHERE school_id = $1 AND id = $2`,
    [schoolId, teacherId]
  );
  return res.rows[0] || null;
}

// Turns "subject_teacher" / "deputy_head" / "class_teacher" into
// "Subject Teacher" / "Deputy Head" / "Class Teacher" for display.
function formatRole(role) {
  if (!role) return "Teacher";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function generateLearnerReport(req, res) {
  try {
    const { learnerId, examId } = req.params;
    const printSafe = req.query.printSafe === "true" || req.query.printSafe === "1";

    const learnerRes = await query("SELECT * FROM learners WHERE id = $1", [learnerId]);
    if (!learnerRes.rows.length) return res.status(404).json({ error: "Learner not found" });
    const learner = learnerRes.rows[0];

    const examRes = await query("SELECT * FROM exams WHERE id = $1", [examId]);
    if (!examRes.rows.length) return res.status(404).json({ error: "Exam not found" });
    const exam = examRes.rows[0];

    const schoolRes = await query("SELECT * FROM schools WHERE id = $1", [learner.school_id]);
    const school = schoolRes.rows[0] || {};

    const scoresRes = await query(
      "SELECT subject, score, max_score, grade_label, remarks FROM scores WHERE learner_id = $1 AND exam_id = $2 ORDER BY subject",
      [learnerId, examId]
    );
    const scores = scoresRes.rows;

    const rankRes = await query(
      `SELECT l.id AS learner_id,
        RANK() OVER (PARTITION BY l.stream ORDER BY SUM(s.score) DESC) AS stream_rank,
        COUNT(*) OVER (PARTITION BY l.stream) AS stream_size,
        RANK() OVER (ORDER BY SUM(s.score) DESC) AS overall_rank,
        COUNT(*) OVER () AS overall_size
       FROM scores s
       JOIN learners l ON l.id = s.learner_id
       JOIN exams e ON e.id = s.exam_id
       WHERE s.exam_id = $1 AND l.grade = e.grade
       GROUP BY l.id, l.stream`,
      [examId]
    );
    const myRank = rankRes.rows.find((r) => r.learner_id === learnerId) || null;

    const classTeacherRow = await getClassTeacher(learner.school_id, learner.grade, learner.stream);
    const classTeacherName = classTeacherRow ? `${classTeacherRow.first_name} ${classTeacherRow.last_name}` : null;

    const headTeacherRow = await getHeadTeacher(learner.school_id);
    const headTeacherName = headTeacherRow ? `${headTeacherRow.first_name} ${headTeacherRow.last_name}` : null;

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report_" + (learner.admission_no || learner.id) + ".pdf");
    doc.pipe(res);

    drawReportPage(doc, { learner, exam, school, scores, myRank, classTeacherRow, classTeacherName, headTeacherRow, headTeacherName, printSafe });

    doc.end();
  } catch (err) {
    console.error("generateLearnerReport error:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Bulk report download — one merged, multi-page PDF covering every learner
// in a class (grade + stream) or a whole grade (all streams), for a single
// exam. Each learner gets exactly one page (same renderer as the single
// download), concatenated in order. Access control matches the broadsheet:
// admin-tier roles can request any grade/stream; a class teacher can only
// request their own class (enforced by requireStreamAccess on the route
// when a stream is given — see routes/index.js).
// ─────────────────────────────────────────────────────────────────────────
async function generateBulkReport(req, res) {
  try {
    const { examId } = req.params;
    const { grade, stream } = req.query;
    const printSafe = req.query.printSafe === "true" || req.query.printSafe === "1";

    if (!grade) return res.status(400).json({ error: "grade is required" });

    const examRes = await query("SELECT * FROM exams WHERE id = $1", [examId]);
    if (!examRes.rows.length) return res.status(404).json({ error: "Exam not found" });
    const exam = examRes.rows[0];

    const schoolId = req.user.school_id;
    const schoolRes = await query("SELECT * FROM schools WHERE id = $1", [schoolId]);
    const school = schoolRes.rows[0] || {};

    const learnerParams = stream ? [schoolId, grade, stream] : [schoolId, grade];
    const learnerWhere = stream ? "school_id = $1 AND grade = $2 AND stream = $3" : "school_id = $1 AND grade = $2";
    const learnersRes = await query(
      `SELECT * FROM learners WHERE ${learnerWhere} ORDER BY stream, last_name, first_name`,
      learnerParams
    );
    const learners = learnersRes.rows;

    if (!learners.length) {
      return res.status(404).json({ error: "No learners found for that grade/stream" });
    }

    // Batch-fetch scores for every learner in this exam in one query instead
    // of one query per learner, then group them in JS.
    const learnerIds = learners.map((l) => l.id);
    const scoresRes = await query(
      `SELECT learner_id, subject, score, max_score, grade_label, remarks
       FROM scores WHERE exam_id = $1 AND learner_id = ANY($2::uuid[]) ORDER BY subject`,
      [examId, learnerIds]
    );
    const scoresByLearner = {};
    scoresRes.rows.forEach((s) => {
      if (!scoresByLearner[s.learner_id]) scoresByLearner[s.learner_id] = [];
      scoresByLearner[s.learner_id].push(s);
    });

    // Batch rank query, same shape as the single-report one, covering every
    // learner in the grade (not just this bulk selection) so stream_size /
    // overall_size stay correct even when downloading just one stream.
    const rankRes = await query(
      `SELECT l.id AS learner_id,
        RANK() OVER (PARTITION BY l.stream ORDER BY SUM(s.score) DESC) AS stream_rank,
        COUNT(*) OVER (PARTITION BY l.stream) AS stream_size,
        RANK() OVER (ORDER BY SUM(s.score) DESC) AS overall_rank,
        COUNT(*) OVER () AS overall_size
       FROM scores s
       JOIN learners l ON l.id = s.learner_id
       JOIN exams e ON e.id = s.exam_id
       WHERE s.exam_id = $1 AND l.grade = e.grade AND l.school_id = $2
       GROUP BY l.id, l.stream`,
      [examId, schoolId]
    );
    const rankByLearner = {};
    rankRes.rows.forEach((r) => { rankByLearner[r.learner_id] = r; });

    // Cache class-teacher lookups per stream so a whole-grade download with
    // several streams doesn't repeat the same query for every learner.
    const classTeacherCache = {};
    async function getClassTeacherCached(streamValue) {
      const key = grade + "::" + streamValue;
      if (!(key in classTeacherCache)) {
        classTeacherCache[key] = await getClassTeacher(schoolId, grade, streamValue);
      }
      return classTeacherCache[key];
    }

    const headTeacherRow = await getHeadTeacher(schoolId);
    const headTeacherName = headTeacherRow ? `${headTeacherRow.first_name} ${headTeacherRow.last_name}` : null;

    const doc = new PDFDocument({ margin: 40, size: "A4", autoFirstPage: false });
    const scopeLabel = stream ? `${grade}_${stream}` : `${grade}_All`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Report_Cards_${scopeLabel.replace(/\s+/g, "")}.pdf`);
    doc.pipe(res);

    for (const learner of learners) {
      doc.addPage();
      const classTeacherRow = await getClassTeacherCached(learner.stream);
      const classTeacherName = classTeacherRow ? `${classTeacherRow.first_name} ${classTeacherRow.last_name}` : null;

      drawReportPage(doc, {
        learner,
        exam,
        school,
        scores: scoresByLearner[learner.id] || [],
        myRank: rankByLearner[learner.id] || null,
        classTeacherRow,
        classTeacherName,
        headTeacherRow,
        headTeacherName,
        printSafe,
      });
    }

    doc.end();
  } catch (err) {
    console.error("generateBulkReport error:", err.message);
    res.status(500).json({ error: "Failed to generate bulk report" });
  }
}

module.exports = { generateLearnerReport, generateBulkReport };

// ═══════════════════════════════════════════════════════════════════════
// TERM REPORT — the new default report format. Shows Opener / Mid-Term /
// End-Term scores side by side per subject for a whole term, instead of
// one exam at a time. Replaces numeric ranking with a general CBC
// performance level only (ranking stays exclusive to Broadsheet/merit
// list). Auto-generates a short per-subject remark whenever a teacher
// hasn't typed one in. Supports printSafe for black-and-white printers.
// ═══════════════════════════════════════════════════════════════════════

const termIndigo = "#1e2a5e";
const termGold = "#d4a94b";
const termGoldLight = "#f2e2b8";
const termBlue = "#2563eb";
const termGreen = "#16a34a";
const termAmber = "#d97706";
const termRed = "#dc2626";
const termGray = "#64748b";
const termLightGray = "#e2e8f0";
const termCardBg = "#f8fafc";
const termInk = "#0f172a";

// Short, compact per-subject remarks — a smaller, terser sibling of the
// class/head teacher comment banks above, since these sit in a narrow
// table cell rather than a full paragraph.
const SUBJECT_REMARK_BANK = {
  exceptional: "Excellent grasp of concepts",
  very_good: "Very good understanding",
  good: "Good effort shown",
  needs_improvement: "Needs more practice",
  needs_support: "Requires extra support",
};

function autoSubjectRemark(avgPct) {
  return SUBJECT_REMARK_BANK[getPerformanceBand(avgPct)];
}

function performanceColor(pct, printSafe) {
  if (printSafe) return termInk;
  if (pct >= 70) return termGreen;
  if (pct >= 50) return termBlue;
  if (pct >= 40) return termAmber;
  return termRed;
}

function formatDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Fetches this school's Opener / Mid-Term / End-Term exam rows for a given
// grade + term + academic year (any of the three may be missing if that
// exam hasn't been created yet — the report simply shows "—" for it).
async function getTermExams(schoolId, grade, term, academicYear) {
  const res = await query(
    `SELECT * FROM exams
     WHERE school_id = $1 AND grade = $2 AND term = $3 AND academic_year = $4
       AND exam_type IN ('opener', 'midterm', 'end_term')`,
    [schoolId, grade, term, academicYear]
  );
  const byType = {};
  res.rows.forEach((e) => { byType[e.exam_type] = e; });
  return { opener: byType.opener || null, midterm: byType.midterm || null, endTerm: byType.end_term || null };
}

// This term's open/close dates for the header, if the school has set them.
async function getTermDatesRow(schoolId, academicYear, term) {
  const res = await query(
    `SELECT * FROM term_dates WHERE school_id = $1 AND academic_year = $2 AND term = $3`,
    [schoolId, academicYear, term]
  );
  return res.rows[0] || null;
}

// Pulls every score for one learner across the three term exams and pivots
// them into one row per subject: { subject, opener, midterm, endTerm, avgPct, remark }.
async function buildSubjectRows(learnerId, termExams) {
  const examIds = [termExams.opener, termExams.midterm, termExams.endTerm].filter(Boolean).map((e) => e.id);
  if (!examIds.length) return [];

  const res = await query(
    `SELECT s.exam_id, s.subject, s.score, s.max_score, s.grade_label, s.remarks, e.exam_type
     FROM scores s JOIN exams e ON e.id = s.exam_id
     WHERE s.learner_id = $1 AND s.exam_id = ANY($2::uuid[])
     ORDER BY s.subject`,
    [learnerId, examIds]
  );

  const bySubject = {};
  res.rows.forEach((r) => {
    if (!bySubject[r.subject]) bySubject[r.subject] = { subject: r.subject, opener: null, midterm: null, endTerm: null };
    const entry = { score: Number(r.score), max_score: Number(r.max_score), grade_label: r.grade_label, remarks: r.remarks };
    if (r.exam_type === "opener") bySubject[r.subject].opener = entry;
    else if (r.exam_type === "midterm") bySubject[r.subject].midterm = entry;
    else if (r.exam_type === "end_term") bySubject[r.subject].endTerm = entry;
  });

  return Object.values(bySubject).map((row) => {
    const entries = [row.opener, row.midterm, row.endTerm].filter(Boolean);
    const avgPct = entries.length
      ? entries.reduce((sum, e) => sum + (e.score / e.max_score) * 100, 0) / entries.length
      : 0;
    // Prefer a real, manually-typed remark if any subject teacher left one —
    // checked most-recent-exam-first — otherwise auto-generate one from the
    // subject's average this term.
    const manualRemark = (row.endTerm && row.endTerm.remarks) || (row.midterm && row.midterm.remarks) || (row.opener && row.opener.remarks) || null;
    return { ...row, avgPct, remark: manualRemark || autoSubjectRemark(avgPct) };
  }).sort((a, b) => a.subject.localeCompare(b.subject));
}

function drawCrestBadge(doc, x, y, size, initial, printSafe) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  doc.circle(cx, cy, r).fill("#ffffff");
  doc.circle(cx, cy, r).lineWidth(printSafe ? 1.5 : 2).strokeColor(printSafe ? termInk : termGold).stroke();
  doc.circle(cx, cy, r - 4).lineWidth(0.75).strokeColor(printSafe ? termInk : termGold).stroke();
  doc.fillColor(termIndigo).fontSize(r * 0.9).font("Helvetica-Bold")
    .text(initial, x, cy - r * 0.42, { width: size, align: "center" });
}

function scoreCell(doc, entry, x, y, width, printSafe) {
  if (!entry) {
    doc.fillColor("#94a3b8").fontSize(9).font("Helvetica-Oblique").text("\u2014", x, y, { width, align: "center" });
    return;
  }
  doc.fillColor(termInk).fontSize(10).font("Helvetica-Bold").text(String(entry.score), x, y, { width: width * 0.55, align: "right" });
  doc.fillColor(termGray).fontSize(8.5).font("Helvetica").text("/" + entry.max_score, x + width * 0.55, y + 0.5, { width: width * 0.45, align: "left" });
}

function drawTermReportPage(doc, { learner, school, term, academicYear, termDatesRow, subjectRows, classTeacherRow, classTeacherName, classTeacherDesignation, headTeacherRow, headTeacherName, headTeacherDesignation, printSafe }) {
  const pageWidth = doc.page.width - 72;
  const left = 36;

  const headerBg = printSafe ? "#ffffff" : termIndigo;
  const schoolNameColor = printSafe ? termInk : "#ffffff";
  const subtitleColor = printSafe ? termInk : termGoldLight;
  const metaColor = printSafe ? termGray : "#c7cff0";

  const headerHeight = 96;
  doc.rect(0, 0, doc.page.width, headerHeight).fill(headerBg);
  if (printSafe) {
    doc.moveTo(0, headerHeight).lineTo(doc.page.width, headerHeight).lineWidth(1.5).strokeColor(termInk).stroke();
  } else {
    doc.rect(0, headerHeight, doc.page.width, 4).fill(termGold);
  }

  if (school.logo_data) {
    try {
      const logoBuffer = Buffer.from(school.logo_data, "base64");
      doc.image(logoBuffer, left, 20, { fit: [56, 56] });
    } catch (e) {
      drawCrestBadge(doc, left, 20, 56, (school.name || "S").charAt(0).toUpperCase(), printSafe);
    }
  } else {
    drawCrestBadge(doc, left, 20, 56, (school.name || "S").charAt(0).toUpperCase(), printSafe);
  }

  doc.fillColor(schoolNameColor).fontSize(19).font("Helvetica-Bold").text(school.name || "School", 110, 26, { width: pageWidth - 74 });
  doc.fillColor(subtitleColor).fontSize(9).font("Helvetica-Bold").text("TERM PROGRESS REPORT  \u00b7  CBC", 110, 50, { characterSpacing: 1 });

  let termLine = "Opener \u00b7 Mid-Term \u00b7 End-Term  \u2014  Term " + term + ", " + academicYear;
  const openDate = termDatesRow ? formatDate(termDatesRow.open_date) : null;
  const closeDate = termDatesRow ? formatDate(termDatesRow.close_date) : null;
  if (openDate && closeDate) termLine += "  (" + openDate + " \u2013 " + closeDate + ")";
  doc.fillColor(metaColor).fontSize(8).font("Helvetica").text(termLine, 110, 64, { width: pageWidth - 74 });

  doc.y = headerHeight + 20;

  // ---- Info strip ----
  const infoTop = doc.y;
  const infoHeight = 46;
  doc.roundedRect(left, infoTop, pageWidth, infoHeight, 8).fill(termCardBg);
  doc.roundedRect(left, infoTop, pageWidth, infoHeight, 8).lineWidth(0.75).strokeColor(termLightGray).stroke();

  const fields = [
    ["LEARNER", learner.first_name + " " + learner.last_name],
    ["ADM NO.", learner.admission_no],
    ["GRADE / STREAM", (learner.grade || "N/A") + " / " + (learner.stream || "N/A")],
    ["TERM", "Term " + term + ", " + academicYear],
  ];
  const fw = pageWidth / fields.length;
  fields.forEach(([label, value], i) => {
    const fx = left + i * fw + 14;
    doc.fillColor(termGray).fontSize(6.5).font("Helvetica-Bold").text(label, fx, infoTop + 9, { characterSpacing: 0.4 });
    doc.fillColor(termInk).fontSize(10.5).font("Helvetica-Bold").text(value, fx, infoTop + 20, { width: fw - 20 });
  });

  doc.y = infoTop + infoHeight + 18;

  // ---- Score table: Opener / Mid-Term / End-Term + auto/manual remarks ----
  // Column widths sized generously ("enlarge the writings") — subject and
  // remark columns get the most room since they hold the most text.
  const tableTop = doc.y;
  const rowHeight = 25;
  const colSubjectW = 108;
  const colScoreW = 54;
  const colAvgW = 42;
  const colSubject = left;
  const colOpener = colSubject + colSubjectW;
  const colMidterm = colOpener + colScoreW;
  const colEndTerm = colMidterm + colScoreW;
  const colAvg = colEndTerm + colScoreW;
  const colRemarks = colAvg + colAvgW;
  const colRemarksW = left + pageWidth - colRemarks;

  const tableHeaderBg = printSafe ? "#ffffff" : termIndigo;
  const tableHeaderText = printSafe ? termInk : "#ffffff";
  doc.roundedRect(left, tableTop, pageWidth, rowHeight, 6).fill(tableHeaderBg);
  if (printSafe) doc.roundedRect(left, tableTop, pageWidth, rowHeight, 6).lineWidth(1).strokeColor(termInk).stroke();
  doc.fillColor(tableHeaderText).fontSize(8.5).font("Helvetica-Bold");
  doc.text("SUBJECT", colSubject + 10, tableTop + 9);
  doc.text("OPENER", colOpener, tableTop + 9, { width: colScoreW, align: "center" });
  doc.text("MID-TERM", colMidterm, tableTop + 9, { width: colScoreW, align: "center" });
  doc.text("END-TERM", colEndTerm, tableTop + 9, { width: colScoreW, align: "center" });
  doc.text("AVG", colAvg, tableTop + 9, { width: colAvgW, align: "center" });
  doc.text("REMARKS", colRemarks, tableTop + 9, { width: colRemarksW, align: "center" });

  let y = tableTop + rowHeight;
  let sumAvg = 0;
  subjectRows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? termCardBg : "#ffffff";
    doc.rect(left, y, pageWidth, rowHeight).fill(bg);
    doc.fillColor(termInk).fontSize(9.5).font("Helvetica-Bold").text(r.subject, colSubject + 10, y + 7, { width: colSubjectW - 14 });
    scoreCell(doc, r.opener, colOpener, y + 7, colScoreW, printSafe);
    scoreCell(doc, r.midterm, colMidterm, y + 7, colScoreW, printSafe);
    scoreCell(doc, r.endTerm, colEndTerm, y + 7, colScoreW, printSafe);
    doc.fillColor(performanceColor(r.avgPct, printSafe)).fontSize(9.5).font("Helvetica-Bold")
      .text(Math.round(r.avgPct).toString(), colAvg, y + 7, { width: colAvgW, align: "center" });
    doc.fillColor(termGray).fontSize(8).font("Helvetica-Oblique")
      .text(r.remark, colRemarks + 8, y + 7, { width: colRemarksW - 12 });
    sumAvg += r.avgPct;
    y += rowHeight;
  });

  if (!subjectRows.length) {
    doc.rect(left, y, pageWidth, rowHeight).fill(termCardBg);
    doc.fillColor(termGray).fontSize(9).font("Helvetica-Oblique").text("No scores recorded for this term yet.", colSubject + 10, y + 7);
    y += rowHeight;
  }

  doc.roundedRect(left, tableTop, pageWidth, y - tableTop, 6).lineWidth(0.75).strokeColor(termLightGray).stroke();
  [colOpener, colMidterm, colEndTerm, colAvg].forEach((cx) => {
    doc.moveTo(cx, tableTop + rowHeight).lineTo(cx, y).lineWidth(0.5).strokeColor(termLightGray).stroke();
  });

  doc.y = y + 18;

  // ---- Term average + general performance level (NO numeric ranking here
  // by design — ranking is exclusive to Broadsheet / merit list) ----
  const overallAvgPct = subjectRows.length ? sumAvg / subjectRows.length : 0;
  const performanceCode = subjectRows.length ? cbcGrade(overallAvgPct, learner.section) : null;
  const performanceLabel = fullPerformanceLabel(performanceCode);

  const perfTop = doc.y;
  const perfHeight = 50;
  const gap = 12;
  const perfW = (pageWidth - gap) / 2;

  const avgCardBg = printSafe ? "#ffffff" : termIndigo;
  const avgLabelColor = printSafe ? termGray : termGoldLight;
  const avgValueColor = printSafe ? termInk : "#ffffff";
  doc.roundedRect(left, perfTop, perfW, perfHeight, 8).fill(avgCardBg);
  if (printSafe) doc.roundedRect(left, perfTop, perfW, perfHeight, 8).lineWidth(1).strokeColor(termInk).stroke();
  doc.fillColor(avgLabelColor).fontSize(7.5).font("Helvetica-Bold").text("TERM AVERAGE", left + 14, perfTop + 10, { characterSpacing: 0.5 });
  doc.fillColor(avgValueColor).fontSize(20).font("Helvetica-Bold").text(Math.round(overallAvgPct) + "%", left + 14, perfTop + 21);

  const levelX = left + perfW + gap;
  doc.roundedRect(levelX, perfTop, perfW, perfHeight, 8).fill(termCardBg);
  doc.roundedRect(levelX, perfTop, perfW, perfHeight, 8).lineWidth(0.75).strokeColor(termLightGray).stroke();
  doc.fillColor(termGray).fontSize(7.5).font("Helvetica-Bold").text("GENERAL PERFORMANCE LEVEL", levelX + 14, perfTop + 10, { characterSpacing: 0.5 });
  doc.fillColor(printSafe ? termInk : termBlue).fontSize(13).font("Helvetica-Bold")
    .text(performanceLabel || "Not yet graded", levelX + 14, perfTop + 24, { width: perfW - 28 });

  doc.y = perfTop + perfHeight + 16;

  // ---- CBC grading key ----
  const gradingKey = getGradingKey(learner.grade);
  const keyTop = doc.y;
  const chipGap = 5;
  const chipW = (pageWidth - chipGap * (gradingKey.length - 1)) / gradingKey.length;
  doc.fillColor(termGray).fontSize(7.5).font("Helvetica-Bold")
    .text("CBC GRADING KEY  \u00b7  " + (gradingKey.length === 8 ? "JUNIOR SECONDARY" : "PRIMARY"), left, keyTop, { characterSpacing: 0.5 });
  gradingKey.forEach((label, idx) => {
    const x = left + idx * (chipW + chipGap);
    const isActive = performanceCode && label === performanceCode;
    doc.roundedRect(x, keyTop + 13, chipW, 19, 4).fill(isActive ? (printSafe ? termInk : termBlue) : termLightGray);
    doc.fillColor(isActive ? "#ffffff" : termInk).fontSize(8).font("Helvetica-Bold").text(label, x, keyTop + 18, { width: chipW, align: "center" });
  });
  doc.y = keyTop + 42;

  // ---- Comments ----
  const cbH = 36, cbGap = 8;
  const cTop = doc.y;
  function commentBox(label, name, designation, text, y2) {
    const headerLabel = name ? `${label.toUpperCase()} \u2014 ${name.toUpperCase()} (${designation.toUpperCase()})` : label.toUpperCase();
    doc.roundedRect(left, y2, pageWidth, cbH, 8).fill(termCardBg);
    doc.roundedRect(left, y2, pageWidth, cbH, 8).lineWidth(0.5).strokeColor(termLightGray).stroke();
    doc.fillColor(termGray).fontSize(7).font("Helvetica-Bold").text(headerLabel, left + 12, y2 + 7, { characterSpacing: 0.3, width: pageWidth - 24 });
    doc.fillColor(termInk).fontSize(8.5).font("Helvetica").text(text, left + 12, y2 + 18, { width: pageWidth - 24, height: cbH - 22, ellipsis: true });
  }
  commentBox("Class Teacher's Comments", classTeacherName, classTeacherDesignation, generateComment(CLASS_TEACHER_COMMENTS, overallAvgPct, learner.first_name), cTop);
  commentBox("Head Teacher's Comments", headTeacherName, headTeacherDesignation, generateComment(HEAD_TEACHER_COMMENTS, overallAvgPct, learner.first_name), cTop + cbH + cbGap);
  doc.y = cTop + cbH * 2 + cbGap + 12;

  // ---- Signatures: real name + real designation, not a hardcoded label ----
  const sigTop = doc.y;

  function signatureBlock(x, row, name, designation) {
    if (row && row.signature_data) {
      const imgBuffer = Buffer.from(row.signature_data, "base64");
      doc.image(imgBuffer, x, sigTop, { fit: [130, 34] });
      doc.fillColor(termInk).fontSize(9).font("Helvetica-Bold").text(name, x, sigTop + 38);
      doc.fillColor(termGray).fontSize(7.5).font("Helvetica").text(designation, x, sigTop + 49);
    } else {
      doc.moveTo(x, sigTop + 28).lineTo(x + 165, sigTop + 28).strokeColor(termLightGray).lineWidth(1).stroke();
      doc.fillColor(termInk).fontSize(9).font("Helvetica-Bold").text(name || designation, x, sigTop + 33);
      doc.fillColor(termGray).fontSize(7.5).font("Helvetica").text(name ? designation : "Signature & date", x, sigTop + 44);
    }
  }
  signatureBlock(left, classTeacherRow, classTeacherName, classTeacherDesignation);
  signatureBlock(left + pageWidth / 2, headTeacherRow, headTeacherName, headTeacherDesignation);

  // ---- School stamp ----
  if (school.stamp_data) {
    try {
      const stampBuffer = Buffer.from(school.stamp_data, "base64");
      const stampSize = 70;
      doc.opacity(printSafe ? 0.35 : 0.82);
      doc.image(stampBuffer, left + pageWidth / 2 - stampSize / 2, sigTop - 14, { fit: [stampSize, stampSize] });
      doc.opacity(1);
    } catch (e) {
      console.error("Failed to embed school stamp:", e.message);
    }
  }

  // ---- Footer ----
  doc.moveTo(left, doc.page.height - 60).lineTo(left + pageWidth, doc.page.height - 60).strokeColor(termLightGray).lineWidth(0.5).stroke();
  doc.fillColor(termGray).fontSize(6.5).font("Helvetica")
    .text("Generated by EduCore Exam Analyzer \u00b7 " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), left, doc.page.height - 50, { width: pageWidth, align: "center" });
}

async function resolveClassTeacher(schoolId, grade, stream) {
  const row = await getClassTeacher(schoolId, grade, stream);
  return { row, name: row ? `${row.first_name} ${row.last_name}` : null, designation: row ? formatRole(row.role) : "Class Teacher" };
}

async function resolveHeadTeacher(schoolId, signedBy) {
  const row = signedBy ? await getTeacherById(schoolId, signedBy) : await getHeadTeacher(schoolId);
  return { row, name: row ? `${row.first_name} ${row.last_name}` : null, designation: row ? formatRole(row.role) : "Head Teacher" };
}

async function generateTermReport(req, res) {
  try {
    const { learnerId } = req.params;
    const { term, academicYear, signedBy } = req.query;
    const printSafe = req.query.printSafe === "true" || req.query.printSafe === "1";

    if (!term || !academicYear) return res.status(400).json({ error: "term and academicYear are required" });

    const learnerRes = await query("SELECT * FROM learners WHERE id = $1", [learnerId]);
    if (!learnerRes.rows.length) return res.status(404).json({ error: "Learner not found" });
    const learner = learnerRes.rows[0];

    const schoolRes = await query("SELECT * FROM schools WHERE id = $1", [learner.school_id]);
    const school = schoolRes.rows[0] || {};

    const termExams = await getTermExams(learner.school_id, learner.grade, term, academicYear);
    const subjectRows = await buildSubjectRows(learnerId, termExams);
    const termDatesRow = await getTermDatesRow(learner.school_id, academicYear, term);

    const classTeacher = await resolveClassTeacher(learner.school_id, learner.grade, learner.stream);
    const headTeacher = await resolveHeadTeacher(learner.school_id, signedBy);

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report_" + (learner.admission_no || learner.id) + ".pdf");
    doc.pipe(res);

    drawTermReportPage(doc, {
      learner, school, term, academicYear, termDatesRow, subjectRows,
      classTeacherRow: classTeacher.row, classTeacherName: classTeacher.name, classTeacherDesignation: classTeacher.designation,
      headTeacherRow: headTeacher.row, headTeacherName: headTeacher.name, headTeacherDesignation: headTeacher.designation,
      printSafe,
    });

    doc.end();
  } catch (err) {
    console.error("generateTermReport error:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

// Bulk term report — one merged PDF. Scope automatically widens based on
// what's provided: grade+stream = one class, grade only = whole grade
// (admin-tier only, enforced by requireBroadsheetAccess on the route),
// neither = the WHOLE SCHOOL in one download (admin-tier only). This is
// the "automate bulk download" path — the fewer filters you set, the more
// it covers, so a head teacher can pull every report card in the school
// in a single click at the end of term.
async function generateBulkTermReport(req, res) {
  try {
    const { term, academicYear, grade, stream, signedBy } = req.query;
    const printSafe = req.query.printSafe === "true" || req.query.printSafe === "1";
    if (!term || !academicYear) return res.status(400).json({ error: "term and academicYear are required" });

    const schoolId = req.user.school_id;
    const schoolRes = await query("SELECT * FROM schools WHERE id = $1", [schoolId]);
    const school = schoolRes.rows[0] || {};

    let learnerWhere = "school_id = $1";
    const learnerParams = [schoolId];
    if (grade) { learnerParams.push(grade); learnerWhere += ` AND grade = $${learnerParams.length}`; }
    if (stream) { learnerParams.push(stream); learnerWhere += ` AND stream = $${learnerParams.length}`; }

    const learnersRes = await query(
      `SELECT * FROM learners WHERE ${learnerWhere} ORDER BY grade, stream, last_name, first_name`,
      learnerParams
    );
    const learners = learnersRes.rows;
    if (!learners.length) return res.status(404).json({ error: "No learners found for that selection" });

    const headTeacher = await resolveHeadTeacher(schoolId, signedBy);

    // Cache per (grade, stream) lookups so a whole-school run doesn't repeat
    // the same exam/class-teacher/term-dates queries per learner.
    const termExamsCache = {};
    const classTeacherCache = {};
    const termDatesCache = {};

    async function getTermExamsCached(g) {
      if (!(g in termExamsCache)) termExamsCache[g] = await getTermExams(schoolId, g, term, academicYear);
      return termExamsCache[g];
    }
    async function getClassTeacherCached(g, s) {
      const key = g + "::" + s;
      if (!(key in classTeacherCache)) classTeacherCache[key] = await resolveClassTeacher(schoolId, g, s);
      return classTeacherCache[key];
    }
    async function getTermDatesCached() {
      if (!("_" in termDatesCache)) termDatesCache["_"] = await getTermDatesRow(schoolId, academicYear, term);
      return termDatesCache["_"];
    }

    const doc = new PDFDocument({ margin: 36, size: "A4", autoFirstPage: false });
    const scopeLabel = grade ? (stream ? `${grade}_${stream}` : `${grade}_All`) : "WholeSchool";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Report_Cards_${scopeLabel.replace(/\s+/g, "")}_Term${term}.pdf`);
    doc.pipe(res);

    const termDatesRow = await getTermDatesCached();

    for (const learner of learners) {
      doc.addPage();
      const termExams = await getTermExamsCached(learner.grade);
      const subjectRows = await buildSubjectRows(learner.id, termExams);
      const classTeacher = await getClassTeacherCached(learner.grade, learner.stream);

      drawTermReportPage(doc, {
        learner, school, term, academicYear, termDatesRow, subjectRows,
        classTeacherRow: classTeacher.row, classTeacherName: classTeacher.name, classTeacherDesignation: classTeacher.designation,
        headTeacherRow: headTeacher.row, headTeacherName: headTeacher.name, headTeacherDesignation: headTeacher.designation,
        printSafe,
      });
    }

    doc.end();
  } catch (err) {
    console.error("generateBulkTermReport error:", err.message);
    res.status(500).json({ error: "Failed to generate bulk report" });
  }
}

module.exports.generateTermReport = generateTermReport;
module.exports.generateBulkTermReport = generateBulkTermReport;
