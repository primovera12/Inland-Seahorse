import { RateLookup } from './supabase'

export interface PriceValidation {
  isValid: boolean
  warnings: string[]
  type: 'normal' | 'low' | 'high' | 'suspicious'
}

export function validatePrice(rate: RateLookup, allRates: RateLookup[]): PriceValidation {
  if (rate.price === null) {
    return {
      isValid: true,
      warnings: [],
      type: 'normal'
    }
  }

  const warnings: string[] = []
  let type: 'normal' | 'low' | 'high' | 'suspicious' = 'normal'

  // Get all prices for statistical analysis
  const allPrices = allRates
    .filter(r => r.price !== null)
    .map(r => r.price!)

  if (allPrices.length === 0) {
    return { isValid: true, warnings: [], type: 'normal' }
  }

  const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length
  const stdDev = Math.sqrt(
    allPrices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / allPrices.length
  )

  // Check if price is suspiciously low
  if (rate.price < 100) {
    warnings.push('Price is very low (< $100)')
    type = 'low'
  }

  // Check if price is suspiciously high
  if (rate.price > avg + (3 * stdDev)) {
    warnings.push('Price is significantly higher than average')
    type = 'high'
  }

  // Check if price is suspiciously low compared to average
  if (rate.price < avg - (3 * stdDev) && rate.price > 0) {
    warnings.push('Price is significantly lower than average')
    type = 'low'
  }

  // Check for round numbers that might be placeholders
  if (rate.price % 1000 === 0 && rate.price > 0) {
    warnings.push('Round number - might be an estimate')
    type = 'suspicious'
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    type: warnings.length > 0 ? type : 'normal'
  }
}

export function getPriceValidationColor(type: 'normal' | 'low' | 'high' | 'suspicious'): string {
  switch (type) {
    case 'low':
      return 'border-blue-400'
    case 'high':
      return 'border-orange-400'
    case 'suspicious':
      return 'border-amber-400'
    default:
      return 'border-gray-300'
  }
}
