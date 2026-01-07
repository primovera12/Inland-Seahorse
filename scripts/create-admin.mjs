import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

// Using anon key for signup
const supabase = createClient(
  'https://nsqcttbciocfumhvdnod.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWN0dGJjaW9jZnVtaHZkbm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTA5MDAsImV4cCI6MjA4MzM4NjkwMH0.0LIqFwwWAlyIrpT10BQrPn9yHFR2c6ZP6sFjkYT0wEQ'
)

const { Client } = pg

async function createAdmin() {
  console.log('Creating admin user via Supabase signUp...\n')

  // Create user via Supabase signUp
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@dismantlepro.com',
    password: 'Admin123!',
    options: {
      data: {
        first_name: 'Admin',
        last_name: 'User'
      }
    }
  })

  if (error) {
    console.log('Error creating user:', error)
    return
  }

  console.log('User created successfully!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)

  // Now update the role to admin in public.users
  const client = new Client({
    connectionString: 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()

  // Wait a moment for the trigger to create the public.users record
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Update role to admin
  await client.query(
    'UPDATE public.users SET role = $1 WHERE id = $2',
    ['admin', data.user.id]
  )

  console.log('\nRole updated to admin!')

  // Verify
  const user = await client.query('SELECT * FROM public.users WHERE id = $1', [data.user.id])
  console.log('\nPublic user record:', user.rows[0])

  await client.end()

  console.log('\n========================================')
  console.log('ADMIN USER CREATED!')
  console.log('========================================')
  console.log('Email:    admin@dismantlepro.com')
  console.log('Password: Admin123!')
  console.log('Role:     admin')
  console.log('========================================')
}

createAdmin().catch(console.error)
