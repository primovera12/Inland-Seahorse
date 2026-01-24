/**
 * AI Parser for Load Planner
 *
 * Uses Claude Opus 4.5 to extract cargo information from text and images
 * This is the CORE FEATURE - AI-First architecture where ALL data goes through Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ParsedItem } from './universal-parser'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

let anthropic: Anthropic | null = null

function getAnthropic() {
  if (!anthropic && ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  }
  return anthropic
}

export interface AIParseResult {
  success: boolean
  items: ParsedItem[]
  rawResponse?: string
  error?: string
  warning?: string  // Warning for potential issues like truncation
  debugInfo?: {
    rawItemCount: number
    filteredItemCount: number
    sampleRawItem: unknown
    potentiallyTruncated?: boolean
  }
}

/**
 * Detect if a JSON array response was truncated mid-parse
 * Returns true if the response seems incomplete
 */
function detectTruncatedJSON(responseText: string): boolean {
  // Look for signs of truncation:
  // 1. Ends with incomplete JSON (no closing bracket)
  // 2. Has unbalanced brackets
  // 3. Ends mid-string or mid-number

  const trimmed = responseText.trim()

  // Check if it ends with a complete array
  if (!trimmed.endsWith(']')) {
    return true
  }

  // Count brackets to check balance
  let bracketCount = 0
  let braceCount = 0
  let inString = false
  let escape = false

  for (const char of trimmed) {
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (!inString) {
      if (char === '[') bracketCount++
      if (char === ']') bracketCount--
      if (char === '{') braceCount++
      if (char === '}') braceCount--
    }
  }

  return bracketCount !== 0 || braceCount !== 0
}

const CARGO_EXTRACTION_PROMPT = `You are an expert at extracting cargo/freight data from ANY format - spreadsheets, tables, packing lists, emails, PDFs, etc.

Your job is to find ALL cargo items with their dimensions and weights, regardless of how the data is formatted.

LOOK FOR:
- Item names/descriptions (SKU, Name, Description, Part #, etc.)
- Dimensions - could be labeled as Length/Width/Height, L/W/H, Dimensions, Size, etc.
- Weights - could be in lbs, kg, tons, pounds, kilograms
- Quantities - Qty, Quantity, Count, Pcs, Units
- The data might have headers explaining units (e.g., "Length dimensions: Inches" or "Weight: Pounds")

UNDERSTAND DIFFERENT FORMATS:
- CSV/spreadsheet data with columns separated by commas or pipes
- Tables with headers that might span multiple rows
- Metadata rows that explain units (e.g., "Inches", "Pounds", "Decimeters")
- European formats (commas as decimals, different column names)
- Cargo Planner exports, packing lists, shipping manifests

Return a JSON array with this EXACT structure:
[
  {
    "sku": "item ID if available",
    "description": "item name or description",
    "quantity": 1,
    "length": 10.5,
    "width": 8.2,
    "height": 5.0,
    "weight": 15000,
    "stackable": true,
    "priority": 1
  }
]

CRITICAL CONVERSION RULES:
- Convert ALL dimensions to FEET:
  * Inches → divide by 12
  * Meters → multiply by 3.28084
  * Centimeters → divide by 30.48
  * Decimeters → multiply by 0.328084
- Convert ALL weights to POUNDS:
  * Kilograms → multiply by 2.20462
  * Tons → multiply by 2000
- Look for unit hints in headers or metadata rows

IMPORTANT:
- Extract EVERY cargo item you can find
- If units aren't specified, assume inches for dimensions and pounds for weight
- Stackable: true if "Yes"/"Y", false if "No"/"N"
- Return ONLY the JSON array, no explanation
- If no items found, return []`

/**
 * Parse an image using AI vision to extract cargo information
 */
export async function parseImageWithAI(
  imageData: string // base64 data URL like "data:image/png;base64,..."
): Promise<AIParseResult> {
  const client = getAnthropic()

  if (!client) {
    return {
      success: false,
      items: [],
      error: 'AI service not configured. Please set ANTHROPIC_API_KEY.',
    }
  }

  try {
    // Extract the base64 data and mime type
    const match = imageData.match(/^data:(.+);base64,(.+)$/)
    if (!match) {
      return {
        success: false,
        items: [],
        error: 'Invalid image data format',
      }
    }

    const mimeType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64Data = match[2]

    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 30000,  // Increased to 30K to handle very large item lists
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: CARGO_EXTRACTION_PROMPT + '\n\nAnalyze this image and extract cargo information:',
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Try to parse the JSON response
    try {
      let jsonStr = responseText
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const items = JSON.parse(jsonStr) as Array<{
        sku?: string
        description: string
        quantity: number
        length: number
        width: number
        height: number
        weight: number
        stackable?: boolean
        priority?: number
      }>

      const parsedItems: ParsedItem[] = items
        .map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          sku: item.sku,
          description: item.description || item.sku || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          length: Math.round((item.length || 0) * 100) / 100,
          width: Math.round((item.width || 0) * 100) / 100,
          height: Math.round((item.height || 0) * 100) / 100,
          weight: Math.round(item.weight || 0),
          stackable: item.stackable,
          priority: item.priority,
        }))
        .filter(item =>
          item.length > 0 || item.width > 0 || item.height > 0 || item.weight > 0
        )

      // Check for truncation
      const potentiallyTruncated = detectTruncatedJSON(responseText)

      return {
        success: parsedItems.length > 0,
        items: parsedItems,
        rawResponse: responseText,
        warning: potentiallyTruncated
          ? 'Response may have been truncated. Some items might be missing.'
          : undefined,
      }
    } catch {
      return {
        success: false,
        items: [],
        rawResponse: responseText,
        error: 'Could not parse AI response. The image may not contain structured cargo data.',
      }
    }
  } catch (error) {
    console.error('AI Vision parsing error:', error)
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'AI vision processing failed',
    }
  }
}

/**
 * Parse text using Claude Opus 4.5 to extract cargo information
 * Handles any format: spreadsheets, tables, emails, documents, etc.
 */
export async function parseTextWithAI(text: string): Promise<AIParseResult> {
  const client = getAnthropic()

  if (!client) {
    console.error('Failed to create Anthropic client - API key missing or invalid')
    return {
      success: false,
      items: [],
      error: 'AI service not configured. Please set ANTHROPIC_API_KEY.',
    }
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 30000,  // Increased to 30K to handle very large item lists
      messages: [
        {
          role: 'user',
          content: CARGO_EXTRACTION_PROMPT + '\n\nDATA TO ANALYZE:\n' + text,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Check for truncation before parsing
    const potentiallyTruncated = detectTruncatedJSON(responseText)

    try {
      let jsonStr = responseText
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const items = JSON.parse(jsonStr) as Array<{
        sku?: string
        description: string
        quantity: number
        length: number
        width: number
        height: number
        weight: number
        stackable?: boolean
        priority?: number
      }>

      const parsedItems: ParsedItem[] = items
        .map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          sku: item.sku,
          description: item.description || item.sku || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          length: Math.round((item.length || 0) * 100) / 100,
          width: Math.round((item.width || 0) * 100) / 100,
          height: Math.round((item.height || 0) * 100) / 100,
          weight: Math.round(item.weight || 0),
          stackable: item.stackable,
          priority: item.priority,
        }))
        .filter(item =>
          item.length > 0 || item.width > 0 || item.height > 0 || item.weight > 0
        )

      return {
        success: parsedItems.length > 0,
        items: parsedItems,
        rawResponse: responseText,
        warning: potentiallyTruncated
          ? 'Response may have been truncated. Some items might be missing.'
          : undefined,
        debugInfo: {
          rawItemCount: items.length,
          filteredItemCount: parsedItems.length,
          sampleRawItem: items[0],
          potentiallyTruncated,
        },
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return {
        success: false,
        items: [],
        rawResponse: responseText,
        error: `Could not parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      }
    }
  } catch (error) {
    console.error('Claude parsing error:', error)
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'AI text processing failed',
    }
  }
}

/**
 * Parse a PDF document by extracting text and using AI
 * This is a wrapper that accepts PDF text content
 */
export async function parsePDFWithAI(pdfText: string): Promise<AIParseResult> {
  // PDFs are parsed as text - the extraction happens server-side
  return parseTextWithAI(pdfText)
}

/**
 * Multi-language cargo extraction prompt for international shipments
 */
const MULTILANG_PROMPT = `${CARGO_EXTRACTION_PROMPT}

ADDITIONAL: This data may be in ANY language (English, German, Spanish, French, Chinese, Japanese, etc.)
Common dimension/weight terms in other languages:
- German: Länge (length), Breite (width), Höhe (height), Gewicht (weight), Stück (pieces)
- Spanish: Largo/Longitud (length), Ancho (width), Alto/Altura (height), Peso (weight)
- French: Longueur (length), Largeur (width), Hauteur (height), Poids (weight)
- Chinese: 长度 (length), 宽度 (width), 高度 (height), 重量 (weight)
- Japanese: 長さ (length), 幅 (width), 高さ (height), 重量 (weight)

Translate any item descriptions to English in your response.`

/**
 * Parse text with multi-language support
 */
export async function parseTextWithAIMultilang(text: string): Promise<AIParseResult> {
  const client = getAnthropic()

  if (!client) {
    return {
      success: false,
      items: [],
      error: 'AI service not configured. Please set ANTHROPIC_API_KEY.',
    }
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 30000,  // Increased to 30K to handle very large item lists
      messages: [
        {
          role: 'user',
          content: MULTILANG_PROMPT + '\n\nDATA TO ANALYZE:\n' + text,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Check for truncation before parsing
    const potentiallyTruncated = detectTruncatedJSON(responseText)

    try {
      let jsonStr = responseText
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const items = JSON.parse(jsonStr) as Array<{
        sku?: string
        description: string
        quantity: number
        length: number
        width: number
        height: number
        weight: number
        stackable?: boolean
        priority?: number
      }>

      const parsedItems: ParsedItem[] = items
        .map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          sku: item.sku,
          description: item.description || item.sku || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          length: Math.round((item.length || 0) * 100) / 100,
          width: Math.round((item.width || 0) * 100) / 100,
          height: Math.round((item.height || 0) * 100) / 100,
          weight: Math.round(item.weight || 0),
          stackable: item.stackable,
          priority: item.priority,
        }))
        .filter(item =>
          item.length > 0 || item.width > 0 || item.height > 0 || item.weight > 0
        )

      return {
        success: parsedItems.length > 0,
        items: parsedItems,
        rawResponse: responseText,
        warning: potentiallyTruncated
          ? 'Response may have been truncated. Some items might be missing.'
          : undefined,
      }
    } catch {
      return {
        success: false,
        items: [],
        rawResponse: responseText,
        error: 'Could not parse AI response.',
      }
    }
  } catch (error) {
    console.error('Claude multilang parsing error:', error)
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'AI processing failed',
    }
  }
}
