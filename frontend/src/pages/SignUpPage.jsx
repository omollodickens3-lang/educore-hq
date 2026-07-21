import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { schoolsAPI } from '../utils/api';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0a1628',
  border: '1px solid #1e3a5f',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  color: '#8faad0',
  fontSize: '13px',
  marginBottom: '6px',
  fontWeight: 500,
};

const fieldWrapStyle = { marginBottom: '16px' };

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    schoolName: '',
    subdomain: '',
    county: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [subdomainStatus, setSubdomainStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const checkSubdomain = useCallback((value) => {
    if (!value) {
      setSubdomainStatus(null);
      return;
    }
    setSubdomainStatus('checking');
    schoolsAPI
      .checkSubdomain(value)
      .then((res) => {
        setSubdomainStatus(res.data.available ? 'available' : 'taken');
      })
      .catch(() => {
        setSubdomainStatus(null);
      });
  }, []);

  useEffect(() => {
    const cleaned = form.subdomain.trim().toLowerCase();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkSubdomain(cleaned), 500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subdomain]);

  const handleSubmit = async () => {
    if (!form.schoolName || !form.subdomain || !form.contactName || !form.contactPhone || !form.contactEmail || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (subdomainStatus === 'taken') {
      toast.error('That subdomain is already taken');
      return;
    }

    setSubmitting(true);
    try {
      await schoolsAPI.register({
        schoolName: form.schoolName,
        subdomain: form.subdomain.trim().toLowerCase(),
        county: form.county,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        password: form.password,
      });
      setSubmitted(true);
      toast.success('Registration submitted!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#111f35', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '40px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#10003;</div>
          <h1 style={{ color: '#e2e8f0', fontSize: '20px', marginBottom: '10px' }}>Registration submitted</h1>
          <p style={{ color: '#8faad0', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Thanks for registering {form.schoolName}. Our team will review your submission and get back to you at{' '}
            <span style={{ color: '#e2e8f0' }}>{form.contactEmail}</span> once it's approved.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '10px 20px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#111f35', border: '1px solid #1e3a5f', borderRadius: '12px', padding: '36px', maxWidth: '480px', width: '100%' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '22px', marginBottom: '4px' }}>Register your school</h1>
        <p style={{ color: '#6b8cba', fontSize: '13px', marginBottom: '28px' }}>
          Get EduCore set up for your school. We'll review and approve your account shortly.
        </p>

        <div style={fieldWrapStyle}>
          <label style={labelStyle}>School name *</label>
          <input style={inputStyle} value={form.schoolName} onChange={handleChange('schoolName')} placeholder="e.g. Westside School" />
        </div>

        <div style={fieldWrapStyle}>
          <label style={labelStyle}>Subdomain *</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={form.subdomain}
              onChange={handleChange('subdomain')}
              placeholder="westside"
            />
            <span style={{ color: '#6b8cba', fontSize: '13px', whiteSpace: 'nowrap' }}>.educore-hq.vercel.app</span>
          </div>
          {subdomainStatus === 'checking' && <p style={{ color: '#6b8cba', fontSize: '12px', marginTop: '6px' }}>Checking availability...</p>}
          {subdomainStatus === 'available' && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '6px' }}>Available</p>}
          {subdomainStatus === 'taken' && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>Already taken</p>}
        </div>

        <div style={fieldWrapStyle}>
          <label style={labelStyle}>County</label>
          <input style={inputStyle} value={form.county} onChange={handleChange('county')} placeholder="e.g. Nairobi" />
        </div>

        <div style={fieldWrapStyle}>
          <label style={labelStyle}>Your name *</label>
          <input style={inputStyle} value={form.contactName} onChange={handleChange('contactName')} placeholder="Full name" />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Phone *</label>
            <input style={inputStyle} value={form.contactPhone} onChange={handleChange('contactPhone')} placeholder="07XX XXX XXX" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={form.contactEmail} onChange={handleChange('contactEmail')} placeholder="you@school.ac.ke" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Password *</label>
            <input style={inputStyle} type="password" value={form.password} onChange={handleChange('password')} placeholder="At least 6 characters" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Confirm password *</label>
            <input style={inputStyle} type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Repeat password" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px',
            background: submitting ? '#123a5e' : '#185fa5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit registration'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '16px', color: '#6b8cba', fontSize: '13px' }}>
          Already have an account? <Link to="/login" style={{ color: '#185fa5' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
