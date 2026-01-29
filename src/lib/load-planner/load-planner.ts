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
import { validateTripHOS, createFreshHOSStatus, getOversizeSpeed } from './hos-validator'

export interface ItemPlacement {
  itemId: string
  x: number // position from front of trailer (feet)
  z: number // position from left edge (feet)
  rotated: boolean
  failed?: boolean // true if item could not be placed (no valid position found)
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
  // Effective height after 3D stacking (max y + item height across all placements)
  // This may be taller than the single-item `height` field if items are stacked
  effectiveHeight?: number
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
      // No valid position found — mark as failed placement
      placements.push({
        itemId: item.id,
        x: 0,
        z: 0,
        rotated: false,
        failed: true,
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
 * Find the best truck for a specific item based on its dimensions.
 * Delegates to selectTrucks() from truck-selector.ts for consistent scoring
 * including availability tiers, equipment matching profiles, proportional
 * penalties, and cost-weighted permit scoring.
 */
function findBestTruckForItem(item: LoadItem): {
  truck: TruckType
  score: number
  isLegal: boolean
  permits: string[]
  scoreBreakdown: ScoreBreakdown
} {
  const itemWeight = getItemWeight(item)

  // Create a ParsedLoad so selectTrucks() can apply the full scoring algorithm
  const itemAsParsedLoad: ParsedLoad = {
    id: item.id,
    items: [item],
    length: item.length,
    width: item.width,
    height: item.height,
    weight: itemWeight,
    confidence: 100,
  }

  const recommendations = selectTrucks(itemAsParsedLoad)

  if (recommendations.length === 0) {
    // No truck scored (shouldn't happen — selectTrucks scores all available trucks)
    return {
      truck: trucks[0],
      score: 0,
      isLegal: false,
      permits: [],
      scoreBreakdown: {
        baseScore: 100,
        fitPenalty: 50,
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
        kpraPenalty: 0,
        escortProximityWarning: false,
        finalScore: 0,
      },
    }
  }

  const best = recommendations[0]
  return {
    truck: best.truck,
    score: best.score,
    isLegal: best.fit.isLegal,
    permits: best.permitsRequired.map(p => p.reason),
    scoreBreakdown: best.scoreBreakdown ?? {
      baseScore: 100, fitPenalty: 0, heightPenalty: 0, widthPenalty: 0,
      weightPenalty: 0, overkillPenalty: 0, permitPenalty: 0, idealFitBonus: 0,
      equipmentMatchBonus: 0, historicalBonus: 0, seasonalPenalty: 0,
      bridgePenalty: 0, kpraPenalty: 0, escortProximityWarning: false, finalScore: best.score,
    },
  }
}

/**
 * Expand items with quantity > 1 into individual units.
 * Each unit gets its own ID so the bin-packing algorithm can place them independently.
 */
function expandItems(items: LoadItem[]): LoadItem[] {
  const expanded: LoadItem[] = []
  for (const item of items) {
    const qty = item.quantity || 1
    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...item,
        id: qty > 1 ? `${item.id}-unit-${i + 1}` : item.id,
        quantity: 1,
      })
    }
  }
  return expanded
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
 * Calculate the effective stack height from 3D placements.
 * This is the maximum (placement.y + item.height) across all placements,
 * representing the tallest point of stacked cargo (not including deck height).
 *
 * Example: Two 5' items stacked on a 5' flatbed:
 * - Single-item max height: 5'
 * - Effective stack height: 5' (first item at y=0) + 5' (second item height) = 10'
 * - Total height from ground: 10' + 5' (deck) = 15'
 */
export function calculateEffectiveStackHeight(
  placements: ItemPlacement3D[],
  items: LoadItem[]
): number {
  if (placements.length === 0) return 0

  let maxHeight = 0
  for (const placement of placements) {
    // Skip failed placements
    if (placement.failed) continue

    // Find the item for this placement
    // Handle expanded items (e.g., "item123_unit_0")
    const baseItemId = placement.itemId.includes('_unit_')
      ? placement.itemId.split('_unit_')[0]
      : placement.itemId
    const item = items.find(i => i.id === placement.itemId || i.id === baseItemId)

    if (item) {
      const topOfItem = placement.y + item.height
      if (topOfItem > maxHeight) {
        maxHeight = topOfItem
      }
    }
  }

  return maxHeight
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
 * Check if a new item can fit on a truck with existing items.
 * Uses cumulative area + weight check with a packing efficiency factor,
 * then verifies with actual 2D placement.
 */
function canFitOnTruck(newItem: LoadItem, existingItems: LoadItem[], truck: TruckType): boolean {
  // Weight check (defensive: multiply by quantity in case items are unexpanded)
  const totalWeight = existingItems.reduce((s, i) => s + getItemWeight(i), 0) + getItemWeight(newItem)
  if (totalWeight > truck.maxCargoWeight) return false

  // Each item must individually fit within deck dimensions
  if (newItem.length > truck.deckLength || newItem.width > truck.deckWidth) return false

  // Area check with packing efficiency factor (75%)
  // Defensive: multiply by quantity in case items are unexpanded
  const PACKING_EFFICIENCY = 0.75
  const deckArea = truck.deckLength * truck.deckWidth
  const usedArea = existingItems.reduce((s, i) => s + (i.length * i.width * (i.quantity || 1)), 0)
  const newArea = newItem.length * newItem.width * (newItem.quantity || 1)
  if ((usedArea + newArea) > deckArea * PACKING_EFFICIENCY) return false

  // Try actual 2D placement to verify items fit (no failed placements allowed)
  const testItems = [...existingItems, newItem]
  const placements = calculatePlacements(testItems, truck)
  return placements.length === testItems.length && !placements.some(p => p.failed)
}

/**
 * Try to add an item to any existing load. Returns true if placed.
 * Used by strategy planners to consolidate items onto trucks.
 */
function tryAddToExistingLoads(item: LoadItem, loads: PlannedLoad[]): boolean {
  let bestLoadIndex = -1
  let bestUtilization = Infinity

  for (let i = 0; i < loads.length; i++) {
    const load = loads[i]
    if (!canFitOnTruck(item, load.items, load.recommendedTruck)) continue

    const newWeight = getLoadWeight(load.items) + item.weight
    const utilization = (newWeight / load.recommendedTruck.maxCargoWeight) * 100
    if (utilization <= 100 && utilization < bestUtilization) {
      bestLoadIndex = i
      bestUtilization = utilization
    }
  }

  if (bestLoadIndex >= 0) {
    const load = loads[bestLoadIndex]
    load.items.push(item)
    load.weight = getLoadWeight(load.items)
    load.length = Math.max(load.length, item.length)
    load.width = Math.max(load.width, item.width)
    load.height = Math.max(load.height, item.height)
    load.placements = calculatePlacements(load.items, load.recommendedTruck)
    return true
  }

  return false
}

/**
 * Find best truck for an entire load (multiple items).
 * Creates a ParsedLoad with actual items so selectTrucks() can apply
 * equipment matching profiles using real item descriptions.
 */
function findBestTruckForLoad(load: PlannedLoad): {
  truck: TruckType
  score: number
  isLegal: boolean
  permits: string[]
  scoreBreakdown: ScoreBreakdown
} {
  const maxLength = load.items.length > 0 ? Math.max(...load.items.map(i => i.length)) : 0
  const maxWidth = load.items.length > 0 ? Math.max(...load.items.map(i => i.width)) : 0
  const maxHeight = load.items.length > 0 ? Math.max(...load.items.map(i => i.height)) : 0
  const totalWeight = getLoadWeight(load.items)

  // Pass actual items so equipment matching uses real descriptions
  const loadAsParsedLoad: ParsedLoad = {
    id: load.id,
    items: load.items,
    length: maxLength,
    width: maxWidth,
    height: maxHeight,
    weight: totalWeight,
    confidence: 100,
  }

  const recommendations = selectTrucks(loadAsParsedLoad)

  if (recommendations.length === 0) {
    return {
      truck: trucks[0],
      score: 0,
      isLegal: false,
      permits: [],
      scoreBreakdown: {
        baseScore: 100, fitPenalty: 50, heightPenalty: 0, widthPenalty: 0,
        weightPenalty: 0, overkillPenalty: 0, permitPenalty: 0, idealFitBonus: 0,
        equipmentMatchBonus: 0, historicalBonus: 0, seasonalPenalty: 0,
        bridgePenalty: 0, kpraPenalty: 0, escortProximityWarning: false, finalScore: 0,
      },
    }
  }

  const best = recommendations[0]
  return {
    truck: best.truck,
    score: best.score,
    isLegal: best.fit.isLegal,
    permits: best.permitsRequired.map(p => p.reason),
    scoreBreakdown: best.scoreBreakdown ?? {
      baseScore: 100, fitPenalty: 0, heightPenalty: 0, widthPenalty: 0,
      weightPenalty: 0, overkillPenalty: 0, permitPenalty: 0, idealFitBonus: 0,
      equipmentMatchBonus: 0, historicalBonus: 0, seasonalPenalty: 0,
      bridgePenalty: 0, kpraPenalty: 0, escortProximityWarning: false, finalScore: best.score,
    },
  }
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
          if (!canAdd) return false
          // Verify item physically fits on target truck deck via 2D placement
          return canFitOnTruck(item, lowLoad.load.items, lowLoad.load.recommendedTruck)
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

        lowLoad.load.length = Math.max(...lowLoad.load.items.map(i => i.length), 0)
        lowLoad.load.width = Math.max(...lowLoad.load.items.map(i => i.width), 0)
        lowLoad.load.height = Math.max(...lowLoad.load.items.map(i => i.height), 0)

        // Recalculate placements
        highLoad.load.placements = calculatePlacements(highLoad.load.items, highLoad.load.recommendedTruck)
        lowLoad.load.placements = calculatePlacements(lowLoad.load.items, lowLoad.load.recommendedTruck)

        // Update utilizations for next iteration
        highLoad.utilization = getLoadUtilization(highLoad.load.items, highLoad.load.recommendedTruck)
        lowLoad.utilization = getLoadUtilization(lowLoad.load.items, lowLoad.load.recommendedTruck)
      }
    }
  }

  // Merge pass: try to combine underloaded trucks
  for (let i = 0; i < loads.length; i++) {
    const loadA = loads[i]
    if (!loadA || loadA.items.length === 0) continue
    const utilA = getLoadUtilization(loadA.items, loadA.recommendedTruck)
    if (utilA > 60) continue // Not underloaded enough to merit merging

    for (let j = i + 1; j < loads.length; j++) {
      const loadB = loads[j]
      if (!loadB || loadB.items.length === 0) continue
      const utilB = getLoadUtilization(loadB.items, loadB.recommendedTruck)
      if (utilB > 60) continue

      // Try merging all items from loadB into loadA
      const combinedItems = [...loadA.items, ...loadB.items]
      const combinedWeight = getLoadWeight(combinedItems)

      // Pick the larger truck of the two
      const targetTruck = loadA.recommendedTruck.maxCargoWeight >= loadB.recommendedTruck.maxCargoWeight
        ? loadA.recommendedTruck : loadB.recommendedTruck

      if (combinedWeight > targetTruck.maxCargoWeight) continue

      // Check area fit (defensive: multiply by quantity in case items are unexpanded)
      const deckArea = targetTruck.deckLength * targetTruck.deckWidth
      const totalArea = combinedItems.reduce((s, i) => s + (i.length * i.width * (i.quantity || 1)), 0)
      if (totalArea > deckArea * 0.75) continue

      // Verify with actual placement (no failed placements allowed)
      const placements = calculatePlacements(combinedItems, targetTruck)
      if (placements.length < combinedItems.length || placements.some(p => p.failed)) continue

      // Merge successful
      loadA.items = combinedItems
      loadA.weight = combinedWeight
      loadA.recommendedTruck = targetTruck
      loadA.length = Math.max(...combinedItems.map(i => i.length), 0)
      loadA.width = Math.max(...combinedItems.map(i => i.width), 0)
      loadA.height = Math.max(...combinedItems.map(i => i.height), 0)
      loadA.placements = placements

      // Mark loadB for removal
      loadB.items = []
      break // Re-evaluate loadA with new items on next outer iteration
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
  // Expand quantities into individual units so each can be placed independently
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const unassignedItems: LoadItem[] = []
  const warnings: string[] = []

  // Sort items by weight (heaviest first)
  items.sort((a, b) => b.weight - a.weight)

  // Target utilization for balanced loading (aim for 85% to leave room for optimization)
  const TARGET_UTILIZATION = 85
  // Fallback limit - leave 5% room so rebalancing can still move items between trucks
  const FALLBACK_UTILIZATION = 95

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

      // Check if item can physically fit on this truck with existing items
      if (!canFitOnTruck(item, load.items, load.recommendedTruck)) continue

      // Check weight capacity
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

        if (!canFitOnTruck(item, load.items, load.recommendedTruck)) continue

        const { canAdd, newUtilization } = canAddItemToLoad(
          item,
          load.items,
          load.recommendedTruck,
          FALLBACK_UTILIZATION  // Cap at 95% so rebalancing has room
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

  // Check for failed placements and add per-load warnings
  for (const load of loads) {
    const failedPlacements = load.placements.filter(p => p.failed)
    if (failedPlacements.length > 0) {
      for (const fp of failedPlacements) {
        const item = load.items.find(i => i.id === fp.itemId)
        const desc = item?.description || fp.itemId
        load.warnings.push(
          `Item "${desc}" could not be placed on deck — manual arrangement required`
        )
      }
      warnings.push(
        `${load.id}: ${failedPlacements.length} item(s) could not be automatically placed`
      )
    }
  }

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
  fuelPrice: 450, // cents per gallon ($4.50)
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

    // Calculate effective stack height (accounts for vertical stacking)
    const effectiveStackHeight = calculateEffectiveStackHeight(
      stacking.placements,
      load.items
    )
    enhanced.effectiveHeight = effectiveStackHeight

    // Check if stacking creates oversize conditions not initially detected
    const totalHeightWithStacking = effectiveStackHeight + load.recommendedTruck.deckHeight
    const singleItemTotalHeight = load.height + load.recommendedTruck.deckHeight

    // If stacking makes the load taller than single-item analysis showed
    if (effectiveStackHeight > load.height) {
      const heightIncrease = effectiveStackHeight - load.height
      enhanced.warnings.push(
        `Stacking increases effective height by ${heightIncrease.toFixed(1)}' ` +
        `(${effectiveStackHeight.toFixed(1)}' stacked vs ${load.height.toFixed(1)}' single item)`
      )

      // Check if this creates a NEW permit requirement
      if (totalHeightWithStacking > LEGAL_LIMITS.HEIGHT && singleItemTotalHeight <= LEGAL_LIMITS.HEIGHT) {
        enhanced.warnings.unshift(
          `⚠️ STACKING CREATES OVERSIZE: Total height ${totalHeightWithStacking.toFixed(1)}' exceeds ` +
          `${LEGAL_LIMITS.HEIGHT}' legal limit - height permit now required due to stacking`
        )
        // Add permit if not already present
        const hasHeightPermit = enhanced.permitsRequired.some(p =>
          p.toLowerCase().includes('height') || p.toLowerCase().includes('oversize')
        )
        if (!hasHeightPermit) {
          enhanced.permitsRequired.push(
            `Oversize Height (stacked): ${totalHeightWithStacking.toFixed(1)}' > ${LEGAL_LIMITS.HEIGHT}'`
          )
          enhanced.isLegal = false
        }
      }

      // Check if height over 14' triggers route survey (even if already oversize)
      if (totalHeightWithStacking > 14 && singleItemTotalHeight <= 14) {
        enhanced.warnings.push(
          `Height over 14' (${totalHeightWithStacking.toFixed(1)}') may require route survey for bridges`
        )
      }
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
    // Use effective height (from 3D stacking) if available, otherwise single-item max height
    const cargoHeight = enhanced.effectiveHeight ?? load.height
    const cargo = {
      width: load.width,
      height: cargoHeight,
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
    // Use effective height (from 3D stacking) if available, otherwise single-item max height
    const cargoHeight = enhanced.effectiveHeight ?? load.height
    const cargo = {
      width: load.width,
      height: cargoHeight + load.recommendedTruck.deckHeight,
      length: load.length,
      weight: load.weight + load.recommendedTruck.tareWeight + load.recommendedTruck.powerUnitWeight,
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
      ((l.effectiveHeight ?? l.height) + l.recommendedTruck.deckHeight) > LEGAL_LIMITS.HEIGHT
    )
    // Compute dimension-aware speed from worst-case cargo across all loads
    // Use effectiveHeight (from 3D stacking) if available, otherwise single-item max height
    const maxWidth = enhancedLoads.length > 0 ? Math.max(...enhancedLoads.map(l => l.width)) : 0
    const maxTotalHeight = enhancedLoads.length > 0 ? Math.max(...enhancedLoads.map(l => (l.effectiveHeight ?? l.height) + l.recommendedTruck.deckHeight)) : 0
    const maxWeight = enhancedLoads.length > 0 ? Math.max(...enhancedLoads.map(l =>
      l.items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0) +
      l.recommendedTruck.tareWeight + l.recommendedTruck.powerUnitWeight
    )) : 0
    const oversizeSpeed = isOversize ? getOversizeSpeed(maxWidth, maxTotalHeight, maxWeight) : undefined
    const driverStatus = opts.driverStatus || createFreshHOSStatus()
    enhancedPlan.hosValidation = validateTripHOS(
      opts.routeDistance,
      driverStatus,
      isOversize,
      oversizeSpeed
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
    lines.push(`Total Cost: $${(plan.totalCost.totalCost / 100).toLocaleString()}`)
    lines.push(`Average Cost per Item: $${(plan.totalCost.averageCostPerItem / 100).toLocaleString()}`)
  }

  if (plan.totalEscortCost && plan.totalEscortCost > 0) {
    lines.push(`Escort Costs: $${(plan.totalEscortCost / 100).toLocaleString()}`)
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
    lines.push(`Estimated On-Duty Time: ${Math.round(plan.hosValidation.estimatedOnDutyTime / 60)} hours`)
    if (plan.hosValidation.cycleViolation) {
      lines.push(`Cycle Violation: 70-hour/8-day limit exceeded`)
    }
    if (plan.hosValidation.restartRequired) {
      lines.push(`34-Hour Restart Required: Yes${plan.hosValidation.restartDelayHours ? ` (+${plan.hosValidation.restartDelayHours}h delay)` : ''}`)
    }
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
  | 'fastest'          // Optimize for speed (legal loads, no permit delays)
  | 'max-safety'       // Maximum margins, oversized trucks, extra clearance
  | 'best-placement'   // Optimized by item type using equipment matching profiles

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
      description: `Lowest estimated cost: $${(costMetrics.totalCost / 100).toLocaleString()}`,
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

  // === Strategy 5: FASTEST (legal loads, no permit delays) ===
  const fastestPlan = generateFastestPlan(parsedLoad)
  const fastestMetrics = calculatePlanMetrics(fastestPlan)

  // Include if meaningfully different (different truck types or fewer permits)
  if (fastestMetrics.permitCount < recommendedMetrics.permitCount ||
      fastestMetrics.totalTrucks !== recommendedMetrics.totalTrucks ||
      hasDifferentTruckTypes(fastestPlan, recommendedPlan)) {
    const badges: string[] = ['Quick Dispatch']
    if (fastestMetrics.permitCount === 0) badges.push('No Permits')

    smartOptions.push({
      strategy: 'fastest',
      name: 'Fastest Plan',
      description: 'Legal loads with common trucks for quick dispatch',
      plan: fastestPlan,
      ...fastestMetrics,
      isRecommended: false,
      badges,
    })
  }

  // === Strategy 6: MAX-SAFETY (maximum margins, extra clearance) ===
  const safetyPlan = generateMaxSafetyPlan(parsedLoad)
  const safetyMetrics = calculatePlanMetrics(safetyPlan)

  if (hasDifferentTruckTypes(safetyPlan, recommendedPlan) ||
      safetyMetrics.totalTrucks !== recommendedMetrics.totalTrucks) {
    smartOptions.push({
      strategy: 'max-safety',
      name: 'Max Safety Plan',
      description: 'Oversized trucks with maximum clearance margins',
      plan: safetyPlan,
      ...safetyMetrics,
      isRecommended: false,
      badges: ['Max Margins'],
    })
  }

  // === Strategy 7: BEST-PLACEMENT (equipment-type optimized) ===
  const placementPlan = generateBestPlacementPlan(parsedLoad)
  const placementMetrics = calculatePlanMetrics(placementPlan)

  if (hasDifferentTruckTypes(placementPlan, recommendedPlan) ||
      placementMetrics.totalCost !== recommendedMetrics.totalCost) {
    smartOptions.push({
      strategy: 'best-placement',
      name: 'Best Placement Plan',
      description: 'Trucks matched by cargo type for ideal fit',
      plan: placementPlan,
      ...placementMetrics,
      isRecommended: false,
      badges: ['Type Matched'],
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
    // Basic estimate: base rate per truck + permit costs (cents)
    const baseTruckCostCents = 250_000 // $2,500 average per truck
    totalCost = plan.totalTrucks * baseTruckCostCents
    // Add permit cost estimate
    totalCost += permitCount * 15_000 // $150 average permit cost
    // Add escort cost estimate if required
    if (escortRequired) totalCost += 80_000 // $800 basic escort cost
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
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const unassignedItems: LoadItem[] = []
  const warnings: string[] = []

  // Sort by weight (heaviest first) to place heavy items first
  items.sort((a, b) => b.weight - a.weight)

  // Find trucks that can handle each item LEGALLY
  for (const item of items) {
    const itemWeight = item.weight * (item.quantity || 1)

    // Find trucks that can carry this item legally
    const legalTrucks = trucks.filter(truck => {
      const totalHeight = item.height + truck.deckHeight
      const totalWeight = itemWeight + truck.tareWeight + truck.powerUnitWeight

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
          kpraPenalty: 0,
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
  const grossWeight = newWeight + truck.tareWeight + truck.powerUnitWeight

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
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const warnings: string[] = []

  // Sort by weight to place heavy items first
  items.sort((a, b) => b.weight - a.weight)

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

/**
 * Check if two plans use different truck types
 */
function hasDifferentTruckTypes(planA: LoadPlan, planB: LoadPlan): boolean {
  const trucksA = new Set(planA.loads.map(l => l.recommendedTruck.id))
  const trucksB = new Set(planB.loads.map(l => l.recommendedTruck.id))
  if (trucksA.size !== trucksB.size) return true
  for (const id of trucksA) {
    if (!trucksB.has(id)) return true
  }
  return false
}

/**
 * Generate a plan optimized for speed: prefer legal loads to avoid permit delays,
 * use common truck types (flatbed, step deck) that are easy to dispatch quickly.
 */
function generateFastestPlan(parsedLoad: ParsedLoad): LoadPlan {
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const warnings: string[] = []
  const commonCategories = ['FLATBED', 'STEP_DECK', 'DRY_VAN']

  items.sort((a, b) => b.weight - a.weight)

  for (const item of items) {
    const itemWeight = item.weight * (item.quantity || 1)

    // Prefer common trucks that can carry legally
    const legalCommonTrucks = trucks.filter(truck => {
      const totalHeight = item.height + truck.deckHeight
      const totalWeight = itemWeight + truck.tareWeight + truck.powerUnitWeight
      return (
        commonCategories.includes(truck.category) &&
        item.length <= truck.deckLength &&
        item.width <= truck.deckWidth &&
        itemWeight <= truck.maxCargoWeight &&
        totalHeight <= LEGAL_LIMITS.HEIGHT &&
        item.width <= LEGAL_LIMITS.WIDTH &&
        totalWeight <= LEGAL_LIMITS.GROSS_WEIGHT
      )
    })

    // Fallback to any legal truck, then any truck
    const legalTrucks = legalCommonTrucks.length > 0 ? legalCommonTrucks : trucks.filter(truck => {
      const totalHeight = item.height + truck.deckHeight
      const totalWeight = itemWeight + truck.tareWeight + truck.powerUnitWeight
      return (
        item.length <= truck.deckLength &&
        item.width <= truck.deckWidth &&
        itemWeight <= truck.maxCargoWeight &&
        totalHeight <= LEGAL_LIMITS.HEIGHT &&
        item.width <= LEGAL_LIMITS.WIDTH &&
        totalWeight <= LEGAL_LIMITS.GROSS_WEIGHT
      )
    })

    // Try to add to an existing load first
    if (tryAddToExistingLoads(item, loads)) continue

    if (legalTrucks.length > 0) {
      // Pick the smallest fitting common truck
      const bestTruck = legalTrucks.sort((a, b) => a.deckLength - b.deckLength)[0]
      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: bestTruck,
        truckScore: 75,
        scoreBreakdown: {
          baseScore: 100, fitPenalty: 0, heightPenalty: 0, widthPenalty: 0,
          weightPenalty: 0, overkillPenalty: 0, permitPenalty: 0,
          idealFitBonus: 0, equipmentMatchBonus: 0, historicalBonus: 0,
          seasonalPenalty: 0, bridgePenalty: 0, kpraPenalty: 0, escortProximityWarning: false,
          finalScore: 75,
        },
        placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
        permitsRequired: [],
        warnings: [],
        isLegal: true,
      })
    } else {
      // No legal option — use best fit
      const { truck, score, isLegal, permits, scoreBreakdown } = findBestTruckForItem(item)
      warnings.push(`Item "${item.description}" requires permits (no quick-dispatch option)`)
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
        warnings: ['No quick-dispatch truck available'],
        isLegal: false,
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

/**
 * Generate a plan with maximum safety margins: prefer oversized trucks
 * with extra clearance in all dimensions. Avoid tight fits.
 */
function generateMaxSafetyPlan(parsedLoad: ParsedLoad): LoadPlan {
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const warnings: string[] = []

  items.sort((a, b) => b.weight - a.weight)

  for (const item of items) {
    const itemWeight = item.weight * (item.quantity || 1)

    // Score trucks by maximum clearance margins
    let bestTruck = trucks[0]
    let bestSafetyScore = -Infinity

    for (const truck of trucks) {
      if (item.length > truck.deckLength || item.width > truck.deckWidth || itemWeight > truck.maxCargoWeight) continue

      const lengthMargin = truck.deckLength - item.length
      const widthMargin = truck.deckWidth - item.width
      const weightMargin = (truck.maxCargoWeight - itemWeight) / truck.maxCargoWeight
      const heightClearance = truck.maxLegalCargoHeight - item.height

      // Higher score = more margins
      let safetyScore = lengthMargin * 2 + widthMargin * 3 + weightMargin * 50 + heightClearance * 5

      // Bonus for drive-on loading (safer for tracked equipment)
      if (['RGN', 'LOWBOY'].includes(truck.category)) safetyScore += 5

      if (safetyScore > bestSafetyScore) {
        bestSafetyScore = safetyScore
        bestTruck = truck
      }
    }

    // Check if the safety-preferred truck fits legally
    const totalHeight = item.height + bestTruck.deckHeight
    const totalWeight = itemWeight + bestTruck.tareWeight + bestTruck.powerUnitWeight
    const safetyIsLegal = (
      item.length <= bestTruck.deckLength &&
      item.width <= bestTruck.deckWidth &&
      itemWeight <= bestTruck.maxCargoWeight &&
      totalHeight <= LEGAL_LIMITS.HEIGHT &&
      item.width <= LEGAL_LIMITS.WIDTH &&
      totalWeight <= LEGAL_LIMITS.GROSS_WEIGHT
    )

    const safetyFinalScore = Math.min(100, Math.max(0, Math.round(bestSafetyScore > 0 ? 80 : 50)))

    // Try to add to an existing load first
    if (tryAddToExistingLoads(item, loads)) continue

    loads.push({
      id: `load-${loads.length + 1}`,
      items: [item],
      length: item.length,
      width: item.width,
      height: item.height,
      weight: itemWeight,
      recommendedTruck: bestTruck,
      truckScore: safetyFinalScore,
      scoreBreakdown: {
        baseScore: 100, fitPenalty: bestSafetyScore <= 0 ? 50 : 0,
        heightPenalty: 0, widthPenalty: 0, weightPenalty: 0,
        overkillPenalty: 0, permitPenalty: safetyIsLegal ? 0 : 10,
        idealFitBonus: 0, equipmentMatchBonus: 0, historicalBonus: 0,
        seasonalPenalty: 0, bridgePenalty: 0, kpraPenalty: 0, escortProximityWarning: false,
        finalScore: safetyFinalScore,
      },
      placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
      permitsRequired: safetyIsLegal ? [] : ['Oversize/overweight permit'],
      warnings: [],
      isLegal: safetyIsLegal,
    })
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

/**
 * Generate a plan optimized by equipment type matching.
 * Uses equipment profiles to pick the ideal truck for each cargo type.
 */
function generateBestPlacementPlan(parsedLoad: ParsedLoad): LoadPlan {
  const items = expandItems([...parsedLoad.items])
  const loads: PlannedLoad[] = []
  const warnings: string[] = []

  for (const item of items) {
    const itemWeight = item.weight

    // Score all trucks with heavy emphasis on equipment matching
    let bestTruck = trucks[0]
    let bestScore = -Infinity
    let bestIsLegal = false
    let bestPermits: string[] = []

    for (const truck of trucks) {
      if (itemWeight > truck.maxCargoWeight) continue
      if (item.length > truck.deckLength) continue

      const totalHeight = item.height + truck.deckHeight
      const totalWeight = itemWeight + truck.tareWeight + truck.powerUnitWeight

      const isLegal = (
        item.width <= truck.deckWidth &&
        totalHeight <= LEGAL_LIMITS.HEIGHT &&
        item.width <= LEGAL_LIMITS.WIDTH &&
        totalWeight <= LEGAL_LIMITS.GROSS_WEIGHT
      )

      // Base score focused on equipment matching
      let score = 50

      // Equipment match is the primary factor (heavy weight)
      const description = item.description?.toLowerCase() || ''
      // Check loading method preference
      if (truck.loadingMethod === 'drive-on' && description.match(/excavator|dozer|loader|tractor|tracked|skid steer/)) {
        score += 25
      }
      if (truck.loadingMethod === 'crane' && description.match(/transformer|tank|module|vessel|generator/)) {
        score += 25
      }

      // Category-specific bonuses for known equipment types
      if (description.match(/excavator|dozer|loader/) && ['RGN', 'LOWBOY'].includes(truck.category)) score += 20
      if (description.match(/wind.*blade|blade/) && truck.category === 'BLADE') score += 30
      if (description.match(/transformer|heavy.*equipment/) && ['MULTI_AXLE', 'SCHNABEL'].includes(truck.category)) score += 20
      if (description.match(/boat|yacht/) && truck.category === 'SPECIALIZED') score += 20
      if (description.match(/forklift|pallet|crate/) && ['FLATBED', 'DRY_VAN'].includes(truck.category)) score += 15

      // Fit efficiency bonus
      const heightClearance = truck.maxLegalCargoHeight - item.height
      if (heightClearance >= 0 && heightClearance <= 2) score += 10

      // Legal bonus
      if (isLegal) score += 15

      if (score > bestScore) {
        bestScore = score
        bestTruck = truck
        bestIsLegal = isLegal
        bestPermits = isLegal ? [] : ['Oversize/overweight permit']
      }
    }

    // Try to add to an existing load first
    if (tryAddToExistingLoads(item, loads)) continue

    loads.push({
      id: `load-${loads.length + 1}`,
      items: [item],
      length: item.length,
      width: item.width,
      height: item.height,
      weight: itemWeight,
      recommendedTruck: bestTruck,
      truckScore: Math.min(100, Math.max(0, Math.round(bestScore))),
      scoreBreakdown: {
        baseScore: 100, fitPenalty: 0,
        heightPenalty: 0, widthPenalty: 0, weightPenalty: 0,
        overkillPenalty: 0, permitPenalty: bestIsLegal ? 0 : 10,
        idealFitBonus: 0, equipmentMatchBonus: Math.max(0, bestScore - 50),
        historicalBonus: 0, seasonalPenalty: 0, bridgePenalty: 0, kpraPenalty: 0,
        escortProximityWarning: false,
        finalScore: Math.min(100, Math.max(0, Math.round(bestScore))),
      },
      placements: [{ itemId: item.id, x: 0, z: 0, rotated: false }],
      permitsRequired: bestPermits,
      warnings: [],
      isLegal: bestIsLegal,
    })
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
