/**
 * Add the specific 20 missing models to the new database
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

const missingModels = [
  'Caterpillar 320',
  'Hitachi ZX470LC',
  'Volvo EW170',
  'Caterpillar 318',
  'Caterpillar 140',
  'Volvo L150',
  'Furukawa HCR 900 ES ES20',
  'Volvo L220H',
  'Kawasaki 90Z',
  'Caterpillar 14M',
  'Hamm HD130',
  'Komatsu PC490',
  'Volvo L180',
  'Wirtgen W2000',
  'Hamm HD140i',
  'Caterpillar 235D',
  'Komatsu WA500',
  'Case 580SL',
  'Caterpillar 420',
  'Volvo L120'
]

async function addMissingModels() {
  console.log('🚀 Adding missing models to new database...\n')

  try {
    // Get all models with makes from old database
    const { data: oldData } = await oldSupabase
      .from('equipment_dimensions')
      .select(`
        model_id,
        models:model_id (
          name,
          makes:make_id (
            name
          )
        )
      `)
      .or('front_image_base64.not.is.null,side_image_base64.not.is.null')

    // Get existing makes from new database
    const { data: newMakes } = await newSupabase
      .from('makes')
      .select('id, name')

    const makeMap = new Map(newMakes.map(m => [m.name.toLowerCase(), m.id]))

    let added = 0
    let makesAdded = 0
    let failed = 0

    for (const record of oldData) {
      const oldModel = Array.isArray(record.models) ? record.models[0] : record.models
      if (!oldModel) continue

      const oldMake = Array.isArray(oldModel.makes) ? oldModel.makes[0] : oldModel.makes
      if (!oldMake) continue

      const makeName = oldMake.name
      const modelName = oldModel.name
      const fullName = `${makeName} ${modelName}`

      // Skip if not in our missing list
      if (!missingModels.includes(fullName)) continue

      console.log(`\n🔄 Adding ${fullName}`)

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
          failed++
          continue
        }

        makeId = newMake.id
        makeMap.set(makeName.toLowerCase(), makeId)
        makesAdded++
      }

      // Add the model
      const { error: addModelError } = await newSupabase
        .from('models')
        .insert({
          name: modelName,
          make_id: makeId
        })

      if (addModelError) {
        console.error(`   ❌ Failed to add model: ${addModelError.message}`)
        failed++
        continue
      }

      console.log(`   ✅ Added successfully`)
      added++
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary')
    console.log('='.repeat(60))
    console.log(`✅ Makes added: ${makesAdded}`)
    console.log(`✅ Models added: ${added}`)
    console.log(`❌ Failed: ${failed}`)
    console.log('='.repeat(60))

    if (added > 0) {
      console.log('\n🎉 Models added successfully!')
      console.log('💡 Now run migrate-images-fixed.js to migrate the images')
    }

  } catch (error) {
    console.error('\n❌ Failed:', error.message)
    process.exit(1)
  }
}

addMissingModels()
