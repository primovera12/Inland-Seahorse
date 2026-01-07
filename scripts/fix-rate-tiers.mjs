import pg from 'pg'

const { Client } = pg

const OLD_DB = 'postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres'
const NEW_DB = 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres'

const oldClient = new Client({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } })
const newClient = new Client({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } })

async function fix() {
  await oldClient.connect()
  await newClient.connect()

  // Delete existing rate tiers
  await newClient.query('DELETE FROM inland_rate_tiers')

  // Get old tiers
  const tiers = await oldClient.query('SELECT * FROM rate_tiers')

  for (const tier of tiers.rows) {
    await newClient.query(
      `INSERT INTO inland_rate_tiers (id, name, min_miles, max_miles, rate_per_mile, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tier.id,
        tier.name,
        tier.min_miles || 0,
        tier.max_miles || 99999, // Use 99999 if null (for 'Cross Country 1000+')
        Math.round((tier.rate_per_mile || 0) * 100), // Convert to cents
        tier.is_active !== false
      ]
    )
    console.log('Added tier:', tier.name)
  }

  // Verify migration
  const counts = await newClient.query(`
    SELECT
      (SELECT COUNT(*) FROM makes) as makes,
      (SELECT COUNT(*) FROM models) as models,
      (SELECT COUNT(*) FROM equipment_dimensions) as dimensions,
      (SELECT COUNT(*) FROM rates) as rates,
      (SELECT COUNT(*) FROM companies) as companies,
      (SELECT COUNT(*) FROM contacts) as contacts,
      (SELECT COUNT(*) FROM quote_history) as quotes,
      (SELECT COUNT(*) FROM inland_quotes) as inland_quotes,
      (SELECT COUNT(*) FROM inland_rate_tiers) as rate_tiers,
      (SELECT COUNT(*) FROM inland_equipment_types) as equipment_types,
      (SELECT COUNT(*) FROM inland_accessorial_types) as accessorial_types
  `)

  console.log('\n========================================')
  console.log('MIGRATION COMPLETE!')
  console.log('========================================')
  console.log('New database counts:')
  Object.entries(counts.rows[0]).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })

  await oldClient.end()
  await newClient.end()
}

fix()
