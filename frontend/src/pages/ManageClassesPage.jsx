import { useEffect, useState, useCallback } from 'react';
import { classesAPI, teachersAPI } from '../utils/api';

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
  fontSize: '14px', marginTop: '4px', boxSizing: 'border-box',
};
const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };

function ModalShell({ title, onClose, width = '480px', children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', borderRadius: '14px', padding: '28px',
        width, maxHeight: '85vh', overflowY: 'auto',
        border: '1px solid #334155',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', marginBottom: '20px' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function streamColor(seed) {
  const palette = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function normalize(c) {
  return {
    id: c.id,
    grade: c.grade,
    stream: c.stream,
    section: c.section ?? '',
    classTeacherId: c.classTeacherId ?? c.class_teacher_id ?? '',
    academicYear: c.academicYear ?? c.academic_year ?? '',
  };
}

export default function ManageClassesPage() {
  const [classesList, setClassesList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    classesAPI.getAll()
      .then(r => setClassesList((r.data || []).map(normalize)))
      .catch(() => setErr('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    teachersAPI.getAll().then(r => setTeachers(r.data || [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  async function handleDelete(id, label) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      await classesAPI.delete(id);
      setMsg(`${label} deleted`);
      load();
    } catch {
      setErr('Failed to delete class');
    }
  }

  function openAdd() {
    setEditingClass(null);
    setShowModal(true);
  }

  function openEdit(cls) {
    setEditingClass(cls);
    setShowModal(true);
  }

  const grouped = GRADES.map(grade => ({
    grade,
    streams: classesList.filter(c => c.grade === grade),
  })).filter(g => g.streams.length > 0);

  const ungrouped = classesList.filter(c => !GRADES.includes(c.grade));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>Manage Classes</h2>
          <p style={{ color: '#94a3b8', margin: '6px 0 0' }}>Create Grade + Stream combinations with no cap.</p>
        </div>
        <button onClick={openAdd} style={{
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>+ Add Class</button>
      </div>

      {msg && (
        <div style={{ background: '#052e1a', color: '#4ade80', border: '1px solid #166534', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px' }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{ background: '#2e0505', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px' }}>
          {err}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading classes...</p>
      ) : classesList.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>No classes yet. Add your first grade + stream combination.</p>
          <button onClick={openAdd} style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>+ Add Class</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {grouped.map(({ grade, streams }) => (
            <div key={grade} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: '16px' }}>{grade}</h3>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>{streams.length} stream{streams.length !== 1 ? 's' : ''}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {streams.map(c => {
                    const teacher = teachers.find(t => String(t.id) === String(c.classTeacherId));
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #24344a' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            fontSize: '12px', padding: '3px 10px', borderRadius: '6px',
                            background: streamColor(c.stream) + '22', color: streamColor(c.stream), fontWeight: 600,
                          }}>{c.stream}</span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#e2e8f0', fontSize: '14px' }}>
                          {c.section ? c.section : <span style={{ color: '#475569' }}>No section</span>}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#e2e8f0', fontSize: '14px' }}>
                          {teacher ? `${teacher.first_name || teacher.firstName || ''} ${teacher.last_name || teacher.lastName || ''}`.trim() : <span style={{ color: '#475569' }}>Unassigned</span>}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '13px' }}>{c.academicYear || '—'}</td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button onClick={() => openEdit(c)} style={{
                            border: 'none', background: 'transparent', color: '#60a5fa',
                            cursor: 'pointer', fontSize: '13px', marginRight: '14px',
                          }}>Edit</button>
                          <button onClick={() => handleDelete(c.id, `${grade} ${c.stream}`)} style={{
                            border: 'none', background: 'transparent', color: '#dc2626',
                            cursor: 'pointer', fontSize: '13px',
                          }}>Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #334155' }}>
                <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: '16px' }}>Other</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {ungrouped.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #24344a' }}>
                      <td style={{ padding: '14px 18px', color: '#e2e8f0' }}>{c.grade} — {c.stream}</td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button onClick={() => openEdit(c)} style={{ border: 'none', background: 'transparent', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', marginRight: '14px' }}>Edit</button>
                        <button onClick={() => handleDelete(c.id, `${c.grade} ${c.stream}`)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ClassFormModal
          existing={editingClass}
          teachers={teachers}
          onClose={() => setShowModal(false)}
          onSaved={(label) => {
            setShowModal(false);
            setMsg(label);
            load();
          }}
          onError={() => setErr('Failed to save class')}
        />
      )}
    </div>
  );
}

function ClassFormModal({ existing, teachers, onClose, onSaved, onError }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    grade: existing?.grade || 'Grade 7',
    stream: existing?.stream || '',
    section: existing?.section || '',
    classTeacherId: existing?.classTeacherId || '',
    academicYear: existing?.academicYear || '2025/2026',
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.grade || !form.stream) {
      setFormErr('Grade and stream are required');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      // DB check constraint "classes_section_check" only allows lowercase 'primary' or 'js' (or null/empty).
      // Normalize here so the input field can stay case-insensitive for the user.
      const normalizedSection = form.section ? form.section.trim().toLowerCase() : '';
      if (normalizedSection && !['primary', 'js'].includes(normalizedSection)) {
        setFormErr(`Section must be "Primary" or "JS" (got "${form.section}")`);
        setSaving(false);
        return;
      }
      const payload = { ...form, section: normalizedSection || null };

      if (isEdit) {
        await classesAPI.update(existing.id, payload);
        onSaved(`${form.grade} ${form.stream} updated`);
      } else {
        await classesAPI.create(payload);
        onSaved(`${form.grade} ${form.stream} created`);
      }
    } catch (err) {
      setFormErr(err?.response?.data?.error || 'Save failed');
      onError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={isEdit ? 'Edit Class' : 'Add Class'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {formErr && (
          <div style={{ background: '#2e0505', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '13px' }}>
            {formErr}
          </div>
        )}

        <label style={labelStyle}>
          Grade
          <select style={inputStyle} value={form.grade} onChange={e => set('grade', e.target.value)}>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <div style={{ height: '14px' }} />

        <label style={labelStyle}>
          Stream name (e.g. Blue, A, North)
          <input style={inputStyle} value={form.stream} onChange={e => set('stream', e.target.value)} placeholder="e.g. Blue" />
        </label>

        <div style={{ height: '14px' }} />

        <label style={labelStyle}>
          Section (optional)
          <input style={inputStyle} value={form.section} onChange={e => set('section', e.target.value)} placeholder="Optional" />
        </label>

        <div style={{ height: '14px' }} />

        <label style={labelStyle}>
          Class teacher
          <select style={inputStyle} value={form.classTeacherId} onChange={e => set('classTeacherId', e.target.value)}>
            <option value="">Unassigned</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {(t.first_name || t.firstName || '')} {(t.last_name || t.lastName || '')}
              </option>
            ))}
          </select>
        </label>

        <div style={{ height: '14px' }} />

        <label style={labelStyle}>
          Academic year
          <input style={inputStyle} value={form.academicYear} onChange={e => set('academicYear', e.target.value)} placeholder="2025/2026" />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', color: '#94a3b8', border: '1px solid #334155',
            borderRadius: '8px', padding: '10px 16px', fontSize: '14px', cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={saving} style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Class'}</button>
        </div>
      </form>
    </ModalShell>
  );
}