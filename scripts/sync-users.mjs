import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function syncUsers() {
  try {
    await client.connect()
    console.log('Connected!')

    // Get all auth users
    const authUsers = await client.query('SELECT id, email, raw_user_meta_data FROM auth.users')
    console.log(`Found ${authUsers.rows.length} auth users`)

    for (const user of authUsers.rows) {
      // Check if profile exists
      const existing = await client.query('SELECT id FROM public.users WHERE id = $1', [user.id])

      if (existing.rows.length === 0) {
        // Create profile
        const meta = user.raw_user_meta_data || {}
        await client.query(`
          INSERT INTO public.users (id, email, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, 'admin')
        `, [
          user.id,
          user.email,
          meta.first_name || user.email.split('@')[0],
          meta.last_name || ''
        ])
        console.log('✓ Created profile for:', user.email)
      } else {
        // Make sure they're admin
        await client.query('UPDATE public.users SET role = $1 WHERE id = $2', ['admin', user.id])
        console.log('✓ Updated to admin:', user.email)
      }
    }

    // Show all users now
    const users = await client.query('SELECT email, role FROM public.users')
    console.log('\nAll users:')
    users.rows.forEach(u => console.log(`  ${u.email} (${u.role})`))

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

syncUsers()
