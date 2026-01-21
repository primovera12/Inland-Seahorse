/**
 * Truck Selector Algorithm for Load Planner
 *
 * CRITICAL CALCULATION:
 * Total Height = Cargo Height + Trailer Deck Height
 * This must be <= 13.5 feet to be legal without permits
 *
 * The algorithm scores each truck type based on:
 * 1. Whether cargo fits within legal limits
 * 2. How well the truck matches the cargo size
 * 3. Required permits and their costs
 */

import type {
  TruckType,
  TruckRecommendation,
  FitAnalysis,
  PermitRequired,
  ParsedLoad,
} from './types'
import { trucks, LEGAL_LIMITS, SUPERLOAD_THRESHOLDS } from './trucks'

/**
 * Analyze how cargo fits on a specific truck
 */
function analyzeFit(cargo: ParsedLoad, truck: TruckType): FitAnalysis {
  // CRITICAL: Total height = cargo height + deck height
  const totalHeight = cargo.height + truck.deckHeight

  // Calculate total weight (cargo + trailer tare + tractor)
  const totalWeight =
    cargo.weight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

  // Check against legal limits
  const exceedsHeight = totalHeight > LEGAL_LIMITS.HEIGHT
  const exceedsWidth = cargo.width > LEGAL_LIMITS.WIDTH
  const exceedsWeight = totalWeight > LEGAL_LIMITS.GROSS_WEIGHT
  const exceedsLength = cargo.length > truck.deckLength

  // Calculate clearances
  const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight
  const widthClearance = LEGAL_LIMITS.WIDTH - cargo.width
  const weightClearance = LEGAL_LIMITS.GROSS_WEIGHT - totalWeight

  // Does it physically fit?
  const fits =
    cargo.length <= truck.deckLength &&
    cargo.width <= truck.deckWidth &&
    cargo.weight <= truck.maxCargoWeight

  return {
    fits,
    totalHeight,
    heightClearance,
    widthClearance,
    totalWeight,
    weightClearance,
    isLegal: !exceedsHeight && !exceedsWidth && !exceedsWeight && !exceedsLength,
    exceedsHeight,
    exceedsWidth,
    exceedsWeight,
    exceedsLength,
  }
}

/**
 * Determine required permits based on cargo and fit analysis
 */
function determinePermits(
  cargo: ParsedLoad,
  fit: FitAnalysis
): PermitRequired[] {
  const permits: PermitRequired[] = []

  // Check width permit
  if (fit.exceedsWidth) {
    const isSuperload = cargo.width > SUPERLOAD_THRESHOLDS.WIDTH
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERSIZE_WIDTH',
      reason: `Width of ${cargo.width.toFixed(1)}' exceeds ${LEGAL_LIMITS.WIDTH}' legal limit`,
      estimatedCost: isSuperload ? 500 : 100,
    })
  }

  // Check height permit
  if (fit.exceedsHeight) {
    const isSuperload = fit.totalHeight > SUPERLOAD_THRESHOLDS.HEIGHT
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERSIZE_HEIGHT',
      reason: `Total height of ${fit.totalHeight.toFixed(1)}' exceeds ${LEGAL_LIMITS.HEIGHT}' legal limit`,
      estimatedCost: isSuperload ? 500 : 100,
    })
  }

  // Check weight permit
  if (fit.exceedsWeight) {
    const isSuperload = fit.totalWeight > SUPERLOAD_THRESHOLDS.WEIGHT
    permits.push({
      type: isSuperload ? 'SUPERLOAD' : 'OVERWEIGHT',
      reason: `GVW of ${fit.totalWeight.toLocaleString()} lbs exceeds ${LEGAL_LIMITS.GROSS_WEIGHT.toLocaleString()} lbs limit`,
      estimatedCost: isSuperload ? 750 : 150,
    })
  }

  // Check length permit
  if (fit.exceedsLength) {
    permits.push({
      type: 'OVERSIZE_LENGTH',
      reason: `Length of ${cargo.length.toFixed(1)}' may require permits in some states`,
      estimatedCost: 75,
    })
  }

  return permits
}

/**
 * Calculate recommendation score for a truck
 *
 * Score breakdown:
 * - Base score: 100
 * - Deductions for exceeded limits
 * - Deductions for overkill (using lowboy for short cargo)
 * - Bonuses for ideal fit
 */
function calculateScore(
  cargo: ParsedLoad,
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): number {
  let score = 100

  // Major deductions for exceeded limits
  if (!fit.fits) {
    score -= 50 // Cargo physically doesn't fit
  }

  if (fit.exceedsHeight) {
    // Deduct based on how much it exceeds
    const excess = fit.totalHeight - LEGAL_LIMITS.HEIGHT
    score -= Math.min(40, excess * 10) // Up to 40 points
  }

  if (fit.exceedsWidth) {
    const excess = cargo.width - LEGAL_LIMITS.WIDTH
    score -= Math.min(25, excess * 5) // Up to 25 points
  }

  if (fit.exceedsWeight) {
    const excessPercent =
      ((fit.totalWeight - LEGAL_LIMITS.GROSS_WEIGHT) / LEGAL_LIMITS.GROSS_WEIGHT) * 100
    score -= Math.min(30, excessPercent) // Up to 30 points
  }

  // Deduction for overkill trailer choice
  // (e.g., using a lowboy with 1.5' deck for cargo that fits on flatbed)
  if (fit.heightClearance > 3) {
    // More than 3 feet of clearance = overkill
    score -= 10
  }

  // Deduction for each permit required
  score -= permits.length * 5

  // Bonus for ideal deck height match
  if (fit.heightClearance >= 0 && fit.heightClearance <= 1) {
    // Perfect height fit (within 1 foot of limit)
    score += 5
  }

  // Bonus for matching loading method to cargo type
  // (tracked equipment should use drive-on trailers)
  if (
    truck.loadingMethod === 'drive-on' &&
    cargo.description?.toLowerCase().match(/excavator|dozer|loader|tractor|tracked/)
  ) {
    score += 10
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Generate recommendation reason text
 */
function generateReason(
  truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): string {
  const reasons: string[] = []

  if (fit.isLegal && fit.fits) {
    reasons.push(`Cargo fits legally with ${fit.heightClearance.toFixed(1)}' height clearance`)
  } else if (fit.fits && !fit.isLegal) {
    reasons.push(`Cargo fits but requires ${permits.length} permit(s)`)
  } else {
    reasons.push('Cargo may not fit optimally on this trailer')
  }

  // Add deck height context
  reasons.push(
    `${truck.deckHeight}' deck height allows up to ${truck.maxLegalCargoHeight}' cargo`
  )

  return reasons.join('. ')
}

/**
 * Generate warnings for the recommendation
 */
function generateWarnings(
  cargo: ParsedLoad,
  _truck: TruckType,
  fit: FitAnalysis,
  permits: PermitRequired[]
): string[] {
  const warnings: string[] = []

  if (fit.exceedsHeight) {
    warnings.push(
      `Total height ${fit.totalHeight.toFixed(1)}' exceeds 13.5' legal limit - oversize permit required`
    )
  }

  if (fit.exceedsWidth) {
    warnings.push(
      `Width ${cargo.width.toFixed(1)}' exceeds 8.5' legal limit - oversize permit required`
    )
  }

  if (fit.exceedsWeight) {
    warnings.push(
      `GVW ${fit.totalWeight.toLocaleString()} lbs exceeds 80,000 lbs - overweight permit required`
    )
  }

  if (cargo.width > 12) {
    warnings.push('Width over 12\' may require escort vehicles in most states')
  }

  if (cargo.width > 14) {
    warnings.push('Width over 14\' typically requires multiple escorts')
  }

  if (fit.totalHeight > 14) {
    warnings.push('Height over 14\' may require route survey for bridges')
  }

  // Superload warnings
  const hasSuperload = permits.some(p => p.type === 'SUPERLOAD')
  if (hasSuperload) {
    warnings.push(
      'SUPERLOAD: This load exceeds superload thresholds - expect extended permit processing and route restrictions'
    )
  }

  return warnings
}

/**
 * Main function: Select and rank trucks for a given cargo
 *
 * @param cargo - Parsed load information
 * @returns Array of truck recommendations sorted by score (best first)
 */
export function selectTrucks(cargo: ParsedLoad): TruckRecommendation[] {
  const recommendations: TruckRecommendation[] = []

  for (const truck of trucks) {
    const fit = analyzeFit(cargo, truck)
    const permits = determinePermits(cargo, fit)
    const score = calculateScore(cargo, truck, fit, permits)
    const reason = generateReason(truck, fit, permits)
    const warnings = generateWarnings(cargo, truck, fit, permits)

    recommendations.push({
      truck,
      score,
      fit,
      permitsRequired: permits,
      reason,
      warnings,
      isBestChoice: false, // Will be set after sorting
    })
  }

  // Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score)

  // Mark the best choice
  if (recommendations.length > 0) {
    recommendations[0].isBestChoice = true
  }

  return recommendations
}

/**
 * Get only trucks that can legally haul the cargo (no permits)
 */
export function getLegalTrucks(cargo: ParsedLoad): TruckRecommendation[] {
  return selectTrucks(cargo).filter(rec => rec.fit.isLegal)
}

/**
 * Get the single best truck recommendation
 */
export function getBestTruck(cargo: ParsedLoad): TruckRecommendation | null {
  const recommendations = selectTrucks(cargo)
  return recommendations.length > 0 ? recommendations[0] : null
}

/**
 * Quick check if cargo can be transported legally on any truck
 */
export function canTransportLegally(cargo: ParsedLoad): boolean {
  return getLegalTrucks(cargo).length > 0
}

/**
 * Select best trucks for multiple cargo items
 */
export function selectTrucksForMultipleCargo(
  cargoItems: ParsedLoad[]
): Map<string, TruckRecommendation[]> {
  const results = new Map<string, TruckRecommendation[]>()

  for (const cargo of cargoItems) {
    const key = cargo.id || `cargo-${cargoItems.indexOf(cargo)}`
    results.set(key, selectTrucks(cargo))
  }

  return results
}
