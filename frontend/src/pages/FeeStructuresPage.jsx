import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { feesAPI } from "../utils/api";

const GRADES = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const THIS_YEAR = new Date().getFullYear();

const styles = {
  page: { padding: 24, fontFamily: "inherit", color: "#0f172a" },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#0f172a" },
  subheader: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  section: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 },
  select: { background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  input: { background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  btn: { background: "#185fa5", border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "10px", borderBottom: "1px solid #e2e8f0", color: "#0f172a" },
  empty: { color: "#94a3b8", fontSize: 13, padding: "16px 0", textAlign: "center" },
};

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    grade: "Grade 1",
    term: "1",
    academicYear: `${THIS_YEAR}/${THIS_YEAR + 1}`,
    amount: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await feesAPI.getStructures();
      setStructures(res.data.feeStructures || []);
    } catch (e) {
      toast.error("Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form.amount || Number(form.amount) < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await feesAPI.setStructure({
        grade: form.grade,
        term: Number(form.term),
        academicYear: form.academicYear,
        amount: Number(form.amount),
        description: form.description,
      });
      toast.success("Fee structure saved");
      setForm({ ...form, amount: "", description: "" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>Fee Structures</div>
      <div style={styles.subheader}>Set how much each grade owes per term. Parents see this as their fee balance and can pay via M-Pesa.</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Add / Update</div>
        <div style={styles.filterBar}>
          <div style={styles.field}>
            <label style={styles.label}>Grade</label>
            <select style={styles.select} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Term</label>
            <select style={styles.select} value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Academic Year</label>
            <input style={styles.input} value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Amount (KES)</label>
            <input style={styles.input} type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="15000" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Note (optional)</label>
            <input style={styles.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Includes lunch" />
          </div>
          <button style={styles.btn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Current Fee Structures</div>
        {loading && <div style={styles.empty}>Loading...</div>}
        {!loading && structures.length === 0 && <div style={styles.empty}>No fee structures set yet.</div>}
        {!loading && structures.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Term</th>
                <th style={styles.th}>Academic Year</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {structures.map(s => (
                <tr key={s.id}>
                  <td style={styles.td}>{s.grade}</td>
                  <td style={styles.td}>Term {s.term}</td>
                  <td style={styles.td}>{s.academic_year}</td>
                  <td style={styles.td}>KES {Number(s.amount).toLocaleString()}</td>
                  <td style={styles.td}>{s.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
