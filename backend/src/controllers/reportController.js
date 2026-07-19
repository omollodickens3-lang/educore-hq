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

    let teacher = null;
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
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report_" + (learner.admission_no || learner.id) + ".pdf");
    doc.pipe(res);

    const navy = "#0f172a";
    const blue = "#2563eb";
    const gray = "#64748b";
    const lightGray = "#e2e8f0";
    const pageWidth = doc.page.width - 80; // minus margins

    // ---- Header ----
    doc.fillColor(navy).fontSize(20).font("Helvetica-Bold")
      .text(school.name || "School", 40, 40, { align: "center", width: pageWidth });
    doc.fillColor(gray).fontSize(10).font("Helvetica")
      .text("STUDENT ACADEMIC REPORT \u00b7 CBC", { align: "center", width: pageWidth });

    doc.moveTo(40, doc.y + 10).lineTo(40 + pageWidth, doc.y + 10).strokeColor(lightGray).lineWidth(1).stroke();
    doc.moveDown(1.5);

    // ---- Info block (two columns) ----
    const infoTop = doc.y;
    const colWidth = pageWidth / 2;

    function infoField(label, value, x, y) {
      doc.fillColor(gray).fontSize(8).font("Helvetica-Bold").text(label.toUpperCase(), x, y, { width: colWidth - 20 });
      doc.fillColor(navy).fontSize(12).font("Helvetica-Bold").text(value || "N/A", x, y + 12, { width: colWidth - 20 });
    }

    infoField("Learner", learner.first_name + " " + learner.last_name, 40, infoTop);
    infoField("Exam", exam.name, 40 + colWidth, infoTop);

    infoField("Admission No", learner.admission_no, 40, infoTop + 40);
    infoField("Exam Type", exam.exam_type || "-", 40 + colWidth, infoTop + 40);

    infoField("Grade / Stream", (learner.grade || "N/A") + " / " + (learner.stream || "N/A"), 40, infoTop + 80);
    infoField("Term / Year", "Term " + exam.term + " \u00b7 " + exam.academic_year, 40 + colWidth, infoTop + 80);

    doc.y = infoTop + 130;
    doc.moveDown(0.5);

    // ---- Score table ----
    const tableTop = doc.y;
    const rowHeight = 24;
    const col = { subject: 40, score: 40 + pageWidth * 0.38, grade: 40 + pageWidth * 0.55, remarks: 40 + pageWidth * 0.68 };

    doc.rect(40, tableTop, pageWidth, rowHeight).fill(navy);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("SUBJECT", col.subject + 8, tableTop + 7);
    doc.text("SCORE", col.score, tableTop + 7);
    doc.text("GRADE", col.grade, tableTop + 7);
    doc.text("REMARKS", col.remarks, tableTop + 7, { width: 40 + pageWidth - col.remarks - 8 });

    let y = tableTop + rowHeight;
    let totalScore = 0;
    let totalMax = 0;

    scores.forEach(function (s, idx) {
      const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.rect(40, y, pageWidth, rowHeight).fill(bg);
      doc.fillColor(navy).fontSize(9).font("Helvetica");
      doc.text(s.subject, col.subject + 8, y + 7, { width: col.score - col.subject - 16 });
      doc.text(s.score + "/" + s.max_score, col.score, y + 7);
      doc.font("Helvetica-Bold").text(s.grade_label || "-", col.grade, y + 7);
      doc.font("Helvetica").fontSize(8).text(s.remarks || "-", col.remarks, y + 7, { width: 40 + pageWidth - col.remarks - 8 });
      totalScore += Number(s.score);
      totalMax += Number(s.max_score);
      y += rowHeight;
    });

    doc.rect(40, tableTop, pageWidth, y - tableTop).strokeColor(lightGray).lineWidth(1).stroke();

    doc.y = y + 20;

    // ---- Overall performance ----
    const meanPct = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) : 0;
    const overallGrade = scores.length === 1 ? (scores[0].grade_label || "-") : null;

    doc.fillColor(gray).fontSize(8).font("Helvetica-Bold").text("OVERALL PERFORMANCE", 40, doc.y);
    doc.fillColor(navy).fontSize(14).font("Helvetica-Bold")
      .text(totalScore + "/" + totalMax + " (" + meanPct + "%)" + (overallGrade ? "   " + overallGrade : ""), 40, doc.y + 12);

    doc.moveDown(2.5);

    // ---- CBC grading key strip ----
    const gradingKey = getGradingKey(learner.grade);
    const achievedGrade = overallGrade;
    const keyTop = doc.y;
    const chipWidth = pageWidth / gradingKey.length;

    doc.fillColor(gray).fontSize(8).font("Helvetica-Bold")
      .text("CBC GRADING KEY (" + (gradingKey.length === 8 ? "JUNIOR SECONDARY" : "PRIMARY") + ")", 40, keyTop);

    gradingKey.forEach(function (label, idx) {
      const x = 40 + idx * chipWidth;
      const isActive = achievedGrade && label === achievedGrade;
      doc.rect(x, keyTop + 14, chipWidth - 4, 24).fill(isActive ? blue : lightGray);
      doc.fillColor(isActive ? "#ffffff" : navy).fontSize(9).font("Helvetica-Bold")
        .text(label, x, keyTop + 21, { width: chipWidth - 4, align: "center" });
    });

    doc.y = keyTop + 50;
    doc.moveDown(2);

    // ---- Signatures (side by side) ----
    const sigTop = doc.y;
    const sigColWidth = pageWidth / 2;

    function signatureBlock(label, x, teacherData) {
      if (teacherData && teacherData.signature_data) {
        const imgBuffer = Buffer.from(teacherData.signature_data, "base64");
        doc.image(imgBuffer, x, sigTop, { fit: [140, 45], align: "left" });
        doc.fillColor(navy).fontSize(9).font("Helvetica-Bold")
          .text(teacherData.first_name + " " + teacherData.last_name, x, sigTop + 50);
        doc.fillColor(gray).fontSize(8).font("Helvetica").text(label, x, sigTop + 62);
      } else {
        doc.moveTo(x, sigTop + 40).lineTo(x + 160, sigTop + 40).strokeColor(lightGray).lineWidth(1).stroke();
        doc.fillColor(gray).fontSize(8).font("Helvetica").text(label, x, sigTop + 45);
        doc.fontSize(7).text("Signature & date", x, sigTop + 57);
      }
    }

    signatureBlock("Class Teacher", 40, null);
    signatureBlock("Head Teacher", 40 + sigColWidth, teacher);

    doc.y = sigTop + 90;

    // ---- Footer ----
    doc.fillColor(gray).fontSize(7).font("Helvetica")
      .text("Generated by EduCore Exam Analyzer on " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        40, doc.page.height - 60, { width: pageWidth, align: "center" });

    doc.end();
  } catch (err) {
    console.error("generateLearnerReport error:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

module.exports = { generateLearnerReport };
