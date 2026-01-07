import pg from 'pg'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function createTestUser() {
  const email = 'admin@dismantlepro.com'
  const password = 'Admin123!'
  const firstName = 'Admin'
  const lastName = 'User'

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!')

    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [email]
    )

    if (existing.rows.length > 0) {
      console.log(`User ${email} already exists!`)

      // Update to admin role
      await client.query(
        'UPDATE public.users SET role = $1 WHERE id = $2',
        ['admin', existing.rows[0].id]
      )
      console.log('Updated to admin role.')
      return
    }

    // Hash password (Supabase uses bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Insert into auth.users
    await client.query(`
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
      ) VALUES (
        $1,
        '00000000-0000-0000-0000-000000000000',
        $2,
        $3,
        $4,
        $4,
        $4,
        '{"provider": "email", "providers": ["email"]}',
        $5,
        'authenticated',
        'authenticated'
      )
    `, [
      userId,
      email,
      hashedPassword,
      now,
      JSON.stringify({ first_name: firstName, last_name: lastName })
    ])

    console.log(`✓ Created auth user: ${email}`)

    // Insert into public.users (with admin role)
    await client.query(`
      INSERT INTO public.users (id, email, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin'
    `, [userId, email, firstName, lastName])

    console.log(`✓ Created profile with admin role`)

    console.log('\n========================================')
    console.log('TEST USER CREATED!')
    console.log('========================================')
    console.log(`Email:    ${email}`)
    console.log(`Password: ${password}`)
    console.log(`Role:     admin`)
    console.log('========================================')

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

createTestUser()
