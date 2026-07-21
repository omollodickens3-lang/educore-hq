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
      toast.success('Welcome to EduCore!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const demoAccounts = [
    { role: 'Admin', email: 'admin@westside.ac.ke', pass: 'Admin@2026' },
    { role: 'Teacher', email: 'teacher@westside.ac.ke', pass: 'Teacher@2026' },
    { role: 'Parent', email: 'parent@westside.ac.ke', pass: 'Parent@2026' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>

        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'56px', height:'56px', background:'#185fa5', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:'28px' }}>🏫</div>
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

            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', color:'#8faad0', fontSize:'11px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'5px' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ width:'100%', padding:'9px 12px', background:'#0a1628', border:'0.5px solid #1e3a5f', borderRadius:'8px', color:'#fff', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'10px', background: loading ? '#0c447c' : '#185fa5', color:'#e6f1fb', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

        <p style={{ textAlign: 'center', marginTop: '16px', color: '#6b8cba', fontSize: '13px' }}>
          New school? <a href="/register" style={{ color: '#185fa5' }}>Register here</a>
        </p>

          <div style={{ marginTop:'20px', padding:'12px', background:'#0a1628', borderRadius:'8px', border:'0.5px solid #1e3a5f' }}>
            <div style={{ color:'#6b8cba', fontSize:'10px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Demo accounts</div>
            {demoAccounts.map(d => (
              <div key={d.role} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                <div>
                  <span style={{ color:'#8faad0', fontSize:'11px' }}>{d.role}: </span>
                  <span style={{ color:'#c8d8ee', fontSize:'11px' }}>{d.email}</span>
                </div>
                <button onClick={() => setForm({ email: d.email, password: d.pass })}
                  style={{ background:'#185fa5', color:'#e6f1fb', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', cursor:'pointer', fontFamily:'inherit' }}>
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color:'#4a6a94', fontSize:'11px', textAlign:'center', marginTop:'16px' }}>
          © 2026 EduCore · CBC School Management · Kenya
        </p>
      </div>
    </div>
  );
}