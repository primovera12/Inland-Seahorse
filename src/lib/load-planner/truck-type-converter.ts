import type { TruckType } from './types'
import type { TruckTypeRecord } from '@/types/truck-types'

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
    loadingMethod: (record.loadingMethod as TruckType['loadingMethod']) ?? 'crane',
  }
}
