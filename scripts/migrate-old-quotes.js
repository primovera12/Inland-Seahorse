/**
 * Migration Script: Import Old Quotes from Legacy Database
 *
 * This script migrates quotes from the old dismantle_db system to the new dismantle-pro system.
 * It handles both dismantle quotes (quote_history) and inland quotes (inland_quotes).
 *
 * Usage:
 *   1. Update OLD_SUPABASE_URL and OLD_SUPABASE_KEY with your legacy database credentials
 *   2. Run: node scripts/migrate-old-quotes.js
 *
 * The script will:
 *   - Fetch all quotes from the old database
 *   - Transform them to match the new schema
 *   - Insert them into the new database (skipping duplicates by quote_number)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ============================================
// CONFIGURATION - Read from .env.local
// ============================================

// Old database (legacy dismantle_db) - from environment variables
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL;
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_ANON_KEY;

// New database (dismantle-pro) - use service role key to bypass RLS
const NEW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsqcttbciocfumhvdnod.supabase.co';
// Service role key bypasses RLS - required for migration
const NEW_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

// Validate configuration
if (!OLD_SUPABASE_URL || !OLD_SUPABASE_KEY) {
  console.error('ERROR: Missing old database credentials in .env.local');
  console.error('');
  console.error('Please add these lines to your .env.local file:');
  console.error('');
  console.error('  OLD_SUPABASE_URL=https://your-old-project.supabase.co');
  console.error('  OLD_SUPABASE_ANON_KEY=your-old-anon-key');
  console.error('');
  console.error('You can find these values in: Inland-Seahorse/dismantle_db/.env');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('');
  console.error('The migration script needs the service role key to bypass RLS policies.');
  console.error('');
  console.error('To get your service role key:');
  console.error('  1. Go to https://supabase.com/dashboard/project/nsqcttbciocfumhvdnod/settings/api');
  console.error('  2. Copy the "service_role" key (NOT the anon key)');
  console.error('  3. Add it to your .env.local file:');
  console.error('');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('WARNING: Keep the service role key secret - it bypasses all security!');
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

// Statistics tracking
const stats = {
  dismantleQuotes: { found: 0, migrated: 0, skipped: 0, errors: 0 },
  inlandQuotes: { found: 0, migrated: 0, skipped: 0, errors: 0 },
};

// Will be set during migration
let migrationUserId = null;

/**
 * Get a user ID from the new database to use as created_by
 */
async function getMigrationUserId() {
  const { data, error } = await newSupabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('WARNING: Could not find a user ID for migration.');
    console.error('The migration may fail due to RLS policies.');
    console.error('Consider using a service role key instead of anon key.');
    return null;
  }
  return data.id;
}

/**
 * Convert amount to cents (integer) if it's a decimal
 * Old system may store in dollars, new system expects cents
 */
function toIntegerCents(amount) {
  if (amount === null || amount === undefined) return 0;
  // If amount looks like it's already in cents (large integer), return as-is
  // If it's a small decimal (dollars), multiply by 100
  const num = Number(amount);
  if (isNaN(num)) return 0;
  // Heuristic: if the number is less than 10000 and has decimals, it's likely dollars
  if (num < 10000 && num !== Math.floor(num)) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}

/**
 * Transform old dismantle quote to new schema
 * New schema only accepts: quote_number, status, customer_name, customer_email,
 * customer_phone, customer_company, customer_address, make_name, model_name,
 * location, subtotal, total, quote_data
 */
function transformDismantleQuote(oldQuote) {
  // Parse miscellaneous fees JSON safely
  let miscFees = [];
  try {
    if (oldQuote.miscellaneous_fees_json) {
      miscFees = JSON.parse(oldQuote.miscellaneous_fees_json);
    }
  } catch (e) {
    miscFees = [];
  }

  return {
    // Required fields for new schema
    quote_number: oldQuote.quote_number,
    status: mapQuoteStatus(oldQuote.status),
    customer_name: oldQuote.customer_name || 'Unknown Customer',
    make_name: oldQuote.equipment_make || oldQuote.make_name || 'Unknown',
    model_name: oldQuote.equipment_model || oldQuote.model_name || 'Unknown',
    location: oldQuote.location || 'New Jersey',
    subtotal: toIntegerCents(oldQuote.subtotal),
    total: toIntegerCents(oldQuote.total_with_margin || oldQuote.total),

    // Optional fields
    customer_email: oldQuote.customer_email || undefined,
    customer_company: oldQuote.customer_company || undefined,

    // Store ALL old data in quote_data JSON
    quote_data: {
      // Cost breakdown from old system
      costs: {
        dismantling_loading_cost: oldQuote.dismantling_loading_cost,
        loading_cost: oldQuote.loading_cost,
        blocking_bracing_cost: oldQuote.blocking_bracing_cost,
        ncb_survey_cost: oldQuote.ncb_survey_cost,
        local_drayage_cost: oldQuote.local_drayage_cost,
        chassis_cost: oldQuote.chassis_cost,
        tolls_cost: oldQuote.tolls_cost,
        escorts_cost: oldQuote.escorts_cost,
        power_wash_cost: oldQuote.power_wash_cost,
        waste_fluids_disposal_fee: oldQuote.waste_fluids_disposal_fee,
        miscellaneous_costs: oldQuote.miscellaneous_costs,
      },
      miscellaneous_fees: miscFees,
      // Financial data
      margin_percentage: oldQuote.margin_percentage,
      margin_amount: oldQuote.margin_amount,
      // Notes stored here since columns don't exist
      internal_notes: oldQuote.internal_notes,
      quote_notes: oldQuote.notes,
      // Version info
      version: oldQuote.version || 1,
      expiration_date: oldQuote.expiration_date,
      // Legacy reference
      legacy_rate_id: oldQuote.rate_id,
      legacy_id: oldQuote.id,
      migrated_from: 'dismantle_db',
      migration_date: new Date().toISOString(),
      original_created_at: oldQuote.created_at,
      original_updated_at: oldQuote.updated_at,
    },
  };
}

/**
 * Transform old inland quote to new schema
 * New schema only accepts: quote_number, status, customer_name, customer_email,
 * customer_phone, customer_company, subtotal, total, quote_data
 */
function transformInlandQuote(oldQuote) {
  // Parse JSON fields safely
  let accessorialCharges = [];
  let serviceItems = [];
  try {
    if (oldQuote.accessorial_charges_json) {
      accessorialCharges = JSON.parse(oldQuote.accessorial_charges_json);
    }
  } catch (e) {
    accessorialCharges = [];
  }
  try {
    if (oldQuote.service_items_json) {
      serviceItems = JSON.parse(oldQuote.service_items_json);
    }
  } catch (e) {
    serviceItems = [];
  }

  return {
    // Required fields for new schema
    quote_number: oldQuote.quote_number,
    status: mapInlandQuoteStatus(oldQuote.status),
    customer_name: oldQuote.client_name || 'Unknown Customer',
    subtotal: toIntegerCents(oldQuote.subtotal),
    total: toIntegerCents(oldQuote.total_amount || oldQuote.total),

    // Optional fields
    customer_email: oldQuote.client_email || undefined,
    customer_phone: oldQuote.client_phone || undefined,
    customer_company: oldQuote.client_company || undefined,

    // Store ALL old data in quote_data JSON
    quote_data: {
      // Billing info
      billing: {
        address: oldQuote.billing_address,
        city: oldQuote.billing_city,
        state: oldQuote.billing_state,
        zip: oldQuote.billing_zip,
        payment_terms: oldQuote.payment_terms,
      },
      // Pickup location
      pickup: {
        address: oldQuote.pickup_address,
        city: oldQuote.pickup_city,
        state: oldQuote.pickup_state,
        zip: oldQuote.pickup_zip,
      },
      // Dropoff location
      dropoff: {
        address: oldQuote.dropoff_address,
        city: oldQuote.dropoff_city,
        state: oldQuote.dropoff_state,
        zip: oldQuote.dropoff_zip,
      },
      // Route details
      route: {
        distance_miles: oldQuote.distance_miles,
        distance_meters: oldQuote.distance_meters,
        duration_minutes: oldQuote.duration_minutes,
        duration_text: oldQuote.duration_text,
        polyline: oldQuote.route_polyline,
      },
      // Pricing breakdown
      pricing: {
        rate_per_mile: oldQuote.rate_per_mile,
        base_rate: oldQuote.base_rate,
        fuel_surcharge_percent: oldQuote.fuel_surcharge_percent,
        fuel_surcharge_amount: oldQuote.fuel_surcharge_amount,
        margin_percentage: oldQuote.margin_percentage,
        margin_amount: oldQuote.margin_amount,
        line_haul_total: oldQuote.line_haul_total,
        accessorial_total: oldQuote.accessorial_total,
      },
      // Equipment info
      equipment: {
        type_id: oldQuote.equipment_type_id,
        description: oldQuote.equipment_description,
        weight_lbs: oldQuote.weight_lbs,
      },
      // Accessorials and services
      accessorial_charges: accessorialCharges,
      service_items: serviceItems,
      // Notes
      internal_notes: oldQuote.internal_notes,
      customer_notes: oldQuote.customer_notes,
      // Legacy reference
      legacy_id: oldQuote.id,
      migrated_from: 'dismantle_db',
      migration_date: new Date().toISOString(),
      original_created_at: oldQuote.created_at,
      original_updated_at: oldQuote.updated_at,
    },
  };
}

/**
 * Map old quote status to new status enum
 */
function mapQuoteStatus(oldStatus) {
  const statusMap = {
    'draft': 'draft',
    'sent': 'sent',
    'pending': 'sent',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'expired': 'expired',
    'viewed': 'viewed',
  };
  return statusMap[oldStatus] || 'draft';
}

/**
 * Map old inland quote status to new status enum
 */
function mapInlandQuoteStatus(oldStatus) {
  const statusMap = {
    'draft': 'draft',
    'sent': 'sent',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'expired': 'expired',
  };
  return statusMap[oldStatus] || 'draft';
}

/**
 * Check if a quote already exists in the new database
 */
async function quoteExists(tableName, quoteNumber) {
  const { data, error } = await newSupabase
    .from(tableName)
    .select('id')
    .eq('quote_number', quoteNumber)
    .single();

  return !error && data !== null;
}

/**
 * Migrate dismantle quotes (C.2)
 */
async function migrateDismantleQuotes() {
  console.log('\n=== Migrating Dismantle Quotes (C.2) ===\n');

  // Fetch all quotes from old database
  const { data: oldQuotes, error: fetchError } = await oldSupabase
    .from('quote_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch old dismantle quotes:', fetchError.message);
    return;
  }

  stats.dismantleQuotes.found = oldQuotes?.length || 0;
  console.log(`Found ${stats.dismantleQuotes.found} dismantle quotes in old database`);

  if (!oldQuotes || oldQuotes.length === 0) {
    console.log('No dismantle quotes to migrate');
    return;
  }

  // Process each quote
  for (const oldQuote of oldQuotes) {
    try {
      // Check if already exists
      const exists = await quoteExists('quote_history', oldQuote.quote_number);
      if (exists) {
        console.log(`  Skipping ${oldQuote.quote_number} (already exists)`);
        stats.dismantleQuotes.skipped++;
        continue;
      }

      // Transform and insert
      const newQuote = transformDismantleQuote(oldQuote);
      if (migrationUserId) {
        newQuote.created_by = migrationUserId;
      }
      const { error: insertError } = await newSupabase
        .from('quote_history')
        .insert(newQuote);

      if (insertError) {
        console.error(`  Error migrating ${oldQuote.quote_number}:`, insertError.message);
        stats.dismantleQuotes.errors++;
      } else {
        console.log(`  Migrated ${oldQuote.quote_number}`);
        stats.dismantleQuotes.migrated++;
      }
    } catch (err) {
      console.error(`  Exception migrating ${oldQuote.quote_number}:`, err.message);
      stats.dismantleQuotes.errors++;
    }
  }
}

/**
 * Migrate inland quotes (F.2)
 */
async function migrateInlandQuotes() {
  console.log('\n=== Migrating Inland Quotes (F.2) ===\n');

  // Fetch all quotes from old database
  const { data: oldQuotes, error: fetchError } = await oldSupabase
    .from('inland_quotes')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch old inland quotes:', fetchError.message);
    return;
  }

  stats.inlandQuotes.found = oldQuotes?.length || 0;
  console.log(`Found ${stats.inlandQuotes.found} inland quotes in old database`);

  if (!oldQuotes || oldQuotes.length === 0) {
    console.log('No inland quotes to migrate');
    return;
  }

  // Process each quote
  for (const oldQuote of oldQuotes) {
    try {
      // Check if already exists
      const exists = await quoteExists('inland_quotes', oldQuote.quote_number);
      if (exists) {
        console.log(`  Skipping ${oldQuote.quote_number} (already exists)`);
        stats.inlandQuotes.skipped++;
        continue;
      }

      // Transform and insert
      const newQuote = transformInlandQuote(oldQuote);
      if (migrationUserId) {
        newQuote.created_by = migrationUserId;
      }
      const { error: insertError } = await newSupabase
        .from('inland_quotes')
        .insert(newQuote);

      if (insertError) {
        console.error(`  Error migrating ${oldQuote.quote_number}:`, insertError.message);
        stats.inlandQuotes.errors++;
      } else {
        console.log(`  Migrated ${oldQuote.quote_number}`);
        stats.inlandQuotes.migrated++;
      }
    } catch (err) {
      console.error(`  Exception migrating ${oldQuote.quote_number}:`, err.message);
      stats.inlandQuotes.errors++;
    }
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n========================================');
  console.log('           MIGRATION SUMMARY            ');
  console.log('========================================\n');

  console.log('Dismantle Quotes (C.2):');
  console.log(`  Found:    ${stats.dismantleQuotes.found}`);
  console.log(`  Migrated: ${stats.dismantleQuotes.migrated}`);
  console.log(`  Skipped:  ${stats.dismantleQuotes.skipped}`);
  console.log(`  Errors:   ${stats.dismantleQuotes.errors}`);

  console.log('\nInland Quotes (F.2):');
  console.log(`  Found:    ${stats.inlandQuotes.found}`);
  console.log(`  Migrated: ${stats.inlandQuotes.migrated}`);
  console.log(`  Skipped:  ${stats.inlandQuotes.skipped}`);
  console.log(`  Errors:   ${stats.inlandQuotes.errors}`);

  const totalMigrated = stats.dismantleQuotes.migrated + stats.inlandQuotes.migrated;
  const totalErrors = stats.dismantleQuotes.errors + stats.inlandQuotes.errors;

  console.log('\n----------------------------------------');
  console.log(`Total Migrated: ${totalMigrated}`);
  console.log(`Total Errors:   ${totalErrors}`);
  console.log('----------------------------------------\n');

  if (totalErrors > 0) {
    console.log('WARNING: Some quotes failed to migrate. Please review the errors above.');
  } else if (totalMigrated > 0) {
    console.log('SUCCESS: Migration completed successfully!');
  } else {
    console.log('INFO: No new quotes to migrate (all already exist or none found).');
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('========================================');
  console.log('  Old Quotes Migration Script');
  console.log('  Tasks: C.2 (Dismantle) & F.2 (Inland)');
  console.log('========================================\n');

  console.log('Connecting to databases...');

  // Test connections
  const { error: oldConnError } = await oldSupabase.from('quote_history').select('id').limit(1);
  if (oldConnError) {
    console.error('Failed to connect to old database:', oldConnError.message);
    process.exit(1);
  }
  console.log('  Old database: Connected');

  const { error: newConnError } = await newSupabase.from('quote_history').select('id').limit(1);
  if (newConnError) {
    console.error('Failed to connect to new database:', newConnError.message);
    process.exit(1);
  }
  console.log('  New database: Connected');

  // Get a user ID for RLS compliance
  migrationUserId = await getMigrationUserId();
  if (migrationUserId) {
    console.log('  Using user ID for migration:', migrationUserId);
  } else {
    console.log('  WARNING: No user ID found - migration may fail due to RLS policies');
  }

  // Run migrations
  await migrateDismantleQuotes();
  await migrateInlandQuotes();

  // Print summary
  printSummary();

  process.exit(stats.dismantleQuotes.errors + stats.inlandQuotes.errors > 0 ? 1 : 0);
}

// Run the migration
runMigration();
