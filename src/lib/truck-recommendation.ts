import { DEFAULT_TRUCK_SPECS, type TruckSpecs } from '@/types/equipment'
import type { CargoItem, InlandEquipmentType } from '@/types/inland'

export interface TruckRecommendation {
  recommendedId: string
  recommendedName: string
  reason: string
  requirements: {
    lengthRequired: number
    widthRequired: number
    heightRequired: number
    weightRequired: number
  }
  isOversizePermitRequired: boolean
  isOverweightPermitRequired: boolean
  multiTruckSuggestion?: {
    count: number
    truckType: string
    reason: string
  }
}

/**
 * Get truck specs by ID, with fallback to defaults
 */
export function getTruckSpecs(
  truckTypeId: string,
  equipmentTypes?: InlandEquipmentType[]
): TruckSpecs | undefined {
  // Try to find in custom equipment types first
  if (equipmentTypes) {
    const customType = equipmentTypes.find((t) => t.id === truckTypeId)
    if (customType) {
      return {
        id: customType.id,
        name: customType.name,
        max_length_inches: customType.max_length_inches,
        max_width_inches: customType.max_width_inches,
        max_height_inches: customType.max_height_inches,
        max_weight_lbs: customType.max_weight_lbs,
        legal_length_inches: customType.legal_length_inches,
        legal_width_inches: customType.legal_width_inches,
        legal_height_inches: customType.legal_height_inches,
        legal_weight_lbs: customType.legal_weight_lbs,
      }
    }
  }

  // Fall back to default specs
  return DEFAULT_TRUCK_SPECS.find((t) => t.id === truckTypeId)
}

/**
 * Check if cargo fits on a specific truck
 */
export function cargoFitsOnTruck(
  cargo: { length: number; width: number; height: number; weight: number },
  truck: TruckSpecs
): boolean {
  return (
    cargo.length <= truck.max_length_inches &&
    cargo.width <= truck.max_width_inches &&
    cargo.height <= truck.max_height_inches &&
    cargo.weight <= truck.max_weight_lbs
  )
}

/**
 * Recommend the best truck type for given cargo items
 */
export function recommendTruckType(
  cargoItems: CargoItem[],
  equipmentTypes?: InlandEquipmentType[]
): TruckRecommendation | null {
  if (!cargoItems || cargoItems.length === 0) {
    return null
  }

  // Calculate total requirements across all cargo items
  let maxLength = 0
  let maxWidth = 0
  let maxHeight = 0
  let totalWeight = 0

  for (const item of cargoItems) {
    maxLength = Math.max(maxLength, item.length_inches)
    maxWidth = Math.max(maxWidth, item.width_inches)
    maxHeight = Math.max(maxHeight, item.height_inches)
    totalWeight += item.weight_lbs * item.quantity
  }

  const requirements = {
    lengthRequired: maxLength,
    widthRequired: maxWidth,
    heightRequired: maxHeight,
    weightRequired: totalWeight,
  }

  // Get available truck specs
  const availableTrucks = equipmentTypes
    ? equipmentTypes
        .filter((t) => t.is_active)
        .map((t) => ({
          id: t.id,
          name: t.name,
          max_length_inches: t.max_length_inches,
          max_width_inches: t.max_width_inches,
          max_height_inches: t.max_height_inches,
          max_weight_lbs: t.max_weight_lbs,
          legal_length_inches: t.legal_length_inches,
          legal_width_inches: t.legal_width_inches,
          legal_height_inches: t.legal_height_inches,
          legal_weight_lbs: t.legal_weight_lbs,
        }))
    : DEFAULT_TRUCK_SPECS

  // Try to find the smallest truck that fits
  // Priority order: Flatbed → Step Deck → RGN → Lowboy
  const priorityOrder = ['flatbed', 'step-deck', 'rgn', 'lowboy']

  for (const truckId of priorityOrder) {
    const truck = availableTrucks.find(
      (t) => t.id === truckId || t.name.toLowerCase().includes(truckId)
    )
    if (!truck) continue

    if (
      cargoFitsOnTruck(
        {
          length: maxLength,
          width: maxWidth,
          height: maxHeight,
          weight: totalWeight,
        },
        truck
      )
    ) {
      const isOversizePermitRequired =
        maxLength > truck.legal_length_inches ||
        maxWidth > truck.legal_width_inches ||
        maxHeight > truck.legal_height_inches

      const isOverweightPermitRequired = totalWeight > truck.legal_weight_lbs

      return {
        recommendedId: truck.id,
        recommendedName: truck.name,
        reason: `${truck.name} is the most economical option for this cargo.`,
        requirements,
        isOversizePermitRequired,
        isOverweightPermitRequired,
      }
    }
  }

  // No single truck fits - suggest multi-truck solution
  const largestTruck = availableTrucks.find((t) => t.id === 'lowboy') || availableTrucks[availableTrucks.length - 1]

  if (totalWeight > largestTruck.max_weight_lbs) {
    const trucksNeeded = Math.ceil(totalWeight / largestTruck.max_weight_lbs)
    return {
      recommendedId: largestTruck.id,
      recommendedName: largestTruck.name,
      reason: `Cargo exceeds single truck capacity. Multiple trucks recommended.`,
      requirements,
      isOversizePermitRequired: true,
      isOverweightPermitRequired: true,
      multiTruckSuggestion: {
        count: trucksNeeded,
        truckType: largestTruck.name,
        reason: `Total weight of ${totalWeight.toLocaleString()} lbs requires ${trucksNeeded} trucks.`,
      },
    }
  }

  // Cargo dimensions are too large even for largest truck
  return {
    recommendedId: largestTruck.id,
    recommendedName: largestTruck.name,
    reason: `Cargo dimensions exceed standard truck limits. Special equipment may be required.`,
    requirements,
    isOversizePermitRequired: true,
    isOverweightPermitRequired: totalWeight > largestTruck.legal_weight_lbs,
  }
}
