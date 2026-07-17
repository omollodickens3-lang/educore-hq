const fs = require('fs');
const path = './src/pages/AnalyticsPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// --- 1. Add getSubjectRankingByStream to api object ---
const apiAnchor = 'getLearnerRanking: (p = {}) => apiFetch("/exams/learner-ranking?" + new URLSearchParams(p)),';
if (!content.includes(apiAnchor)) {
  console.error("ERROR: api anchor not found. No changes made.");
  process.exit(1);
}
content = content.replace(
  apiAnchor,
  apiAnchor + '\n  getSubjectRankingByStream: (p = {}) => apiFetch("/exams/subject-ranking-by-stream?" + new URLSearchParams(p)),'
);

// --- 2. Add subjectRanking state ---
const stateAnchor = 'const [learnerRanking, setLearnerRanking] = useState([]);';
if (!content.includes(stateAnchor)) {
  console.error("ERROR: state anchor not found. No changes made.");
  process.exit(1);
}
content = content.replace(
  stateAnchor,
  stateAnchor + '\n  const [subjectRanking, setSubjectRanking] = useState([]);'
);

// --- 3. Fetch subject ranking in load(), conditional on stream being set ---
const loadAnchor = 'setLearnerRanking(lr.learnerRanking || []);';
if (!content.includes(loadAnchor)) {
  console.error("ERROR: load anchor not found. No changes made.");
  process.exit(1);
}
const loadInsert = loadAnchor + `
      if (filters.stream) {
        const sub = await api.getSubjectRankingByStream(params);
        setSubjectRanking(sub.subjectRanking || []);
      } else {
        setSubjectRanking([]);
      }`;
content = content.replace(loadAnchor, loadInsert);

// --- 4. Insert new "Subject Ranking" section before the "Learner Ranking" section ---
const learnerTitleAnchor = '<div style={styles.sectionTitle}>Learner Ranking (Position in Class)';
const learnerTitleIdx = content.indexOf(learnerTitleAnchor);
if (learnerTitleIdx === -1) {
  console.error("ERROR: learner ranking title anchor not found. No changes made.");
  process.exit(1);
}
const sectionOpenAnchor = '<div style={styles.section}>';
const insertIdx = content.lastIndexOf(sectionOpenAnchor, learnerTitleIdx);
if (insertIdx === -1) {
  console.error("ERROR: could not find section wrapper before Learner Ranking. No changes made.");
  process.exit(1);
}

const subjectSection = `<div style={styles.section}>
        <div style={styles.sectionTitle}>Subject Ranking by Stream {filters.stream ? \`— Stream \${filters.stream}\` : "(select a stream above)"}</div>
        {!filters.stream ? (
          <div style={styles.empty}>Enter a stream above to see subject-by-subject ranking.</div>
        ) : loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : subjectRanking.length === 0 ? (
          <div style={styles.empty}>No score data yet for this selection.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Avg Score</th>
                <th style={styles.th}>Learners Marked</th>
                <th style={styles.th}>Grade Distribution</th>
                <th style={styles.th}>Subject Teacher</th>
              </tr>
            </thead>
            <tbody>
              {subjectRanking.map((row) => (
                <tr key={row.subject}>
                  <td style={styles.td}><span style={styles.rankBadge}>{row.rank}</span></td>
                  <td style={styles.td}>{row.subject}</td>
                  <td style={styles.td}>{row.avg_score}%</td>
                  <td style={styles.td}>{row.learners_marked}</td>
                  <td style={styles.td}>
                    <GradeBadge label="EE" count={row.ee_count} colorKey="ee" />
                    <GradeBadge label="ME" count={row.me_count} colorKey="me" />
                    <GradeBadge label="AE" count={row.ae_count} colorKey="ae" />
                    <GradeBadge label="BE" count={row.be_count} colorKey="be" />
                  </td>
                  <td style={styles.td}>{row.subject_teacher || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      `;

content = content.slice(0, insertIdx) + subjectSection + content.slice(insertIdx);

fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS: AnalyticsPage.jsx patched.");