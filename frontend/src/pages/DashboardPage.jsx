import { useQuery } from '@tanstack/react-query';
import { learnersAPI, attendanceAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { examsAPI } from '../utils/api';

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

  const overviewQuery = useQuery({
    queryKey: ['schoolOverview'],
    queryFn: function () {
      return examsAPI.getSchoolOverview().then(function (r) { return r.data; });
    },
  });
  const overview = overviewQuery.data ? overviewQuery.data.overview : null;

  let overallMean = null;
  let topGrade = null;
  let weakGrade = null;
  let topSubject = null;
  if (overview && overview.length) {
    const total = overview.reduce(function (sum, r) { return sum + Number(r.avg_score); }, 0);
    overallMean = total / overview.length;
    const byGrade = {};
    const bySubject = {};
    overview.forEach(function (r) {
      if (!byGrade[r.grade]) byGrade[r.grade] = [];
      byGrade[r.grade].push(Number(r.avg_score));
      if (!bySubject[r.subject]) bySubject[r.subject] = [];
      bySubject[r.subject].push(Number(r.avg_score));
    });
    const gradeAvgs = Object.keys(byGrade).map(function (g) {
      const arr = byGrade[g];
      return { grade: g, avg: arr.reduce(function (a, b) { return a + b; }, 0) / arr.length };
    });
    const subjectAvgs = Object.keys(bySubject).map(function (s) {
      const arr = bySubject[s];
      return { subject: s, avg: arr.reduce(function (a, b) { return a + b; }, 0) / arr.length };
    });
    gradeAvgs.sort(function (a, b) { return b.avg - a.avg; });
    subjectAvgs.sort(function (a, b) { return b.avg - a.avg; });
    if (gradeAvgs.length) {
      topGrade = gradeAvgs[0].grade;
      weakGrade = gradeAvgs[gradeAvgs.length - 1].grade;
    }
    if (subjectAvgs.length) { topSubject = subjectAvgs[0].subject; }
  }

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

      <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', marginTop: '20px', marginBottom: '10px' }}>
        School performance overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>School mean</div>
          <div style={{ fontSize: '26px', fontWeight: '500', color: '#185fa5' }}>
            {overallMean !== null ? overallMean.toFixed(1) : '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Top grade</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#0f7a4a' }}>
            {topGrade || '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Needs attention</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#a32d2d' }}>
            {weakGrade || '...'}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Top subject</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#3c3489' }}>
            {topSubject || '...'}
          </div>
        </div>
      </div>
    </div>
  );
}
