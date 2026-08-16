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
    `SELECT t.first_name, t.last_name, t.signature_data
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
    `SELECT first_name, last_name, signature_data FROM teachers
     WHERE school_id = $1 AND (role ILIKE '%head%' OR role = 'admin')
     ORDER BY (role ILIKE '%head%') DESC LIMIT 1`,
    [schoolId]
  );
  return res.rows[0] || null;
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
