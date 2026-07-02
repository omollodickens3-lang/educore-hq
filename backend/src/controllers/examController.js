async function getScores(req, res) {
  try {
    const { rows: examRows } = await query(
      `SELECT grade FROM exams WHERE id=$1 AND school_id=$2`,
      [req.params.examId, req.user.school_id]
    );
    if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
    const examGrade = examRows[0].grade;

    const { rows } = await query(
      `SELECT l.id AS learner_id, l.first_name, l.last_name, l.admission_no, l.grade, l.section,
              s.id AS score_id, s.exam_id, s.subject, s.score, s.remarks
       FROM learners l
       LEFT JOIN scores s ON s.learner_id = l.id AND s.exam_id = $1
       WHERE l.school_id=$2 AND l.grade=$3
       ORDER BY l.last_name`,
      [req.params.examId, req.user.school_id, examGrade]
    );
    res.json({ scores: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch scores' }); }
}