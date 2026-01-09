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
  TrendingUp,
  Calendar,
  History,
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

  // Fuel Surcharge Index
  const [currentFuelPrice, setCurrentFuelPrice] = useState(3.85)
  const [baseFuelPrice, setBaseFuelPrice] = useState(2.50)
  const [fuelSurchargeFormula] = useState('linear') // linear, tiered
  const [fuelPriceEffectiveDate, setFuelPriceEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Historical fuel prices
  interface FuelPriceEntry {
    id: string
    date: string
    price: number
    surchargePercent: number
  }

  const [fuelHistory, setFuelHistory] = useState<FuelPriceEntry[]>([
    { id: '1', date: '2026-01-01', price: 3.85, surchargePercent: 15 },
    { id: '2', date: '2025-12-15', price: 3.72, surchargePercent: 14 },
    { id: '3', date: '2025-12-01', price: 3.65, surchargePercent: 13 },
  ])

  // Calculate surcharge based on formula
  const calculateSurcharge = (fuelPrice: number): number => {
    if (fuelSurchargeFormula === 'linear') {
      // Linear: 1% surcharge for every $0.10 above base price
      const diff = fuelPrice - baseFuelPrice
      return Math.max(0, Math.round((diff / 0.10) * 1))
    }
    // Tiered formula could be added here
    return 0
  }

  const calculatedSurcharge = calculateSurcharge(currentFuelPrice)

  const addFuelPriceEntry = () => {
    const newEntry: FuelPriceEntry = {
      id: crypto.randomUUID(),
      date: fuelPriceEffectiveDate,
      price: currentFuelPrice,
      surchargePercent: calculatedSurcharge,
    }
    setFuelHistory([newEntry, ...fuelHistory])
    toast.success('Fuel price recorded')
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inland Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure inland transportation quote settings</p>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto">
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
                        Max: {type.max_length_inches}&quot;L x {type.max_width_inches}&quot;W x{' '}
                        {type.max_height_inches}&quot;H, {type.max_weight_lbs?.toLocaleString()} lbs
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

        {/* Fuel Surcharge Index */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Fuel Surcharge Index
            </CardTitle>
            <CardDescription>
              Track fuel prices and automatically calculate surcharges based on DOE index
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Fuel Price */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentFuelPrice" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Current DOE Diesel Price ($/gal)
                  </Label>
                  <Input
                    id="currentFuelPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentFuelPrice}
                    onChange={(e) => setCurrentFuelPrice(Number(e.target.value))}
                    className="max-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseFuelPrice" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Base Fuel Price ($/gal)
                  </Label>
                  <Input
                    id="baseFuelPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseFuelPrice}
                    onChange={(e) => setBaseFuelPrice(Number(e.target.value))}
                    className="max-w-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Surcharges are calculated above this baseline
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Effective Date
                  </Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={fuelPriceEffectiveDate}
                    onChange={(e) => setFuelPriceEffectiveDate(e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
              </div>

              {/* Calculated Surcharge */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Calculated Surcharge</p>
                  <p className="text-4xl font-bold text-primary">{calculatedSurcharge}%</p>
                </div>

                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Current price:</span>{' '}
                    ${currentFuelPrice.toFixed(2)}/gal
                  </p>
                  <p>
                    <span className="text-muted-foreground">Base price:</span>{' '}
                    ${baseFuelPrice.toFixed(2)}/gal
                  </p>
                  <p>
                    <span className="text-muted-foreground">Difference:</span>{' '}
                    ${(currentFuelPrice - baseFuelPrice).toFixed(2)}/gal
                  </p>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Formula: 1% surcharge for every $0.10 above base price
                </div>

                <Button onClick={addFuelPriceEntry} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Current Price
                </Button>
              </div>
            </div>

            {/* Price History */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Price History
              </Label>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-right font-medium">Price</th>
                      <th className="px-4 py-2 text-right font-medium">Surcharge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelHistory.slice(0, 5).map((entry, index) => (
                      <tr key={entry.id} className={index === 0 ? 'bg-primary/5' : ''}>
                        <td className="px-4 py-2">
                          {new Date(entry.date).toLocaleDateString()}
                          {index === 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          ${entry.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {entry.surchargePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessorial Charges */}
        <Card className="lg:col-span-2">
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
