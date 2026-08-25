-- Core schema for the Child Labor Profiling encode system.
-- Geography is normalized into lookup tables (region -> province -> city -> barangay)
-- instead of the source spreadsheet's wide column-per-region layout — see
-- .claude/rules/backend-conventions.md for why.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'encoder' CHECK (role IN ('encoder', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regions (
  id BIGSERIAL PRIMARY KEY,
  psgc_code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS provinces (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id),
  psgc_code TEXT UNIQUE,
  name TEXT NOT NULL,
  UNIQUE (region_id, name)
);
CREATE INDEX IF NOT EXISTS idx_provinces_region ON provinces(region_id);

CREATE TABLE IF NOT EXISTS cities_municipalities (
  id BIGSERIAL PRIMARY KEY,
  province_id BIGINT NOT NULL REFERENCES provinces(id),
  psgc_code TEXT UNIQUE,
  name TEXT NOT NULL,
  UNIQUE (province_id, name)
);
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities_municipalities(province_id);

CREATE TABLE IF NOT EXISTS barangays (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities_municipalities(id),
  psgc_code TEXT UNIQUE,
  name TEXT NOT NULL,
  UNIQUE (city_id, name)
);
CREATE INDEX IF NOT EXISTS idx_barangays_city ON barangays(city_id);

-- Replaces the source sheet's "Codes" tab VLOOKUP (Regional/Field Office -> code).
CREATE TABLE IF NOT EXISTS regional_offices (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_offices (
  code TEXT PRIMARY KEY,
  regional_office_code TEXT NOT NULL REFERENCES regional_offices(code),
  name TEXT NOT NULL
);

-- One row per child. Sections A-A3 plus the 4Ps intro to Section B are flat
-- columns; multi-select "check all that apply" questions are JSONB arrays
-- (dropout_reasons, disability_types, ailments, family_ailments, hazards,
-- earnings_use) since they're stored/displayed as a set, never queried
-- relationally. Repeating sub-tables (family members, services) are separate
-- tables below.
CREATE TABLE IF NOT EXISTS child_profiles (
  id BIGSERIAL PRIMARY KEY,
  control_no TEXT UNIQUE,
  child_id_no TEXT,
  year INTEGER NOT NULL,
  regional_office_code TEXT NOT NULL REFERENCES regional_offices(code),
  field_office_code TEXT NOT NULL REFERENCES field_offices(code),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'complete')),

  -- Section A: personal information
  last_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  suffix TEXT,
  present_region_id BIGINT REFERENCES regions(id),
  present_province_id BIGINT REFERENCES provinces(id),
  present_city_id BIGINT REFERENCES cities_municipalities(id),
  present_barangay_id BIGINT REFERENCES barangays(id),
  present_sitio TEXT,
  present_phone TEXT,
  sex TEXT CHECK (sex IN ('Male', 'Female')),
  date_of_birth DATE,
  birth_certificate BOOLEAN,
  birth_region_id BIGINT REFERENCES regions(id),
  birth_province_id BIGINT REFERENCES provinces(id),
  birth_city_id BIGINT REFERENCES cities_municipalities(id),
  birth_barangay_id BIGINT REFERENCES barangays(id),
  birth_sitio TEXT,
  religion TEXT,
  indigenous_group BOOLEAN,
  living_with TEXT,
  dwelling_material TEXT,

  -- Section A1: educational background
  ever_attended_school BOOLEAN,
  attending_now BOOLEAN,
  highest_grade TEXT,
  form_of_education TEXT,
  age_stopped_schooling SMALLINT,
  dropout_reasons JSONB NOT NULL DEFAULT '[]',

  -- Section A2: health information
  has_disability BOOLEAN,
  disability_types JSONB NOT NULL DEFAULT '[]',
  disability_assessment TEXT,
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  ailments JSONB NOT NULL DEFAULT '[]',
  medical_assessment TEXT,
  family_ailments JSONB NOT NULL DEFAULT '[]',

  -- Section A3: nature and location of work
  task_performed TEXT,
  employer_name TEXT,
  employer_contact TEXT,
  employer_region_id BIGINT REFERENCES regions(id),
  employer_province_id BIGINT REFERENCES provinces(id),
  employer_city_id BIGINT REFERENCES cities_municipalities(id),
  employer_barangay_id BIGINT REFERENCES barangays(id),
  employer_sitio TEXT,
  work_arrangement TEXT,
  hours_per_day NUMERIC(4, 1),
  days_per_week SMALLINT,
  work_start_time TIME,
  work_end_time TIME,
  age_started_working SMALLINT,
  hazards JSONB NOT NULL DEFAULT '[]',
  payment_basis TEXT,
  monthly_income NUMERIC(10, 2),
  earnings_use JSONB NOT NULL DEFAULT '[]',
  adult_supervises BOOLEAN,
  work_supervisor TEXT,

  -- Section B intro: 4Ps membership (the repeating family-member rows are
  -- in family_members below)
  is_4ps BOOLEAN,
  household_id_number TEXT,

  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_status ON child_profiles(status);
CREATE INDEX IF NOT EXISTS idx_child_profiles_name ON child_profiles(last_name, first_name);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_child_profiles_updated_at ON child_profiles;
CREATE TRIGGER trg_child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Section B: household members (repeating rows)
CREATE TABLE IF NOT EXISTS family_members (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  name TEXT,
  relationship TEXT,
  sex TEXT,
  age SMALLINT,
  civil_status TEXT,
  is_solo_parent BOOLEAN,
  highest_education TEXT,
  occupation TEXT,
  monthly_income NUMERIC(10, 2),
  skills TEXT,
  whereabouts TEXT,
  disability_ailment TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_family_members_profile ON family_members(profile_id);

-- Section C1: services already availed by the family (repeating rows)
CREATE TABLE IF NOT EXISTS services_availed (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  assistance TEXT,
  source TEXT,
  year_availed TEXT,
  availed_by TEXT,
  remarks TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_availed_profile ON services_availed(profile_id);

-- Section C2: services requested for availment (repeating rows)
CREATE TABLE IF NOT EXISTS services_requested (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  assistance TEXT,
  source TEXT,
  period TEXT,
  requested_by TEXT,
  remarks TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_requested_profile ON services_requested(profile_id);
