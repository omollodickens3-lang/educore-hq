import { useState, useEffect } from "react";
import { learnersAPI, examsAPI, teachersAPI, reportsAPI } from "../utils/api";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [learners, setLearners] = useState([]);
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [learnerId, setLearnerId] = useState("");
  const [examId, setExamId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  const [sigTeacherId, setSigTeacherId] = useState("");
  const [sigFile, setSigFile] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);

  const loadTeachers = () => {
    teachersAPI.getAll().then(res => setTeachers(res.data.teachers || res.data || [])).catch(() => {});
  };

  useEffect(() => {
    learnersAPI.getAll().then(res => setLearners(res.data.learners || res.data || [])).catch(() => {});
    examsAPI.getAll().then(res => setExams(res.data.exams || res.data || [])).catch(() => {});
    loadTeachers();
  }, []);

  const handleDownload = async () => {
    if (!learnerId || !examId) {
      toast.error("Please select a learner and an exam");
      return;
    }
    setLoading(true);
    try {
      const res = await reportsAPI.download(learnerId, examId, teacherId || undefined);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err) {
      toast.error("Failed to generate report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = async () => {
    if (!sigTeacherId || !sigFile) {
      toast.error("Please select a teacher and a signature image");
      return;
    }
    setSigLoading(true);
    try {
      await teachersAPI.uploadSignature(sigTeacherId, sigFile);
      toast.success("Signature uploaded");
      setSigFile(null);
      loadTeachers();
    } catch (err) {
      toast.error("Failed to upload signature");
      console.error(err);
    } finally {
      setSigLoading(false);
    }
  };

  const boxStyle = {
    padding: "20px",
    borderRadius: "10px",
    background: "#1e293b",
    marginBottom: "24px",
  };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", color: "#cbd5e1" };
  const selectStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    marginBottom: "14px",
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1px solid #334155",
  };
  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: "6px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div style={{ padding: "24px", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px", color: "#e2e8f0" }}>
        Report Forms
      </h1>

      <div style={boxStyle}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px", color: "#e2e8f0" }}>
          Upload Teacher Signature
        </h2>
        <label style={labelStyle}>Teacher</label>
        <select value={sigTeacherId} onChange={e => setSigTeacherId(e.target.value)} style={selectStyle}>
          <option value="">Select teacher</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name} ({t.role}) {t.signature_data ? "? has signature" : ""}
            </option>
          ))}
        </select>
        <label style={labelStyle}>Signature Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setSigFile(e.target.files[0])}
          style={{ marginBottom: "14px", color: "#e2e8f0" }}
        />
        <br />
        <button onClick={handleSignatureUpload} disabled={sigLoading} style={buttonStyle}>
          {sigLoading ? "Uploading..." : "Upload Signature"}
        </button>
      </div>

      <div style={boxStyle}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px", color: "#e2e8f0" }}>
          Generate Learner Report
        </h2>
        <label style={labelStyle}>Learner</label>
        <select value={learnerId} onChange={e => setLearnerId(e.target.value)} style={selectStyle}>
          <option value="">Select learner</option>
          {learners.map(l => (
            <option key={l.id} value={l.id}>
              {l.first_name} {l.last_name} ({l.admission_no})
            </option>
          ))}
        </select>

        <label style={labelStyle}>Exam</label>
        <select value={examId} onChange={e => setExamId(e.target.value)} style={selectStyle}>
          <option value="">Select exam</option>
          {exams.map(e => (
            <option key={e.id} value={e.id}>
              {e.name} - Term {e.term} ({e.academic_year})
            </option>
          ))}
        </select>

        <label style={labelStyle}>Sign as (optional, defaults to Head Teacher)</label>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={selectStyle}>
          <option value="">Default (Head Teacher)</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name} ({t.role})
            </option>
          ))}
        </select>

        <button onClick={handleDownload} disabled={loading} style={buttonStyle}>
          {loading ? "Generating..." : "Download Report"}
        </button>
      </div>
    </div>
  );
}
