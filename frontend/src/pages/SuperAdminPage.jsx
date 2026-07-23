import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { superAdminAPI } from '../utils/api';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const PLATFORM_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

  const load = useCallback(() => {
    setLoading(true);
    superAdminAPI
      .listSchools()
      .then((res) => setSchools(res.data || []))
      .catch(() => toast.error('Failed to load schools'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') load();
  }, [user, load]);

  if (user && user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const handleDeactivate = async (id) => {
    const reason = window.prompt('Reason for deactivating this school (required):');
    if (!reason || !reason.trim()) {
      if (reason !== null) toast.error('A reason is required.');
      return;
    }
    setActingId(id);
    try {
      await superAdminAPI.deactivateSchool(id, reason.trim());
      toast.success('School deactivated');
      setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'deactivated' } : s)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate school');
    } finally {
      setActingId(null);
    }
  };

  const handleReactivate = async (id) => {
    const reason = window.prompt('Reason for reactivating this school (required):');
    if (!reason || !reason.trim()) {
      if (reason !== null) toast.error('A reason is required.');
      return;
    }
    setActingId(id);
    try {
      await superAdminAPI.reactivateSchool(id, reason.trim());
      toast.success('School reactivated');
      setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reactivate school');
    } finally {
      setActingId(null);
    }
  };

  const viewHistory = async (id) => {
    setHistoryFor(id);
    setHistoryLoading(true);
    try {
      const res = await superAdminAPI.getSchoolHistory(id);
      setHistory(res.data || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0a1628', minHeight: '100vh' }}>
      <h1 style={{ color: '#e2e8f0', fontSize: '22px', marginBottom: '4px' }}>Super Admin</h1>
      <p style={{ color: '#6b8cba', fontSize: '13px', marginBottom: '24px' }}>
        Deactivating a school locks out its principal and all teachers on their next request. Reactivating restores access immediately.
      </p>

      {loading ? (
        <p style={{ color: '#6b8cba', fontSize: '13px' }}>Loading schools...</p>
      ) : schools.length === 0 ? (
        <p style={{ color: '#6b8cba', fontSize: '13px' }}>No schools found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schools.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#111f35',
                border: '0.5px solid #334155',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600 }}>{s.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: s.status === 'active' ? '#0f3d24' : '#3d1414',
                      color: s.status === 'active' ? '#4ade80' : '#f87171',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {s.status}
                  </span>
                  <span style={{ color: '#6b8cba', fontSize: '12px' }}>
                    Registered {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => viewHistory(s.id)}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    color: '#6b8cba',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  History
                </button>
                {s.id === PLATFORM_SCHOOL_ID ? (
                  <span style={{ color: '#6b8cba', fontSize: '12px', fontStyle: 'italic' }}>Protected</span>
                ) : s.status === 'active' ? (
                  <button
                    onClick={() => handleDeactivate(s.id)}
                    disabled={actingId === s.id}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#f87171',
                      border: '1px solid #7f1d1d',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: actingId === s.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(s.id)}
                    disabled={actingId === s.id}
                    style={{
                      padding: '8px 16px',
                      background: '#185fa5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: actingId === s.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {historyFor && (
        <div
          onClick={() => setHistoryFor(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111f35',
              border: '0.5px solid #334155',
              borderRadius: '12px',
              padding: '20px',
              width: '420px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ color: '#e2e8f0', fontSize: '16px', marginBottom: '12px' }}>Status History</h2>
            {historyLoading ? (
              <p style={{ color: '#6b8cba', fontSize: '13px' }}>Loading...</p>
            ) : history.length === 0 ? (
              <p style={{ color: '#6b8cba', fontSize: '13px' }}>No history yet.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{ borderBottom: '0.5px solid #334155', padding: '10px 0' }}>
                  <div style={{ color: h.action === 'deactivate' ? '#f87171' : '#4ade80', fontSize: '13px', fontWeight: 600 }}>
                    {h.action === 'deactivate' ? 'Deactivated' : 'Reactivated'}
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '2px' }}>{h.reason}</div>
                  <div style={{ color: '#6b8cba', fontSize: '11px', marginTop: '4px' }}>
                    {h.performed_by_name} &middot; {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setHistoryFor(null)}
              style={{
                marginTop: '14px',
                padding: '8px 16px',
                background: 'transparent',
                color: '#6b8cba',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
