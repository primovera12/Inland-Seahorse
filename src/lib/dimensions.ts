import { DEFAULT_DIMENSION_THRESHOLDS, type DimensionThresholds } from '@/types/settings'

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
