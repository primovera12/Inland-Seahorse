/**
 * Script to find missing models from old database and add them to new database
 */

const { createClient } = require('@supabase/supabase-js')

const OLD_SUPABASE_URL = 'https://piwpnmitxtlnhjtjarbo.supabase.co'
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd3BubWl0eHRsbmhqdGphcmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY4OTkxNywiZXhwIjoyMDc5MjY1OTE3fQ.JjV0uLn_Rf1I2x1sVzDHKCukn1RSUgb2uNx1NZdDF6U'

const NEW_SUPABASE_URL = 'https://nsqcttbciocfumhvdnod.supabase.co'
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!NEW_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY)

// List of missing models from the migration output
const missingModels = [
  { make: 'Caterpillar', model: '320' },
  { make: 'Hitachi', model: 'ZX470LC' },
  { make: 'Volvo', model: 'EW170' },
  { make: 'Caterpillar', model: '318' },
  { make: 'Caterpillar', model: '140' },
  { make: 'Volvo', model: 'L150' },
  { make: 'Furukawa', model: 'HCR 900 ES ES20' },
  { make: 'Volvo', model: 'L220H' },
  { make: 'Kawasaki', model: '90Z' },
  { make: 'Caterpillar', model: '14M' },
  { make: 'Hamm', model: 'HD130' },
  { make: 'Komatsu', model: 'PC490' },
  { make: 'Volvo', model: 'L180' },
  { make: 'Wirtgen', model: 'W2000' },
  { make: 'Hamm', model: 'HD140i' },
  { make: 'Caterpillar', model: '235D' },
  { make: 'Komatsu', model: 'WA500' },
  { make: 'Case', model: '580SL' },
  { make: 'Caterpillar', model: '420' },
  { make: 'Volvo', model: 'L120' }
]

async function migrateMissingModels() {
  console.log('🔍 Finding missing models in old database...\n')

  try {
    // Step 1: Get all models with images from old database
    console.log('📋 Step 1: Fetching all models from old database...')
    const { data: oldModelsData, error: oldError } = await oldSupabase
      .from('equipment_dimensions')
      .select(`
        model_id,
        models:model_id (
          id,
          name,
          makes:make_id (
            id,
            name
          )
        )
      `)
      .or('front_image_base64.not.is.null,side_image_base64.not.is.null')

    if (oldError) {
      throw new Error(`Failed to fetch old models: ${oldError.message}`)
    }

    console.log(`✅ Found ${oldModelsData.length} models with images in old database\n`)

    // Step 2: Get existing makes from new database
    console.log('📋 Step 2: Fetching makes from new database...')
    const { data: newMakes, error: makesError } = await newSupabase
      .from('makes')
      .select('id, name')

    if (makesError) {
      throw new Error(`Failed to fetch makes: ${makesError.message}`)
    }

    const makeMap = new Map(newMakes.map(m => [m.name.toLowerCase(), m.id]))
    console.log(`✅ Found ${newMakes.length} makes in new database\n`)

    // Step 3: Process each model from old database
    let added = 0
    let skipped = 0
    let makesAdded = 0

    for (const record of oldModelsData) {
      const oldModel = Array.isArray(record.models) ? record.models[0] : record.models
      if (!oldModel) continue

      const oldMake = Array.isArray(oldModel.makes) ? oldModel.makes[0] : oldModel.makes
      if (!oldMake) continue

      const makeName = oldMake.name
      const modelName = oldModel.name

      // Check if model exists in new database
      const { data: existingModel } = await newSupabase
        .from('models')
        .select('id')
        .eq('name', modelName)
        .maybeSingle()

      if (existingModel) {
        console.log(`⏭️  Skipping ${makeName} ${modelName} (already exists)`)
        skipped++
        continue
      }

      console.log(`\n🔄 Processing ${makeName} ${modelName}`)

      // Check if make exists, if not add it
      let makeId = makeMap.get(makeName.toLowerCase())

      if (!makeId) {
        console.log(`   📝 Adding new make: ${makeName}`)
        const { data: newMake, error: addMakeError } = await newSupabase
          .from('makes')
          .insert({ name: makeName })
          .select()
          .single()

        if (addMakeError) {
          console.error(`   ❌ Failed to add make: ${addMakeError.message}`)
          continue
        }

        makeId = newMake.id
        makeMap.set(makeName.toLowerCase(), makeId)
        makesAdded++
      }

      // Add the model
      console.log(`   📝 Adding model: ${modelName}`)
      const { error: addModelError } = await newSupabase
        .from('models')
        .insert({
          name: modelName,
          make_id: makeId
        })

      if (addModelError) {
        console.error(`   ❌ Failed to add model: ${addModelError.message}`)
        continue
      }

      console.log(`   ✅ Added ${makeName} ${modelName}`)
      added++
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`✅ Makes added: ${makesAdded}`)
    console.log(`✅ Models added: ${added}`)
    console.log(`⏭️  Models skipped (already exist): ${skipped}`)
    console.log('='.repeat(60))
    console.log('\n🎉 Model migration complete!')
    console.log('💡 Now run migrate-images-fixed.js again to migrate the images for these models')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateMissingModels()
