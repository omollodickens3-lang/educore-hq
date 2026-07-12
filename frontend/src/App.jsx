import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppLayout from './components/layout/AppLayout';
import TeachersPage from './pages/TeachersPage';
import LearnersPage from './pages/LearnersPage';
import ExaminationsPage from './pages/ExaminationsPage';
import ReportsPage from './pages/ReportsPage';
import AttendancePage from './pages/AttendancePage';
import AssignmentsPage from './pages/AssignmentsPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a1628', color:'#6b8cba', fontFamily:'system-ui', fontSize:'14px' }}>
      Loading EduCore...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function ComingSoon({ title }) {
  return (
    <div style={{ padding:'40px', fontFamily:'system-ui', textAlign:'center' }}>
      <div style={{ fontSize:'40px', marginBottom:'12px' }}>{title.split(' ')[0]}</div>
      <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#0f172a', marginBottom:'8px' }}>{title}</h1>
      <p style={{ color:'#64748b', fontSize:'14px' }}>This module is ready ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Stage 2 will connect the full UI.</p>
      <div style={{ marginTop:'20px', padding:'14px', background:'#eaf3de', borderRadius:'10px', border:'0.5px solid #c0dd97', display:'inline-block' }}>
        <span style={{ color:'#27500a', fontSize:'13px' }}>ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ API endpoints ready Ãƒâ€šÃ‚Â· Database connected Ãƒâ€šÃ‚Â· Authentication working</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="learners"     element={<LearnersPage />} />
        <Route path="teachers"     element={<TeachersPage />} />
        <Route path="examinations" element={<ExaminationsPage />} />
        <Route path="reports"       element={<ReportsPage />} />
        <Route path="attendance"    element={<AttendancePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="content"      element={<ComingSoon title="ÃƒÂ¢Ã…â€œÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â Content Generation" />} />
        <Route path="portal"       element={<ComingSoon title="ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¬ Parent Portal" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            style: { background:'#1e293b', color:'#e2e8f0', border:'0.5px solid #334155', borderRadius:'8px', fontSize:'13px' }
          }} />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

