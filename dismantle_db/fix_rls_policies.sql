-- Fix RLS policies to allow users to add makes and models from the frontend
-- Run this script ONCE in your Supabase SQL Editor

-- ==========================================
-- MAKES TABLE - Enable insert for anon/authenticated users
-- ==========================================

-- First, check if RLS is enabled
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Allow public read access to makes" ON makes;
DROP POLICY IF EXISTS "Allow public insert access to makes" ON makes;
DROP POLICY IF EXISTS "Allow public update access to makes" ON makes;
DROP POLICY IF EXISTS "Enable read access for all users" ON makes;
DROP POLICY IF EXISTS "Enable insert for all users" ON makes;
DROP POLICY IF EXISTS "Enable update for all users" ON makes;

-- Create policies for makes table
CREATE POLICY "Enable read access for all users" ON makes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON makes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON makes
    FOR UPDATE USING (true);

-- ==========================================
-- MODELS TABLE - Enable insert for anon/authenticated users
-- ==========================================

-- First, check if RLS is enabled
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Allow public read access to models" ON models;
DROP POLICY IF EXISTS "Allow public insert access to models" ON models;
DROP POLICY IF EXISTS "Allow public update access to models" ON models;
DROP POLICY IF EXISTS "Enable read access for all users" ON models;
DROP POLICY IF EXISTS "Enable insert for all users" ON models;
DROP POLICY IF EXISTS "Enable update for all users" ON models;

-- Create policies for models table
CREATE POLICY "Enable read access for all users" ON models
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON models
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON models
    FOR UPDATE USING (true);

-- ==========================================
-- RATES TABLE - Enable insert for anon/authenticated users
-- ==========================================

-- First, check if RLS is enabled
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Allow public read access to rates" ON rates;
DROP POLICY IF EXISTS "Allow public insert access to rates" ON rates;
DROP POLICY IF EXISTS "Allow public update access to rates" ON rates;
DROP POLICY IF EXISTS "Enable read access for all users" ON rates;
DROP POLICY IF EXISTS "Enable insert for all users" ON rates;
DROP POLICY IF EXISTS "Enable update for all users" ON rates;

-- Create policies for rates table
CREATE POLICY "Enable read access for all users" ON rates
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON rates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON rates
    FOR UPDATE USING (true);

-- ==========================================
-- Verify policies are set
-- ==========================================
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('makes', 'models', 'rates')
ORDER BY tablename, policyname;

SELECT 'RLS policies updated! Users can now add makes and models from the frontend.' as status;
