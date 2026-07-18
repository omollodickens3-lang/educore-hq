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
const THIS_YEAR = new Date().getFullYear();

const styles = {
  page: { padding: 24, fontFamily: "inherit", background: "#0B0F19", minHeight: "100vh", color: "#E5E7EB" },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#F9FAFB" },
  subheader: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" },
  select: { background: "#111827", border: "1px solid #1F2937", color: "#E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  section: { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 20, marginBottom: 20, overflowX: "auto", position: "relative" },
  scrollHint: { textAlign: "center", fontSize: 11, color: "#6B7280", marginTop: 10, display: "none" },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#F9FAFB" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", color: "#9CA3AF", fontWeight: 600, borderBottom: "1px solid #1F2937", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" },
  td: { padding: "10px", borderBottom: "1px solid #1F2937", whiteSpace: "nowrap" },
  rankBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "#1F2937", fontSize: 12, fontWeight: 700 },
  empty: { color: "#6B7280", fontSize: 13, padding: "16px 0", textAlign: "center" },
  error: { color: "#DC2626", background: "#1F1315", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

export default function BroadsheetPage() {
  const [filters, setFilters] = useState({ grade: "Grade 7", term: "2", academicYear: (THIS_YEAR - 1) + "/" + THIS_YEAR, stream: "A" });
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function load() {
    if (!filters.grade || !filters.term || !filters.stream) return;
    setLoading(true);
    setErr("");
    try {
      const params = { grade: filters.grade, term: filters.term, academicYear: filters.academicYear, stream: filters.stream };
      const data = await api.getBroadsheet(params);
      setSubjects(data.subjects || []);
      setRows(data.broadsheet || []);
    } catch (e) {
      setErr(e.message || "Failed to load broadsheet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters.grade, filters.term, filters.academicYear, filters.stream]);

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
      </div>

      {err && <div style={styles.error}>Could not load broadsheet: {err}</div>}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          {filters.grade} Stream {filters.stream || "-"} - Term {filters.term} {filters.academicYear}
        </div>
        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
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
        )}
        {rows.length > 0 && (
          <div className="ec-scroll-hint" style={styles.scrollHint}>← Swipe to see all columns →</div>
        )}
      </div>
    </div>
  );
}
