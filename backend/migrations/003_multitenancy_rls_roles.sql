-- ============================================================
-- EduCore CBC School Management Platform
-- Migration 003 — Multi-tenancy, RLS, Role Hierarchy
-- Adds:
--   · Director of Studies / Dean role
--   · EduCore super-admin role (cross-school)
--   · Row Level Security on all tenant tables
--   · School self-registration support
--   · Role permissions matrix table
--   · Tenant isolation enforcement
-- Run AFTER 001 and 002
-- ============================================================

-- ─────────────────────────────────────────────
-- STEP 1: EXTEND ROLE DEFINITIONS
-- Full 8-level hierarchy
-- ─────────────────────────────────────────────

-- Drop old role check and replace with full hierarchy
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'super_admin',        -- Level 0: EduCore platform staff (cross-school)
    'admin',              -- Level 1: School principal / school admin
    'director_of_studies',-- Level 2: Director of Studies / Dean (NEW)
    'deputy',             -- Level 3: Deputy principal
    'hod',                -- Level 4: Head of department
    'class_teacher',      -- Level 5: Class / homeroom teacher
    'subject_teacher',    -- Level 6: Subject teacher
    'parent'              -- Level 7: Parent / guardian
  ));

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_role_check;
ALTER TABLE teachers ADD CONSTRAINT teachers_role_check
  CHECK (role IN (
    'admin',
    'director_of_studies',
    'deputy',
    'hod',
    'class_teacher',
    'subject_teacher'
  ));

-- ─────────────────────────────────────────────
-- STEP 2: ROLE PERMISSIONS MATRIX TABLE
-- Single source of truth for what each role
-- can do — checked by API middleware
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        TEXT NOT NULL,
  permission  TEXT NOT NULL,
  -- Permission keys:
  -- view_all_learners, manage_learners,
  -- enter_scores, view_all_results,
  -- generate_reports, approve_reports,
  -- manage_teachers, manage_roles,
  -- mark_attendance, post_assignments,
  -- generate_content, approve_content,
  -- access_parent_portal, send_notifications,
  -- view_payments, manage_payments,
  -- view_analytics, cross_school_access,
  -- manage_school_settings, system_admin
  is_allowed  BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- Insert full permissions matrix
INSERT INTO role_permissions (role, permission, is_allowed) VALUES
-- ── super_admin: everything ──────────────────
('super_admin', 'view_all_learners',       true),
('super_admin', 'manage_learners',         true),
('super_admin', 'enter_scores',            true),
('super_admin', 'view_all_results',        true),
('super_admin', 'generate_reports',        true),
('super_admin', 'approve_reports',         true),
('super_admin', 'manage_teachers',         true),
('super_admin', 'manage_roles',            true),
('super_admin', 'mark_attendance',         true),
('super_admin', 'post_assignments',        true),
('super_admin', 'generate_content',        true),
('super_admin', 'approve_content',         true),
('super_admin', 'access_parent_portal',    true),
('super_admin', 'send_notifications',      true),
('super_admin', 'view_payments',           true),
('super_admin', 'manage_payments',         true),
('super_admin', 'view_analytics',          true),
('super_admin', 'cross_school_access',     true),
('super_admin', 'manage_school_settings',  true),
('super_admin', 'system_admin',            true),

-- ── admin (Principal): full school access ───
('admin', 'view_all_learners',       true),
('admin', 'manage_learners',         true),
('admin', 'enter_scores',            true),
('admin', 'view_all_results',        true),
('admin', 'generate_reports',        true),
('admin', 'approve_reports',         true),
('admin', 'manage_teachers',         true),
('admin', 'manage_roles',            true),
('admin', 'mark_attendance',         true),
('admin', 'post_assignments',        true),
('admin', 'generate_content',        true),
('admin', 'approve_content',         true),
('admin', 'access_parent_portal',    true),
('admin', 'send_notifications',      true),
('admin', 'view_payments',           true),
('admin', 'manage_payments',         true),
('admin', 'view_analytics',          true),
('admin', 'cross_school_access',     false),  -- cannot see other schools
('admin', 'manage_school_settings',  true),
('admin', 'system_admin',            false),

-- ── director_of_studies: full academic access
('director_of_studies', 'view_all_learners',       true),
('director_of_studies', 'manage_learners',         true),
('director_of_studies', 'enter_scores',            true),
('director_of_studies', 'view_all_results',        true),
('director_of_studies', 'generate_reports',        true),
('director_of_studies', 'approve_reports',         true),  -- can sign off reports
('director_of_studies', 'manage_teachers',         true),  -- can assign subjects/classes
('director_of_studies', 'manage_roles',            false), -- cannot change roles
('director_of_studies', 'mark_attendance',         true),
('director_of_studies', 'post_assignments',        true),
('director_of_studies', 'generate_content',        true),
('director_of_studies', 'approve_content',         true),  -- signs schemes of work
('director_of_studies', 'access_parent_portal',    true),
('director_of_studies', 'send_notifications',      true),
('director_of_studies', 'view_payments',           true),
('director_of_studies', 'manage_payments',         false),
('director_of_studies', 'view_analytics',          true),
('director_of_studies', 'cross_school_access',     false),
('director_of_studies', 'manage_school_settings',  false),
('director_of_studies', 'system_admin',            false),

-- ── deputy: near-full, no billing/roles ─────
('deputy', 'view_all_learners',       true),
('deputy', 'manage_learners',         true),
('deputy', 'enter_scores',            true),
('deputy', 'view_all_results',        true),
('deputy', 'generate_reports',        true),
('deputy', 'approve_reports',         false),
('deputy', 'manage_teachers',         true),
('deputy', 'manage_roles',            false),
('deputy', 'mark_attendance',         true),
('deputy', 'post_assignments',        true),
('deputy', 'generate_content',        true),
('deputy', 'approve_content',         false),
('deputy', 'access_parent_portal',    true),
('deputy', 'send_notifications',      true),
('deputy', 'view_payments',           false),
('deputy', 'manage_payments',         false),
('deputy', 'view_analytics',          true),
('deputy', 'cross_school_access',     false),
('deputy', 'manage_school_settings',  false),
('deputy', 'system_admin',            false),

-- ── hod: department-level ───────────────────
('hod', 'view_all_learners',       true),
('hod', 'manage_learners',         false),
('hod', 'enter_scores',            true),
('hod', 'view_all_results',        true),
('hod', 'generate_reports',        false),
('hod', 'approve_reports',         false),
('hod', 'manage_teachers',         false),
('hod', 'manage_roles',            false),
('hod', 'mark_attendance',         false),
('hod', 'post_assignments',        true),
('hod', 'generate_content',        true),
('hod', 'approve_content',         false),
('hod', 'access_parent_portal',    false),
('hod', 'send_notifications',      false),
('hod', 'view_payments',           false),
('hod', 'manage_payments',         false),
('hod', 'view_analytics',          false),
('hod', 'cross_school_access',     false),
('hod', 'manage_school_settings',  false),
('hod', 'system_admin',            false),

-- ── class_teacher: own class only ───────────
('class_teacher', 'view_all_learners',       true),
('class_teacher', 'manage_learners',         true),
('class_teacher', 'enter_scores',            true),
('class_teacher', 'view_all_results',        false),
('class_teacher', 'generate_reports',        true),
('class_teacher', 'approve_reports',         false),
('class_teacher', 'manage_teachers',         false),
('class_teacher', 'manage_roles',            false),
('class_teacher', 'mark_attendance',         true),
('class_teacher', 'post_assignments',        true),
('class_teacher', 'generate_content',        true),
('class_teacher', 'approve_content',         false),
('class_teacher', 'access_parent_portal',    false),
('class_teacher', 'send_notifications',      false),
('class_teacher', 'view_payments',           false),
('class_teacher', 'manage_payments',         false),
('class_teacher', 'view_analytics',          false),
('class_teacher', 'cross_school_access',     false),
('class_teacher', 'manage_school_settings',  false),
('class_teacher', 'system_admin',            false),

-- ── subject_teacher: own subjects only ──────
('subject_teacher', 'view_all_learners',      false),
('subject_teacher', 'manage_learners',        false),
('subject_teacher', 'enter_scores',           true),
('subject_teacher', 'view_all_results',       false),
('subject_teacher', 'generate_reports',       false),
('subject_teacher', 'approve_reports',        false),
('subject_teacher', 'manage_teachers',        false),
('subject_teacher', 'manage_roles',           false),
('subject_teacher', 'mark_attendance',        true),
('subject_teacher', 'post_assignments',       true),
('subject_teacher', 'generate_content',       true),
('subject_teacher', 'approve_content',        false),
('subject_teacher', 'access_parent_portal',   false),
('subject_teacher', 'send_notifications',     false),
('subject_teacher', 'view_payments',          false),
('subject_teacher', 'manage_payments',        false),
('subject_teacher', 'view_analytics',         false),
('subject_teacher', 'cross_school_access',    false),
('subject_teacher', 'manage_school_settings', false),
('subject_teacher', 'system_admin',           false),

-- ── parent: own child only ───────────────────
('parent', 'view_all_learners',      false),
('parent', 'manage_learners',        false),
('parent', 'enter_scores',           false),
('parent', 'view_all_results',       false),
('parent', 'generate_reports',       false),
('parent', 'approve_reports',        false),
('parent', 'manage_teachers',        false),
('parent', 'manage_roles',           false),
('parent', 'mark_attendance',        false),
('parent', 'post_assignments',       false),
('parent', 'generate_content',       false),
('parent', 'approve_content',        false),
('parent', 'access_parent_portal',   true),
('parent', 'send_notifications',     false),
('parent', 'view_payments',          false),
('parent', 'manage_payments',        false),
('parent', 'view_analytics',         false),
('parent', 'cross_school_access',    false),
('parent', 'manage_school_settings', false),
('parent', 'system_admin',           false)

ON CONFLICT (role, permission) DO UPDATE SET is_allowed = EXCLUDED.is_allowed;

-- ─────────────────────────────────────────────
-- STEP 3: HELPER FUNCTION — check permission
-- Used by API: SELECT check_permission('admin','approve_reports')
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_permission(
  p_role       TEXT,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_allowed FROM role_permissions
     WHERE role = p_role AND permission = p_permission),
    false
  );
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────
-- STEP 4: SCHOOL REGISTRATION TABLE
-- Tracks self-signup flow for new schools
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_registrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name     TEXT NOT NULL,
  subdomain       TEXT UNIQUE NOT NULL,
  county          TEXT,
  level           TEXT DEFAULT 'primary_and_js',
  contact_name    TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  -- hashed temp password for first login
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','active')),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  school_id       UUID REFERENCES schools(id),
  -- filled once approved and school record created
  mpesa_till      TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_status ON school_registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_email  ON school_registrations(contact_email);

-- ─────────────────────────────────────────────
-- STEP 5: APPROVE SCHOOL REGISTRATION FUNCTION
-- Called by super_admin to activate a school
-- Creates school record + first admin user
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_school_registration(
  p_registration_id UUID,
  p_approved_by     UUID
) RETURNS TABLE(
  school_id   UUID,
  admin_email TEXT,
  subdomain   TEXT
) AS $$
DECLARE
  v_reg   school_registrations%ROWTYPE;
  v_school_id UUID := uuid_generate_v4();
  v_user_id   UUID := uuid_generate_v4();
BEGIN
  SELECT * INTO v_reg FROM school_registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF v_reg.status != 'pending' THEN RAISE EXCEPTION 'Registration already processed'; END IF;

  -- Create school
  INSERT INTO schools (id, name, subdomain, county, level, subscription_tier)
  VALUES (v_school_id, v_reg.school_name, v_reg.subdomain,
          v_reg.county, v_reg.level, v_reg.subscription_tier);

  -- Create admin user (principal)
  INSERT INTO users (id, school_id, email, password_hash, role, full_name, phone)
  VALUES (v_user_id, v_school_id, v_reg.contact_email,
          v_reg.password_hash, 'admin',
          v_reg.contact_name, v_reg.contact_phone);

  -- Seed CBC subjects for this school
  PERFORM seed_cbc_subjects(v_school_id);

  -- Create free subscription
  INSERT INTO school_subscriptions (school_id, plan, valid_from, is_active)
  VALUES (v_school_id, 'free', CURRENT_DATE, true);

  -- Update registration record
  UPDATE school_registrations SET
    status = 'active',
    approved_by = p_approved_by,
    approved_at = NOW(),
    school_id = v_school_id
  WHERE id = p_registration_id;

  RETURN QUERY SELECT v_school_id, v_reg.contact_email, v_reg.subdomain;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- STEP 6: ROW LEVEL SECURITY (RLS)
-- The tenant wall — enforced at DB level
-- Even a buggy API cannot leak cross-school data
-- ─────────────────────────────────────────────

-- Enable RLS on all tenant tables
ALTER TABLE learners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_strands      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE results_analysis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_forms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_dates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes_of_work      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ──────────────────────────────
-- Pattern: users see only rows where
-- school_id = their own school_id (from JWT claim)
-- super_admin bypasses all policies

-- Supabase JWT claim: auth.jwt() -> school_id
-- We expose school_id as a custom claim in the JWT

-- Create a helper to extract school_id from JWT
CREATE OR REPLACE FUNCTION current_school_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'school_id',
    ''
  )::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'super_admin';
$$ LANGUAGE sql STABLE;

-- ── MACRO: create standard tenant policy on a table
-- Every table gets two policies:
--   1. SELECT/INSERT/UPDATE/DELETE for own school
--   2. ALL for super_admin

DO $policies$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'learners','teachers','classes','learner_strands',
    'exams','scores','exam_submissions','results_analysis',
    'report_forms','term_dates','attendance',
    'assignments','assignment_submissions','documents',
    'subjects','schemes_of_work','competency_scores',
    'payments','notifications','notification_receipts',
    'audit_log'
  ]
  LOOP
    -- Drop existing policies first (safe re-run)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS super_admin_access ON %I', tbl);

    -- Policy 1: School staff see only their school
    EXECUTE format($pol$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL
      USING (
        school_id = current_school_id()
        OR is_super_admin()
      )
      WITH CHECK (
        school_id = current_school_id()
        OR is_super_admin()
      )
    $pol$, tbl);

    RAISE NOTICE 'RLS policy applied to table: %', tbl;
  END LOOP;
END;
$policies$;

-- ── Special policy for learner_strands
-- (no direct school_id — must join through learners)
DROP POLICY IF EXISTS tenant_isolation ON learner_strands;
CREATE POLICY tenant_isolation ON learner_strands
FOR ALL
USING (
  is_super_admin()
  OR learner_id IN (
    SELECT id FROM learners WHERE school_id = current_school_id()
  )
);

-- ── Special policy for notification_receipts
-- (no direct school_id — join through learners)
DROP POLICY IF EXISTS tenant_isolation ON notification_receipts;
CREATE POLICY tenant_isolation ON notification_receipts
FOR ALL
USING (
  is_super_admin()
  OR notification_id IN (
    SELECT id FROM notifications WHERE school_id = current_school_id()
  )
);

-- ─────────────────────────────────────────────
-- STEP 7: SUPER ADMIN SCHOOL
-- EduCore platform itself as a school record
-- Seed one super_admin user
-- ─────────────────────────────────────────────
INSERT INTO schools (id, name, subdomain, county, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'EduCore Platform',
  'platform',
  'Nairobi',
  'enterprise'
) ON CONFLICT DO NOTHING;

-- Note: super_admin password set separately via backend env
-- Do NOT hardcode in migration — set via:
-- npm run create-super-admin in backend

-- ─────────────────────────────────────────────
-- STEP 8: MULTI-SCHOOL ANALYTICS VIEW
-- Only accessible to super_admin
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW platform_analytics AS
SELECT
  s.id          AS school_id,
  s.name        AS school_name,
  s.subdomain,
  s.subscription_tier,
  ss.plan,
  ss.valid_until,
  COUNT(DISTINCT l.id)   AS total_learners,
  COUNT(DISTINCT t.id)   AS total_teachers,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'parent') AS parent_accounts,
  MAX(u.last_login)      AS last_activity,
  s.created_at           AS joined_date
FROM schools s
LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.is_active = true
LEFT JOIN learners l  ON l.school_id = s.id
LEFT JOIN teachers t  ON t.school_id = s.id
LEFT JOIN users u     ON u.school_id = s.id
WHERE s.id != '00000000-0000-0000-0000-000000000001'
GROUP BY s.id, s.name, s.subdomain, s.subscription_tier,
         ss.plan, ss.valid_until, s.created_at
ORDER BY total_learners DESC;

COMMENT ON VIEW platform_analytics IS
  'Cross-school analytics — super_admin only — shows all schools on platform';

-- ─────────────────────────────────────────────
-- STEP 9: DOCUMENT SIGNATURE HIERARCHY
-- Reports and documents auto-signed based on role
-- director_of_studies signs academic docs
-- admin signs report forms
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signatures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  signer_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
  signer_role     TEXT NOT NULL,
  signature_label TEXT NOT NULL,
  -- e.g. 'Director of Studies', 'Principal', 'Class Teacher'
  signed_at       TIMESTAMPTZ DEFAULT NOW(),
  is_valid        BOOLEAN DEFAULT true,
  UNIQUE(document_id, signer_role)
);

CREATE TABLE IF NOT EXISTS report_signatures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  report_id       UUID REFERENCES report_forms(id) ON DELETE CASCADE,
  signer_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
  signer_role     TEXT NOT NULL,
  signature_label TEXT NOT NULL,
  tsc_number      TEXT,
  signed_at       TIMESTAMPTZ DEFAULT NOW(),
  is_valid        BOOLEAN DEFAULT true,
  UNIQUE(report_id, signer_role)
);

-- ─────────────────────────────────────────────
-- STEP 10: UPDATED ROLE LABELS IN TEACHERS
-- and a helper view for the frontend
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW teacher_profiles AS
SELECT
  t.*,
  u.email,
  u.last_login,
  u.is_active,
  CASE t.role
    WHEN 'admin'               THEN 'Principal'
    WHEN 'director_of_studies' THEN 'Director of Studies'
    WHEN 'deputy'              THEN 'Deputy Principal'
    WHEN 'hod'                 THEN 'Head of Department'
    WHEN 'class_teacher'       THEN 'Class Teacher'
    WHEN 'subject_teacher'     THEN 'Subject Teacher'
    ELSE t.role
  END AS role_label,
  CASE t.role
    WHEN 'admin'               THEN 1
    WHEN 'director_of_studies' THEN 2
    WHEN 'deputy'              THEN 3
    WHEN 'hod'                 THEN 4
    WHEN 'class_teacher'       THEN 5
    WHEN 'subject_teacher'     THEN 6
  END AS role_level
FROM teachers t
LEFT JOIN users u ON u.id = t.user_id
ORDER BY role_level, t.last_name;

COMMENT ON VIEW teacher_profiles IS
  'Teacher records with human-readable role labels and sort order';

-- ─────────────────────────────────────────────
-- FINAL: Updated trigger for new tables
-- ─────────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['school_registrations']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;', t
    );
  END LOOP;
END $$;

COMMENT ON TABLE role_permissions     IS 'Authoritative permissions matrix — 8 roles × 20 permissions';
COMMENT ON TABLE school_registrations IS 'Self-signup queue — super_admin approves to activate school';
COMMENT ON TABLE document_signatures  IS 'Auto-applied signatures on content docs — role-based';
COMMENT ON TABLE report_signatures    IS 'Auto-applied signatures on report forms — role-based';
COMMENT ON FUNCTION approve_school_registration IS
  'Activates a pending school — creates school record, admin user, seeds CBC subjects, and free subscription';
COMMENT ON FUNCTION check_permission  IS
  'Returns true/false for role+permission — used by API middleware';
