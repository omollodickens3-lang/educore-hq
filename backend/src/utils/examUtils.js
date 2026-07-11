function termToInt(term) {
  if (term === null || term === undefined) return null;
  const match = String(term).match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function cbcGrade(score, section) {
  const pct = Math.round(score);
  if (section === 'js') {
    if (pct >= 90) return 'EE1';
    if (pct >= 75) return 'EE2';
    if (pct >= 58) return 'ME1';
    if (pct >= 41) return 'ME2';
    if (pct >= 31) return 'AE1';
    if (pct >= 21) return 'AE2';
    if (pct >= 11) return 'BE1';
    return 'BE2';
  }
  if (pct >= 80) return 'EE';
  if (pct >= 60) return 'ME';
  if (pct >= 40) return 'AE';
  return 'BE';
}

module.exports = { termToInt, cbcGrade };
