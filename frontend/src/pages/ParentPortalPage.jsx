import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parentAPI, feesAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ParentPortalPage() {
  const { user, isParent, login, logout, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [err, setErr] = useState('');

  const [feeTerm, setFeeTerm] = useState('2');
  const [feeYear, setFeeYear] = useState('2025/2026');
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user && isParent) {
      setDataLoading(true);
      parentAPI.getMyChild()
        .then(res => {
          setData(res.data);
          if (res.data?.learner?.parent_phone) setPayPhone(res.data.learner.parent_phone);
        })
        .catch(e => setErr(e.response?.data?.error || 'Failed to load data'))
        .finally(() => setDataLoading(false));
    }
  }, [user, isParent]);

  async function checkBalance() {
    if (!data?.learner?.id) return;
    setBalanceLoading(true);
    try {
      const res = await feesAPI.getBalance(data.learner.id, feeTerm, feeYear);
      setBalance(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to fetch balance');
    } finally {
      setBalanceLoading(false);
    }
  }

  async function payNow() {
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter an amount to pay'); return; }
    if (!payPhone) { toast.error('Enter the M-Pesa phone number'); return; }
    setPaying(true);
    try {
      const res = await feesAPI.pay(data.learner.id, {
        purpose: 'school_fee',
        amount: Number(payAmount),
        phone: payPhone,
        term: feeTerm,
        academicYear: feeYear,
      });
      toast.success(res.data.message || 'STK push sent — check your phone.');
      setPayAmount('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not start payment');
    } finally {
      setPaying(false);
    }
  }

  async function loadHistory() {
    if (!data?.learner?.id) return;
    setShowHistory(true);
    try {
      const res = await feesAPI.getHistory(data.learner.id);
      setHistory(res.data.payments || []);
    } catch (e) {
      toast.error('Failed to load payment history');
    }
  }

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
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Fees</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <select value={feeTerm} onChange={e => setFeeTerm(e.target.value)}
                style={{ ...styles.input, marginBottom: 0, width: 90 }}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
              <input value={feeYear} onChange={e => setFeeYear(e.target.value)}
                placeholder="2025/2026" style={{ ...styles.input, marginBottom: 0, width: 120 }} />
              <button onClick={checkBalance} disabled={balanceLoading}
                style={{ ...styles.btn, width: 'auto', padding: '10px 16px' }}>
                {balanceLoading ? 'Checking...' : 'Check Balance'}
              </button>
            </div>

            {balance && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14 }}>
                  School fee balance: <strong style={{ color: balance.schoolFee.balance > 0 ? '#f87171' : '#4ade80' }}>
                    KES {Number(balance.schoolFee.balance).toLocaleString()}
                  </strong>
                  <span style={{ color: '#6b8cba', fontSize: 12 }}> (of KES {Number(balance.schoolFee.due).toLocaleString()})</span>
                </div>
                {balance.examFees.map((ef, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#8ba3c7', marginTop: 4 }}>
                    {ef.examName}: KES {Number(ef.balance).toLocaleString()} outstanding
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="Amount (KES)" style={{ ...styles.input, marginBottom: 0, width: 140 }} />
              <input value={payPhone} onChange={e => setPayPhone(e.target.value)}
                placeholder="M-Pesa phone e.g. 0712345678" style={{ ...styles.input, marginBottom: 0, width: 200 }} />
              <button onClick={payNow} disabled={paying}
                style={{ ...styles.btn, width: 'auto', padding: '10px 16px', background: '#16a34a' }}>
                {paying ? 'Sending...' : 'Pay with M-Pesa'}
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={loadHistory}
                style={{ background: 'none', border: 'none', color: '#8ba3c7', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                {showHistory ? 'Hide' : 'View'} payment history
              </button>
              {showHistory && (
                <div style={{ marginTop: 8 }}>
                  {history.length === 0 && <div style={{ color: '#8ba3c7', fontSize: 13 }}>No payments yet.</div>}
                  {history.map(p => (
                    <div key={p.id} style={{ padding: '6px 0', borderBottom: '0.5px solid #1e3a5f', fontSize: 13 }}>
                      KES {Number(p.amount).toLocaleString()} · {p.purpose === 'school_fee' ? 'School fee' : 'Exam fee'} ·{' '}
                      <span style={{
                        color: p.status === 'confirmed' ? '#4ade80' : p.status === 'failed' ? '#f87171' : '#facc15'
                      }}>{p.status}</span>
                      {' '}· {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
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
