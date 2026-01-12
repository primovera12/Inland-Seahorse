/**
 * Debug script to compare model names between old and new databases
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

async function debugMatching() {
  console.log('🔍 Debugging model name matching...\n')

  try {
    // Get models with images from old database
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

    // Get all models from new database
    const { data: newModels } = await newSupabase
      .from('models')
      .select(`
        id,
        name,
        makes:make_id (
          name
        )
      `)

    // Create lookup map
    const newModelMap = new Map()
    newModels.forEach(model => {
      const makeArray = Array.isArray(model.makes) ? model.makes : [model.makes]
      const makeName = makeArray[0]?.name
      const key = `${makeName}::${model.name}`.toLowerCase()
      newModelMap.set(key, model.id)
    })

    console.log('📊 Old models with images:')
    console.log('='.repeat(80))

    for (const record of oldData) {
      const oldModel = Array.isArray(record.models) ? record.models[0] : record.models
      if (!oldModel) continue

      const oldMake = Array.isArray(oldModel.makes) ? oldModel.makes[0] : oldModel.makes
      if (!oldMake) continue

      const makeName = oldMake.name
      const modelName = oldModel.name
      const lookupKey = `${makeName}::${modelName}`.toLowerCase()
      const found = newModelMap.has(lookupKey)

      console.log(`${found ? '✅' : '❌'} ${makeName} ${modelName}`)
      console.log(`   Lookup key: "${lookupKey}"`)
      console.log(`   Found in new DB: ${found}`)

      if (!found) {
        // Try to find similar models
        const similarKeys = Array.from(newModelMap.keys()).filter(key =>
          key.includes(modelName.toLowerCase()) ||
          key.includes(makeName.toLowerCase())
        )
        if (similarKeys.length > 0) {
          console.log(`   Similar keys in new DB:`)
          similarKeys.slice(0, 3).forEach(key => console.log(`      - "${key}"`))
        }
      }
      console.log()
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugMatching()
