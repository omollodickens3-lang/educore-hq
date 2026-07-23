/**
 * ExaminationsPage.jsx  –  EduCore CBC Examinations Module
 *
 * Grading system
 *   Grade 1-6  (Primary)       : EE · ME · AE · BE
 *   Grade 7-9  (Junior Sec.)   : EE1 EE2 · ME1 ME2 · AE1 AE2 · BE1 BE2
 *
 * Routes
 *   GET  /exams                 list / filter exams
 *   POST /exams                 create exam
 *   GET  /exams/analysis        aggregate analytics
 *   GET  /exams/:id/scores      scores for one exam
 *   POST /exams/:id/scores      upsert [{ learnerId, score, remarks }]
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
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
  getExams:    (p = {}) => apiFetch("/exams?" + new URLSearchParams(p)),
  createExam:  (b)      => apiFetch("/exams", { method: "POST", body: JSON.stringify(b) }),
  getAnalysis: (p = {}) => apiFetch("/exams/analysis?" + new URLSearchParams(p)),
  getLearners:  (p = {}) => apiFetch("/learners?" + new URLSearchParams(p)),
  getScores:   (id)     => apiFetch(`/exams/${id}/scores`),
  upsertScores:(id, r)  => apiFetch(`/exams/${id}/scores`, { method: "POST", body: JSON.stringify({ scores: r }) }),
  getTrends: (p = {}) => apiFetch("/exams/trends?" + new URLSearchParams(p)),
};

// ─── CBC grading ───────────────────────────────────────────────────────────────
const CBC_PRIMARY = [
  { level: "EE", label: "Exceeding Expectation", min: 75, color: "#059669", bg: "#ECFDF5", textColor: "#065F46" },
  { level: "ME", label: "Meeting Expectation",   min: 50, color: "#2563EB", bg: "#EFF6FF", textColor: "#1E40AF" },
  { level: "AE", label: "Approaching Expectation", min: 25, color: "#D97706", bg: "#FFFBEB", textColor: "#92400E" },
  { level: "BE", label: "Below Expectation",     min: 0,  color: "#DC2626", bg: "#FEF2F2", textColor: "#991B1B" },
];

const CBC_JUNIOR = [
  { level: "EE1", label: "Exceeding Expectation 1", min: 90, color: "#059669", bg: "#ECFDF5", textColor: "#065F46" },
  { level: "EE2", label: "Exceeding Expectation 2", min: 75, color: "#10B981", bg: "#ECFDF5", textColor: "#065F46" },
  { level: "ME1", label: "Meeting Expectation 1",   min: 60, color: "#2563EB", bg: "#EFF6FF", textColor: "#1E40AF" },
  { level: "ME2", label: "Meeting Expectation 2",   min: 50, color: "#3B82F6", bg: "#EFF6FF", textColor: "#1E40AF" },
  { level: "AE1", label: "Approaching Expectation 1", min: 40, color: "#D97706", bg: "#FFFBEB", textColor: "#92400E" },
  { level: "AE2", label: "Approaching Expectation 2", min: 30, color: "#F59E0B", bg: "#FFFBEB", textColor: "#92400E" },
  { level: "BE1", label: "Below Expectation 1",     min: 20, color: "#EF4444", bg: "#FEF2F2", textColor: "#991B1B" },
  { level: "BE2", label: "Below Expectation 2",     min: 0,  color: "#DC2626", bg: "#FEF2F2", textColor: "#991B1B" },
];

function gradeScale(examGrade) {
  const n = parseInt((examGrade || "").replace(/\D/g, "")) || 0;
  return n >= 7 && n <= 9 ? CBC_JUNIOR : CBC_PRIMARY;
}

function getCBC(score, maxScore, examGrade) {
  if (score === null || score === "" || score === undefined) return null;
  const pct = (Number(score) / (maxScore || 100)) * 100;
  const scale = gradeScale(examGrade);
  return scale.find((b) => pct >= b.min) ?? scale[scale.length - 1];
}

function autoRemark(cbc) {
  if (!cbc) return "";
  const base = cbc.level.replace(/[12]$/, "");
  const remarks = {
    EE: "Exceeding expectation. Excellent work, keep it up!",
    ME: "Meeting expectation. Good, steady progress.",
    AE: "Approaching expectation. Needs more practice.",
    BE: "Below expectation. Requires close support.",
  };
  return remarks[base] || "";
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function classAvg(scores, maxScore) {
  const valid = scores.filter((s) => s.score !== null && s.score !== "" && s.score !== undefined);
  if (!valid.length) return null;
  return valid.reduce((a, s) => a + Number(s.score), 0) / valid.length;
}

function pct(n, max) { return max ? ((n / max) * 100).toFixed(0) : 0; }

function toInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, flexShrink: 0,
      border: `2px solid #E5E7EB`, borderTopColor: "#3B5BDB",
      borderRadius: "50%", animation: "spin .65s linear infinite",
      verticalAlign: "middle",
    }} />
  );
}

// ─── CBC Badge ─────────────────────────────────────────────────────────────────
function CBCBadge({ cbc, small }) {
  if (!cbc) return <span style={{ color: "#D1D5DB" }}>—</span>;
  const size = small ? { fontSize: 10, padding: "2px 6px", borderRadius: 4 }
                     : { fontSize: 12, padding: "4px 9px", borderRadius: 6 };
  return (
    <span style={{
      ...size, fontWeight: 800, letterSpacing: "0.06em",
      background: cbc.bg, color: cbc.textColor,
      border: `1px solid ${cbc.color}33`,
      display: "inline-block", lineHeight: 1.5, fontVariantNumeric: "tabular-nums",
    }}>
      {cbc.level}
    </span>
  );
}

// ─── CBC Competency Ladder (signature element) ─────────────────────────────────
function CBCLadder({ scores, maxScore, examGrade }) {
  const scale = gradeScale(examGrade);
  const valid = scores.filter((s) => s.score !== null && s.score !== "" && s.score !== undefined);
  const total = valid.length || 1;

  const counts = {};
  scale.forEach((b) => (counts[b.level] = 0));
  valid.forEach((s) => {
    const g = getCBC(s.score, maxScore, examGrade);
    if (g) counts[g.level] = (counts[g.level] || 0) + 1;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {scale.map((band) => {
        const n = counts[band.level] || 0;
        const fillPct = (n / total) * 100;
        return (
          <div key={band.level} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 36, textAlign: "right", fontSize: 11, fontWeight: 800,
              letterSpacing: "0.05em", color: band.textColor, flexShrink: 0,
            }}>{band.level}</span>
            <div style={{ flex: 1, height: 20, background: "#F3F4F6", borderRadius: 5, overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0, width: `${fillPct}%`,
                background: band.color, borderRadius: 5,
                transition: "width .6s cubic-bezier(.4,0,.2,1)",
                opacity: n === 0 ? 0 : 1,
              }} />
              {n > 0 && (
                <span style={{
                  position: "absolute", left: Math.min(fillPct, 88) + "%",
                  transform: "translateX(4px)",
                  top: "50%", transform: "translateX(6px) translateY(-50%)",
                  fontSize: 10, fontWeight: 700, color: "#374151", whiteSpace: "nowrap",
                }}>
                  {n} · {pct(n, valid.length)}%
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#9CA3AF", width: 120, flexShrink: 0 }}>
              {band.label}
            </span>
          </div>
        );
      })}
      <p style={{ margin: "4px 0 0 46px", fontSize: 11, color: "#9CA3AF" }}>
        {valid.length} of {scores.length} scores entered
      </p>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ exam, scores }) {
  const maxScore = exam.maxScore ?? 100;
  const valid    = scores.filter((s) => s.score !== null && s.score !== "" && s.score !== undefined);
  const mean     = classAvg(scores, maxScore);
  const meanCBC  = mean !== null ? getCBC(mean, maxScore, exam.grade) : null;
  const completion = scores.length ? ((valid.length / scores.length) * 100).toFixed(0) : 0;
  const sorted   = [...valid].sort((a, b) => Number(b.score) - Number(a.score));
  const top5     = sorted.slice(0, 5);
  const needSupport = sorted.filter((s) => {
    const g = getCBC(s.score, maxScore, exam.grade);
    return g && (g.level.startsWith("BE") || g.level.startsWith("AE"));
  }).slice(-5).reverse();

  const statCards = [
    {
      label: "Learners", value: scores.length,
      sub: `${valid.length} marked`,
      color: "#3B5BDB", bg: "#EEF2FF",
    },
    {
      label: "Completion", value: `${completion}%`,
      sub: `${scores.length - valid.length} pending`,
      color: "#7C3AED", bg: "#F5F3FF",
    },
    {
      label: "Class mean", value: mean !== null ? mean.toFixed(1) : "—",
      sub: mean !== null ? `out of ${maxScore}` : "No scores yet",
      color: "#0369A1", bg: "#F0F9FF",
    },
    {
      label: "Class level", value: meanCBC ? meanCBC.level : "—",
      sub: meanCBC ? meanCBC.label : "Enter scores first",
      color: meanCBC?.color ?? "#9CA3AF",
      bg: meanCBC?.bg ?? "#F9FAFB",
    },
  ];

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map((c) => (
          <div key={c.label} style={{
            background: c.bg, borderRadius: 12, padding: "18px 20px",
            border: `1px solid ${c.color}22`,
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: c.color }}>{c.label}</p>
            <p style={{ margin: "6px 0 2px", fontSize: 28, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: c.color, opacity: 0.7 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Term-over-term trend</h3>
          <TrendsChart grade={exam.grade} subject={exam.subject} />
        </div>

        {/* CBC Competency Ladder */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Competency distribution</h3>
          {valid.length === 0
            ? <p style={styles.empty}>Enter scores in Mark Entry to see distribution.</p>
            : <CBCLadder scores={scores} maxScore={maxScore} examGrade={exam.grade} />
          }
        </div>

        {/* Top performers */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Top performers</h3>
          {top5.length === 0
            ? <p style={styles.empty}>No scores yet.</p>
            : top5.map((s, i) => {
                const cbc = getCBC(s.score, maxScore, exam.grade);
                const name = s.learnerName ?? s.name ?? s.learnerId;
                return (
                  <div key={s.learnerId} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "9px 0",
                    borderBottom: i < top5.length - 1 ? "1px solid #F3F4F6" : "none",
                  }}>
                    <span style={{
                      width: 22, fontSize: 12, fontWeight: 700, color: i === 0 ? "#D97706" : "#9CA3AF",
                      textAlign: "center", flexShrink: 0,
                    }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#EEF2FF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "#3B5BDB", flexShrink: 0,
                    }}>{toInitials(name)}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#111827" }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      {Number(s.score).toFixed(0)}
                    </span>
                    <CBCBadge cbc={cbc} small />
                  </div>
                );
              })
          }
        </div>

        {/* Needs support */}
        <div style={{ ...styles.card, borderTop: "3px solid #EF4444" }}>
          <h3 style={{ ...styles.cardTitle, color: "#DC2626" }}>Needs support</h3>
          <p style={{ margin: "-4px 0 12px", fontSize: 12, color: "#9CA3AF" }}>
            Learners in AE or BE — consider follow-up
          </p>
          {needSupport.length === 0
            ? <p style={styles.empty}>{valid.length === 0 ? "No scores yet." : "No learners in support range. 🎉"}</p>
            : needSupport.map((s, i) => {
                const cbc = getCBC(s.score, maxScore, exam.grade);
                const name = s.learnerName ?? s.name ?? s.learnerId;
                return (
                  <div key={s.learnerId} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0",
                    borderBottom: i < needSupport.length - 1 ? "1px solid #FEF2F2" : "none",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: "#FEF2F2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "#DC2626", flexShrink: 0,
                    }}>{toInitials(name)}</div>
                    <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      {Number(s.score).toFixed(0)}
                    </span>
                    <CBCBadge cbc={cbc} small />
                  </div>
                );
              })
          }
        </div>

        {/* Score spread mini chart */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Score spread</h3>
          {valid.length < 2
            ? <p style={styles.empty}>Need at least 2 scores for a spread.</p>
            : <ScoreHistogram scores={valid} maxScore={maxScore} examGrade={exam.grade} />
          }
        </div>
      </div>
    </div>
  );
}

// ─── Mini histogram ────────────────────────────────────────────────────────────
function ScoreHistogram({ scores, maxScore, examGrade }) {
  const BUCKETS = 10;
  const bucketSize = maxScore / BUCKETS;
  const bins = Array.from({ length: BUCKETS }, (_, i) => ({
    from: i * bucketSize, to: (i + 1) * bucketSize, count: 0,
  }));
  scores.forEach((s) => {
    const idx = Math.min(Math.floor(Number(s.score) / bucketSize), BUCKETS - 1);
    bins[idx].count++;
  });
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
        {bins.map((bin, i) => {
          const midScore = (bin.from + bin.to) / 2;
          const cbc = getCBC(midScore, maxScore, examGrade);
          return (
            <div key={i} title={`${bin.from.toFixed(0)}–${bin.to.toFixed(0)}: ${bin.count} learner${bin.count !== 1 ? "s" : ""}`}
              style={{
                flex: 1, background: cbc?.color ?? "#9CA3AF",
                opacity: bin.count === 0 ? 0.15 : 0.85,
                height: `${(bin.count / maxCount) * 100}%`,
                minHeight: bin.count > 0 ? 4 : 0,
                borderRadius: "3px 3px 0 0",
                transition: "height .4s ease",
              }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#9CA3AF" }}>
        <span>0</span><span>{(maxScore / 2).toFixed(0)}</span><span>{maxScore}</span>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9CA3AF" }}>
        Highest: {Math.max(...scores.map((s) => Number(s.score))).toFixed(0)} ·{" "}
        Lowest: {Math.min(...scores.map((s) => Number(s.score))).toFixed(0)}
      </p>
    </div>
  );
}

// ─── Mark Entry Tab ────────────────────────────────────────────────────────────
function TrendsChart({ grade, subject }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!grade || !subject) return;
    setLoading(true);
    api.getTrends({ grade, subject })
      .then((data) => setTrends(data.trends ?? []))
      .catch(() => setTrends([]))
      .finally(() => setLoading(false));
  }, [grade, subject]);

  if (loading) return <p style={styles.empty}>Loading trend...</p>;
  if (trends.length < 2) return <p style={styles.empty}>Need at least 2 terms of data to show a trend.</p>;

  const maxAvg = Math.max(...trends.map((t) => Number(t.avg_score)), 100);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100 }}>
      {trends.map((t, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            height: `${(Number(t.avg_score) / maxAvg) * 80}px`,
            background: "#3B5BDB", borderRadius: "4px 4px 0 0",
          }} />
          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "#111827" }}>{t.avg_score}</p>
          <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>T{t.term} {t.academic_year}</p>
        </div>
      ))}
    </div>
  );
}

function MarkEntryTab({ exam, scores, setScores, onSaved }) {
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [toast, setToast]     = useState(null);
  const [search, setSearch]   = useState("");
  const maxScore = exam.maxScore ?? 100;
  const toastTimer = useRef();

  function update(learnerId, field, value) {
    setScores((prev) => prev.map((r) => {
      if (r.learnerId !== learnerId) return r;
      const updated = { ...r, [field]: value };
      if (field === "score") {
        const cbc = getCBC(value, maxScore, exam.grade);
        updated.remarks = autoRemark(cbc);
      }
      return updated;
    }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await api.upsertScores(
        exam.id ?? exam._id,
        scores.map(({ learnerId, score, remarks }) => ({
          learnerId,
          subject: exam.subject,
          score: score === "" || score === undefined ? null : Number(score),
          remarks: remarks ?? "",
        }))
      );
      setDirty(false);
      setToast({ ok: true, msg: "Scores saved." });
      if (onSaved) onSaved();
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  }

  const visible = scores.filter((r) =>
    (r.learnerName ?? r.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.admissionNo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const entered = scores.filter((s) => s.score !== null && s.score !== "" && s.score !== undefined).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 24px", borderBottom: "1px solid #F3F4F6",
        background: "#FAFAFA", flexShrink: 0,
      }}>
        <input style={{ ...styles.input, maxWidth: 260, padding: "7px 12px" }}
          placeholder="Search by name or admission no…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 4 }}>
          {entered} / {scores.length} entered
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {toast && (
            <span style={{ fontSize: 13, color: toast.ok ? "#059669" : "#DC2626" }}>
              {toast.ok ? "✓ " : "✕ "}{toast.msg}
            </span>
          )}
          <button onClick={save} disabled={!dirty || saving}
            style={{ ...styles.btnPrimary, opacity: !dirty || saving ? 0.45 : 1, cursor: !dirty || saving ? "default" : "pointer" }}>
            {saving ? <><Spinner size={12} />&nbsp; Saving…</> : "Save scores"}
          </button>
        </div>
      </div>

      {/* table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 36 }}>#</th>
              <th style={styles.th}>Learner</th>
              <th style={styles.th}>Adm. No</th>
              <th style={{ ...styles.th, width: 130, textAlign: "center" }}>
                Score <span style={{ fontWeight: 400, color: "#C4C4C4" }}>/ {maxScore}</span>
              </th>
              <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Level</th>
              <th style={styles.th}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                {search ? "No learners match that search." : "No learners in this exam yet."}
              </td></tr>
            )}
            {visible.map((row, i) => {
              const cbc = getCBC(row.score, maxScore, exam.grade);
              return (
                <tr key={row.learnerId} style={{
                  background: i % 2 === 0 ? "#FFFFFF" : "#FAFBFF",
                  borderBottom: "1px solid #F3F4F6",
                }}>
                  <td style={{ ...styles.td, color: "#9CA3AF", fontSize: 12, textAlign: "center" }}>{i + 1}</td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: "#EEF2FF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: "#3B5BDB", flexShrink: 0,
                      }}>{toInitials(row.learnerName ?? row.name ?? "")}</div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                        {row.learnerName ?? row.name ?? row.learnerId}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontSize: 12, color: "#9CA3AF" }}>
                    {row.admissionNo ?? "—"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <input
                      type="number" min={0} max={maxScore}
                      value={row.score ?? ""}
                      onChange={(e) => update(row.learnerId, "score", e.target.value)}
                      placeholder="—"
                      style={{
                        width: 80, padding: "7px 0", textAlign: "center",
                        border: `2px solid ${cbc ? cbc.color + "66" : "#E5E7EB"}`,
                        borderRadius: 8, fontSize: 15, fontWeight: 700,
                        background: cbc ? cbc.bg : "#FAFAFA",
                        color: cbc ? cbc.textColor : "#9CA3AF",
                        outline: "none", fontFamily: "inherit",
                        transition: "border-color .15s, background .15s",
                      }}
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <CBCBadge cbc={cbc} />
                  </td>
                  <td style={styles.td}>
                <input value={row.remarks ?? ""}
                  readOnly
                  placeholder="Auto-generated once scored"
                  style={{ ...styles.input, padding: "6px 10px", fontSize: 13, background: "#F3F4F6", color: "#6B7280", cursor: "default" }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}

// ─── Report Cards Tab ──────────────────────────────────────────────────────────
function ReportCardsTab({ exam, scores }) {
  const [selected, setSelected] = useState("all");
  const maxScore = exam.maxScore ?? 100;
  const schoolName = localStorage.getItem("educore_school_name") ?? "EduCore School";

  const learners = selected === "all"
    ? scores
    : scores.filter((s) => s.learnerId === selected);

  function buildReportHtml(learnerRows) {
    const slips = learnerRows.map((s) => {
      const cbc  = getCBC(s.score, maxScore, exam.grade);
      const name = s.learnerName ?? s.name ?? s.learnerId;
      const lvlColor = cbc?.color ?? "#9CA3AF";
      return `
      <div class="slip">
        <div class="slip-header">
          <div class="school">${schoolName}</div>
          <div class="slip-title">RESULT SLIP · CBC</div>
        </div>
        <div class="learner-info">
          <div><span class="label">Learner</span><span class="value">${name}</span></div>
          <div><span class="label">Adm. No</span><span class="value">${s.admissionNo ?? "—"}</span></div>
          <div><span class="label">Grade</span><span class="value">${exam.grade}</span></div>
          <div><span class="label">Term / Year</span><span class="value">${exam.term} ${exam.year}</span></div>
        </div>
        <div class="exam-row">
          <div class="subject">${exam.subject ?? exam.examName}</div>
          <div class="score-box">
            <span class="score-num">${s.score !== null && s.score !== "" && s.score !== undefined ? Number(s.score).toFixed(0) : "—"}</span>
            <span class="score-max">/ ${maxScore}</span>
          </div>
          <div class="cbc-level" style="background:${lvlColor}; color:#fff;">
            ${cbc?.level ?? "—"}
          </div>
          <div class="cbc-label" style="color:${lvlColor};">${cbc?.label ?? "Not marked"}</div>
        </div>
        ${s.remarks ? `<div class="remarks"><span class="label">Teacher's remarks:</span> ${s.remarks}</div>` : ""}
        <div class="slip-footer">
          <span>Exam date: ${exam.examDate ? new Date(exam.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
          <span>Issued by EduCore</span>
        </div>
      </div>`;
    }).join('<div class="page-break"></div>');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Result Slips — ${exam.examName}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f0; padding: 24px; }
      .slip { background: #fff; border-radius: 10px; padding: 28px 32px; max-width: 560px; margin: 0 auto 24px; box-shadow: 0 2px 12px rgba(0,0,0,.1); }
      .slip-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #3B5BDB; padding-bottom: 10px; margin-bottom: 16px; }
      .school { font-size: 18px; font-weight: 900; color: #3B5BDB; letter-spacing: -.02em; }
      .slip-title { font-size: 11px; font-weight: 700; color: #9CA3AF; letter-spacing: .08em; }
      .learner-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 20px; }
      .learner-info div { display: flex; flex-direction: column; gap: 2px; }
      .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9CA3AF; }
      .value { font-size: 14px; font-weight: 600; color: #111827; }
      .exam-row { display: flex; align-items: center; gap: 12px; background: #F8F9FB; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
      .subject { flex: 1; font-size: 15px; font-weight: 700; color: #111827; }
      .score-box { display: flex; align-items: baseline; gap: 2px; }
      .score-num { font-size: 28px; font-weight: 900; color: #3B5BDB; line-height: 1; }
      .score-max { font-size: 13px; color: #9CA3AF; }
      .cbc-level { font-size: 12px; font-weight: 900; letter-spacing: .06em; padding: 5px 10px; border-radius: 6px; }
      .cbc-label { font-size: 12px; font-weight: 600; min-width: 160px; }
      .remarks { font-size: 13px; color: #374151; border-left: 3px solid #E5E7EB; padding: 8px 12px; margin-bottom: 14px; font-style: italic; }
      .remarks .label { display: block; font-style: normal; margin-bottom: 3px; }
      .slip-footer { display: flex; justify-content: space-between; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 10px; }
      .page-break { page-break-after: always; }
      @media print {
        body { background: white; padding: 0; }
        .slip { box-shadow: none; border: 1px solid #E5E7EB; margin: 0; border-radius: 0; }
        .page-break { page-break-after: always; }
      }
    </style></head><body>${slips}</body></html>`;
  }

  function printSelected() {
    const toRender = learners.filter((s) =>
      s.score !== null && s.score !== "" && s.score !== undefined
    );
    if (toRender.length === 0) {
      alert("No marked scores to print for the selected learner(s).");
      return;
    }
    const win = window.open("", "_blank");
    win.document.write(buildReportHtml(toRender));
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const markedCount = scores.filter((s) => s.score !== null && s.score !== "" && s.score !== undefined).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Print report slip for</label>
            <select style={styles.input} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="all">All learners ({markedCount} marked)</option>
              {scores.map((s) => (
                <option key={s.learnerId} value={s.learnerId}>
                  {s.learnerName ?? s.name ?? s.learnerId}
                  {s.score !== null && s.score !== "" && s.score !== undefined
                    ? ` — ${s.score}/${exam.maxScore ?? 100}`
                    : " (not marked)"}
                </option>
              ))}
            </select>
          </div>
          <button onClick={printSelected} style={{ ...styles.btnPrimary, padding: "10px 20px", gap: 6, display: "flex", alignItems: "center" }}>
            🖨 Print slip{selected === "all" ? "s" : ""}
          </button>
        </div>

        {/* preview card */}
        {(() => {
          const preview = selected === "all"
            ? scores.find((s) => s.score !== null && s.score !== "" && s.score !== undefined)
            : scores.find((s) => s.learnerId === selected);
          if (!preview) return (
            <div style={{ ...styles.card, textAlign: "center", padding: 40 }}>
              <p style={styles.empty}>
                {selected === "all" ? "Enter scores in Mark Entry first." : "This learner has no score yet."}
              </p>
            </div>
          );
          const cbc  = getCBC(preview.score, exam.maxScore ?? 100, exam.grade);
          const name = preview.learnerName ?? preview.name ?? preview.learnerId;
          return (
            <div style={{ ...styles.card, maxWidth: 480 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #3B5BDB", paddingBottom: 10, marginBottom: 14 }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: "#3B5BDB" }}>{schoolName}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: ".06em" }}>RESULT SLIP · CBC</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 16 }}>
                {[["Learner", name], ["Adm. No", preview.admissionNo ?? "—"], ["Grade", exam.grade], ["Term / Year", `${exam.term} ${exam.year}`]].map(([l, v]) => (
                  <div key={l}>
                    <p style={{ ...styles.fieldLabel, marginBottom: 2 }}>{l}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F8F9FB", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827" }}>{exam.subject ?? exam.examName}</span>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#3B5BDB", lineHeight: 1 }}>
                  {Number(preview.score).toFixed(0)}
                </span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>/ {exam.maxScore ?? 100}</span>
                <CBCBadge cbc={cbc} />
              </div>
              {cbc && <p style={{ fontSize: 12, fontWeight: 600, color: cbc.textColor, marginBottom: 10 }}>{cbc.label}</p>}
              {preview.remarks && (
                <p style={{ fontSize: 13, color: "#374151", fontStyle: "italic", borderLeft: "3px solid #E5E7EB", paddingLeft: 12, marginBottom: 10 }}>
                  "{preview.remarks}"
                </p>
              )}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                {selected === "all"
                  ? `Preview showing first marked learner. ${markedCount} slip${markedCount !== 1 ? "s" : ""} will print.`
                  : "This is a preview. Click Print slip to open the print dialog."}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Create Exam Modal ─────────────────────────────────────────────────────────
const TERMS    = ["Term 1", "Term 2", "Term 3"];
const GRADES   = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const SUBJECTS = ["Mathematics","English","Kiswahili","Science","Social Studies","Religious Education","Creative Arts","Physical Education","Agriculture","Home Science","Business Studies","Life Skills","Indigenous Languages"];
const THIS_YEAR = new Date().getFullYear();

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function CreateExamModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    examName: "", subject: "", grade: "", term: "",
    year: THIS_YEAR, examDate: "", maxScore: 100, examType: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.examName || !form.subject || !form.grade || !form.term || !form.examDate || !form.examType) {
      setErr("Please fill in all required fields."); return;
    }
    setSaving(true); setErr("");
    try {
      const result = await api.createExam({
        ...form,
        name: form.examName,
        academicYear: form.year,
        startDate: form.examDate,
        maxScore: Number(form.maxScore),
      });
      onCreate(result.exam ?? result);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>New examination</h2>
          <button onClick={onClose} style={styles.iconBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <Field label="Exam name *">
            <input style={styles.input} value={form.examName} placeholder="e.g. Mid-Term Mathematics Paper 1"
              onChange={(e) => set("examName", e.target.value)} />
          </Field>
          <Field label="Exam type *">
            <select style={styles.input} value={form.examType} onChange={(e) => set("examType", e.target.value)}>
              <option value="">Select</option>
              {[{v:"opener",l:"Opener"},{v:"midterm",l:"Mid Term"},{v:"end_term",l:"End Term"}].map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Subject *">
              <select style={styles.input} value={form.subject} onChange={(e) => set("subject", e.target.value)}>
                <option value="">Select…</option>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Grade *">
              <select style={styles.input} value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                <option value="">Select…</option>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Term *">
              <select style={styles.input} value={form.term} onChange={(e) => set("term", e.target.value)}>
                <option value="">Select…</option>
                {TERMS.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <input style={styles.input} type="number" value={form.year} min={2020} max={2040}
                onChange={(e) => set("year", e.target.value)} />
            </Field>
            <Field label="Exam date *">
              <input style={styles.input} type="date" value={form.examDate}
                onChange={(e) => set("examDate", e.target.value)} />
            </Field>
            <Field label="Max score">
              <input style={styles.input} type="number" value={form.maxScore} min={1} max={1000}
                onChange={(e) => set("maxScore", e.target.value)} />
            </Field>
          </div>

          {/* CBC preview */}
          {form.grade && (
            <div style={{ background: "#F0F4FF", borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ ...styles.fieldLabel, marginBottom: 8 }}>
                CBC scale for {form.grade}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {gradeScale(form.grade).map((b) => (
                  <span key={b.level} style={{
                    fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 5,
                    background: b.bg, color: b.textColor, border: `1px solid ${b.color}44`,
                  }}>{b.level} ≥{b.min}%</span>
                ))}
              </div>
            </div>
          )}

          {err && <p style={{ margin: 0, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 13 }}>{err}</p>}
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Creating…" : "Create exam"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ExaminationsPage() {
  const [exams,      setExams]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [scores,     setScores]     = useState([]);
  const [tab,        setTab]        = useState("overview"); // overview | marks | reports
  const [deletingExam, setDeletingExam] = useState(false);
  const [loadingExams,  setLoadingExams]  = useState(true);
  const [loadingScores, setLoadingScores] = useState(false);
  const [showCreate, setShowCreate]  = useState(false);
  const [filters,    setFilters]     = useState({ term: "", grade: "", year: THIS_YEAR - 1 });
  const [examErr,    setExamErr]     = useState("");

  const loadExams = useCallback(() => {
    setLoadingExams(true);
  const { year, ...rest } = filters;
  const params = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== ""));
  if (year) params.academicYear = `${year}/${Number(year) + 1}`;
    api.getExams(params)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.exams ?? [];
        setExams(list);
        if (list.length && !selected) setSelected(list[0]);
      })
      .catch((e) => setExamErr(e.message))
      .finally(() => setLoadingExams(false));
  }, [JSON.stringify(filters)]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handleDeleteExam = async () => {
    if (!selected) return;
    const examId = selected.id ?? selected._id;
    const ok = window.confirm(`Delete "${selected.examName ?? selected.name}"? This also deletes all scores entered for it. This cannot be undone.`);
    if (!ok) return;
    setDeletingExam(true);
    try {
      await examsAPI.delete(examId);
      toast.success('Exam deleted');
      setSelected(null);
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete exam');
    } finally {
      setDeletingExam(false);
    }
  };


  useEffect(() => {
    if (!selected) return;
    setLoadingScores(true);
    api.getScores(selected.id ?? selected._id)
      .then((data) => {
        const raw = Array.isArray(data) ? data : data.scores ?? [];
        const mapped = raw.map((r) => ({
          learnerId: r.learnerId ?? r.learner_id,
          learnerName: r.learnerName ?? [r.first_name, r.last_name].filter(Boolean).join(" "),
          admissionNo: r.admissionNo ?? r.admission_no,
          score: r.score ?? "",
          remarks: r.remarks ?? "",
        }));
        setScores(mapped);
      })
      .catch(() => setScores([]))
      .finally(() => setLoadingScores(false));
  }, [selected?.id ?? selected?._id]);
  function handleCreated(exam) {
    setExams((prev) => [exam, ...prev]);
    setSelected(exam);
    setScores([]);
    setShowCreate(false);
    setTab("marks");
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "marks",    label: "Mark Entry" },
    { id: "reports",  label: "Report Cards" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button { opacity: .4; }
        input:focus, select:focus { border-color: #3B5BDB !important; outline: none; box-shadow: 0 0 0 3px #3B5BDB22; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={styles.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#111827", letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
            Examinations
          </h1>
          {/* exam selector */}
          <div style={{ flex: 1, maxWidth: 360 }}>
            {loadingExams ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 13 }}>
                <Spinner size={14} /> Loading exams…
              </div>
            ) : exams.length === 0 ? (
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>No exams yet.</span>
            ) : (
              <select
                style={{ ...styles.input, fontWeight: 600, fontSize: 13 }}
                value={selected?.id ?? selected?._id ?? ""}
                onChange={(e) => {
                  const ex = exams.find((x) => (x.id ?? x._id) === e.target.value);
                  if (ex) setSelected(ex);
                }}
              >
                {exams.map((ex) => (
                  <option key={ex.id ?? ex._id} value={ex.id ?? ex._id}>
                        {ex.examName ?? ex.name} - {ex.grade}, Term {ex.term}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* quick filters */}
          <select style={{ ...styles.input, maxWidth: 110, fontSize: 12, padding: "7px 8px" }}
            value={filters.term} onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}>
            <option value="">All terms</option>
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select style={{ ...styles.input, maxWidth: 110, fontSize: 12, padding: "7px 8px" }}
            value={filters.grade} onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}>
            <option value="">All grades</option>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select style={{ ...styles.input, maxWidth: 90, fontSize: 12, padding: "7px 8px" }}
            value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}>
            {[THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>

        <button onClick={() => setShowCreate(true)} style={{ ...styles.btnPrimary, whiteSpace: "nowrap" }}>
          + New exam
        </button>
      </div>

      {/* ── TABS ── */}
      {selected && (
        <div style={styles.tabBar}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                ...styles.tabBtn,
                color: tab === t.id ? "#3B5BDB" : "#6B7280",
                borderBottom: `2px solid ${tab === t.id ? "#3B5BDB" : "transparent"}`,
                fontWeight: tab === t.id ? 700 : 500,
              }}>
              {t.label}
            </button>
          ))}
          {selected && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", alignSelf: "center", paddingRight: 24 }}>
              {selected.examName ?? selected.name} · Max {selected.maxScore ?? 100}
                <button
                  onClick={handleDeleteExam}
                  disabled={deletingExam}
                  style={{
                    marginLeft: 12,
                    padding: '4px 10px',
                    background: 'transparent',
                    color: '#dc2626',
                    border: '1px solid #dc2626',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: deletingExam ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deletingExam ? 'Deleting...' : 'Delete Exam'}
                </button>
            </span>
          )}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {examErr && (
          <div style={{ padding: "16px 24px", color: "#DC2626", fontSize: 13, background: "#FEF2F2" }}>
            Could not load exams: {examErr}
          </div>
        )}

        {!selected && !loadingExams && (
          <div style={{ ...styles.centred, flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <p style={{ color: "#9CA3AF", fontSize: 15, margin: 0 }}>No exam selected.</p>
            <button onClick={() => setShowCreate(true)} style={styles.btnPrimary}>Create first exam</button>
          </div>
        )}

        {loadingScores && selected && (
          <div style={styles.centred}><Spinner />&nbsp; Loading scores…</div>
        )}

        {!loadingScores && selected && tab === "overview"  && <OverviewTab exam={selected} scores={scores} />}
        {!loadingScores && selected && tab === "marks"     && (
          <MarkEntryTab exam={selected} scores={scores} setScores={setScores} onSaved={loadExams} />
        )}
        {!loadingScores && selected && tab === "reports"   && <ReportCardsTab exam={selected} scores={scores} />}
      </div>

      {showCreate && <CreateExamModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
    </div>
  );
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const styles = {
  page: {
    display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
    background: "#F0F4FF",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  },
  topBar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 24px", background: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB", flexShrink: 0,
  },
  tabBar: {
    display: "flex", alignItems: "stretch",
    background: "#FFFFFF", borderBottom: "1px solid #E5E7EB", flexShrink: 0,
    paddingLeft: 16,
  },
  tabBtn: {
    padding: "11px 20px", background: "none", border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer", fontSize: 13, transition: "color .15s",
  },
  card: {
    background: "#FFFFFF", borderRadius: 12, padding: 20,
    border: "1px solid #E5E7EB",
  },
  cardTitle: {
    margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#374151",
    textTransform: "uppercase", letterSpacing: ".05em",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    padding: "10px 14px", textAlign: "left",
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
    color: "#9CA3AF", background: "#F8F9FB", borderBottom: "1px solid #F3F4F6",
    position: "sticky", top: 0, zIndex: 1,
  },
  td: { padding: "9px 14px", color: "#374151", verticalAlign: "middle" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #E5E7EB",
    borderRadius: 8, fontSize: 14, color: "#111827",
    background: "#FAFAFA", outline: "none",
    transition: "border-color .15s, box-shadow .15s", fontFamily: "inherit",
  },
  fieldLabel: {
    display: "block", marginBottom: 5,
    fontSize: 11, fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: ".05em",
  },
  btnPrimary: {
    padding: "9px 18px", background: "#3B5BDB", color: "#fff",
    border: "none", borderRadius: 8, fontWeight: 700,
    fontSize: 13, cursor: "pointer", letterSpacing: ".01em",
    transition: "background .15s", fontFamily: "inherit",
  },
  btnGhost: {
    padding: "9px 16px", background: "transparent",
    color: "#6B7280", border: "1.5px solid #E5E7EB",
    borderRadius: 8, fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  iconBtn: { background: "none", border: "none", fontSize: 18, color: "#9CA3AF", cursor: "pointer", padding: "0 4px" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.38)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, backdropFilter: "blur(3px)",
  },
  modal: {
    background: "#FFFFFF", borderRadius: 14, width: 540,
    maxWidth: "95vw", maxHeight: "92vh",
    boxShadow: "0 24px 64px rgba(0,0,0,.15)",
    display: "flex", flexDirection: "column",
  },
  modalHeader: {
    padding: "20px 24px 16px", borderBottom: "1px solid #F3F4F6",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  modalBody: {
    padding: "20px 24px", display: "flex", flexDirection: "column",
    gap: 16, overflowY: "auto",
  },
  modalFooter: {
    padding: "14px 24px", borderTop: "1px solid #F3F4F6",
    display: "flex", justifyContent: "flex-end", gap: 10,
  },
  centred: {
    flex: 1, display: "flex", alignItems: "center",
    justifyContent: "center", color: "#9CA3AF", fontSize: 14,
  },
  empty: { margin: 0, fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
};