/**
 * Unit Helpers for Load Planner
 *
 * Conversion and formatting functions for dimensions and weights.
 * The load planner uses FEET as the primary unit.
 */

/**
 * Format feet as feet and inches (e.g., 12.5 -> "12' 6\"")
 */
export function formatFeetInches(feet: number): string {
  if (!feet || feet <= 0) return '-'

  const wholeFeet = Math.floor(feet)
  const remainingInches = Math.round((feet - wholeFeet) * 12)

  if (remainingInches === 0) {
    return `${wholeFeet}'`
  } else if (remainingInches === 12) {
    return `${wholeFeet + 1}'`
  } else {
    return `${wholeFeet}' ${remainingInches}"`
  }
}

/**
 * Format feet as decimal with unit (e.g., 12.5 -> "12.5 ft")
 */
export function formatFeetDecimal(feet: number, decimals: number = 1): string {
  if (!feet || feet <= 0) return '-'
  return `${feet.toFixed(decimals)} ft`
}

/**
 * Convert inches to feet
 */
export function inchesToFeet(inches: number): number {
  return inches / 12
}

/**
 * Convert feet to inches
 */
export function feetToInches(feet: number): number {
  return feet * 12
}

/**
 * Convert centimeters to feet
 */
export function cmToFeet(cm: number): number {
  return cm / 30.48
}

/**
 * Convert feet to centimeters
 */
export function feetToCm(feet: number): number {
  return feet * 30.48
}

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet / 3.28084
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462
}

/**
 * Format weight with commas (e.g., 42000 -> "42,000 lbs")
 */
export function formatWeight(lbs: number): string {
  if (!lbs || lbs <= 0) return '-'
  return `${lbs.toLocaleString()} lbs`
}

/**
 * Format weight in short form (e.g., 42000 -> "42k lbs")
 */
export function formatWeightShort(lbs: number): string {
  if (!lbs || lbs <= 0) return '-'
  if (lbs >= 1000) {
    return `${(lbs / 1000).toFixed(1)}k lbs`
  }
  return `${lbs} lbs`
}

/**
 * Parse a dimension string and convert to feet
 * Handles various formats: "12 ft", "12'", "144 in", "144\"", "3.65 m", "365 cm"
 */
export function parseDimensionToFeet(value: string): number | null {
  if (!value) return null

  const cleanValue = value.toLowerCase().trim()

  // Try to extract number and unit
  const match = cleanValue.match(/^([\d,.]+)\s*(\D*)$/)
  if (!match) return null

  const num = parseFloat(match[1].replace(',', ''))
  if (isNaN(num)) return null

  const unit = match[2].trim()

  // Convert based on unit
  switch (unit) {
    case 'ft':
    case "'":
    case 'feet':
    case 'foot':
      return num

    case 'in':
    case '"':
    case 'inches':
    case 'inch':
      return inchesToFeet(num)

    case 'm':
    case 'meter':
    case 'meters':
    case 'metre':
    case 'metres':
      return metersToFeet(num)

    case 'cm':
    case 'centimeter':
    case 'centimeters':
    case 'centimetre':
    case 'centimetres':
      return cmToFeet(num)

    case 'mm':
    case 'millimeter':
    case 'millimeters':
    case 'millimetre':
    case 'millimetres':
      return cmToFeet(num / 10)

    case '':
      // No unit - assume feet if > 20, otherwise inches
      return num > 20 ? inchesToFeet(num) : num

    default:
      return null
  }
}

/**
 * Parse a weight string and convert to pounds
 * Handles various formats: "42000 lbs", "42000 lb", "19000 kg", "19 t"
 */
export function parseWeightToLbs(value: string): number | null {
  if (!value) return null

  const cleanValue = value.toLowerCase().trim()

  // Try to extract number and unit
  const match = cleanValue.match(/^([\d,.]+)\s*(\D*)$/)
  if (!match) return null

  const num = parseFloat(match[1].replace(',', ''))
  if (isNaN(num)) return null

  const unit = match[2].trim()

  // Convert based on unit
  switch (unit) {
    case 'lbs':
    case 'lb':
    case 'pounds':
    case 'pound':
      return num

    case 'kg':
    case 'kgs':
    case 'kilogram':
    case 'kilograms':
      return kgToLbs(num)

    case 't':
    case 'ton':
    case 'tons':
    case 'tonne':
    case 'tonnes':
      // Assume metric tons
      return kgToLbs(num * 1000)

    case '':
      // No unit - assume pounds
      return num

    default:
      return null
  }
}
