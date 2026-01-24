import { NextRequest, NextResponse } from 'next/server'
import { parseTextWithAI, parseTextWithAIMultilang } from '@/lib/load-planner/ai-parser'
import type { LoadItem } from '@/lib/load-planner/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60s for AI text parsing

interface ParseTextResponse {
  success: boolean
  items: LoadItem[]
  confidence: number
  warnings: string[]
  errors: string[]
  rawText?: string
}

/**
 * POST /api/load-planner/parse-text
 *
 * Parse cargo items from text using Claude AI
 * Expects: { text: string, multilang?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, multilang } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json<ParseTextResponse>(
        {
          success: false,
          items: [],
          confidence: 0,
          warnings: [],
          errors: ['Missing or invalid text in request body']
        },
        { status: 400 }
      )
    }

    // Minimum text length check
    if (text.trim().length < 10) {
      return NextResponse.json<ParseTextResponse>(
        {
          success: false,
          items: [],
          confidence: 0,
          warnings: [],
          errors: ['Text is too short to analyze (minimum 10 characters)']
        },
        { status: 400 }
      )
    }

    // Use multilang parser if requested, otherwise standard
    const result = multilang
      ? await parseTextWithAIMultilang(text)
      : await parseTextWithAI(text)

    if (!result.success) {
      return NextResponse.json<ParseTextResponse>({
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [result.error || 'Failed to parse text']
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
      warnings.push(`${incompleteItems.length} item(s) have incomplete dimensions - please review`)
    }

    // Check for suspiciously large or small values
    const suspiciousItems = items.filter(
      i => i.length > 100 || i.width > 20 || i.height > 20 || i.weight > 500000
    )
    if (suspiciousItems.length > 0) {
      warnings.push('Some dimensions seem unusually large - verify unit conversion')
    }

    // Add warning from AI parser if present (e.g., truncation warning)
    if (result.warning) {
      warnings.unshift(result.warning)
    }

    // Log item count for debugging
    console.log(`[parse-text] Parsed ${items.length} items from text (AI returned ${result.items.length})`)

    const response = NextResponse.json<ParseTextResponse>({
      success: true,
      items,
      confidence,
      warnings,
      errors: [],
      rawText: text
    })

    // Prevent caching to ensure fresh AI responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')

    return response

  } catch (error) {
    console.error('Error parsing text:', error)
    return NextResponse.json<ParseTextResponse>(
      {
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Server error parsing text']
      },
      { status: 500 }
    )
  }
}
