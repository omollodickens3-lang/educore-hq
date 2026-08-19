import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (!token) {
      setErr('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (newPassword.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      toast.success('Password reset! Please log in with your new password.');
      navigate('/login');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: '#0a1628', border: '0.5px solid #1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', color: '#8faad0', fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: '#185fa5', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '28px' }}>🏫</div>
          <div style={{ color: '#fff', fontSize: '22px', fontWeight: '600' }}>EduCore</div>
        </div>

        <div style={{ background: '#111f35', border: '0.5px solid #1e3a5f', borderRadius: '12px', padding: '28px' }}>
          <h1 style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '20px' }}>Set a new password</h1>

          {!token ? (
            <p style={{ color: '#f87171', fontSize: '13px' }}>
              This reset link is invalid or incomplete. Please request a new one from the{' '}
              <Link to="/forgot-password" style={{ color: '#185fa5' }}>forgot password page</Link>.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={inputStyle} />
              </div>

              {err && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '14px' }}>{err}</p>}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '10px', background: loading ? '#0c447c' : '#185fa5', color: '#e6f1fb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#6b8cba', fontSize: '13px' }}>
            <Link to="/login" style={{ color: '#185fa5' }}>&larr; Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
