import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { section: 'Main' },
  { to: '/',            icon: '🏠', label: 'Dashboard' },
  { to: '/learners',    icon: '🎓', label: 'Learners' },
  { to: '/teachers',     icon: '🧑‍🏫', label: 'Teachers' },
  { to: '/classes',      icon: '🏫', label: 'Manage Classes' },
  { section: 'Academics' },
  { to: '/examinations',icon: '📝', label: 'Examinations' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/broadsheet', icon: '🗒️', label: 'Broadsheet' },
  { to: '/class-list', icon: '🧾', label: 'Class Lists' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/trends', icon: '📈', label: 'Trends' },
  { to: '/reports',     icon: '📋', label: 'Report Forms' },
  { to: '/attendance',  icon: '✅', label: 'Attendance' },
  { to: '/assignments', icon: '📚', label: 'Assignments' },
  { section: 'Content' },
  { to: '/content',     icon: '✨', label: 'Content Gen' },
  { to: '/portal',      icon: '👪', label: 'Parent Portal' },
];

export default function AppLayout() {
  const { user, logout, schoolName } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  function handleNavClick() {
    setMobileNavOpen(false);
  }

  const initials = user?.teacher
    ? `${user.teacher.first_name?.[0]}${user.teacher.last_name?.[0]}`
    : user?.email?.slice(0,2).toUpperCase();

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,sans-serif', fontSize:'13px' }}>
      <style>{`
        .ec-sidebar { transition: transform 0.25s ease; }
        .ec-backdrop { display: none; }
        @media (max-width: 768px) {
          .ec-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 40;
            transform: translateX(-100%);
            width: 210px !important;
          }
          .ec-sidebar.ec-open { transform: translateX(0); }
          .ec-hamburger { display: flex !important; }
          .ec-backdrop.ec-open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 30;
          }
          .ec-header-inner {
            flex-wrap: wrap !important;
            gap: 6px;
            height: auto !important;
            padding: 8px 12px !important;
          }
          .ec-school-name { font-size: 12px !important; }
        }
      `}</style>

      <div className={"ec-sidebar" + (mobileNavOpen ? " ec-open" : "")}
           style={{ width:'200px', background:'#0a1628', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', background:'#185fa5', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>{'\u{1F3EB}'}</div>
          <div>
            <div style={{ color:'#fff', fontSize:'13px', fontWeight:'500' }}>EduCore</div>
            <div style={{ color:'#6b8cba', fontSize:'10px' }}>CBC Platform</div>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} style={{ color:'#4a6a94', fontSize:'10px', fontWeight:'500', letterSpacing:'0.7px', textTransform:'uppercase', padding:'10px 14px 4px' }}>
                {item.section}
              </div>
            );
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={handleNavClick}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:'8px',
                  padding:'8px 14px',
                  color: isActive ? '#7eb3f5' : '#8faad0',
                  background: isActive ? 'rgba(41,98,180,0.22)' : 'transparent',
                  borderLeft: isActive ? '2px solid #3b7bd4' : '2px solid transparent',
                  textDecoration:'none', fontSize:'12px',
                })}>
                <span style={{ fontSize:'15px', width:'18px', textAlign:'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding:'12px 14px', borderTop:'0.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#185fa5', display:'flex', alignItems:'center', justifyContent:'center', color:'#e6f1fb', fontSize:'11px', fontWeight:'500', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#c8d8ee', fontSize:'11px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.teacher ? `${user.teacher.first_name} ${user.teacher.last_name}` : user?.email}
            </div>
            <div style={{ color:'#4a6a94', fontSize:'10px', textTransform:'capitalize' }}>{user?.role?.replace('_',' ')}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'#4a6a94', cursor:'pointer', fontSize:'16px' }}>🚪</button>
        </div>
      </div>

      <div className={"ec-backdrop" + (mobileNavOpen ? " ec-open" : "")} onClick={() => setMobileNavOpen(false)} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#f1f5f9', minWidth:0 }}>
        <div className="ec-header-inner" style={{ background:'#fff', borderBottom:'0.5px solid #e2e8f0', padding:'0 18px', height:'50px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
            <button className="ec-hamburger" onClick={() => setMobileNavOpen(true)}
              style={{ display:'none', background:'none', border:'none', fontSize:'20px', cursor:'pointer', padding:'4px' }}>
              ☰
            </button>
            <span className="ec-school-name" style={{ fontSize:'13px', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{schoolName}</span>
          </div>
          <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', background:'#e6f1fb', color:'#185fa5', whiteSpace:'nowrap', flexShrink:0 }}>📅 Term 2 · 2025/2026</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}