'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Truck,
  Save,
  DollarSign,
  Percent,
  MapPin,
  Fuel,
  Clock,
  Route,
  Plus,
  Trash2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Default accessorial types
const DEFAULT_ACCESSORIALS = [
  { name: 'Detention', billingUnit: 'hour', defaultRate: 75 },
  { name: 'Layover', billingUnit: 'day', defaultRate: 350 },
  { name: 'TONU (Truck Ordered Not Used)', billingUnit: 'flat', defaultRate: 500 },
  { name: 'Driver Assist', billingUnit: 'hour', defaultRate: 50 },
  { name: 'Lumper Fee', billingUnit: 'flat', defaultRate: 150 },
  { name: 'Tarping', billingUnit: 'flat', defaultRate: 100 },
  { name: 'Inside Delivery', billingUnit: 'flat', defaultRate: 200 },
  { name: 'Lift Gate', billingUnit: 'flat', defaultRate: 75 },
  { name: 'Residential Delivery', billingUnit: 'flat', defaultRate: 100 },
  { name: 'Storage', billingUnit: 'day', defaultRate: 50 },
]

const BILLING_UNITS = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'day', label: 'Per Day' },
  { value: 'way', label: 'Per Way' },
  { value: 'stop', label: 'Per Stop' },
  { value: 'week', label: 'Per Week' },
  { value: 'month', label: 'Per Month' },
]

export default function InlandSettingsPage() {
  // Rate settings
  const [baseRatePerMile, setBaseRatePerMile] = useState(3.50)
  const [fuelSurchargePercent, setFuelSurchargePercent] = useState(15)
  const [minimumCharge, setMinimumCharge] = useState(500)

  // Default margin
  const [defaultMargin, setDefaultMargin] = useState(15)

  // Features
  const [useGoogleMaps, setUseGoogleMaps] = useState(true)
  const [autoCalculateRoute, setAutoCalculateRoute] = useState(true)
  const [showTruckRecommendations, setShowTruckRecommendations] = useState(true)

  // Accessorials
  const [accessorials, setAccessorials] = useState(DEFAULT_ACCESSORIALS)

  // Fetch equipment types
  const { data: equipmentTypes } = trpc.inland.getEquipmentTypes.useQuery()

  const handleSave = () => {
    // In production, this would save to the database
    toast.success('Inland settings saved successfully')
  }

  const updateAccessorial = (index: number, field: string, value: string | number) => {
    const updated = [...accessorials]
    updated[index] = { ...updated[index], [field]: value }
    setAccessorials(updated)
  }

  const removeAccessorial = (index: number) => {
    setAccessorials(accessorials.filter((_, i) => i !== index))
  }

  const addAccessorial = () => {
    setAccessorials([
      ...accessorials,
      { name: '', billingUnit: 'flat', defaultRate: 0 },
    ])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inland Settings</h1>
          <p className="text-muted-foreground">Configure inland transportation quote settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rate Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rate Defaults
            </CardTitle>
            <CardDescription>Default rates for new quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseRate" className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Base Rate per Mile ($)
              </Label>
              <Input
                id="baseRate"
                type="number"
                step="0.01"
                min="0"
                value={baseRatePerMile}
                onChange={(e) => setBaseRatePerMile(Number(e.target.value))}
                className="max-w-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Starting rate per mile before adjustments
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="fuelSurcharge" className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Fuel Surcharge (%)
              </Label>
              <Input
                id="fuelSurcharge"
                type="number"
                min="0"
                max="100"
                value={fuelSurchargePercent}
                onChange={(e) => setFuelSurchargePercent(Number(e.target.value))}
                className="max-w-[120px]"
              />
              <p className="text-sm text-muted-foreground">
                Additional percentage for fuel costs
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="minimumCharge" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Minimum Charge ($)
              </Label>
              <Input
                id="minimumCharge"
                type="number"
                min="0"
                value={minimumCharge}
                onChange={(e) => setMinimumCharge(Number(e.target.value))}
                className="max-w-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Minimum charge per load
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="defaultMargin" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Default Margin (%)
              </Label>
              <Input
                id="defaultMargin"
                type="number"
                min="0"
                max="100"
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(Number(e.target.value))}
                className="max-w-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Features
            </CardTitle>
            <CardDescription>Enable or disable quote features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Google Maps Integration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use Google Places for address autocomplete
                </p>
              </div>
              <Switch
                checked={useGoogleMaps}
                onCheckedChange={setUseGoogleMaps}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Auto-calculate Routes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate distance and duration
                </p>
              </div>
              <Switch
                checked={autoCalculateRoute}
                onCheckedChange={setAutoCalculateRoute}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Truck Recommendations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Suggest truck types based on cargo
                </p>
              </div>
              <Switch
                checked={showTruckRecommendations}
                onCheckedChange={setShowTruckRecommendations}
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipment Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Equipment Types
            </CardTitle>
            <CardDescription>Available truck types for quotes</CardDescription>
          </CardHeader>
          <CardContent>
            {equipmentTypes && equipmentTypes.length > 0 ? (
              <div className="space-y-3">
                {equipmentTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Max: {type.max_length_inches}"L x {type.max_width_inches}"W x{' '}
                        {type.max_height_inches}"H, {type.max_weight_lbs?.toLocaleString()} lbs
                      </p>
                    </div>
                    <Badge variant="outline">
                      {formatCurrency(type.base_rate_cents / 100)}/mile
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No equipment types configured
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accessorial Charges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Accessorial Charges
            </CardTitle>
            <CardDescription>Default accessorial rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessorials.map((acc, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={acc.name}
                  onChange={(e) => updateAccessorial(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1"
                />
                <select
                  value={acc.billingUnit}
                  onChange={(e) => updateAccessorial(index, 'billingUnit', e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {BILLING_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  value={acc.defaultRate}
                  onChange={(e) => updateAccessorial(index, 'defaultRate', Number(e.target.value))}
                  className="w-24"
                  placeholder="Rate"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAccessorial(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addAccessorial} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Accessorial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
