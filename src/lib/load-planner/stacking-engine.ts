/**
 * 3D Stacking Engine
 * Implements constraint-aware 3D bin-packing for trailer loading.
 *
 * Features:
 * - Vertical stacking with weight and layer constraints
 * - Respects stackable, bottomOnly, fragile properties
 * - Maximizes space utilization while ensuring stability
 */

import {
  LoadItem,
  ItemPlacement3D,
  StackingCell,
  TruckType,
  LEGAL_LIMITS,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Grid resolution for stacking calculations (in feet)
 * Smaller = more precise but slower
 */
const GRID_RESOLUTION = 0.5

/**
 * Default max stack height (total, including deck height)
 */
const DEFAULT_MAX_HEIGHT = LEGAL_LIMITS.HEIGHT // 13.5 feet

/**
 * Default maximum load per item when not specified (lbs)
 */
const DEFAULT_MAX_LOAD = 20000

// ============================================================================
// SORTING FOR STACKING
// ============================================================================

/**
 * Sort items for optimal stacking order
 * Priority:
 * 1. bottomOnly items first (must be on deck)
 * 2. Non-stackable items next (nothing can go on top)
 * 3. Heaviest items next (better stability)
 * 4. Largest footprint next (better base)
 * 5. Fragile items last (must be on top)
 */
export function sortItemsForStacking(items: LoadItem[]): LoadItem[] {
  return [...items].sort((a, b) => {
    // bottomOnly items first
    if (a.bottomOnly && !b.bottomOnly) return -1
    if (!a.bottomOnly && b.bottomOnly) return 1

    // Fragile items last (they go on top)
    if (a.fragile && !b.fragile) return 1
    if (!a.fragile && b.fragile) return -1

    // Non-stackable items early (they need clear space above)
    if (!a.stackable && b.stackable) return -1
    if (a.stackable && !b.stackable) return 1

    // Heavier items first (stability)
    const weightDiff = b.weight - a.weight
    if (Math.abs(weightDiff) > 100) return weightDiff

    // Larger footprint first (better base)
    const areaA = a.length * a.width
    const areaB = b.length * b.width
    return areaB - areaA
  })
}

// ============================================================================
// STACKING MAP
// ============================================================================

/**
 * Build a 2D stacking map showing available height at each position
 */
export function buildStackingMap(
  placements: ItemPlacement3D[],
  items: LoadItem[],
  truck: TruckType
): StackingCell[][] {
  const gridWidth = Math.ceil(truck.deckWidth / GRID_RESOLUTION)
  const gridLength = Math.ceil(truck.deckLength / GRID_RESOLUTION)

  // Initialize grid with empty cells
  const grid: StackingCell[][] = []
  for (let x = 0; x < gridLength; x++) {
    grid[x] = []
    for (let z = 0; z < gridWidth; z++) {
      grid[x][z] = {
        x: x * GRID_RESOLUTION,
        z: z * GRID_RESOLUTION,
        ceiling: 0,              // Height occupied
        maxLoad: DEFAULT_MAX_LOAD,
        currentLoad: 0,          // Cumulative weight stacked above base
        canStack: true,
      }
    }
  }

  // Fill grid based on placements
  for (const placement of placements) {
    // Skip failed placements (no valid deck position)
    if (placement.failed) continue

    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const itemLength = placement.rotated ? item.width : item.length
    const itemWidth = placement.rotated ? item.length : item.width

    // Use Math.floor for both start and end indices to prevent boundary overflow.
    // Math.ceil on end indices can produce an index past the last grid cell when
    // an item edge aligns exactly with a grid boundary (e.g. 48.0 / 0.5 = 96,
    // but grid indices are 0-95). Clamp to valid range as safety net.
    const startX = Math.max(0, Math.floor(placement.x / GRID_RESOLUTION))
    const endX = Math.min(gridLength - 1, Math.floor((placement.x + itemLength) / GRID_RESOLUTION))
    const startZ = Math.max(0, Math.floor(placement.z / GRID_RESOLUTION))
    const endZ = Math.min(gridWidth - 1, Math.floor((placement.z + itemWidth) / GRID_RESOLUTION))

    // Safety: skip if indices are still out of range (shouldn't happen after clamping)
    if (startX > endX || startZ > endZ) continue

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        const currentHeight = placement.y + item.height
        if (currentHeight > grid[x][z].ceiling) {
          grid[x][z].ceiling = currentHeight
          grid[x][z].baseItemId = placement.itemId

          // Update stacking constraints
          if (item.bottomOnly || !item.stackable) {
            grid[x][z].canStack = false
          }

          // Update max load based on item constraints
          if (item.maxLoad !== undefined) {
            grid[x][z].maxLoad = Math.min(grid[x][z].maxLoad, item.maxLoad)
          }
        }
      }
    }
  }

  // Second pass: accumulate weight from stacked items (y > 0) onto the cells below.
  // This enables cumulative weight validation — placing two 3,000 lb items on a
  // base with maxLoad 5,000 should fail because 6,000 > 5,000.
  for (const placement of placements) {
    if (placement.failed) continue
    if (placement.y === 0) continue // Floor items don't load on another item

    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    const itemLength = placement.rotated ? item.width : item.length
    const itemWidth = placement.rotated ? item.length : item.width
    const itemWeight = item.weight * (item.quantity || 1)

    const pStartX = Math.max(0, Math.floor(placement.x / GRID_RESOLUTION))
    const pEndX = Math.min(gridLength - 1, Math.floor((placement.x + itemLength) / GRID_RESOLUTION))
    const pStartZ = Math.max(0, Math.floor(placement.z / GRID_RESOLUTION))
    const pEndZ = Math.min(gridWidth - 1, Math.floor((placement.z + itemWidth) / GRID_RESOLUTION))

    if (pStartX > pEndX || pStartZ > pEndZ) continue

    const numCells = (pEndX - pStartX + 1) * (pEndZ - pStartZ + 1)
    const weightPerCell = itemWeight / numCells

    for (let x = pStartX; x <= pEndX; x++) {
      for (let z = pStartZ; z <= pEndZ; z++) {
        grid[x][z].currentLoad += weightPerCell
      }
    }
  }

  return grid
}

// ============================================================================
// STACKING VALIDATION
// ============================================================================

/**
 * Check if an item can be stacked on top of another
 */
export function canStackOn(
  topItem: LoadItem,
  bottomItem: LoadItem,
  currentLoadOnBottom: number
): { canStack: boolean; reason?: string } {
  // Check if bottom item allows stacking
  if (bottomItem.bottomOnly) {
    return { canStack: false, reason: `${bottomItem.description} cannot have items stacked on it (bottom only)` }
  }

  if (bottomItem.stackable === false) {
    return { canStack: false, reason: `${bottomItem.description} is not stackable` }
  }

  // Check layer limit
  if (bottomItem.maxLayers !== undefined && bottomItem.maxLayers <= 0) {
    return { canStack: false, reason: `${bottomItem.description} has reached max stacking layers` }
  }

  // Check weight limit
  const topWeight = topItem.weight * (topItem.quantity || 1)
  if (bottomItem.maxLoad !== undefined) {
    const totalLoadAfter = currentLoadOnBottom + topWeight
    if (totalLoadAfter > bottomItem.maxLoad) {
      return {
        canStack: false,
        reason: `${bottomItem.description} max load (${bottomItem.maxLoad.toLocaleString()} lbs) would be exceeded`
      }
    }
  }

  // Fragile items should not be placed under heavy items
  if (bottomItem.fragile && topWeight > 500) {
    return { canStack: false, reason: `Cannot stack heavy items on fragile ${bottomItem.description}` }
  }

  return { canStack: true }
}

// ============================================================================
// PLACEMENT FINDING
// ============================================================================

/**
 * Find the best position for an item on the trailer
 * Returns null if no valid position found
 */
export function findBestPosition(
  item: LoadItem,
  existingPlacements: ItemPlacement3D[],
  items: LoadItem[],
  truck: TruckType,
  maxHeight: number = DEFAULT_MAX_HEIGHT
): ItemPlacement3D | null {
  const grid = buildStackingMap(existingPlacements, items, truck)
  const gridLength = grid.length
  const gridWidth = grid[0]?.length || 0

  const itemLength = item.length
  const itemWidth = item.width
  const itemWeight = item.weight * (item.quantity || 1)

  // Try both orientations
  const orientations = [
    { length: itemLength, width: itemWidth, rotated: false },
    { length: itemWidth, width: itemLength, rotated: true },
  ]

  let bestPosition: ItemPlacement3D | null = null
  let bestScore = -Infinity

  for (const orientation of orientations) {
    // Scan positions from front-left
    for (let gx = 0; gx < gridLength; gx++) {
      for (let gz = 0; gz < gridWidth; gz++) {
        const x = gx * GRID_RESOLUTION
        const z = gz * GRID_RESOLUTION

        // Check if item fits within trailer bounds
        if (x + orientation.length > truck.deckLength) continue
        if (z + orientation.width > truck.deckWidth) continue

        // Find the floor height at this position
        // Use Math.floor to prevent boundary overflow (see buildStackingMap comment)
        const endGx = Math.min(gridLength - 1, Math.floor((x + orientation.length) / GRID_RESOLUTION))
        const endGz = Math.min(gridWidth - 1, Math.floor((z + orientation.width) / GRID_RESOLUTION))

        let floorHeight = 0
        let canPlace = true
        let stackedOnId: string | undefined

        // Distribute the new item's weight proportionally across cells it occupies
        const numCells = (endGx - gx + 1) * (endGz - gz + 1)
        const weightPerCell = numCells > 0 ? itemWeight / numCells : itemWeight

        for (let cx = gx; cx <= endGx && canPlace; cx++) {
          for (let cz = gz; cz <= endGz && canPlace; cz++) {
            const cell = grid[cx][cz]
            if (cell.ceiling > floorHeight) {
              floorHeight = cell.ceiling
              stackedOnId = cell.baseItemId
            }

            // Check if we can stack here (if not on floor)
            if (cell.ceiling > 0) {
              if (!cell.canStack) {
                canPlace = false
              }
              // Cumulative weight check: existing load + new item's share must not exceed maxLoad
              if (cell.currentLoad + weightPerCell > cell.maxLoad) {
                canPlace = false
              }
            }
          }
        }

        if (!canPlace) continue

        // Check height constraint — use zone-specific deck height for multi-level trailers
        let deckHeightAtPosition = truck.deckHeight
        if (truck.deckZones && truck.deckZones.length > 0) {
          // Find the zone this position falls in (check both start and end of item footprint)
          const startZone = truck.deckZones.find(z => x >= z.startX && x < z.endX)
          const endZone = truck.deckZones.find(z => (x + orientation.length - 0.1) >= z.startX && (x + orientation.length - 0.1) < z.endX)
          // Use the higher deck height (more restrictive for cargo height)
          const startDeckHeight = startZone?.deckHeight ?? truck.deckHeight
          const endDeckHeight = endZone?.deckHeight ?? truck.deckHeight
          deckHeightAtPosition = Math.max(startDeckHeight, endDeckHeight)
        }
        const totalHeight = deckHeightAtPosition + floorHeight + item.height
        if (totalHeight > maxHeight) continue

        // Fragile items must be placed on the floor — do not stack them on other items.
        // Floor placement (floorHeight === 0) is always safe for fragile items.
        // Stacking fragile items on top of anything (floorHeight > 0) risks damage.
        // This also prevents fragile-on-fragile stacking.
        if (item.fragile && floorHeight > 0) continue

        // bottomOnly items must be on floor
        if (item.bottomOnly && floorHeight > 0) continue

        // Calculate placement score
        // Prefer: front positions, floor level for heavy items, higher level for light/fragile
        let score = 0
        score -= x * 10 // Prefer front positions
        score -= z * 5  // Prefer left positions (consistent loading)

        if (floorHeight === 0) {
          score += 20 // Bonus for floor placement (more stable)
        } else if (item.fragile) {
          score += floorHeight * 15 // Fragile items get bonus for being higher
        }

        // Penalty for unused space below (gaps)
        score -= floorHeight * 2

        if (score > bestScore) {
          bestScore = score
          bestPosition = {
            itemId: item.id,
            x,
            y: floorHeight,
            z,
            rotated: orientation.rotated,
            stackedOn: stackedOnId,
            layer: floorHeight > 0 ? 1 : 0, // Simplified layer calculation
          }
        }
      }
    }
  }

  return bestPosition
}

// ============================================================================
// MAIN 3D PLACEMENT FUNCTION
// ============================================================================

/**
 * Calculate 3D placements for all items on a truck
 * Returns placements for items that fit, and list of items that don't fit
 */
export function calculatePlacements3D(
  items: LoadItem[],
  truck: TruckType,
  maxHeight: number = DEFAULT_MAX_HEIGHT
): {
  placements: ItemPlacement3D[]
  placedItems: LoadItem[]
  unplacedItems: LoadItem[]
  utilizationPercent: number
  stackingStats: {
    totalLayers: number
    itemsStacked: number
    floorItems: number
  }
} {
  const sortedItems = sortItemsForStacking(items)
  const placements: ItemPlacement3D[] = []
  const placedItems: LoadItem[] = []
  const unplacedItems: LoadItem[] = []

  // Track stacking statistics
  let maxLayer = 0
  let stackedCount = 0
  let floorCount = 0

  for (const item of sortedItems) {
    // Expand items with quantity > 1 into individual placements
    const qty = item.quantity || 1

    for (let q = 0; q < qty; q++) {
      // Create a virtual item for this unit
      const unitItem: LoadItem = {
        ...item,
        id: qty > 1 ? `${item.id}_unit_${q}` : item.id,
        quantity: 1,
      }

      const position = findBestPosition(
        unitItem,
        placements,
        [...placedItems, unitItem],
        truck,
        maxHeight
      )

      if (position) {
        placements.push(position)
        placedItems.push(unitItem)

        if (position.layer > 0) {
          stackedCount++
          maxLayer = Math.max(maxLayer, position.layer)
        } else {
          floorCount++
        }
      } else {
        // Couldn't place this unit
        if (q === 0) {
          // First unit couldn't be placed - whole item doesn't fit
          unplacedItems.push(item)
        }
        // For remaining units, they'll be handled as split items
        break
      }
    }
  }

  // Calculate volume utilization
  const usedVolume = placedItems.reduce((sum, item) => {
    return sum + (item.length * item.width * item.height)
  }, 0)
  const availableHeight = maxHeight - truck.deckHeight
  const totalVolume = truck.deckLength * truck.deckWidth * availableHeight
  const utilizationPercent = (usedVolume / totalVolume) * 100

  return {
    placements,
    placedItems,
    unplacedItems,
    utilizationPercent: Math.round(utilizationPercent * 10) / 10,
    stackingStats: {
      totalLayers: maxLayer + 1,
      itemsStacked: stackedCount,
      floorItems: floorCount,
    },
  }
}

// ============================================================================
// LAYER MANAGEMENT
// ============================================================================

/**
 * Calculate the layer number for a placement based on what it's stacked on
 */
export function calculateLayer(
  placement: ItemPlacement3D,
  allPlacements: ItemPlacement3D[]
): number {
  if (!placement.stackedOn) return 0

  const below = allPlacements.find(p => p.itemId === placement.stackedOn)
  if (!below) return 0

  return calculateLayer(below, allPlacements) + 1
}

/**
 * Get all items stacked on top of a given item
 */
export function getStackedItems(
  itemId: string,
  placements: ItemPlacement3D[]
): ItemPlacement3D[] {
  const directlyStacked = placements.filter(p => p.stackedOn === itemId)
  const allStacked: ItemPlacement3D[] = [...directlyStacked]

  for (const stacked of directlyStacked) {
    allStacked.push(...getStackedItems(stacked.itemId, placements))
  }

  return allStacked
}

/**
 * Calculate total weight stacked on an item
 */
export function getWeightStackedOn(
  itemId: string,
  placements: ItemPlacement3D[],
  items: LoadItem[]
): number {
  const stackedPlacements = getStackedItems(itemId, placements)
  return stackedPlacements.reduce((sum, p) => {
    const item = items.find(i => i.id === p.itemId)
    return sum + (item ? item.weight * (item.quantity || 1) : 0)
  }, 0)
}
