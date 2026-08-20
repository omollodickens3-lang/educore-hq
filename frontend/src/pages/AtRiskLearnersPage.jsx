import { useState, useEffect } from "react";
import { learnersAPI, classesAPI } from "../utils/api";
import toast from "react-hot-toast";

const GRADES = ["Grade 7", "Grade 8", "Grade 9"];

const FLAG_META = {
  attendance: { icon: "\ud83d\udcc5", label: "Attendance" },
  scores: { icon: "\ud83d\udcc9", label: "Score Decline" },
  conduct: { icon: "\u26a0\ufe0f", label: "Conduct" },
};

function riskColor(score) {
  if (score >= 3) return { bg: "#450a0a", border: "#7f1d1d", text: "#fca5a5", label: "Urgent" };
  if (score === 2) return { bg: "#451a03", border: "#78350f", text: "#fdba74", label: "Watch Closely" };
  return { bg: "#422006", border: "#713f12", text: "#fde68a", label: "Keep an Eye On" };
}

export default function AtRiskLearnersPage() {
  const [classes, setClasses] = useState([]);
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [wholeSchool, setWholeSchool] = useState(false);
  const [atRisk, setAtRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    classesAPI.getAll().then(res => setClasses(res.data || [])).catch(() => {});
  }, []);

  const streamsForGrade = classes
    .filter(c => c.grade === grade)
    .map(c => c.stream)
    .filter((s, i, arr) => s && arr.indexOf(s) === i);

  async function handleCheck() {
    if (!wholeSchool && !grade) {
      toast.error("Select a grade, or check 'Whole school' if you're an admin");
      return;
    }
    if (!wholeSchool && !stream) {
      toast.error("Select a stream");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (!wholeSchool) {
        params.grade = grade;
        params.stream = stream;
      }
      const res = await learnersAPI.getAtRisk(params);
      setAtRisk(res.data.atRisk || []);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load at-risk learners");
      setAtRisk(null);
    } finally {
      setLoading(false);
    }
  }

  const boxStyle = { padding: "20px", borderRadius: "10px", background: "#1e293b", marginBottom: "24px" };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", color: "#cbd5e1" };
  const selectStyle = {
    width: "100%", padding: "8px", borderRadius: "6px", marginBottom: "14px",
    background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155",
  };
  const buttonStyle = {
    padding: "10px 16px", borderRadius: "6px", background: "#2563eb", color: "#fff",
    border: "none", cursor: "pointer", fontWeight: 600,
  };

  return (
    <div style={{ padding: "24px", maxWidth: "760px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#e2e8f0" }}>
        At-Risk Learners
      </h1>
      <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
        Cross-references attendance, exam score trends, and conduct logs to surface learners
        showing more than one warning sign at once &mdash; not just a single bad day.
      </p>

      <div style={boxStyle}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <input type="checkbox" checked={wholeSchool} onChange={e => setWholeSchool(e.target.checked)} />
          Whole school (admin only)
        </label>

        {!wholeSchool && (
          <>
            <label style={labelStyle}>Grade</label>
            <select value={grade} onChange={e => { setGrade(e.target.value); setStream(""); }} style={selectStyle}>
              <option value="">Select grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <label style={labelStyle}>Stream</label>
            <select value={stream} onChange={e => setStream(e.target.value)} style={selectStyle} disabled={!grade}>
              <option value="">{grade ? "Select stream" : "Select a grade first"}</option>
              {streamsForGrade.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <button onClick={handleCheck} disabled={loading} style={buttonStyle}>
          {loading ? "Checking..." : "Check At-Risk Learners"}
        </button>
      </div>

      {err && (
        <div style={{ ...boxStyle, border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: "13px" }}>{err}</div>
      )}

      {atRisk && atRisk.length === 0 && (
        <div style={{ ...boxStyle, textAlign: "center", color: "#4ade80" }}>
          No learners currently show multiple warning signs in this selection. 🎉
        </div>
      )}

      {atRisk && atRisk.length > 0 && (
        <div>
          {atRisk.map((r) => {
            const colors = riskColor(r.riskScore);
            return (
              <div key={r.learner.id} style={{
                padding: "16px 18px", borderRadius: "10px", background: colors.bg,
                border: `1px solid ${colors.border}`, marginBottom: "12px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "15px" }}>
                      {r.learner.first_name} {r.learner.last_name}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "12px", marginLeft: "8px" }}>
                      {r.learner.admission_no} &middot; {r.learner.grade} / {r.learner.stream}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: colors.text,
                    border: `1px solid ${colors.border}`, borderRadius: "999px", padding: "3px 10px",
                  }}>{colors.label}</span>
                </div>
                {r.flags.map((f, i) => (
                  <div key={i} style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "4px" }}>
                    <span style={{ marginRight: "6px" }}>{FLAG_META[f.type]?.icon}</span>
                    <strong>{FLAG_META[f.type]?.label}:</strong> {f.detail}
                  </div>
                ))}
                {(r.learner.parent_name || r.learner.parent_phone) && (
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                    Parent: {r.learner.parent_name || "—"} {r.learner.parent_phone ? `(${r.learner.parent_phone})` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
