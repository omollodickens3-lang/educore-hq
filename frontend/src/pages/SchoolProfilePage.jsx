import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { schoolsAPI } from '../utils/api';

export default function SchoolProfilePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Revoke the object URL when it's replaced or the component unmounts, to avoid leaking memory.
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
      toast.error('Choose a stamp image first');
      return;
    }
    setUploading(true);
    try {
      await schoolsAPI.uploadStamp(selectedFile);
      toast.success('School stamp uploaded successfully');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload school stamp');
    } finally {
      setUploading(false);
    }
  }

  function handleChooseClick() {
    fileInputRef.current?.click();
  }

  const cardStyle = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '28px', maxWidth: '560px',
  };
  const labelStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: 500 };

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '4px' }}>School Profile</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Manage your school's official documents and branding</p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '4px', fontWeight: 600 }}>
          School Stamp
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
          Upload your school's official stamp. It will be automatically embedded on generated
          report forms and class lists.
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px',
        }}>
          <div style={{
            width: '110px', height: '110px', borderRadius: '10px',
            border: '1px dashed #cbd5e1', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Stamp preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '28px', opacity: 0.4 }}>🖋️</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Stamp image (PNG or JPG, max 5MB)</label>
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
                onClick={handleChooseClick}
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
            {uploading ? 'Uploading...' : 'Upload Stamp'}
          </button>
        </div>
      </div>
    </div>
  );
}
