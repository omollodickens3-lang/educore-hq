import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("educore_token");
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || e.message || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  getStreamRanking: (p = {}) => apiFetch("/exams/stream-ranking?" + new URLSearchParams(p)),
  getLearnerRanking: (p = {}) => apiFetch("/exams/learner-ranking?" + new URLSearchParams(p)),
  getSubjectRankingByStream: (p = {}) => apiFetch("/exams/subject-ranking-by-stream?" + new URLSearchParams(p)),
};

const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const SUBJECTS = ["Mathematics","English","Kiswahili","Science","Social Studies","Religious Education","Creative Arts","Physical Education","Agriculture","Home Science","Business Studies","Life Skills","Indigenous Languages"];
const THIS_YEAR = new Date().getFullYear();

const GRADE_COLORS = {
  ee: { bg: "#ECFDF5", text: "#065F46" },
  me: { bg: "#EFF6FF", text: "#1E40AF" },
  ae: { bg: "#FFFBEB", text: "#92400E" },
  be: { bg: "#FEF2F2", text: "#991B1B" },
};

const styles = {
  page: { padding: 24, fontFamily: "inherit", background: "#0B0F19", minHeight: "100vh", color: "#E5E7EB" },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#F9FAFB" },
  subheader: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" },
  select: { background: "#111827", border: "1px solid #1F2937", color: "#E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  section: { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#F9FAFB" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", color: "#9CA3AF", fontWeight: 600, borderBottom: "1px solid #1F2937", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "10px", borderBottom: "1px solid #1F2937" },
  rankBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "#1F2937", fontSize: 12, fontWeight: 700 },
  gradeBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, marginRight: 4 },
  empty: { color: "#6B7280", fontSize: 13, padding: "16px 0", textAlign: "center" },
  error: { color: "#DC2626", background: "#1F1315", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

function GradeBadge({ label, count, colorKey }) {
  if (!count || count === "0") return null;
  const c = GRADE_COLORS[colorKey];
  return <span style={{ ...styles.gradeBadge, background: c.bg, color: c.text }}>{label}: {count}</span>;
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({ grade: "Grade 7", term: "2", academicYear: `${THIS_YEAR}/${THIS_YEAR + 1}`, subject: "", stream: "" });
  const [streamRanking, setStreamRanking] = useState([]);
  const [learnerRanking, setLearnerRanking] = useState([]);
  const [subjectRanking, setSubjectRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  async function load() {
    if (!filters.grade || !filters.term) return;
    setLoading(true);
    setErr("");
    try {
      const params = { grade: filters.grade, term: filters.term, academicYear: filters.academicYear };
      if (filters.subject) params.subject = filters.subject;
      if (filters.stream) params.stream = filters.stream;

      const [sr, lr] = await Promise.all([
        api.getStreamRanking(params),
        api.getLearnerRanking(params),
      ]);
      setStreamRanking(sr.streamRanking || []);
      setLearnerRanking(lr.learnerRanking || []);
      if (filters.stream) {
        const sub = await api.getSubjectRankingByStream(params);
        setSubjectRanking(sub.subjectRanking || []);
      } else {
        setSubjectRanking([]);
      }
    } catch (e) {
      setErr(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters.grade, filters.term, filters.academicYear, filters.subject, filters.stream]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>📊 Analytics</div>
      <div style={styles.subheader}>Stream and learner performance comparison, powered by your exam scores.</div>

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
            const v = `${y}/${y + 1}`;
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>
        <select style={styles.select} value={filters.subject} onChange={(e) => set("subject", e.target.value)}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input
          style={styles.select}
          placeholder="Stream (optional, e.g. A)"
          value={filters.stream}
          onChange={(e) => set("stream", e.target.value)}
        />
      </div>

      {err && <div style={styles.error}>Could not load analytics: {err}</div>}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Stream Ranking {filters.subject ? `— ${filters.subject}` : "— All Subjects"}</div>
        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : streamRanking.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Stream</th>
                <th style={styles.th}>Avg Score</th>
                <th style={styles.th}>Learners Marked</th>
                <th style={styles.th}>Grade Distribution</th>
              </tr>
            </thead>
            <tbody>
              {streamRanking.map((row) => (
                <tr key={row.stream}>
                  <td style={styles.td}><span style={styles.rankBadge}>{row.rank}</span></td>
                  <td style={styles.td}>{row.stream || "—"}</td>
                  <td style={styles.td}>{row.avg_score}%</td>
                  <td style={styles.td}>{row.learners_marked}</td>
                  <td style={styles.td}>
                    <GradeBadge label="EE" count={row.ee_count} colorKey="ee" />
                    <GradeBadge label="ME" count={row.me_count} colorKey="me" />
                    <GradeBadge label="AE" count={row.ae_count} colorKey="ae" />
                    <GradeBadge label="BE" count={row.be_count} colorKey="be" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Subject Ranking by Stream {filters.stream ? `— Stream ${filters.stream}` : "(select a stream above)"}</div>
        {!filters.stream ? (
          <div style={styles.empty}>Enter a stream above to see subject-by-subject ranking.</div>
        ) : loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : subjectRanking.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Avg Score</th>
                <th style={styles.th}>Learners Marked</th>
                <th style={styles.th}>Grade Distribution</th>
                <th style={styles.th}>Subject Teacher</th>
              </tr>
            </thead>
            <tbody>
              {subjectRanking.map((row) => (
                <tr key={row.subject}>
                  <td style={styles.td}><span style={styles.rankBadge}>{row.rank}</span></td>
                  <td style={styles.td}>{row.subject}</td>
                  <td style={styles.td}>{row.avg_score}%</td>
                  <td style={styles.td}>{row.learners_marked}</td>
                  <td style={styles.td}>
                    <GradeBadge label="EE" count={row.ee_count} colorKey="ee" />
                    <GradeBadge label="ME" count={row.me_count} colorKey="me" />
                    <GradeBadge label="AE" count={row.ae_count} colorKey="ae" />
                    <GradeBadge label="BE" count={row.be_count} colorKey="be" />
                  </td>
                  <td style={styles.td}>{row.subject_teacher || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Learner Ranking (Position in Class) {filters.subject ? `— ${filters.subject}` : "— All Subjects"}</div>
        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : learnerRanking.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Position</th>
                <th style={styles.th}>Learner</th>
                <th style={styles.th}>Adm. No</th>
                <th style={styles.th}>Stream</th>
                <th style={styles.th}>Avg Score</th>
                <th style={styles.th}>Subjects Marked</th>
              </tr>
            </thead>
            <tbody>
              {learnerRanking.map((row) => (
                <tr key={row.learner_id}>
                  <td style={styles.td}><span style={styles.rankBadge}>{row.rank}</span></td>
                  <td style={styles.td}>{row.first_name} {row.last_name}</td>
                  <td style={styles.td}>{row.admission_no}</td>
                  <td style={styles.td}>{row.stream || "—"}</td>
                  <td style={styles.td}>{row.avg_score}%</td>
                  <td style={styles.td}>{row.subjects_marked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
