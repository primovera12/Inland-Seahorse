import { DEFAULT_DIMENSION_THRESHOLDS, type DimensionThresholds } from '@/types/settings'

/**
 * Convert inches to ft-in input format for display
 * Example: 364 → "30-4" (30 feet 4 inches)
 * Example: 130 → "10-10" (10 feet 10 inches)
 */
export function inchesToFtInInput(inches: number): string {
  if (!inches || inches <= 0) return ''

  const feet = Math.floor(inches / 12)
  const remainingInches = Math.round(inches % 12)

  return `${feet}-${remainingInches}`
}

/**
 * Parse ft-in input format to inches
 * Accepts: "30-4", "30.4", "30 4", "30'4", or just "364" (plain inches)
 * Example: "30-4" → 364 inches
 */
export function ftInInputToInches(value: string): number {
  if (!value || value.trim() === '') return 0

  const trimmed = value.trim()

  // Try to match ft-in patterns: "30-4", "30.4", "30 4", "30'4"
  const ftInMatch = trimmed.match(/^(\d+)[\-\.\s'"](\d+)$/)
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1]) || 0
    const inches = parseInt(ftInMatch[2]) || 0
    return feet * 12 + inches
  }

  // If just a number, check if it's likely feet or inches
  const numValue = parseFloat(trimmed)
  if (isNaN(numValue)) return 0

  // If it has a decimal, treat as feet.inches (e.g., 30.4 = 30'4")
  if (trimmed.includes('.')) {
    const feet = Math.floor(numValue)
    const decimalPart = numValue - feet
    const inches = Math.round(decimalPart * 10)
    return feet * 12 + inches
  }

  // Plain integer - if small enough, treat as feet, otherwise as inches
  // Equipment typically 8-60 feet, so values under 70 are likely feet
  if (numValue <= 70) {
    return Math.round(numValue * 12) // Treat as feet
  }

  return Math.round(numValue) // Treat as inches
}

/**
 * Smart dimension parser that handles both feet.inches and plain inches input
 *
 * Examples:
 * - "10.6" with length type → 126 inches (10 feet 6 inches)
 * - "126" with length type → 126 inches (detected as plain inches due to threshold)
 * - "8.5" with height type → 101 inches (8 feet 5 inches)
 *
 * The threshold logic:
 * - If value > threshold, treat as plain inches
 * - If value <= threshold, treat as feet.inches format
 */
export function parseSmartDimension(
  value: string | number,
  dimensionType: 'length' | 'width' | 'height',
  thresholds: DimensionThresholds = DEFAULT_DIMENSION_THRESHOLDS
): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) return 0

  // Get threshold for this dimension type
  const threshold = thresholds[`${dimensionType}_threshold`]

  // If value is greater than threshold, it's likely already in inches
  if (numValue > threshold) {
    return Math.round(numValue)
  }

  // Otherwise, parse as feet.inches format
  const feet = Math.floor(numValue)
  const decimalPart = numValue - feet
  const inches = Math.round(decimalPart * 10) // 10.6 → 6 inches

  return feet * 12 + inches
}

/**
 * Convert inches to feet and inches string
 * Example: 126 → "10' 6\""
 */
export function inchesToFeetInches(inches: number): string {
  if (!inches || inches <= 0) return '0\' 0"'

  const feet = Math.floor(inches / 12)
  const remainingInches = Math.round(inches % 12)

  return `${feet}' ${remainingInches}"`
}

/**
 * Convert inches to formatted dimension string
 * Example: 126 → "10'-6\""
 */
export function formatDimension(inches: number): string {
  if (!inches || inches <= 0) return '-'

  const feet = Math.floor(inches / 12)
  const remainingInches = Math.round(inches % 12)

  return `${feet}'-${remainingInches}"`
}

/**
 * Format dimension with both inches and feet display
 * Example: 126 → "126\" (10'-6\")"
 */
export function formatDimensionDual(inches: number): string {
  if (!inches || inches <= 0) return '-'

  const feet = Math.floor(inches / 12)
  const remainingInches = Math.round(inches % 12)

  return `${inches}" (${feet}'-${remainingInches}")`
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10
}

/**
 * Convert inches to meters
 */
export function inchesToMeters(inches: number): number {
  return Math.round((inches * 2.54 / 100) * 100) / 100
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54)
}

/**
 * Convert meters to inches
 */
export function metersToInches(meters: number): number {
  return Math.round(meters * 100 / 2.54)
}

export type DimensionUnit = 'inches' | 'ft-in' | 'cm' | 'mm' | 'meters'
export type WeightUnit = 'lbs' | 'kg' | 'ton'

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number): number {
  return Math.round(mm / 25.4)
}

/**
 * Convert inches to millimeters
 */
export function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4)
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462)
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462)
}

/**
 * Convert tons to pounds (1 ton = 2000 lbs)
 */
export function tonToLbs(ton: number): number {
  return Math.round(ton * 2000)
}

/**
 * Convert pounds to tons
 */
export function lbsToTon(lbs: number): number {
  return Math.round((lbs / 2000) * 100) / 100 // 2 decimal places
}

/**
 * Parse dimension from any unit to inches
 */
export function parseDimensionToInches(value: number | string, unit: DimensionUnit): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!numValue || isNaN(numValue) || numValue <= 0) return 0

  switch (unit) {
    case 'inches':
      return Math.round(numValue)
    case 'ft-in':
      // For ft-in, use the smart parser
      return ftInInputToInches(String(value))
    case 'cm':
      return cmToInches(numValue)
    case 'mm':
      return mmToInches(numValue)
    case 'meters':
      return metersToInches(numValue)
    default:
      return Math.round(numValue)
  }
}

/**
 * Parse weight from any unit to pounds
 */
export function parseWeightToLbs(value: number | string, unit: WeightUnit): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!numValue || isNaN(numValue) || numValue <= 0) return 0

  switch (unit) {
    case 'lbs':
      return Math.round(numValue)
    case 'kg':
      return kgToLbs(numValue)
    case 'ton':
      return tonToLbs(numValue)
    default:
      return Math.round(numValue)
  }
}

/**
 * Format weight in specified unit
 */
export function formatWeightInUnit(lbs: number, unit: WeightUnit): string {
  if (!lbs || lbs <= 0) return '-'

  switch (unit) {
    case 'lbs':
      return `${lbs.toLocaleString()} lbs`
    case 'kg':
      return `${lbsToKg(lbs).toLocaleString()} kg`
    case 'ton':
      return `${lbsToTon(lbs)} ton`
    default:
      return `${lbs.toLocaleString()} lbs`
  }
}

/**
 * Format dimension in specified unit
 */
export function formatDimensionInUnit(inches: number, unit: DimensionUnit): string {
  if (!inches || inches <= 0) return '-'

  switch (unit) {
    case 'inches':
      return `${inches}"`
    case 'ft-in':
      const feet = Math.floor(inches / 12)
      const remainingInches = Math.round(inches % 12)
      return `${feet}'-${remainingInches}"`
    case 'cm':
      return `${inchesToCm(inches)} cm`
    case 'mm':
      return `${inchesToMm(inches)} mm`
    case 'meters':
      return `${inchesToMeters(inches)} m`
    default:
      return `${inches}"`
  }
}

/**
 * Parse dimension from any unit to inches
 */
export function parseDimensionFromUnit(value: number, unit: DimensionUnit): number {
  if (!value || value <= 0) return 0

  switch (unit) {
    case 'inches':
      return Math.round(value)
    case 'feet':
      // Assume feet.inches format (e.g., 10.6 = 10 feet 6 inches)
      const feet = Math.floor(value)
      const decimalPart = value - feet
      const remainingInches = Math.round(decimalPart * 10)
      return feet * 12 + remainingInches
    case 'cm':
      return cmToInches(value)
    case 'meters':
      return metersToInches(value)
    default:
      return Math.round(value)
  }
}

/**
 * Format dimension with all units display
 */
export function formatDimensionAllUnits(inches: number): {
  inches: string
  feetInches: string
  cm: string
  meters: string
} {
  if (!inches || inches <= 0) {
    return { inches: '-', feetInches: '-', cm: '-', meters: '-' }
  }

  return {
    inches: `${inches}"`,
    feetInches: formatDimension(inches),
    cm: `${inchesToCm(inches)} cm`,
    meters: `${inchesToMeters(inches)} m`,
  }
}

/**
 * Convert various input formats to inches
 * Handles: "10'6\"", "10-6", "10.6", "126", etc.
 */
export function convertToInches(value: string): number {
  if (!value) return 0

  // Try feet'inches" format first
  const feetInchesMatch = value.match(/(\d+)['\s]*(\d+)?[""]?/)
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1]) || 0
    const inches = parseInt(feetInchesMatch[2]) || 0
    return feet * 12 + inches
  }

  // Try feet-inches format
  const dashMatch = value.match(/(\d+)-(\d+)/)
  if (dashMatch) {
    const feet = parseInt(dashMatch[1]) || 0
    const inches = parseInt(dashMatch[2]) || 0
    return feet * 12 + inches
  }

  // Just a number - assume inches
  return parseFloat(value) || 0
}

/**
 * Convert various weight inputs to pounds
 * Handles: "5000", "5,000", "5000 lbs", "2.5 tons"
 */
export function convertToLbs(value: string): number {
  if (!value) return 0

  const cleanValue = value.toLowerCase().replace(/,/g, '')

  // Check for tons
  const tonsMatch = cleanValue.match(/([\d.]+)\s*tons?/)
  if (tonsMatch) {
    return Math.round(parseFloat(tonsMatch[1]) * 2000)
  }

  // Extract number
  const numMatch = cleanValue.match(/([\d.]+)/)
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]))
  }

  return 0
}

/**
 * Format weight for display
 * Example: 48000 → "48,000 lbs"
 */
export function formatWeight(lbs: number): string {
  if (!lbs || lbs <= 0) return '-'
  return `${lbs.toLocaleString()} lbs`
}

/**
 * Check if dimensions require oversize permits
 */
export function isOversize(
  lengthInches: number,
  widthInches: number,
  heightInches: number,
  legalLimits = { length: 636, width: 102, height: 162 }
): boolean {
  return (
    lengthInches > legalLimits.length ||
    widthInches > legalLimits.width ||
    heightInches > legalLimits.height
  )
}

/**
 * Check if weight requires overweight permits
 */
export function isOverweight(
  weightLbs: number,
  legalLimit = 48000
): boolean {
  return weightLbs > legalLimit
}
