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
  LEGAL_LIMITS,
  DEFAULT_AXLE_CONFIGS,
} from './types'

// ============================================================================
// AXLE WEIGHT CALCULATION
// ============================================================================

/**
 * Calculate axle weights based on item placements and truck configuration
 * Uses moment balance equations around kingpin
 */
export function calculateAxleWeights(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  truck: TruckType,
  axleConfig?: AxleConfiguration
): AxleWeights {
  // Get axle configuration (use default if not provided)
  const config = axleConfig || DEFAULT_AXLE_CONFIGS[truck.category]

  // Base weights (empty truck)
  const tractorWeight = LEGAL_LIMITS.TRACTOR_WEIGHT
  const trailerTareWeight = truck.tareWeight

  // Calculate cargo weight and moment about kingpin
  let totalCargoWeight = 0
  let cargoMoment = 0 // Moment about kingpin (positive = behind kingpin)

  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const itemWeight = item.weight * (item.quantity || 1)
    totalCargoWeight += itemWeight

    // Calculate item center position from kingpin
    const itemLength = placement.rotated ? item.width : item.length
    const itemCenterX = placement.x + itemLength / 2

    // Moment = weight × distance from kingpin
    cargoMoment += itemWeight * itemCenterX
  }

  // Calculate trailer axle weight using moment balance
  // Sum of moments about drive axle = 0
  // TrailerAxleWeight × (trailerAxlePos - driveAxlePos) =
  //   CargoMoment + TrailerTareWeight × (trailerAxlePos/2 - driveAxlePos)

  const driveToTrailer = config.trailerAxlePosition - config.driveAxlePosition

  // Trailer weight assumed centered between kingpin and axle
  const trailerCenterFromKingpin = config.trailerAxlePosition / 2
  const trailerMoment = trailerTareWeight * (trailerCenterFromKingpin - config.driveAxlePosition)

  // Calculate weights
  const trailerAxleWeight = (cargoMoment + trailerMoment) / driveToTrailer
  const driveAxleWeight = tractorWeight + trailerTareWeight + totalCargoWeight - trailerAxleWeight

  // Steer axle gets portion of tractor weight (simplified - typically 30-35% of tractor)
  const steerAxleRatio = 0.33
  const steerAxleWeight = tractorWeight * steerAxleRatio
  const adjustedDriveAxle = driveAxleWeight - steerAxleWeight

  const totalGross = tractorWeight + trailerTareWeight + totalCargoWeight

  return {
    steerAxle: Math.round(steerAxleWeight),
    driveAxle: Math.round(Math.max(0, adjustedDriveAxle)),
    trailerAxles: Math.round(Math.max(0, trailerAxleWeight)),
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
  let trailerAxleLimit = AXLE_LIMITS.TANDEM_AXLE
  if (numTrailerAxles === 1) {
    trailerAxleLimit = AXLE_LIMITS.SINGLE_AXLE
  } else if (numTrailerAxles >= 3) {
    trailerAxleLimit = AXLE_LIMITS.TRIDEM_AXLE + (numTrailerAxles - 3) * 8000
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

  // Check lateral balance (CG should be near center of trailer width)
  const centerZ = truck.deckWidth / 2
  const lateralOffset = Math.abs(centerOfGravity.z - centerZ)
  if (lateralOffset > 1.0) {
    warnings.push(`Load off-center by ${lateralOffset.toFixed(1)} ft - may affect stability`)
    score -= Math.min(20, lateralOffset * 10)
  }

  // Check longitudinal balance (optimal CG position is roughly 40-60% of trailer length)
  const optimalX = truck.deckLength * 0.5
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

  return {
    axleWeights,
    centerOfGravity,
    balanceScore: score,
    warnings,
    isLegal,
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
    // Balanced - put in center
    optimalX = truck.deckLength * 0.5 - item.length / 2
    reason = 'Balanced distribution - placing cargo at center'
  }

  // Ensure within bounds
  optimalX = Math.max(0, Math.min(optimalX, truck.deckLength - item.length))

  return {
    optimalX: Math.round(optimalX * 10) / 10,
    reason,
  }
}
