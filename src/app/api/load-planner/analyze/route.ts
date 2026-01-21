import { NextRequest, NextResponse } from 'next/server'
import {
  parseTextWithAI,
  parseImageWithAI,
  parseSpreadsheet,
  selectTrucks,
  planLoads,
  type AnalyzeResponse,
  type LoadItem,
  type ParsedLoad,
} from '@/lib/load-planner'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60s for AI parsing

/**
 * POST /api/load-planner/analyze
 *
 * Analyze cargo data from various sources:
 * - Text/email content
 * - Images (via base64)
 * - Spreadsheet data (pre-parsed rows)
 *
 * Returns parsed items, truck recommendations, and load plan
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let items: LoadItem[] = []
    let parsedLoad: ParsedLoad | null = null
    let metadata: {
      parseMethod?: 'text-ai' | 'image-ai' | 'spreadsheet'
      itemsFound?: number
      confidence?: number
    } = {}

    // Handle multipart form data (file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const text = formData.get('text') as string | null

      if (file) {
        const fileType = file.type
        const fileName = file.name.toLowerCase()

        // Handle images
        if (fileType.startsWith('image/')) {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const result = await parseImageWithAI(
            base64,
            fileType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
          )
          items = result.items
          parsedLoad = result
          metadata = { parseMethod: 'image-ai', itemsFound: items.length, confidence: result.confidence }
        }
        // Handle spreadsheets
        else if (
          fileName.endsWith('.xlsx') ||
          fileName.endsWith('.xls') ||
          fileName.endsWith('.csv')
        ) {
          const buffer = await file.arrayBuffer()
          const result = await parseSpreadsheet(Buffer.from(buffer), fileName)
          items = result.items
          parsedLoad = result
          metadata = { parseMethod: 'spreadsheet', itemsFound: items.length, confidence: result.confidence }
        }
        // Unsupported file type
        else {
          return NextResponse.json<AnalyzeResponse>(
            {
              success: false,
              parsedLoad: createEmptyParsedLoad(),
              recommendations: [],
              error: `Unsupported file type: ${fileType || fileName}. Supported: images, Excel (.xlsx/.xls), CSV`,
            },
            { status: 400 }
          )
        }
      } else if (text) {
        // Text provided via form data
        const result = await parseTextWithAI(text)
        items = result.items
        parsedLoad = result
        metadata = { parseMethod: 'text-ai', itemsFound: items.length, confidence: result.confidence }
      } else {
        return NextResponse.json<AnalyzeResponse>(
          {
            success: false,
            parsedLoad: createEmptyParsedLoad(),
            recommendations: [],
            error: 'No file or text provided',
          },
          { status: 400 }
        )
      }
    }
    // Handle JSON body
    else if (contentType.includes('application/json')) {
      const body = await request.json()

      // Text/email parsing
      if (body.text || body.emailText) {
        const text = body.text || body.emailText
        if (typeof text !== 'string' || text.trim().length < 10) {
          return NextResponse.json<AnalyzeResponse>(
            {
              success: false,
              parsedLoad: createEmptyParsedLoad(),
              recommendations: [],
              error: 'Text is too short to analyze (minimum 10 characters)',
            },
            { status: 400 }
          )
        }
        const result = await parseTextWithAI(text)
        items = result.items
        parsedLoad = result
        metadata = { parseMethod: 'text-ai', itemsFound: items.length, confidence: result.confidence }
      }
      // Base64 image parsing
      else if (body.imageBase64 && body.mimeType) {
        const result = await parseImageWithAI(body.imageBase64, body.mimeType)
        items = result.items
        parsedLoad = result
        metadata = { parseMethod: 'image-ai', itemsFound: items.length, confidence: result.confidence }
      }
      // Direct items array (already parsed)
      else if (body.items && Array.isArray(body.items)) {
        items = body.items
        parsedLoad = {
          length: Math.max(...items.map((i) => i.length), 0),
          width: Math.max(...items.map((i) => i.width), 0),
          height: Math.max(...items.map((i) => i.height), 0),
          weight: Math.max(...items.map((i) => i.weight), 0),
          items,
          confidence: 100,
        }
        metadata = { itemsFound: items.length }
      }
      // Spreadsheet rows (pre-parsed on client)
      else if (body.rows && Array.isArray(body.rows)) {
        // Convert rows to items
        items = body.rows.map((row: Record<string, unknown>, index: number) => ({
          id: `item-${index}`,
          description: String(row.description || row.name || row.item || 'Unknown Item'),
          quantity: Number(row.quantity || row.qty || 1),
          length: Number(row.length || 0),
          width: Number(row.width || 0),
          height: Number(row.height || 0),
          weight: Number(row.weight || 0),
          stackable: Boolean(row.stackable),
          fragile: Boolean(row.fragile),
          hazmat: Boolean(row.hazmat),
        }))
        parsedLoad = {
          length: Math.max(...items.map((i) => i.length), 0),
          width: Math.max(...items.map((i) => i.width), 0),
          height: Math.max(...items.map((i) => i.height), 0),
          weight: Math.max(...items.map((i) => i.weight), 0),
          items,
          confidence: 80,
        }
        metadata = { parseMethod: 'spreadsheet', itemsFound: items.length }
      } else {
        return NextResponse.json<AnalyzeResponse>(
          {
            success: false,
            parsedLoad: createEmptyParsedLoad(),
            recommendations: [],
            error: 'Invalid request body. Provide text, imageBase64+mimeType, items array, or rows array',
          },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          parsedLoad: createEmptyParsedLoad(),
          recommendations: [],
          error: 'Unsupported content type. Use multipart/form-data or application/json',
        },
        { status: 400 }
      )
    }

    // Validate we have items
    if (!items || items.length === 0) {
      return NextResponse.json<AnalyzeResponse>({
        success: true,
        parsedLoad: parsedLoad || createEmptyParsedLoad(),
        recommendations: [],
        metadata,
        warning: 'No cargo items could be extracted. Please check the input format.',
      })
    }

    // Filter out items with no dimensions
    const validItems = items.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )

    if (validItems.length === 0) {
      return NextResponse.json<AnalyzeResponse>({
        success: true,
        parsedLoad: parsedLoad || createEmptyParsedLoad(),
        recommendations: [],
        metadata,
        warning:
          'Items were found but none have complete dimensions (length, width, height, weight). Please verify the data.',
      })
    }

    // Get truck recommendations
    const recommendations = selectTrucks(validItems)

    // Create load plan
    const loadPlan = planLoads(validItems)

    return NextResponse.json<AnalyzeResponse>({
      success: true,
      parsedLoad: parsedLoad || {
        length: Math.max(...validItems.map((i) => i.length)),
        width: Math.max(...validItems.map((i) => i.width)),
        height: Math.max(...validItems.map((i) => i.height)),
        weight: Math.max(...validItems.map((i) => i.weight)),
        items: validItems,
        confidence: metadata.confidence || 80,
      },
      recommendations,
      loadPlan,
      metadata,
    })
  } catch (error) {
    console.error('Error analyzing cargo:', error)
    return NextResponse.json<AnalyzeResponse>(
      {
        success: false,
        parsedLoad: createEmptyParsedLoad(),
        recommendations: [],
        error: error instanceof Error ? error.message : 'Failed to analyze cargo. Please try again.',
      },
      { status: 500 }
    )
  }
}

function createEmptyParsedLoad(): ParsedLoad {
  return {
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    items: [],
    confidence: 0,
  }
}
