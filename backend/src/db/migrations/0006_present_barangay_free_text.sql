-- The source workbook has no barangay master list anywhere (no tab, no
-- Codes-sheet column) — there are ~42,000 nationwide, and DOLE's real form
-- takes Barangay as free text, not a validated dropdown (confirmed by the
-- "Database" tab's real historical rows). Our barangays lookup table only
-- ever had a handful of rows seeded for demo/sample data, which can't
-- support a real cascading Region->Province->City->Barangay select without
-- breaking encoding for almost every real municipality.
--
-- Add a free-text column for the present address's barangay and backfill it
-- from whatever's currently linked via present_barangay_id, so existing
-- profiles keep showing the same value. present_barangay_id itself is left
-- in place (not dropped) — birth/employer barangay FK columns are untouched
-- entirely, since the live form doesn't expose those sections yet.
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS present_barangay_text TEXT;

UPDATE child_profiles cp
SET present_barangay_text = b.name
FROM barangays b
WHERE cp.present_barangay_id = b.id
  AND cp.present_barangay_text IS NULL;
