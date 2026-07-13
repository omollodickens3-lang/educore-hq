import { useState, useEffect } from "react";
import { learnersAPI, conductAPI } from "../utils/api";
import toast from "react-hot-toast";

export default function ConductPage() {
  const [allLearners, setAllLearners] = useState([]);
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [learnerId, setLearnerId] = useState("");
  const [type, setType] = useState("positive");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    learnersAPI.getAll().then(res => {
      setAllLearners(res.data.learners || res.data || []);
    }).catch(() => {});
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLoading(true);
    conductAPI.getAll().then(res => {
      setLogs(res.data.logs || []);
      setCategories(res.data.categories || []);
    }).catch(() => {
      toast.error("Failed to load conduct logs");
    }).finally(() => setLoading(false));
  };

  const handleSubmit = async () => {
    if (!learnerId || !description) {
      toast.error("Learner and description are required");
      return;
    }
    setSaving(true);
    try {
      const res = await conductAPI.create({ learnerId, type, category: category || undefined, description });
      const notifStatus = res.data.notification?.status;
      if (notifStatus === "sent") {
        toast.success("Logged and parent notified");
      } else if (notifStatus === "failed") {
        toast.error("Logged, but parent notification failed");
      } else {
        toast.success("Logged (no parent phone on file)");
      }
      setLearnerId(""); setCategory(""); setDescription(""); setType("positive");
      loadLogs();
    } catch (err) {
      toast.error("Failed to log conduct");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const boxStyle = { padding: "20px", borderRadius: "10px", background: "#1e293b", marginBottom: "20px" };
  const labelStyle = { display: "block", marginBottom: "6px", fontSize: "13px", color: "#cbd5e1" };
  const inputStyle = { padding: "8px", borderRadius: "6px", marginBottom: "12px", background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", width: "100%", maxWidth: "320px" };
  const buttonStyle = { padding: "10px 16px", borderRadius: "6px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 };

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#e2e8f0", marginBottom: "20px" }}>Conduct Log</h1>

      <div style={boxStyle}>
        <label style={labelStyle}>Learner</label>
        <select value={learnerId} onChange={e => setLearnerId(e.target.value)} style={inputStyle}>
          <option value="">Select learner</option>
          {allLearners.map(l => (
            <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.admission_no})</option>
          ))}
        </select>

        <div style={{ marginBottom: "12px" }}>
          <button
            onClick={() => setType("positive")}
            style={{ padding: "8px 14px", borderRadius: "6px", marginRight: "8px", border: type === "positive" ? "2px solid #166534" : "1px solid #334155", background: type === "positive" ? "#dcfce7" : "transparent", color: type === "positive" ? "#166534" : "#94a3b8", cursor: "pointer", fontWeight: 600 }}
          >
            Positive
          </button>
          <button
            onClick={() => setType("concern")}
            style={{ padding: "8px 14px", borderRadius: "6px", border: type === "concern" ? "2px solid #dc2626" : "1px solid #334155", background: type === "concern" ? "#fee2e2" : "transparent", color: type === "concern" ? "#dc2626" : "#94a3b8", cursor: "pointer", fontWeight: 600 }}
          >
            Concern
          </button>
        </div>

        <label style={labelStyle}>Category (optional)</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">No category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, maxWidth: "500px", minHeight: "70px" }} placeholder="What happened?" />

        <div>
          <button onClick={handleSubmit} disabled={saving} style={buttonStyle}>
            {saving ? "Logging..." : "Log & Notify Parent"}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No conduct logs yet.</p>
      ) : (
        <div style={boxStyle}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px", color: "#e2e8f0" }}>Recent Logs</h2>
          {logs.map(log => (
            <div key={log.id} style={{ padding: "12px 0", borderBottom: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>
                  {log.first_name} {log.last_name} ({log.admission_no})
                </span>
                <span style={{
                  fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px",
                  color: log.type === "positive" ? "#166534" : "#dc2626",
                  background: log.type === "positive" ? "#dcfce7" : "#fee2e2",
                }}>
                  {log.type === "positive" ? "Positive" : "Concern"}
                </span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
                {log.category ? `${log.category} - ` : ""}{log.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
