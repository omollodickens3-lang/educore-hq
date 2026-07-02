-- ============================================================
-- EduCore CBC School Management Platform
-- Migration 002 — Merge of custom Supabase schema additions
-- Adds: subjects, schemes_of_work, results_analysis,
--       payments, school_subscriptions,
--       subdomain + mpesa fields on schools,
--       exam questions/answers JSONB,
--       competency_scores per learner
-- Safe to run on top of 001 — uses IF NOT EXISTS throughout
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTEND schools table
-- ─────────────────────────────────────────────
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS subdomain         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS level             TEXT DEFAULT 'primary_and_js',
  ADD COLUMN IF NOT EXISTS mpesa_till        TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free','basic','premium','enterprise'));

COMMENT ON COLUMN schools.subdomain         IS 'Unique school subdomain e.g. westside → westside.educore.ac.ke';
COMMENT ON COLUMN schools.subscription_tier IS 'free=demo limit · basic=full · premium=AI+SMS · enterprise=custom';

-- ─────────────────────────────────────────────
-- EXTEND users — add quick-lookup fields for
-- parents (no separate learner lookup needed)
-- ─────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS full_name   TEXT,
  ADD COLUMN IF NOT EXISTS adm_number  TEXT,
  ADD COLUMN IF NOT EXISTS grade       TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- ─────────────────────────────────────────────
-- CBC SUBJECTS TABLE
-- One row per subject per grade per school
-- strands/substrands stored as JSONB arrays
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  grade       TEXT NOT NULL,
  section     TEXT DEFAULT 'primary'
              CHECK (section IN ('primary','js')),
  strands     JSONB DEFAULT '[]',
  substrands  JSONB DEFAULT '[]',
  -- Example strands for Mathematics Gr 4:
  -- ["Numbers", "Measurement", "Geometry", "Data Handling"]
  -- Example substrands:
  -- {"Numbers": ["Whole numbers", "Fractions", "Decimals"]}
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name, grade)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade  ON subjects(grade, section);

-- ─────────────────────────────────────────────
-- SCHEMES OF WORK (relational — links to subjects)
-- Replaces the JSONB content blob in documents
-- for structured scheme data
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schemes_of_work (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id           UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject_id          UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id          UUID REFERENCES teachers(id) ON DELETE SET NULL,
  academic_year       TEXT NOT NULL DEFAULT '2025/2026',
  term                INTEGER NOT NULL CHECK (term IN (1,2,3)),
  week                INTEGER NOT NULL CHECK (week BETWEEN 1 AND 14),
  strand              TEXT,
  substrand           TEXT,
  learning_outcomes   TEXT[] DEFAULT '{}',
  core_competencies   TEXT[] DEFAULT '{}',
  activities          TEXT[] DEFAULT '{}',
  resources           TEXT[] DEFAULT '{}',
  assessment          TEXT,
  is_ai_generated     BOOLEAN DEFAULT false,
  is_approved         BOOLEAN DEFAULT false,
  approved_by         UUID REFERENCES teachers(id),
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, subject_id, academic_year, term, week)
);

CREATE INDEX IF NOT EXISTS idx_sow_school   ON schemes_of_work(school_id);
CREATE INDEX IF NOT EXISTS idx_sow_subject  ON schemes_of_work(subject_id);
CREATE INDEX IF NOT EXISTS idx_sow_term     ON schemes_of_work(term, academic_year);

-- ─────────────────────────────────────────────
-- EXTEND exams — add questions JSONB for
-- online exam delivery (especially JS section)
-- ─────────────────────────────────────────────
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS questions    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS duration_min INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS fee          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subject_id   UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- questions JSONB format:
-- [{ "id": "q1", "type": "mcq|short|essay",
--    "text": "What is 2+2?",
--    "options": ["2","3","4","5"],
--    "answer": "4", "marks": 2,
--    "strand": "Numbers" }]

-- ─────────────────────────────────────────────
-- EXTEND submissions — add answers JSONB for
-- online exam mode
-- ─────────────────────────────────────────────
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS answers      JSONB DEFAULT '{}';
-- answers format: { "q1": "4", "q2": "Paris", ... }

-- Create a separate exam_submissions table for
-- formal CBC exams (distinct from assignments)
CREATE TABLE IF NOT EXISTS exam_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  exam_id       UUID REFERENCES exams(id) ON DELETE CASCADE,
  learner_id    UUID REFERENCES learners(id) ON DELETE CASCADE,
  answers       JSONB DEFAULT '{}',
  score         NUMERIC(5,1),
  max_score     NUMERIC(5,1),
  grade_label   TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  graded_at     TIMESTAMPTZ,
  graded_by     UUID REFERENCES teachers(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam    ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_learner ON exam_submissions(learner_id);

-- ─────────────────────────────────────────────
-- RESULTS ANALYSIS — computed after exam entry
-- One row per exam — stores aggregate statistics
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results_analysis (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
  exam_id          UUID REFERENCES exams(id) ON DELETE CASCADE,
  grade            TEXT NOT NULL,
  section          TEXT DEFAULT 'primary',
  academic_year    TEXT DEFAULT '2025/2026',
  term             INTEGER CHECK (term IN (1,2,3)),
  exam_type        TEXT,
  -- Core stats
  class_mean       NUMERIC(5,2),
  highest          NUMERIC(5,2),
  lowest           NUMERIC(5,2),
  learner_count    INTEGER,
  -- CBC grade distribution
  ee_count         INTEGER DEFAULT 0,  -- EE or EE1+EE2
  me_count         INTEGER DEFAULT 0,  -- ME or ME1+ME2
  ae_count         INTEGER DEFAULT 0,  -- AE or AE1+AE2
  be_count         INTEGER DEFAULT 0,  -- BE or BE1+BE2
  -- Detailed breakdown stored as JSONB
  strand_breakdown JSONB DEFAULT '{}',
  -- e.g. {"Mathematics": {"mean": 72, "grade": "ME"}, ...}
  subject_means    JSONB DEFAULT '{}',
  -- e.g. {"Mathematics": 72, "English": 78, ...}
  weak_areas       TEXT[] DEFAULT '{}',
  -- e.g. ["Mathematics - Fractions", "Kiswahili - Insha"]
  top_performers   JSONB DEFAULT '[]',
  -- e.g. [{"name": "Amina W.", "mean": 91, "rank": 1}]
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id)
);

CREATE INDEX IF NOT EXISTS idx_results_analysis_school ON results_analysis(school_id);
CREATE INDEX IF NOT EXISTS idx_results_analysis_grade  ON results_analysis(grade, term, academic_year);

-- ─────────────────────────────────────────────
-- COMPETENCY SCORES (from your schema)
-- Per learner per term — CBC strand assessment
-- (extends our existing learner_strands table)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competency_scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  learner_id    UUID REFERENCES learners(id) ON DELETE CASCADE,
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  term          INTEGER NOT NULL CHECK (term IN (1,2,3)),
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  strand        TEXT NOT NULL,
  substrand     TEXT,
  score         INTEGER CHECK (score BETWEEN 0 AND 100),
  grade_label   TEXT,
  -- Primary: EE/ME/AE/BE
  -- JS: EE1/EE2/ME1/ME2/AE1/AE2/BE1/BE2
  teacher_remark TEXT,
  recorded_by   UUID REFERENCES teachers(id),
  recorded_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learner_id, subject_id, term, academic_year, strand)
);

CREATE INDEX IF NOT EXISTS idx_competency_learner ON competency_scores(learner_id);
CREATE INDEX IF NOT EXISTS idx_competency_subject ON competency_scores(subject_id);

-- ─────────────────────────────────────────────
-- PAYMENTS — M-Pesa integration
-- Links learner + exam to M-Pesa transaction
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  learner_id    UUID REFERENCES learners(id) ON DELETE SET NULL,
  exam_id       UUID REFERENCES exams(id) ON DELETE SET NULL,
  mpesa_code    TEXT UNIQUE NOT NULL,
  -- M-Pesa transaction code e.g. QJK12345XY
  phone         TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  purpose       TEXT DEFAULT 'exam_fee'
                CHECK (purpose IN ('exam_fee','school_fee','subscription','other')),
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','failed','reversed')),
  notified      BOOLEAN DEFAULT false,
  -- SMS confirmation sent to parent
  mpesa_receipt JSONB DEFAULT '{}',
  -- Full M-Pesa callback payload stored here
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_school  ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_learner ON payments(learner_id);
CREATE INDEX IF NOT EXISTS idx_payments_code    ON payments(mpesa_code);

-- ─────────────────────────────────────────────
-- SCHOOL SUBSCRIPTIONS — per-school billing
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free','basic','premium','enterprise')),
  mpesa_code   TEXT,
  amount       NUMERIC(10,2),
  valid_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until  DATE,
  -- NULL = perpetual (enterprise/manual)
  is_active    BOOLEAN DEFAULT true,
  features     JSONB DEFAULT '{}',
  -- e.g. {"sms": true, "ai": true, "max_learners": 500}
  activated_by UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_school ON school_subscriptions(school_id);

-- ─────────────────────────────────────────────
-- SUBSCRIPTION FEATURE LIMITS VIEW
-- Easy lookup of what a school can access
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW school_feature_access AS
SELECT
  s.id AS school_id,
  s.name AS school_name,
  s.subdomain,
  s.subscription_tier,
  ss.plan,
  ss.valid_until,
  ss.is_active AS subscription_active,
  ss.features,
  -- Derived flags
  CASE WHEN ss.plan IN ('premium','enterprise') THEN true ELSE false END AS has_sms,
  CASE WHEN ss.plan IN ('premium','enterprise') THEN true ELSE false END AS has_ai,
  CASE WHEN ss.plan = 'free' THEN 50
       WHEN ss.plan = 'basic' THEN 300
       WHEN ss.plan = 'premium' THEN 1000
       ELSE 99999 END AS max_learners,
  CASE WHEN ss.valid_until IS NULL OR ss.valid_until >= CURRENT_DATE THEN true
       ELSE false END AS is_valid
FROM schools s
LEFT JOIN school_subscriptions ss
  ON ss.school_id = s.id AND ss.is_active = true
ORDER BY s.name;

-- ─────────────────────────────────────────────
-- SEED DEFAULT SUBJECTS (CBC Kenya)
-- PP1–Grade 9 — run after migration
-- Call: SELECT seed_cbc_subjects('your-school-id');
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_cbc_subjects(p_school_id UUID)
RETURNS void AS $$
DECLARE
  sub RECORD;
BEGIN
  -- Primary subjects (PP1–Grade 6)
  FOR sub IN SELECT * FROM (VALUES
    ('Mathematics',           'PP1',    'primary', '["Numbers","Measurement","Geometry"]'::jsonb),
    ('Language Activities',   'PP1',    'primary', '["Listening","Speaking","Reading","Writing"]'::jsonb),
    ('Environmental Activities','PP1',  'primary', '["Living things","Non-living things","Environment"]'::jsonb),
    ('Mathematics',           'PP2',    'primary', '["Numbers","Measurement","Geometry","Data handling"]'::jsonb),
    ('Language Activities',   'PP2',    'primary', '["Listening","Speaking","Reading","Writing"]'::jsonb),
    ('Environmental Activities','PP2',  'primary', '["Living things","Non-living things","Environment"]'::jsonb),
    ('Mathematics',           'Grade 1','primary', '["Numbers","Measurement","Geometry","Data"]'::jsonb),
    ('English',               'Grade 1','primary', '["Reading","Writing","Listening","Speaking"]'::jsonb),
    ('Kiswahili',             'Grade 1','primary', '["Kusikiliza","Kuzungumza","Kusoma","Kuandika"]'::jsonb),
    ('Mathematics',           'Grade 4','primary', '["Numbers","Fractions","Measurement","Geometry","Data"]'::jsonb),
    ('English',               'Grade 4','primary', '["Reading","Writing","Grammar","Oral skills"]'::jsonb),
    ('Kiswahili',             'Grade 4','primary', '["Kusoma","Kuandika","Sarufi","Mazungumzo"]'::jsonb),
    ('Science & Technology',  'Grade 4','primary', '["Living things","Environment","Technology"]'::jsonb),
    ('Social Studies',        'Grade 4','primary', '["Our community","History","Geography","Citizenship"]'::jsonb),
    ('CRE',                   'Grade 4','primary', '["Creation","Family","Church","Prayer"]'::jsonb),
    ('Mathematics',           'Grade 7','js',      '["Numbers","Algebra","Geometry","Measurement","Statistics","Financial maths"]'::jsonb),
    ('English',               'Grade 7','js',      '["Reading","Writing","Grammar","Literature","Oral skills"]'::jsonb),
    ('Kiswahili',             'Grade 7','js',      '["Kusoma","Kuandika","Sarufi","Fasihi","Mazungumzo"]'::jsonb),
    ('Integrated Science',    'Grade 7','js',      '["Biology","Chemistry","Physics","Earth science"]'::jsonb),
    ('Social Studies',        'Grade 7','js',      '["History","Geography","Citizenship","Economics"]'::jsonb),
    ('CRE',                   'Grade 7','js',      '["Creation","Ethics","Church history","Contemporary issues"]'::jsonb),
    ('Pre-Technical Studies', 'Grade 7','js',      '["Technology","Safety","Drawing","Materials"]'::jsonb),
    ('Creative Arts',         'Grade 7','js',      '["Visual arts","Performing arts","Design"]'::jsonb),
    ('Agriculture',           'Grade 7','js',      '["Crop production","Animal husbandry","Soil","Agribusiness"]'::jsonb),
    ('Mathematics',           'Grade 8','js',      '["Numbers","Algebra","Geometry","Measurement","Statistics"]'::jsonb),
    ('Integrated Science',    'Grade 8','js',      '["Biology","Chemistry","Physics","Earth science"]'::jsonb),
    ('Mathematics',           'Grade 9','js',      '["Numbers","Algebra","Geometry","Measurement","Statistics"]'::jsonb),
    ('Integrated Science',    'Grade 9','js',      '["Biology","Chemistry","Physics","Earth science"]'::jsonb)
  ) AS t(name, grade, section, strands)
  LOOP
    INSERT INTO subjects (id, school_id, name, grade, section, strands)
    VALUES (uuid_generate_v4(), p_school_id, sub.name, sub.grade, sub.section, sub.strands)
    ON CONFLICT (school_id, name, grade) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'CBC subjects seeded for school %', p_school_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- AUTO-TRIGGER: recompute results_analysis
-- after scores are inserted/updated
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_results_analysis()
RETURNS TRIGGER AS $$
DECLARE
  v_exam RECORD;
  v_grade TEXT;
  v_section TEXT;
  v_mean NUMERIC;
  v_high NUMERIC;
  v_low  NUMERIC;
  v_count INTEGER;
  v_subj_means JSONB;
BEGIN
  SELECT e.grade, e.term, e.exam_type, e.academic_year
  INTO v_exam FROM exams e WHERE e.id = NEW.exam_id;

  SELECT section INTO v_section FROM learners WHERE id = NEW.learner_id;

  SELECT
    ROUND(AVG(score),2), MAX(score), MIN(score), COUNT(DISTINCT learner_id)
  INTO v_mean, v_high, v_low, v_count
  FROM scores WHERE exam_id = NEW.exam_id;

  SELECT jsonb_object_agg(subject, ROUND(AVG(score),1))
  INTO v_subj_means
  FROM scores WHERE exam_id = NEW.exam_id
  GROUP BY subject;

  INSERT INTO results_analysis
    (id, school_id, exam_id, grade, section, academic_year, term, exam_type,
     class_mean, highest, lowest, learner_count, subject_means, generated_at)
  VALUES
    (uuid_generate_v4(), NEW.school_id, NEW.exam_id,
     v_exam.grade, COALESCE(v_section,'primary'),
     v_exam.academic_year, v_exam.term, v_exam.exam_type,
     v_mean, v_high, v_low, v_count, COALESCE(v_subj_means,'{}'), NOW())
  ON CONFLICT (exam_id) DO UPDATE SET
    class_mean    = EXCLUDED.class_mean,
    highest       = EXCLUDED.highest,
    lowest        = EXCLUDED.lowest,
    learner_count = EXCLUDED.learner_count,
    subject_means = EXCLUDED.subject_means,
    generated_at  = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_results_analysis ON scores;
CREATE TRIGGER trg_results_analysis
  AFTER INSERT OR UPDATE ON scores
  FOR EACH ROW EXECUTE FUNCTION refresh_results_analysis();

-- ─────────────────────────────────────────────
-- M-PESA WEBHOOK HELPER FUNCTION
-- Called by the backend after STK push callback
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION confirm_mpesa_payment(
  p_mpesa_code TEXT,
  p_receipt    JSONB
) RETURNS TABLE(
  payment_id UUID, learner_id UUID, exam_id UUID,
  school_id UUID, amount NUMERIC, notified BOOLEAN
) AS $$
BEGIN
  UPDATE payments SET
    status = 'confirmed',
    paid_at = NOW(),
    mpesa_receipt = p_receipt
  WHERE mpesa_code = p_mpesa_code
    AND status = 'pending';

  RETURN QUERY
  SELECT p.id, p.learner_id, p.exam_id, p.school_id, p.amount, p.notified
  FROM payments p WHERE p.mpesa_code = p_mpesa_code;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- AUTO updated_at trigger for new tables
-- ─────────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['schemes_of_work']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────
COMMENT ON TABLE subjects           IS 'CBC curriculum subjects with official strands and substrands per grade';
COMMENT ON TABLE schemes_of_work    IS 'Structured weekly schemes linking to subjects — replaces JSONB blob in documents';
COMMENT ON TABLE results_analysis   IS 'Auto-computed exam statistics — refreshed by trigger on every score insert';
COMMENT ON TABLE competency_scores  IS 'CBC strand-level assessment per learner per subject per term';
COMMENT ON TABLE payments           IS 'M-Pesa payment records — exam fees and school fees';
COMMENT ON TABLE school_subscriptions IS 'Per-school billing — plan, validity, feature flags';
COMMENT ON FUNCTION seed_cbc_subjects IS 'Call once per school to seed all CBC subjects PP1–Grade 9';
COMMENT ON FUNCTION confirm_mpesa_payment IS 'Called by M-Pesa STK webhook to confirm payment and return details for SMS';
