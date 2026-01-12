/**
 * FIXED Migration script - matches models by name instead of ID
 * Old and new databases have different UUIDs for the same models
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

function base64ToBuffer(base64String) {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

function getImageTypeFromBase64(base64String) {
  if (base64String.startsWith('data:image/png')) return 'png'
  if (base64String.startsWith('data:image/jpeg') || base64String.startsWith('data:image/jpg')) return 'jpeg'
  const buffer = Buffer.from(base64String.substring(0, 50), 'base64')
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png'
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg'
  return 'jpeg'
}

async function migrateImages() {
  console.log('🚀 Starting FIXED image migration (matching by model name)...\n')

  try {
    // Step 1: Get images from old database with model names
    console.log('📋 Step 1: Fetching data from old database...')
    const { data: oldData, error: fetchError } = await oldSupabase
      .from('equipment_dimensions')
      .select(`
        model_id,
        front_image_base64,
        side_image_base64,
        models:model_id (
          id,
          name,
          makes:make_id (
            name
          )
        )
      `)
      .or('front_image_base64.not.is.null,side_image_base64.not.is.null')

    if (fetchError) {
      throw new Error(`Failed to fetch old data: ${fetchError.message}`)
    }

    console.log(`✅ Found ${oldData.length} models with images\n`)

    // Step 2: Get all new models for matching
    console.log('📋 Step 2: Fetching models from new database...')

    // Fetch all models by paginating (Supabase default limit is 1000)
    let allNewModels = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data: newModels, error: newError } = await newSupabase
        .from('models')
        .select(`
          id,
          name,
          make_id,
          makes:make_id (
            name
          )
        `)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (newError) {
        throw new Error(`Failed to fetch new models: ${newError.message}`)
      }

      if (!newModels || newModels.length === 0) break

      allNewModels = allNewModels.concat(newModels)

      if (newModels.length < pageSize) break
      page++
    }

    const newModels = allNewModels

    console.log(`✅ Found ${newModels.length} models in new database\n`)

    // Create lookup map for new models
    const newModelMap = new Map()
    newModels.forEach(model => {
      const makeArray = Array.isArray(model.makes) ? model.makes : [model.makes]
      const makeName = makeArray[0]?.name
      const key = `${makeName}::${model.name}`.toLowerCase()
      newModelMap.set(key, model.id)
    })

    // Step 3: Migrate each image
    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const oldDim of oldData) {
      try {
        const oldModel = Array.isArray(oldDim.models) ? oldDim.models[0] : oldDim.models
        if (!oldModel) {
          console.warn(`⚠️  Skipping: No model data for ${oldDim.model_id}`)
          skipped++
          continue
        }

        const oldMake = Array.isArray(oldModel.makes) ? oldModel.makes[0] : oldModel.makes
        const makeName = oldMake?.name
        const modelName = oldModel.name

        if (!makeName || !modelName) {
          console.warn(`⚠️  Skipping: Missing make/model name`)
          skipped++
          continue
        }

        // Find matching model in new database
        const lookupKey = `${makeName}::${modelName}`.toLowerCase()
        const newModelId = newModelMap.get(lookupKey)

        if (!newModelId) {
          console.warn(`⚠️  Skipping ${makeName} ${modelName}: Not found in new database`)
          skipped++
          continue
        }

        console.log(`\n🔄 Processing ${makeName} ${modelName}`)
        console.log(`   Old ID: ${oldDim.model_id}`)
        console.log(`   New ID: ${newModelId}`)

        const images = [
          { base64: oldDim.front_image_base64, type: 'front' },
          { base64: oldDim.side_image_base64, type: 'side' }
        ].filter(img => img.base64)

        for (const image of images) {
          try {
            const imageBuffer = base64ToBuffer(image.base64)
            const imageType = getImageTypeFromBase64(image.base64)
            const fileName = `${image.type}-${Date.now()}.${imageType}`
            const filePath = `equipment/${newModelId}/${fileName}`

            console.log(`   📤 Uploading ${image.type} image...`)

            const { error: uploadError } = await newSupabase
              .storage
              .from('equipment-images')
              .upload(filePath, imageBuffer, {
                contentType: `image/${imageType}`,
                upsert: true
              })

            if (uploadError) throw uploadError

            const { data: urlData } = newSupabase
              .storage
              .from('equipment-images')
              .getPublicUrl(filePath)

            const updateField = image.type === 'front' ? 'front_image_url' : 'side_image_url'
            const { error: updateError } = await newSupabase
              .from('equipment_dimensions')
              .update({ [updateField]: urlData.publicUrl })
              .eq('model_id', newModelId)

            if (updateError) throw updateError

            console.log(`   ✅ ${image.type} image migrated`)
            migrated++

          } catch (error) {
            console.error(`   ❌ Failed ${image.type} image:`, error.message)
            failed++
          }
        }

      } catch (error) {
        console.error(`❌ Error processing model:`, error.message)
        failed++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`✅ Successfully migrated: ${migrated} images`)
    console.log(`⏭️  Skipped: ${skipped} models`)
    console.log(`❌ Failed: ${failed} images`)
    console.log('='.repeat(60))

    if (failed > 0) {
      console.log('\n⚠️  Some images failed. Check errors above.')
      process.exit(1)
    } else {
      console.log('\n🎉 Migration complete!')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateImages()
