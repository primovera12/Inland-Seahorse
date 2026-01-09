/**
 * Migration script to copy equipment images from old Supabase project to new one
 * Old system stored images as base64 strings in database
 * New system stores images in Supabase Storage
 *
 * Usage: node scripts/migrate-images.js
 */

const { createClient } = require('@supabase/supabase-js')

// Old Supabase project (base64 images in database)
const OLD_SUPABASE_URL = 'https://piwpnmitxtlnhjtjarbo.supabase.co'
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd3BubWl0eHRsbmhqdGphcmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY4OTkxNywiZXhwIjoyMDc5MjY1OTE3fQ.JjV0uLn_Rf1I2x1sVzDHKCukn1RSUgb2uNx1NZdDF6U'

// New Supabase project (storage bucket)
const NEW_SUPABASE_URL = 'https://nsqcttbciocfumhvdnod.supabase.co'
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!NEW_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.error('Please run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/migrate-images.js')
  process.exit(1)
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY)

function base64ToBuffer(base64String) {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

function getImageTypeFromBase64(base64String) {
  // Check if it's a PNG or JPEG based on base64 header
  if (base64String.startsWith('data:image/png')) return 'png'
  if (base64String.startsWith('data:image/jpeg') || base64String.startsWith('data:image/jpg')) return 'jpeg'
  // Check magic numbers in decoded data
  const buffer = Buffer.from(base64String.substring(0, 50), 'base64')
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png'
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg'
  return 'jpeg' // default
}

async function migrateImages() {
  console.log('🚀 Starting image migration from base64 to storage...\n')

  try {
    // Step 1: Get all base64 images from old database
    console.log('📋 Step 1: Fetching base64 image data from old database...')
    const { data: oldDimensions, error: fetchError } = await oldSupabase
      .from('equipment_dimensions')
      .select('model_id, front_image_base64, side_image_base64')
      .or('front_image_base64.not.is.null,side_image_base64.not.is.null')

    if (fetchError) {
      throw new Error(`Failed to fetch old data: ${fetchError.message}`)
    }

    console.log(`✅ Found ${oldDimensions.length} equipment models with images\n`)

    // Step 2: Migrate each image
    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const dim of oldDimensions) {
      const images = [
        { base64: dim.front_image_base64, type: 'front' },
        { base64: dim.side_image_base64, type: 'side' }
      ].filter(img => img.base64)

      for (const image of images) {
        try {
          console.log(`🔄 Processing ${image.type} image for model ${dim.model_id}...`)

          // Convert base64 to buffer
          const imageBuffer = base64ToBuffer(image.base64)
          const imageType = getImageTypeFromBase64(image.base64)
          const fileName = `${image.type}-${Date.now()}.${imageType}`
          const filePath = `equipment/${dim.model_id}/${fileName}`

          console.log(`📤 Uploading to new storage: ${filePath}...`)

          // Upload to new storage
          const { error: uploadError } = await newSupabase
            .storage
            .from('equipment-images')
            .upload(filePath, imageBuffer, {
              contentType: `image/${imageType}`,
              upsert: true
            })

          if (uploadError) {
            throw uploadError
          }

          // Get new public URL
          const { data: urlData } = newSupabase
            .storage
            .from('equipment-images')
            .getPublicUrl(filePath)

          // Update new database with storage URL
          const updateField = image.type === 'front' ? 'front_image_url' : 'side_image_url'
          const { error: updateError } = await newSupabase
            .from('equipment_dimensions')
            .update({ [updateField]: urlData.publicUrl })
            .eq('model_id', dim.model_id)

          if (updateError) {
            throw updateError
          }

          console.log(`✅ Successfully migrated ${image.type} image for model ${dim.model_id}\n`)
          migrated++

        } catch (error) {
          console.error(`❌ Failed to migrate ${image.type} image for model ${dim.model_id}:`, error.message)
          console.error(`   Error details:`, error)
          failed++
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`✅ Successfully migrated: ${migrated} images`)
    console.log(`⏭️  Skipped: ${skipped} images`)
    console.log(`❌ Failed: ${failed} images`)
    console.log('='.repeat(60))

    if (failed > 0) {
      console.log('\n⚠️  Some images failed to migrate. Please check the errors above.')
      process.exit(1)
    } else {
      console.log('\n🎉 All images migrated successfully!')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateImages()
