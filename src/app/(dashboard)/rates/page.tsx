'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { LOCATIONS, COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import { Search, DollarSign } from 'lucide-react'

const COST_LABELS: Record<CostField, string> = {
  dismantling_loading_cost: 'Dismantling & Loading',
  loading_cost: 'Loading Only',
  blocking_bracing_cost: 'Blocking & Bracing',
  rigging_cost: 'Rigging',
  storage_cost: 'Storage',
  transport_cost: 'Transport',
  equipment_cost: 'Equipment',
  labor_cost: 'Labor',
  permit_cost: 'Permits',
  escort_cost: 'Escort',
  miscellaneous_cost: 'Miscellaneous',
}

export default function RatesPage() {
  const [selectedMakeId, setSelectedMakeId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<LocationName>('New Jersey')

  // Fetch makes
  const { data: makes } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId },
    { enabled: !!selectedMakeId }
  )

  // Fetch rates for selected model
  const { data: rates, isLoading: ratesLoading } = trpc.equipment.getRates.useQuery(
    { modelId: selectedModelId, location: selectedLocation },
    { enabled: !!selectedModelId }
  )

  // Fetch all rates for model (all locations)
  const { data: allRates } = trpc.equipment.getAllRatesForModel.useQuery(
    { modelId: selectedModelId },
    { enabled: !!selectedModelId }
  )

  const selectedMake = makes?.find((m) => m.id === selectedMakeId)
  const selectedModel = models?.find((m) => m.id === selectedModelId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rates</h1>
          <p className="text-muted-foreground">View and manage equipment pricing by location</p>
        </div>
      </div>

      {/* Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Equipment Selection
          </CardTitle>
          <CardDescription>Select equipment to view rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Make</Label>
              <Select
                value={selectedMakeId}
                onValueChange={(value) => {
                  setSelectedMakeId(value)
                  setSelectedModelId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes?.map((make) => (
                    <SelectItem key={make.id} value={make.id}>
                      {make.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={selectedModelId}
                onValueChange={setSelectedModelId}
                disabled={!selectedMakeId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={selectedMakeId ? 'Select model' : 'Select make first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={selectedLocation}
                onValueChange={(value) => setSelectedLocation(value as LocationName)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Display */}
      {selectedModelId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Selected Location Rates */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMake?.name} {selectedModel?.name}
              </CardTitle>
              <CardDescription>{selectedLocation} rates</CardDescription>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading rates...</div>
              ) : !rates ? (
                <div className="text-center py-4 text-muted-foreground">
                  No rates found for this location
                </div>
              ) : (
                <div className="space-y-2">
                  {COST_FIELDS.map((field) => {
                    const value = rates[field]
                    if (!value) return null
                    return (
                      <div
                        key={field}
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                      >
                        <span>{COST_LABELS[field]}</span>
                        <span className="font-mono font-medium">{formatCurrency(value)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Locations Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>All Locations</CardTitle>
              <CardDescription>Rate comparison across locations</CardDescription>
            </CardHeader>
            <CardContent>
              {!allRates || allRates.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No rates available</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Dismantling</TableHead>
                        <TableHead className="text-right">Loading</TableHead>
                        <TableHead className="text-right">Transport</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRates.map((rate) => (
                        <TableRow
                          key={rate.id}
                          className={rate.location === selectedLocation ? 'bg-primary/10' : ''}
                        >
                          <TableCell className="font-medium">{rate.location}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(rate.dismantling_loading_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(rate.loading_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(rate.transport_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
