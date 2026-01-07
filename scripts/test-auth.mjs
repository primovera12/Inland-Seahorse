import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsqcttbciocfumhvdnod.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWN0dGJjaW9jZnVtaHZkbm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTA5MDAsImV4cCI6MjA4MzM4NjkwMH0.0LIqFwwWAlyIrpT10BQrPn9yHFR2c6ZP6sFjkYT0wEQ'
)

async function testAuth() {
  console.log('Testing Supabase Auth...\n')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@dismantlepro.com',
    password: 'Admin123!'
  })

  if (error) {
    console.log('Auth Error:', error)
  } else {
    console.log('Auth Success!')
    console.log('User:', data.user?.email)
    console.log('Session:', data.session ? 'Valid' : 'None')
  }
}

testAuth().catch(console.error)
