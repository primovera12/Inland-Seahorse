-- Diagnostic script to check Cedar Rapids data
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check all makes that look like Cedar Rapids
SELECT id, name, created_at
FROM makes
WHERE LOWER(name) LIKE '%cedar%' OR LOWER(name) LIKE '%cr%'
ORDER BY created_at;

-- 2. Count models per Cedar Rapids make
SELECT m.id as make_id, m.name as make_name, COUNT(mo.id) as model_count
FROM makes m
LEFT JOIN models mo ON mo.make_id = m.id
WHERE LOWER(m.name) LIKE '%cedar%' OR m.name = 'CR' OR m.name LIKE 'CR%'
GROUP BY m.id, m.name
ORDER BY m.name;

-- 3. List all models for any Cedar Rapids related make
SELECT m.name as make, mo.name as model, mo.id as model_id
FROM makes m
JOIN models mo ON mo.make_id = m.id
WHERE LOWER(m.name) LIKE '%cedar%' OR m.name LIKE 'CR%'
ORDER BY m.name, mo.name;

-- 4. Check if CR552 exists and which make it belongs to
SELECT m.name as make, mo.name as model, mo.id as model_id, m.id as make_id
FROM models mo
JOIN makes m ON mo.make_id = m.id
WHERE mo.name LIKE '%CR552%' OR mo.name LIKE '%552%';
