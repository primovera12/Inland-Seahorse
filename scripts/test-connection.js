const { createClient } = require('@supabase/supabase-js')

const NEW_SUPABASE_URL = 'https://nsqcttbciocfumhvdnod.supabase.co'
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!NEW_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

console.log('Testing connection...')
console.log('URL:', NEW_SUPABASE_URL)
console.log('Key starts with:', NEW_SERVICE_KEY.substring(0, 20) + '...')

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY)

async function testConnection() {
  try {
    console.log('\n1. Testing models table query...')
    const { data, error } = await supabase
      .from('models')
      .select('id, name')
      .limit(5)

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log('✅ Success! Found', data.length, 'models')
    console.log('Sample:', data[0])

    console.log('\n2. Testing equipment_dimensions table query...')
    const { data: dims, error: dimsError } = await supabase
      .from('equipment_dimensions')
      .select('model_id')
      .limit(1)

    if (dimsError) {
      console.error('❌ Error:', dimsError)
      return
    }

    console.log('✅ equipment_dimensions table accessible')

  } catch (error) {
    console.error('❌ Failed:', error.message)
  }
}

testConnection()
