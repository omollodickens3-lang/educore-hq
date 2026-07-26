import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { teachersAPI } from '../utils/api';

const ROLES = ['admin', 'deputy', 'hod', 'class_teacher', 'subject_teacher'];

const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const JUNIOR_SECONDARY_SUBJECTS = ["Mathematics","English","Kiswahili","Creative Arts and Sports","Social Studies","Religious Education","Pre-Technical Studies","Integrated Science","Agriculture and Nutrition"];
const PRIMARY_SUBJECTS = ["Mathematics","English","Kiswahili","Science","Social Studies","Religious Education","Creative Arts","Physical Education","Agriculture","Home Science","Business Studies","Life Skills","Indigenous Languages"];
const JS_GRADES = ["Grade 7", "Grade 8", "Grade 9"];
function subjectsForGrade(grade) {
  return JS_GRADES.includes(grade) ? JUNIOR_SECONDARY_SUBJECTS : PRIMARY_SUBJECTS;
}

function AssignSubjectModal({ teacher, onClose }) {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState('');
  const [stream, setStream] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: full, isLoading } = useQuery({
    queryKey: ['teacher', teacher.id],
    queryFn: () => teachersAPI.getById(teacher.id).then(r => r.data),
  });
  const assignments = full?.subjects || [];

  const removeMutation = useMutation({
    mutationFn: (subjectId) => teachersAPI.removeSubject(subjectId),
    onSuccess: () => {
      toast.success('Assignment removed');
      queryClient.invalidateQueries(['teacher', teacher.id]);
    },
    onError: () => toast.error('Failed to remove assignment'),
  });

  async function handleAssign(e) {
    e.preventDefault();
    if (!subject || !grade) {
      toast.error('Grade and subject are required');
      return;
    }
    setSaving(true);
    try {
      await teachersAPI.assignSubjects(teacher.id, [{ subject, grade, stream: stream || null }]);
      toast.success('Subject assigned');
      queryClient.invalidateQueries(['teacher', teacher.id]);
      setSubject('');
      setStream('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign subject');
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: '14px', padding: '28px',
        width: '460px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <h2 style={{ color: '#f1f5f9', fontSize: '19px', marginBottom: '4px', textAlign: 'center' }}>
          Assign Subject
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
          {teacher.first_name} {teacher.last_name}
        </p>

        {!isLoading && assignments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Current assignments</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {assignments.map((a) => (
                <span key={a.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '8px', background: '#0f172a',
                  border: '1px solid #334155', fontSize: '12px', color: '#e2e8f0',
                }}>
                  {a.subject} · {a.grade || 'All grades'}{a.stream ? ` ${a.stream}` : ''}
                  <button
                    onClick={() => removeMutation.mutate(a.id)}
                    style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                  >✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleAssign}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Grade *</label>
            <select style={inputStyle} value={grade} onChange={(e) => { setGrade(e.target.value); setSubject(''); }}>
              <option value="">Select…</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Stream (optional — leave blank for all streams)</label>
            <input style={inputStyle} value={stream} onChange={(e) => setStream(e.target.value)} placeholder="e.g. A" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Subject *</label>
            <select style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!grade}>
              <option value="">{grade ? 'Select…' : 'Select a grade first'}</option>
              {subjectsForGrade(grade).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            }}>Close</button>
            <button type="submit" disabled={saving} style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none',
              background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Assigning...' : 'Assign Subject'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function roleLabel(role) {
  const map = {
    admin: 'Admin',
    deputy: 'Deputy Head',
    hod: 'Head of Department',
    class_teacher: 'Class Teacher',
    subject_teacher: 'Subject Teacher',
  };
  return map[role] || role;
}

function TeacherFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', tscNumber: '', phone: '', email: '',
    gender: '', qualification: '', role: 'subject_teacher',
    createLogin: false, password: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      toast.error('First and last name are required');
      return;
    }
    if (form.createLogin && (!form.email || !form.password)) {
      toast.error('Email and password are required to create a login');
      return;
    }
    setSaving(true);
    try {
      await teachersAPI.create(form);
      toast.success('Teacher added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add teacher');
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', borderRadius: '14px', padding: '28px',
        width: '480px', maxHeight: '85vh', overflowY: 'auto',
        border: '1px solid #334155',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', marginBottom: '20px' }}>Add Teacher</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <label style={labelStyle}>First Name *
              <input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            </label>
            <label style={labelStyle}>Last Name *
              <input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <label style={labelStyle}>TSC Number
              <input style={inputStyle} value={form.tscNumber} onChange={e => set('tscNumber', e.target.value)} />
            </label>
            <label style={labelStyle}>Phone
              <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </label>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Email
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <label style={labelStyle}>Gender
              <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label style={labelStyle}>Role
              <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Qualification
              <input style={inputStyle} value={form.qualification} onChange={e => set('qualification', e.target.value)} />
            </label>
          </div>

          <div style={{
            background: '#0f172a', borderRadius: '10px', padding: '14px',
            border: '1px solid #334155', marginBottom: '16px',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.createLogin}
                onChange={e => set('createLogin', e.target.checked)} />
              Create login account for this teacher
            </label>
            {form.createLogin && (
              <div style={{ marginTop: '12px' }}>
                <label style={labelStyle}>Set Password *
                  <input style={inputStyle} type="text" value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="e.g. Teacher@2026" />
                </label>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Uses the email above as the login username.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none',
              background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Add Teacher'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const [showModal, setShowModal] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  const queryClient = useQueryClient();

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersAPI.getAll().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => teachersAPI.delete(id),
    onSuccess: () => {
      toast.success('Teacher removed');
      queryClient.invalidateQueries(['teachers']);
    },
    onError: () => toast.error('Failed to remove teacher'),
  });

  function handleDelete(id, name) {
    if (window.confirm(`Remove ${name} from teaching staff?`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '4px' }}>Teachers</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Manage teaching staff and roles</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: '11px 20px', borderRadius: '10px', border: 'none',
          background: '#2563eb', color: '#fff', fontWeight: 600,
          cursor: 'pointer', fontSize: '14px',
        }}>+ Add Teacher</button>
      </div>

      {isLoading ? (
        <p style={{ color: '#64748b' }}>Loading teachers...</p>
      ) : teachers.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '40px',
          textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0',
        }}>No teachers added yet. Click "Add Teacher" to get started.</div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Role', 'Phone', 'Email', 'TSC No.', 'Login', 'Status', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
                    color: '#64748b', fontWeight: 600, textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 500 }}>
                    {t.first_name} {t.last_name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{roleLabel(t.role)}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{t.phone || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{t.email || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{t.tsc_number || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {t.login_email ? (
                      <span style={{
                        fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                        background: '#dcfce7', color: '#166534',
                      }}>Active</span>
                    ) : (
                      <span style={{
                        fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                        background: '#f1f5f9', color: '#64748b',
                      }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', textTransform: 'capitalize' }}>{t.status}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setAssigningTeacher(t)} style={{
                      border: 'none', background: 'transparent', color: '#2563eb',
                      cursor: 'pointer', fontSize: '13px', marginRight: '14px',
                    }}>Assign</button>
                    <button onClick={() => handleDelete(t.id, `${t.first_name} ${t.last_name}`)} style={{
                      border: 'none', background: 'transparent', color: '#dc2626',
                      cursor: 'pointer', fontSize: '13px',
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      )}

      {showModal && (
        <TeacherFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries(['teachers'])}
        />
      )}
      {assigningTeacher && (
        <AssignSubjectModal
          teacher={assigningTeacher}
          onClose={() => setAssigningTeacher(null)}
        />
      )}
    </div>
  );
}
