const { query } = require('../config/db');
const PDFDocument = require('pdfkit');

async function fetchClassList(schoolId, grade, stream) {
  let sql = `SELECT first_name, last_name, admission_no, stream, gender, grade
             FROM learners WHERE school_id = $1 AND grade = $2`;
  const params = [schoolId, grade];
  if (stream) {
    sql += ` AND stream = $3`;
    params.push(stream);
  }
  sql += ` ORDER BY stream, last_name, first_name`;
  const { rows } = await query(sql, params);
  return rows;
}

async function getClassList(req, res) {
  try {
    const { grade, stream } = req.query;
    if (!grade) return res.status(400).json({ error: 'Grade is required' });
    const schoolId = req.user.school_id;
    const learners = await fetchClassList(schoolId, grade, stream);
    res.json({ count: learners.length, learners });
  } catch (err) {
    console.error('getClassList error:', err.message);
    res.status(500).json({ error: 'Failed to fetch class list' });
  }
}

async function exportClassListCSV(req, res) {
  try {
    const { grade, stream } = req.query;
    if (!grade) return res.status(400).json({ error: 'Grade is required' });
    const schoolId = req.user.school_id;
    const learners = await fetchClassList(schoolId, grade, stream);

    const header = ['Name', 'Admission No', 'Stream', 'Gender'];
    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [header.join(',')];
    learners.forEach((l) => {
      lines.push([
        escapeCsv(l.first_name + ' ' + l.last_name),
        escapeCsv(l.admission_no || ''),
        escapeCsv(l.stream || ''),
        escapeCsv(l.gender || ''),
      ].join(','));
    });
    const csv = lines.join('\n');

    const filename = 'class_list_' + grade.replace(/\s+/g, '_') + (stream ? '_' + stream : '') + '.csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.send(csv);
  } catch (err) {
    console.error('exportClassListCSV error:', err.message);
    res.status(500).json({ error: 'Failed to export class list CSV' });
  }
}

async function exportClassListPDF(req, res) {
  try {
    const { grade, stream } = req.query;
    if (!grade) return res.status(400).json({ error: 'Grade is required' });
    const schoolId = req.user.school_id;
    const learners = await fetchClassList(schoolId, grade, stream);

    const schoolRes = await query('SELECT * FROM schools WHERE id = $1', [schoolId]);
    const school = schoolRes.rows[0] || {};

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = 'class_list_' + grade.replace(/\s+/g, '_') + (stream ? '_' + stream : '') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    doc.pipe(res);

    doc.fontSize(18).text(school.name || 'School', { align: 'center' });
    doc.fontSize(10).text((school.county || '') + (school.sub_county ? ' - ' + school.sub_county : ''), { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Class List', { align: 'center', underline: true });
    doc.fontSize(11).text(grade + (stream ? ' Stream ' + stream : ' (All Streams)'), { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('#', 40, tableTop, { width: 30 });
    doc.text('Name', 70, tableTop, { width: 180 });
    doc.text('Adm. No', 250, tableTop, { width: 100 });
    doc.text('Stream', 350, tableTop, { width: 80 });
    doc.text('Gender', 430, tableTop, { width: 80 });
    doc.font('Helvetica');

    let y = tableTop + 20;
    learners.forEach((l, i) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      doc.text(String(i + 1), 40, y, { width: 30 });
      doc.text(l.first_name + ' ' + l.last_name, 70, y, { width: 180 });
      doc.text(l.admission_no || '-', 250, y, { width: 100 });
      doc.text(l.stream || '-', 350, y, { width: 80 });
      doc.text(l.gender || '-', 430, y, { width: 80 });
      y += 20;
    });

    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('Total learners: ' + learners.length, 40, y + 10);

    doc.end();
  } catch (err) {
    console.error('exportClassListPDF error:', err.message);
    res.status(500).json({ error: 'Failed to export class list PDF' });
  }
}

module.exports = { getClassList, exportClassListCSV, exportClassListPDF };