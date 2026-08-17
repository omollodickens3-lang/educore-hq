import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { schoolsAPI } from '../utils/api';

function ImageUploadCard({ title, description, apiCall, hasExisting, existingLabel }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG or JPG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error('Choose an image first');
      return;
    }
    setUploading(true);
    try {
      await apiCall(selectedFile);
      toast.success(`${title} uploaded successfully`);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to upload ${title.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  }

  const cardStyle = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '28px', maxWidth: '560px', marginBottom: '24px',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '4px', fontWeight: 600 }}>
        {title}
      </h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
        {description}
        {hasExisting && !previewUrl && (
          <span style={{ display: 'block', color: '#16a34a', marginTop: '4px' }}>
            &#10003; {existingLabel} already uploaded &mdash; choose a new image below to replace it.
          </span>
        )}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <div style={{
          width: '110px', height: '110px', borderRadius: '10px',
          border: '1px dashed #cbd5e1', background: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {previewUrl ? (
            <img src={previewUrl} alt={`${title} preview`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '28px', opacity: 0.4 }}>{hasExisting ? '\u2713' : '\ud83d\uddbc\ufe0f'}</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Image (PNG or JPG, max 5MB)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '9px 16px', borderRadius: '8px', border: '1px solid #334155',
                background: 'transparent', color: '#334155', cursor: 'pointer', fontSize: '13px',
              }}
            >
              {selectedFile ? 'Choose Different Image' : 'Choose Image'}
            </button>
          </div>
          {selectedFile && (
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>{selectedFile.name}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: '#2563eb', color: '#fff', cursor: (!selectedFile || uploading) ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 600, opacity: (!selectedFile || uploading) ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : `Upload ${title}`}
        </button>
      </div>
    </div>
  );
}

function SchoolDetailsCard() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    schoolsAPI.getProfile()
      .then(res => {
        setProfile(res.data);
        setForm({
          name: res.data.name || '',
          address: res.data.address || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
        });
      })
      .catch(() => toast.error('Failed to load school profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await schoolsAPI.updateProfile(form);
      toast.success('School details saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save school details');
    } finally {
      setSaving(false);
    }
  }

  const cardStyle = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '28px', maxWidth: '560px', marginBottom: '24px',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' };
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', color: '#0f172a',
  };

  if (loading) {
    return <div style={cardStyle}><p style={{ color: '#64748b', fontSize: '14px' }}>Loading school details...</p></div>;
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '4px', fontWeight: 600 }}>
        School Details
      </h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
        Shown on report card letterheads and used for official correspondence.
      </p>

      <label style={labelStyle}>School Name</label>
      <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

      <label style={labelStyle}>Physical / Postal Address</label>
      <input
        style={inputStyle}
        value={form.address}
        onChange={e => setForm({ ...form, address: e.target.value })}
        placeholder="e.g. P.O. Box 123, Kirinyaga"
      />

      <label style={labelStyle}>Phone</label>
      <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />

      <label style={labelStyle}>Email</label>
      <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: '#2563eb', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 600, opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Details'}
        </button>
      </div>
    </div>
  );
}

export default function SchoolProfilePage() {
  const [hasLogo, setHasLogo] = useState(false);
  const [hasStamp, setHasStamp] = useState(false);

  useEffect(() => {
    schoolsAPI.getProfile()
      .then(res => {
        setHasLogo(!!res.data.has_logo);
        setHasStamp(!!res.data.has_stamp);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '4px' }}>School Profile</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Manage your school's official documents and branding</p>
      </div>

      <SchoolDetailsCard />

      <ImageUploadCard
        title="School Logo"
        description="Upload your school's official badge or crest. It appears at the top of every report card and on this profile page. If none is uploaded, a simple badge is generated automatically from your school's initial."
        apiCall={schoolsAPI.uploadLogo}
        hasExisting={hasLogo}
        existingLabel="Logo"
      />

      <ImageUploadCard
        title="School Stamp"
        description="Upload your school's official stamp. It will be automatically embedded on generated report forms and class lists."
        apiCall={schoolsAPI.uploadStamp}
        hasExisting={hasStamp}
        existingLabel="Stamp"
      />
    </div>
  );
}
