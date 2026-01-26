/**
 * Load Planner - Multi-truck planning and item assignment
 *
 * This module handles:
 * 1. Determining how many trucks are needed
 * 2. Assigning items to trucks optimally
 * 3. Recommending the best truck type for each load
 *
 * Smart Features (optional, enabled via PlanningOptions):
 * - Weight Distribution: Axle weights, center of gravity, balance scoring
 * - 3D Stacking: Vertical placement with constraints
 * - Cost Optimization: Total cost calculation (trucks + fuel + permits)
 * - Item Constraints: Fragile, hazmat, priority, loading order
 * - Securement Planning: DOT-compliant tie-down generation
 * - Escort Calculation: Pilot car requirements by state
 * - HOS Validation: Driver hours of service validation
 */

import type {
  LoadItem,
  TruckType,
  ParsedLoad,
  PlanningOptions,
  ItemPlacement3D,
  WeightDistributionResult,
  SmartLoadCostBreakdown,
  ConstraintViolation,
  LoadingInstruction,
  SecurementPlan,
  SmartEscortRequirements,
  TripHOSValidation,
  ScoreBreakdown,
  FitOptimization,
} from './types'
import { selectTrucks } from './truck-selector'
import { trucks, LEGAL_LIMITS } from './trucks'

// Smart module imports
import { analyzeWeightDistribution } from './weight-distribution'
import { calculatePlacements3D, sortItemsForStacking } from './stacking-engine'
import {
  validateAllConstraints,
  generateLoadingInstructions,
  sortForOptimalLoading,
} from './item-constraints'
import { calculateTruckCost, calculateMultiTruckCost } from './cost-optimizer'
import { generateLoadSecurementPlan } from './securement-planner'
import { calculateEscortRequirements, estimateEscortCost } from './escort-calculator'
import { validateTripHOS, createFreshHOSStatus } from './hos-validator'

export interface ItemPlacement {
  itemId: string
  x: number // position from front of trailer (feet)
  z: number // position from left edge (feet)
  rotated: boolean
}

export interface PlannedLoad {
  id: string
  items: LoadItem[]
  // Aggregate dimensions for this load
  length: number
  width: number
  height: number
  weight: number
  // Truck recommendation for this specific load
  recommendedTruck: TruckType
  truckScore: number
  // Detailed score breakdown for "Why This Truck?" display
  scoreBreakdown?: ScoreBreakdown
  // Smart fit alternatives for borderline loads
  fitAlternatives?: FitOptimization[]
  // Item placements for visualization
  placements: ItemPlacement[]
  // Permits needed
  permitsRequired: string[]
  // Warnings
  warnings: string[]
  // Is this load legal without permits?
  isLegal: boolean
  // === SMART FEATURES (optional) ===
  // 3D placements (when 3D stacking enabled)
  placements3D?: ItemPlacement3D[]
  // Weight distribution analysis
  weightDistribution?: WeightDistributionResult
  // Cost breakdown
  costBreakdown?: SmartLoadCostBreakdown
  // Securement plan
  securementPlan?: {
    plans: SecurementPlan[]
    isFullyCompliant: boolean
    summary: string[]
  }
  // Escort requirements
  escortRequirements?: SmartEscortRequirements
  // Loading instructions
  loadingInstructions?: LoadingInstruction[]
}

export interface LoadPlan {
  // All planned loads (one per truck)
  loads: PlannedLoad[]
  // Summary
  totalTrucks: number
  totalWeight: number
  totalItems: number
  // Items that couldn't be assigned (too large for any truck)
  unassignedItems: LoadItem[]
  // Overall warnings
  warnings: string[]
  // === SMART FEATURES (optional) ===
  // Total cost breakdown
  totalCost?: {
    perTruckCosts: SmartLoadCostBreakdown[]
    totalCost: number
    averageCostPerItem: number
  }
  // Constraint violations across all loads
  constraintViolations?: ConstraintViolation[]
  // Overall weight balance score (0-100)
  overallBalanceScore?: number
  // HOS validation (if enabled)
  hosValidation?: TripHOSValidation
  // Escort cost total
  totalEscortCost?: number
}

/**
 * Calculate optimal placements for items on a truck deck
 * Uses a simple bin-packing algorithm (bottom-left first fit)
 */
function calculatePlacements(items: LoadItem[], truck: TruckType): ItemPlacement[] {
  const placements: ItemPlacement[] = []
  const occupiedAreas: { x: number; z: number; length: number; width: number }[] = []

  // Sort items by area (largest first for better packing)
  const sortedItems = [...items].sort((a, b) =>
    (b.length * b.width) - (a.length * a.width)
  )

  for (const item of sortedItems) {
    const placement = findBestPlacement(item, truck, occupiedAreas)
    if (placement) {
      placements.push(placement)
      const itemLength = placement.rotated ? item.width : item.length
      const itemWidth = placement.rotated ? item.length : item.width
      occupiedAreas.push({
        x: placement.x,
        z: placement.z,
        length: itemLength,
        width: itemWidth
      })
    } else {
      // Fallback: place at origin if no space found (shouldn't happen if canShareTruck works)
      placements.push({
        itemId: item.id,
        x: 0,
        z: 0,
        rotated: false
      })
    }
  }

  return placements
}

/**
 * Find the best position for an item on the deck
 */
function findBestPlacement(
  item: LoadItem,
  truck: TruckType,
  occupiedAreas: { x: number; z: number; length: number; width: number }[]
): ItemPlacement | null {
  const candidates: { x: number; z: number; rotated: boolean; score: number }[] = []

  // Try both orientations
  const orientations = [
    { length: item.length, width: item.width, rotated: false },
    { length: item.width, width: item.length, rotated: true }
  ]

  // Only try rotation if dimensions differ
  const tryRotation = item.length !== item.width

  for (const orientation of tryRotation ? orientations : [orientations[0]]) {
    // Check if this orientation fits on truck
    if (orientation.length > truck.deckLength || orientation.width > truck.deckWidth) {
      continue
    }

    // Try positions from front-left corner, moving right then back
    const stepSize = 0.5 // Half-foot increments for finer placement

    for (let x = 0; x <= truck.deckLength - orientation.length; x += stepSize) {
      for (let z = 0; z <= truck.deckWidth - orientation.width; z += stepSize) {
        // Check if this position overlaps with existing items
        const testArea = {
          x,
          z,
          length: orientation.length,
          width: orientation.width
        }

        if (!isAreaOccupied(testArea, occupiedAreas)) {
          // Score this position (prefer front-left positions)
          let score = 100
          score -= x * 0.5 // Penalize positions further back
          score -= z * 0.3 // Slightly penalize positions to the right

          // Bonus for positions against edges (stability)
          if (z === 0 || z + orientation.width >= truck.deckWidth) score += 5
          if (x === 0) score += 10 // Prefer front

          // Bonus for positions adjacent to other cargo
          for (const occupied of occupiedAreas) {
            // Adjacent on x-axis
            if (Math.abs(x - (occupied.x + occupied.length)) < 0.5 ||
                Math.abs((x + orientation.length) - occupied.x) < 0.5) {
              score += 3
            }
            // Adjacent on z-axis
            if (Math.abs(z - (occupied.z + occupied.width)) < 0.5 ||
                Math.abs((z + orientation.width) - occupied.z) < 0.5) {
              score += 3
            }
          }

          candidates.push({
            x,
            z,
            rotated: orientation.rotated,
            score
          })
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Return best position
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return {
    itemId: item.id,
    x: best.x,
    z: best.z,
    rotated: best.rotated
  }
}

/**
 * Check if an area overlaps with any occupied areas
 */
function isAreaOccupied(
  testArea: { x: number; z: number; length: number; width: number },
  occupiedAreas: { x: number; z: number; length: number; width: number }[]
): boolean {
  for (const occupied of occupiedAreas) {
    // Check for rectangle overlap with small tolerance
    const tolerance = 0.01
    const xOverlap =
      testArea.x < occupied.x + occupied.length - tolerance &&
      testArea.x + testArea.length > occupied.x + tolerance

    const zOverlap =
      testArea.z < occupied.z + occupied.width - tolerance &&
      testArea.z + testArea.width > occupied.z + tolerance

    if (xOverlap && zOverlap) {
      return true
    }
  }

  return false
}

/**
 * Find the best truck for a specific item based on its dimensions
 * Returns score breakdown for "Why This Truck?" display
 */
function findBestTruckForItem(item: LoadItem): {
  truck: TruckType
  score: number
  isLegal: boolean
  permits: string[]
  scoreBreakdown: ScoreBreakdown
} {
  let bestTruck = trucks[0]
  let bestScore = 0
  let bestIsLegal = false
  let bestPermits: string[] = []
  let bestBreakdown: ScoreBreakdown = {
    baseScore: 100,
    fitPenalty: 0,
    heightPenalty: 0,
    widthPenalty: 0,
    weightPenalty: 0,
    overkillPenalty: 0,
    permitPenalty: 0,
    idealFitBonus: 0,
    equipmentMatchBonus: 0,
    historicalBonus: 0,
    seasonalPenalty: 0,
    bridgePenalty: 0,
    escortProximityWarning: false,
    finalScore: 0,
  }

  for (const truck of trucks) {
    const totalHeight = item.height + truck.deckHeight
    const totalWeight = item.weight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

    // Check if item physically fits
    const fits =
      item.length <= truck.deckLength &&
      item.width <= truck.deckWidth &&
      item.weight <= truck.maxCargoWeight

    if (!fits) continue

    // Check legal limits
    const exceedsHeight = totalHeight > LEGAL_LIMITS.HEIGHT
    const exceedsWidth = item.width > LEGAL_LIMITS.WIDTH
    const exceedsWeight = totalWeight > LEGAL_LIMITS.GROSS_WEIGHT
    const isLegal = !exceedsHeight && !exceedsWidth && !exceedsWeight

    // Calculate permits needed
    const permits: string[] = []
    if (exceedsHeight) permits.push(`Oversize Height (${totalHeight.toFixed(1)}' > 13.5')`)
    if (exceedsWidth) permits.push(`Oversize Width (${item.width.toFixed(1)}' > 8.5')`)
    if (exceedsWeight) permits.push(`Overweight (${totalWeight.toLocaleString()} lbs > 80,000 lbs)`)

    // Build score breakdown
    const breakdown: ScoreBreakdown = {
      baseScore: 100,
      fitPenalty: 0,
      heightPenalty: 0,
      widthPenalty: 0,
      weightPenalty: 0,
      overkillPenalty: 0,
      permitPenalty: 0,
      idealFitBonus: 0,
      equipmentMatchBonus: 0,
      historicalBonus: 0,
      seasonalPenalty: 0,
      bridgePenalty: 0,
      escortProximityWarning: false,
      finalScore: 0,
    }

    let score = 100

    // Deduct for permits needed
    breakdown.permitPenalty = permits.length * 15
    score -= breakdown.permitPenalty

    // Deduct for overkill (using lowboy for small cargo)
    const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight
    if (heightClearance > 4) {
      breakdown.overkillPenalty = 10
      score -= 10
    }

    // Bonus for ideal fit
    if (heightClearance >= 0 && heightClearance <= 2) {
      breakdown.idealFitBonus = 10
      score += 10
    }

    // Bonus for matching loading method
    if (truck.loadingMethod === 'drive-on' &&
        item.description?.toLowerCase().match(/excavator|dozer|loader|tractor|tracked/)) {
      breakdown.equipmentMatchBonus = 15
      score += 15
    }

    // Prefer legal options (counted as negative permit penalty avoided)
    if (isLegal) {
      score += 20
    }

    // Check escort proximity warning
    const escortWidthThresholds = [12, 14, 16]
    for (const threshold of escortWidthThresholds) {
      if (item.width > threshold - 0.5 && item.width <= threshold) {
        breakdown.escortProximityWarning = true
        break
      }
    }
    if (totalHeight > 14 && totalHeight <= 14.5) {
      breakdown.escortProximityWarning = true
    }

    breakdown.finalScore = Math.max(0, Math.min(100, Math.round(score)))

    if (score > bestScore) {
      bestScore = score
      bestTruck = truck
      bestIsLegal = isLegal
      bestPermits = permits
      bestBreakdown = breakdown
    }
  }

  return {
    truck: bestTruck,
    score: bestScore,
    isLegal: bestIsLegal,
    permits: bestPermits,
    scoreBreakdown: bestBreakdown,
  }
}

/**
 * Get the effective weight of an item (weight × quantity)
 */
function getItemWeight(item: LoadItem): number {
  return item.weight * (item.quantity || 1)
}

/**
 * Calculate total weight of items on a load
 */
function getLoadWeight(items: LoadItem[]): number {
  return items.reduce((sum, item) => sum + getItemWeight(item), 0)
}

/**
 * Calculate utilization percentage for a load
 */
function getLoadUtilization(items: LoadItem[], truck: TruckType): number {
  const weight = getLoadWeight(items)
  return (weight / truck.maxCargoWeight) * 100
}

/**
 * Check if an item can be added to a load without exceeding capacity
 */
function canAddItemToLoad(
  item: LoadItem,
  currentItems: LoadItem[],
  truck: TruckType,
  targetUtilization: number = 95
): { canAdd: boolean; newUtilization: number; reason: string } {
  const itemWeight = getItemWeight(item)
  const currentWeight = getLoadWeight(currentItems)
  const newTotalWeight = currentWeight + itemWeight
  const newUtilization = (newTotalWeight / truck.maxCargoWeight) * 100

  // HARD LIMIT: Never exceed 100% capacity
  if (newTotalWeight > truck.maxCargoWeight) {
    return {
      canAdd: false,
      newUtilization,
      reason: `Would exceed capacity (${newUtilization.toFixed(0)}% > 100%)`
    }
  }

  // SOFT LIMIT: Prefer not to exceed target utilization for better balancing
  // But still allow if no other option (handled in planLoads)
  if (newUtilization > targetUtilization) {
    return {
      canAdd: false,
      newUtilization,
      reason: `Would exceed target ${targetUtilization}% utilization`
    }
  }

  // Check physical fit
  if (item.length > truck.deckLength || item.width > truck.deckWidth) {
    return { canAdd: false, newUtilization, reason: 'Item too large for truck' }
  }

  return { canAdd: true, newUtilization, reason: '' }
}

/**
 * Check if two items can share the same truck (considering quantities)
 */
function canShareTruck(item1: LoadItem, item2: LoadItem, truck: TruckType): boolean {
  // Combined weight check - use effective weights with quantities
  const combinedWeight = getItemWeight(item1) + getItemWeight(item2)
  if (combinedWeight > truck.maxCargoWeight) return false

  // Check if items can be placed side by side (width-wise)
  const sideBySideWidth = item1.width + item2.width
  if (sideBySideWidth <= truck.deckWidth) {
    // Can place side by side
    const combinedLength = Math.max(item1.length, item2.length)
    if (combinedLength <= truck.deckLength) return true
  }

  // Check if items can be placed end to end (length-wise)
  const endToEndLength = item1.length + item2.length
  if (endToEndLength <= truck.deckLength) {
    const combinedWidth = Math.max(item1.width, item2.width)
    if (combinedWidth <= truck.deckWidth) return true
  }

  // Check stacking (if both items are stackable)
  if (item1.stackable && item2.stackable) {
    // Smaller item on top of larger
    const baseItem = item1.weight > item2.weight ? item1 : item2
    const topItem = item1.weight > item2.weight ? item2 : item1

    // Top item must fit within base item's footprint
    if (topItem.length <= baseItem.length && topItem.width <= baseItem.width) {
      const stackedHeight = item1.height + item2.height
      if (stackedHeight + truck.deckHeight <= LEGAL_LIMITS.HEIGHT) {
        return true
      }
    }
  }

  return false
}

/**
 * Find best truck for an entire load (multiple items)
 */
function findBestTruckForLoad(load: PlannedLoad): {
  truck: TruckType
  score: number
  isLegal: boolean
  permits: string[]
  scoreBreakdown: ScoreBreakdown
} {
  // Use the max dimensions from all items in the load
  const maxLength = Math.max(...load.items.map(i => i.length))
  const maxWidth = Math.max(...load.items.map(i => i.width))
  const maxHeight = Math.max(...load.items.map(i => i.height))
  // Use effective weights (weight × quantity)
  const totalWeight = getLoadWeight(load.items)

  // Create a virtual "item" representing the load requirements
  const virtualItem: LoadItem = {
    id: 'virtual',
    description: 'Load',
    quantity: 1,
    length: maxLength,
    width: maxWidth,
    height: maxHeight,
    weight: totalWeight,
    stackable: false,
    fragile: false,
    hazmat: false,
  }

  return findBestTruckForItem(virtualItem)
}

/**
 * Post-processing: Try to move items between loads for better balance
 */
function rebalanceLoads(loads: PlannedLoad[]): void {
  if (loads.length < 2) return

  // Calculate utilizations
  const utilizations = loads.map(load => ({
    load,
    utilization: getLoadUtilization(load.items, load.recommendedTruck)
  }))

  // Sort by utilization (highest first)
  utilizations.sort((a, b) => b.utilization - a.utilization)

  // Try to move items from overloaded trucks to underloaded ones
  for (let i = 0; i < utilizations.length - 1; i++) {
    const highLoad = utilizations[i]
    if (highLoad.utilization <= 90) continue // Already balanced

    for (let j = utilizations.length - 1; j > i; j--) {
      const lowLoad = utilizations[j]
      if (lowLoad.utilization >= 80) continue // Already fairly loaded

      // Try to move smallest item from high to low
      const movableItems = highLoad.load.items
        .filter(item => {
          const { canAdd } = canAddItemToLoad(item, lowLoad.load.items, lowLoad.load.recommendedTruck, 95)
          return canAdd
        })
        .sort((a, b) => getItemWeight(a) - getItemWeight(b))

      if (movableItems.length > 0) {
        const itemToMove = movableItems[0]

        // Remove from high load
        highLoad.load.items = highLoad.load.items.filter(i => i.id !== itemToMove.id)
        highLoad.load.weight = getLoadWeight(highLoad.load.items)

        // Add to low load
        lowLoad.load.items.push(itemToMove)
        lowLoad.load.weight = getLoadWeight(lowLoad.load.items)

        // Update dimensions
        highLoad.load.length = Math.max(...highLoad.load.items.map(i => i.length), 0)
        highLoad.load.width = Math.max(...highLoad.load.items.map(i => i.width), 0)
        highLoad.load.height = Math.max(...highLoad.load.items.map(i => i.height), 0)

        lowLoad.load.length = Math.max(...lowLoad.load.items.map(i => i.length))
        lowLoad.load.width = Math.max(...lowLoad.load.items.map(i => i.width))
        lowLoad.load.height = Math.max(...lowLoad.load.items.map(i => i.height))

        // Recalculate placements
        highLoad.load.placements = calculatePlacements(highLoad.load.items, highLoad.load.recommendedTruck)
        lowLoad.load.placements = calculatePlacements(lowLoad.load.items, lowLoad.load.recommendedTruck)

        // Update utilizations for next iteration
        highLoad.utilization = getLoadUtilization(highLoad.load.items, highLoad.load.recommendedTruck)
        lowLoad.utilization = getLoadUtilization(lowLoad.load.items, lowLoad.load.recommendedTruck)
      }
    }
  }

  // Remove any empty loads
  for (let i = loads.length - 1; i >= 0; i--) {
    if (loads[i].items.length === 0) {
      loads.splice(i, 1)
    }
  }

  // Renumber loads
  loads.forEach((load, index) => {
    load.id = `load-${index + 1}`
  })
}

/**
 * Main load planning function
 * Takes all items and creates an optimal multi-truck plan
 * Uses intelligent distribution to balance loads across trucks
 */
export function planLoads(parsedLoad: ParsedLoad): LoadPlan {
  const items = [...parsedLoad.items]
  const loads: PlannedLoad[] = []
  const unassignedItems: LoadItem[] = []
  const warnings: string[] = []

  // Sort items by effective weight (weight × quantity, heaviest first)
  items.sort((a, b) => getItemWeight(b) - getItemWeight(a))

  // Target utilization for balanced loading (aim for 85% to leave room for optimization)
  const TARGET_UTILIZATION = 85
  // Hard limit - never exceed this
  const MAX_UTILIZATION = 100

  // Process each item
  for (const item of items) {
    const itemWeight = getItemWeight(item)

    // Find the best truck for this individual item
    const { truck: bestTruck, score, isLegal, permits, scoreBreakdown } = findBestTruckForItem(item)

    // Check if item is too large for any truck
    const fitsAnyTruck = trucks.some(t =>
      item.length <= t.deckLength &&
      item.width <= t.deckWidth &&
      itemWeight <= t.maxCargoWeight
    )

    if (!fitsAnyTruck) {
      unassignedItems.push(item)
      warnings.push(`Item "${item.description}" (${item.length}'L x ${item.width}'W x ${item.height}'H, ${itemWeight.toLocaleString()} lbs) exceeds all truck capacities`)
      continue
    }

    // Find the best existing load to add this item to
    let bestLoad: PlannedLoad | null = null
    let bestLoadIndex = -1
    let bestNewUtilization = Infinity

    for (let i = 0; i < loads.length; i++) {
      const load = loads[i]

      // Check physical compatibility
      const canPhysicallyFit = load.items.every(existingItem =>
        canShareTruck(existingItem, item, load.recommendedTruck)
      )
      if (!canPhysicallyFit) continue

      // Check weight capacity with new helper
      const { canAdd, newUtilization } = canAddItemToLoad(
        item,
        load.items,
        load.recommendedTruck,
        TARGET_UTILIZATION
      )

      // If this load can accept the item and results in better balance, use it
      if (canAdd && newUtilization < bestNewUtilization) {
        bestLoad = load
        bestLoadIndex = i
        bestNewUtilization = newUtilization
      }
    }

    // If no load found under target, try again with hard limit
    if (!bestLoad) {
      for (let i = 0; i < loads.length; i++) {
        const load = loads[i]

        const canPhysicallyFit = load.items.every(existingItem =>
          canShareTruck(existingItem, item, load.recommendedTruck)
        )
        if (!canPhysicallyFit) continue

        const { canAdd, newUtilization } = canAddItemToLoad(
          item,
          load.items,
          load.recommendedTruck,
          MAX_UTILIZATION  // Use hard limit
        )

        if (canAdd && newUtilization < bestNewUtilization) {
          bestLoad = load
          bestLoadIndex = i
          bestNewUtilization = newUtilization
        }
      }
    }

    // Add to best existing load or create new one
    if (bestLoad) {
      // Add item to this load
      bestLoad.items.push(item)
      bestLoad.weight = getLoadWeight(bestLoad.items)
      bestLoad.length = Math.max(bestLoad.length, item.length)
      bestLoad.width = Math.max(bestLoad.width, item.width)
      bestLoad.height = Math.max(bestLoad.height, item.height)

      // Re-evaluate truck choice for combined load
      const { truck: newBestTruck, score: newScore, isLegal: newIsLegal, permits: newPermits, scoreBreakdown: newBreakdown } =
        findBestTruckForLoad(bestLoad)
      bestLoad.recommendedTruck = newBestTruck
      bestLoad.truckScore = newScore
      bestLoad.scoreBreakdown = newBreakdown
      bestLoad.isLegal = newIsLegal
      bestLoad.permitsRequired = newPermits
      // Recalculate placements with new item
      bestLoad.placements = calculatePlacements(bestLoad.items, newBestTruck)
    } else {
      // Create new load
      const loadWarnings: string[] = []

      // Generate warnings
      const totalHeight = item.height + bestTruck.deckHeight
      if (totalHeight > LEGAL_LIMITS.HEIGHT) {
        loadWarnings.push(`Total height ${totalHeight.toFixed(1)}' exceeds 13.5' legal limit`)
      }
      if (item.width > LEGAL_LIMITS.WIDTH) {
        loadWarnings.push(`Width ${item.width.toFixed(1)}' exceeds 8.5' legal limit`)
      }
      if (item.width > 12) {
        loadWarnings.push('Width over 12\' requires escort vehicles')
      }

      // Get fit alternatives for borderline loads (when permits are required)
      let fitAlternatives: FitOptimization[] | undefined
      if (permits.length > 0) {
        // Use selectTrucks with fit alternatives enabled to get suggestions
        const itemAsParsedLoad: ParsedLoad = {
          id: item.id,
          items: [item],
          length: item.length,
          width: item.width,
          height: item.height,
          weight: itemWeight,
          confidence: 100, // Internal use, always confident
        }
        const recommendations = selectTrucks(itemAsParsedLoad, { includeFitAlternatives: true })
        const matchingRec = recommendations.find(r => r.truck.id === bestTruck.id)
        fitAlternatives = matchingRec?.fitAlternatives
      }

      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: bestTruck,
        truckScore: score,
        scoreBreakdown,
        fitAlternatives,
        placements: calculatePlacements([item], bestTruck),
        permitsRequired: permits,
        warnings: loadWarnings,
        isLegal,
      })
    }
  }

  // Post-processing: Try to rebalance if loads are very uneven
  rebalanceLoads(loads)

  // Calculate totals using effective weights
  const totalWeight = loads.reduce((sum, load) => sum + getLoadWeight(load.items), 0)
  const totalItems = loads.reduce((sum, load) =>
    sum + load.items.reduce((s, i) => s + (i.quantity || 1), 0), 0)

  // Add summary warnings
  if (loads.length > 1) {
    warnings.push(`Load requires ${loads.length} trucks to transport all items`)
  }
  if (unassignedItems.length > 0) {
    warnings.push(`${unassignedItems.length} item(s) could not be assigned - may require specialized transport`)
  }

  // Check for any overloaded trucks and add warnings
  for (const load of loads) {
    const utilization = getLoadUtilization(load.items, load.recommendedTruck)
    if (utilization > 100) {
      warnings.push(`Warning: ${load.id} is at ${utilization.toFixed(0)}% capacity - consider redistribution`)
    }
  }

  return {
    loads,
    totalTrucks: loads.length,
    totalWeight,
    totalItems,
    unassignedItems,
    warnings,
  }
}

/**
 * Get a simple summary of the load plan
 */
export function getLoadPlanSummary(plan: LoadPlan): string {
  if (plan.loads.length === 0) {
    return 'No loads could be planned'
  }

  const lines: string[] = []
  lines.push(`Load Plan: ${plan.totalTrucks} truck(s) needed`)
  lines.push(`Total Weight: ${plan.totalWeight.toLocaleString()} lbs`)
  lines.push('')

  for (const load of plan.loads) {
    lines.push(`${load.id.toUpperCase()}: ${load.recommendedTruck.name}`)
    lines.push(`   Items: ${load.items.map(i => i.description).join(', ')}`)
    lines.push(`   Dimensions: ${load.length.toFixed(1)}'L x ${load.width.toFixed(1)}'W x ${load.height.toFixed(1)}'H`)
    lines.push(`   Weight: ${load.weight.toLocaleString()} lbs`)
    if (load.permitsRequired.length > 0) {
      lines.push(`   Permits: ${load.permitsRequired.join(', ')}`)
    }
    lines.push('')
  }

  if (plan.unassignedItems.length > 0) {
    lines.push('UNASSIGNED ITEMS (require special transport):')
    for (const item of plan.unassignedItems) {
      lines.push(`   - ${item.description}`)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// SMART LOAD PLANNING
// ============================================================================

/**
 * Default planning options - all smart features enabled
 */
export const DEFAULT_PLANNING_OPTIONS: PlanningOptions = {
  enableWeightDistribution: true,
  enable3DStacking: false, // Keep 2D by default for compatibility
  enableCostOptimization: true,
  enableItemConstraints: true,
  enableSecurementPlanning: true,
  enableEscortCalculation: true,
  enableRouteValidation: false, // Requires route data
  enableHOSValidation: false, // Requires driver status
  costWeight: 0.5,
  fuelPrice: 4.50,
}

/**
 * Enhance a planned load with smart features
 */
function enhanceLoadWithSmartFeatures(
  load: PlannedLoad,
  allItems: LoadItem[],
  options: PlanningOptions,
  routeStates: string[] = []
): PlannedLoad {
  const enhanced = { ...load }

  // 3D Stacking
  if (options.enable3DStacking) {
    const stacking = calculatePlacements3D(load.items, load.recommendedTruck)
    enhanced.placements3D = stacking.placements
    // Update warnings if items couldn't be placed
    if (stacking.unplacedItems.length > 0) {
      enhanced.warnings.push(
        `${stacking.unplacedItems.length} item(s) could not be placed with 3D stacking`
      )
    }
  }

  // Weight Distribution
  if (options.enableWeightDistribution) {
    // Use 3D placements if available, otherwise convert 2D to 3D format
    const placements: ItemPlacement3D[] = enhanced.placements3D ||
      enhanced.placements.map(p => ({
        ...p,
        y: 0,
        layer: 0,
      }))

    enhanced.weightDistribution = analyzeWeightDistribution(
      load.items,
      placements,
      load.recommendedTruck
    )

    // Add weight warnings to load warnings
    if (enhanced.weightDistribution.warnings.length > 0) {
      enhanced.warnings.push(...enhanced.weightDistribution.warnings)
    }
  }

  // Cost Optimization
  if (options.enableCostOptimization) {
    const cargo = {
      width: load.width,
      height: load.height,
      weight: load.weight,
    }
    enhanced.costBreakdown = calculateTruckCost(load.recommendedTruck, cargo, {
      distanceMiles: options.routeDistance,
      fuelPrice: options.fuelPrice,
      statesCount: routeStates.length || 1,
    })
  }

  // Securement Planning
  if (options.enableSecurementPlanning) {
    const placements: ItemPlacement3D[] = enhanced.placements3D ||
      enhanced.placements.map(p => ({ ...p, y: 0, layer: 0 }))

    const securementResult = generateLoadSecurementPlan(load.items, placements)
    enhanced.securementPlan = {
      plans: securementResult.plans,
      isFullyCompliant: securementResult.isFullyCompliant,
      summary: securementResult.summary,
    }

    if (!securementResult.isFullyCompliant) {
      enhanced.warnings.push('Securement plan requires additional tie-downs')
    }
  }

  // Escort Calculation
  if (options.enableEscortCalculation && routeStates.length > 0) {
    const cargo = {
      width: load.width,
      height: load.height + load.recommendedTruck.deckHeight,
      length: load.length,
      weight: load.weight + load.recommendedTruck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT,
    }
    enhanced.escortRequirements = calculateEscortRequirements(
      routeStates,
      cargo,
      load.recommendedTruck
    )
    enhanced.escortRequirements.estimatedCost = estimateEscortCost(
      enhanced.escortRequirements,
      options.routeDistance || 500
    )
  }

  // Loading Instructions
  if (options.enableItemConstraints) {
    const placements: ItemPlacement3D[] = enhanced.placements3D ||
      enhanced.placements.map(p => ({ ...p, y: 0, layer: 0 }))

    enhanced.loadingInstructions = generateLoadingInstructions(
      load.items,
      placements,
      options.stopOrder
    )
  }

  return enhanced
}

/**
 * Enhanced load planning with smart features
 * Accepts optional PlanningOptions to enable advanced calculations
 */
export function planLoadsWithOptions(
  parsedLoad: ParsedLoad,
  options: Partial<PlanningOptions> = {}
): LoadPlan {
  // Merge with defaults
  const opts: PlanningOptions = { ...DEFAULT_PLANNING_OPTIONS, ...options }

  // Sort items based on constraints if enabled
  let itemsToProcess = [...parsedLoad.items]
  if (opts.enableItemConstraints) {
    itemsToProcess = sortForOptimalLoading(itemsToProcess, opts.stopOrder)
  }

  // Create modified parsed load with sorted items
  const modifiedParsedLoad: ParsedLoad = {
    ...parsedLoad,
    items: itemsToProcess,
  }

  // Run base planning
  const basePlan = planLoads(modifiedParsedLoad)

  // Detect route states from origin/destination if available
  const routeStates = detectRouteStates(parsedLoad.origin, parsedLoad.destination)

  // Enhance each load with smart features
  const enhancedLoads = basePlan.loads.map(load =>
    enhanceLoadWithSmartFeatures(load, parsedLoad.items, opts, routeStates)
  )

  // Build enhanced plan
  const enhancedPlan: LoadPlan = {
    ...basePlan,
    loads: enhancedLoads,
  }

  // Calculate overall cost if cost optimization enabled
  if (opts.enableCostOptimization) {
    const loadsWithTrucks = enhancedLoads.map(l => ({
      truck: l.recommendedTruck,
      items: l.items,
    }))
    enhancedPlan.totalCost = calculateMultiTruckCost(loadsWithTrucks, {
      distanceMiles: opts.routeDistance,
      fuelPrice: opts.fuelPrice,
      statesCount: routeStates.length || 1,
    })

    // Add escort costs to total
    const totalEscortCost = enhancedLoads.reduce((sum, l) =>
      sum + (l.escortRequirements?.estimatedCost || 0), 0
    )
    enhancedPlan.totalEscortCost = totalEscortCost
    if (enhancedPlan.totalCost) {
      enhancedPlan.totalCost.totalCost += totalEscortCost
    }
  }

  // Calculate overall balance score
  if (opts.enableWeightDistribution) {
    const balanceScores = enhancedLoads
      .filter(l => l.weightDistribution)
      .map(l => l.weightDistribution!.balanceScore)
    if (balanceScores.length > 0) {
      enhancedPlan.overallBalanceScore = Math.round(
        balanceScores.reduce((a, b) => a + b, 0) / balanceScores.length
      )
    }
  }

  // Validate constraints
  if (opts.enableItemConstraints) {
    const allPlacements: ItemPlacement3D[] = enhancedLoads.flatMap(l =>
      l.placements3D || l.placements.map(p => ({ ...p, y: 0, layer: 0 }))
    )
    enhancedPlan.constraintViolations = validateAllConstraints(
      parsedLoad.items,
      allPlacements,
      enhancedLoads.map(l => ({ items: l.items }))
    )

    // Add violation warnings
    for (const violation of enhancedPlan.constraintViolations) {
      if (violation.severity === 'error') {
        enhancedPlan.warnings.push(`⚠️ ${violation.description}`)
      }
    }
  }

  // HOS Validation
  if (opts.enableHOSValidation && opts.routeDistance) {
    const isOversize = enhancedLoads.some(l =>
      l.width > LEGAL_LIMITS.WIDTH ||
      (l.height + l.recommendedTruck.deckHeight) > LEGAL_LIMITS.HEIGHT
    )
    const driverStatus = opts.driverStatus || createFreshHOSStatus()
    enhancedPlan.hosValidation = validateTripHOS(
      opts.routeDistance,
      driverStatus,
      isOversize
    )

    if (enhancedPlan.hosValidation.warnings.length > 0) {
      enhancedPlan.warnings.push(...enhancedPlan.hosValidation.warnings)
    }
  }

  return enhancedPlan
}

/**
 * Helper to detect states from origin/destination
 * (Simplified - in production would use geocoding)
 */
function detectRouteStates(origin?: string, destination?: string): string[] {
  const states: string[] = []

  // Simple state code extraction from location strings
  const stateCodeRegex = /\b([A-Z]{2})\b/g

  if (origin) {
    const matches = origin.match(stateCodeRegex)
    if (matches) states.push(...matches)
  }
  if (destination) {
    const matches = destination.match(stateCodeRegex)
    if (matches) states.push(...matches)
  }

  // Remove duplicates and return
  return [...new Set(states)]
}

/**
 * Get enhanced summary including smart features
 */
export function getSmartLoadPlanSummary(plan: LoadPlan): string {
  const lines: string[] = []
  lines.push(getLoadPlanSummary(plan))

  // Add smart feature summaries
  if (plan.totalCost) {
    lines.push('')
    lines.push('=== COST BREAKDOWN ===')
    lines.push(`Total Cost: $${plan.totalCost.totalCost.toLocaleString()}`)
    lines.push(`Average Cost per Item: $${plan.totalCost.averageCostPerItem.toLocaleString()}`)
  }

  if (plan.totalEscortCost && plan.totalEscortCost > 0) {
    lines.push(`Escort Costs: $${plan.totalEscortCost.toLocaleString()}`)
  }

  if (plan.overallBalanceScore !== undefined) {
    lines.push('')
    lines.push('=== WEIGHT DISTRIBUTION ===')
    lines.push(`Overall Balance Score: ${plan.overallBalanceScore}/100`)
  }

  if (plan.constraintViolations && plan.constraintViolations.length > 0) {
    lines.push('')
    lines.push('=== CONSTRAINT VIOLATIONS ===')
    for (const v of plan.constraintViolations) {
      const icon = v.severity === 'error' ? '❌' : '⚠️'
      lines.push(`${icon} ${v.description}`)
    }
  }

  if (plan.hosValidation) {
    lines.push('')
    lines.push('=== HOURS OF SERVICE ===')
    lines.push(`Trip Achievable: ${plan.hosValidation.isAchievable ? 'Yes' : 'No'}`)
    lines.push(`Estimated Drive Time: ${Math.round(plan.hosValidation.estimatedDriveTime / 60)} hours`)
    if (plan.hosValidation.overnightRequired) {
      lines.push(`Overnight Required: ${plan.hosValidation.overnightLocation || 'Yes'}`)
    }
    if (plan.hosValidation.requiredBreaks.length > 0) {
      lines.push(`Required Breaks: ${plan.hosValidation.requiredBreaks.length}`)
    }
  }

  return lines.join('\n')
}

// =============================================================================
// SMART MULTI-PLAN GENERATION
// =============================================================================

/**
 * Plan strategy types for different optimization goals
 */
export type PlanStrategy =
  | 'recommended'      // Best balance of cost, trucks, and legality
  | 'legal-only'       // Minimize permits, even if more trucks needed
  | 'cost-optimized'   // Minimize total cost (may include permits)
  | 'fewest-trucks'    // Consolidate to minimum trucks (may need permits)
  | 'fastest'          // Optimize for speed (team drivers, legal routes)

/**
 * A smart plan option with strategy metadata
 */
export interface SmartPlanOption {
  strategy: PlanStrategy
  name: string
  description: string
  plan: LoadPlan
  // Metrics for comparison
  totalTrucks: number
  totalCost: number
  permitCount: number
  escortRequired: boolean
  legalLoads: number
  nonLegalLoads: number
  // Recommendation badge
  isRecommended: boolean
  badges: string[]
}

/**
 * Generate multiple smart plan options for user comparison
 * Returns plans optimized for different strategies
 */
export function generateSmartPlans(
  parsedLoad: ParsedLoad,
  options: {
    routeStates?: string[]
    routeDistance?: number
    shipDate?: Date
  } = {}
): SmartPlanOption[] {
  const smartOptions: SmartPlanOption[] = []
  const { routeStates = [], routeDistance = 500, shipDate } = options

  // === Strategy 1: RECOMMENDED (balanced) ===
  const recommendedPlan = planLoadsWithOptions(parsedLoad, {
    enableCostOptimization: true,
    enableItemConstraints: true,
    enableSecurementPlanning: true,
    enableEscortCalculation: true,
    costWeight: 0.5, // Balance between cost and efficiency
    routeDistance,
  })

  const recommendedMetrics = calculatePlanMetrics(recommendedPlan)
  smartOptions.push({
    strategy: 'recommended',
    name: 'Recommended Plan',
    description: 'Best balance of cost, efficiency, and compliance',
    plan: recommendedPlan,
    ...recommendedMetrics,
    isRecommended: true,
    badges: ['Best Overall'],
  })

  // === Strategy 2: LEGAL-ONLY (no permits if possible) ===
  const legalPlan = generateLegalOnlyPlan(parsedLoad)
  const legalMetrics = calculatePlanMetrics(legalPlan)

  // Only include if meaningfully different from recommended
  if (legalMetrics.permitCount < recommendedMetrics.permitCount ||
      legalMetrics.totalTrucks !== recommendedMetrics.totalTrucks) {
    const badges: string[] = []
    if (legalMetrics.permitCount === 0) badges.push('No Permits')
    if (legalMetrics.legalLoads === legalPlan.loads.length) badges.push('100% Legal')

    smartOptions.push({
      strategy: 'legal-only',
      name: 'Legal-Only Plan',
      description: legalMetrics.permitCount === 0
        ? 'All loads within legal limits - no permits required'
        : 'Minimized permits where possible',
      plan: legalPlan,
      ...legalMetrics,
      isRecommended: false,
      badges,
    })
  }

  // === Strategy 3: COST-OPTIMIZED (minimize total cost) ===
  const costPlan = planLoadsWithOptions(parsedLoad, {
    enableCostOptimization: true,
    costWeight: 1.0, // Prioritize cost above all
    routeDistance,
  })
  const costMetrics = calculatePlanMetrics(costPlan)

  // Only include if meaningfully different
  if (costMetrics.totalCost < recommendedMetrics.totalCost * 0.95 ||
      costMetrics.totalTrucks !== recommendedMetrics.totalTrucks) {
    smartOptions.push({
      strategy: 'cost-optimized',
      name: 'Cost-Optimized Plan',
      description: `Lowest estimated cost: $${costMetrics.totalCost.toLocaleString()}`,
      plan: costPlan,
      ...costMetrics,
      isRecommended: false,
      badges: ['Lowest Cost'],
    })
  }

  // === Strategy 4: FEWEST-TRUCKS (consolidate aggressively) ===
  const consolidatedPlan = generateConsolidatedPlan(parsedLoad)
  const consolidatedMetrics = calculatePlanMetrics(consolidatedPlan)

  // Only include if fewer trucks than recommended
  if (consolidatedMetrics.totalTrucks < recommendedMetrics.totalTrucks) {
    const badges = [`${consolidatedMetrics.totalTrucks} Truck${consolidatedMetrics.totalTrucks > 1 ? 's' : ''}`]
    if (consolidatedMetrics.permitCount > 0) badges.push(`${consolidatedMetrics.permitCount} Permits`)

    smartOptions.push({
      strategy: 'fewest-trucks',
      name: 'Fewest Trucks Plan',
      description: `Maximum consolidation with ${consolidatedMetrics.totalTrucks} truck${consolidatedMetrics.totalTrucks > 1 ? 's' : ''}`,
      plan: consolidatedPlan,
      ...consolidatedMetrics,
      isRecommended: false,
      badges,
    })
  }

  // Sort by recommendation: recommended first, then by legality, then by truck count
  smartOptions.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    // Then prioritize fully legal plans
    if (a.nonLegalLoads === 0 && b.nonLegalLoads > 0) return -1
    if (a.nonLegalLoads > 0 && b.nonLegalLoads === 0) return 1
    // Then by fewer trucks
    return a.totalTrucks - b.totalTrucks
  })

  return smartOptions
}

/**
 * Calculate comparison metrics for a plan
 */
function calculatePlanMetrics(plan: LoadPlan): {
  totalTrucks: number
  totalCost: number
  permitCount: number
  escortRequired: boolean
  legalLoads: number
  nonLegalLoads: number
} {
  const legalLoads = plan.loads.filter(l => l.isLegal).length
  const permitCount = plan.loads.reduce((sum, l) => sum + l.permitsRequired.length, 0)
  const escortRequired = plan.loads.some(l =>
    l.escortRequirements?.frontPilot || l.escortRequirements?.rearPilot
  )

  // Estimate total cost
  let totalCost = 0
  if (plan.totalCost) {
    totalCost = plan.totalCost.totalCost
  } else {
    // Basic estimate: base rate per truck + permit costs
    const baseTruckCost = 2500 // Average per truck
    totalCost = plan.totalTrucks * baseTruckCost
    // Add permit cost estimate
    totalCost += permitCount * 150 // Average permit cost
    // Add escort cost estimate if required
    if (escortRequired) totalCost += 800 // Basic escort cost
  }
  if (plan.totalEscortCost) {
    totalCost += plan.totalEscortCost
  }

  return {
    totalTrucks: plan.totalTrucks,
    totalCost: Math.round(totalCost),
    permitCount,
    escortRequired,
    legalLoads,
    nonLegalLoads: plan.loads.length - legalLoads,
  }
}

/**
 * Generate a plan that prioritizes legal loads (no permits)
 * May use more trucks to stay within legal limits
 */
function generateLegalOnlyPlan(parsedLoad: ParsedLoad): LoadPlan {
  const items = [...parsedLoad.items]
  const loads: PlannedLoad[] = []
  const unassignedItems: LoadItem[] = []
  const warnings: string[] = []

  // Sort by weight (heaviest first) to place heavy items first
  items.sort((a, b) => (b.weight * (b.quantity || 1)) - (a.weight * (a.quantity || 1)))

  // Find trucks that can handle each item LEGALLY
  for (const item of items) {
    const itemWeight = item.weight * (item.quantity || 1)

    // Find trucks that can carry this item legally
    const legalTrucks = trucks.filter(truck => {
      const totalHeight = item.height + truck.deckHeight
      const totalWeight = itemWeight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

      return (
        item.length <= truck.deckLength &&
        item.width <= truck.deckWidth &&
        itemWeight <= truck.maxCargoWeight &&
        totalHeight <= LEGAL_LIMITS.HEIGHT &&
        item.width <= LEGAL_LIMITS.WIDTH &&
        totalWeight <= LEGAL_LIMITS.GROSS_WEIGHT
      )
    })

    if (legalTrucks.length === 0) {
      // Item can't be transported legally - still assign it
      const { truck, score, isLegal, permits, scoreBreakdown } = findBestTruckForItem(item)
      warnings.push(`Item "${item.description}" requires permits (no legal option)`)

      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: truck,
        truckScore: score,
        scoreBreakdown,
        placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
        permitsRequired: permits,
        warnings: ['No legal truck option available'],
        isLegal: false,
      })
      continue
    }

    // Score legal trucks and find the best one
    let bestTruck = legalTrucks[0]
    let bestScore = 0

    for (const truck of legalTrucks) {
      const totalHeight = item.height + truck.deckHeight
      const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight

      // Score based on fit efficiency (tighter fit = better)
      let score = 50

      // Bonus for tighter height fit (less wasted clearance)
      if (heightClearance <= 2) score += 20
      else if (heightClearance <= 4) score += 10

      // Bonus for matching loading method
      if (truck.loadingMethod === 'drive-on' &&
          item.description?.toLowerCase().match(/excavator|dozer|loader|tractor|tracked/)) {
        score += 15
      }

      // Penalty for overkill (using low-deck when not needed)
      if (heightClearance > 5 && truck.category === 'LOWBOY') score -= 15

      if (score > bestScore) {
        bestScore = score
        bestTruck = truck
      }
    }

    // Try to add to existing load if possible
    let addedToExisting = false
    for (const load of loads) {
      if (load.isLegal && canAddItemLegally(load, item, bestTruck)) {
        load.items.push(item)
        load.weight = getLoadWeight(load.items)
        load.length = Math.max(load.length, item.length)
        load.width = Math.max(load.width, item.width)
        load.height = Math.max(load.height, item.height)
        load.placements = calculatePlacements(load.items, load.recommendedTruck)
        addedToExisting = true
        break
      }
    }

    if (!addedToExisting) {
      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: bestTruck,
        truckScore: bestScore,
        scoreBreakdown: {
          baseScore: 100,
          fitPenalty: 0,
          heightPenalty: 0,
          widthPenalty: 0,
          weightPenalty: 0,
          overkillPenalty: 0,
          permitPenalty: 0,
          idealFitBonus: bestScore > 60 ? 10 : 0,
          equipmentMatchBonus: 0,
          historicalBonus: 0,
          seasonalPenalty: 0,
          bridgePenalty: 0,
          escortProximityWarning: false,
          finalScore: bestScore,
        },
        placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
        permitsRequired: [],
        warnings: [],
        isLegal: true,
      })
    }
  }

  return {
    loads,
    totalTrucks: loads.length,
    totalWeight: loads.reduce((sum, l) => sum + l.weight, 0),
    totalItems: items.length,
    unassignedItems,
    warnings,
  }
}

/**
 * Check if an item can be added to a load while keeping it legal
 */
function canAddItemLegally(load: PlannedLoad, item: LoadItem, truck: TruckType): boolean {
  const itemWeight = item.weight * (item.quantity || 1)
  const newWeight = load.weight + itemWeight
  const newHeight = Math.max(load.height, item.height)
  const newWidth = Math.max(load.width, item.width)
  const newLength = Math.max(load.length, item.length)

  const totalHeight = newHeight + truck.deckHeight
  const grossWeight = newWeight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

  // Check all legal limits
  return (
    newLength <= truck.deckLength &&
    newWidth <= truck.deckWidth &&
    newWeight <= truck.maxCargoWeight &&
    totalHeight <= LEGAL_LIMITS.HEIGHT &&
    newWidth <= LEGAL_LIMITS.WIDTH &&
    grossWeight <= LEGAL_LIMITS.GROSS_WEIGHT
  )
}

/**
 * Generate a plan that aggressively consolidates to fewest trucks
 * May require permits but minimizes truck count
 */
function generateConsolidatedPlan(parsedLoad: ParsedLoad): LoadPlan {
  const items = [...parsedLoad.items]
  const loads: PlannedLoad[] = []
  const warnings: string[] = []

  // Sort by weight to place heavy items first
  items.sort((a, b) => (b.weight * (b.quantity || 1)) - (a.weight * (a.quantity || 1)))

  // Try to fit as many items as possible per truck
  for (const item of items) {
    const itemWeight = item.weight * (item.quantity || 1)

    // Find the best existing load to add this to
    let bestLoadIndex = -1
    let bestNewUtilization = Infinity

    for (let i = 0; i < loads.length; i++) {
      const load = loads[i]
      const truck = load.recommendedTruck

      // Check if item can physically fit (ignore legal limits for consolidation)
      const newWeight = load.weight + itemWeight
      if (newWeight > truck.maxCargoWeight) continue

      const newLength = Math.max(load.length, item.length)
      const newWidth = Math.max(load.width, item.width)

      if (newLength > truck.deckLength || newWidth > truck.deckWidth) continue

      // Calculate new utilization
      const utilization = (newWeight / truck.maxCargoWeight) * 100

      if (utilization < bestNewUtilization) {
        bestNewUtilization = utilization
        bestLoadIndex = i
      }
    }

    if (bestLoadIndex >= 0 && bestNewUtilization <= 100) {
      // Add to existing load
      const load = loads[bestLoadIndex]
      load.items.push(item)
      load.weight = getLoadWeight(load.items)
      load.length = Math.max(load.length, item.length)
      load.width = Math.max(load.width, item.width)
      load.height = Math.max(load.height, item.height)

      // Re-evaluate permits
      const { isLegal, permits, scoreBreakdown } = findBestTruckForLoad(load)
      load.isLegal = isLegal
      load.permitsRequired = permits
      load.scoreBreakdown = scoreBreakdown
      load.placements = calculatePlacements(load.items, load.recommendedTruck)
    } else {
      // Create new load with best truck for this item
      const { truck, score, isLegal, permits, scoreBreakdown } = findBestTruckForItem(item)

      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: truck,
        truckScore: score,
        scoreBreakdown,
        placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
        permitsRequired: permits,
        warnings: [],
        isLegal,
      })
    }
  }

  return {
    loads,
    totalTrucks: loads.length,
    totalWeight: loads.reduce((sum, l) => sum + l.weight, 0),
    totalItems: items.length,
    unassignedItems: [],
    warnings,
  }
}
