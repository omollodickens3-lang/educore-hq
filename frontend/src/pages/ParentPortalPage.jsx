import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parentAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ParentPortalPage() {
  const { user, isParent, login, logout, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user && isParent) {
      setDataLoading(true);
      parentAPI.getMyChild()
        .then(res => setData(res.data))
        .catch(e => setErr(e.response?.data?.error || 'Failed to load data'))
        .finally(() => setDataLoading(false));
    }
  }, [user, isParent]);

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      const loggedInUser = await login(form.email, form.password);
      if (loggedInUser.role !== 'parent') {
        toast.error('This login is for parent accounts only.');
        logout();
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  const styles = {
    page: { minHeight: '100vh', background: '#0a1628', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' },
    card: { background: '#132339', borderRadius: 12, padding: 24, marginBottom: 16, border: '0.5px solid #1e3a5f' },
    label: { fontSize: 12, color: '#8ba3c7', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #2d4a6d', background: '#0e1e33', color: '#fff', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' },
    btn: { width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#185fa5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  if (authLoading) {
    return <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!user || !isParent) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>EduCore Parent Portal</div>
            <div style={{ fontSize: 13, color: '#6b8cba', marginTop: 4 }}>View your child's progress</div>
          </div>
          <form onSubmit={handleLogin} style={styles.card}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
            {err && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{err}</div>}
            <button style={styles.btn} type="submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#6b8cba', marginTop: 16 }}>
          New parent? <a href="/parent/register" style={{ color: '#185fa5' }}>Create an account</a>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Parent Portal</div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#8ba3c7', cursor: 'pointer', fontSize: 13 }}>Log out</button>
      </div>

      {dataLoading && <div style={{ color: '#8ba3c7' }}>Loading...</div>}
      {err && <div style={{ color: '#f87171' }}>{err}</div>}

      {data && (
        <>
          <div style={styles.card}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
              {data.learner.first_name} {data.learner.last_name}
            </div>
            <div style={{ fontSize: 13, color: '#8ba3c7', marginTop: 4 }}>
              {data.learner.grade} · Stream {data.learner.stream} · Adm No. {data.learner.admission_no}
            </div>
            <div style={{ marginTop: 12, fontSize: 14 }}>
              Attendance rate: <strong style={{ color: data.attendanceRate < 75 ? '#f87171' : '#4ade80' }}>{data.attendanceRate}%</strong>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Exam Results</div>
            {data.scores.length === 0 && <div style={{ color: '#8ba3c7', fontSize: 13 }}>No exam results yet.</div>}
            {data.scores.map((s, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '0.5px solid #1e3a5f', fontSize: 14 }}>
                <strong>{s.subject}</strong> — {s.score}/{s.max_score} ({s.grade_label}) · {s.exam_name}
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Attendance History</div>
            {data.attendance.length === 0 && <div style={{ color: '#8ba3c7', fontSize: 13 }}>No attendance records yet.</div>}
            {data.attendance.map((a, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '0.5px solid #1e3a5f', fontSize: 13 }}>
                {a.date} — {a.status} ({a.session})
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Conduct Log</div>
            {data.conduct.length === 0 && <div style={{ color: '#8ba3c7', fontSize: 13 }}>No conduct entries yet.</div>}
            {data.conduct.map((c, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '0.5px solid #1e3a5f', fontSize: 13 }}>
                <strong>{c.category}</strong> ({c.type}) — {c.description}
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Notifications</div>
            {data.notifications.length === 0 && <div style={{ color: '#8ba3c7', fontSize: 13 }}>No notifications yet.</div>}
            {data.notifications.map((n, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '0.5px solid #1e3a5f', fontSize: 13 }}>
                {n.message}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
