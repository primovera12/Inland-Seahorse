import type { TruckType, TrailerCategory } from './types'
import type { TruckTypeRecord } from '@/types/truck-types'

// Determine power unit weight based on trailer category
// Hotshot = pickup (~9k), heavy haul = heavy tractor (~20k), standard = Class 8 (~17k), SPMT = self-propelled (0)
const HEAVY_HAUL_CATEGORIES: TrailerCategory[] = ['MULTI_AXLE', 'SCHNABEL', 'PERIMETER']

function getPowerUnitWeight(category: TrailerCategory, name: string): number {
  if (name.toLowerCase().includes('spmt') || name.toLowerCase().includes('self-propelled')) return 0
  if (name.toLowerCase().includes('hotshot')) return 9000
  if (HEAVY_HAUL_CATEGORIES.includes(category)) return 20000
  return 17000
}

export function truckTypeRecordToTruckType(record: TruckTypeRecord): TruckType {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    description: record.description || '',
    deckHeight: record.deckHeightFt,
    deckLength: record.deckLengthFt,
    deckWidth: record.deckWidthFt,
    wellLength: record.wellLengthFt ?? undefined,
    wellHeight: record.wellHeightFt ?? undefined,
    maxCargoWeight: record.maxCargoWeightLbs,
    tareWeight: record.tareWeightLbs ?? 15000,
    maxLegalCargoHeight: record.maxLegalCargoHeightFt ?? (13.5 - record.deckHeightFt),
    maxLegalCargoWidth: record.maxLegalCargoWidthFt ?? 8.5,
    features: record.features,
    bestFor: record.bestFor,
    powerUnitWeight: getPowerUnitWeight(record.category, record.name),
    loadingMethod: (record.loadingMethod as TruckType['loadingMethod']) ?? 'crane',
  }
}
