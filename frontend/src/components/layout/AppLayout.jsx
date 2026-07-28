import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { section: 'Overview' },
  { to: '/',             icon: '🏠', label: 'Dashboard',    visible: () => true },

  { section: 'Academics' },
  { to: '/examinations', icon: '📝', label: 'Examinations', visible: () => true },
  { to: '/learners',     icon: '🧑‍🎓', label: 'Learners',    visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/attendance',   icon: '✅', label: 'Attendance',   visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/assignments',  icon: '📚', label: 'Assignments',  visible: () => true },
  { to: '/reports',      icon: '📄', label: 'Report Forms', visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },

  { section: 'Admin' },
  { to: '/content',      icon: '✏️', label: 'Content Generation', visible: (a) => a.isAdminTier },
  { to: '/portal',       icon: '💬', label: 'Parent Portal',      visible: (a) => a.isAdminTier },
  { to: '/teachers',     icon: '👩‍🏫', label: 'Teachers',          visible: (a) => a.isAdminTier },

  { section: 'Platform' },
  { to: '/super-admin',  icon: '🛡️', label: 'Super Admin',       visible: (a) => a.user?.role === 'super_admin' },
];

function buildNav(auth) {
  const result = [];
  for (let i = 0; i < NAV_ITEMS.length; i++) {
    const item = NAV_ITEMS[i];
    if (item.section) {
      let end = i + 1;
      while (end < NAV_ITEMS.length && !NAV_ITEMS[end].section) end++;
      const children = NAV_ITEMS.slice(i + 1, end);
      const hasVisibleChild = children.some(child => child.visible(auth));
      if (hasVisibleChild) result.push(item);
    } else if (item.visible(auth)) {
      result.push(item);
    }
  }
  return result;
}

export default function AppLayout() {
  const auth = useAuth();
  const { user, logout, schoolName } = auth;
  const navigate = useNavigate();
  const NAV = buildNav(auth);

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const initials = user?.teacher
    ? `${user.teacher.first_name?.[0]}${user.teacher.last_name?.[0]}`
    : user?.email?.slice(0,2).toUpperCase();

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,sans-serif', fontSize:'13px' }}>
      <div style={{ width:'200px', background:'#0F1F4D', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px', borderBottom:'0.5px solid rgba(212,175,55,0.25)', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', background:'#D4AF37', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>🏫</div>
          <div>
            <div style={{ color:'#fff', fontSize:'13px', fontWeight:'500' }}>EduCore</div>
            <div style={{ color:'#D4AF37', fontSize:'10px' }}>Exam Analyzer</div>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} style={{ color:'#8496C4', fontSize:'10px', fontWeight:'500', letterSpacing:'0.7px', textTransform:'uppercase', padding:'10px 14px 4px' }}>
                {item.section}
              </div>
            );
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:'8px',
                  padding:'8px 14px',
                  color: isActive ? '#D4AF37' : '#A9B8DC',
                  background: isActive ? 'rgba(212,175,55,0.12)' : 'transparent',
                  borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                  textDecoration:'none', fontSize:'12px',
                })}>
                <span style={{ fontSize:'15px', width:'18px', textAlign:'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding:'12px 14px', borderTop:'0.5px solid rgba(212,175,55,0.25)', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#D4AF37', display:'flex', alignItems:'center', justifyContent:'center', color:'#0F1F4D', fontSize:'11px', fontWeight:'600', flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#E8ECF7', fontSize:'11px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.teacher ? `${user.teacher.first_name} ${user.teacher.last_name}` : user?.email}
            </div>
            <div style={{ color:'#8496C4', fontSize:'10px', textTransform:'capitalize' }}>{user?.role?.replace('_',' ')}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'#8496C4', cursor:'pointer', fontSize:'16px' }}>🚪</button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#F4F5F9' }}>
        <div style={{ background:'#fff', borderBottom:'2px solid #D4AF37', padding:'0 18px', height:'50px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:'13px', color:'#0F1F4D', fontWeight:'500' }}>{schoolName}</span>
          <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', background:'rgba(212,175,55,0.15)', color:'#8A6D1D' }}>📅 Term 2 · 2025/2026</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
