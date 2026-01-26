/**
 * Item Constraints Module
 * Handles fragile, hazmat, priority, and destination constraints
 * for safe, efficient loading order generation.
 */

import {
  LoadItem,
  ItemPlacement3D,
  LoadingInstruction,
  ConstraintViolation,
} from './types'

// ============================================================================
// CONSTRAINT VALIDATION
// ============================================================================

/**
 * Validate fragile item placement
 * Fragile items should not have anything stacked on top
 */
export function validateFragilePlacement(
  item: LoadItem,
  placement: ItemPlacement3D,
  allPlacements: ItemPlacement3D[],
  allItems: LoadItem[]
): ConstraintViolation | null {
  if (!item.fragile) return null

  // Check if anything is stacked on this fragile item
  const itemsOnTop = allPlacements.filter(p => p.stackedOn === placement.itemId)
  if (itemsOnTop.length > 0) {
    const topItem = allItems.find(i => i.id === itemsOnTop[0].itemId)
    return {
      type: 'fragile',
      itemId: item.id,
      description: `Fragile item "${item.description}" has ${topItem?.description || 'item'} stacked on top`,
      severity: 'error',
    }
  }

  return null
}

/**
 * Validate hazmat constraints
 * Hazmat items may need separation from other cargo
 */
export function validateHazmatConstraints(
  items: LoadItem[],
  loads: { items: LoadItem[] }[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  // Check each load for hazmat mixing
  for (const load of loads) {
    const hazmatItems = load.items.filter(i => i.hazmat)
    const nonHazmatItems = load.items.filter(i => !i.hazmat)

    // If there are both hazmat and non-hazmat items, warn about separation
    if (hazmatItems.length > 0 && nonHazmatItems.length > 0) {
      for (const hazItem of hazmatItems) {
        violations.push({
          type: 'hazmat',
          itemId: hazItem.id,
          description: `Hazmat item "${hazItem.description}" is on same truck as non-hazmat cargo - verify compatibility`,
          severity: 'warning',
        })
      }
    }

    // Multiple different hazmat classes may require separation
    const hazmatNotes = hazmatItems
      .filter(i => i.notes)
      .map(i => i.notes?.toLowerCase() || '')

    const uniqueHazmatTypes = new Set(hazmatNotes)
    if (uniqueHazmatTypes.size > 1) {
      violations.push({
        type: 'hazmat',
        itemId: hazmatItems[0].id,
        description: 'Multiple hazmat types on same truck - verify DOT compatibility',
        severity: 'warning',
      })
    }
  }

  return violations
}

/**
 * Check if an item requires a dedicated truck (e.g., some hazmat)
 */
export function requiresDedicatedTruck(item: LoadItem): boolean {
  if (!item.hazmat) return false

  // Check for specific hazmat classes that require dedicated transport
  const notes = item.notes?.toLowerCase() || ''
  const dangerousClasses = ['class 1', 'explosives', 'radioactive', 'class 7']

  return dangerousClasses.some(cls => notes.includes(cls))
}

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

/**
 * Sort items by priority
 * Higher priority = load first (toward back of trailer = unloaded first)
 */
export function sortByPriority(items: LoadItem[]): LoadItem[] {
  return [...items].sort((a, b) => {
    const priorityA = a.priority ?? 5 // Default priority
    const priorityB = b.priority ?? 5
    return priorityB - priorityA // Higher priority first
  })
}

/**
 * Sort items by destination for multi-stop routes
 * Items for first stop should be loaded last (LIFO - last in, first out)
 */
export function sortByDestination(
  items: LoadItem[],
  stopOrder: string[]
): LoadItem[] {
  return [...items].sort((a, b) => {
    const destA = a.destination || ''
    const destB = b.destination || ''

    const indexA = stopOrder.indexOf(destA)
    const indexB = stopOrder.indexOf(destB)

    // Items with no destination or unknown destination go first (load first = back of truck)
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return -1
    if (indexB === -1) return 1

    // Later stops load first (will be at back, unloaded last)
    return indexB - indexA
  })
}

/**
 * Combined sorting for optimal loading order
 * Considers: constraints, priority, destination, stacking
 */
export function sortForOptimalLoading(
  items: LoadItem[],
  stopOrder?: string[]
): LoadItem[] {
  return [...items].sort((a, b) => {
    // 1. Hazmat items requiring dedicated truck go first (separate load)
    const aRequiresDedicated = requiresDedicatedTruck(a)
    const bRequiresDedicated = requiresDedicatedTruck(b)
    if (aRequiresDedicated && !bRequiresDedicated) return -1
    if (!aRequiresDedicated && bRequiresDedicated) return 1

    // 2. Bottom-only items first (they must be on the deck)
    if (a.bottomOnly && !b.bottomOnly) return -1
    if (!a.bottomOnly && b.bottomOnly) return 1

    // 3. Destination order (if multi-stop)
    if (stopOrder && stopOrder.length > 0) {
      const destA = a.destination || ''
      const destB = b.destination || ''
      const indexA = stopOrder.indexOf(destA)
      const indexB = stopOrder.indexOf(destB)

      if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
        // Later stops load first
        return indexB - indexA
      }
    }

    // 4. Priority (higher priority load first)
    const priorityA = a.priority ?? 5
    const priorityB = b.priority ?? 5
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }

    // 5. Fragile items last (they go on top)
    if (a.fragile && !b.fragile) return 1
    if (!a.fragile && b.fragile) return -1

    // 6. Heavier items earlier (better stability on bottom)
    return b.weight - a.weight
  })
}

// ============================================================================
// CONSTRAINT VALIDATION (ALL)
// ============================================================================

/**
 * Validate all constraints for a set of placements
 */
export function validateAllConstraints(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  loads: { items: LoadItem[] }[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  // Validate fragile placements
  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const fragileViolation = validateFragilePlacement(item, placement, placements, items)
    if (fragileViolation) {
      violations.push(fragileViolation)
    }
  }

  // Validate hazmat constraints
  const hazmatViolations = validateHazmatConstraints(items, loads)
  violations.push(...hazmatViolations)

  // Check for stacking violations
  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    // bottomOnly items should be on floor
    if (item.bottomOnly && placement.y > 0) {
      violations.push({
        type: 'stacking',
        itemId: item.id,
        description: `"${item.description}" marked as bottom-only but placed at height ${placement.y} ft`,
        severity: 'error',
      })
    }

    // Non-stackable items should not have anything on top
    if (item.stackable === false) {
      const itemsOnTop = placements.filter(p => p.stackedOn === placement.itemId)
      if (itemsOnTop.length > 0) {
        const topItem = items.find(i => i.id === itemsOnTop[0].itemId)
        violations.push({
          type: 'stacking',
          itemId: item.id,
          description: `"${item.description}" is not stackable but has ${topItem?.description || 'item'} on top`,
          severity: 'error',
        })
      }
    }
  }

  return violations
}

// ============================================================================
// LOADING INSTRUCTIONS GENERATION
// ============================================================================

/**
 * Generate human-readable loading instructions
 */
export function generateLoadingInstructions(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  stopOrder?: string[]
): LoadingInstruction[] {
  const instructions: LoadingInstruction[] = []

  // Sort placements by loading order (load from back to front, bottom to top)
  const sortedPlacements = [...placements].sort((a, b) => {
    // First by X position descending (back of truck first)
    if (Math.abs(a.x - b.x) > 1) {
      return b.x - a.x
    }
    // Then by layer (floor first)
    return a.layer - b.layer
  })

  let sequence = 1
  for (const placement of sortedPlacements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    // Determine action
    let action = 'Load'
    if (placement.stackedOn) {
      const bottomItem = items.find(i => i.id === placement.stackedOn)
      action = `Stack on ${bottomItem?.description || 'previous item'}`
    }

    // Generate position description
    const xPos = placement.x < 10 ? 'front' : placement.x > 30 ? 'rear' : 'middle'
    const zPos = placement.z < 3 ? 'driver side' : placement.z > 5 ? 'passenger side' : 'center'
    const position = `${xPos}, ${zPos}${placement.y > 0 ? `, layer ${placement.layer + 1}` : ', on deck'}`

    // Generate notes
    const notes: string[] = []
    if (item.fragile) {
      notes.push('FRAGILE - Handle with care')
    }
    if (item.hazmat) {
      notes.push('HAZMAT - Follow placarding requirements')
    }
    if (item.bottomOnly) {
      notes.push('Must remain on deck - no stacking on top')
    }
    if (!item.stackable) {
      notes.push('Do not stack anything on this item')
    }
    if (item.destination && stopOrder && stopOrder.length > 0) {
      const stopIndex = stopOrder.indexOf(item.destination)
      if (stopIndex >= 0) {
        notes.push(`Delivery stop ${stopIndex + 1}: ${item.destination}`)
      }
    }
    if (placement.rotated) {
      notes.push('Rotated 90° from original orientation')
    }

    instructions.push({
      sequence,
      itemId: item.id,
      itemDescription: item.description,
      action,
      position,
      notes,
    })

    sequence++
  }

  // Add securement reminder at end
  if (instructions.length > 0) {
    instructions.push({
      sequence,
      itemId: 'secure-all',
      itemDescription: 'All cargo',
      action: 'Secure',
      position: 'Entire load',
      notes: [
        'Verify all items are properly secured',
        'Check tie-downs meet DOT requirements (50% of cargo weight)',
        'Install edge protectors where chains/straps contact cargo',
        'Perform final walk-around inspection',
      ],
    })
  }

  return instructions
}

/**
 * Generate unloading instructions for multi-stop routes
 * Shows which items to unload at each stop
 */
export function generateUnloadingInstructions(
  items: LoadItem[],
  placements: ItemPlacement3D[],
  stopOrder: string[]
): Map<string, LoadingInstruction[]> {
  const unloadByStop = new Map<string, LoadingInstruction[]>()

  for (const stop of stopOrder) {
    const stopItems = items.filter(i => i.destination === stop)
    const stopPlacements = placements.filter(p =>
      stopItems.some(i => i.id === p.itemId)
    )

    // Sort by reverse loading order (top items first, front items first)
    const sortedPlacements = [...stopPlacements].sort((a, b) => {
      // Layer descending (top first)
      if (a.layer !== b.layer) {
        return b.layer - a.layer
      }
      // X ascending (front first)
      return a.x - b.x
    })

    const instructions: LoadingInstruction[] = []
    let sequence = 1

    for (const placement of sortedPlacements) {
      const item = items.find(i => i.id === placement.itemId)
      if (!item) continue

      const notes: string[] = []
      if (item.fragile) {
        notes.push('FRAGILE - Handle with care')
      }

      // Check if anything is stacked on this item
      const itemsOnTop = placements.filter(p => p.stackedOn === placement.itemId)
      if (itemsOnTop.length > 0) {
        const topItemNames = itemsOnTop
          .map(p => items.find(i => i.id === p.itemId)?.description || 'Unknown')
          .join(', ')
        notes.push(`Remove items stacked on top first: ${topItemNames}`)
      }

      instructions.push({
        sequence,
        itemId: item.id,
        itemDescription: item.description,
        action: 'Unload',
        position: `At ${stop}`,
        notes,
      })

      sequence++
    }

    unloadByStop.set(stop, instructions)
  }

  return unloadByStop
}
