import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { authAPI } from '../../utils/api';

const NAV_ITEMS = [
  { section: 'Overview' },
  { to: '/',             icon: '🏠', label: 'Dashboard',    visible: () => true },

  { section: 'Academics' },
  { to: '/examinations', icon: '📝', label: 'Examinations', visible: () => true },
  { to: '/learners',     icon: '🧑‍🎓', label: 'Learners',    visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/attendance',   icon: '✅', label: 'Attendance',   visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/my-class',     icon: '🎒', label: 'My Class',     visible: (a) => a.user?.role === 'class_teacher' },
  { to: '/assignments',  icon: '📚', label: 'Assignments',  visible: () => true },
  { to: '/conduct',      icon: '🧭', label: 'Conduct',       visible: () => true },
  { to: '/reports',      icon: '📄', label: 'Report Forms', visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/rubrics',      icon: '🧩', label: 'Rubrics',      visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/broadsheet',   icon: '📊', label: 'Broadsheet',     visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/at-risk',      icon: '🚨', label: 'At-Risk Learners', visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/notifications', icon: '🔔', label: 'Notifications',   visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },
  { to: '/class-list',   icon: '📋', label: 'Class Lists',      visible: (a) => a.isAdminTier || a.user?.role === 'class_teacher' },

  { section: 'Admin' },
  { to: '/content',      icon: '✏️', label: 'Content Generation', visible: (a) => a.isAdminTier },
  { to: '/portal',       icon: '💬', label: 'Parent Portal',      visible: (a) => a.isAdminTier },
  { to: '/teachers',     icon: '👩‍🏫', label: 'Teachers',          visible: (a) => a.isAdminTier },
  { to: '/analytics',    icon: '📊', label: 'Analytics',         visible: (a) => a.isAdminTier },
  { to: '/classes',      icon: '🏫', label: 'Manage Classes',    visible: (a) => a.isAdminTier },
  { to: '/school-profile', icon: '🏷️', label: 'School Profile',  visible: (a) => a.isAdminTier },
  { to: '/fees',           icon: '💰', label: 'Fees',              visible: (a) => a.isAdminTier },
{ section: 'Support' },
{ to: '/help',         icon: '💬', label: 'Help & Support', visible: () => true },
  { section: 'Platform' },
  { to: '/super-admin',  icon: '🛡️', label: 'Super Admin',       visible: (a) => a.user?.role === 'super_admin' },
  { to: '/pending-registrations', icon: '📥', label: 'Pending Registrations', visible: (a) => a.user?.role === 'super_admin' },
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

// Mobile breakpoint: below this width, the sidebar becomes an off-canvas
// drawer opened by a hamburger button instead of a permanent column.
const MOBILE_BREAKPOINT = 860;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErr('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
    fontSize: '14px', marginTop: '4px', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', borderRadius: '14px', padding: '28px',
        width: '380px', maxWidth: '92vw', border: '1px solid #334155',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#e2e8f0', fontSize: '18px', marginBottom: '18px' }}>Change Password</h2>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Current password
            <input style={inputStyle} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <div style={{ height: '12px' }} />
          <label style={labelStyle}>New password
            <input style={inputStyle} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          <div style={{ height: '12px' }} />
          <label style={labelStyle}>Confirm new password
            <input style={inputStyle} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>

          {err && (
            <p style={{ color: '#f87171', fontSize: '13px', marginTop: '14px', marginBottom: 0 }}>{err}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 16px', borderRadius: '8px', border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none',
              background: '#185fa5', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Update Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  async function handleDelete(e) {
    e.preventDefault();
    setErr('');
    if (!password) {
      setErr('Please enter your password to confirm.');
      return;
    }
    if (confirmText !== 'DELETE') {
      setErr('Please type DELETE exactly to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await authAPI.deleteAccount(password);
      toast.success('Your account has been deleted');
      logout();
      navigate('/login');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
    fontSize: '14px', marginTop: '4px', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', borderRadius: '14px', padding: '28px',
        width: '380px', maxWidth: '92vw', border: '1px solid #7f1d1d',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#fca5a5', fontSize: '18px', marginBottom: '10px' }}>Delete Account</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '18px', lineHeight: 1.5 }}>
          This permanently removes your login access to EduCore. This cannot be undone.
        </p>
        <form onSubmit={handleDelete}>
          <label style={labelStyle}>Confirm your password
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div style={{ height: '12px' }} />
          <label style={labelStyle}>Type <strong style={{ color: '#fca5a5' }}>DELETE</strong> to confirm
            <input style={inputStyle} type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          </label>

          {err && (
            <p style={{ color: '#f87171', fontSize: '13px', marginTop: '14px', marginBottom: 0 }}>{err}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 16px', borderRadius: '8px', border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            }}>Cancel</button>
            <button type="submit" disabled={deleting} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none',
              background: '#b91c1c', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, opacity: deleting ? 0.6 : 1,
            }}>{deleting ? 'Deleting...' : 'Delete My Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const auth = useAuth();
  const { user, logout, schoolName } = auth;
  const navigate = useNavigate();
  const location = useLocation();
  const NAV = buildNav(auth);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Close the drawer automatically whenever the route changes (i.e. after
  // tapping a nav link on mobile), so it doesn't stay open over the new page.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const initials = user?.teacher
    ? `${user.teacher.first_name?.[0]}${user.teacher.last_name?.[0]}`
    : user?.email?.slice(0,2).toUpperCase();

  const sidebarWidth = 200;

  const sidebarBaseStyle = {
    width: sidebarWidth, background: '#0F1F4D', flexShrink: 0,
    display: 'flex', flexDirection: 'column',
  };

  const sidebarStyle = isMobile
    ? {
        ...sidebarBaseStyle,
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 1000,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
        boxShadow: drawerOpen ? '0 0 24px rgba(0,0,0,0.35)' : 'none',
      }
    : sidebarBaseStyle;

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,sans-serif', fontSize:'13px', position: 'relative', overflow: 'hidden' }}>

      {/* Dark overlay behind the drawer on mobile, tap to close */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999 }}
        />
      )}

      <div style={sidebarStyle}>
        <div style={{ padding:'14px', borderBottom:'0.5px solid rgba(212,175,55,0.25)', display:'flex', alignItems:'center', gap:'8px' }}>
          <img src="data:image/png;base64,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" alt="EduCore" style={{ width:'28px', height:'28px', borderRadius:'6px', display:'block' }} />
          <div>
            <div style={{ color:'#fff', fontSize:'13px', fontWeight:'500' }}>EduCore</div>
            <div style={{ color:'#D4AF37', fontSize:'10px' }}>Exam Analyzer</div>
          </div>
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#A9B8DC', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
            >✕</button>
          )}
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
          <button
            onClick={() => setShowChangePassword(true)}
            title="Change password"
            style={{ background:'none', border:'none', color:'#8496C4', cursor:'pointer', fontSize:'16px' }}
          >🔑</button>
          <button
            onClick={() => setShowDeleteAccount(true)}
            title="Delete account"
            style={{ background:'none', border:'none', color:'#8496C4', cursor:'pointer', fontSize:'16px' }}
          >🗑️</button>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'#8496C4', cursor:'pointer', fontSize:'16px' }}>🚪</button>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#F4F5F9', minWidth: 0 }}>
        <div style={{ background:'#fff', borderBottom:'2px solid #D4AF37', padding:'0 12px', height:'50px', display:'flex', alignItems:'center', gap: '10px', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '20px', color: '#0F1F4D', padding: '4px', lineHeight: 1, flexShrink: 0,
                }}
              >☰</button>
            )}
            <span style={{ fontSize:'13px', color:'#0F1F4D', fontWeight:'500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schoolName}</span>
          </div>
          <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', background:'rgba(212,175,55,0.15)', color:'#8A6D1D', whiteSpace: 'nowrap', flexShrink: 0 }}>📅 Term 2 · 2025/2026</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
