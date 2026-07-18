import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

const GRADES = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'];

const styles = {
  page: { padding: 24, color: '#0f172a' },
  title: { textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#0f172a' },
  subtitle: { textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 20 },
  controls: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' },
  select: { background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' },
  input: { background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', width: 140 },
  button: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, maxWidth: 700, margin: '0 auto' },
  cardTitle: { textAlign: 'center', fontWeight: 700, marginBottom: 20, color: '#0f172a' },
  barRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  barLabel: { width: 130, fontSize: 13, color: '#64748b', flexShrink: 0 },
  barTrack: { flex: 1, background: '#f1f5f9', borderRadius: 6, height: 24, position: 'relative', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #2563eb, #60a5fa)', transition: 'width 0.3s' },
  barValue: { width: 60, fontSize: 13, fontWeight: 600, textAlign: 'right', flexShrink: 0, color: '#0f172a' },
  empty: { color: '#64748b', textAlign: 'center', padding: 20 },
  error: { color: '#dc2626', textAlign: 'center' },
  trendNote: { textAlign: 'center', fontSize: 13, marginTop: 16, color: '#64748b' },
};

function trendDirection(trends) {
  if (trends.length < 2) return null;
  const first = Number(trends[0].avg_score);
  const last = Number(trends[trends.length - 1].avg_score);
  const diff = last - first;
  if (Math.abs(diff) < 0.5) return { text: 'Stable', color: '#64748b' };
  if (diff > 0) return { text: `Up ${diff.toFixed(1)} points`, color: '#15803d' };
  return { text: `Down ${Math.abs(diff).toFixed(1)} points`, color: '#b91c1c' };
}

export default function TrendsPage() {
  const [grade, setGrade] = useState('Grade 7');
  const [subject, setSubject] = useState('');
  const [stream, setStream] = useState('');
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const token = localStorage.getItem('educore_token');

  async function handleSearch() {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ grade, subject: subject.trim() });
      if (stream) params.append('stream', stream);
      const res = await fetch(API_BASE + '/exams/trends?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to load trends');
      const data = await res.json();
      setTrends(data.trends);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const maxScore = trends.length ? Math.max(...trends.map((t) => Number(t.avg_score))) : 100;
  const direction = trends.length ? trendDirection(trends) : null;

  return (
    <div style={styles.page}>
      <div style={styles.title}>Term-over-Term Trends</div>
      <div style={styles.subtitle}>Track average subject performance across terms and years.</div>

      <div style={styles.controls}>
        <select style={styles.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input
          style={styles.input}
          placeholder="Subject (e.g. English)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          style={styles.input}
          placeholder="Stream (optional)"
          value={stream}
          onChange={(e) => setStream(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button style={styles.button} onClick={handleSearch}>View Trends</button>
      </div>

      {loading && <div style={styles.empty}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {searched && !loading && !error && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            {grade} — {subject}{stream ? ' (Stream ' + stream + ')' : ' (All Streams)'}
          </div>
          {trends.length === 0 ? (
            <div style={styles.empty}>No score data found for this subject yet.</div>
          ) : (
            <>
              {trends.map((t, i) => (
                <div key={i} style={styles.barRow}>
                  <div style={styles.barLabel}>{t.academic_year} T{t.term}</div>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: (Number(t.avg_score) / maxScore) * 100 + '%' }} />
                  </div>
                  <div style={styles.barValue}>{t.avg_score}%</div>
                </div>
              ))}
              {direction && (
                <div style={{ ...styles.trendNote, color: direction.color }}>{direction.text} over this period</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}