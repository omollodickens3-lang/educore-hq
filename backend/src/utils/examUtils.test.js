const { cbcGrade, termToInt } = require('../utils/examUtils');

describe('cbcGrade - primary section (default)', () => {
  test.each([
    [100, 'EE'],
    [80, 'EE'],
    [79, 'ME'],
    [60, 'ME'],
    [59, 'AE'],
    [40, 'AE'],
    [39, 'BE'],
    [0, 'BE'],
  ])('score %i -> %s', (score, expected) => {
    expect(cbcGrade(score, 'primary')).toBe(expected);
  });

  test('rounds score before grading (79.6 rounds to 80 -> EE)', () => {
    expect(cbcGrade(79.6, 'primary')).toBe('EE');
  });

  test('undefined/unrecognized section falls back to primary bands', () => {
    expect(cbcGrade(85, undefined)).toBe('EE');
    expect(cbcGrade(85, 'unknown')).toBe('EE');
  });
});

describe('cbcGrade - junior secondary (js) section', () => {
  test.each([
    [100, 'EE1'],
    [90, 'EE1'],
    [89, 'EE2'],
    [75, 'EE2'],
    [74, 'ME1'],
    [58, 'ME1'],
    [57, 'ME2'],
    [41, 'ME2'],
    [40, 'AE1'],
    [31, 'AE1'],
    [30, 'AE2'],
    [21, 'AE2'],
    [20, 'BE1'],
    [11, 'BE1'],
    [10, 'BE2'],
    [0, 'BE2'],
  ])('score %i -> %s', (score, expected) => {
    expect(cbcGrade(score, 'js')).toBe(expected);
  });
});

describe('termToInt', () => {
  test('parses plain numbers', () => {
    expect(termToInt(1)).toBe(1);
    expect(termToInt(2)).toBe(2);
    expect(termToInt(3)).toBe(3);
  });

  test('parses numeric strings', () => {
    expect(termToInt('1')).toBe(1);
    expect(termToInt('2')).toBe(2);
  });

  test('extracts number from label strings like "Term 1"', () => {
    expect(termToInt('Term 1')).toBe(1);
    expect(termToInt('Term 2')).toBe(2);
    expect(termToInt('Term 3')).toBe(3);
  });

  test('returns null for null or undefined', () => {
    expect(termToInt(null)).toBeNull();
    expect(termToInt(undefined)).toBeNull();
  });

  test('returns null when no digit is present', () => {
    expect(termToInt('')).toBeNull();
    expect(termToInt('Term')).toBeNull();
    expect(termToInt('abc')).toBeNull();
  });

  test('never returns NaN', () => {
    const values = [null, undefined, '', 'Term', 'abc', 'Term 1', 1, '1'];
    for (const v of values) {
      const result = termToInt(v);
      expect(Number.isNaN(result)).toBe(false);
    }
  });
});
