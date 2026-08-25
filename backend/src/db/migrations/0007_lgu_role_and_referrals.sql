-- Second user role: LGU staff can see children with pending service
-- requests and refer them to DOLE or DSWD — a read-mostly role, distinct
-- from the encoder role that owns creating/editing/importing profiles.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('encoder', 'admin', 'lgu'));

-- One row per referral action. service_requested_id is nullable with
-- ON DELETE SET NULL (not CASCADE) because PATCH /api/profiles/:id wholesale
-- replaces a profile's services_requested rows on every save that touches
-- Section C2 (see profiles.routes.js's replaceRows) — a referral shouldn't
-- vanish just because the encoder re-saved that tab. assistance is a
-- snapshot of what was actually referred, since the live row it pointed to
-- may since have been deleted/replaced.
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  service_requested_id BIGINT REFERENCES services_requested(id) ON DELETE SET NULL,
  assistance TEXT NOT NULL,
  agency TEXT NOT NULL CHECK (agency IN ('DOLE', 'DSWD')),
  referred_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_profile ON referrals(profile_id);
CREATE INDEX IF NOT EXISTS idx_referrals_service_requested ON referrals(service_requested_id);
