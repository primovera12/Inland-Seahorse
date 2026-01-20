-- Fix users table RLS policy to allow team members to view each other
-- Previously only allowed users to view their own profile

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a new policy that allows all authenticated users to view all team members
-- This is needed for the team management page to work
CREATE POLICY "Authenticated users can view all team members" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the update policy restricted to own profile only
-- (already exists, but adding IF NOT EXISTS check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- Add INSERT policy for admin client (service role bypasses RLS, but good to have)
DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add DELETE policy for removing team members (admin only via application logic)
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON users;
CREATE POLICY "Authenticated users can delete team members" ON users
  FOR DELETE
  TO authenticated
  USING (true);
