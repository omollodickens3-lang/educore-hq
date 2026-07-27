import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { learnersAPI } from '../utils/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const GRADES = ['Grade 7', 'Grade 8', 'Grade 9'];
const STREAM_OPTIONS = ['A', 'B', 'C', 'D', 'East', 'West', 'North', 'South'];

function statusBadge(status) {
  const map = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    remediation: { bg: '#fef9c3', color: '#854d0e', label: 'Remediation' },
    transferred: { bg: '#f1f5f9', color: '#64748b', label: 'Transferred' },
  };
  const s = map[status] || map.active;
  return (
    <span style={{
      fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
      background: s.bg, color: s.color, textTransform: 'capitalize',
    }}>{s.label}</span>
  );
}

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

function LearnerFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', admissionNo: '', dateOfBirth: '', gender: '',
    grade: 'Grade 7', stream: 'A', parentName: '', parentPhone: '', parentEmail: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.grade) {
      toast.error('First name, last name and grade are required');
      return;
    }
    setSaving(true);
    try {
      await learnersAPI.create(form);
      toast.success('Learner added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add learner');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Add Learner" onClose={onClose}>
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
          <label style={labelStyle}>Admission No.
            <input style={inputStyle} value={form.admissionNo} onChange={e => set('admissionNo', e.target.value)} placeholder="Auto-generated if blank" />
          </label>
          <label style={labelStyle}>Date of Birth
            <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>Gender
            <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label style={labelStyle}>Grade *
            <select style={inputStyle} value={form.grade} onChange={e => set('grade', e.target.value)}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Stream
            <input style={inputStyle} value={form.stream} onChange={e => set('stream', e.target.value)} placeholder="A" />
          </label>
        </div>

        <div style={{
          background: '#0f172a', borderRadius: '10px', padding: '14px',
          border: '1px solid #334155', marginBottom: '16px',
        }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginBottom: '10px' }}>Parent / Guardian</p>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Name
              <input style={inputStyle} value={form.parentName} onChange={e => set('parentName', e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={labelStyle}>Phone
              <input style={inputStyle} value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)} />
            </label>
            <label style={labelStyle}>Email
              <input style={inputStyle} type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Notes
            <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </label>
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
          }}>{saving ? 'Saving...' : 'Add Learner'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// Recognized header names, normalized (lowercase, no spaces/underscores/periods),
// mapped to the canonical field they represent. This lets uploads work regardless
// of column order or exact header wording.
const HEADER_ALIASES = {
  name: 'name', fullname: 'name', studentname: 'name', learnername: 'name',
  firstname: 'firstName', fname: 'firstName', givenname: 'firstName',
  lastname: 'lastName', lname: 'lastName', surname: 'lastName', familyname: 'lastName',
  grade: 'grade', class: 'grade', form: 'grade',
  stream: 'stream', section: 'stream',
  admissionno: 'admissionNo', admno: 'admissionNo', admissionnumber: 'admissionNo', regno: 'admissionNo', registrationno: 'admissionNo',
  gender: 'gender', sex: 'gender',
  dateofbirth: 'dateOfBirth', dob: 'dateOfBirth', birthdate: 'dateOfBirth',
  parentname: 'parentName', guardianname: 'parentName', parent: 'parentName', guardian: 'parentName',
  parentphone: 'parentPhone', guardianphone: 'parentPhone', phone: 'parentPhone', phonenumber: 'parentPhone', contact: 'parentPhone',
  parentemail: 'parentEmail', guardianemail: 'parentEmail', email: 'parentEmail',
};

function normalizeHeader(h) {
  return (h || '').trim().toLowerCase().replace(/[\s_.]+/g, '');
}

function normalizeGender(g) {
  if (!g) return undefined;
  const v = g.trim().toLowerCase();
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'f' || v === 'female') return 'Female';
  return g.trim();
}

function splitFullName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

// Template shown to the user as a guide (still accepted as-is with no header row).
const TEMPLATE_HEADER = 'firstName,lastName,grade,stream,admissionNo,gender,dateOfBirth,parentName,parentPhone,parentEmail';
const STRICT_COLUMN_ORDER = ['firstName', 'lastName', 'grade', 'stream', 'admissionNo', 'gender', 'dateOfBirth', 'parentName', 'parentPhone', 'parentEmail'];

// Tries to build a header -> field map from the first row. Returns null if the
// first row doesn't look like a recognizable header (i.e. it's probably data).
function detectHeaderMap(cols) {
  const fieldMap = {};
  let recognizedCount = 0;
  cols.forEach((col, i) => {
    const field = HEADER_ALIASES[normalizeHeader(col)];
    if (field) {
      fieldMap[i] = field;
      recognizedCount++;
    }
  });
  // Require at least a name field and something else recognized to trust this as a header row.
  const hasNameField = Object.values(fieldMap).includes('name') ||
    (Object.values(fieldMap).includes('firstName') && Object.values(fieldMap).includes('lastName'));
  if (recognizedCount >= 2 && hasNameField) return fieldMap;
  return null;
}

function parseRows(raw, defaults = {}) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: [] };

  const delim = lines[0].includes('\t') ? '\t' : ',';
  const firstCols = lines[0].split(delim).map(c => c.trim());
  const headerMap = detectHeaderMap(firstCols);

  const rows = [];
  const errors = [];

  const startIndex = headerMap ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim());
    const record = {};

    if (headerMap) {
      // Flexible mode: map each column by whatever header was detected above it.
      cols.forEach((val, idx) => {
        const field = headerMap[idx];
        if (field) record[field] = val;
      });
    } else {
      // Strict fallback: no recognizable header row, so assume the original fixed
      // column order. This keeps old paste-box usage working unchanged.
      if (cols.length !== STRICT_COLUMN_ORDER.length) {
        errors.push(`Row ${i + 1}: expected ${STRICT_COLUMN_ORDER.length} columns, got ${cols.length} — skipped. (${lines[i].slice(0, 60)})`);
        continue;
      }
      STRICT_COLUMN_ORDER.forEach((field, idx) => { record[field] = cols[idx]; });
    }

    // Combined "Name" column: split into first/last automatically.
    if (record.name && !record.firstName && !record.lastName) {
      const { firstName, lastName } = splitFullName(record.name);
      record.firstName = firstName;
      record.lastName = lastName;
    }

    const firstName = (record.firstName || '').trim();
    const lastName = (record.lastName || '').trim();
    const grade = (record.grade || defaults.grade || '').trim();
    const stream = (record.stream || defaults.stream || '').trim();

    if (!firstName || !lastName) {
      errors.push(`Row ${i + 1}: missing first/last name — skipped. (${lines[i].slice(0, 60)})`);
      continue;
    }
    if (!grade) {
      errors.push(`Row ${i + 1}: no grade in file and no default grade selected — skipped.`);
      continue;
    }

    const admissionNo = (record.admissionNo || '').trim();
    if (admissionNo && !/^\d+$/.test(admissionNo) && !/^\d{4}\/\d+$/.test(admissionNo)) {
      errors.push(`Row ${i + 1}: admissionNo "${admissionNo}" doesn't look valid (plain digits or YYYY/NNNN) — skipped.`);
      continue;
    }

    rows.push({
      firstName, lastName, grade,
      stream: stream || undefined,
      admissionNo: admissionNo || undefined,
      gender: normalizeGender(record.gender),
      dateOfBirth: record.dateOfBirth || undefined,
      parentName: record.parentName || undefined,
      parentPhone: record.parentPhone || undefined,
      parentEmail: record.parentEmail || undefined,
    });
  }

  return { rows, errors };
}

// Reads an .xlsx/.xls file and converts the first sheet into the same
// comma-separated text format the paste box already expects.
function extractCsvFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        resolve(csv);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Could not read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

// Best-effort PDF table extraction: groups text items into lines by their
// vertical position, then joins items on each line using a comma when the
// horizontal gap between them looks like a column break. Not perfect for
// every layout, so the result lands in the reviewable textarea, not uploaded
// automatically.
async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const outputLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
    }));

    const lineMap = new Map();
    items.forEach(it => {
      const key = Math.round(it.y / 3) * 3;
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key).push(it);
    });

    const sortedKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
    sortedKeys.forEach(key => {
      const rowItems = lineMap.get(key).sort((a, b) => a.x - b.x);
      let rowStr = '';
      let lastEndX = null;
      rowItems.forEach(it => {
        const text = it.str.trim();
        if (!text) return;
        if (lastEndX !== null) {
          const gap = it.x - lastEndX;
          rowStr += gap > 15 ? ',' : ' ';
        }
        rowStr += text;
        lastEndX = it.x + text.length * 5;
      });
      if (rowStr.trim()) outputLines.push(rowStr.trim());
    });
  }

  return outputLines.join('\n');
}

function BulkUploadModal({ onClose, onSaved }) {
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [result, setResult] = useState(null);
  const [defaultGrade, setDefaultGrade] = useState('');
  const [defaultStream, setDefaultStream] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const ext = file.name.split('.').pop().toLowerCase();

    setParsingFile(true);
    try {
      if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = (ev) => setRaw(ev.target.result);
        reader.readAsText(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const csv = await extractCsvFromExcel(file);
        setRaw(csv);
        toast.success('Excel file loaded — review the rows below before uploading');
      } else if (ext === 'pdf') {
        const text = await extractTextFromPdf(file);
        setRaw(text);
        toast('PDF text extracted — please check column order carefully before uploading', { icon: '⚠️' });
      } else {
        toast.error('Unsupported file type. Please upload a CSV, Excel, or PDF file.');
      }
    } catch (err) {
      console.error('File parse error:', err);
      toast.error('Could not read that file. Please check the format and try again.');
    } finally {
      setParsingFile(false);
    }
  }

  async function handleUpload() {
    const { rows: learners, errors: parseErrors } = parseRows(raw, {
      grade: defaultGrade,
      stream: defaultStream,
    });

    if (parseErrors.length) {
      toast.error(`${parseErrors.length} row(s) skipped due to formatting problems — see details below`);
      setResult({ created: [], failed: parseErrors.map(msg => ({ error: msg })) });
    }

    if (!learners.length) {
      if (!parseErrors.length) {
        toast.error('No rows to upload — paste data or choose a file');
      }
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const res = await learnersAPI.bulkCreate(learners);
      const { created = [], failed = [] } = res.data;
      setResult({ created, failed });
      if (created.length) {
        toast.success(`${created.length} learner(s) created`);
        onSaved();
      }
      if (failed.length) {
        toast.error(`${failed.length} row(s) failed — see details below`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalShell title="Bulk Upload Learners" onClose={onClose} width="560px">
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
        Upload a CSV, Excel, or PDF file, or paste rows below. Any of these column names are
        recognized automatically (in any order): Name (or First/Last Name), Grade, Stream,
        Admission No, Gender, Date of Birth, Parent Name, Parent Phone, Parent Email.
      </p>
      <code style={{
        display: 'block', background: '#0f172a', color: '#7dd3fc', fontSize: '12px',
        padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', overflowX: 'auto',
        border: '1px solid #334155',
      }}>{TEMPLATE_HEADER}</code>

      <div style={{
        background: '#0f172a', borderRadius: '10px', padding: '14px',
        border: '1px solid #334155', marginBottom: '16px',
      }}>
        <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginBottom: '10px' }}>
          If your file has no Grade/Stream columns (e.g. it's already a single class list), set
          defaults here to apply to every row:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={labelStyle}>Default Grade
            <select style={inputStyle} value={defaultGrade} onChange={e => setDefaultGrade(e.target.value)}>
              <option value="">None</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Default Stream
            <select style={inputStyle} value={defaultStream} onChange={e => setDefaultStream(e.target.value)}>
              <option value="">None</option>
              {STREAM_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '14px', borderRadius: '10px', border: '1px dashed #334155',
        background: '#0f172a', color: '#94a3b8', fontSize: '14px', cursor: 'pointer',
        marginBottom: '12px',
      }}>
        {parsingFile ? 'Reading file...' : fileName ? `File: ${fileName}` : 'Choose CSV, Excel, or PDF file'}
        <input
          type="file"
          accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </label>

      <label style={labelStyle}>Or paste rows (CSV or tab-separated)
        <textarea
          style={{ ...inputStyle, minHeight: '120px', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={'Jane,Doe,Grade 7,A\nJohn,Smith,Grade 8,B'}
        />
      </label>

      {result && (
        <div style={{
          marginTop: '16px', padding: '12px', borderRadius: '10px',
          background: '#0f172a', border: '1px solid #334155', fontSize: '13px',
        }}>
          <p style={{ color: '#4ade80', marginBottom: '6px' }}>{result.created.length} created</p>
          {result.failed.length > 0 && (
            <>
              <p style={{ color: '#f87171', marginBottom: '6px' }}>{result.failed.length} failed</p>
              <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {result.failed.map((f, i) => (
                  <p key={i} style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0' }}>
                    {f.row?.firstName || '?'} {f.row?.lastName || '?'} - {f.error}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button type="button" onClick={onClose} style={{
          padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
        }}>Close</button>
        <button type="button" onClick={handleUpload} disabled={uploading} style={{
          padding: '10px 18px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px',
          fontWeight: 600, opacity: uploading ? 0.6 : 1,
        }}>{uploading ? 'Uploading...' : 'Upload'}</button>
      </div>
    </ModalShell>
  );
}

export default function LearnersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['learners', gradeFilter, search],
    queryFn: () => learnersAPI.getAll({
      grade: gradeFilter || undefined,
      search: search || undefined,
    }).then(r => r.data),
  });
  const learners = data?.learners || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => learnersAPI.delete(id),
    onSuccess: () => {
      toast.success('Learner removed');
      queryClient.invalidateQueries(['learners']);
    },
    onError: () => toast.error('Failed to remove learner'),
  });

  function handleDelete(id, name) {
    if (window.confirm(`Remove ${name} from the school register?`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '4px' }}>Learners</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Manage learner records and admissions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowBulkModal(true)} style={{
            padding: '11px 20px', borderRadius: '10px', border: '1px solid #2563eb',
            background: '#fff', color: '#2563eb', fontWeight: 600,
            cursor: 'pointer', fontSize: '14px',
          }}>Bulk Upload</button>
          <button onClick={() => setShowAddModal(true)} style={{
            padding: '11px 20px', borderRadius: '10px', border: 'none',
            background: '#2563eb', color: '#fff', fontWeight: 600,
            cursor: 'pointer', fontSize: '14px',
          }}>+ Add Learner</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          placeholder="Search name or admission no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '14px', minWidth: '240px', boxSizing: 'border-box',
          }}
        />
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '14px', background: '#fff',
          }}
        >
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p style={{ color: '#64748b' }}>Loading learners...</p>
      ) : learners.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '40px',
          textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0',
        }}>No learners found. Click "Add Learner" or "Bulk Upload" to get started.</div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Admission No.', 'Grade', 'Stream', 'Gender', 'Parent', 'Status', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
                    color: '#64748b', fontWeight: 600, textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learners.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 500 }}>
                    {l.first_name} {l.last_name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.admission_no || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{l.grade}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.stream || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.gender || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.parent_name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{statusBadge(l.status)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(l.id, `${l.first_name} ${l.last_name}`)} style={{
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

      {showAddModal && (
        <LearnerFormModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => queryClient.invalidateQueries(['learners'])}
        />
      )}
      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onSaved={() => queryClient.invalidateQueries(['learners'])}
        />
      )}
    </div>
  );
}
