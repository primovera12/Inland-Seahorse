'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete'
import { Truck, MapPin } from 'lucide-react'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'

export interface InlandTransportData {
  enabled: boolean
  pickup_address: string
  pickup_city: string
  pickup_state: string
  pickup_zip: string
  dropoff_address: string
  dropoff_city: string
  dropoff_state: string
  dropoff_zip: string
  transport_cost: number // cents
  notes: string
}

interface InlandTransportFormProps {
  data: InlandTransportData
  onChange: (data: InlandTransportData) => void
}

export const initialInlandTransportData: InlandTransportData = {
  enabled: false,
  pickup_address: '',
  pickup_city: '',
  pickup_state: '',
  pickup_zip: '',
  dropoff_address: '',
  dropoff_city: '',
  dropoff_state: '',
  dropoff_zip: '',
  transport_cost: 0,
  notes: '',
}

export function InlandTransportForm({ data, onChange }: InlandTransportFormProps) {
  const updateField = <K extends keyof InlandTransportData>(
    field: K,
    value: InlandTransportData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Inland Transportation</CardTitle>
              <CardDescription>
                Add transportation costs from port to final destination
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(enabled) => updateField('enabled', enabled)}
          />
        </div>
      </CardHeader>
      {data.enabled && (
        <CardContent className="space-y-6">
          {/* Pickup Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-green-600" />
              <span>Pickup Location</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="pickup_address">Address</Label>
                <AddressAutocomplete
                  id="pickup_address"
                  placeholder="Start typing pickup address..."
                  value={data.pickup_address}
                  onChange={(value) => updateField('pickup_address', value)}
                  onSelect={(components) => {
                    onChange({
                      ...data,
                      pickup_address: components.address,
                      pickup_city: components.city || data.pickup_city,
                      pickup_state: components.state || data.pickup_state,
                      pickup_zip: components.zip || data.pickup_zip,
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_city">City</Label>
                <Input
                  id="pickup_city"
                  placeholder="City"
                  value={data.pickup_city}
                  onChange={(e) => updateField('pickup_city', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_state">State</Label>
                  <Input
                    id="pickup_state"
                    placeholder="State"
                    value={data.pickup_state}
                    onChange={(e) => updateField('pickup_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_zip">ZIP</Label>
                  <Input
                    id="pickup_zip"
                    placeholder="ZIP"
                    value={data.pickup_zip}
                    onChange={(e) => updateField('pickup_zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-red-600" />
              <span>Dropoff Location</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="dropoff_address">Address</Label>
                <AddressAutocomplete
                  id="dropoff_address"
                  placeholder="Start typing dropoff address..."
                  value={data.dropoff_address}
                  onChange={(value) => updateField('dropoff_address', value)}
                  onSelect={(components) => {
                    onChange({
                      ...data,
                      dropoff_address: components.address,
                      dropoff_city: components.city || data.dropoff_city,
                      dropoff_state: components.state || data.dropoff_state,
                      dropoff_zip: components.zip || data.dropoff_zip,
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff_city">City</Label>
                <Input
                  id="dropoff_city"
                  placeholder="City"
                  value={data.dropoff_city}
                  onChange={(e) => updateField('dropoff_city', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dropoff_state">State</Label>
                  <Input
                    id="dropoff_state"
                    placeholder="State"
                    value={data.dropoff_state}
                    onChange={(e) => updateField('dropoff_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff_zip">ZIP</Label>
                  <Input
                    id="dropoff_zip"
                    placeholder="ZIP"
                    value={data.dropoff_zip}
                    onChange={(e) => updateField('dropoff_zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transport Cost */}
          <div className="space-y-4 pt-4 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="transport_cost">Transport Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="transport_cost"
                    type="text"
                    placeholder="0.00"
                    value={data.transport_cost ? formatCurrency(data.transport_cost).replace('$', '') : ''}
                    onChange={(e) => {
                      const cents = parseCurrencyToCents(e.target.value)
                      updateField('transport_cost', cents)
                    }}
                    className="pl-7 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="transport_notes">Transportation Notes</Label>
            <Textarea
              id="transport_notes"
              placeholder="Special instructions, delivery requirements, etc."
              value={data.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {data.transport_cost > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Inland Transportation Total</span>
                <span className="text-lg font-bold font-mono text-primary">
                  {formatCurrency(data.transport_cost)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
