import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!email) {
      setErr('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      // Backend always returns a generic success message regardless of
      // whether the email exists, so a request error here is a genuine
      // failure (network/server), not "email not found".
      setErr(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: '#185fa5', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '28px' }}>🏫</div>
          <div style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>EduCore</div>
        </div>

        <div style={{ background: '#111f35', border: '0.5px solid #1e3a5f', borderRadius: '12px', padding: '28px' }}>
          {sent ? (
            <>
              <h1 style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Check your email</h1>
              <p style={{ color: '#8faad0', fontSize: '13px', lineHeight: '1.6' }}>
                If an account exists for <strong style={{ color: '#e6f1fb' }}>{email}</strong>, we've sent a link to reset your password. It expires in 1 hour.
              </p>
              <p style={{ color: '#6b8cba', fontSize: '12px', marginTop: '16px' }}>
                Didn't get it? Check your spam folder, or <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: '#185fa5', cursor: 'pointer', fontSize: '12px', padding: 0 }}>try again</button>.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Reset your password</h1>
              <p style={{ color: '#8faad0', fontSize: '13px', marginBottom: '20px' }}>Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#8faad0', fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '9px 12px', background: '#0a1628', border: '0.5px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {err && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '14px' }}>{err}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '10px', background: loading ? '#0c447c' : '#185fa5', color: '#e6f1fb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#6b8cba', fontSize: '13px' }}>
            <Link to="/login" style={{ color: '#185fa5' }}>&larr; Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
