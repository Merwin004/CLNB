-- Geography/office data needed to import the real historical records in the
-- source workbook's "Database" tab (Region IV-B / MIMAROPA, Oriental Mindoro
-- province) — see backend/scripts/import-legacy-database-sheet.mjs. Field
-- office numbering is per-region in DOLE's real scheme (both NCR and R4B
-- have a "Field Office 3"), but field_offices.code is a global PRIMARY KEY,
-- so this region's field office gets a distinct code ('R4B-3') rather than
-- reusing the bare "3" already taken by NCR/Manila — the historical
-- control_no strings keep their original "...-3-..." text either way, since
-- control_no is stored verbatim, not derived from this code at read time.
INSERT INTO regional_offices (code, name) VALUES
  ('R4B', 'Region IV-B (MIMAROPA)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO field_offices (code, regional_office_code, name) VALUES
  ('R4B-3', 'R4B', 'Oriental Mindoro')
ON CONFLICT (code) DO NOTHING;

INSERT INTO regions (name) VALUES
  ('MIMAROPA REGION')
ON CONFLICT (name) DO NOTHING;

INSERT INTO provinces (region_id, name)
SELECT r.id, p.name
FROM (VALUES
  ('ORIENTAL MINDORO', 'MIMAROPA REGION')
) AS p(name, region_name)
JOIN regions r ON r.name = p.region_name
ON CONFLICT (region_id, name) DO NOTHING;

INSERT INTO cities_municipalities (province_id, name)
SELECT pr.id, c.name
FROM (VALUES
  ('NAUJAN', 'ORIENTAL MINDORO'),
  ('BACO', 'ORIENTAL MINDORO'),
  ('PUERTO GALERA', 'ORIENTAL MINDORO'),
  ('POLA', 'ORIENTAL MINDORO')
) AS c(name, province_name)
JOIN provinces pr ON pr.name = c.province_name
ON CONFLICT (province_id, name) DO NOTHING;

INSERT INTO barangays (city_id, name)
SELECT ci.id, b.name
FROM (VALUES
  ('ESTRELLA', 'NAUJAN'),
  ('TIGKAN', 'NAUJAN'),
  ('SAN ANTONIO', 'NAUJAN'),
  ('STA. ROSA I', 'BACO'),
  ('BALATERO', 'PUERTO GALERA'),
  ('DULANGAN', 'PUERTO GALERA'),
  ('STO. NINO', 'PUERTO GALERA'),
  ('SABANG', 'PUERTO GALERA'),
  ('POBLACION', 'PUERTO GALERA'),
  ('PUTTING CACAO', 'POLA')
) AS b(name, city_name)
JOIN cities_municipalities ci ON ci.name = b.city_name
ON CONFLICT (city_id, name) DO NOTHING;
