/**
 * Check what columns and data exist in old inland_quotes table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL
const OLD_SUPABASE_ANON_KEY = process.env.OLD_SUPABASE_ANON_KEY

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_ANON_KEY) {
  console.error('Missing OLD Supabase credentials')
  process.exit(1)
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY)

async function checkOldInland() {
  console.log('=== Checking Old Inland Quotes ===\n')

  // Get a few sample quotes
  const { data: quotes, error } = await oldClient
    .from('inland_quotes')
    .select('*')
    .limit(3)

  if (error) {
    console.error('Error fetching quotes:', error.message)
    return
  }

  if (quotes.length > 0) {
    console.log('Sample quote structure:')
    console.log('Columns:', Object.keys(quotes[0]).join(', '))
    console.log('\nSample data:')
    quotes.forEach((q, i) => {
      console.log(`\n--- Quote ${i + 1}: ${q.quote_number} ---`)
      console.log('total_amount:', q.total_amount)
      console.log('subtotal:', q.subtotal)
      console.log('line_haul_total:', q.line_haul_total)
      console.log('base_rate:', q.base_rate)
      console.log('accessorial_total:', q.accessorial_total)
      console.log('margin_percentage:', q.margin_percentage)
      console.log('margin_amount:', q.margin_amount)
      console.log('rate_per_mile:', q.rate_per_mile)
      console.log('distance_miles:', q.distance_miles)
    })
  }
}

checkOldInland().catch(console.error)
