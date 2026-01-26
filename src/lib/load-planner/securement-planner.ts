/**
 * Securement Planner Module
 * Generates DOT-compliant tie-down plans based on cargo weight and dimensions.
 *
 * DOT Securement Rules (49 CFR 393):
 * - Minimum tie-downs: 1 per 10 feet of cargo length (minimum 2)
 * - Weight-based: Additional tie-downs for cargo over 10,000 lbs
 * - Working Load Limit (WLL): Total WLL must equal 50% of cargo weight
 * - Immobilization: Prevent forward/rearward/lateral movement
 */

import {
  LoadItem,
  ItemPlacement3D,
  TieDownPoint,
  TieDownType,
  SecurementPlan,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

// Working Load Limits for common securement equipment
const WLL_RATINGS = {
  strap_2in: 3333,      // 2" ratchet strap
  strap_4in: 5400,      // 4" ratchet strap
  chain_3_8: 6600,      // 3/8" Grade 70 chain
  chain_1_2: 11300,     // 1/2" Grade 70 chain
  binder_standard: 5400, // Standard chain binder
}

// Cargo type securement notes
const CARGO_SECUREMENT_NOTES: Record<string, string[]> = {
  steel_coil: [
    'Use coil racks or cradles',
    'Never position as "suicide coil" (eye vertical facing forward)',
    '4-point securement minimum',
    'Block coil movement in all directions',
  ],
  pipe_tube: [
    'Use stakes on both sides',
    'Tier and block each layer',
    'Minimum 2 tie-downs per tier',
    'Prevent rolling with chocks or wedges',
  ],
  machinery: [
    'Block/chock all wheels',
    'Secure all articulating parts',
    'Drain fluids if not level',
    'Use minimum 4-point securement',
  ],
  lumber: [
    'Use stakes on both sides',
    'Band each layer',
    'Minimum 2 tie-downs',
    'Protect against shifting',
  ],
  vehicle: [
    'Use wheel straps or tire nets',
    'Secure at 4 corners minimum',
    'Place in neutral/park',
    'Set parking brake',
  ],
  concrete: [
    'Block to prevent shifting',
    'Use chains for heavy pieces',
    'Protect edges from chain damage',
    'Ensure stable base',
  ],
  general: [
    'Use edge protectors where tie-downs contact cargo',
    'Verify tie-downs don\'t pass over sharp edges',
    'Re-tension after first 50 miles',
  ],
}

// ============================================================================
// TIE-DOWN CALCULATIONS
// ============================================================================

/**
 * Calculate minimum number of tie-downs required
 * Based on 49 CFR 393.106
 */
export function calculateRequiredTieDowns(item: LoadItem): number {
  const { length, weight, quantity = 1 } = item
  const totalWeight = weight * quantity

  // Base requirement: 1 tie-down per 10 feet of length (minimum 2)
  let tieDowns = Math.max(2, Math.ceil(length / 10))

  // Additional tie-downs for heavy cargo
  if (totalWeight > 10000) {
    tieDowns = Math.max(tieDowns, 4)
  }
  if (totalWeight > 20000) {
    tieDowns = Math.max(tieDowns, 6)
  }
  if (totalWeight > 40000) {
    tieDowns = Math.max(tieDowns, 8)
  }

  // Short but heavy items need more securement
  if (length < 5 && totalWeight > 5000) {
    tieDowns = Math.max(tieDowns, 4)
  }

  return tieDowns
}

/**
 * Calculate required Working Load Limit (WLL)
 * Must be at least 50% of cargo weight
 */
export function calculateRequiredWLL(item: LoadItem): number {
  const totalWeight = item.weight * (item.quantity || 1)
  return Math.ceil(totalWeight * 0.5)
}

/**
 * Determine recommended tie-down type based on cargo weight
 */
export function recommendTieDownType(itemWeight: number): TieDownType {
  if (itemWeight > 30000) {
    return 'chain' // Heavy cargo needs chains
  } else if (itemWeight > 10000) {
    return 'chain' // Medium-heavy, chains preferred
  }
  return 'strap' // Light cargo, straps sufficient
}

/**
 * Get WLL for a tie-down type
 */
export function getTieDownWLL(type: TieDownType, itemWeight: number): number {
  switch (type) {
    case 'chain':
      return itemWeight > 20000 ? WLL_RATINGS.chain_1_2 : WLL_RATINGS.chain_3_8
    case 'binder':
      return WLL_RATINGS.binder_standard
    case 'strap':
    default:
      return itemWeight > 5000 ? WLL_RATINGS.strap_4in : WLL_RATINGS.strap_2in
  }
}

// ============================================================================
// TIE-DOWN POSITION GENERATION
// ============================================================================

/**
 * Generate tie-down positions for an item
 */
export function generateTieDownPositions(
  item: LoadItem,
  placement: ItemPlacement3D
): TieDownPoint[] {
  const tieDowns: TieDownPoint[] = []
  const requiredCount = calculateRequiredTieDowns(item)
  const type = recommendTieDownType(item.weight * (item.quantity || 1))
  const wll = getTieDownWLL(type, item.weight * (item.quantity || 1))

  // Determine item dimensions based on rotation
  const itemLength = placement.rotated ? item.width : item.length
  const itemWidth = placement.rotated ? item.length : item.width

  // Calculate spacing
  const lengthSpacing = itemLength / (Math.ceil(requiredCount / 2) + 1)

  // Generate tie-down points along both sides
  let pointIndex = 0
  const halfCount = Math.ceil(requiredCount / 2)

  for (let i = 0; i < halfCount; i++) {
    const xOffset = lengthSpacing * (i + 1)

    // Driver side (left)
    tieDowns.push({
      x: Math.round(xOffset * 10) / 10,
      z: 0,
      type,
      wll,
      angle: 45, // Typical angle for over-the-top securement
    })
    pointIndex++

    // Passenger side (right) - if we need more tie-downs
    if (pointIndex < requiredCount) {
      tieDowns.push({
        x: Math.round(xOffset * 10) / 10,
        z: Math.round(itemWidth * 10) / 10,
        type,
        wll,
        angle: 45,
      })
      pointIndex++
    }
  }

  // For very heavy items, add corner tie-downs
  const totalWeight = item.weight * (item.quantity || 1)
  if (totalWeight > 30000) {
    // Front corners (direct pull)
    tieDowns.push({
      x: 0.5,
      z: 0.5,
      type: 'chain',
      wll: WLL_RATINGS.chain_1_2,
      angle: 30, // Lower angle for direct forward restraint
    })
    tieDowns.push({
      x: 0.5,
      z: Math.round((itemWidth - 0.5) * 10) / 10,
      type: 'chain',
      wll: WLL_RATINGS.chain_1_2,
      angle: 30,
    })

    // Rear corners
    tieDowns.push({
      x: Math.round((itemLength - 0.5) * 10) / 10,
      z: 0.5,
      type: 'chain',
      wll: WLL_RATINGS.chain_1_2,
      angle: 30,
    })
    tieDowns.push({
      x: Math.round((itemLength - 0.5) * 10) / 10,
      z: Math.round((itemWidth - 0.5) * 10) / 10,
      type: 'chain',
      wll: WLL_RATINGS.chain_1_2,
      angle: 30,
    })
  }

  return tieDowns
}

// ============================================================================
// SECUREMENT PLAN GENERATION
// ============================================================================

/**
 * Generate a complete securement plan for an item
 */
export function generateSecurementPlan(
  item: LoadItem,
  placement: ItemPlacement3D
): SecurementPlan {
  const tieDowns = generateTieDownPositions(item, placement)
  const totalWLL = tieDowns.reduce((sum, td) => sum + td.wll, 0)
  const requiredWLL = calculateRequiredWLL(item)

  // Determine cargo type for notes
  const notes = getSecurementNotes(item)

  return {
    itemId: item.id,
    tieDowns,
    totalWLL,
    requiredWLL,
    isCompliant: totalWLL >= requiredWLL,
    notes,
  }
}

/**
 * Get securement notes based on cargo type/description
 */
export function getSecurementNotes(item: LoadItem): string[] {
  const description = item.description.toLowerCase()
  const notes: string[] = []

  // Match cargo type
  if (description.includes('coil') || description.includes('steel roll')) {
    notes.push(...CARGO_SECUREMENT_NOTES.steel_coil)
  } else if (description.includes('pipe') || description.includes('tube') || description.includes('conduit')) {
    notes.push(...CARGO_SECUREMENT_NOTES.pipe_tube)
  } else if (
    description.includes('machine') ||
    description.includes('excavator') ||
    description.includes('dozer') ||
    description.includes('loader') ||
    description.includes('forklift') ||
    description.includes('equipment')
  ) {
    notes.push(...CARGO_SECUREMENT_NOTES.machinery)
  } else if (description.includes('lumber') || description.includes('wood') || description.includes('timber')) {
    notes.push(...CARGO_SECUREMENT_NOTES.lumber)
  } else if (
    description.includes('vehicle') ||
    description.includes('car') ||
    description.includes('truck') ||
    description.includes('trailer')
  ) {
    notes.push(...CARGO_SECUREMENT_NOTES.vehicle)
  } else if (description.includes('concrete') || description.includes('block') || description.includes('precast')) {
    notes.push(...CARGO_SECUREMENT_NOTES.concrete)
  }

  // Always add general notes
  notes.push(...CARGO_SECUREMENT_NOTES.general)

  // Add weight-specific notes
  const totalWeight = item.weight * (item.quantity || 1)
  if (totalWeight > 20000) {
    notes.push('Heavy load - use chains instead of straps')
    notes.push('Consider additional blocking/bracing')
  }

  // Fragile cargo notes
  if (item.fragile) {
    notes.push('FRAGILE - Pad tie-down contact points')
    notes.push('Do not overtighten - may damage cargo')
  }

  // Stacking notes
  if (item.stackable === false) {
    notes.push('Do not stack - secure independently')
  }

  return [...new Set(notes)] // Remove duplicates
}

// ============================================================================
// SECUREMENT VALIDATION
// ============================================================================

/**
 * Validate a securement plan meets DOT requirements
 */
export function validateSecurement(plan: SecurementPlan): {
  valid: boolean
  violations: string[]
  recommendations: string[]
} {
  const violations: string[] = []
  const recommendations: string[] = []

  // Check WLL requirement (50% of cargo weight)
  if (plan.totalWLL < plan.requiredWLL) {
    const deficit = plan.requiredWLL - plan.totalWLL
    violations.push(
      `Insufficient WLL: ${plan.totalWLL.toLocaleString()} lbs provided, ` +
      `${plan.requiredWLL.toLocaleString()} lbs required (deficit: ${deficit.toLocaleString()} lbs)`
    )
  }

  // Check minimum tie-down count
  if (plan.tieDowns.length < 2) {
    violations.push('Minimum 2 tie-downs required')
  }

  // Check tie-down distribution
  const xPositions = plan.tieDowns.map(td => td.x)
  const minX = Math.min(...xPositions)
  const maxX = Math.max(...xPositions)
  if (maxX - minX < 2 && plan.tieDowns.length >= 4) {
    recommendations.push('Consider spreading tie-downs along full length of cargo')
  }

  // Check for both sides secured
  const leftSide = plan.tieDowns.filter(td => td.z === 0)
  const rightSide = plan.tieDowns.filter(td => td.z > 0)
  if (leftSide.length === 0 || rightSide.length === 0) {
    violations.push('Both sides of cargo must be secured')
  }

  // Check angles
  const steepAngles = plan.tieDowns.filter(td => td.angle > 60)
  if (steepAngles.length > 0) {
    recommendations.push('Tie-down angles greater than 60° reduce effective restraint')
  }

  return {
    valid: violations.length === 0,
    violations,
    recommendations,
  }
}

// ============================================================================
// BATCH SECUREMENT PLANNING
// ============================================================================

/**
 * Generate securement plans for all items in a load
 */
export function generateLoadSecurementPlan(
  items: LoadItem[],
  placements: ItemPlacement3D[]
): {
  plans: SecurementPlan[]
  totalTieDowns: number
  totalWLLProvided: number
  totalWLLRequired: number
  isFullyCompliant: boolean
  summary: string[]
} {
  const plans: SecurementPlan[] = []

  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const plan = generateSecurementPlan(item, placement)
    plans.push(plan)
  }

  const totalTieDowns = plans.reduce((sum, p) => sum + p.tieDowns.length, 0)
  const totalWLLProvided = plans.reduce((sum, p) => sum + p.totalWLL, 0)
  const totalWLLRequired = plans.reduce((sum, p) => sum + p.requiredWLL, 0)
  const isFullyCompliant = plans.every(p => p.isCompliant)

  // Generate summary
  const summary: string[] = [
    `Total tie-downs: ${totalTieDowns}`,
    `Total WLL provided: ${totalWLLProvided.toLocaleString()} lbs`,
    `Total WLL required: ${totalWLLRequired.toLocaleString()} lbs`,
  ]

  if (!isFullyCompliant) {
    const nonCompliant = plans.filter(p => !p.isCompliant)
    summary.push(`⚠️ ${nonCompliant.length} item(s) need additional securement`)
  } else {
    summary.push('✓ All items meet DOT securement requirements')
  }

  // Count tie-down types
  const chainCount = plans.reduce(
    (sum, p) => sum + p.tieDowns.filter(td => td.type === 'chain').length,
    0
  )
  const strapCount = plans.reduce(
    (sum, p) => sum + p.tieDowns.filter(td => td.type === 'strap').length,
    0
  )

  if (chainCount > 0) summary.push(`Chains needed: ${chainCount}`)
  if (strapCount > 0) summary.push(`Straps needed: ${strapCount}`)

  return {
    plans,
    totalTieDowns,
    totalWLLProvided,
    totalWLLRequired,
    isFullyCompliant,
    summary,
  }
}
