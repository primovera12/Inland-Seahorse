import pg from 'pg'

const { Client } = pg

const OLD_DB = 'postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres'
const NEW_DB = 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres'

const oldClient = new Client({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } })
const newClient = new Client({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } })

// Convert feet to inches
function feetToInches(feet) {
  if (!feet) return 0
  return Math.round(parseFloat(feet) * 12)
}

// Convert dollars to cents
function dollarsToCents(dollars) {
  if (!dollars) return 0
  return Math.round(parseFloat(dollars) * 100)
}

async function migrate() {
  try {
    console.log('Connecting to databases...')
    await oldClient.connect()
    await newClient.connect()
    console.log('Connected!\n')

    // ========================================
    // 1. MIGRATE MAKES
    // ========================================
    console.log('=== Migrating MAKES ===')

    // Clear existing makes in new DB (except keep the ones we seeded if they match)
    await newClient.query('DELETE FROM rates')
    await newClient.query('DELETE FROM equipment_dimensions')
    await newClient.query('DELETE FROM models')
    await newClient.query('DELETE FROM makes')

    const oldMakes = await oldClient.query('SELECT * FROM makes ORDER BY name')
    console.log(`Found ${oldMakes.rows.length} makes`)

    for (const make of oldMakes.rows) {
      await newClient.query(
        'INSERT INTO makes (id, name, created_at, updated_at) VALUES ($1, $2, $3, $3)',
        [make.id, make.name, make.created_at]
      )
    }
    console.log('✓ Makes migrated\n')

    // ========================================
    // 2. MIGRATE MODELS
    // ========================================
    console.log('=== Migrating MODELS ===')
    const oldModels = await oldClient.query('SELECT * FROM models ORDER BY name')
    console.log(`Found ${oldModels.rows.length} models`)

    let modelCount = 0
    for (const model of oldModels.rows) {
      try {
        await newClient.query(
          'INSERT INTO models (id, make_id, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)',
          [model.id, model.make_id, model.name, model.created_at]
        )
        modelCount++
      } catch (e) {
        // Skip duplicates or invalid foreign keys
      }
    }
    console.log(`✓ ${modelCount} models migrated\n`)

    // ========================================
    // 3. MIGRATE EQUIPMENT DIMENSIONS
    // ========================================
    console.log('=== Migrating EQUIPMENT DIMENSIONS ===')
    const oldDimensions = await oldClient.query('SELECT * FROM equipment_dimensions')
    console.log(`Found ${oldDimensions.rows.length} dimension records`)

    let dimCount = 0
    for (const dim of oldDimensions.rows) {
      try {
        await newClient.query(`
          INSERT INTO equipment_dimensions (
            id, model_id, length_inches, width_inches, height_inches, weight_lbs,
            front_image_url, side_image_url, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        `, [
          dim.id,
          dim.model_id,
          feetToInches(dim.transport_length),
          feetToInches(dim.transport_width),
          feetToInches(dim.transport_height),
          Math.round(parseFloat(dim.shipping_weight || dim.operating_weight) || 0),
          dim.front_image_base64 ? 'migrated' : null, // Store base64 separately if needed
          dim.side_image_base64 ? 'migrated' : null,
          dim.created_at
        ])
        dimCount++
      } catch (e) {
        // Skip invalid records
      }
    }
    console.log(`✓ ${dimCount} dimension records migrated\n`)

    // ========================================
    // 4. MIGRATE LOCATION COSTS TO RATES
    // ========================================
    console.log('=== Migrating RATES (from location_costs) ===')

    // Get location costs with model info via rates table
    const locationCosts = await oldClient.query(`
      SELECT lc.*, r.make_id, r.model_id
      FROM location_costs lc
      JOIN rates r ON r.id = lc.rate_id
    `)
    console.log(`Found ${locationCosts.rows.length} location cost records`)

    let rateCount = 0
    for (const lc of locationCosts.rows) {
      try {
        // Map old column names to new schema
        // Old: local_drayage_cost, dismantling_loading_cost, loading_cost, blocking_bracing_cost, etc.
        // New: dismantling_loading_cost, loading_cost, blocking_bracing_cost, rigging_cost, etc.
        await newClient.query(`
          INSERT INTO rates (
            make_id, model_id, location,
            dismantling_loading_cost, loading_cost, blocking_bracing_cost,
            rigging_cost, storage_cost, transport_cost, equipment_cost,
            labor_cost, permit_cost, escort_cost, miscellaneous_cost,
            created_at, updated_at
          ) VALUES ($1, $2, $3::location_name, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
          ON CONFLICT (model_id, location) DO UPDATE SET
            dismantling_loading_cost = EXCLUDED.dismantling_loading_cost,
            loading_cost = EXCLUDED.loading_cost,
            blocking_bracing_cost = EXCLUDED.blocking_bracing_cost
        `, [
          lc.make_id,
          lc.model_id,
          lc.location,
          dollarsToCents(lc.dismantling_loading_cost || lc.local_drayage_cost),
          dollarsToCents(lc.loading_cost),
          dollarsToCents(lc.blocking_bracing_cost),
          0, // rigging
          0, // storage
          dollarsToCents(lc.local_drayage_cost), // transport = local drayage
          dollarsToCents(lc.chassis_cost), // equipment = chassis
          0, // labor
          dollarsToCents(lc.tolls_cost), // permit = tolls
          dollarsToCents(lc.escorts_cost), // escort
          dollarsToCents(lc.miscellaneous_costs), // misc
          lc.created_at || new Date().toISOString()
        ])
        rateCount++
      } catch (e) {
        // Skip invalid records (e.g., location not in enum)
        if (!e.message.includes('invalid input value')) {
          console.log(`  Skipped rate: ${e.message}`)
        }
      }
    }
    console.log(`✓ ${rateCount} rate records migrated\n`)

    // ========================================
    // 5. MIGRATE COMPANIES (merge customers + companies)
    // ========================================
    console.log('=== Migrating COMPANIES ===')

    // Clear existing
    await newClient.query('DELETE FROM activity_logs')
    await newClient.query('DELETE FROM follow_up_reminders')
    await newClient.query('DELETE FROM contacts')
    await newClient.query('DELETE FROM companies')

    // First, migrate the companies table
    const oldCompanies = await oldClient.query('SELECT * FROM companies')
    console.log(`Found ${oldCompanies.rows.length} companies`)

    for (const c of oldCompanies.rows) {
      await newClient.query(`
        INSERT INTO companies (
          id, name, industry, website, phone,
          address, city, state, zip,
          billing_address, billing_city, billing_state, billing_zip,
          payment_terms, tax_id, tags, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
      `, [
        c.id, c.name, c.industry, c.website, c.phone,
        c.address, c.city, c.state, c.zip,
        c.billing_address, c.billing_city, c.billing_state, c.billing_zip,
        c.payment_terms || 'Net 30', c.tax_id, c.tags || [], c.status || 'active',
        c.created_at
      ])
    }

    // Then migrate customers (as companies without duplicates)
    const oldCustomers = await oldClient.query('SELECT * FROM customers')
    console.log(`Found ${oldCustomers.rows.length} customers`)

    let custCount = 0
    for (const cust of oldCustomers.rows) {
      // Check if company with same name exists
      const existing = await newClient.query(
        'SELECT id FROM companies WHERE LOWER(name) = LOWER($1)',
        [cust.company || cust.name]
      )

      if (existing.rows.length === 0) {
        await newClient.query(`
          INSERT INTO companies (
            id, name, phone, address,
            billing_address, billing_city, billing_state, billing_zip,
            payment_terms, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $10)
        `, [
          cust.id,
          cust.company || cust.name,
          cust.phone,
          cust.address,
          cust.billing_address,
          cust.billing_city,
          cust.billing_state,
          cust.billing_zip,
          cust.payment_terms || 'Net 30',
          cust.created_at
        ])
        custCount++
      }
    }
    console.log(`✓ Companies migrated (${oldCompanies.rows.length} companies + ${custCount} customers)\n`)

    // ========================================
    // 6. MIGRATE CONTACTS
    // ========================================
    console.log('=== Migrating CONTACTS ===')
    const oldContacts = await oldClient.query('SELECT * FROM contacts')
    console.log(`Found ${oldContacts.rows.length} contacts`)

    for (const contact of oldContacts.rows) {
      try {
        await newClient.query(`
          INSERT INTO contacts (
            id, company_id, first_name, last_name, email, phone, mobile,
            title, role, is_primary, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        `, [
          contact.id, contact.company_id, contact.first_name, contact.last_name,
          contact.email, contact.phone, contact.mobile, contact.title,
          contact.role || 'general', contact.is_primary || false, contact.notes,
          contact.created_at
        ])
      } catch (e) {
        // Skip if company doesn't exist
      }
    }
    console.log('✓ Contacts migrated\n')

    // ========================================
    // 7. MIGRATE QUOTE HISTORY
    // ========================================
    console.log('=== Migrating QUOTE HISTORY ===')

    await newClient.query('DELETE FROM quote_history')

    const oldQuotes = await oldClient.query('SELECT * FROM quote_history')
    console.log(`Found ${oldQuotes.rows.length} quotes`)

    for (const q of oldQuotes.rows) {
      try {
        // Build quote_data JSON from old columns
        const quoteData = {
          base_price: q.base_price,
          location: q.location,
          costs: {
            dismantling_loading_cost: dollarsToCents(q.dismantling_loading_cost),
            loading_cost: dollarsToCents(q.loading_cost),
            blocking_bracing_cost: dollarsToCents(q.blocking_bracing_cost),
          },
          miscellaneous_fees: q.miscellaneous_fees_json ? JSON.parse(q.miscellaneous_fees_json) : [],
          notes: q.notes,
          internal_notes: q.internal_notes,
          // Preserve original data
          _migrated_from: q
        }

        await newClient.query(`
          INSERT INTO quote_history (
            id, quote_number, status,
            company_id, contact_id, customer_name, customer_email,
            make_name, model_name, location,
            subtotal, margin_percentage, margin_amount, total,
            quote_data, sent_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
        `, [
          q.id,
          q.quote_number,
          q.status || 'draft',
          q.company_id,
          q.contact_id,
          q.customer_name || 'Unknown',
          q.customer_email,
          q.equipment_make,
          q.equipment_model,
          q.location || 'New Jersey',
          dollarsToCents(q.subtotal),
          parseFloat(q.margin_percentage) || 0,
          dollarsToCents(q.margin_amount),
          dollarsToCents(q.total_with_margin),
          JSON.stringify(quoteData),
          q.sent_at,
          q.created_at
        ])
      } catch (e) {
        console.log(`  Skipped quote ${q.quote_number}: ${e.message}`)
      }
    }
    console.log('✓ Quote history migrated\n')

    // ========================================
    // 8. MIGRATE INLAND QUOTES
    // ========================================
    console.log('=== Migrating INLAND QUOTES ===')

    await newClient.query('DELETE FROM inland_quotes')

    const oldInland = await oldClient.query('SELECT * FROM inland_quotes')
    console.log(`Found ${oldInland.rows.length} inland quotes`)

    for (const iq of oldInland.rows) {
      try {
        const quoteData = {
          pickup: {
            address: iq.pickup_address,
            city: iq.pickup_city,
            state: iq.pickup_state,
            lat: iq.pickup_lat,
            lng: iq.pickup_lng
          },
          dropoff: {
            address: iq.dropoff_address,
            city: iq.dropoff_city,
            state: iq.dropoff_state,
            lat: iq.dropoff_lat,
            lng: iq.dropoff_lng
          },
          distance_miles: iq.distance_miles,
          load_blocks: iq.load_blocks,
          cargo_items: iq.cargo_items,
          accessorial_charges: iq.accessorial_charges,
          _migrated_from: iq
        }

        await newClient.query(`
          INSERT INTO inland_quotes (
            id, quote_number, status,
            company_id, contact_id, customer_name, customer_email, customer_phone,
            subtotal, margin_percentage, margin_amount, total,
            quote_data, sent_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
        `, [
          iq.id,
          iq.quote_number,
          iq.status || 'draft',
          iq.company_id,
          iq.contact_id,
          iq.client_name,
          iq.client_email,
          iq.client_phone,
          dollarsToCents(iq.subtotal),
          parseFloat(iq.margin_percentage) || 0,
          dollarsToCents(iq.margin_amount),
          dollarsToCents(iq.total_amount),
          JSON.stringify(quoteData),
          iq.sent_at,
          iq.created_at
        ])
      } catch (e) {
        console.log(`  Skipped inland quote ${iq.quote_number}: ${e.message}`)
      }
    }
    console.log('✓ Inland quotes migrated\n')

    // ========================================
    // 9. MIGRATE COMPANY SETTINGS
    // ========================================
    console.log('=== Migrating COMPANY SETTINGS ===')

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
          company_logo_url = $6,
          primary_color = $7,
          quote_validity_days = $8
      `, [
        s.company_name,
        s.company_address,
        s.company_phone,
        s.company_email,
        s.company_website,
        s.logo_base64 ? 'has_logo' : null, // Store base64 separately if needed
        s.primary_color || '#6366F1',
        s.quote_validity_days || 30
      ])
      console.log('✓ Company settings migrated\n')
    }

    // ========================================
    // 10. MIGRATE INLAND EQUIPMENT TYPES
    // ========================================
    console.log('=== Migrating INLAND EQUIPMENT TYPES ===')

    await newClient.query('DELETE FROM inland_equipment_types')

    const oldEquipTypes = await oldClient.query('SELECT * FROM inland_equipment_types')
    for (const et of oldEquipTypes.rows) {
      await newClient.query(`
        INSERT INTO inland_equipment_types (
          id, name, description,
          max_length_inches, max_width_inches, max_height_inches, max_weight_lbs,
          legal_length_inches, legal_width_inches, legal_height_inches, legal_weight_lbs,
          is_active, sort_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      `, [
        et.id, et.name, et.description,
        et.max_length_inches || 636, et.max_width_inches || 102,
        et.max_height_inches || 102, et.max_weight_lbs || 48000,
        et.legal_length_inches || 636, et.legal_width_inches || 102,
        et.legal_height_inches || 102, et.legal_weight_lbs || 48000,
        et.is_active !== false, et.sort_order || 0, et.created_at || new Date().toISOString()
      ])
    }
    console.log(`✓ ${oldEquipTypes.rows.length} equipment types migrated\n`)

    // ========================================
    // 11. MIGRATE INLAND ACCESSORIAL TYPES
    // ========================================
    console.log('=== Migrating INLAND ACCESSORIAL TYPES ===')

    await newClient.query('DELETE FROM inland_accessorial_types')

    const oldAccessorials = await oldClient.query('SELECT * FROM inland_accessorial_types')
    for (const at of oldAccessorials.rows) {
      await newClient.query(`
        INSERT INTO inland_accessorial_types (
          id, name, description, default_rate, billing_unit, is_active, sort_order,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      `, [
        at.id, at.name, at.description,
        dollarsToCents(at.default_rate),
        at.billing_unit || 'flat',
        at.is_active !== false,
        at.sort_order || 0,
        at.created_at || new Date().toISOString()
      ])
    }
    console.log(`✓ ${oldAccessorials.rows.length} accessorial types migrated\n`)

    // ========================================
    // 12. MIGRATE RATE TIERS
    // ========================================
    console.log('=== Migrating RATE TIERS ===')

    await newClient.query('DELETE FROM inland_rate_tiers')

    const oldTiers = await oldClient.query('SELECT * FROM rate_tiers')
    for (const tier of oldTiers.rows) {
      await newClient.query(`
        INSERT INTO inland_rate_tiers (
          id, name, min_miles, max_miles, rate_per_mile, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      `, [
        tier.id, tier.name, tier.min_miles, tier.max_miles,
        dollarsToCents(tier.rate_per_mile),
        tier.is_active !== false,
        tier.created_at || new Date().toISOString()
      ])
    }
    console.log(`✓ ${oldTiers.rows.length} rate tiers migrated\n`)

    // ========================================
    // SUMMARY
    // ========================================
    console.log('========================================')
    console.log('MIGRATION COMPLETE!')
    console.log('========================================')

    // Count new data
    const counts = await newClient.query(`
      SELECT
        (SELECT COUNT(*) FROM makes) as makes,
        (SELECT COUNT(*) FROM models) as models,
        (SELECT COUNT(*) FROM equipment_dimensions) as dimensions,
        (SELECT COUNT(*) FROM rates) as rates,
        (SELECT COUNT(*) FROM companies) as companies,
        (SELECT COUNT(*) FROM contacts) as contacts,
        (SELECT COUNT(*) FROM quote_history) as quotes,
        (SELECT COUNT(*) FROM inland_quotes) as inland_quotes
    `)

    console.log('New database counts:')
    console.log(counts.rows[0])

  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await oldClient.end()
    await newClient.end()
  }
}

migrate()
