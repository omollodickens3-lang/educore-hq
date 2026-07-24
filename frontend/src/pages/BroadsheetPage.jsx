import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("educore_token");
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || e.message || ("HTTP " + res.status));
  }
  return res.json();
}

const api = {
  getBroadsheet: (p = {}) => apiFetch("/exams/broadsheet?" + new URLSearchParams(p)),
};

const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const EXAM_TYPES = [{v:"cat",l:"CAT"},{v:"opener",l:"Opener"},{v:"midterm",l:"Mid Term"},{v:"end_term",l:"End Term"}];
const THIS_YEAR = new Date().getFullYear();

const styles = {
  page: { padding: 24, fontFamily: "inherit", color: "#0f172a" },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#0f172a" },
  subheader: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" },
  select: { background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  section: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20, overflowX: "auto", position: "relative" },
  scrollHint: { textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 10, display: "none" },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" },
  td: { padding: "10px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", color: "#0f172a" },
  rankBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0", fontSize: 12, fontWeight: 700, color: "#0f172a" },
  empty: { color: "#94a3b8", fontSize: 13, padding: "16px 0", textAlign: "center" },
  error: { color: "#dc2626", background: "#fef2f2", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

export default function BroadsheetPage() {
  const [filters, setFilters] = useState({ grade: "Grade 7", term: "2", academicYear: (THIS_YEAR - 1) + "/" + THIS_YEAR, stream: "A", examType: "end_term" });
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function load() {
    if (!filters.grade || !filters.term || !filters.stream || !filters.examType) return;
    setLoading(true);
    setErr("");
    try {
      const params = { grade: filters.grade, term: filters.term, academicYear: filters.academicYear, stream: filters.stream, examType: filters.examType };
      const data = await api.getBroadsheet(params);
      setSubjects(data.subjects || []);
      setRows(data.broadsheet || []);
    } catch (e) {
      setErr(e.message || "Failed to load broadsheet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters.grade, filters.term, filters.academicYear, filters.stream, filters.examType]);

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          .ec-scroll-hint { display: block !important; }
        }
      `}</style>
      <div style={styles.header}>Broadsheet</div>
      <div style={styles.subheader}>All-subject scores per learner for one class, with totals and rank.</div>

      <div style={styles.filterBar}>
        <select style={styles.select} value={filters.grade} onChange={(e) => set("grade", e.target.value)}>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select style={styles.select} value={filters.term} onChange={(e) => set("term", e.target.value)}>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
        <select style={styles.select} value={filters.academicYear} onChange={(e) => set("academicYear", e.target.value)}>
          {[0, -1, -2].map((offset) => {
            const y = THIS_YEAR + offset;
            const v = y + "/" + (y + 1);
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>
        <input
          style={styles.select}
          placeholder="Stream (e.g. A)"
          value={filters.stream}
          onChange={(e) => set("stream", e.target.value)}
        />
        <select style={styles.select} value={filters.examType} onChange={(e) => set("examType", e.target.value)}>
          {EXAM_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>

      {err && <div style={styles.error}>Could not load broadsheet: {err}</div>}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          {filters.grade} Stream {filters.stream || "-"} - Term {filters.term} {filters.academicYear} - {EXAM_TYPES.find(t => t.v === filters.examType)?.l || filters.examType}
        </div>
        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Learner</th>
                <th style={styles.th}>Adm. No</th>
                {subjects.map((s) => <th key={s} style={styles.th}>{s}</th>)}
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Average</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.learner_id}>
                  <td style={styles.td}><span style={styles.rankBadge}>{row.rank}</span></td>
                  <td style={styles.td}>{row.first_name} {row.last_name}</td>
                  <td style={styles.td}>{row.admission_no}</td>
                  {subjects.map((s) => (
                    <td key={s} style={styles.td}>
                      {row.subjects[s] ? (row.subjects[s].score + " (" + row.subjects[s].grade_label + ")") : "-"}
                    </td>
                  ))}
                  <td style={styles.td}>{row.total}</td>
                  <td style={styles.td}>{row.average}%</td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
        {rows.length > 0 && (
          <div className="ec-scroll-hint" style={styles.scrollHint}>← Swipe to see all columns →</div>
        )}
      </div>
    </div>
  );
}