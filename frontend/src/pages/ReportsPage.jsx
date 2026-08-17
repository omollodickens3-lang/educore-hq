import { useState, useEffect } from "react";
import { learnersAPI, examsAPI, teachersAPI, reportsAPI, classesAPI } from "../utils/api";
import toast from "react-hot-toast";

const GRADES = ["Grade 7", "Grade 8", "Grade 9"];

export default function ReportsPage() {
  const [learners, setLearners] = useState([]);
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);

  // ---- Single learner term report ----
  const [learnerId, setLearnerId] = useState("");
  const [termKey, setTermKey] = useState(""); // "term::academicYear"
  const [teacherId, setTeacherId] = useState("");
  const [printSafe, setPrintSafe] = useState(true);
  const [loading, setLoading] = useState(false);

  // ---- Bulk term report ----
  const [bulkTermKey, setBulkTermKey] = useState("");
  const [bulkScope, setBulkScope] = useState("class"); // 'class' | 'grade' | 'school'
  const [bulkGrade, setBulkGrade] = useState("");
  const [bulkStream, setBulkStream] = useState("");
  const [bulkTeacherId, setBulkTeacherId] = useState("");
  const [bulkPrintSafe, setBulkPrintSafe] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [sigTeacherId, setSigTeacherId] = useState("");
  const [sigFile, setSigFile] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);

  const loadTeachers = () => {
    teachersAPI.getAll().then(res => setTeachers(res.data.teachers || res.data || [])).catch(() => {});
  };

  useEffect(() => {
    learnersAPI.getAll().then(res => setLearners(res.data.learners || res.data || [])).catch(() => {});
    examsAPI.getAll().then(res => setExams(res.data.exams || res.data || [])).catch(() => {});
    classesAPI.getAll().then(res => setClasses(res.data || [])).catch(() => {});
    loadTeachers();
  }, []);

  // Every distinct Term + Academic Year combination that actually has exams
  // recorded, newest first — this drives both the single and bulk Term
  // dropdowns instead of picking one exam at a time.
  const termYearOptions = Object.values(
    exams.reduce((acc, e) => {
      const key = `${e.term}::${e.academic_year}`;
      if (!acc[key]) acc[key] = { key, term: e.term, academicYear: e.academic_year };
      return acc;
    }, {})
  ).sort((a, b) => b.academicYear.localeCompare(a.academicYear) || String(b.term).localeCompare(String(a.term)));

  // Real streams that exist for the currently selected bulk grade, derived
  // from Manage Classes — not a hardcoded guess, since schools name streams
  // anything (letters, house names, etc).
  const streamsForBulkGrade = classes
    .filter(c => c.grade === bulkGrade)
    .map(c => c.stream)
    .filter((s, i, arr) => s && arr.indexOf(s) === i);

  const handleDownload = async () => {
    if (!learnerId || !termKey) {
      toast.error("Please select a learner and a term");
      return;
    }
    const [term, academicYear] = termKey.split("::");
    setLoading(true);
    try {
      const res = await reportsAPI.downloadTerm(learnerId, term, academicYear, teacherId || undefined, printSafe);
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
      toast.error(err.response?.data?.error || "Failed to generate report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (!bulkTermKey) {
      toast.error("Please select a term");
      return;
    }
    if (bulkScope !== "school" && !bulkGrade) {
      toast.error("Please select a grade");
      return;
    }
    if (bulkScope === "class" && !bulkStream) {
      toast.error("Please select a stream");
      return;
    }
    const [term, academicYear] = bulkTermKey.split("::");
    const grade = bulkScope === "school" ? undefined : bulkGrade;
    const stream = bulkScope === "class" ? bulkStream : undefined;

    setBulkLoading(true);
    try {
      const res = await reportsAPI.downloadTermBulk(term, academicYear, grade, stream, bulkTeacherId || undefined, bulkPrintSafe);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const scopeLabel = bulkScope === "school" ? "WholeSchool" : bulkScope === "grade" ? `${grade}_All` : `${grade}_${stream}`;
      a.download = `Report_Cards_${scopeLabel.replace(/\s+/g, "")}_Term${term}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report cards downloaded");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate bulk report";
      toast.error(msg);
      console.error(err);
    } finally {
      setBulkLoading(false);
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
  const checkLabelStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#cbd5e1", marginBottom: "14px" };
  const scopeRowStyle = { display: "flex", gap: "16px", marginBottom: "14px", flexWrap: "wrap" };
  const scopeOptionStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#cbd5e1" };

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
              {t.first_name} {t.last_name} ({t.role}) {t.signature_data ? "\u2713 has signature" : ""}
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
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px", color: "#e2e8f0" }}>
          Bulk Download Report Cards
        </h2>
        <p style={{ fontSize: "12.5px", color: "#94a3b8", marginBottom: "14px" }}>
          One merged PDF, one page per learner &mdash; Opener, Mid-Term and End-Term scores
          side by side. Pick the widest scope you need: a single class, a whole grade, or
          (for admins) the whole school in one download.
        </p>

        <label style={labelStyle}>Term</label>
        <select value={bulkTermKey} onChange={e => setBulkTermKey(e.target.value)} style={selectStyle}>
          <option value="">Select term</option>
          {termYearOptions.map(t => (
            <option key={t.key} value={t.key}>Term {t.term} &middot; {t.academicYear}</option>
          ))}
        </select>

        <label style={labelStyle}>Scope</label>
        <div style={scopeRowStyle}>
          <label style={scopeOptionStyle}>
            <input type="radio" name="bulkScope" checked={bulkScope === "class"} onChange={() => setBulkScope("class")} />
            One class
          </label>
          <label style={scopeOptionStyle}>
            <input type="radio" name="bulkScope" checked={bulkScope === "grade"} onChange={() => setBulkScope("grade")} />
            Whole grade
          </label>
          <label style={scopeOptionStyle}>
            <input type="radio" name="bulkScope" checked={bulkScope === "school"} onChange={() => setBulkScope("school")} />
            Whole school (admin only)
          </label>
        </div>

        {bulkScope !== "school" && (
          <>
            <label style={labelStyle}>Grade</label>
            <select value={bulkGrade} onChange={e => { setBulkGrade(e.target.value); setBulkStream(""); }} style={selectStyle}>
              <option value="">Select grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </>
        )}

        {bulkScope === "class" && (
          <>
            <label style={labelStyle}>Stream</label>
            {bulkGrade && streamsForBulkGrade.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: "#f87171", marginBottom: "14px" }}>
                No classes found for {bulkGrade} in Manage Classes yet &mdash; add one there first,
                or choose "Whole grade" instead.
              </p>
            ) : (
              <select value={bulkStream} onChange={e => setBulkStream(e.target.value)} style={selectStyle} disabled={!bulkGrade}>
                <option value="">{bulkGrade ? "Select stream" : "Select a grade first"}</option>
                {streamsForBulkGrade.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </>
        )}

        <label style={labelStyle}>Sign as Head Teacher (optional, defaults to the school's Head Teacher)</label>
        <select value={bulkTeacherId} onChange={e => setBulkTeacherId(e.target.value)} style={selectStyle}>
          <option value="">Default (Head Teacher)</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.role})</option>
          ))}
        </select>

        <label style={checkLabelStyle}>
          <input type="checkbox" checked={bulkPrintSafe} onChange={e => setBulkPrintSafe(e.target.checked)} />
          Black &amp; white print-friendly (clear header background, no color reliance)
        </label>

        <button onClick={handleBulkDownload} disabled={bulkLoading} style={buttonStyle}>
          {bulkLoading ? "Generating..." : "Download Report Cards"}
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

        <label style={labelStyle}>Term</label>
        <select value={termKey} onChange={e => setTermKey(e.target.value)} style={selectStyle}>
          <option value="">Select term</option>
          {termYearOptions.map(t => (
            <option key={t.key} value={t.key}>Term {t.term} &middot; {t.academicYear}</option>
          ))}
        </select>

        <label style={labelStyle}>Sign as Head Teacher (optional, defaults to the school's Head Teacher)</label>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={selectStyle}>
          <option value="">Default (Head Teacher)</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name} ({t.role})
            </option>
          ))}
        </select>

        <label style={checkLabelStyle}>
          <input type="checkbox" checked={printSafe} onChange={e => setPrintSafe(e.target.checked)} />
          Black &amp; white print-friendly (clear header background, no color reliance)
        </label>

        <button onClick={handleDownload} disabled={loading} style={buttonStyle}>
          {loading ? "Generating..." : "Download Report"}
        </button>
      </div>
    </div>
  );
}
