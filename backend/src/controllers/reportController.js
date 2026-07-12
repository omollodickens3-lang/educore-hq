const PDFDocument = require("pdfkit");
const { query } = require("../config/db");

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

    doc.fontSize(18).text(school.name || "School Report", { align: "center" });
    doc.fontSize(10).text((school.county || "") + (school.sub_county ? " - " + school.sub_county : ""), { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text("Learner Report Card", { align: "center", underline: true });
    doc.moveDown();

    doc.fontSize(11);
    doc.text("Name: " + learner.first_name + " " + learner.last_name);
    doc.text("Admission No: " + (learner.admission_no || "N/A"));
    doc.text("Grade: " + (learner.grade || "N/A") + "    Stream: " + (learner.stream || "N/A"));
    doc.text("Exam: " + exam.name + " (" + (exam.exam_type || "") + ")");
    doc.text("Term: " + exam.term + "    Academic Year: " + exam.academic_year);
    doc.moveDown();

    const tableTop = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Subject", 40, tableTop, { width: 150 });
    doc.text("Score", 200, tableTop, { width: 70 });
    doc.text("Grade", 280, tableTop, { width: 70 });
    doc.text("Remarks", 360, tableTop, { width: 180 });
    doc.font("Helvetica");

    let y = tableTop + 20;
    let totalScore = 0;
    let totalMax = 0;
    scores.forEach(function (s) {
      doc.text(s.subject, 40, y, { width: 150 });
      doc.text(s.score + "/" + s.max_score, 200, y, { width: 70 });
      doc.text(s.grade_label || "-", 280, y, { width: 70 });
      doc.text(s.remarks || "-", 360, y, { width: 180 });
      totalScore += Number(s.score);
      totalMax += Number(s.max_score);
      y += 20;
    });

    doc.moveDown(2);
    const meanPct = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) : 0;
    doc.font("Helvetica-Bold").text("Overall: " + totalScore + "/" + totalMax + "  (" + meanPct + "%)", 40, y + 10);

    doc.moveDown(3);

    if (teacher && teacher.signature_data) {
      const imgBuffer = Buffer.from(teacher.signature_data, "base64");
      const sigY = doc.y;
      doc.image(imgBuffer, 40, sigY, { fit: [140, 55], align: "left" });
      doc.text(teacher.first_name + " " + teacher.last_name, 40, sigY + 60);
      doc.text(teacher.role || "Teacher", 40, sigY + 75);
    } else {
      doc.text("_____________________", 40, doc.y);
      doc.text("Head Teacher / Class Teacher", 40, doc.y + 15);
    }

    doc.end();
  } catch (err) {
    console.error("generateLearnerReport error:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

module.exports = { generateLearnerReport };

