/**
 * Check all columns and pricing data in old inland_quotes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_ANON_KEY

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_KEY) {
  console.error('Missing OLD_SUPABASE credentials')
  process.exit(1)
}

const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY)

async function checkQuoteData() {
  console.log('=== Examining ALL pricing columns in Old DB ===\n')

  // Get all quotes with all columns
  const { data: quotes, error } = await supabase
    .from('inland_quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log(`Found ${quotes.length} quotes\n`)

  // Show all columns
  if (quotes.length > 0) {
    console.log('All columns:', Object.keys(quotes[0]).join(', '))
    console.log('')
  }

  // Analyze quotes that could have totals calculated
  console.log('\n=== Quotes with calculable pricing ===')
  let canCalculate = 0

  for (const q of quotes) {
    const rate = q.rate_per_mile || 0
    const miles = q.distance_miles || 0
    const currentTotal = q.total_amount || 0
    const lineHaul = rate * miles  // dollars

    // Check JSON columns
    const destBlocks = q.destination_blocks || []
    const loadBlocks = q.load_blocks || []
    const serviceItems = q.service_items || []
    const accessorials = q.accessorial_charges || []

    const hasJsonData = destBlocks.length > 0 || loadBlocks.length > 0 ||
                        serviceItems.length > 0 || accessorials.length > 0

    if (miles > 0 && currentTotal === 0) {
      canCalculate++
      console.log(`\n--- ${q.quote_number} ---`)
      console.log(`  rate_per_mile: $${rate}`)
      console.log(`  distance_miles: ${miles}`)
      console.log(`  calculated line_haul: $${lineHaul.toFixed(2)}`)
      console.log(`  current total_amount: $${currentTotal}`)
      if (hasJsonData) {
        console.log(`  JSON data: dest_blocks=${destBlocks.length}, load_blocks=${loadBlocks.length}, services=${serviceItems.length}, accessorials=${accessorials.length}`)
      }
    }
  }

  console.log(`\n\n=== Summary ===`)
  console.log(`Total quotes: ${quotes.length}`)
  console.log(`Quotes with $0 total but calculable (miles > 0): ${canCalculate}`)
  console.log(`\nWe could calculate line haul = rate_per_mile × distance_miles for these quotes.`)
}

checkQuoteData().catch(console.error)
