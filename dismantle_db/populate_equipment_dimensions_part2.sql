-- ============================================================
-- POPULATE EQUIPMENT DIMENSIONS TABLE - PART 2
-- ============================================================
-- Additional equipment specifications researched from manufacturer sources
-- ============================================================

-- ============================================================
-- NEW HOLLAND EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 3750, 3500, 12.33, 4.17, 7.33, 17.4, 0.05, 9.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E17'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5730, 5400, 14.25, 4.75, 7.67, 20.4, 0.07, 11.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E26'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7720, 7300, 15.50, 5.25, 7.92, 24.8, 0.10, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E35'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11000, 10500, 18.00, 6.17, 8.33, 37.4, 0.16, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E50'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 16500, 15700, 20.50, 7.50, 8.75, 55.0, 0.26, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E75'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18500, 17600, 21.50, 7.75, 9.00, 60.3, 0.31, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E80'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 29000, 27500, 26.50, 8.83, 9.50, 98, 0.65, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E130'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48900, 46500, 31.14, 9.19, 9.75, 148, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E215'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 54000, 51500, 31.17, 8.20, 10.09, 163, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E245'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 69577, 66300, 33.86, 9.81, 10.40, 201, 2.09, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E305'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- NEW HOLLAND BACKHOES
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 17200, 16300, 22.75, 7.17, 10.50, 87
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'B90B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 18500, 17500, 23.25, 7.33, 10.75, 95
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'B95B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 19200, 18200, 23.50, 7.42, 10.92, 97
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'B95C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 20500, 19500, 24.00, 7.50, 11.17, 107
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'B110B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 21500, 20400, 24.33, 7.58, 11.33, 115
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'B115B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- NEW HOLLAND SKID STEERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 6200, 5900, 10.58, 5.42, 6.50, 60, 0.39
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'L218'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 6800, 6500, 10.92, 5.58, 6.67, 68, 0.44
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'L220'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8400, 8000, 11.42, 6.00, 6.83, 84, 0.54
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'L230'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 7400, 7100, 11.08, 5.75, 6.75, 67, 0.46
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'C227'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8800, 8400, 11.58, 6.08, 6.83, 84, 0.54
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'C232'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 9600, 9200, 11.92, 6.17, 6.92, 90, 0.59
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'C238'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- YANMAR EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 1870, 1750, 9.50, 3.08, 6.75, 10.1, 0.02, 7.9
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'SV08'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 3750, 3500, 12.17, 4.08, 7.25, 14.8, 0.04, 9.1
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'SV17'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5730, 5400, 14.00, 4.67, 7.58, 18.6, 0.06, 9.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'SV26'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7882, 7500, 15.25, 5.08, 7.92, 24.4, 0.09, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'VIO35'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11850, 11200, 18.50, 6.17, 8.25, 42.7, 0.18, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'VIO55'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17640, 16800, 21.00, 7.42, 8.67, 65.2, 0.28, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Yanmar' AND m.name = 'VIO80'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- CASE SKID STEERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 6400, 6100, 10.67, 5.50, 6.42, 60, 0.39
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'SV185'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 7200, 6900, 11.00, 5.75, 6.58, 67, 0.46
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'SV250'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8200, 7800, 11.33, 6.00, 6.75, 74, 0.52
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'SV280'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8800, 8400, 11.58, 6.17, 6.83, 82, 0.57
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'SV300'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 9500, 9100, 11.92, 6.33, 6.92, 90, 0.65
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'SV340'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 9200, 8800, 11.75, 6.25, 6.83, 74, 0.52
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'TR270'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 10200, 9700, 12.00, 6.42, 6.92, 84, 0.57
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'TR310'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 11000, 10500, 12.25, 6.58, 7.00, 90, 0.65
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'TR340'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- KUBOTA SKID STEERS / TRACK LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 6180, 5900, 10.50, 5.42, 6.33, 64.4, 0.39
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'SSV65'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 7050, 6700, 10.83, 5.67, 6.50, 74.3, 0.46
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'SSV75'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8420, 8000, 11.17, 5.50, 6.67, 68, 0.44
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'SVL65'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 9678, 9200, 12.17, 5.50, 6.83, 74.3, 0.52
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'SVL75'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 10200, 9700, 12.50, 5.83, 6.92, 96.4, 0.59
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'SVL95'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- VOLVO WHEEL LOADERS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 22050, 21000, 22.50, 8.00, 11.00, 145, 2.75
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L60'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 25350, 24200, 23.50, 8.17, 11.25, 168, 3.14
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L70'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 33070, 31500, 25.50, 8.50, 11.50, 205, 3.59
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L110'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 56610, 54000, 29.17, 9.67, 11.67, 304, 5.23
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L150'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 62766, 60000, 30.50, 9.71, 11.75, 340, 5.88
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L180'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 72313, 69000, 32.00, 10.25, 12.17, 380, 6.54
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L220'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 119050, 114000, 39.33, 12.00, 13.83, 540, 9.80
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L350'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- KOMATSU WHEEL LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 35775, 34000, 25.98, 8.53, 10.53, 162, 3.60
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'WA320'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 39350, 37500, 26.83, 8.67, 10.75, 188, 4.20
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'WA380'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 48500, 46200, 27.33, 9.42, 11.58, 260, 5.50
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'WA470'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 60600, 57800, 29.50, 10.00, 12.17, 315, 6.50
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'WA500'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- HITACHI EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18290, 17400, 22.42, 7.42, 8.42, 55, 0.37, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX85'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30200, 28700, 26.00, 8.50, 9.25, 98, 0.65, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX135'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48500, 46200, 31.69, 9.38, 9.91, 158, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX210'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 77160, 73500, 36.08, 10.83, 11.17, 270, 1.96, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX350'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 108000, 103000, 40.17, 11.67, 12.33, 359, 2.75, 31.5
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX490'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- BOBCAT MINI EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7699, 7300, 15.83, 5.75, 7.17, 24.8, 0.10, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E35'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11300, 10750, 19.17, 6.50, 8.33, 49.8, 0.18, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E50'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18960, 18000, 22.50, 7.67, 8.92, 65.6, 0.31, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E85'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- CATERPILLAR COMPACT TRACK LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8846, 8400, 11.92, 5.75, 6.67, 72.7, 0.46
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '259D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 10718, 10200, 12.50, 6.50, 6.91, 98, 0.59
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '299D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- CATERPILLAR MINI EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7783, 7400, 15.42, 5.67, 8.17, 26.1, 0.07, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '303'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 22050, 21000, 23.33, 7.67, 9.17, 72.7, 0.37, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '310'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- KOMATSU EXCAVATORS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 32627, 31000, 24.25, 8.50, 9.33, 93, 0.52, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC138'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 42000, 40000, 28.33, 8.17, 10.25, 121, 0.78, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC170'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 54490, 51900, 32.42, 11.08, 10.42, 177, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC240'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 64000, 61000, 34.17, 11.17, 10.83, 205, 1.70, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC290'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT '=== EQUIPMENT DIMENSIONS PART 2 COMPLETE ===' as status;

SELECT 'Total dimensions records after Part 2:' as info;
SELECT COUNT(*) as total_records FROM equipment_dimensions;

SELECT 'Dimensions by make (updated):' as info;
SELECT
  mk.name as make,
  COUNT(*) as dimension_count
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
GROUP BY mk.name
ORDER BY dimension_count DESC;

SELECT 'New records added in Part 2:' as info;
SELECT
  mk.name as make,
  m.name as model,
  ed.operating_weight,
  ed.transport_length,
  ed.transport_width,
  ed.transport_height
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
WHERE mk.name IN ('New Holland', 'Yanmar', 'Kubota', 'Volvo', 'Hitachi')
ORDER BY mk.name, m.name
LIMIT 30;
