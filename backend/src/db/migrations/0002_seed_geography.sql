-- Minimal seed data so the app is usable immediately after migrating —
-- covers exactly what the frontend mock data references. PSGC codes are
-- left NULL here (not fabricated); fill them in from the official PSGC
-- publication before relying on psgc_code for anything.

INSERT INTO regional_offices (code, name) VALUES
  ('NCR', 'NCR')
ON CONFLICT (code) DO NOTHING;

INSERT INTO field_offices (code, regional_office_code, name) VALUES
  ('3', 'NCR', 'Manila')
ON CONFLICT (code) DO NOTHING;

INSERT INTO regions (name) VALUES
  ('Region II (Cagayan Valley)'),
  ('NCR'),
  ('Region IV-A (CALABARZON)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO provinces (region_id, name)
SELECT r.id, p.name
FROM (VALUES
  ('Isabela', 'Region II (Cagayan Valley)'),
  ('Cagayan', 'Region II (Cagayan Valley)'),
  ('Nueva Vizcaya', 'Region II (Cagayan Valley)')
) AS p(name, region_name)
JOIN regions r ON r.name = p.region_name
ON CONFLICT (region_id, name) DO NOTHING;

INSERT INTO cities_municipalities (province_id, name)
SELECT pr.id, c.name
FROM (VALUES
  ('Ilagan City', 'Isabela'),
  ('Cauayan City', 'Isabela')
) AS c(name, province_name)
JOIN provinces pr ON pr.name = c.province_name
ON CONFLICT (province_id, name) DO NOTHING;

INSERT INTO barangays (city_id, name)
SELECT ci.id, b.name
FROM (VALUES
  ('San Isidro', 'Ilagan City'),
  ('Sto. Domingo', 'Ilagan City')
) AS b(name, city_name)
JOIN cities_municipalities ci ON ci.name = b.city_name
ON CONFLICT (city_id, name) DO NOTHING;
