import * as XLSX from 'xlsx'

export interface ParsedItem {
  id: string
  sku?: string // Item identifier
  description: string
  quantity: number
  length: number // feet
  width: number // feet
  height: number // feet
  weight: number // lbs
  // Stacking properties
  stackable?: boolean
  bottomOnly?: boolean
  maxLayers?: number
  maxLoad?: number
  // Orientation/rotation (1=fixed, 3=rotatable, 63=tiltable)
  orientation?: number
  // Visual properties
  geometry?: 'box' | 'cylinder' | 'hollow-cylinder'
  color?: string
  // Loading order
  priority?: number
  // Original data
  unit?: string // original unit for reference
  raw?: Record<string, unknown> // original row data
}

export interface UniversalParseResult {
  success: boolean
  items: ParsedItem[]
  metadata?: {
    fileName?: string
    fileType?: string
    sheetName?: string
    totalRows?: number
    parsedRows?: number
    parseMethod?: 'pattern' | 'AI'
    aiError?: string
    aiAttempted?: boolean
  }
  error?: string
  rawText?: string // For AI processing
}

// Common column name patterns - expanded for international formats
const COLUMN_PATTERNS = {
  // Description/item name
  description: /desc|name|item|part|product|material|cargo|equipment|bezeichnung|artikel/i,
  // Quantity
  quantity: /qty|quantity|count|pcs|pieces|units?$|menge|stück|anzahl/i,
  // Length - including European abbreviations (Lng, Laenge, Länge)
  length: /length|len|lng|laenge|länge|l\s*[\(\[]|^l$|^l\s/i,
  // Width - including European abbreviations (Wid, Breite)
  width: /width|wid|breite|w\s*[\(\[]|^w$|^w\s/i,
  // Height - including European abbreviations (Hgt, Höhe, Hoehe)
  height: /height|hgt|höhe|hoehe|h\s*[\(\[]|^h$|^h\s/i,
  // Weight - multiple formats
  weight: /weight|wt|wgt|mass|gw|gross|lbs|kg|pounds|kilos|gewicht/i,
  // Metric-specific with unit detection
  lengthMeters: /l\s*\(?m\)?|length.*meter|lng.*\(m\)|meters?$/i,
  widthMeters: /w\s*\(?m\)?|width.*meter|wid.*\(m\)/i,
  heightMeters: /h\s*\(?m\)?|height.*meter|hgt.*\(m\)/i,
  // Weight units
  weightKg: /kg|kilo|gross.*kg|gw.*kg|gewicht.*kg/i,
  weightLbs: /lbs|pounds|gross.*lb|lb$/i,
  weightTons: /tons?$|tonnes?|ton\b/i,
}

// Unit conversion helpers
const metersToFeet = (m: number) => m * 3.28084
const decimetersToFeet = (dm: number) => dm * 0.328084 // Cargo Planner uses decimeters
const kgToLbs = (kg: number) => kg * 2.20462
const tonsToLbs = (tons: number) => tons * 2000 // US short tons
const inchesToFeet = (inches: number) => inches / 12
const cmToFeet = (cm: number) => cm / 30.48
const mmToFeet = (mm: number) => mm / 304.8

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Detect unit from column name or value
 */
function detectUnit(columnName: string, _value: unknown): { unit: string; multiplier: number } {
  const colLower = columnName.toLowerCase()

  // Check column name for unit hints
  if (colLower.includes('meter') || colLower.match(/\(m\)|\[m\]/)) {
    return { unit: 'meters', multiplier: 3.28084 }
  }
  if (colLower.includes('inch') || colLower.match(/\(in\)|\[in\]|\"$/)) {
    return { unit: 'inches', multiplier: 1/12 }
  }
  if (colLower.match(/\(cm\)|\[cm\]/)) {
    return { unit: 'cm', multiplier: 1/30.48 }
  }
  if (colLower.match(/\(mm\)|\[mm\]/)) {
    return { unit: 'mm', multiplier: 1/304.8 }
  }
  if (colLower.includes('kg') || colLower.match(/\(kg\)|\[kg\]/)) {
    return { unit: 'kg', multiplier: 2.20462 }
  }
  if (colLower.includes('lbs') || colLower.includes('pounds') || colLower.match(/\(lbs\)|\[lbs\]/)) {
    return { unit: 'lbs', multiplier: 1 }
  }
  if (colLower.match(/\(t\)|\[t\]|tonne/)) {
    return { unit: 'tonnes', multiplier: 2204.62 }
  }

  // Default to feet/lbs (US standard)
  if (colLower.match(/length|width|height|^[lwh]$/i)) {
    return { unit: 'feet', multiplier: 1 }
  }
  if (colLower.match(/weight|wt|mass/i)) {
    return { unit: 'lbs', multiplier: 1 }
  }

  return { unit: 'unknown', multiplier: 1 }
}

/**
 * Parse a numeric value from various formats
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }

  const str = String(value).trim()

  // Handle feet and inches format: 10'6" or 10' 6"
  const feetInchMatch = str.match(/(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)?\"?/)
  if (feetInchMatch) {
    const feet = parseFloat(feetInchMatch[1]) || 0
    const inches = parseFloat(feetInchMatch[2]) || 0
    return feet + inches / 12
  }

  // Handle comma-separated numbers: 45,000
  const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '')
  const num = parseFloat(cleaned)

  return isNaN(num) ? null : num
}

/**
 * Auto-detect columns from headers
 * Supports standard formats and Cargo Planner format (decimeters, orientation, etc.)
 */
function autoDetectColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  const usedIndices = new Set<number>()

  // First pass: look for exact/strong matches with units
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim()

    // === CARGO PLANNER SPECIFIC ===
    // SKU / Item ID
    if (!mapping.sku && h.match(/^sku$|^item.?id$|^part.?no$|^article/i)) {
      mapping.sku = index
      usedIndices.add(index)
    }
    // Stackable (Yes/No)
    if (!mapping.stackable && h.match(/^stackable$/i)) {
      mapping.stackable = index
      usedIndices.add(index)
    }
    // Bottom Only (Yes/No)
    if (!mapping.bottomOnly && h.match(/bottom.?only/i)) {
      mapping.bottomOnly = index
      usedIndices.add(index)
    }
    // Orientation (1-63)
    if (!mapping.orientation && h.match(/^orientation/i)) {
      mapping.orientation = index
      usedIndices.add(index)
    }
    // Max layers
    if (!mapping.maxLayers && h.match(/max.?layers/i)) {
      mapping.maxLayers = index
      usedIndices.add(index)
    }
    // Max load
    if (!mapping.maxLoad && h.match(/max.?load/i)) {
      mapping.maxLoad = index
      usedIndices.add(index)
    }
    // Geometry (Box/Cylinder)
    if (!mapping.geometry && h.match(/^geometry/i)) {
      mapping.geometry = index
      usedIndices.add(index)
    }
    // Color
    if (!mapping.color && h.match(/^color$|^colour$/i)) {
      mapping.color = index
      usedIndices.add(index)
    }
    // Priority
    if (!mapping.priority && h.match(/^priority/i)) {
      mapping.priority = index
      usedIndices.add(index)
    }

    // === DIMENSION UNITS ===
    // Length with units (decimeters - Cargo Planner default)
    if (!mapping.lengthDecimeters && h.match(/^length$|^l$/i)) {
      // Check if previous header row indicates decimeters
      mapping.lengthDecimeters = index // Will verify with header metadata
      usedIndices.add(index)
    }
    // Length with units (meters)
    if (!mapping.lengthMeters && h.match(/l\s*\(?meters?\)?|length.*\(m\)|lng.*\(m\)|^l \(meters\)/i)) {
      mapping.lengthMeters = index
      usedIndices.add(index)
    }
    // Width with units (meters)
    if (!mapping.widthMeters && h.match(/w\s*\(?meters?\)?|width.*\(m\)|wid.*\(m\)/i)) {
      mapping.widthMeters = index
      usedIndices.add(index)
    }
    // Height with units (meters)
    if (!mapping.heightMeters && h.match(/h\s*\(?meters?\)?|height.*\(m\)|hgt.*\(m\)/i)) {
      mapping.heightMeters = index
      usedIndices.add(index)
    }
    // Length with units (inches)
    if (!mapping.lengthInches && h.match(/l\s*\(?inch|length.*\(in\)|lng.*inch/i)) {
      mapping.lengthInches = index
      usedIndices.add(index)
    }
    // Width with units (inches)
    if (!mapping.widthInches && h.match(/w\s*\(?inch|width.*\(in\)|wid.*inch/i)) {
      mapping.widthInches = index
      usedIndices.add(index)
    }
    // Height with units (inches)
    if (!mapping.heightInches && h.match(/h\s*\(?inch|height.*\(in\)|hgt.*inch/i)) {
      mapping.heightInches = index
      usedIndices.add(index)
    }
    // Length with units (feet)
    if (!mapping.lengthFeet && h.match(/l\s*\(?ft\)?|length.*\(ft\)|lng.*feet|length.*feet/i)) {
      mapping.lengthFeet = index
      usedIndices.add(index)
    }
    // Width with units (feet)
    if (!mapping.widthFeet && h.match(/w\s*\(?ft\)?|width.*\(ft\)|wid.*feet|width.*feet/i)) {
      mapping.widthFeet = index
      usedIndices.add(index)
    }
    // Height with units (feet)
    if (!mapping.heightFeet && h.match(/h\s*\(?ft\)?|height.*\(ft\)|hgt.*feet|height.*feet/i)) {
      mapping.heightFeet = index
      usedIndices.add(index)
    }
    // Weight (lbs)
    if (!mapping.weightLbs && h.match(/lbs|pounds|\(lb\)/i)) {
      mapping.weightLbs = index
      usedIndices.add(index)
    }
    // Weight (kg)
    if (!mapping.weightKg && h.match(/gw\s*\(?kg\)?|weight.*kg|\(kg\)|kg$/i) && !h.match(/lbs/i)) {
      mapping.weightKg = index
      usedIndices.add(index)
    }
    // Weight (tons)
    if (!mapping.weightTons && h.match(/tons?$|tonnes?|\(t\)|ton\b/i) && !h.match(/lbs|kg/i)) {
      mapping.weightTons = index
      usedIndices.add(index)
    }
    // Description / Name
    if (!mapping.description && h.match(/^name$|description|item|part|product|material|cargo|bezeichnung|artikel/i) && !h.match(/^sku$/i)) {
      mapping.description = index
      usedIndices.add(index)
    }
    // Quantity
    if (!mapping.quantity && h.match(/qty|quantity|count|pcs|menge|stück|anzahl/i)) {
      mapping.quantity = index
      usedIndices.add(index)
    }
  })

  // Second pass: generic L/W/H fallback if no unit-specific columns found
  if (!mapping.lengthMeters && !mapping.lengthInches && !mapping.lengthFeet) {
    headers.forEach((header, index) => {
      if (usedIndices.has(index)) return
      const h = header.toLowerCase().trim()
      if (h.match(/^length$|^len$|^lng$|^l$/i)) {
        mapping.lengthFeet = index // Assume feet as default
        usedIndices.add(index)
      }
    })
  }
  if (!mapping.widthMeters && !mapping.widthInches && !mapping.widthFeet) {
    headers.forEach((header, index) => {
      if (usedIndices.has(index)) return
      const h = header.toLowerCase().trim()
      if (h.match(/^width$|^wid$|^w$/i)) {
        mapping.widthFeet = index
        usedIndices.add(index)
      }
    })
  }
  if (!mapping.heightMeters && !mapping.heightInches && !mapping.heightFeet) {
    headers.forEach((header, index) => {
      if (usedIndices.has(index)) return
      const h = header.toLowerCase().trim()
      if (h.match(/^height$|^hgt$|^h$/i)) {
        mapping.heightFeet = index
        usedIndices.add(index)
      }
    })
  }
  if (!mapping.weightLbs && !mapping.weightKg && !mapping.weightTons) {
    headers.forEach((header, index) => {
      if (usedIndices.has(index)) return
      const h = header.toLowerCase().trim()
      if (h.match(/^weight$|^wt$|^wgt$|^mass$|^gw$/i)) {
        mapping.weightLbs = index // Assume lbs as default
        usedIndices.add(index)
      }
    })
  }

  return mapping
}

/**
 * Parse Yes/No values to boolean
 */
function parseYesNo(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const str = String(value).toLowerCase().trim()
  if (str === 'yes' || str === 'y' || str === '1' || str === 'true') return true
  if (str === 'no' || str === 'n' || str === '0' || str === 'false') return false
  return undefined
}

/**
 * Parse geometry type from string
 */
function parseGeometry(value: unknown): 'box' | 'cylinder' | 'hollow-cylinder' | undefined {
  if (!value) return undefined
  const str = String(value).toLowerCase().trim()
  if (str.includes('cylinder') && str.includes('hollow')) return 'hollow-cylinder'
  if (str.includes('cylinder')) return 'cylinder'
  if (str.includes('box')) return 'box'
  return undefined
}

/**
 * Parse Excel/CSV data
 * Supports standard formats and Cargo Planner format (decimeters/kilograms)
 */
export function parseSpreadsheet(data: ArrayBuffer, fileName: string): UniversalParseResult {
  try {
    const workbook = XLSX.read(data, { type: 'array' })
    const items: ParsedItem[] = []
    let totalRows = 0
    let parsedRows = 0
    const rawTextParts: string[] = [] // Collect raw text for AI fallback

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

      if (jsonData.length < 2) continue // Need at least header + 1 row

      // Detect unit format by looking for unit hints in first rows
      // Supports: Decimeters, Kilograms (Cargo Planner), Inches, Pounds, Meters, etc.
      let isCargoPlanner = false
      let usesDecimeters = false
      let usesKilograms = false
      let usesInches = false
      let usesPounds = false
      let usesMeters = false
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const rowStr = (jsonData[i] as unknown[]).join(' ').toLowerCase()
        if (rowStr.includes('decimeter')) {
          isCargoPlanner = true
          usesDecimeters = true
        }
        if (rowStr.includes('kilogram')) {
          isCargoPlanner = true
          usesKilograms = true
        }
        // Check for inches (common in US shipping) - look for "inches" or "(in)"
        if (rowStr.match(/\binch(es)?\b/) || rowStr.includes('(in)')) {
          usesInches = true
        }
        // Check for pounds - look for "pounds" or "lbs"
        if (rowStr.match(/\bpounds?\b/) || rowStr.match(/\blbs?\b/) || rowStr.includes('(lbs)')) {
          usesPounds = true
        }
        // Check for meters
        if (rowStr.match(/\bmeters?\b/) || rowStr.includes('(m)')) {
          usesMeters = true
        }
      }

      // Find the header row (the row with actual column headers, not metadata rows)
      // Header row should have multiple dimension-related column names (not descriptive text like "Length dimensions:")
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] as unknown[]
        // Convert row to array of trimmed lowercase strings for column name matching
        const cells = row.map(cell => String(cell || '').trim().toLowerCase())
        const rowStr = row.join(' ').toLowerCase()

        // Best match: SKU, Name/Description, Length, Width, Height columns present
        // This is the Cargo Planner format: "SKU, Name, Length, Width, Height, Weight, Quantity, Stackable..."
        if (cells.includes('sku') && (cells.includes('name') || cells.includes('description')) &&
            cells.includes('length') && cells.includes('width') && cells.includes('height')) {
          headerRowIndex = i
          break
        }

        // Good match: Multiple dimension columns as separate cells (not as descriptive text)
        // Check that "length", "width", "height", "weight" are individual column headers
        const hasLength = cells.some(c => c.match(/^length\s*$/i))
        const hasWidth = cells.some(c => c.match(/^width\s*$/i))
        const hasHeight = cells.some(c => c.match(/^height\s*$/i))
        const hasWeight = cells.some(c => c.match(/^weight\s*$/i))
        const dimensionColumnCount = [hasLength, hasWidth, hasHeight, hasWeight].filter(Boolean).length

        if (dimensionColumnCount >= 3) {
          headerRowIndex = i
          break
        }

        // Fallback: Classic "L x W x H" style header or item/description column with dimensions
        if (rowStr.match(/length.*width.*height.*weight/i) && !rowStr.includes('dimensions:')) {
          headerRowIndex = i
          break
        }
      }

      const headers = (jsonData[headerRowIndex] as unknown[]).map(h => String(h || ''))
      const columnMap = autoDetectColumns(headers)

      // Collect raw text from sheet for AI fallback
      rawTextParts.push(`Sheet: ${sheetName}`)
      rawTextParts.push(headers.join(' | '))

      // Process data rows
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]
        if (!row || row.every(cell => cell === '' || cell === null)) continue

        // Add row to raw text
        rawTextParts.push((row as unknown[]).map(cell => String(cell || '')).join(' | '))

        totalRows++

        // Get SKU
        let sku: string | undefined
        if (columnMap.sku !== undefined) {
          sku = String(row[columnMap.sku] || '') || undefined
        }

        // Get description
        let description = ''
        if (columnMap.description !== undefined) {
          description = String(row[columnMap.description] || '')
        }

        // Skip if no description and no dimension data
        if (!description && !sku && !row.some(cell => parseNumber(cell) !== null)) continue

        // Get quantity
        let quantity = 1
        if (columnMap.quantity !== undefined) {
          quantity = parseNumber(row[columnMap.quantity]) || 1
        }

        // Get dimensions - prefer feet, then inches, then meters, then decimeters (Cargo Planner)
        let length = 0, width = 0, height = 0, weight = 0

        // Weight: prefer lbs, then convert from kg or tons
        if (columnMap.weightLbs !== undefined) {
          weight = parseNumber(row[columnMap.weightLbs]) || 0
        } else if (columnMap.weightKg !== undefined || usesKilograms) {
          // If Cargo Planner format with kilograms
          const kgCol = columnMap.weightKg ?? headers.findIndex(h => h.toLowerCase().includes('weight'))
          if (kgCol >= 0) {
            const kg = parseNumber(row[kgCol]) || 0
            weight = kgToLbs(kg)
          }
        } else if (columnMap.weightTons !== undefined) {
          const tons = parseNumber(row[columnMap.weightTons]) || 0
          weight = tonsToLbs(tons)
        }

        // Length: detect unit from metadata and apply conversion
        const lengthColIndex = headers.findIndex(h => h.toLowerCase().match(/^length\s*$/i))
        if (usesDecimeters && (columnMap.lengthDecimeters !== undefined || lengthColIndex >= 0)) {
          const col = columnMap.lengthDecimeters ?? lengthColIndex
          length = decimetersToFeet(parseNumber(row[col]) || 0)
        } else if (usesInches && lengthColIndex >= 0) {
          // Inches detected in metadata - convert to feet
          length = inchesToFeet(parseNumber(row[lengthColIndex]) || 0)
        } else if (usesMeters && lengthColIndex >= 0) {
          // Meters detected in metadata - convert to feet
          length = metersToFeet(parseNumber(row[lengthColIndex]) || 0)
        } else if (columnMap.lengthFeet !== undefined) {
          length = parseNumber(row[columnMap.lengthFeet]) || 0
        } else if (columnMap.lengthInches !== undefined) {
          length = inchesToFeet(parseNumber(row[columnMap.lengthInches]) || 0)
        } else if (columnMap.lengthMeters !== undefined) {
          length = metersToFeet(parseNumber(row[columnMap.lengthMeters]) || 0)
        }

        // Width: detect unit from metadata and apply conversion
        const widthColIndex = headers.findIndex(h => h.toLowerCase().match(/^width\s*$/i))
        if (usesDecimeters && widthColIndex >= 0) {
          width = decimetersToFeet(parseNumber(row[widthColIndex]) || 0)
        } else if (usesInches && widthColIndex >= 0) {
          // Inches detected in metadata - convert to feet
          width = inchesToFeet(parseNumber(row[widthColIndex]) || 0)
        } else if (usesMeters && widthColIndex >= 0) {
          // Meters detected in metadata - convert to feet
          width = metersToFeet(parseNumber(row[widthColIndex]) || 0)
        } else if (columnMap.widthFeet !== undefined) {
          width = parseNumber(row[columnMap.widthFeet]) || 0
        } else if (columnMap.widthInches !== undefined) {
          width = inchesToFeet(parseNumber(row[columnMap.widthInches]) || 0)
        } else if (columnMap.widthMeters !== undefined) {
          width = metersToFeet(parseNumber(row[columnMap.widthMeters]) || 0)
        }

        // Height: detect unit from metadata and apply conversion
        const heightColIndex = headers.findIndex(h => h.toLowerCase().match(/^height\s*$/i))
        if (usesDecimeters && heightColIndex >= 0) {
          height = decimetersToFeet(parseNumber(row[heightColIndex]) || 0)
        } else if (usesInches && heightColIndex >= 0) {
          // Inches detected in metadata - convert to feet
          height = inchesToFeet(parseNumber(row[heightColIndex]) || 0)
        } else if (usesMeters && heightColIndex >= 0) {
          // Meters detected in metadata - convert to feet
          height = metersToFeet(parseNumber(row[heightColIndex]) || 0)
        } else if (columnMap.heightFeet !== undefined) {
          height = parseNumber(row[columnMap.heightFeet]) || 0
        } else if (columnMap.heightInches !== undefined) {
          height = inchesToFeet(parseNumber(row[columnMap.heightInches]) || 0)
        } else if (columnMap.heightMeters !== undefined) {
          height = metersToFeet(parseNumber(row[columnMap.heightMeters]) || 0)
        }

        // Skip rows with no useful data
        if (length === 0 && width === 0 && height === 0 && weight === 0) continue

        parsedRows++

        // Extract Cargo Planner specific fields
        const stackable = columnMap.stackable !== undefined
          ? parseYesNo(row[columnMap.stackable])
          : undefined
        const bottomOnly = columnMap.bottomOnly !== undefined
          ? parseYesNo(row[columnMap.bottomOnly])
          : undefined
        const orientation = columnMap.orientation !== undefined
          ? parseNumber(row[columnMap.orientation]) ?? undefined
          : undefined
        const maxLayers = columnMap.maxLayers !== undefined
          ? parseNumber(row[columnMap.maxLayers]) ?? undefined
          : undefined
        const maxLoad = columnMap.maxLoad !== undefined
          ? parseNumber(row[columnMap.maxLoad]) ?? undefined
          : undefined
        const geometry = columnMap.geometry !== undefined
          ? parseGeometry(row[columnMap.geometry])
          : undefined
        const color = columnMap.color !== undefined
          ? String(row[columnMap.color] || '') || undefined
          : undefined
        const priority = columnMap.priority !== undefined
          ? parseNumber(row[columnMap.priority]) ?? undefined
          : undefined

        items.push({
          id: generateId(),
          sku,
          description: description || sku || `Item ${parsedRows}`,
          quantity,
          length: Math.round(length * 100) / 100,
          width: Math.round(width * 100) / 100,
          height: Math.round(height * 100) / 100,
          weight: Math.round(weight),
          stackable,
          bottomOnly,
          orientation,
          maxLayers,
          maxLoad,
          geometry,
          color,
          priority,
          raw: headers.reduce((acc, h, idx) => {
            if (h) acc[h] = row[idx]
            return acc
          }, {} as Record<string, unknown>),
        })
      }
    }

    // If no items found, include raw text for AI fallback
    const rawText = items.length === 0 && rawTextParts.length > 0
      ? rawTextParts.join('\n')
      : undefined

    return {
      success: items.length > 0,
      items,
      metadata: {
        fileName,
        fileType: fileName.endsWith('.csv') ? 'CSV' : 'Excel',
        totalRows,
        parsedRows: items.length,
      },
      rawText,
      error: items.length === 0 ? 'No valid cargo items found in file' : undefined,
    }
  } catch (error) {
    return {
      success: false,
      items: [],
      error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse PDF text content
 */
export function parsePDFText(text: string): UniversalParseResult {
  // For PDFs, we'll extract the raw text and return it for AI processing
  // along with any dimensions we can pattern-match

  const items: ParsedItem[] = []

  // Try to find dimension patterns in the text
  // L x W x H format: "32' x 10' x 10'6""
  const lwhMatch = text.match(/(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['"]?/)
  if (lwhMatch) {
    const l = parseFloat(lwhMatch[1])
    const w = parseFloat(lwhMatch[2])
    const h = parseFloat(lwhMatch[3])

    // Try to find weight
    const weightMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
    const weight = weightMatch ? parseNumber(weightMatch[1]) || 0 : 0

    // Try to find description
    const descMatch = text.match(/(?:item|description|cargo|equipment|product)[:\s]*([^\n,]+)/i)
    const description = descMatch ? descMatch[1].trim() : 'Cargo from PDF'

    items.push({
      id: generateId(),
      description,
      quantity: 1,
      length: l,
      width: w,
      height: h,
      weight,
    })
  }

  return {
    success: true,
    items,
    rawText: text, // Return raw text for AI processing
    metadata: {
      fileType: 'PDF',
      parsedRows: items.length,
    },
  }
}

/**
 * Parse plain text (email, manual input)
 */
export function parseText(text: string): UniversalParseResult {
  const items: ParsedItem[] = []

  // Pattern matching for dimensions
  const patterns = {
    // L x W x H formats
    lwhPattern: /(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|")?/,
    // Feet and inches: 10'6"
    feetInches: /(\d+)'(\d+)"/g,
    // Individual dimensions
    length: /(?:length|len|l)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    width: /(?:width|wid|w)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    height: /(?:height|hgt|h)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    weight: /(?:weight|wt)[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?|tons?)?/i,
    // Description hints
    description: /(?:item|description|cargo|equipment|product|moving)[:\s]*([^\n,]+)/i,
  }

  let length = 0, width = 0, height = 0, weight = 0, description = ''

  // Try LxWxH pattern
  const lwhMatch = text.match(patterns.lwhPattern)
  if (lwhMatch) {
    length = parseFloat(lwhMatch[1])
    width = parseFloat(lwhMatch[2])
    height = parseFloat(lwhMatch[3])
  } else {
    // Try individual patterns
    const lengthMatch = text.match(patterns.length)
    const widthMatch = text.match(patterns.width)
    const heightMatch = text.match(patterns.height)

    if (lengthMatch) length = parseFloat(lengthMatch[1])
    if (widthMatch) width = parseFloat(widthMatch[1])
    if (heightMatch) height = parseFloat(heightMatch[1])
  }

  // Get weight
  const weightMatch = text.match(patterns.weight)
  if (weightMatch) {
    weight = parseNumber(weightMatch[1]) || 0
    // Convert if kg
    if (text.toLowerCase().includes('kg')) {
      weight = kgToLbs(weight)
    }
  }

  // Get description
  const descMatch = text.match(patterns.description)
  if (descMatch) {
    description = descMatch[1].trim()
  } else {
    // Try to extract any quoted text or equipment name
    const quotedMatch = text.match(/"([^"]+)"|'([^']+)'/)
    if (quotedMatch) {
      description = quotedMatch[1] || quotedMatch[2]
    } else {
      // Look for common equipment names
      const equipmentMatch = text.match(/\b(excavator|bulldozer|crane|loader|generator|transformer|tank|vessel|container|trailer|equipment)\b/i)
      if (equipmentMatch) {
        description = equipmentMatch[0]
      }
    }
  }

  if (length > 0 || width > 0 || height > 0 || weight > 0) {
    items.push({
      id: generateId(),
      description: description || 'Cargo',
      quantity: 1,
      length,
      width,
      height,
      weight,
    })
  }

  return {
    success: items.length > 0,
    items,
    rawText: text,
    metadata: {
      fileType: 'Text',
      parsedRows: items.length,
    },
    error: items.length === 0 ? 'Could not extract cargo dimensions from text' : undefined,
  }
}

/**
 * Detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<UniversalParseResult> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    const buffer = await file.arrayBuffer()
    return parseSpreadsheet(buffer, file.name)
  }

  if (fileName.endsWith('.pdf')) {
    // For PDF, we need server-side processing
    return {
      success: true,
      items: [],
      rawText: 'PDF_NEEDS_SERVER_PROCESSING',
      metadata: {
        fileName: file.name,
        fileType: 'PDF',
      },
    }
  }

  if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
    // For images, we need AI vision processing
    return {
      success: true,
      items: [],
      rawText: 'IMAGE_NEEDS_AI_PROCESSING',
      metadata: {
        fileName: file.name,
        fileType: 'Image',
      },
    }
  }

  if (fileName.endsWith('.txt') || fileName.endsWith('.eml')) {
    const text = await file.text()
    return parseText(text)
  }

  // Try to read as text
  try {
    const text = await file.text()
    return parseText(text)
  } catch {
    return {
      success: false,
      items: [],
      error: `Unsupported file type: ${file.name}`,
    }
  }
}

// Export unit conversion helpers for use in other modules
export const unitConversions = {
  metersToFeet,
  decimetersToFeet,
  kgToLbs,
  tonsToLbs,
  inchesToFeet,
  cmToFeet,
  mmToFeet,
}
