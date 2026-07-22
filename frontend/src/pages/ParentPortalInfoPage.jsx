import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { learnersAPI } from '../utils/api';

const PARENT_URL = 'https://educore-hq.vercel.app/parent';

export default function ParentPortalInfoPage() {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | linked | unlinked

  useEffect(() => {
    learnersAPI.getAll().then(res => {
      const list = res.data.learners || res.data || [];
      setLearners(list);
    }).catch(err => {
      toast.error('Failed to load learners: ' + (err.response?.data?.error || err.message));
    }).finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(PARENT_URL).then(() => {
      toast.success('Parent Portal link copied!');
    }).catch(() => {
      toast.error('Could not copy — copy it manually: ' + PARENT_URL);
    });
  };

  const linkedCount = learners.filter(l => l.parent_user_id).length;
  const unlinkedCount = learners.length - linkedCount;

  const visible = learners.filter(l => {
    if (filter === 'linked') return !!l.parent_user_id;
    if (filter === 'unlinked') return !l.parent_user_id;
    return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ color: '#0f172a', fontSize: '22px', marginBottom: '4px' }}>Parent Portal</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
        Share the link below with parents so they can create an account and check on their child.
      </p>

      <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <p style={{ color: '#8faad0', fontSize: '13px', marginBottom: '10px' }}>Parent login link</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ background: '#111f35', color: '#7dd3fc', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', flex: '1 1 240px', wordBreak: 'break-all' }}>
            {PARENT_URL}
          </code>
          <button
            onClick={copyLink}
            style={{ padding: '10px 18px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Copy link
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 20px', flex: '1 1 140px' }}>
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Total learners</p>
          <p style={{ color: '#0f172a', fontSize: '22px', fontWeight: 700, margin: 0 }}>{learners.length}</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 20px', flex: '1 1 140px' }}>
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Parent linked</p>
          <p style={{ color: '#16a34a', fontSize: '22px', fontWeight: 700, margin: 0 }}>{linkedCount}</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 20px', flex: '1 1 140px' }}>
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Not linked yet</p>
          <p style={{ color: '#dc2626', fontSize: '22px', fontWeight: 700, margin: 0 }}>{unlinkedCount}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {['all', 'linked', 'unlinked'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '13px', cursor: 'pointer',
              border: filter === f ? '1px solid #185fa5' : '1px solid #e2e8f0',
              background: filter === f ? '#185fa5' : '#fff',
              color: filter === f ? '#fff' : '#334155',
            }}
          >
            {f === 'all' ? 'All' : f === 'linked' ? 'Linked' : 'Not linked'}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#64748b' }}>Loading...</p>}

      {!loading && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Learner', 'Adm. No', 'Parent Name', 'Parent Phone', 'Parent Email', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>{l.first_name} {l.last_name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{l.admission_no}</td>
                    <td style={{ padding: '12px 16px' }}>{l.parent_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{l.parent_phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{l.parent_email || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {l.parent_user_id ? (
                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>Linked</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>Not linked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No learners match this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
