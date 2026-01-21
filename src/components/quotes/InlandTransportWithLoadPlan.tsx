'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Truck, AlertTriangle, Package } from 'lucide-react'

// Existing component
import {
  InlandTransportForm,
  type InlandTransportData,
  type EquipmentDimensions,
} from './inland-transport-form'

// NEW load planner components and functions
import { TrailerDiagram } from '@/components/load-planner/TrailerDiagram'
import {
  planLoads,
  selectTrucks,
  type LoadItem,
  type LoadPlan,
  type TruckType,
  type TruckRecommendation,
} from '@/lib/load-planner'

interface InlandTransportWithLoadPlanProps {
  data: InlandTransportData
  onChange: (data: InlandTransportData) => void
  equipmentDimensions?: EquipmentDimensions[]
}

/**
 * Wrapper component that adds load planning visualization to InlandTransportForm.
 *
 * This component:
 * 1. Renders the existing InlandTransportForm unchanged
 * 2. Auto-calculates load plans from equipment dimensions
 * 3. Shows visual trailer diagrams when cargo exists
 * 4. Stores load plan data in the quote for PDF generation
 */
export function InlandTransportWithLoadPlan({
  data,
  onChange,
  equipmentDimensions,
}: InlandTransportWithLoadPlanProps) {
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null)
  const [recommendations, setRecommendations] = useState<TruckRecommendation[]>([])
  const [showLoadPlan, setShowLoadPlan] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)

  // Convert equipment dimensions (inches) to LoadItems (feet)
  const cargoItems: LoadItem[] = useMemo(() => {
    if (!equipmentDimensions || equipmentDimensions.length === 0) {
      return []
    }

    return equipmentDimensions
      .filter(
        (eq) =>
          eq.length_inches > 0 ||
          eq.width_inches > 0 ||
          eq.height_inches > 0 ||
          eq.weight_lbs > 0
      )
      .map((eq, index) => ({
        id: `equipment-${index}`,
        description: eq.name || `Equipment ${index + 1}`,
        quantity: 1,
        // Convert inches to feet
        length: eq.length_inches / 12,
        width: eq.width_inches / 12,
        height: eq.height_inches / 12,
        weight: eq.weight_lbs,
        stackable: false,
        fragile: false,
        hazmat: false,
      }))
  }, [equipmentDimensions])

  // Also include cargo items from existing load blocks (convert from inches)
  const allCargoItems: LoadItem[] = useMemo(() => {
    const items = [...cargoItems]

    // Add cargo items from load blocks
    if (data.load_blocks) {
      for (const block of data.load_blocks) {
        if (block.cargo_items) {
          for (const cargo of block.cargo_items) {
            // Skip if already added as equipment
            if (items.some((i) => i.description === cargo.description)) continue

            items.push({
              id: cargo.id,
              description: cargo.description,
              quantity: cargo.quantity,
              // Convert inches to feet
              length: cargo.length_inches / 12,
              width: cargo.width_inches / 12,
              height: cargo.height_inches / 12,
              weight: cargo.weight_lbs,
              stackable: false,
              fragile: false,
              hazmat: false,
            })
          }
        }
      }
    }

    return items
  }, [cargoItems, data.load_blocks])

  // Calculate load plan when cargo changes
  useEffect(() => {
    if (!data.enabled || allCargoItems.length === 0) {
      setLoadPlan(null)
      setRecommendations([])
      return
    }

    // Check if items have valid dimensions
    const validItems = allCargoItems.filter(
      (item) =>
        item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )

    if (validItems.length === 0) {
      setLoadPlan(null)
      setRecommendations([])
      return
    }

    setIsCalculating(true)

    // Use setTimeout to avoid blocking UI
    setTimeout(() => {
      try {
        // Get truck recommendations
        const recs = selectTrucks(validItems)
        setRecommendations(recs.slice(0, 5))

        // Calculate full load plan
        const plan = planLoads(validItems)
        setLoadPlan(plan)

        // Store load plan data in the quote for PDF generation
        if (plan && plan.loads.length > 0) {
          const updatedData: InlandTransportData = {
            ...data,
            load_blocks: data.load_blocks.map((block, index) => {
              const plannedLoad = plan.loads[index]
              if (!plannedLoad) return block

              return {
                ...block,
                // Store load plan visualization data
                loadPlan: {
                  truck: plannedLoad.recommendedTruck,
                  placements: plannedLoad.placements,
                  items: plannedLoad.items,
                  warnings: plannedLoad.warnings,
                  isLegal: plannedLoad.isLegal,
                },
              }
            }),
          }

          // Only update if load plan actually changed
          const currentLoadPlan = data.load_blocks[0]?.loadPlan
          const newLoadPlan = updatedData.load_blocks[0]?.loadPlan
          if (JSON.stringify(currentLoadPlan) !== JSON.stringify(newLoadPlan)) {
            onChange(updatedData)
          }
        }
      } catch (error) {
        console.error('Error calculating load plan:', error)
      } finally {
        setIsCalculating(false)
      }
    }, 100)
  }, [data.enabled, allCargoItems])

  // Handle truck change from visualizer
  const handleTruckChange = (loadIndex: number, newTruck: TruckType) => {
    if (!loadPlan) return

    // Update load plan with new truck
    const updatedLoads = [...loadPlan.loads]
    updatedLoads[loadIndex] = {
      ...updatedLoads[loadIndex],
      recommendedTruck: newTruck,
    }

    setLoadPlan({
      ...loadPlan,
      loads: updatedLoads,
    })

    // Also update the load block in data
    if (data.load_blocks[loadIndex]) {
      const updatedBlocks = [...data.load_blocks]
      updatedBlocks[loadIndex] = {
        ...updatedBlocks[loadIndex],
        truck_type_id: newTruck.id,
        truck_type_name: newTruck.name,
      }
      onChange({ ...data, load_blocks: updatedBlocks })
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing form - unchanged */}
      <InlandTransportForm
        data={data}
        onChange={onChange}
        equipmentDimensions={equipmentDimensions}
      />

      {/* NEW: Load Plan Visualization Section */}
      {data.enabled && loadPlan && loadPlan.loads.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowLoadPlan(!showLoadPlan)}
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="font-medium">Load Plan Visualization</span>
                <span className="text-muted-foreground font-normal text-sm">
                  ({loadPlan.totalTrucks} truck{loadPlan.totalTrucks > 1 ? 's' : ''},{' '}
                  {loadPlan.totalItems} item{loadPlan.totalItems > 1 ? 's' : ''})
                </span>
              </span>
              {showLoadPlan ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>

          {showLoadPlan && (
            <CardContent className="pt-0">
              {isCalculating ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
                  Calculating load plan...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{loadPlan.totalTrucks}</div>
                      <div className="text-xs text-muted-foreground">
                        Truck{loadPlan.totalTrucks > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{loadPlan.totalItems}</div>
                      <div className="text-xs text-muted-foreground">Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(loadPlan.totalWeight / 1000).toFixed(1)}k
                      </div>
                      <div className="text-xs text-muted-foreground">lbs</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {loadPlan.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Warnings</span>
                      </div>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {loadPlan.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Load Cards with Diagrams */}
                  {loadPlan.loads.map((load, index) => (
                    <Card key={load.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{load.recommendedTruck.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {load.items.length} item{load.items.length > 1 ? 's' : ''} &bull;{' '}
                                {(load.weight / 1000).toFixed(1)}k lbs
                              </div>
                            </div>
                          </div>
                          {load.warnings.length > 0 && (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Trailer Diagram */}
                        <TrailerDiagram
                          truck={load.recommendedTruck}
                          items={load.items}
                          placements={load.placements}
                        />

                        {/* Items List */}
                        <div className="mt-4 space-y-1">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Items on this truck:
                          </div>
                          {load.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm py-1 px-2 hover:bg-muted/50 rounded"
                            >
                              <span>
                                {item.description}
                                {item.quantity > 1 && (
                                  <span className="text-muted-foreground ml-1">
                                    x{item.quantity}
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground">
                                {item.length.toFixed(1)}' x {item.width.toFixed(1)}' x{' '}
                                {item.height.toFixed(1)}'
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Warnings for this load */}
                        {load.warnings.length > 0 && (
                          <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                            {load.warnings.map((w, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Unassigned Items */}
                  {loadPlan.unassignedItems.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-medium">
                            {loadPlan.unassignedItems.length} item
                            {loadPlan.unassignedItems.length > 1 ? 's' : ''} could not be assigned
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-red-600">
                        <p className="mb-2">
                          These items may be too large for standard trailers:
                        </p>
                        <ul className="space-y-1">
                          {loadPlan.unassignedItems.map((item) => (
                            <li key={item.id}>
                              {item.description} ({item.length.toFixed(1)}' x{' '}
                              {item.width.toFixed(1)}' x {item.height.toFixed(1)}' @{' '}
                              {item.weight.toLocaleString()} lbs)
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Show message when inland transport is enabled but no cargo */}
      {data.enabled && allCargoItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No cargo dimensions available</p>
            <p className="text-sm mt-1">
              Select equipment with dimensions or add cargo items to see the load plan
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Re-export types and initial data for convenience
export type { InlandTransportData, EquipmentDimensions }
export { initialInlandTransportData } from './inland-transport-form'
