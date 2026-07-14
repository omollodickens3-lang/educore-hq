import { useEffect, useState, useCallback } from 'react';
import { classesAPI, teachersAPI } from '../utils/api';

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];

export default function ManageClassesPage() {
  const [classesList, setClassesList] = useState([]);
  const [form, setForm] = useState({ grade: '', stream: '', section: '', academicYear: '', classTeacherId: '' });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    classesAPI.getAll().then(r => setClassesList(r.data || [])).catch(e => setErr('Load failed')).finally(() => setLoading(false));
    teachersAPI.getAll();
  }, []);

  return <div style={{padding:'24px'}}><h2>Manage Classes</h2><p>Create Grade + Stream combos with no cap.</p></div>;
}
