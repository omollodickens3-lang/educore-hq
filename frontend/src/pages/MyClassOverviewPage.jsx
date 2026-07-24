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
  getMyClass: () => apiFetch("/classes/mine"),
  getLearnerRanking: (p = {}) => apiFetch("/exams/learner-ranking?" + new URLSearchParams(p)),
  getStreamRanking: (p = {}) => apiFetch("/exams/stream-ranking?" + new URLSearchParams(p)),
};

const THIS_YEAR = new Date().getFullYear();
const TERMS = [{ v: "1", l: "Term 1" }, { v: "2", l: "Term 2" }, { v: "3", l: "Term 3" }];
const EXAM_TYPES = [{ v: "", l: "All Exam Types" }, { v: "cat", l: "CAT" }, { v: "opener", l: "Opener" }, { v: "midterm", l: "Mid Term" }, { v: "end_term", l: "End Term" }];

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
  empty: { color: "#6B7280", fontSize: 13, padding: "16px 0", textAlign: "center" },
  error: { color: "#DC2626", background: "#1F1315", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

export default function MyClassOverviewPage() {
  const [myClasses, setMyClasses] = useState(null); // null = loading, [] = none assigned
  const [activeClass, setActiveClass] = useState(null);
  const [filters, setFilters] = useState({ term: "2", academicYear: `${THIS_YEAR}/${THIS_YEAR + 1}`, examType: "" });
  const [roster, setRoster] = useState([]);
  const [streamComparison, setStreamComparison] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.getMyClass()
      .then((data) => {
        const list = data.classes || [];
        setMyClasses(list);
        if (list.length) setActiveClass(list[0]);
      })
      .catch((e) => { setErr(e.message); setMyClasses([]); });
  }, []);

  async function load() {
    if (!activeClass || !filters.term) return;
    setLoading(true);
    setErr("");
    try {
      const rosterParams = { grade: activeClass.grade, stream: activeClass.stream, term: filters.term, academicYear: filters.academicYear };
      const streamParams = { grade: activeClass.grade, term: filters.term, academicYear: filters.academicYear };
      if (filters.examType) { rosterParams.examType = filters.examType; streamParams.examType = filters.examType; }

      const [rosterData, streamData] = await Promise.all([
        api.getLearnerRanking(rosterParams),
        api.getStreamRanking(streamParams),
      ]);
      setRoster(rosterData.learnerRanking || rosterData.ranking || []);
      setStreamComparison(streamData.streamRanking || streamData.ranking || []);
    } catch (e) {
      setErr(e.message || "Failed to load class overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeClass, filters.term, filters.academicYear, filters.examType]);

  if (myClasses === null) {
    return <div style={styles.page}><div style={styles.empty}>Loading your class…</div></div>;
  }

  if (myClasses.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>My Class Overview</div>
        <div style={styles.section}>
          <div style={styles.empty}>You are not currently assigned as a class teacher for any class. Contact your admin if this looks wrong.</div>
        </div>
      </div>
    );
  }

  const maxAvg = Math.max(1, ...streamComparison.map((s) => Number(s.avg_score) || 0));

  return (
    <div style={styles.page}>
      <div style={styles.header}>My Class Overview</div>
      <div style={styles.subheader}>Your class roster, ranked, plus how your stream compares to others in the grade.</div>

      <div style={styles.filterBar}>
        {myClasses.length > 1 && (
          <select style={styles.select}
            value={`${activeClass.grade}|${activeClass.stream}`}
            onChange={(e) => {
              const [grade, stream] = e.target.value.split("|");
              setActiveClass(myClasses.find((c) => c.grade === grade && c.stream === stream));
            }}>
            {myClasses.map((c) => (
              <option key={c.id} value={`${c.grade}|${c.stream}`}>{c.grade} Stream {c.stream}</option>
            ))}
          </select>
        )}
        <select style={styles.select} value={filters.term} onChange={(e) => set("term", e.target.value)}>
          {TERMS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <input style={styles.select} value={filters.academicYear} onChange={(e) => set("academicYear", e.target.value)} placeholder="2025/2026" />
        <select style={styles.select} value={filters.examType} onChange={(e) => set("examType", e.target.value)}>
          {EXAM_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>

      {err && <div style={styles.error}>{err}</div>}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>{activeClass.grade} Stream {activeClass.stream} — Ranked Roster</div>
        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : roster.length === 0 ? (
          <div style={styles.empty}>No scores recorded for this class in the selected term yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Learner</th>
                <th style={styles.th}>Adm. No</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Avg Score</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Subjects Marked</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.learner_id}>
                  <td style={styles.td}><span style={styles.rankBadge}>{r.rank}</span></td>
                  <td style={styles.td}>{r.first_name} {r.last_name}</td>
                  <td style={{ ...styles.td, color: "#9CA3AF" }}>{r.admission_no}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{r.avg_score}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9CA3AF" }}>{r.subjects_marked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>{activeClass.grade} — Stream Comparison</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          Aggregate averages only — individual learner data from other streams is not shown here.
        </div>
        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : streamComparison.length === 0 ? (
          <div style={styles.empty}>No stream data available for this grade/term yet.</div>
        ) : (
          <div>
            {streamComparison.map((s) => {
              const isMine = s.stream === activeClass.stream;
              const pct = Math.max(4, Math.round((Number(s.avg_score) / maxAvg) * 100));
              return (
                <div key={s.stream} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 70, fontSize: 13, fontWeight: isMine ? 800 : 500, color: isMine ? "#818CF8" : "#E5E7EB" }}>
                    {activeClass.grade.replace("Grade ", "")}{s.stream} {isMine && "(you)"}
                  </div>
                  <div style={{ flex: 1, background: "#1F2937", borderRadius: 6, height: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: isMine ? "#6366F1" : "#374151",
                      borderRadius: 6, transition: "width .3s",
                    }} />
                  </div>
                  <div style={{ width: 60, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{s.avg_score}</div>
                  <div style={{ width: 30, textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>#{s.rank}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
