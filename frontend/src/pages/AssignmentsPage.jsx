import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { learnersAPI, assignmentsAPI } from "../utils/api";
import toast from "react-hot-toast";

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [allLearners, setAllLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    loadAssignments();
    learnersAPI.getAll().then(res => {
      setAllLearners(res.data.learners || res.data || []);
    }).catch(() => {});
  }, []);

  const loadAssignments = () => {
    setLoading(true);
    assignmentsAPI.getAll().then(res => {
      setAssignments(res.data.assignments || []);
    }).catch(() => {
      toast.error("Failed to load assignments");
    }).finally(() => setLoading(false));
  };

  const grades = useMemo(
    () => [...new Set(allLearners.map(l => l.grade).filter(Boolean))].sort(),
    [allLearners]
  );
  const streams = useMemo(
    () => [...new Set(allLearners.filter(l => l.grade === grade).map(l => l.stream).filter(Boolean))].sort(),
    [allLearners, grade]
  );
  const subjects = useMemo(
    () => ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE", "Creative Arts", "Agriculture"],
    []
  );

  const handleCreate = async () => {
    if (!subject || !grade || !title || !dueDate) {
      toast.error("Subject, grade, title, and due date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await assignmentsAPI.create({ subject, grade, stream: stream || undefined, title, description, dueDate });
      toast.success(`Assignment created for ${res.data.learnersAssigned} learner(s)`);
      setShowForm(false);
      setSubject(""); setGrade(""); setStream(""); setTitle(""); setDescription(""); setDueDate("");
      loadAssignments();
    } catch (err) {
      toast.error("Failed to create assignment");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const boxStyle = { padding: "20px", borderRadius: "10px", background: "#1e293b", marginBottom: "20px" };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", color: "#cbd5e1" };
  const inputStyle = { padding: "8px", borderRadius: "6px", marginRight: "12px", marginBottom: "12px", background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", width: "100%", maxWidth: "260px" };
  const buttonStyle = { padding: "10px 16px", borderRadius: "6px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 };

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#e2e8f0" }}>Assignments</h1>
        <button onClick={() => setShowForm(s => !s)} style={buttonStyle}>
          {showForm ? "Cancel" : "+ New Assignment"}
        </button>
      </div>

      {showForm && (
        <div style={boxStyle}>
          <label style={labelStyle}>Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={labelStyle}>Grade</label>
          <select value={grade} onChange={e => { setGrade(e.target.value); setStream(""); }} style={inputStyle}>
            <option value="">Select grade</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <label style={labelStyle}>Stream (optional)</label>
          <select value={stream} onChange={e => setStream(e.target.value)} style={inputStyle}>
            <option value="">All streams</option>
            {streams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={labelStyle}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Chapter 4 Exercises" />

          <label style={labelStyle}>Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, maxWidth: "500px", minHeight: "70px" }} />

          <label style={labelStyle}>Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />

          <div>
            <button onClick={handleCreate} disabled={saving} style={buttonStyle}>
              {saving ? "Creating..." : "Create Assignment"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading...</p>
      ) : assignments.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No assignments yet. Click "+ New Assignment" to create one.</p>
      ) : (
        <div style={boxStyle}>
          {assignments.map(a => (
            <div
              key={a.id}
              onClick={() => navigate(`/assignments/${a.id}`)}
              style={{ padding: "14px 0", borderBottom: "1px solid #334155", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{a.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    {a.subject} - {a.grade}{a.stream ? ` ${a.stream}` : ""} - Due {a.due_date?.split("T")[0]}
                  </div>
                </div>
                <div style={{ color: "#60a5fa", fontSize: "13px", fontWeight: 600 }}>
                  {a.total_responded}/{a.total_learners} responded
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
