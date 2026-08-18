import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parentAPI, schoolsAPI } from '../utils/api';

const styles = {
  page: { minHeight: '100vh', background: '#0a1628', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' },
  card: { background: '#132339', borderRadius: 12, padding: 24, marginBottom: 16, border: '0.5px solid #1e3a5f' },
  label: { fontSize: 12, color: '#8ba3c7', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #2d4a6d', background: '#0e1e33', color: '#fff', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#185fa5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

function SchoolPicker({ schoolId, schoolName, onSelect }) {
  const [query, setQuery] = useState(schoolName || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    onSelect(null, value); // clear selection when typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await schoolsAPI.search(value.trim());
        setResults(res.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        style={{ ...styles.input, marginBottom: 4 }}
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Start typing your child's school name..."
        autoComplete="off"
      />
      {schoolId && (
        <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 10 }}>&#10003; School selected</div>
      )}
      {!schoolId && (
        <div style={{ fontSize: 11, color: '#6b8cba', marginBottom: 10 }}>
          {searching ? 'Searching...' : 'Select your school from the list before continuing'}
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: '#0e1e33', border: '0.5px solid #2d4a6d', borderRadius: 8,
          marginTop: -8, maxHeight: 200, overflowY: 'auto',
        }}>
          {results.map(s => (
            <div
              key={s.id}
              onClick={() => { onSelect(s.id, s.name); setQuery(s.name); setOpen(false); }}
              style={{ padding: '10px 12px', fontSize: 14, color: '#e2e8f0', cursor: 'pointer', borderBottom: '0.5px solid #1e3a5f' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#132339'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParentRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    admissionNo: '', lastName: '', fullName: '', email: '', password: '', confirmPassword: '',
  });
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  function handleSchoolSelect(id, name) {
    setSchoolId(id);
    setSchoolName(name);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (!schoolId) {
      setErr("Please select your child's school from the search results.");
      return;
    }
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
        schoolId,
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
          <label style={styles.label}>Child's school</label>
          <SchoolPicker schoolId={schoolId} schoolName={schoolName} onSelect={handleSchoolSelect} />

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
