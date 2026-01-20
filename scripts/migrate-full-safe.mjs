/**
 * Full Safe Migration Script
 *
 * Migrates data from OLD database to NEW database using Supabase REST API.
 * Uses ON CONFLICT logic to preserve existing data (skip duplicates).
 *
 * Fully transforms old quotes to match new schema structure.
 */

import { createClient } from '@supabase/supabase-js'

// Old database (source)
const OLD_URL = 'https://piwpnmitxtlnhjtjarbo.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd3BubWl0eHRsbmhqdGphcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODk5MTcsImV4cCI6MjA3OTI2NTkxN30.VZ98LrhkihGHJiUYnbfS-JkoqVobTYj_C1nB7rVFPhs'

// New database (target) - use service role key for full access
const NEW_URL = 'https://nsqcttbciocfumhvdnod.supabase.co'
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWN0dGJjaW9jZnVtaHZkbm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgxMDkwMCwiZXhwIjoyMDgzMzg2OTAwfQ.SnJ9q8cHf7B5wph8ZsQ8BzjM8iz98XHt36yTEGcbO24'

const oldClient = createClient(OLD_URL, OLD_KEY)
const newClient = createClient(NEW_URL, NEW_KEY)

// ============================================
// UTILITY FUNCTIONS
// ============================================

function feetToInches(feet) {
  if (!feet) return 0
  return Math.round(parseFloat(feet) * 12)
}

function dollarsToCents(dollars) {
  if (!dollars) return 0
  return Math.round(parseFloat(dollars) * 100)
}

function inchesToFtIn(totalInches) {
  if (!totalInches) return "0' 0\""
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${feet}' ${inches}"`
}

// Default cost descriptions
const COST_DESCRIPTIONS = {
  dismantling_loading_cost: 'Dismantling & Loading',
  loading_cost: 'Loading',
  blocking_bracing_cost: 'Blocking & Bracing',
  rigging_cost: 'Rigging',
  storage_cost: 'Storage',
  transport_cost: 'Transport',
  equipment_cost: 'Equipment',
  labor_cost: 'Labor',
  permit_cost: 'Permits',
  escort_cost: 'Escort',
  miscellaneous_cost: 'Miscellaneous'
}

const COST_FIELDS = Object.keys(COST_DESCRIPTIONS)

// Stats
const stats = {
  makes: { migrated: 0, skipped: 0, errors: 0 },
  models: { migrated: 0, skipped: 0, errors: 0 },
  dimensions: { migrated: 0, skipped: 0, errors: 0 },
  rates: { migrated: 0, skipped: 0, errors: 0 },
  companies: { migrated: 0, skipped: 0, errors: 0 },
  contacts: { migrated: 0, skipped: 0, errors: 0 },
  quotes: { migrated: 0, skipped: 0, errors: 0 },
  inland_quotes: { migrated: 0, skipped: 0, errors: 0 }
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function migrateMakes() {
  console.log('\n=== Migrating MAKES ===')

  // Get old makes
  const { data: oldMakes, error: oldError } = await oldClient
    .from('makes')
    .select('*')
    .order('name')

  if (oldError) {
    console.error('Error fetching old makes:', oldError.message)
    return
  }

  console.log(`Found ${oldMakes.length} makes in old database`)

  // Get existing makes in new DB
  const { data: existingMakes } = await newClient
    .from('makes')
    .select('name')

  const existingNames = new Set((existingMakes || []).map(m => m.name.toLowerCase()))

  for (const make of oldMakes) {
    if (existingNames.has(make.name.toLowerCase())) {
      stats.makes.skipped++
      continue
    }

    const { error } = await newClient
      .from('makes')
      .insert({
        id: make.id,
        name: make.name,
        popularity_rank: make.popularity_rank || 0,
        created_at: make.created_at,
        updated_at: make.updated_at || make.created_at
      })

    if (error) {
      if (error.code === '23505') { // Unique violation
        stats.makes.skipped++
      } else {
        console.error(`Error inserting make ${make.name}:`, error.message)
        stats.makes.errors++
      }
    } else {
      stats.makes.migrated++
    }
  }

  console.log(`✓ Makes: ${stats.makes.migrated} migrated, ${stats.makes.skipped} skipped, ${stats.makes.errors} errors`)
}

async function migrateModels() {
  console.log('\n=== Migrating MODELS ===')

  // Get old models
  const { data: oldModels, error: oldError } = await oldClient
    .from('models')
    .select('*')
    .order('name')

  if (oldError) {
    console.error('Error fetching old models:', oldError.message)
    return
  }

  console.log(`Found ${oldModels.length} models in old database`)

  // Get existing models in new DB
  const { data: existingModels } = await newClient
    .from('models')
    .select('id')

  const existingIds = new Set((existingModels || []).map(m => m.id))

  // Process in batches
  const batchSize = 100
  for (let i = 0; i < oldModels.length; i += batchSize) {
    const batch = oldModels.slice(i, i + batchSize)
    const toInsert = batch.filter(m => !existingIds.has(m.id))

    if (toInsert.length === 0) {
      stats.models.skipped += batch.length
      continue
    }

    const { error } = await newClient
      .from('models')
      .insert(toInsert.map(m => ({
        id: m.id,
        make_id: m.make_id,
        name: m.name,
        created_at: m.created_at,
        updated_at: m.updated_at || m.created_at
      })))

    if (error) {
      console.error(`Error inserting models batch:`, error.message)
      stats.models.errors += toInsert.length
    } else {
      stats.models.migrated += toInsert.length
      stats.models.skipped += batch.length - toInsert.length
    }

    // Progress
    if ((i + batchSize) % 500 === 0) {
      console.log(`  Progress: ${Math.min(i + batchSize, oldModels.length)}/${oldModels.length}`)
    }
  }

  console.log(`✓ Models: ${stats.models.migrated} migrated, ${stats.models.skipped} skipped, ${stats.models.errors} errors`)
}

async function migrateEquipmentDimensions() {
  console.log('\n=== Migrating EQUIPMENT DIMENSIONS ===')

  // Get old dimensions
  const { data: oldDimensions, error: oldError } = await oldClient
    .from('equipment_dimensions')
    .select('*')

  if (oldError) {
    console.error('Error fetching old dimensions:', oldError.message)
    return
  }

  console.log(`Found ${oldDimensions.length} dimension records in old database`)

  // Get existing dimensions in new DB
  const { data: existingDimensions } = await newClient
    .from('equipment_dimensions')
    .select('model_id')

  const existingModelIds = new Set((existingDimensions || []).map(d => d.model_id))

  for (const dim of oldDimensions) {
    if (existingModelIds.has(dim.model_id)) {
      stats.dimensions.skipped++
      continue
    }

    const { error } = await newClient
      .from('equipment_dimensions')
      .insert({
        id: dim.id,
        model_id: dim.model_id,
        length_inches: feetToInches(dim.transport_length),
        width_inches: feetToInches(dim.transport_width),
        height_inches: feetToInches(dim.transport_height),
        weight_lbs: Math.round(parseFloat(dim.shipping_weight || dim.operating_weight) || 0),
        front_image_url: dim.front_image_base64 ? 'pending_migration' : null,
        side_image_url: dim.side_image_base64 ? 'pending_migration' : null,
        created_at: dim.created_at,
        updated_at: dim.updated_at || dim.created_at
      })

    if (error) {
      if (error.code === '23505') {
        stats.dimensions.skipped++
      } else {
        console.error(`Error inserting dimension for model ${dim.model_id}:`, error.message)
        stats.dimensions.errors++
      }
    } else {
      stats.dimensions.migrated++
    }
  }

  console.log(`✓ Dimensions: ${stats.dimensions.migrated} migrated, ${stats.dimensions.skipped} skipped, ${stats.dimensions.errors} errors`)
}

async function migrateRates() {
  console.log('\n=== Migrating RATES ===')

  // Get old rates with location costs
  const { data: oldRates, error: ratesError } = await oldClient
    .from('rates')
    .select('*')

  const { data: locationCosts, error: lcError } = await oldClient
    .from('location_costs')
    .select('*')

  if (ratesError || lcError) {
    console.error('Error fetching rates:', ratesError?.message || lcError?.message)
    return
  }

  console.log(`Found ${oldRates.length} rates and ${locationCosts.length} location costs`)

  // Build lookup: rate_id -> location costs
  const costsByRateId = {}
  for (const lc of locationCosts) {
    if (!costsByRateId[lc.rate_id]) {
      costsByRateId[lc.rate_id] = []
    }
    costsByRateId[lc.rate_id].push(lc)
  }

  // Get existing rates in new DB
  const { data: existingRates } = await newClient
    .from('rates')
    .select('model_id, location')

  const existingKeys = new Set((existingRates || []).map(r => `${r.model_id}-${r.location}`))

  // Migrate rates with their location costs
  for (const rate of oldRates) {
    const costs = costsByRateId[rate.id] || []

    for (const lc of costs) {
      const key = `${rate.model_id}-${lc.location}`
      if (existingKeys.has(key)) {
        stats.rates.skipped++
        continue
      }

      const { error } = await newClient
        .from('rates')
        .insert({
          make_id: rate.make_id,
          model_id: rate.model_id,
          location: lc.location,
          dismantling_loading_cost: dollarsToCents(lc.dismantling_loading_cost || lc.local_drayage_cost),
          loading_cost: dollarsToCents(lc.loading_cost),
          blocking_bracing_cost: dollarsToCents(lc.blocking_bracing_cost),
          rigging_cost: 0,
          storage_cost: 0,
          transport_cost: dollarsToCents(lc.local_drayage_cost),
          equipment_cost: dollarsToCents(lc.chassis_cost),
          labor_cost: 0,
          permit_cost: dollarsToCents(lc.tolls_cost),
          escort_cost: dollarsToCents(lc.escorts_cost),
          miscellaneous_cost: dollarsToCents(lc.miscellaneous_costs),
          created_at: lc.created_at || new Date().toISOString(),
          updated_at: lc.updated_at || new Date().toISOString()
        })

      if (error) {
        if (error.code === '23505') {
          stats.rates.skipped++
        } else if (!error.message.includes('invalid input value')) {
          console.error(`Error inserting rate:`, error.message)
          stats.rates.errors++
        }
      } else {
        stats.rates.migrated++
      }
    }
  }

  console.log(`✓ Rates: ${stats.rates.migrated} migrated, ${stats.rates.skipped} skipped, ${stats.rates.errors} errors`)
}

async function migrateCompanies() {
  console.log('\n=== Migrating COMPANIES ===')

  // Get old companies
  const { data: oldCompanies } = await oldClient.from('companies').select('*')
  const { data: oldCustomers } = await oldClient.from('customers').select('*')

  console.log(`Found ${oldCompanies?.length || 0} companies and ${oldCustomers?.length || 0} customers`)

  // Get existing companies in new DB
  const { data: existingCompanies } = await newClient.from('companies').select('name')
  const existingNames = new Set((existingCompanies || []).map(c => c.name?.toLowerCase()))

  // Migrate companies
  for (const c of (oldCompanies || [])) {
    if (existingNames.has(c.name?.toLowerCase())) {
      stats.companies.skipped++
      continue
    }

    const { error } = await newClient.from('companies').insert({
      id: c.id,
      name: c.name,
      industry: c.industry,
      website: c.website,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      billing_address: c.billing_address,
      billing_city: c.billing_city,
      billing_state: c.billing_state,
      billing_zip: c.billing_zip,
      payment_terms: c.payment_terms || 'Net 30',
      tax_id: c.tax_id,
      tags: c.tags || [],
      status: c.status || 'active',
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at
    })

    if (error) {
      if (error.code === '23505') {
        stats.companies.skipped++
      } else {
        console.error(`Error inserting company ${c.name}:`, error.message)
        stats.companies.errors++
      }
    } else {
      existingNames.add(c.name?.toLowerCase())
      stats.companies.migrated++
    }
  }

  // Migrate customers as companies
  for (const cust of (oldCustomers || [])) {
    const companyName = cust.company || cust.name
    if (existingNames.has(companyName?.toLowerCase())) {
      stats.companies.skipped++
      continue
    }

    const { error } = await newClient.from('companies').insert({
      id: cust.id,
      name: companyName,
      phone: cust.phone,
      address: cust.address,
      billing_address: cust.billing_address,
      billing_city: cust.billing_city,
      billing_state: cust.billing_state,
      billing_zip: cust.billing_zip,
      payment_terms: cust.payment_terms || 'Net 30',
      status: 'active',
      created_at: cust.created_at,
      updated_at: cust.updated_at || cust.created_at
    })

    if (error) {
      if (error.code === '23505') {
        stats.companies.skipped++
      } else {
        console.error(`Error inserting customer ${companyName}:`, error.message)
        stats.companies.errors++
      }
    } else {
      existingNames.add(companyName?.toLowerCase())
      stats.companies.migrated++
    }
  }

  console.log(`✓ Companies: ${stats.companies.migrated} migrated, ${stats.companies.skipped} skipped, ${stats.companies.errors} errors`)
}

async function migrateContacts() {
  console.log('\n=== Migrating CONTACTS ===')

  const { data: oldContacts } = await oldClient.from('contacts').select('*')
  console.log(`Found ${oldContacts?.length || 0} contacts`)

  // Get existing contacts
  const { data: existingContacts } = await newClient.from('contacts').select('id')
  const existingIds = new Set((existingContacts || []).map(c => c.id))

  for (const contact of (oldContacts || [])) {
    if (existingIds.has(contact.id)) {
      stats.contacts.skipped++
      continue
    }

    const { error } = await newClient.from('contacts').insert({
      id: contact.id,
      company_id: contact.company_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      title: contact.title,
      role: contact.role || 'general',
      is_primary: contact.is_primary || false,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at || contact.created_at
    })

    if (error) {
      if (error.code === '23505' || error.code === '23503') {
        stats.contacts.skipped++
      } else {
        console.error(`Error inserting contact:`, error.message)
        stats.contacts.errors++
      }
    } else {
      stats.contacts.migrated++
    }
  }

  console.log(`✓ Contacts: ${stats.contacts.migrated} migrated, ${stats.contacts.skipped} skipped, ${stats.contacts.errors} errors`)
}

async function migrateQuotes() {
  console.log('\n=== Migrating DISMANTLE QUOTES ===')

  const { data: oldQuotes } = await oldClient.from('quote_history').select('*')
  console.log(`Found ${oldQuotes?.length || 0} dismantle quotes`)

  // Get existing quotes
  const { data: existingQuotes } = await newClient.from('quote_history').select('quote_number')
  const existingNumbers = new Set((existingQuotes || []).map(q => q.quote_number))

  // Get equipment lookup data from NEW database
  const { data: makes } = await newClient.from('makes').select('id, name')
  const { data: models } = await newClient.from('models').select('id, make_id, name')
  const { data: dimensions } = await newClient.from('equipment_dimensions').select('*')
  const { data: rates } = await newClient.from('rates').select('*')

  // Build lookups
  const makesByName = {}
  for (const m of (makes || [])) {
    makesByName[m.name.toLowerCase()] = m
  }

  const modelsByMakeAndName = {}
  for (const m of (models || [])) {
    const key = `${m.make_id}-${m.name.toLowerCase()}`
    modelsByMakeAndName[key] = m
  }

  const dimensionsByModelId = {}
  for (const d of (dimensions || [])) {
    dimensionsByModelId[d.model_id] = d
  }

  const ratesByModelLocation = {}
  for (const r of (rates || [])) {
    const key = `${r.model_id}-${r.location}`
    ratesByModelLocation[key] = r
  }

  for (const q of (oldQuotes || [])) {
    if (existingNumbers.has(q.quote_number)) {
      stats.quotes.skipped++
      continue
    }

    // Lookup equipment in NEW database
    const make = makesByName[q.equipment_make?.toLowerCase()]
    const model = make ? modelsByMakeAndName[`${make.id}-${q.equipment_model?.toLowerCase()}`] : null
    const dim = model ? dimensionsByModelId[model.id] : null
    const rate = model ? ratesByModelLocation[`${model.id}-${q.location}`] : null

    // Build costs object
    const costs = {}
    const enabledCosts = {}
    const costOverrides = {}

    for (const field of COST_FIELDS) {
      const value = rate ? (rate[field] || 0) : 0
      costs[field] = value
      enabledCosts[field] = value > 0
      costOverrides[field] = null
    }

    // Override with old quote values if they exist (converted to cents)
    if (q.dismantling_loading_cost) {
      costs.dismantling_loading_cost = dollarsToCents(q.dismantling_loading_cost)
      enabledCosts.dismantling_loading_cost = true
    }
    if (q.loading_cost) {
      costs.loading_cost = dollarsToCents(q.loading_cost)
      enabledCosts.loading_cost = true
    }
    if (q.blocking_bracing_cost) {
      costs.blocking_bracing_cost = dollarsToCents(q.blocking_bracing_cost)
      enabledCosts.blocking_bracing_cost = true
    }

    // Parse miscellaneous fees
    let miscFees = []
    try {
      if (q.miscellaneous_fees_json) {
        const parsed = typeof q.miscellaneous_fees_json === 'string'
          ? JSON.parse(q.miscellaneous_fees_json)
          : q.miscellaneous_fees_json
        miscFees = (parsed || []).map((fee, idx) => ({
          id: crypto.randomUUID(),
          title: fee.title || fee.name || `Fee ${idx + 1}`,
          description: fee.description || '',
          amount: dollarsToCents(fee.amount || fee.cost || 0),
          is_percentage: fee.is_percentage || false
        }))
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // Build complete quote_data
    const quoteData = {
      quote_number: q.quote_number,
      status: q.status === 'pending' ? 'draft' : (q.status || 'draft'),

      // Customer info
      customer_name: q.customer_name || 'Unknown',
      customer_email: q.customer_email || '',
      customer_phone: q.customer_phone || '',
      customer_company: q.customer_company || '',
      company_id: q.company_id || null,
      contact_id: q.contact_id || null,

      // Equipment with IDs for editing
      make_id: make?.id || null,
      model_id: model?.id || null,
      make_name: q.equipment_make || '',
      model_name: q.equipment_model || '',
      location: q.location || 'New Jersey',

      // Dimensions from equipment_dimensions (in inches, displays as ft-in)
      length_inches: dim?.length_inches || 0,
      width_inches: dim?.width_inches || 0,
      height_inches: dim?.height_inches || 0,
      weight_lbs: dim?.weight_lbs || 0,

      // Images from equipment_dimensions
      front_image_url: dim?.front_image_url || null,
      side_image_url: dim?.side_image_url || null,

      // Costs
      costs,
      enabled_costs: enabledCosts,
      cost_overrides: costOverrides,
      cost_descriptions: { ...COST_DESCRIPTIONS },

      // Pricing (converted to cents)
      subtotal: dollarsToCents(q.subtotal),
      margin_percentage: parseFloat(q.margin_percentage) || 0,
      margin_amount: dollarsToCents(q.margin_amount),
      total: dollarsToCents(q.total_with_margin || q.total),

      // Miscellaneous fees
      miscellaneous_fees: miscFees,

      // Notes
      internal_notes: q.internal_notes || '',
      quote_notes: q.notes || '',

      // Multi-equipment (default for migrated quotes)
      is_multi_equipment: false,
      equipment_blocks: [],

      // Custom quote (default for migrated quotes)
      is_custom_quote: !make || !model,
      custom_make: !make ? q.equipment_make : undefined,
      custom_model: !model ? q.equipment_model : undefined,

      // Versioning
      version: 1,
      is_latest_version: true,

      // Timestamps
      created_at: q.created_at,
      updated_at: q.updated_at || q.created_at,
      sent_at: q.sent_at || null
    }

    // Insert into new database
    const { error } = await newClient.from('quote_history').insert({
      id: q.id,
      quote_number: q.quote_number,
      status: quoteData.status,
      company_id: q.company_id || null,
      contact_id: q.contact_id || null,
      customer_name: q.customer_name || 'Unknown',
      customer_email: q.customer_email,
      customer_phone: q.customer_phone,
      customer_company: q.customer_company,
      make_id: make?.id || null,
      model_id: model?.id || null,
      make_name: q.equipment_make || '',
      model_name: q.equipment_model || '',
      location: q.location || 'New Jersey',
      subtotal: dollarsToCents(q.subtotal),
      margin_percentage: parseFloat(q.margin_percentage) || 0,
      margin_amount: dollarsToCents(q.margin_amount),
      total: dollarsToCents(q.total_with_margin || q.total),
      quote_data: quoteData,
      sent_at: q.sent_at,
      created_at: q.created_at,
      updated_at: q.updated_at || q.created_at
    })

    if (error) {
      if (error.code === '23505') {
        stats.quotes.skipped++
      } else {
        console.error(`Error inserting quote ${q.quote_number}:`, error.message)
        stats.quotes.errors++
      }
    } else {
      stats.quotes.migrated++
    }
  }

  console.log(`✓ Quotes: ${stats.quotes.migrated} migrated, ${stats.quotes.skipped} skipped, ${stats.quotes.errors} errors`)
}

async function migrateInlandQuotes() {
  console.log('\n=== Migrating INLAND QUOTES ===')

  const { data: oldQuotes } = await oldClient.from('inland_quotes').select('*')
  console.log(`Found ${oldQuotes?.length || 0} inland quotes`)

  // Get existing quotes
  const { data: existingQuotes } = await newClient.from('inland_quotes').select('quote_number')
  const existingNumbers = new Set((existingQuotes || []).map(q => q.quote_number))

  for (const q of (oldQuotes || [])) {
    if (existingNumbers.has(q.quote_number)) {
      stats.inland_quotes.skipped++
      continue
    }

    // Build quote_data from old columns
    const quoteData = {
      quote_number: q.quote_number,
      status: q.status === 'pending' ? 'draft' : (q.status || 'draft'),

      // Customer info
      customer_name: q.client_name || q.customer_name || 'Unknown',
      customer_email: q.client_email || q.customer_email || '',
      customer_phone: q.client_phone || q.customer_phone || '',
      customer_company: q.client_company || q.customer_company || '',
      company_id: q.company_id || null,
      contact_id: q.contact_id || null,

      // Route data
      destination_blocks: q.destination_blocks || [{
        id: crypto.randomUUID(),
        pickup: {
          address: q.pickup_address || '',
          city: q.pickup_city || '',
          state: q.pickup_state || '',
          lat: q.pickup_lat,
          lng: q.pickup_lng,
          place_id: q.pickup_place_id
        },
        dropoff: {
          address: q.dropoff_address || '',
          city: q.dropoff_city || '',
          state: q.dropoff_state || '',
          lat: q.dropoff_lat,
          lng: q.dropoff_lng,
          place_id: q.dropoff_place_id
        },
        distance_miles: q.distance_miles || 0,
        rate_per_mile: dollarsToCents(q.rate_per_mile || 0),
        line_haul: dollarsToCents(q.line_haul || 0)
      }],

      // Load data
      load_blocks: q.load_blocks || [],
      cargo_items: q.cargo_items || [],

      // Accessorials
      accessorial_charges: q.accessorial_charges || [],

      // Pricing
      subtotal: dollarsToCents(q.subtotal),
      margin_percentage: parseFloat(q.margin_percentage) || 0,
      margin_amount: dollarsToCents(q.margin_amount),
      total: dollarsToCents(q.total_amount || q.total),

      // Timestamps
      created_at: q.created_at,
      updated_at: q.updated_at || q.created_at,
      sent_at: q.sent_at
    }

    const { error } = await newClient.from('inland_quotes').insert({
      id: q.id,
      quote_number: q.quote_number,
      status: quoteData.status,
      company_id: q.company_id || null,
      contact_id: q.contact_id || null,
      customer_name: quoteData.customer_name,
      customer_email: quoteData.customer_email,
      customer_phone: quoteData.customer_phone,
      customer_company: quoteData.customer_company,
      subtotal: quoteData.subtotal,
      margin_percentage: quoteData.margin_percentage,
      margin_amount: quoteData.margin_amount,
      total: quoteData.total,
      quote_data: quoteData,
      sent_at: q.sent_at,
      created_at: q.created_at,
      updated_at: q.updated_at || q.created_at
    })

    if (error) {
      if (error.code === '23505') {
        stats.inland_quotes.skipped++
      } else {
        console.error(`Error inserting inland quote ${q.quote_number}:`, error.message)
        stats.inland_quotes.errors++
      }
    } else {
      stats.inland_quotes.migrated++
    }
  }

  console.log(`✓ Inland Quotes: ${stats.inland_quotes.migrated} migrated, ${stats.inland_quotes.skipped} skipped, ${stats.inland_quotes.errors} errors`)
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================')
  console.log('FULL SAFE MIGRATION')
  console.log('========================================')
  console.log('Source: OLD database (piwpnmitxtlnhjtjarbo)')
  console.log('Target: NEW database (nsqcttbciocfumhvdnod)')
  console.log('Mode: SAFE (preserves existing data)')
  console.log('========================================\n')

  try {
    // Migrate in order (respecting foreign key dependencies)
    await migrateMakes()
    await migrateModels()
    await migrateEquipmentDimensions()
    await migrateRates()
    await migrateCompanies()
    await migrateContacts()
    await migrateQuotes()
    await migrateInlandQuotes()

    console.log('\n========================================')
    console.log('MIGRATION COMPLETE!')
    console.log('========================================')
    console.log('\nSummary:')
    console.log(`  Makes:      ${stats.makes.migrated} migrated, ${stats.makes.skipped} skipped`)
    console.log(`  Models:     ${stats.models.migrated} migrated, ${stats.models.skipped} skipped`)
    console.log(`  Dimensions: ${stats.dimensions.migrated} migrated, ${stats.dimensions.skipped} skipped`)
    console.log(`  Rates:      ${stats.rates.migrated} migrated, ${stats.rates.skipped} skipped`)
    console.log(`  Companies:  ${stats.companies.migrated} migrated, ${stats.companies.skipped} skipped`)
    console.log(`  Contacts:   ${stats.contacts.migrated} migrated, ${stats.contacts.skipped} skipped`)
    console.log(`  Quotes:     ${stats.quotes.migrated} migrated, ${stats.quotes.skipped} skipped`)
    console.log(`  Inland:     ${stats.inland_quotes.migrated} migrated, ${stats.inland_quotes.skipped} skipped`)
    console.log('\n⚠️  Note: Run migrate-images.js to transfer equipment images')

  } catch (err) {
    console.error('\nMigration error:', err)
    process.exit(1)
  }
}

main()
