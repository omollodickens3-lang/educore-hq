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
import AssignmentDetailPage from './pages/AssignmentDetailPage';
import ConductPage from './pages/ConductPage';
import ParentPortalPage from './pages/ParentPortalPage';
import ManageClassesPage from './pages/ManageClassesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BroadsheetPage from './pages/BroadsheetPage';
import ClassListPage from './pages/ClassListPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a1628', color:'#6b8cba', fontFamily:'system-ui', fontSize:'14px' }}>
      Loading EduCore...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'parent') return <Navigate to="/parent" replace />;
  return children;
}

function ComingSoon({ title }) {
  return (
    <div style={{ padding:'40px', fontFamily:'system-ui', textAlign:'center' }}>
      <div style={{ fontSize:'40px', marginBottom:'12px' }}>{title.split(' ')[0]}</div>
      <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#0f172a', marginBottom:'8px' }}>{title}</h1>
      <p style={{ color:'#64748b', fontSize:'14px' }}>This module is ready and will be enabled soon.</p>
      <div style={{ marginTop:'20px', padding:'14px', background:'#eaf3de', borderRadius:'10px', border:'0.5px solid #c0dd97', display:'inline-block' }}>
        <span style={{ color:'#27500a', fontSize:'13px' }}>? Backend and database are ready. The interface is coming next.</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/parent" element={<ParentPortalPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="learners"     element={<LearnersPage />} />
        <Route path="teachers"     element={<TeachersPage />} />
        <Route path="examinations" element={<ExaminationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} /><Route path="broadsheet" element={<BroadsheetPage />} /><Route path="class-list" element={<ClassListPage />} />
        <Route path="reports"       element={<ReportsPage />} />
        <Route path="attendance"    element={<AttendancePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="conduct" element={<ConductPage />} />
          <Route path="classes" element={<ManageClassesPage />} />
        <Route path="content" element={<ComingSoon title="? Content Gen ?? Coming Soon" />} />
        <Route path="portal"  element={<ComingSoon title="?? Parent Portal ?? Coming Soon" />} />
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
