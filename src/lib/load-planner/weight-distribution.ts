/**
 * Weight Distribution Calculator
 * Calculates axle weights, center of gravity, and balance scores
 * for trailer loads to ensure legal and safe weight distribution.
 */

import {
  LoadItem,
  ItemPlacement3D,
  TruckType,
  AxleWeights,
  WeightDistributionResult,
  AxleConfiguration,
  AXLE_LIMITS,
  DEFAULT_AXLE_CONFIGS,
} from './types'
import { validateBridgeFormula } from './bridge-formula'

// ============================================================================
// AXLE WEIGHT CALCULATION
// ============================================================================

// Tractor center of gravity is approximately 60% from steer axle toward drive axle
const TRACTOR_CG_RATIO = 0.6

// Default optimal CG ratio (fraction of deck length from front)
// Slightly forward of center to balance drive vs trailer axle loading
const DEFAULT_OPTIMAL_CG_RATIO = 0.42

/**
 * Calculate optimal CG position ratio from axle geometry.
 *
 * The ideal cargo CG splits weight proportionally between drive and trailer
 * axle groups based on the kingpin-to-trailer-axle geometry. For most standard
 * trailers this is approximately 40-45% from the front of the deck.
 *
 * Uses trailer axle position and drive axle position to compute the ratio.
 * Falls back to 0.42 when geometry is insufficient.
 */
function getOptimalCGRatio(config: AxleConfiguration): number {
  const trailerAxlePos = config.trailerAxlePosition
  if (trailerAxlePos <= 0) return DEFAULT_OPTIMAL_CG_RATIO

  // The kingpin is at position 0. Cargo placed at position x from kingpin
  // creates moment x * weight about the kingpin. Trailer axle at position
  // trailerAxlePos supports (x / trailerAxlePos) fraction of cargo weight.
  // For balanced loading (equal utilization of drive and trailer axles),
  // we want the CG at ~40-45% of the trailer axle distance from kingpin.
  //
  // Drive tandem capacity = 34,000 lbs (federal)
  // Trailer tandem capacity = 34,000 lbs (federal)
  // For equal capacity: optimal = trailerAxlePos * 0.5
  // But drive axles also carry tractor weight, so cargo should be shifted
  // slightly rearward. Net effect: ~42% of deck length is optimal for
  // most configurations.
  //
  // For multi-axle trailers (higher trailer capacity), shift further back.
  const numTrailerAxles = config.numberOfTrailerAxles || 2
  if (numTrailerAxles >= 3) {
    // Tridem+ trailers can carry more on trailer axles — shift CG rearward
    return 0.45
  }

  return DEFAULT_OPTIMAL_CG_RATIO
}

/**
 * Calculate axle weights based on item placements and truck configuration.
 *
 * Uses a 2-beam pin-jointed model:
 *   Beam 1 (trailer): supported at kingpin and trailer axle(s)
 *   Beam 2 (tractor): supported at steer axle and drive axle, loaded by
 *          tractor weight + kingpin reaction from Beam 1
 *
 * The fifth wheel (kingpin) is the pin joint connecting the two beams.
 * This model guarantees: steerAxle + driveAxle + trailerAxles = totalGross
 * and all axle weights remain physically meaningful.
 */
export function calculateAxleWeights(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  truck: TruckType,
  axleConfig?: AxleConfiguration
): AxleWeights {
  const config = axleConfig || DEFAULT_AXLE_CONFIGS[truck.category]

  const tractorWeight = truck.powerUnitWeight
  const trailerTareWeight = truck.tareWeight

  // Calculate cargo weight and moment about kingpin (position 0)
  let totalCargoWeight = 0
  let cargoMomentAboutKingpin = 0

  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const itemWeight = item.weight * (item.quantity || 1)
    totalCargoWeight += itemWeight

    const itemLength = placement.rotated ? item.width : item.length
    const itemCenterX = placement.x + itemLength / 2

    cargoMomentAboutKingpin += itemWeight * itemCenterX
  }

  const totalGross = tractorWeight + trailerTareWeight + totalCargoWeight

  // Self-propelled (SPMT): no tractor, all weight on trailer axles
  if (tractorWeight === 0) {
    return {
      steerAxle: 0,
      driveAxle: 0,
      trailerAxles: Math.round(totalGross),
      totalGross: Math.round(totalGross),
    }
  }

  // ------------------------------------------------------------------
  // Beam 1: Trailer — supported at kingpin (pos 0) and trailer axle
  // ------------------------------------------------------------------
  const trailerAxlePos = config.trailerAxlePosition
  const trailerCGPos = trailerAxlePos / 2 // tare weight CG at midpoint

  // Moment about kingpin:
  //   R_trailer × trailerAxlePos = cargoMoment + trailerTare × trailerCGPos
  const trailerAxleWeight =
    (cargoMomentAboutKingpin + trailerTareWeight * trailerCGPos) / trailerAxlePos

  // Kingpin reaction: total trailer-side load minus what the trailer axle carries
  const kingpinReaction = trailerTareWeight + totalCargoWeight - trailerAxleWeight

  // ------------------------------------------------------------------
  // Beam 2: Tractor — supported at steer axle and drive axle
  // The kingpin reaction acts downward at the kingpin (position 0).
  // ------------------------------------------------------------------
  const steerPos = config.steerAxlePosition
  const drivePos = config.driveAxlePosition
  const steerToDrive = drivePos - steerPos // positive distance (e.g. 12 ft)

  // Tractor CG positioned 60% from steer toward drive
  const tractorCGPos = steerPos + TRACTOR_CG_RATIO * steerToDrive

  // Moment about steer axle:
  //   R_drive × steerToDrive = tractorWeight × (tractorCG - steerPos)
  //                          + kingpinReaction × (0 - steerPos)
  const driveAxleWeight =
    (tractorWeight * (tractorCGPos - steerPos) +
      kingpinReaction * (0 - steerPos)) /
    steerToDrive

  const steerAxleWeight = tractorWeight + kingpinReaction - driveAxleWeight

  return {
    steerAxle: Math.round(steerAxleWeight),
    driveAxle: Math.round(driveAxleWeight),
    trailerAxles: Math.round(trailerAxleWeight),
    totalGross: Math.round(totalGross),
  }
}

// ============================================================================
// CENTER OF GRAVITY CALCULATION
// ============================================================================

/**
 * Calculate the center of gravity of the load
 * Returns position in feet from front of trailer and from left edge
 */
export function calculateCenterOfGravity(
  items: LoadItem[],
  placements: ItemPlacement3D[]
): { x: number; z: number } {
  let totalWeight = 0
  let momentX = 0
  let momentZ = 0

  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const itemWeight = item.weight * (item.quantity || 1)
    totalWeight += itemWeight

    // Calculate item center position
    const itemLength = placement.rotated ? item.width : item.length
    const itemWidth = placement.rotated ? item.length : item.width
    const centerX = placement.x + itemLength / 2
    const centerZ = placement.z + itemWidth / 2

    momentX += itemWeight * centerX
    momentZ += itemWeight * centerZ
  }

  if (totalWeight === 0) {
    return { x: 0, z: 0 }
  }

  return {
    x: Math.round((momentX / totalWeight) * 100) / 100,
    z: Math.round((momentZ / totalWeight) * 100) / 100,
  }
}

// ============================================================================
// BALANCE SCORING
// ============================================================================

/**
 * Score the weight distribution (0-100)
 * Factors:
 * - Axle weights within legal limits
 * - Center of gravity centered laterally
 * - Balanced front-to-back distribution
 */
export function scoreWeightDistribution(
  axleWeights: AxleWeights,
  centerOfGravity: { x: number; z: number },
  truck: TruckType,
  axleConfig?: AxleConfiguration
): { score: number; warnings: string[]; isLegal: boolean } {
  const warnings: string[] = []
  let score = 100
  let isLegal = true

  const config = axleConfig || DEFAULT_AXLE_CONFIGS[truck.category]
  const numTrailerAxles = config.numberOfTrailerAxles || 2

  // Determine trailer axle limit based on configuration
  let trailerAxleLimit: number = AXLE_LIMITS.TANDEM_AXLE
  if (numTrailerAxles === 1) {
    trailerAxleLimit = AXLE_LIMITS.SINGLE_AXLE
  } else if (numTrailerAxles >= 3) {
    trailerAxleLimit = AXLE_LIMITS.TRIDEM_AXLE + (numTrailerAxles - 3) * AXLE_LIMITS.PER_ADDITIONAL_AXLE
  }

  // Check steer axle
  if (axleWeights.steerAxle > AXLE_LIMITS.STEER_AXLE) {
    const overBy = axleWeights.steerAxle - AXLE_LIMITS.STEER_AXLE
    warnings.push(`Steer axle over limit by ${overBy.toLocaleString()} lbs`)
    score -= 30
    isLegal = false
  }

  // Check drive axle
  if (axleWeights.driveAxle > AXLE_LIMITS.TANDEM_AXLE) {
    const overBy = axleWeights.driveAxle - AXLE_LIMITS.TANDEM_AXLE
    warnings.push(`Drive axle over limit by ${overBy.toLocaleString()} lbs`)
    score -= 30
    isLegal = false
  }

  // Check trailer axles
  if (axleWeights.trailerAxles > trailerAxleLimit) {
    const overBy = axleWeights.trailerAxles - trailerAxleLimit
    warnings.push(`Trailer axles over limit by ${overBy.toLocaleString()} lbs`)
    score -= 30
    isLegal = false
  }

  // Check gross weight
  if (axleWeights.totalGross > AXLE_LIMITS.GROSS_WEIGHT) {
    const overBy = axleWeights.totalGross - AXLE_LIMITS.GROSS_WEIGHT
    warnings.push(`Gross weight over limit by ${overBy.toLocaleString()} lbs`)
    score -= 20
    isLegal = false
  }

  // Check for negative axle weights (severe imbalance — truck would tip)
  if (axleWeights.steerAxle < 0) {
    warnings.push(`Steer axle weight is negative (${axleWeights.steerAxle.toLocaleString()} lbs) — load too far rearward, front wheels would lift`)
    score -= 40
    isLegal = false
  }
  if (axleWeights.driveAxle < 0) {
    warnings.push(`Drive axle weight is negative (${axleWeights.driveAxle.toLocaleString()} lbs) — severe weight imbalance`)
    score -= 40
    isLegal = false
  }
  if (axleWeights.trailerAxles < 0) {
    warnings.push(`Trailer axle weight is negative (${axleWeights.trailerAxles.toLocaleString()} lbs) — load too far forward, trailer would lift`)
    score -= 40
    isLegal = false
  }

  // Check for dangerously low steer axle (steering safety)
  const minSteerWeight = 10000
  if (truck.powerUnitWeight > 0 && axleWeights.steerAxle >= 0 && axleWeights.steerAxle < minSteerWeight) {
    warnings.push(`Steer axle only ${axleWeights.steerAxle.toLocaleString()} lbs — below ${minSteerWeight.toLocaleString()} lb minimum for safe steering`)
    score -= 20
  }

  // Check for any axle below 5% of total (severe imbalance)
  if (axleWeights.totalGross > 0 && truck.powerUnitWeight > 0) {
    const threshold = axleWeights.totalGross * 0.05
    if (axleWeights.steerAxle >= 0 && axleWeights.steerAxle < threshold && axleWeights.steerAxle >= minSteerWeight) {
      warnings.push(`Steer axle at only ${Math.round((axleWeights.steerAxle / axleWeights.totalGross) * 100)}% of GVW — significant imbalance`)
      score -= 10
    }
    if (axleWeights.driveAxle >= 0 && axleWeights.driveAxle < threshold) {
      warnings.push(`Drive axle at only ${Math.round((axleWeights.driveAxle / axleWeights.totalGross) * 100)}% of GVW — significant imbalance`)
      score -= 10
    }
    if (axleWeights.trailerAxles >= 0 && axleWeights.trailerAxles < threshold) {
      warnings.push(`Trailer axles at only ${Math.round((axleWeights.trailerAxles / axleWeights.totalGross) * 100)}% of GVW — significant imbalance`)
      score -= 10
    }
  }

  // Check lateral balance (CG should be near center of trailer width)
  const centerZ = truck.deckWidth / 2
  const lateralOffset = Math.abs(centerOfGravity.z - centerZ)
  if (lateralOffset > 1.0) {
    warnings.push(`Load off-center by ${lateralOffset.toFixed(1)} ft - may affect stability`)
    score -= Math.min(20, lateralOffset * 10)
  }

  // Check longitudinal balance
  // Optimal CG is ~42% from front of deck (slightly forward of center) to properly
  // distribute between drive and trailer axles. For standard trailers, placing CG
  // at 50% overloads the trailer axles relative to drive axles.
  const optimalRatio = getOptimalCGRatio(config)
  const optimalX = truck.deckLength * optimalRatio
  const longitudinalOffset = Math.abs(centerOfGravity.x - optimalX)
  const maxAllowedOffset = truck.deckLength * 0.3
  if (longitudinalOffset > maxAllowedOffset) {
    const direction = centerOfGravity.x < optimalX ? 'forward' : 'rearward'
    warnings.push(`Load positioned too far ${direction} - may affect handling`)
    score -= 10
  }

  // Penalize if any axle is close to limit (within 10%)
  const steerUtilization = axleWeights.steerAxle / AXLE_LIMITS.STEER_AXLE
  const driveUtilization = axleWeights.driveAxle / AXLE_LIMITS.TANDEM_AXLE
  const trailerUtilization = axleWeights.trailerAxles / trailerAxleLimit

  if (steerUtilization > 0.9 && steerUtilization <= 1.0) {
    warnings.push(`Steer axle at ${Math.round(steerUtilization * 100)}% capacity`)
    score -= 5
  }
  if (driveUtilization > 0.9 && driveUtilization <= 1.0) {
    warnings.push(`Drive axle at ${Math.round(driveUtilization * 100)}% capacity`)
    score -= 5
  }
  if (trailerUtilization > 0.9 && trailerUtilization <= 1.0) {
    warnings.push(`Trailer axles at ${Math.round(trailerUtilization * 100)}% capacity`)
    score -= 5
  }

  return {
    score: Math.max(0, Math.round(score)),
    warnings,
    isLegal,
  }
}

// ============================================================================
// WARNING GENERATION
// ============================================================================

/**
 * Generate detailed warnings about weight distribution issues
 */
export function generateWeightWarnings(result: WeightDistributionResult): string[] {
  // Warnings are already included in the result from scoreWeightDistribution
  // This function can add additional context or formatting
  const warnings = [...result.warnings]

  if (!result.isLegal) {
    warnings.unshift('⚠️ WEIGHT DISTRIBUTION EXCEEDS LEGAL LIMITS')
  }

  if (result.balanceScore < 50) {
    warnings.push('Consider repositioning cargo for better balance')
  }

  return warnings
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Perform complete weight distribution analysis
 */
export function analyzeWeightDistribution(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  truck: TruckType,
  axleConfig?: AxleConfiguration
): WeightDistributionResult {
  const axleWeights = calculateAxleWeights(items, placements, truck, axleConfig)
  const centerOfGravity = calculateCenterOfGravity(items, placements)
  const { score, warnings, isLegal } = scoreWeightDistribution(
    axleWeights,
    centerOfGravity,
    truck,
    axleConfig
  )

  // Bridge Formula B validation (23 CFR 658.17)
  const bridgeFormula = validateBridgeFormula(axleWeights, truck, axleConfig)

  // Merge bridge formula results
  const allWarnings = [...warnings, ...bridgeFormula.warnings]
  let adjustedScore = score
  let adjustedLegal = isLegal

  if (!bridgeFormula.passes) {
    adjustedLegal = false
    // Penalty: -25 per violation, capped at -50
    adjustedScore -= Math.min(50, bridgeFormula.violations.length * 25)
  } else if (bridgeFormula.worstMarginPercent < 5) {
    // Near-limit warning penalty
    adjustedScore -= 5
  }

  return {
    axleWeights,
    centerOfGravity,
    balanceScore: Math.max(0, Math.round(adjustedScore)),
    warnings: allWarnings,
    isLegal: adjustedLegal,
    bridgeFormula,
  }
}

// ============================================================================
// OPTIMIZATION SUGGESTIONS
// ============================================================================

/**
 * Suggest optimal cargo position for balanced weight distribution
 * Returns recommended X position (from front of trailer) for best balance
 */
export function suggestOptimalPosition(
  item: LoadItem,
  truck: TruckType,
  existingPlacements: ItemPlacement3D[],
  existingItems: LoadItem[],
  axleConfig?: AxleConfiguration
): { optimalX: number; reason: string } {
  const config = axleConfig || DEFAULT_AXLE_CONFIGS[truck.category]

  // Calculate current axle distribution
  const currentAxleWeights = calculateAxleWeights(existingItems, existingPlacements, truck, config)

  // Determine which axle group needs more weight
  const driveUtilization = currentAxleWeights.driveAxle / AXLE_LIMITS.TANDEM_AXLE
  const trailerUtilization = currentAxleWeights.trailerAxles / AXLE_LIMITS.TANDEM_AXLE

  let optimalX: number
  let reason: string

  if (driveUtilization < trailerUtilization - 0.1) {
    // Put more weight toward front
    optimalX = truck.deckLength * 0.3
    reason = 'Drive axle underloaded - placing cargo toward front'
  } else if (trailerUtilization < driveUtilization - 0.1) {
    // Put more weight toward rear
    optimalX = truck.deckLength * 0.7
    reason = 'Trailer axle underloaded - placing cargo toward rear'
  } else {
    // Balanced - place at optimal CG position (~42% from front, not 50%)
    const ratio = getOptimalCGRatio(config)
    optimalX = truck.deckLength * ratio - item.length / 2
    reason = `Balanced distribution - placing cargo at ${Math.round(ratio * 100)}% from front`
  }

  // Ensure within bounds
  optimalX = Math.max(0, Math.min(optimalX, truck.deckLength - item.length))

  return {
    optimalX: Math.round(optimalX * 10) / 10,
    reason,
  }
}
