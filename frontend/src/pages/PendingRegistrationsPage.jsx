import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { schoolsAPI } from '../utils/api';

export default function PendingRegistrationsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    schoolsAPI
      .listRegistrations()
      .then((res) => setRegistrations(res.data.registrations || []))
      .catch(() => toast.error('Failed to load registrations'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') load();
  }, [user, load]);

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await schoolsAPI.approve(id);
      toast.success('School approved');
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setActingId(id);
    try {
      await schoolsAPI.reject(id, reason);
      toast.success('Registration rejected');
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ color: '#e2e8f0', fontSize: '22px', marginBottom: '4px' }}>Pending Registrations</h1>
      <p style={{ color: '#6b8cba', fontSize: '13px', marginBottom: '24px' }}>
        Review and approve schools waiting to join EduCore.
      </p>

      {loading && <p style={{ color: '#8faad0' }}>Loading...</p>}

      {!loading && registrations.length === 0 && (
        <div style={{ background: '#111f35', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#8faad0', fontSize: '14px' }}>No pending registrations right now.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '14px' }}>
        {registrations.map((reg) => (
          <div
            key={reg.id}
            style={{ background: '#111f35', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h3 style={{ color: '#e2e8f0', fontSize: '16px', margin: 0 }}>{reg.school_name}</h3>
                <span style={{ color: '#185fa5', fontSize: '12px', background: '#0a1628', padding: '2px 8px', borderRadius: '999px', border: '1px solid #1e3a5f' }}>
                  {reg.subdomain}
                </span>
              </div>
              <p style={{ color: '#8faad0', fontSize: '13px', margin: '2px 0' }}>{reg.county || 'County not specified'}</p>
              <p style={{ color: '#8faad0', fontSize: '13px', margin: '2px 0' }}>
                Contact: {reg.contact_name} &middot; {reg.contact_phone} &middot; {reg.contact_email}
              </p>
              <p style={{ color: '#6b8cba', fontSize: '12px', marginTop: '8px' }}>
                Submitted {reg.created_at ? new Date(reg.created_at).toLocaleString() : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => handleApprove(reg.id)}
                disabled={actingId === reg.id}
                style={{ padding: '8px 16px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: actingId === reg.id ? 'not-allowed' : 'pointer' }}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(reg.id)}
                disabled={actingId === reg.id}
                style={{ padding: '8px 16px', background: 'transparent', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '8px', fontSize: '13px', cursor: actingId === reg.id ? 'not-allowed' : 'pointer' }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
