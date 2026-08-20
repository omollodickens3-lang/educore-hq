import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'parent') {
        toast('This login is for school staff. Redirecting you to the Parent Portal...', { icon: '↪️' });
        navigate('/parent');
        return;
      }
      toast.success('Welcome to EduCore!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

    return (
    <div style={{ minHeight:'100vh', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>

        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <img src="data:image/png;base64,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" alt="EduCore" style={{ width:'56px', height:'56px', borderRadius:'14px', margin:'0 auto 14px', display:'block' }} />
          <div style={{ color:'#fff', fontSize:'22px', fontWeight:'600' }}>EduCore</div>
          <div style={{ color:'#6b8cba', fontSize:'13px', marginTop:'4px' }}>CBC School Management Platform</div>
        </div>

        <div style={{ background:'#111f35', border:'0.5px solid #1e3a5f', borderRadius:'12px', padding:'28px' }}>
          <h1 style={{ color:'#fff', fontSize:'16px', fontWeight:'500', marginBottom:'20px' }}>Sign in to your account</h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', color:'#8faad0', fontSize:'11px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'5px' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                style={{ width:'100%', padding:'9px 12px', background:'#0a1628', border:'0.5px solid #1e3a5f', borderRadius:'8px', color:'#fff', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ marginBottom:'8px' }}>
              <label style={{ display:'block', color:'#8faad0', fontSize:'11px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'5px' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ width:'100%', padding:'9px 12px', background:'#0a1628', border:'0.5px solid #1e3a5f', borderRadius:'8px', color:'#fff', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <a href="/forgot-password" style={{ color: '#6b8cba', fontSize: '12px', textDecoration: 'none' }}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'10px', background: loading ? '#0c447c' : '#185fa5', color:'#e6f1fb', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

        <p style={{ textAlign: 'center', marginTop: '16px', color: '#6b8cba', fontSize: '13px' }}>
          New school? <a href="/register" style={{ color: '#185fa5' }}>Register here</a>
        </p>
        </div>

        <p style={{ color:'#4a6a94', fontSize:'11px', textAlign:'center', marginTop:'16px' }}>
          © 2026 EduCore · CBC School Management · Kenya
        </p>
      </div>
    </div>
  );
}
