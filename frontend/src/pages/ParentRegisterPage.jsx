import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parentAPI } from '../utils/api';

const styles = {
  page: { minHeight: '100vh', background: '#0a1628', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' },
  card: { background: '#132339', borderRadius: 12, padding: 24, marginBottom: 16, border: '0.5px solid #1e3a5f' },
  label: { fontSize: 12, color: '#8ba3c7', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #2d4a6d', background: '#0e1e33', color: '#fff', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#185fa5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

export default function ParentRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    admissionNo: '', lastName: '', fullName: '', email: '', password: '', confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (!form.admissionNo || !form.lastName || !form.fullName || !form.email || !form.password) {
      setErr('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await parentAPI.register({
        admissionNo: form.admissionNo,
        lastName: form.lastName,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      toast.success('Account created! Please log in.');
      navigate('/parent');
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Create Parent Account</div>
          <div style={{ fontSize: 13, color: '#6b8cba', marginTop: 4 }}>Link your account to your child's records</div>
        </div>

        <form onSubmit={handleSubmit} style={styles.card}>
          <label style={styles.label}>Learner's admission number</label>
          <input style={styles.input} value={form.admissionNo} onChange={handleChange('admissionNo')} placeholder="e.g. 2025/004" />

          <label style={styles.label}>Learner's last name</label>
          <input style={styles.input} value={form.lastName} onChange={handleChange('lastName')} placeholder="As registered at school" />

          <label style={styles.label}>Your full name</label>
          <input style={styles.input} value={form.fullName} onChange={handleChange('fullName')} placeholder="Your name" />

          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={form.email} onChange={handleChange('email')} placeholder="you@example.com" />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={form.password} onChange={handleChange('password')} placeholder="At least 6 characters" />

          <label style={styles.label}>Confirm password</label>
          <input style={{ ...styles.input, marginBottom: 18 }} type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Repeat password" />

          {err && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 14 }}>{err}</div>}

          <button type="submit" disabled={submitting} style={{ ...styles.btn, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#6b8cba' }}>
          Already have an account? <Link to="/parent" style={{ color: '#185fa5' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
