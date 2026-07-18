import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

const GRADES = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'];

const styles = {
  page: { padding: 24, color: '#e5e7eb' },
  title: { textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 4 },
  subtitle: { textAlign: 'center', fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  controls: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' },
  select: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px' },
  input: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', width: 80 },
  button: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  card: { background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20, maxWidth: 700, margin: '0 auto' },
  tableHeader: { textAlign: 'left', fontSize: 12, color: '#9ca3af', padding: '6px 8px', borderBottom: '1px solid #1f2937' },
  tableCell: { padding: '8px', fontSize: 14, borderBottom: '1px solid #1f2937' },
  error: { color: '#f87171', textAlign: 'center' },
  loading: { color: '#9ca3af', textAlign: 'center' },
};

export default function ClassListPage() {
  const [grade, setGrade] = useState('Grade 7');
  const [stream, setStream] = useState('');
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const token = localStorage.getItem('educore_token');

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ grade });
      if (stream) params.append('stream', stream);
      const res = await fetch(API_BASE + '/learners/class-list?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to load class list');
      const data = await res.json();
      setLearners(data.learners);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format) {
    const params = new URLSearchParams({ grade });
    if (stream) params.append('stream', stream);
    const res = await fetch(API_BASE + '/learners/class-list/' + format + '?' + params.toString(), {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) {
      setError('Failed to export ' + format.toUpperCase());
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class_list_' + grade.replace(/\s+/g, '_') + (stream ? '_' + stream : '') + '.' + format;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.page}>
      <div style={styles.title}>Class Lists</div>
      <div style={styles.subtitle}>Learner roster with admission number, stream, and gender.</div>

      <div style={styles.controls}>
        <select style={styles.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input
          style={styles.input}
          placeholder="Stream (optional)"
          value={stream}
          onChange={(e) => setStream(e.target.value)}
        />
        <button style={styles.button} onClick={handleSearch}>Search</button>
        {searched && learners.length > 0 && (
          <>
            <button style={styles.button} onClick={() => handleExport('csv')}>Export CSV</button>
            <button style={styles.button} onClick={() => handleExport('pdf')}>Export PDF</button>
          </>
        )}
      </div>

      {loading && <div style={styles.loading}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {searched && !loading && !error && (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 16 }}>
            {grade}{stream ? ' Stream ' + stream : ' (All Streams)'} — {learners.length} learner{learners.length !== 1 ? 's' : ''}
          </div>
          {learners.length === 0 ? (
            <div style={styles.loading}>No learners found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>#</th>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Adm. No</th>
                  <th style={styles.tableHeader}>Stream</th>
                  <th style={styles.tableHeader}>Gender</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, i) => (
                  <tr key={i}>
                    <td style={styles.tableCell}>{i + 1}</td>
                    <td style={styles.tableCell}>{l.first_name} {l.last_name}</td>
                    <td style={styles.tableCell}>{l.admission_no}</td>
                    <td style={styles.tableCell}>{l.stream}</td>
                    <td style={styles.tableCell}>{l.gender || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}