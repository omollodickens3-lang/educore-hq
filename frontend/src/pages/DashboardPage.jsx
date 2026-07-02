import { useQuery } from '@tanstack/react-query';
import { learnersAPI, attendanceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const auth = useAuth();
  const user = auth.user;
  const schoolName = auth.schoolName;

  const statsQuery = useQuery({
    queryKey: ['learnerStats'],
    queryFn: function () {
      return learnersAPI.getStats().then(function (r) { return r.data; });
    },
  });
  const stats = statsQuery.data;

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: function () {
      return attendanceAPI.getAlerts().then(function (r) { return r.data; });
    },
  });
  const alerts = alertsQuery.data;

  let teacherName = '';
  if (user && user.teacher) {
    teacherName = user.teacher.first_name + ' ' + user.teacher.last_name;
  } else if (user) {
    teacherName = user.email;
  }

  const modules = [
    { icon: '👥', label: 'Learners', path: '/learners' },
    { icon: '🎓', label: 'Teachers', path: '/teachers' },
    { icon: '📋', label: 'Examinations', path: '/examinations' },
    { icon: '📄', label: 'Report Forms', path: '/reports' },
    { icon: '✅', label: 'Attendance', path: '/attendance' },
    { icon: '📚', label: 'Assignments', path: '/assignments' },
    { icon: '✍️', label: 'Content Gen', path: '/content' },
    { icon: '💬', label: 'Parent Portal', path: '/portal' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
        Welcome back, {teacherName}
      </h1>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px', marginBottom: '20px' }}>
        {schoolName} - Academic Year 2025/2026 - Term 2
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Total learners</div>
          <div style={{ fontSize: '26px', fontWeight: '500', color: '#185fa5' }}>
            {stats ? (parseInt(stats.active || 0) + parseInt(stats.remediation || 0)) : '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Need support</div>
          <div style={{ fontSize: '26px', fontWeight: '500', color: '#a32d2d' }}>
            {stats ? stats.remediation : '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Absent today</div>
          <div style={{ fontSize: '26px', fontWeight: '500', color: '#854f0b' }}>
            {alerts && alerts.absentToday ? alerts.absentToday.length : '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>JS learners</div>
          <div style={{ fontSize: '26px', fontWeight: '500', color: '#3c3489' }}>
            {stats ? stats.js_count : '...'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
        Modules
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
        {modules.map(function (m) {
          return (
            <a key={m.path} href={m.path} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{m.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>{m.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}