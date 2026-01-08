import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Lazy initialization to avoid build-time errors
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables for cron job')
    }

    supabaseAdmin = createClient(url, key)
  }
  return supabaseAdmin
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no CRON_SECRET is set, allow in development
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  // Verify the request is authorized
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const results = {
    dismantleQuotesExpired: 0,
    inlandQuotesExpired: 0,
    errors: [] as string[],
  }

  try {
    const supabase = getSupabaseAdmin()

    // Expire dismantling quotes past their expiration date
    const { data: expiredDismantleQuotes, error: dismantleError } = await supabase
      .from('quote_history')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'sent')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id, quote_number')

    if (dismantleError) {
      results.errors.push(`Dismantle quotes error: ${dismantleError.message}`)
    } else {
      results.dismantleQuotesExpired = expiredDismantleQuotes?.length || 0

      // Record status changes in history for each expired quote
      if (expiredDismantleQuotes && expiredDismantleQuotes.length > 0) {
        const statusHistoryRecords = expiredDismantleQuotes.map((quote) => ({
          quote_id: quote.id,
          quote_type: 'dismantle',
          previous_status: 'sent',
          new_status: 'expired',
          changed_by: null, // System action
          changed_by_name: 'System',
          notes: 'Automatically expired due to validity period',
        }))

        const { error: historyError } = await supabase
          .from('quote_status_history')
          .insert(statusHistoryRecords)

        if (historyError) {
          results.errors.push(`Dismantle history error: ${historyError.message}`)
        }
      }
    }

    // Expire inland quotes past their expiration date
    const { data: expiredInlandQuotes, error: inlandError } = await supabase
      .from('inland_quotes')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'sent')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id, quote_number')

    if (inlandError) {
      results.errors.push(`Inland quotes error: ${inlandError.message}`)
    } else {
      results.inlandQuotesExpired = expiredInlandQuotes?.length || 0

      // Record status changes in history for each expired inland quote
      if (expiredInlandQuotes && expiredInlandQuotes.length > 0) {
        const statusHistoryRecords = expiredInlandQuotes.map((quote) => ({
          quote_id: quote.id,
          quote_type: 'inland',
          previous_status: 'sent',
          new_status: 'expired',
          changed_by: null, // System action
          changed_by_name: 'System',
          notes: 'Automatically expired due to validity period',
        }))

        const { error: historyError } = await supabase
          .from('quote_status_history')
          .insert(statusHistoryRecords)

        if (historyError) {
          results.errors.push(`Inland history error: ${historyError.message}`)
        }
      }
    }

    // Also expire "viewed" quotes that have passed expiration
    const { data: expiredViewedDismantle } = await supabase
      .from('quote_history')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'viewed')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id')

    const { data: expiredViewedInland } = await supabase
      .from('inland_quotes')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'viewed')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id')

    results.dismantleQuotesExpired += expiredViewedDismantle?.length || 0
    results.inlandQuotesExpired += expiredViewedInland?.length || 0

    return NextResponse.json({
      success: true,
      message: `Expired ${results.dismantleQuotesExpired} dismantle quotes and ${results.inlandQuotesExpired} inland quotes`,
      ...results,
      timestamp: now,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...results,
      },
      { status: 500 }
    )
  }
}

// Also support POST for some cron services
export async function POST(request: Request) {
  return GET(request)
}
