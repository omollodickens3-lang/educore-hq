const PDFDocument = require("pdfkit");
const { query } = require("../config/db");

// CBC grading bands: Primary (PP1-Grade 6) uses 4 levels, Junior Secondary (Grade 7-9) uses 8 levels
function getGradingKey(gradeLabel) {
  const grade = String(gradeLabel || "").match(/\d+/);
  const gradeNum = grade ? parseInt(grade[0], 10) : null;
  if (gradeNum && gradeNum >= 7) {
    return ["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"];
  }
  return ["EE", "ME", "AE", "BE"];
}

// Turns "subject_teacher" / "head_teacher" / "class_teacher" into "Subject Teacher" etc.
function formatRole(role) {
  if (!role) return "Teacher";
  return role
    .split("_")
    .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
    .join(" ");
}

async function generateLearnerReport(req, res) {
  try {
    const { learnerId, examId } = req.params;
    const signedBy = req.query.signedBy;

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

    // "teacher" is whoever is actually signing this report — either the person the
    // caller explicitly picked (signedBy), or a head-teacher fallback if none was picked.
    // Their displayed title must reflect their ACTUAL role, never assume Head Teacher.
    let teacher = null;
    let teacherIsFallbackHead = false;
    if (signedBy) {
      const t = await query("SELECT * FROM teachers WHERE id = $1 AND school_id = $2", [signedBy, learner.school_id]);
      teacher = t.rows[0] || null;
    }
    if (!teacher) {
      const t = await query(
        "SELECT * FROM teachers WHERE school_id = $1 AND role ILIKE $2 LIMIT 1",
        [learner.school_id, "%head%"]
      );
      teacher = t.rows[0] || null;
      teacherIsFallbackHead = !!teacher;
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report_" + (learner.admission_no || learner.id) + ".pdf");
    doc.pipe(res);

    const navy = "#0f172a";
    const blue = "#2563eb";
    const lightBlue = "#eff6ff";
    const gray = "#64748b";
    const lightGray = "#e2e8f0";
    const cardBg = "#f8fafc";
    const pageWidth = doc.page.width - 80; // minus margins

    // ---- Top accent bar ----
    doc.rect(0, 0, doc.page.width, 6).fill(blue);

    // ---- Header ----
    doc.fillColor(navy).fontSize(21).font("Helvetica-Bold")
      .text(school.name || "School", 40, 34, { align: "center", width: pageWidth });
    doc.fillColor(blue).fontSize(9).font("Helvetica-Bold")
      .text("STUDENT ACADEMIC REPORT  \u00b7  CBC", { align: "center", width: pageWidth, characterSpacing: 1 });

    doc.moveDown(1.2);
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).strokeColor(lightGray).lineWidth(1).stroke();
    doc.moveDown(1);

    // ---- Info card (two columns, rounded card background) ----
    const infoTop = doc.y;
    const infoHeight = 116;
    const colWidth = pageWidth / 2;

    doc.roundedRect(40, infoTop, pageWidth, infoHeight, 8).fill(cardBg);

    function infoField(label, value, x, y) {
      doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
        .text(label.toUpperCase(), x, y, { width: colWidth - 40, characterSpacing: 0.5 });
      doc.fillColor(navy).fontSize(12).font("Helvetica-Bold").text(value || "N/A", x, y + 12, { width: colWidth - 40 });
    }

    const pad = 20;
    infoField("Learner", learner.first_name + " " + learner.last_name, 40 + pad, infoTop + pad);
    infoField("Exam", exam.name, 40 + colWidth, infoTop + pad);

    infoField("Admission No", learner.admission_no, 40 + pad, infoTop + pad + 36);
    infoField("Exam Type", exam.exam_type || "-", 40 + colWidth, infoTop + pad + 36);

    infoField("Grade / Stream", (learner.grade || "N/A") + " / " + (learner.stream || "N/A"), 40 + pad, infoTop + pad + 72);
    infoField("Term / Year", "Term " + exam.term + "  \u00b7  " + exam.academic_year, 40 + colWidth, infoTop + pad + 72);

    doc.y = infoTop + infoHeight + 24;

    // ---- Score table ----
    const tableTop = doc.y;
    const rowHeight = 26;
    const col = { subject: 40, score: 40 + pageWidth * 0.38, grade: 40 + pageWidth * 0.55, remarks: 40 + pageWidth * 0.68 };

    doc.roundedRect(40, tableTop, pageWidth, rowHeight, 6).fill(navy);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("SUBJECT", col.subject + 10, tableTop + 8);
    doc.text("SCORE", col.score, tableTop + 8);
    doc.text("GRADE", col.grade, tableTop + 8);
    doc.text("REMARKS", col.remarks, tableTop + 8, { width: 40 + pageWidth - col.remarks - 10 });

    let y = tableTop + rowHeight;
    let totalScore = 0;
    let totalMax = 0;

    scores.forEach(function (s, idx) {
      const bg = idx % 2 === 0 ? cardBg : "#ffffff";
      doc.rect(40, y, pageWidth, rowHeight).fill(bg);
      doc.fillColor(navy).fontSize(9).font("Helvetica");
      doc.text(s.subject, col.subject + 10, y + 8, { width: col.score - col.subject - 18 });
      doc.text(s.score + "/" + s.max_score, col.score, y + 8);
      doc.fillColor(blue).font("Helvetica-Bold").text(s.grade_label || "-", col.grade, y + 8);
      doc.fillColor(navy).font("Helvetica").fontSize(8).text(s.remarks || "-", col.remarks, y + 8, { width: 40 + pageWidth - col.remarks - 10 });
      totalScore += Number(s.score);
      totalMax += Number(s.max_score);
      y += rowHeight;
    });

    if (!scores.length) {
      doc.rect(40, y, pageWidth, rowHeight).fill(cardBg);
      doc.fillColor(gray).fontSize(9).font("Helvetica-Oblique")
        .text("No scores recorded for this exam yet.", col.subject + 10, y + 8);
      y += rowHeight;
    }

    doc.roundedRect(40, tableTop, pageWidth, y - tableTop, 6).strokeColor(lightGray).lineWidth(1).stroke();

    doc.y = y + 24;

    // ---- Overall performance (highlighted card) ----
    const meanPct = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) : "0.0";
    const overallGrade = scores.length === 1 ? (scores[0].grade_label || "-") : null;
    const perfTop = doc.y;
    const perfHeight = 54;

    doc.roundedRect(40, perfTop, pageWidth, perfHeight, 8).fill(lightBlue);
    doc.fillColor(gray).fontSize(7.5).font("Helvetica-Bold")
      .text("OVERALL PERFORMANCE", 40 + pad, perfTop + 12, { characterSpacing: 0.5 });
    doc.fillColor(navy).fontSize(16).font("Helvetica-Bold")
      .text(totalScore + "/" + totalMax + "  (" + meanPct + "%)" + (overallGrade ? "   \u00b7   " + overallGrade : ""), 40 + pad, perfTop + 26);

    doc.y = perfTop + perfHeight + 26;

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
      doc.roundedRect(x, keyTop + 16, chipWidth, 26, 5).fill(isActive ? blue : lightGray);
      doc.fillColor(isActive ? "#ffffff" : navy).fontSize(9).font("Helvetica-Bold")
        .text(label, x, keyTop + 24, { width: chipWidth, align: "center" });
    });

    doc.y = keyTop + 60;

    // ---- Signatures (side by side) ----
    const sigTop = doc.y;
    const sigColWidth = pageWidth / 2;

    // Left: class teacher line — always a blank signature line, filled in by hand.
    doc.moveTo(40, sigTop + 40).lineTo(40 + 170, sigTop + 40).strokeColor(lightGray).lineWidth(1).stroke();
    doc.fillColor(navy).fontSize(9).font("Helvetica-Bold").text("Class Teacher", 40, sigTop + 46);
    doc.fillColor(gray).fontSize(7.5).font("Helvetica").text("Signature & date", 40, sigTop + 58);

    // Right: whoever actually signed (teacher), labeled with their REAL role — never
    // assumed to be Head Teacher just because that's the fallback lookup.
    const rightX = 40 + sigColWidth;
    if (teacher && teacher.signature_data) {
      const imgBuffer = Buffer.from(teacher.signature_data, "base64");
      doc.image(imgBuffer, rightX, sigTop, { fit: [150, 45], align: "left" });
      doc.fillColor(navy).fontSize(9).font("Helvetica-Bold")
        .text(teacher.first_name + " " + teacher.last_name, rightX, sigTop + 50);
      doc.fillColor(gray).fontSize(7.5).font("Helvetica").text(formatRole(teacher.role), rightX, sigTop + 62);
    } else {
      doc.moveTo(rightX, sigTop + 40).lineTo(rightX + 170, sigTop + 40).strokeColor(lightGray).lineWidth(1).stroke();
      doc.fillColor(navy).fontSize(9).font("Helvetica-Bold")
        .text(teacher ? formatRole(teacher.role) : "Head Teacher", rightX, sigTop + 46);
      doc.fillColor(gray).fontSize(7.5).font("Helvetica").text("Signature & date", rightX, sigTop + 58);
    }

    doc.y = sigTop + 90;

    // ---- Footer ----
    doc.moveTo(40, doc.page.height - 70).lineTo(40 + pageWidth, doc.page.height - 70).strokeColor(lightGray).lineWidth(1).stroke();
    doc.fillColor(gray).fontSize(7).font("Helvetica")
      .text("Generated by EduCore Exam Analyzer on " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        40, doc.page.height - 58, { width: pageWidth, align: "center" });

    doc.end();
  } catch (err) {
    console.error("generateLearnerReport error:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

module.exports = { generateLearnerReport };
