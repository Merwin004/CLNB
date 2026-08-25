-- 0002 only seeded San Isidro/Sto. Domingo under Ilagan City. The sample
-- profile records (frontend/src/data/mockFormDataById.js) also reference
-- both barangay names under Cauayan City — add them so resolveGeography()
-- (backend/src/lib/geography.js) can find every (municipality, barangay)
-- pair the seed script needs.
INSERT INTO barangays (city_id, name)
SELECT ci.id, b.name
FROM (VALUES
  ('San Isidro', 'Cauayan City'),
  ('Sto. Domingo', 'Cauayan City')
) AS b(name, city_name)
JOIN cities_municipalities ci ON ci.name = b.city_name
ON CONFLICT (city_id, name) DO NOTHING;
