import { NextRequest, NextResponse } from 'next/server'
import { parseImageWithAI } from '@/lib/load-planner/ai-parser'
import type { LoadItem } from '@/lib/load-planner/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60s for AI vision parsing

interface ParseImageResponse {
  success: boolean
  items: LoadItem[]
  confidence: number
  warnings: string[]
  errors: string[]
  rawText?: string
}

/**
 * POST /api/load-planner/parse-image
 *
 * Parse cargo items from an image using Claude Vision AI
 * Expects: { image: string (base64), mimeType: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, mimeType } = body

    if (!image || !mimeType) {
      return NextResponse.json<ParseImageResponse>(
        {
          success: false,
          items: [],
          confidence: 0,
          warnings: [],
          errors: ['Missing image or mimeType in request body']
        },
        { status: 400 }
      )
    }

    // Validate mimeType
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json<ParseImageResponse>(
        {
          success: false,
          items: [],
          confidence: 0,
          warnings: [],
          errors: [`Unsupported image type: ${mimeType}. Supported: ${validMimeTypes.join(', ')}`]
        },
        { status: 400 }
      )
    }

    // Construct data URL for the parser
    const dataUrl = `data:${mimeType};base64,${image}`
    const result = await parseImageWithAI(dataUrl)

    if (!result.success) {
      return NextResponse.json<ParseImageResponse>({
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [result.error || 'Failed to parse image']
      })
    }

    // Convert ParsedItem[] to LoadItem[]
    const items: LoadItem[] = result.items.map(item => ({
      id: item.id,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
      stackable: item.stackable ?? false,
      fragile: false,
      hazmat: false
    }))

    // Calculate confidence based on data quality
    const itemsWithGoodData = items.filter(
      i => i.length > 0 && i.width > 0 && i.height > 0 && i.weight > 0
    )
    const confidence = items.length > 0
      ? Math.round((itemsWithGoodData.length / items.length) * 0.85 * 100) / 100
      : 0

    // Generate warnings
    const warnings: string[] = []
    const incompleteItems = items.filter(
      i => i.length === 0 || i.width === 0 || i.height === 0 || i.weight === 0
    )
    if (incompleteItems.length > 0) {
      warnings.push(`${incompleteItems.length} item(s) have incomplete dimensions`)
    }

    return NextResponse.json<ParseImageResponse>({
      success: true,
      items,
      confidence,
      warnings,
      errors: [],
      rawText: result.rawResponse
    })

  } catch (error) {
    console.error('Error parsing image:', error)
    return NextResponse.json<ParseImageResponse>(
      {
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Server error processing image']
      },
      { status: 500 }
    )
  }
}
