/**
 * Load Planner - Multi-truck planning and item assignment
 *
 * This module handles:
 * 1. Determining how many trucks are needed
 * 2. Assigning items to trucks optimally
 * 3. Recommending the best truck type for each load
 */

import type { LoadItem, TruckType, ParsedLoad } from './types'
import { trucks, LEGAL_LIMITS } from './trucks'

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
  // Item placements for visualization
  placements: ItemPlacement[]
  // Permits needed
  permitsRequired: string[]
  // Warnings
  warnings: string[]
  // Is this load legal without permits?
  isLegal: boolean
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
 */
function findBestTruckForItem(item: LoadItem): { truck: TruckType; score: number; isLegal: boolean; permits: string[] } {
  let bestTruck = trucks[0]
  let bestScore = 0
  let bestIsLegal = false
  let bestPermits: string[] = []

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

    // Score this truck for this item
    let score = 100

    // Deduct for permits needed
    score -= permits.length * 15

    // Deduct for overkill (using lowboy for small cargo)
    const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight
    if (heightClearance > 4) score -= 10 // Too much clearance = overkill

    // Bonus for ideal fit
    if (heightClearance >= 0 && heightClearance <= 2) score += 10

    // Bonus for matching loading method
    if (truck.loadingMethod === 'drive-on' &&
        item.description?.toLowerCase().match(/excavator|dozer|loader|tractor|tracked/)) {
      score += 15
    }

    // Prefer legal options
    if (isLegal) score += 20

    if (score > bestScore) {
      bestScore = score
      bestTruck = truck
      bestIsLegal = isLegal
      bestPermits = permits
    }
  }

  return { truck: bestTruck, score: bestScore, isLegal: bestIsLegal, permits: bestPermits }
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
function findBestTruckForLoad(load: PlannedLoad): { truck: TruckType; score: number; isLegal: boolean; permits: string[] } {
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
    const { truck: bestTruck, score, isLegal, permits } = findBestTruckForItem(item)

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
      const { truck: newBestTruck, score: newScore, isLegal: newIsLegal, permits: newPermits } =
        findBestTruckForLoad(bestLoad)
      bestLoad.recommendedTruck = newBestTruck
      bestLoad.truckScore = newScore
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

      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: itemWeight,
        recommendedTruck: bestTruck,
        truckScore: score,
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
