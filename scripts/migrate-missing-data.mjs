import pg from 'pg'

const { Client } = pg

const OLD_DB = 'postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres'
const NEW_DB = 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres'

const oldClient = new Client({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } })
const newClient = new Client({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } })

async function migrate() {
  await oldClient.connect()
  await newClient.connect()

  console.log('=== MIGRATING MISSING DATA ===\n')

  // ========================================
  // 1. MIGRATE QUOTE DRAFTS (pack into JSONB)
  // ========================================
  console.log('=== Migrating QUOTE_DRAFTS ===')

  const drafts = await oldClient.query('SELECT * FROM quote_drafts')
  console.log(`Found ${drafts.rows.length} quote drafts`)

  let draftCount = 0
  for (const draft of drafts.rows) {
    try {
      // Pack all old data into quote_data JSONB
      const quoteData = {
        rate_id: draft.rate_id,
        equipment_make: draft.equipment_make,
        equipment_model: draft.equipment_model,
        location: draft.location,
        customer_id: draft.customer_id,
        customer_name: draft.customer_name,
        customer_email: draft.customer_email,
        cost_overrides: draft.cost_overrides,
        enabled_costs: draft.enabled_costs,
        cost_descriptions: draft.cost_descriptions,
        miscellaneous_fees: draft.miscellaneous_fees,
        margin_percentage: draft.margin_percentage,
        expiration_days: draft.expiration_days,
        internal_notes: draft.internal_notes
      }

      await newClient.query(`
        INSERT INTO quote_drafts (id, user_id, quote_data, last_saved_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET quote_data = $3, last_saved_at = $4
      `, [
        draft.id,
        null, // user_id - will need to be assigned later
        JSON.stringify(quoteData),
        draft.updated_at || draft.created_at,
        draft.created_at
      ])
      draftCount++
    } catch (e) {
      console.log(`  Draft error: ${e.message}`)
    }
  }
  console.log(`✓ ${draftCount} quote drafts migrated\n`)

  // ========================================
  // 2. UPDATE COMPANY SETTINGS
  // ========================================
  console.log('=== Updating COMPANY_SETTINGS ===')

  const oldSettings = await oldClient.query('SELECT * FROM company_settings LIMIT 1')
  if (oldSettings.rows.length > 0) {
    const s = oldSettings.rows[0]
    await newClient.query(`
      UPDATE company_settings SET
        company_name = $1,
        company_address = $2,
        company_phone = $3,
        company_email = $4,
        company_website = $5,
        logo_base64 = $6,
        logo_width = $7,
        logo_height = $8,
        logo_width_percent = $9,
        primary_color = $10,
        secondary_color = $11,
        accent_color = $12,
        show_company_address = $13,
        show_company_phone = $14,
        show_company_email = $15,
        quote_validity_days = $16,
        footer_text = $17,
        terms_and_conditions = $18,
        dimension_threshold_length = $19,
        dimension_threshold_width = $20,
        dimension_threshold_height = $21,
        updated_at = NOW()
    `, [
      s.company_name,
      s.company_address,
      s.company_phone,
      s.company_email,
      s.company_website,
      s.logo_base64,
      s.logo_width,
      s.logo_height,
      s.logo_width_percent,
      s.primary_color,
      s.secondary_color,
      s.accent_color,
      s.show_company_address,
      s.show_company_phone,
      s.show_company_email,
      s.quote_validity_days,
      s.footer_text,
      s.terms_and_conditions,
      s.dimension_threshold_length,
      s.dimension_threshold_width,
      s.dimension_threshold_height
    ])
    console.log(`✓ Company settings updated: ${s.company_name}\n`)
  }

  // ========================================
  // 3. MIGRATE FUEL SURCHARGE DATA
  // ========================================
  console.log('=== Migrating FUEL_SURCHARGE_INDEX ===')
  const fuelIndex = await oldClient.query('SELECT * FROM fuel_surcharge_index')
  let fuelCount = 0
  for (const f of fuelIndex.rows) {
    try {
      await newClient.query(`
        INSERT INTO fuel_surcharge_index (id, effective_date, doe_price_per_gallon, surcharge_percent, region, source_url, notes, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [f.id, f.effective_date, f.doe_price_per_gallon, f.surcharge_percent, f.region, f.source_url, f.notes, f.is_active, f.created_at])
      fuelCount++
    } catch (e) {
      console.log(`  Fuel index error: ${e.message}`)
    }
  }
  console.log(`✓ ${fuelCount} fuel surcharge records migrated\n`)

  console.log('=== Migrating FUEL_SURCHARGE_SETTINGS ===')
  const fuelSettings = await oldClient.query('SELECT * FROM fuel_surcharge_settings LIMIT 1')
  if (fuelSettings.rows.length > 0) {
    const fs = fuelSettings.rows[0]
    await newClient.query(`
      INSERT INTO fuel_surcharge_settings (id, base_fuel_price, increment_per_cent, min_surcharge, max_surcharge, auto_update_enabled, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        base_fuel_price = $2, increment_per_cent = $3, min_surcharge = $4, max_surcharge = $5
    `, [fs.id, fs.base_fuel_price, fs.increment_per_cent, fs.min_surcharge, fs.max_surcharge, fs.auto_update_enabled, fs.last_updated])
    console.log(`✓ Fuel surcharge settings migrated\n`)
  }

  // ========================================
  // 4. MIGRATE INLAND RATE SETTINGS
  // ========================================
  console.log('=== Migrating INLAND_RATE_SETTINGS ===')
  const inlandSettings = await oldClient.query('SELECT * FROM inland_rate_settings LIMIT 1')
  if (inlandSettings.rows.length > 0) {
    const is = inlandSettings.rows[0]
    await newClient.query(`
      INSERT INTO inland_rate_settings (id, default_rate_per_mile, minimum_charge, fuel_surcharge_enabled, fuel_surcharge_percent, default_margin_percent, default_validity_days, rate_tiers, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        default_rate_per_mile = $2, minimum_charge = $3, fuel_surcharge_enabled = $4, fuel_surcharge_percent = $5
    `, [is.id, is.default_rate_per_mile, is.minimum_charge, is.fuel_surcharge_enabled, is.fuel_surcharge_percent, is.default_margin_percent, is.default_validity_days, JSON.stringify(is.rate_tiers || []), is.updated_at])
    console.log(`✓ Inland rate settings migrated\n`)
  }

  // ========================================
  // 5. MIGRATE PERMIT TYPES
  // ========================================
  console.log('=== Migrating PERMIT_TYPES ===')
  const permits = await oldClient.query('SELECT * FROM permit_types')
  let permitCount = 0
  for (const p of permits.rows) {
    try {
      await newClient.query(`
        INSERT INTO permit_types (id, name, code, description, typical_cost, typical_processing_days, required_for_overweight, required_for_oversize, states_required, is_active, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.name, p.code, p.description, p.typical_cost, p.typical_processing_days, p.required_for_overweight, p.required_for_oversize, p.states_required, p.is_active, p.sort_order, p.created_at])
      permitCount++
    } catch (e) {
      console.log(`  Permit error: ${e.message}`)
    }
  }
  console.log(`✓ ${permitCount} permit types migrated\n`)

  // ========================================
  // 6. MIGRATE INLAND SERVICE TYPES
  // ========================================
  console.log('=== Migrating INLAND_SERVICE_TYPES ===')
  const services = await oldClient.query('SELECT * FROM inland_service_types')
  let serviceCount = 0
  for (const sv of services.rows) {
    try {
      await newClient.query(`
        INSERT INTO inland_service_types (id, name, description, default_price, is_active, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [sv.id, sv.name, sv.description, sv.default_price, sv.is_active, sv.sort_order, sv.created_at, sv.updated_at])
      serviceCount++
    } catch (e) {
      console.log(`  Service type error: ${e.message}`)
    }
  }
  console.log(`✓ ${serviceCount} service types migrated\n`)

  // ========================================
  // 7. MIGRATE INLAND LOAD TYPES
  // ========================================
  console.log('=== Migrating INLAND_LOAD_TYPES ===')
  const loads = await oldClient.query('SELECT DISTINCT ON (name) * FROM inland_load_types')
  let loadCount = 0
  for (const l of loads.rows) {
    try {
      await newClient.query(`
        INSERT INTO inland_load_types (id, name, description, is_active, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [l.id, l.name, l.description, l.is_active, l.sort_order, l.created_at])
      loadCount++
    } catch (e) {
      console.log(`  Load type error: ${e.message}`)
    }
  }
  console.log(`✓ ${loadCount} load types migrated\n`)

  // ========================================
  // 8. MIGRATE EQUIPMENT TYPES
  // ========================================
  console.log('=== Migrating EQUIPMENT_TYPES ===')
  const eqTypes = await oldClient.query('SELECT * FROM equipment_types')
  let eqCount = 0
  for (const eq of eqTypes.rows) {
    try {
      await newClient.query(`
        INSERT INTO equipment_types (id, name, description, is_active, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [eq.id, eq.name, eq.description, eq.is_active, eq.sort_order, eq.created_at])
      eqCount++
    } catch (e) {
      if (e.message.includes('unique')) {
        // Name already exists, skip
      } else {
        console.log(`  Equipment type error: ${e.message}`)
      }
    }
  }
  console.log(`✓ ${eqCount} equipment types migrated\n`)

  // ========================================
  // 9. MIGRATE CUSTOM FIELDS
  // ========================================
  console.log('=== Migrating CUSTOM_FIELDS ===')
  const customFields = await oldClient.query('SELECT * FROM custom_fields')
  let cfCount = 0
  for (const cf of customFields.rows) {
    try {
      await newClient.query(`
        INSERT INTO custom_fields (id, table_name, field_name, field_type, display_name, description, is_required, default_value, validation_regex, options, sort_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [cf.id, cf.table_name, cf.field_name, cf.field_type, cf.display_name, cf.description, cf.is_required, cf.default_value, cf.validation_regex, cf.options ? JSON.stringify(cf.options) : null, cf.sort_order, cf.is_active, cf.created_at, cf.updated_at])
      cfCount++
    } catch (e) {
      console.log(`  Custom field error: ${e.message}`)
    }
  }
  console.log(`✓ ${cfCount} custom fields migrated\n`)

  // ========================================
  // 10. MIGRATE TICKETS
  // ========================================
  console.log('=== Migrating TICKETS ===')
  const tickets = await oldClient.query('SELECT * FROM tickets')
  let ticketCount = 0
  for (const t of tickets.rows) {
    try {
      await newClient.query(`
        INSERT INTO tickets (id, ticket_number, title, description, type, status, priority, page, screenshot_base64, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [t.id, t.ticket_number, t.title, t.description, t.type, t.status, t.priority, t.page, t.screenshot_base64, t.created_at, t.updated_at])
      ticketCount++
    } catch (e) {
      console.log(`  Ticket error: ${e.message}`)
    }
  }
  console.log(`✓ ${ticketCount} tickets migrated\n`)

  // ========================================
  // 11. CHECK MISSING CONTACTS
  // ========================================
  console.log('=== Checking CONTACTS ===')
  const oldContacts = await oldClient.query('SELECT * FROM contacts')
  const newContacts = await newClient.query('SELECT id FROM contacts')
  const newContactIds = new Set(newContacts.rows.map(r => r.id))

  let contactCount = 0
  for (const contact of oldContacts.rows) {
    if (!newContactIds.has(contact.id)) {
      console.log(`Missing contact: ${contact.first_name} ${contact.last_name} (${contact.email})`)
      const companyCheck = await newClient.query('SELECT id FROM companies WHERE id = $1', [contact.company_id])

      if (companyCheck.rows.length > 0) {
        try {
          await newClient.query(`
            INSERT INTO contacts (id, company_id, first_name, last_name, email, phone, role, is_primary, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            contact.id,
            contact.company_id,
            contact.first_name,
            contact.last_name,
            contact.email,
            contact.phone,
            contact.role || 'general',
            contact.is_primary || false,
            contact.notes,
            contact.created_at
          ])
          contactCount++
          console.log(`  ✓ Added missing contact`)
        } catch (e) {
          console.log(`  Error adding contact: ${e.message}`)
        }
      } else {
        console.log(`  Company ${contact.company_id} not found, skipping`)
      }
    }
  }
  console.log(`✓ ${contactCount} missing contacts added\n`)

  // ========================================
  // FINAL COUNTS
  // ========================================
  const counts = await newClient.query(`
    SELECT
      (SELECT COUNT(*) FROM makes) as makes,
      (SELECT COUNT(*) FROM models) as models,
      (SELECT COUNT(*) FROM equipment_dimensions) as dimensions,
      (SELECT COUNT(*) FROM rates) as rates,
      (SELECT COUNT(*) FROM companies) as companies,
      (SELECT COUNT(*) FROM contacts) as contacts,
      (SELECT COUNT(*) FROM quote_history) as quotes,
      (SELECT COUNT(*) FROM quote_drafts) as drafts,
      (SELECT COUNT(*) FROM inland_quotes) as inland_quotes,
      (SELECT COUNT(*) FROM inland_rate_tiers) as rate_tiers,
      (SELECT COUNT(*) FROM inland_equipment_types) as inland_equipment_types,
      (SELECT COUNT(*) FROM inland_accessorial_types) as accessorial_types,
      (SELECT COUNT(*) FROM company_settings) as company_settings,
      (SELECT COUNT(*) FROM fuel_surcharge_index) as fuel_surcharge_index,
      (SELECT COUNT(*) FROM fuel_surcharge_settings) as fuel_surcharge_settings,
      (SELECT COUNT(*) FROM inland_rate_settings) as inland_rate_settings,
      (SELECT COUNT(*) FROM permit_types) as permit_types,
      (SELECT COUNT(*) FROM inland_service_types) as inland_service_types,
      (SELECT COUNT(*) FROM inland_load_types) as inland_load_types,
      (SELECT COUNT(*) FROM equipment_types) as equipment_types,
      (SELECT COUNT(*) FROM custom_fields) as custom_fields,
      (SELECT COUNT(*) FROM tickets) as tickets
  `)

  console.log('========================================')
  console.log('MIGRATION COMPLETE!')
  console.log('========================================')
  console.log('New database counts:')
  Object.entries(counts.rows[0]).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })

  await oldClient.end()
  await newClient.end()
}

migrate().catch(console.error)
