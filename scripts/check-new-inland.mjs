/**
 * Check what data exists in new inland_quotes table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkNewInland() {
  console.log('=== Checking New Inland Quotes ===\n')

  // Check quote IT-251217-3446 which had $5150 in old DB
  const { data: quote, error } = await supabase
    .from('inland_quotes')
    .select('*')
    .eq('quote_number', 'IT-251217-3446')
    .single()

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (quote) {
    console.log('Quote IT-251217-3446:')
    console.log('total:', quote.total)
    console.log('subtotal:', quote.subtotal)
    console.log('Expected: 515000 cents ($5150)')
  }

  // Get all quotes with non-zero totals
  const { data: quotesWithTotals } = await supabase
    .from('inland_quotes')
    .select('quote_number, total, subtotal')
    .gt('total', 0)
    .limit(10)

  console.log('\n\nQuotes with non-zero totals:')
  console.log(quotesWithTotals)
}

checkNewInland().catch(console.error)
