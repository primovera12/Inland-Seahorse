import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function diagnose() {
  await client.connect()

  console.log('=== DIAGNOSTIC CHECK ===\n')

  // 1. Check auth schema exists
  console.log('1. Checking auth schema...')
  const authSchema = await client.query(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth'
  `)
  console.log('   Auth schema exists:', authSchema.rows.length > 0)

  // 2. Check auth.users table
  console.log('\n2. Checking auth.users table...')
  const authUsers = await client.query('SELECT COUNT(*) FROM auth.users')
  console.log('   Auth users count:', authUsers.rows[0].count)

  // 3. Check public.users table
  console.log('\n3. Checking public.users table...')
  const publicUsers = await client.query('SELECT COUNT(*) FROM public.users')
  console.log('   Public users count:', publicUsers.rows[0].count)

  // 4. Check RLS on public.users
  console.log('\n4. Checking RLS policies on public.users...')
  const policies = await client.query(`
    SELECT policyname, cmd, permissive FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  `)
  console.log('   Policies:', policies.rows)

  // 5. Check if RLS is enabled
  console.log('\n5. Checking if RLS is enabled on users table...')
  const rlsEnabled = await client.query(`
    SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace
  `)
  console.log('   RLS enabled:', rlsEnabled.rows[0]?.relrowsecurity)

  // 6. Try to simulate what happens during login
  console.log('\n6. Checking auth.users for admin...')
  const adminAuth = await client.query(`
    SELECT id, email, email_confirmed_at, created_at
    FROM auth.users
    WHERE email = 'admin@dismantlepro.com'
  `)
  console.log('   Admin in auth.users:', adminAuth.rows[0] || 'NOT FOUND')

  // 7. Check if there's a trigger syncing auth to public
  console.log('\n7. Checking for user sync trigger...')
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'users' AND event_object_schema = 'auth'
  `)
  console.log('   Triggers on auth.users:', triggers.rows.length > 0 ? triggers.rows : 'NONE')

  // 8. Test if we can select from public.users with service role
  console.log('\n8. Testing public.users query...')
  const testUsers = await client.query('SELECT id, email, role FROM public.users LIMIT 5')
  console.log('   Users in public.users:', testUsers.rows)

  await client.end()
}

diagnose().catch(console.error)
