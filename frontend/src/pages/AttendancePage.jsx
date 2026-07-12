import { useState, useEffect, useMemo } from "react";
import { learnersAPI, attendanceAPI } from "../utils/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "P", label: "Present", color: "#166534", bg: "#dcfce7" },
  { value: "A", label: "Absent", color: "#dc2626", bg: "#fee2e2" },
  { value: "L", label: "Late", color: "#92400e", bg: "#fef3c7" },
  { value: "E", label: "Excused", color: "#1e40af", bg: "#dbeafe" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function AttendancePage() {
  const [allLearners, setAllLearners] = useState([]);
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [date, setDate] = useState(todayStr());
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    learnersAPI.getAll().then(res => {
      setAllLearners(res.data.learners || res.data || []);
    }).catch(() => {});
    attendanceAPI.getAlerts().then(res => {
      setAlerts(res.data.absentToday || []);
    }).catch(() => {});
  }, []);

  const grades = useMemo(
    () => [...new Set(allLearners.map(l => l.grade).filter(Boolean))].sort(),
    [allLearners]
  );
  const streams = useMemo(
    () => [...new Set(allLearners.filter(l => l.grade === grade).map(l => l.stream).filter(Boolean))].sort(),
    [allLearners, grade]
  );
  const filteredLearners = useMemo(
    () => allLearners.filter(l => (!grade || l.grade === grade) && (!stream || l.stream === stream)),
    [allLearners, grade, stream]
  );

  const handleLoadRegister = async () => {
    if (!grade || !date) {
      toast.error("Please select a grade and date");
      return;
    }
    setLoading(true);
    try {
      const res = await attendanceAPI.getAttendance({ grade, stream: stream || undefined, date });
      const records = res.data.records || [];
      const map = {};
      filteredLearners.forEach(l => { map[l.id] = "P"; });
      records.forEach(r => { map[r.learner_id] = r.status; });
      setStatuses(map);
      setLoaded(true);
      toast.success("Register loaded");
    } catch (err) {
      toast.error("Failed to load register");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (learnerId, status) => {
    setStatuses(prev => ({ ...prev, [learnerId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = filteredLearners.map(l => ({
        learnerId: l.id,
        status: statuses[l.id] || "P",
      }));
      const res = await attendanceAPI.markBulk({ records, date, session: "AM" });
      toast.success(res.data.message || "Attendance saved");
      attendanceAPI.getAlerts().then(r => setAlerts(r.data.absentToday || [])).catch(() => {});
    } catch (err) {
      toast.error("Failed to save attendance");
      console.error(err);
    } finally {
      setSaving(false);
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
    padding: "8px",
    borderRadius: "6px",
    marginRight: "12px",
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
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px", color: "#e2e8f0" }}>
        Attendance Register
      </h1>

      {alerts.length > 0 && (
        <div style={{ ...boxStyle, background: "#7f1d1d" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px", color: "#fecaca" }}>
            Absent Today ({alerts.length})
          </h2>
          {alerts.map(a => (
            <div key={a.id} style={{ fontSize: "13px", color: "#fecaca", marginBottom: "4px" }}>
              {a.first_name} {a.last_name} - {a.grade} {a.stream}
              {a.parent_phone ? ` - Parent: ${a.parent_phone}` : ""}
            </div>
          ))}
        </div>
      )}

      <div style={boxStyle}>
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Grade</label>
          <select value={grade} onChange={e => { setGrade(e.target.value); setStream(""); setLoaded(false); }} style={selectStyle}>
            <option value="">Select grade</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <label style={labelStyle}>Stream (optional)</label>
          <select value={stream} onChange={e => { setStream(e.target.value); setLoaded(false); }} style={selectStyle}>
            <option value="">All streams</option>
            {streams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setLoaded(false); }}
            style={selectStyle}
          />
        </div>
        <button onClick={handleLoadRegister} disabled={loading} style={buttonStyle}>
          {loading ? "Loading..." : "Load Register"}
        </button>
      </div>

      {loaded && (
        <div style={boxStyle}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px", color: "#e2e8f0" }}>
            {filteredLearners.length} Learner{filteredLearners.length !== 1 ? "s" : ""} - {date}
          </h2>
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {filteredLearners.map(l => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #334155",
                }}
              >
                <span style={{ color: "#e2e8f0", fontSize: "14px" }}>
                  {l.first_name} {l.last_name} ({l.admission_no})
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {STATUS_OPTIONS.map(opt => {
                    const active = statuses[l.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(l.id, opt.value)}
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
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle, marginTop: "16px" }}>
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
