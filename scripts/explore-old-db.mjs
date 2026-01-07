import pg from 'pg'

const { Client } = pg

const OLD_DB = 'postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres'

const client = new Client({
  connectionString: OLD_DB,
  ssl: { rejectUnauthorized: false }
})

async function explore() {
  try {
    await client.connect()
    console.log('Connected to OLD database!\n')

    // Get all tables
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)

    console.log('=== TABLES IN OLD DATABASE ===')
    for (const row of tables.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${row.tablename}"`)
      const count = countRes.rows[0].count
      console.log(`  ${row.tablename}: ${count} rows`)
    }

    console.log('\n=== SAMPLE DATA ===\n')

    // Check specific tables
    const tablesToCheck = [
      'makes', 'models', 'equipment_dimensions', 'rates',
      'customers', 'companies', 'contacts',
      'quote_history', 'inland_quotes',
      'activity_logs', 'company_settings'
    ]

    for (const table of tablesToCheck) {
      try {
        const sample = await client.query(`SELECT * FROM "${table}" LIMIT 2`)
        if (sample.rows.length > 0) {
          console.log(`--- ${table} (sample) ---`)
          console.log('Columns:', Object.keys(sample.rows[0]).join(', '))
          console.log('Sample:', JSON.stringify(sample.rows[0], null, 2).substring(0, 500))
          console.log('')
        }
      } catch (e) {
        // Table doesn't exist
      }
    }

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

explore()
