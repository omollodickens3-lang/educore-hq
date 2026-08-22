import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { learnersAPI } from '../utils/api';

// Same 8 competency columns the backend stores in learner_strands.
const COMPETENCIES = [
  { key: 'communication', label: 'Communication' },
  { key: 'criticalThinking', dbKey: 'critical_thinking', label: 'Critical Thinking & Problem Solving' },
  { key: 'creativity', label: 'Creativity & Imagination' },
  { key: 'citizenship', label: 'Citizenship' },
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'learningToLearn', dbKey: 'learning_to_learn', label: 'Learning to Learn' },
  { key: 'selfEfficacy', dbKey: 'self_efficacy', label: 'Self-Efficacy' },
  { key: 'digitalLiteracy', dbKey: 'digital_literacy', label: 'Digital Literacy' },
];

const JS_GRADES = ['Grade 7', 'Grade 8', 'Grade 9'];

// Mirrors the backend's strandLabel() exactly, so the live preview here always
// matches what generateLearnerReport / getLearnerById will compute server-side.
function strandLabel(value, grade) {
  const v = Math.round(Number(value));
  if (!v || v < 1) return null;
  const clamped = Math.min(8, Math.max(1, v));
  const isJS = JS_GRADES.includes(grade);
  if (isJS) {
    const labels8 = ['BE2', 'BE1', 'AE2', 'AE1', 'ME2', 'ME1', 'EE2', 'EE1'];
    return labels8[clamped - 1];
  }
  if (clamped >= 7) return 'EE';
  if (clamped >= 5) return 'ME';
  if (clamped >= 3) return 'AE';
  return 'BE';
}

// For primary grades, one canonical numeric value represents each of the 4
// labels (the top of each pair), so entry stays simple while still fitting
// the same 1-8 column the JS 8-level scale uses.
const PRIMARY_OPTIONS = [
  { value: 8, label: 'EE — Exceeding Expectation' },
  { value: 6, label: 'ME — Meeting Expectation' },
  { value: 4, label: 'AE — Approaching Expectation' },
  { value: 2, label: 'BE — Below Expectation' },
];
const JS_OPTIONS = [
  { value: 8, label: 'EE1' }, { value: 7, label: 'EE2' },
  { value: 6, label: 'ME1' }, { value: 5, label: 'ME2' },
  { value: 4, label: 'AE1' }, { value: 3, label: 'AE2' },
  { value: 2, label: 'BE1' }, { value: 1, label: 'BE2' },
];

const THIS_YEAR = new Date().getFullYear();

export default function RubricsPage() {
  const [learners, setLearners] = useState([]);
  const [learnerId, setLearnerId] = useState('');
  const [term, setTerm] = useState('2');
  const [academicYear, setAcademicYear] = useState((THIS_YEAR - 1) + '/' + THIS_YEAR);
  const [scores, setScores] = useState({}); // { communication: 0, criticalThinking: 0, ... }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);

  useEffect(() => {
    learnersAPI.getAll().then((res) => setLearners(res.data.learners || res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!learnerId) {
      setSelectedLearner(null);
      setScores({});
      return;
    }
    setLoading(true);
    learnersAPI.getById(learnerId)
      .then((res) => {
        const learner = res.data;
        setSelectedLearner(learner);
        const matching = (learner.strands || []).find(
          (s) => String(s.term) === String(term) && s.academic_year === academicYear
        );
        const next = {};
        COMPETENCIES.forEach(({ key, dbKey }) => {
          next[key] = matching ? Number(matching[dbKey || key]) || 0 : 0;
        });
        setScores(next);
      })
      .catch(() => toast.error('Failed to load learner'))
      .finally(() => setLoading(false));
  }, [learnerId, term, academicYear]);

  const grade = selectedLearner?.grade || '';
  const isJS = JS_GRADES.includes(grade);
  const options = isJS ? JS_OPTIONS : PRIMARY_OPTIONS;

  // Live client-side preview of Overall Performance, computed the same way the
  // backend does â€” updates instantly as the user picks values, no round-trip needed.
  const { liveMean, liveLabel } = useMemo(() => {
    const values = COMPETENCIES.map(({ key }) => Number(scores[key]) || 0).filter((v) => v > 0);
    if (!values.length) return { liveMean: null, liveLabel: null };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return { liveMean: Number(mean.toFixed(2)), liveLabel: strandLabel(mean, grade) };
  }, [scores, grade]);

  function setScore(key, value) {
    setScores((s) => ({ ...s, [key]: Number(value) }));
  }

  async function handleSave() {
    if (!learnerId) {
      toast.error('Select a learner first');
      return;
    }
    setSaving(true);
    try {
      const payload = { term, academicYear };
      COMPETENCIES.forEach(({ key }) => { payload[key] = scores[key] || 0; });
      const res = await learnersAPI.updateStrands(learnerId, payload);
      toast.success('Rubric scores saved');
      if (res.data?.overallLabel) {
        toast.success(`Overall Performance: ${res.data.overallMean} (${res.data.overallLabel})`, { duration: 4000 });
      }
    } catch (err) {
      const details = [
        `Message: ${err.message || "none"}`,
        `Code: ${err.code || "none"}`,
        `HTTP status: ${err.response?.status ?? "no response received"}`,
        `Server error: ${err.response?.data?.error || "none"}`,
      ].join("\n");
      alert(`Rubric save failed — full details:\n\n${details}`);
      toast.error(err.response?.data?.error || 'Failed to save rubric scores');
    } finally {
      setSaving(false);
    }
  }

  const cardStyle = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '28px', maxWidth: '720px',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };
  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: '8px',
    border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
    fontSize: '14px', marginTop: '4px', boxSizing: 'border-box',
  };
  const lightSelectStyle = {
    ...inputStyle, background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '4px' }}>Rubrics — Core Competencies</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Record each learner's CBC core-competency ratings for a term, and see their Overall Performance.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
          <label style={labelStyle}>Learner</label>
          <select style={lightSelectStyle} value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
            <option value="">Select a learner…</option>
            {learners.map((l) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name} — {l.grade} {l.stream}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: '140px' }}>
          <label style={labelStyle}>Term</label>
          <select style={lightSelectStyle} value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <div style={{ width: '160px' }}>
          <label style={labelStyle}>Academic Year</label>
          <select style={lightSelectStyle} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {[0, -1, -2].map((offset) => {
              const y = THIS_YEAR + offset;
              const v = y + '/' + (y + 1);
              return <option key={v} value={v}>{v}</option>;
            })}
          </select>
        </div>
      </div>

      {!learnerId ? (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '40px',
          textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0',
        }}>Select a learner to view or enter their rubric scores.</div>
      ) : loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={cardStyle}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                {selectedLearner?.first_name} {selectedLearner?.last_name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {grade} {selectedLearner?.stream} · {isJS ? 'Junior Secondary (8-level)' : 'Primary (4-level)'} scale
              </div>
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: '10px', background: '#eff6ff',
              textAlign: 'right', minWidth: '160px',
            }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Overall Performance
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {liveMean !== null ? `${liveMean}${liveLabel ? '  ·  ' + liveLabel : ''}` : 'Not yet assessed'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {COMPETENCIES.map(({ key, label }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <select
                  style={lightSelectStyle}
                  value={scores[key] || 0}
                  onChange={(e) => setScore(key, e.target.value)}
                >
                  <option value={0}>Not yet assessed</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#2563eb', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Rubric Scores'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
