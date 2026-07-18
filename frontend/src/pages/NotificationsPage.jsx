import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

const styles = {
  page: { padding: 24, color: '#0f172a' },
  title: { textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#0f172a' },
  subtitle: { textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 20 },
  statsRow: { display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 100 },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  controls: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' },
  select: { background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' },
  input: { background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', width: 160 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, maxWidth: 900, margin: '0 auto' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 8px', borderBottom: '1px solid #e2e8f0', gap: 12 },
  learnerName: { fontWeight: 600, fontSize: 14, color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  message: { fontSize: 13, marginTop: 6, color: '#334155' },
  badgeSent: { fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#dcfce7', color: '#15803d', whiteSpace: 'nowrap' },
  badgeFailed: { fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c', whiteSpace: 'nowrap' },
  empty: { color: '#64748b', textAlign: 'center', padding: 20 },
  error: { color: '#dc2626', textAlign: 'center' },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Not sent';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  return days + 'd ago';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('educore_token');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const [notifRes, statsRes] = await Promise.all([
        fetch(API_BASE + '/notifications?' + params.toString(), {
          headers: { Authorization: 'Bearer ' + token },
        }),
        fetch(API_BASE + '/notifications/stats', {
          headers: { Authorization: 'Bearer ' + token },
        }),
      ]);
      if (!notifRes.ok || !statsRes.ok) throw new Error('Failed to load notifications');
      const notifData = await notifRes.json();
      const statsData = await statsRes.json();
      setNotifications(notifData.notifications);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    loadData();
  }

  return (
    <div style={styles.page}>
      <div style={styles.title}>Notifications</div>
      <div style={styles.subtitle}>Parent notifications sent for attendance, exams, and conduct.</div>

      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#15803d' }}>{stats.sent}</div>
            <div style={styles.statLabel}>Sent</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#b91c1c' }}>{stats.failed}</div>
            <div style={styles.statLabel}>Failed</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#0f172a' }}>{stats.absenteeism_alerts}</div>
            <div style={styles.statLabel}>Absenteeism Alerts</div>
          </div>
        </div>
      )}

      <div style={styles.controls}>
        <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <input
          style={styles.input}
          placeholder="Search learner or adm. no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
          onClick={handleSearch}
        >
          Filter
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={styles.empty}>No notifications found.</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={styles.row}>
              <div style={{ flex: 1 }}>
                <div style={styles.learnerName}>{n.first_name} {n.last_name}</div>
                <div style={styles.meta}>
                  {n.admission_no} · {n.grade} {n.stream} · {n.trigger_type.replace(/_/g, ' ')} · {n.channel}
                </div>
                <div style={styles.message}>{n.message}</div>
                {n.status === 'failed' && n.error && (
                  <div style={{ ...styles.meta, color: '#b91c1c', marginTop: 4 }}>Error: {n.error}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={n.status === 'sent' ? styles.badgeSent : styles.badgeFailed}>{n.status}</div>
                <div style={{ ...styles.meta, marginTop: 6 }}>{timeAgo(n.sent_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
