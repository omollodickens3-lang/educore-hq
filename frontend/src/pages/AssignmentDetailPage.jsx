import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assignmentsAPI } from "../utils/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "#94a3b8", bg: "transparent" },
  { value: "submitted", label: "Submitted", color: "#1e40af", bg: "#dbeafe" },
  { value: "graded", label: "Graded", color: "#166534", bg: "#dcfce7" },
];

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = () => {
    setLoading(true);
    assignmentsAPI.getById(id).then(res => {
      setAssignment(res.data.assignment);
      setRoster(res.data.roster || []);
      const d = {};
      (res.data.roster || []).forEach(r => {
        d[r.submission_id] = { grade: r.grade || "", feedback: r.feedback || "" };
      });
      setDrafts(d);
    }).catch(() => {
      toast.error("Failed to load assignment");
    }).finally(() => setLoading(false));
  };

  const setDraft = (submissionId, field, value) => {
    setDrafts(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], [field]: value } }));
  };

  const handleStatusChange = async (submissionId, status) => {
    setSavingId(submissionId);
    try {
      const draft = drafts[submissionId] || {};
      await assignmentsAPI.updateSubmission(submissionId, { status, grade: draft.grade, feedback: draft.feedback });
      toast.success("Updated");
      loadDetail();
    } catch (err) {
      toast.error("Failed to update");
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveGrade = async (submissionId, currentStatus) => {
    setSavingId(submissionId);
    try {
      const draft = drafts[submissionId] || {};
      const nextStatus = currentStatus === "pending" ? "submitted" : currentStatus;
      await assignmentsAPI.updateSubmission(submissionId, { status: nextStatus, grade: draft.grade, feedback: draft.feedback });
      toast.success("Saved");
      loadDetail();
    } catch (err) {
      toast.error("Failed to save");
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const boxStyle = { padding: "20px", borderRadius: "10px", background: "#1e293b", marginBottom: "20px" };
  const inputStyle = { padding: "6px 8px", borderRadius: "6px", background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", fontSize: "13px" };

  if (loading) return <div style={{ padding: "24px", color: "#94a3b8" }}>Loading...</div>;
  if (!assignment) return <div style={{ padding: "24px", color: "#94a3b8" }}>Assignment not found.</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "950px" }}>
      <button onClick={() => navigate("/assignments")} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", marginBottom: "16px", fontSize: "13px" }}>
        ← Back to Assignments
      </button>

      <div style={boxStyle}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#e2e8f0", marginBottom: "6px" }}>{assignment.title}</h1>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>
          {assignment.subject} - {assignment.grade}{assignment.stream ? ` ${assignment.stream}` : ""} - Due {assignment.due_date?.split("T")[0]}
        </div>
        {assignment.description && (
          <div style={{ color: "#cbd5e1", fontSize: "13px", marginTop: "10px" }}>{assignment.description}</div>
        )}
      </div>

      <div style={boxStyle}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px", color: "#e2e8f0" }}>
          {roster.length} Learner{roster.length !== 1 ? "s" : ""}
        </h2>
        {roster.map(r => (
          <div key={r.submission_id} style={{ padding: "14px 0", borderBottom: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#e2e8f0", fontSize: "14px" }}>
                {r.first_name} {r.last_name} ({r.admission_no})
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {STATUS_OPTIONS.map(opt => {
                  const active = r.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(r.submission_id, opt.value)}
                      disabled={savingId === r.submission_id}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: active ? `2px solid ${opt.color}` : "1px solid #334155",
                        background: active ? opt.bg : "transparent",
                        color: active ? opt.color : "#94a3b8",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                placeholder="Grade (e.g. 85 or A)"
                value={drafts[r.submission_id]?.grade || ""}
                onChange={e => setDraft(r.submission_id, "grade", e.target.value)}
                style={{ ...inputStyle, width: "140px" }}
              />
              <input
                placeholder="Feedback (optional)"
                value={drafts[r.submission_id]?.feedback || ""}
                onChange={e => setDraft(r.submission_id, "feedback", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => handleSaveGrade(r.submission_id, r.status)}
                disabled={savingId === r.submission_id}
                style={{ padding: "6px 12px", borderRadius: "6px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
