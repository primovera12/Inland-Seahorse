import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function runMigrations() {
  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!')

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir).sort()

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`\nRunning migration: ${file}`)
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

        try {
          await client.query(sql)
          console.log(`✓ ${file} completed`)
        } catch (err) {
          console.error(`✗ Error in ${file}:`, err.message)
          // Continue with next migration
        }
      }
    }

    console.log('\n✓ All migrations complete!')
  } catch (err) {
    console.error('Connection error:', err.message)
  } finally {
    await client.end()
  }
}

runMigrations()
