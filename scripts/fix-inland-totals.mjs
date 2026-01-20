/**
 * Fix inland quote totals that were migrated as 0
 * This script reads the quote_data and calculates proper totals
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

async function fixInlandTotals() {
  console.log('=== Fixing Inland Quote Totals ===\n')

  // Get all inland quotes with 0 total
  const { data: quotes, error } = await supabase
    .from('inland_quotes')
    .select('id, quote_number, total, subtotal, quote_data')
    .eq('total', 0)

  if (error) {
    console.error('Error fetching quotes:', error.message)
    return
  }

  console.log(`Found ${quotes.length} quotes with $0 total\n`)

  let updated = 0
  let skipped = 0

  for (const quote of quotes) {
    const quoteData = quote.quote_data

    // Try to get total from various places in quote_data
    let newTotal = 0

    // Check quote_data.total
    if (quoteData?.total && quoteData.total > 0) {
      newTotal = quoteData.total
    }
    // Check subtotal as fallback
    else if (quoteData?.subtotal && quoteData.subtotal > 0) {
      newTotal = quoteData.subtotal
    }
    // Calculate from destination_blocks
    else if (quoteData?.destination_blocks?.length > 0) {
      newTotal = quoteData.destination_blocks.reduce((sum, dest) => {
        return sum + (dest.subtotal || 0)
      }, 0)
    }
    // Calculate from destinationBlocks (camelCase)
    else if (quoteData?.destinationBlocks?.length > 0) {
      newTotal = quoteData.destinationBlocks.reduce((sum, dest) => {
        return sum + (dest.subtotal || 0)
      }, 0)
    }

    if (newTotal > 0) {
      // Update the quote
      const { error: updateError } = await supabase
        .from('inland_quotes')
        .update({
          total: newTotal,
          subtotal: quoteData?.subtotal || newTotal
        })
        .eq('id', quote.id)

      if (updateError) {
        console.error(`Error updating ${quote.quote_number}:`, updateError.message)
      } else {
        console.log(`✓ Updated ${quote.quote_number}: $${(newTotal / 100).toFixed(2)}`)
        updated++
      }
    } else {
      console.log(`⏭ Skipped ${quote.quote_number}: no total data found in quote_data`)
      skipped++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
}

fixInlandTotals().catch(console.error)
