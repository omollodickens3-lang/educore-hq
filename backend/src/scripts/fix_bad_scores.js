const { query } = require('../config/db');

(async () => {
  try {
    const { rows: badRows } = await query(`
      SELECT sc.id, sc.exam_id, sc.learner_id, sc.score, sc.remarks, sc.entered_by, sub.name AS correct_subject
      FROM scores sc
      JOIN exams e ON e.id = sc.exam_id
      JOIN subjects sub ON sub.id = e.subject_id
      WHERE sc.subject = 'ENGLISH MIDTERM'
    `);

    console.log(`Found ${badRows.length} bad rows to migrate.`);

    for (const row of badRows) {
      const updateResult = await query(
        `UPDATE scores
         SET score = $1, remarks = $2, entered_by = $3, updated_at = NOW()
         WHERE exam_id = $4 AND learner_id = $5 AND subject = $6
         RETURNING id`,
        [row.score, row.remarks, row.entered_by, row.exam_id, row.learner_id, row.correct_subject]
      );

      if (updateResult.rows.length === 0) {
        console.log(`No matching correct row found for learner ${row.learner_id}, exam ${row.exam_id} skipping delete of bad row ${row.id}`);
        continue;
      }

      await query(`DELETE FROM scores WHERE id = $1`, [row.id]);
      console.log(`Migrated + deleted bad row ${row.id} -> updated correct row ${updateResult.rows[0].id}`);
    }

    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
