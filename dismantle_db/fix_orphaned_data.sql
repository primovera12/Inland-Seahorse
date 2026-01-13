-- ============================================================
-- FIX ORPHANED DATA: Companies/Contacts Integrity
-- Run this ONE TIME in your Supabase SQL Editor
-- ============================================================

-- 1. Create "Unassigned" placeholder company (if not exists)
INSERT INTO companies (name, status)
SELECT 'Unassigned', 'inactive'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Unassigned');

-- 2. Update orphaned contacts to point to "Unassigned" company
UPDATE contacts
SET company_id = (SELECT id FROM companies WHERE name = 'Unassigned')
WHERE company_id IS NULL;

-- 3. Create placeholder contacts for companies without any contacts
INSERT INTO contacts (company_id, first_name, role, is_primary)
SELECT c.id, 'Primary Contact', 'general', true
FROM companies c
LEFT JOIN contacts ct ON ct.company_id = c.id
WHERE ct.id IS NULL AND c.name != 'Unassigned';

-- ============================================================
-- VERIFICATION QUERIES (run these to confirm the fix worked)
-- ============================================================

-- Should return 1 row with "Unassigned" company
-- SELECT * FROM companies WHERE name = 'Unassigned';

-- Should return 0 (no orphaned contacts)
-- SELECT COUNT(*) FROM contacts WHERE company_id IS NULL;

-- Should return 0 (no companies without contacts, except Unassigned)
-- SELECT c.id, c.name FROM companies c
-- LEFT JOIN contacts ct ON ct.company_id = c.id
-- WHERE ct.id IS NULL AND c.name != 'Unassigned';
