-- ============================================================
-- EduCore CBC School Management Platform
-- Migration 001 — Initial schema (all 8 modules)
-- Run: npm run migrate
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- SCHOOLS (multi-school support ready)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  county        VARCHAR(100),
  sub_county    VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(100),
  portal_url    VARCHAR(200),
  logo_url      VARCHAR(300),
  established   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USERS (auth — all roles share this table)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL
                CHECK (role IN ('admin','deputy','hod','class_teacher','subject_teacher','parent')),
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school ON users(school_id);

-- ─────────────────────────────────────────────
-- MODULE 2 — TEACHERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  first_name    VARCHAR(80) NOT NULL,
  last_name     VARCHAR(80) NOT NULL,
  tsc_number    VARCHAR(50) UNIQUE,
  phone         VARCHAR(20),
  email         VARCHAR(150),
  gender        VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
  qualification VARCHAR(200),
  role          VARCHAR(30) NOT NULL DEFAULT 'subject_teacher'
                CHECK (role IN ('admin','deputy','hod','class_teacher','subject_teacher')),
  status        VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active','on_leave','off_duty')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teachers_school ON teachers(school_id);

-- Subjects a teacher is assigned to
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject     VARCHAR(100) NOT NULL,
  grade       VARCHAR(20),
  stream      VARCHAR(10),
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject, grade, stream)
);

-- ─────────────────────────────────────────────
-- GRADES & CLASSES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  grade           VARCHAR(20) NOT NULL,
  stream          VARCHAR(10) NOT NULL DEFAULT 'A',
  section         VARCHAR(10) NOT NULL DEFAULT 'primary'
                  CHECK (section IN ('primary','js')),
  class_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  academic_year   VARCHAR(10) NOT NULL DEFAULT '2025/2026',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, grade, stream, academic_year)
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ─────────────────────────────────────────────
-- MODULE 1 — LEARNERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  admission_no    VARCHAR(30) NOT NULL,
  first_name      VARCHAR(80) NOT NULL,
  last_name       VARCHAR(80) NOT NULL,
  date_of_birth   DATE,
  gender          VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
  grade           VARCHAR(20) NOT NULL,
  stream          VARCHAR(10),
  section         VARCHAR(10) DEFAULT 'primary'
                  CHECK (section IN ('primary','js')),
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active','transferred','graduated','remediation')),
  parent_name     VARCHAR(150),
  parent_phone    VARCHAR(20),
  parent_email    VARCHAR(150),
  parent_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, admission_no)
);

CREATE INDEX idx_learners_school ON learners(school_id);
CREATE INDEX idx_learners_class ON learners(class_id);
CREATE INDEX idx_learners_grade ON learners(grade);

-- CBC strand scores per learner per term
CREATE TABLE IF NOT EXISTS learner_strands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id      UUID REFERENCES learners(id) ON DELETE CASCADE,
  term            INTEGER NOT NULL CHECK (term IN (1,2,3)),
  academic_year   VARCHAR(10) NOT NULL DEFAULT '2025/2026',
  communication         INTEGER DEFAULT 0 CHECK (communication BETWEEN 0 AND 100),
  critical_thinking     INTEGER DEFAULT 0 CHECK (critical_thinking BETWEEN 0 AND 100),
  creativity            INTEGER DEFAULT 0 CHECK (creativity BETWEEN 0 AND 100),
  citizenship           INTEGER DEFAULT 0 CHECK (citizenship BETWEEN 0 AND 100),
  collaboration         INTEGER DEFAULT 0 CHECK (collaboration BETWEEN 0 AND 100),
  learning_to_learn     INTEGER DEFAULT 0 CHECK (learning_to_learn BETWEEN 0 AND 100),
  self_efficacy         INTEGER DEFAULT 0 CHECK (self_efficacy BETWEEN 0 AND 100),
  digital_literacy      INTEGER DEFAULT 0 CHECK (digital_literacy BETWEEN 0 AND 100),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learner_id, term, academic_year)
);

-- ─────────────────────────────────────────────
-- MODULE 3 — EXAMINATIONS & RESULTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  exam_type     VARCHAR(20) NOT NULL
                CHECK (exam_type IN ('opener','midterm','end_term')),
  term          INTEGER NOT NULL CHECK (term IN (1,2,3)),
  academic_year VARCHAR(10) NOT NULL DEFAULT '2025/2026',
  grade         VARCHAR(20) NOT NULL,
  stream        VARCHAR(10),
  start_date    DATE,
  end_date      DATE,
  is_published  BOOLEAN DEFAULT false,
  created_by    UUID REFERENCES teachers(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_grade_term ON exams(grade, term, academic_year);

-- Individual scores per learner per subject per exam
CREATE TABLE IF NOT EXISTS scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id     UUID REFERENCES exams(id) ON DELETE CASCADE,
  learner_id  UUID REFERENCES learners(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject     VARCHAR(100) NOT NULL,
  score       NUMERIC(5,1) CHECK (score BETWEEN 0 AND 100),
  max_score   NUMERIC(5,1) DEFAULT 100,
  grade_label VARCHAR(10),  -- EE/ME/AE/BE or EE1-BE2
  entered_by  UUID REFERENCES teachers(id),
  entered_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, learner_id, subject)
);

CREATE INDEX idx_scores_exam ON scores(exam_id);
CREATE INDEX idx_scores_learner ON scores(learner_id);
CREATE INDEX idx_scores_school ON scores(school_id);

-- ─────────────────────────────────────────────
-- MODULE 4 — REPORT FORMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_forms (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id           UUID REFERENCES schools(id) ON DELETE CASCADE,
  learner_id          UUID REFERENCES learners(id) ON DELETE CASCADE,
  term                INTEGER NOT NULL CHECK (term IN (1,2,3)),
  academic_year       VARCHAR(10) NOT NULL DEFAULT '2025/2026',
  exam_type           VARCHAR(20) DEFAULT 'end_term',
  mean_score          NUMERIC(5,2),
  class_position      INTEGER,
  class_total         INTEGER,
  class_teacher_remark TEXT,
  head_teacher_remark  TEXT,
  class_teacher_id    UUID REFERENCES teachers(id),
  status              VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','generated','sent','acknowledged')),
  generated_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  pdf_url             VARCHAR(300),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learner_id, term, academic_year, exam_type)
);

CREATE INDEX idx_reports_school ON report_forms(school_id);
CREATE INDEX idx_reports_learner ON report_forms(learner_id);

-- Term dates configuration
CREATE TABLE IF NOT EXISTS term_dates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year   VARCHAR(10) NOT NULL DEFAULT '2025/2026',
  term            INTEGER NOT NULL CHECK (term IN (1,2,3)),
  open_date       DATE,
  opener_start    DATE,
  opener_end      DATE,
  midterm_start   DATE,
  midterm_end     DATE,
  end_term_start  DATE,
  end_term_end    DATE,
  close_date      DATE,
  UNIQUE(school_id, academic_year, term)
);

-- ─────────────────────────────────────────────
-- MODULE 5 — ATTENDANCE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  learner_id    UUID REFERENCES learners(id) ON DELETE CASCADE,
  class_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  session       VARCHAR(5) DEFAULT 'AM' CHECK (session IN ('AM','PM')),
  status        VARCHAR(5) NOT NULL DEFAULT 'P'
                CHECK (status IN ('P','A','L','E','H')),
  -- P=Present, A=Absent, L=Late, E=Excused, H=Holiday
  marked_by     UUID REFERENCES teachers(id),
  note          VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learner_id, date, session)
);

CREATE INDEX idx_attendance_learner ON attendance(learner_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_school ON attendance(school_id);

-- ─────────────────────────────────────────────
-- MODULE 6 — ASSIGNMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id    UUID REFERENCES teachers(id) ON DELETE SET NULL,
  title         VARCHAR(200) NOT NULL,
  subject       VARCHAR(100) NOT NULL,
  grade         VARCHAR(20) NOT NULL,
  stream        VARCHAR(10),
  section       VARCHAR(10) DEFAULT 'primary',
  term          INTEGER DEFAULT 2 CHECK (term IN (1,2,3)),
  academic_year VARCHAR(10) DEFAULT '2025/2026',
  description   TEXT,
  cbc_strand    VARCHAR(100),
  max_marks     INTEGER NOT NULL DEFAULT 30,
  issued_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'open'
                CHECK (status IN ('open','due_soon','closed','graded')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_school ON assignments(school_id);
CREATE INDEX idx_assignments_grade ON assignments(grade, stream);

-- Individual learner submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID REFERENCES assignments(id) ON DELETE CASCADE,
  learner_id      UUID REFERENCES learners(id) ON DELETE CASCADE,
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','submitted','graded','missing')),
  score           NUMERIC(5,1),
  grade_label     VARCHAR(10),
  feedback        TEXT,
  submitted_at    TIMESTAMPTZ,
  graded_at       TIMESTAMPTZ,
  graded_by       UUID REFERENCES teachers(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, learner_id)
);

CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_learner ON assignment_submissions(learner_id);

-- ─────────────────────────────────────────────
-- MODULE 7 — CONTENT GENERATION
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id    UUID REFERENCES teachers(id) ON DELETE SET NULL,
  doc_type      VARCHAR(20) NOT NULL
                CHECK (doc_type IN ('lesson_plan','lesson_notes','scheme_of_work','progress_record')),
  title         VARCHAR(250) NOT NULL,
  subject       VARCHAR(100) NOT NULL,
  grade         VARCHAR(20) NOT NULL,
  section       VARCHAR(10) DEFAULT 'primary'
                CHECK (section IN ('primary','js')),
  term          INTEGER CHECK (term IN (1,2,3)),
  week          INTEGER CHECK (week BETWEEN 1 AND 14),
  academic_year VARCHAR(10) DEFAULT '2025/2026',
  topic         VARCHAR(200),
  cbc_strands   TEXT[],
  content       JSONB NOT NULL DEFAULT '{}',
  -- content holds the full structured document data
  ai_generated  BOOLEAN DEFAULT false,
  is_approved   BOOLEAN DEFAULT false,
  approved_by   UUID REFERENCES teachers(id),
  approved_at   TIMESTAMPTZ,
  pdf_url       VARCHAR(300),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_school ON documents(school_id);
CREATE INDEX idx_documents_teacher ON documents(teacher_id);
CREATE INDEX idx_documents_type ON documents(doc_type, grade, term);

-- ─────────────────────────────────────────────
-- MODULE 8 — PARENT PORTAL & NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  notif_type    VARCHAR(30) NOT NULL
                CHECK (notif_type IN (
                  'results','attendance','assignment','exam',
                  'term_dates','remediation','general'
                )),
  target_role   VARCHAR(20) DEFAULT 'parent',
  target_grade  VARCHAR(20),
  channel       VARCHAR(20) DEFAULT 'both'
                CHECK (channel IN ('sms','email','whatsapp','both','all')),
  sent_by       UUID REFERENCES teachers(id),
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Per-parent delivery receipts
CREATE TABLE IF NOT EXISTS notification_receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  learner_id      UUID REFERENCES learners(id) ON DELETE CASCADE,
  parent_name     VARCHAR(150),
  parent_phone    VARCHAR(20),
  parent_email    VARCHAR(150),
  channel         VARCHAR(15),
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','delivered','failed','read')),
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  error_message   VARCHAR(300),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_notification ON notification_receipts(notification_id);
CREATE INDEX idx_receipts_learner ON notification_receipts(learner_id);

-- ─────────────────────────────────────────────
-- AUDIT LOG (tracks all important actions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  table_name  VARCHAR(50),
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_school ON audit_log(school_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ─────────────────────────────────────────────
-- TRIGGER: auto-update updated_at timestamps
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'teachers','learners','scores','report_forms',
    'assignments','assignment_submissions','documents'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- VIEW: learner summary (used by dashboard)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW learner_summary AS
SELECT
  l.id,
  l.school_id,
  l.admission_no,
  l.first_name || ' ' || l.last_name AS full_name,
  l.grade,
  l.stream,
  l.section,
  l.status,
  l.parent_name,
  l.parent_phone,
  l.parent_email,
  c.class_teacher_id,
  t.first_name || ' ' || t.last_name AS class_teacher_name
FROM learners l
LEFT JOIN classes c ON c.id = l.class_id
LEFT JOIN teachers t ON t.id = c.class_teacher_id;

-- ─────────────────────────────────────────────
-- VIEW: exam score summary per learner per exam
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW score_summary AS
SELECT
  s.learner_id,
  s.exam_id,
  s.school_id,
  e.term,
  e.academic_year,
  e.exam_type,
  e.grade,
  COUNT(s.id) AS subjects_entered,
  ROUND(AVG(s.score), 1) AS mean_score,
  MAX(s.score) AS highest,
  MIN(s.score) AS lowest
FROM scores s
JOIN exams e ON e.id = s.exam_id
GROUP BY s.learner_id, s.exam_id, s.school_id,
         e.term, e.academic_year, e.exam_type, e.grade;

COMMENT ON TABLE schools IS 'Multi-school support — each school has its own data partition';
COMMENT ON TABLE learners IS 'All learners PP1–Grade 9, linked to classes and parents';
COMMENT ON TABLE scores IS 'Individual subject scores per learner per exam — CBC grading computed server-side';
COMMENT ON TABLE documents IS 'AI-generated and manually created teaching documents — content stored as JSONB';
