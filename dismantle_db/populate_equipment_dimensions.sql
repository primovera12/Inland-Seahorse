-- ============================================================
-- POPULATE EQUIPMENT DIMENSIONS TABLE
-- ============================================================
-- This script populates the equipment_dimensions table with
-- specifications researched from manufacturer sources
-- ============================================================

-- Helper function to insert dimensions by make and model name
-- This avoids having to look up UUIDs manually

-- ============================================================
-- CATERPILLAR EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48500, 46000, 31.33, 10.42, 10.08, 160, 1.05, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '320'
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
SELECT m.id, 73500, 70000, 35.75, 11.17, 11.33, 204, 1.76, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '330'
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
SELECT m.id, 11464, 10500, 17.58, 5.75, 8.17, 42.7, 0.13, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '305'
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
SELECT m.id, 18739, 17500, 21.17, 7.67, 8.83, 70.3, 0.37, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '308'
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
SELECT m.id, 100000, 95000, 39.00, 11.83, 12.00, 281, 2.35, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '349'
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
SELECT m.id, 130000, 125000, 42.50, 12.50, 12.67, 367, 3.14, 31.5
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '374'
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
-- KOMATSU EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 45000, 43000, 30.83, 10.33, 10.00, 148, 1.05, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC200'
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
SELECT m.id, 50700, 48000, 31.17, 10.50, 10.33, 165, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC210'
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
SELECT m.id, 52000, 49500, 31.50, 10.50, 10.50, 168, 1.24, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC220'
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
SELECT m.id, 81600, 78000, 35.83, 11.17, 11.17, 270, 2.09, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC360'
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
SELECT m.id, 105800, 101000, 39.17, 11.83, 11.83, 359, 2.75, 31.5
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'PC490'
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
-- CASE EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 51900, 49500, 31.10, 9.81, 10.86, 160, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX210D'
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
SELECT m.id, 55000, 52500, 32.00, 10.00, 11.00, 177, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX245D'
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
SELECT m.id, 66000, 63000, 34.50, 10.50, 11.50, 213, 1.96, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX300D'
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
SELECT m.id, 3800, 3500, 12.50, 4.25, 7.50, 17.4, 0.05, 9.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX17B'
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
SELECT m.id, 36500, 34500, 27.75, 9.17, 9.67, 121, 0.85, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX160D'
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
-- CASE BACKHOES
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 20000, 19000, 23.42, 7.17, 10.83, 97
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '580SN'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 21250, 20200, 24.00, 7.33, 11.00, 110
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '590SN'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- VOLVO EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 47800, 45500, 32.14, 9.81, 10.09, 168, 1.20, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC220'
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
SELECT m.id, 65500, 62500, 34.81, 10.47, 11.52, 235, 1.58, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC300'
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
SELECT m.id, 77000, 73500, 36.50, 10.83, 11.83, 286, 1.96, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC350'
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
SELECT m.id, 105000, 100000, 40.50, 11.83, 12.50, 367, 2.75, 31.5
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC480'
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
-- VOLVO WHEEL LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 28660, 27500, 24.44, 8.33, 12.04, 182, 3.27
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L90'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 38580, 37000, 27.17, 9.33, 12.83, 242, 4.25
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'L120'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- JCB EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 51723, 49500, 31.56, 9.81, 10.50, 173, 1.63, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '220'
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
SELECT m.id, 73700, 70500, 36.75, 10.50, 11.84, 281, 2.09, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '330'
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
-- JCB BACKHOES
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 17500, 16500, 19.00, 7.50, 11.42, 74
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '3CX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 19800, 18800, 20.00, 7.67, 11.58, 91
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '4CX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- KUBOTA EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12400, 11800, 18.11, 6.43, 8.37, 47.6, 0.20, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'KX057'
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
SELECT m.id, 18520, 17500, 21.16, 7.21, 8.33, 66.6, 0.31, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'KX080'
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
SELECT m.id, 8840, 8300, 16.50, 5.92, 8.17, 40.4, 0.13, 13.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'KX040'
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
-- DOOSAN EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 47300, 45000, 31.13, 9.81, 9.84, 166, 1.20, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Doosan' AND m.name = 'DX225'
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
SELECT m.id, 64594, 61500, 34.50, 10.50, 11.17, 197, 1.70, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Doosan' AND m.name = 'DX300'
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
SELECT m.id, 77000, 73500, 36.17, 10.83, 11.50, 271, 2.09, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Doosan' AND m.name = 'DX350'
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
-- HYUNDAI EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 51500, 49000, 31.27, 9.81, 9.84, 168, 1.75, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hyundai' AND m.name = 'R220'
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
SELECT m.id, 69780, 66500, 34.64, 10.50, 10.79, 212, 2.42, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hyundai' AND m.name = 'R300'
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
SELECT m.id, 48750, 46500, 31.00, 9.81, 9.67, 164, 1.53, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hyundai' AND m.name = 'R210'
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
-- KOBELCO EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48500, 46000, 31.50, 10.42, 10.08, 160, 1.05, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kobelco' AND m.name = 'SK210'
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
SELECT m.id, 81800, 78000, 37.06, 10.92, 10.50, 270, 1.83, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kobelco' AND m.name = 'SK350'
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
SELECT m.id, 57200, 54500, 33.17, 10.50, 10.67, 188, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kobelco' AND m.name = 'SK260'
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
-- LIEBHERR EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 46960, 44500, 31.00, 10.17, 10.33, 150, 1.24, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Liebherr' AND m.name = 'R920'
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
SELECT m.id, 66000, 63000, 34.50, 10.50, 11.00, 210, 1.70, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Liebherr' AND m.name = 'R930'
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
SELECT m.id, 97000, 92500, 38.50, 11.17, 11.83, 320, 2.48, 31.5
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Liebherr' AND m.name = 'R950'
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
-- TAKEUCHI EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6607, 6200, 15.25, 4.75, 8.00, 24.8, 0.10, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Takeuchi' AND m.name = 'TB230'
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
SELECT m.id, 12645, 12000, 21.00, 6.58, 8.50, 47.6, 0.22, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Takeuchi' AND m.name = 'TB260'
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
-- BOBCAT SKID STEERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 7395, 7100, 11.83, 6.00, 6.67, 74, 0.54
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S650'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 9105, 8700, 12.17, 6.33, 6.83, 92, 0.65
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S770'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 10325, 9900, 12.50, 6.50, 6.92, 100, 0.72
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S850'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 5765, 5500, 10.75, 5.50, 6.42, 61, 0.44
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S550'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- CATERPILLAR BACKHOES
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 24251, 23000, 23.67, 7.58, 11.75, 93
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '420F'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 24251, 23000, 23.89, 7.61, 11.75, 109
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '430F'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- CATERPILLAR WHEEL LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 28770, 27500, 24.44, 8.33, 12.04, 182, 3.27
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '926M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 36216, 34500, 25.08, 8.83, 10.92, 182, 3.59
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '938M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- CATERPILLAR DOZERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 42263, 40000, 17.75, 8.17, 10.50, 170, 24.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'D5'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 48500, 46000, 18.83, 9.17, 11.08, 215, 26.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'D6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 64000, 61000, 20.50, 10.33, 11.75, 235, 28.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'D7'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 82500, 78500, 23.00, 11.17, 12.33, 310, 30.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'D8'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- JOHN DEERE BACKHOES
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 17751, 16800, 26.17, 7.83, 9.42, 99
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '310SL'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 20043, 19000, 28.00, 7.92, 9.83, 110
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '410L'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- JOHN DEERE EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 79655, 76000, 37.06, 11.14, 11.81, 271, 1.83, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '350G'
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
SELECT m.id, 108952, 104000, 39.40, 10.79, 14.93, 359, 2.48, 35.4
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '470G'
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
-- CEDAR RAPIDS CRUSHERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 101770, 98000, 48.00, 9.92, 13.50, 205
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Cedar Rapids' AND m.name = 'CRJ3042'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 125000, 120000, 52.00, 10.50, 14.00, 250
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Cedar Rapids' AND m.name = 'CRJ3255'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- Add more Cedar Rapids models with estimated dimensions based on size class
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 85000, 82000, 45.00, 9.50, 13.00, 175
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Cedar Rapids' AND m.name = 'CRJ2236'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT '=== EQUIPMENT DIMENSIONS POPULATION COMPLETE ===' as status;

SELECT 'Total dimensions records:' as info;
SELECT COUNT(*) as total_records FROM equipment_dimensions;

SELECT 'Dimensions by make:' as info;
SELECT
  mk.name as make,
  COUNT(*) as dimension_count
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
GROUP BY mk.name
ORDER BY dimension_count DESC;

SELECT 'Sample dimensions data:' as info;
SELECT
  mk.name as make,
  m.name as model,
  ed.operating_weight,
  ed.transport_length,
  ed.transport_width,
  ed.transport_height,
  ed.engine_power_hp
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
ORDER BY mk.name, m.name
LIMIT 25;
