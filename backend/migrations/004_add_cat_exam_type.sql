-- 004_add_cat_exam_type.sql
-- Adds 'cat' as a valid exam_type alongside opener/midterm/end_term.
-- Finds the existing inline CHECK constraint on exams.exam_type dynamically
-- (it was never given an explicit name in 001_initial_schema.sql) and replaces it.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'exams'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%exam_type%';

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE exams DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE exams
  ADD CONSTRAINT exams_exam_type_check
  CHECK (exam_type IN ('cat', 'opener', 'midterm', 'end_term'));
