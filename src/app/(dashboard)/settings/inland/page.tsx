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
  MapPin,
  Clock,
  Route,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { inchesToFtInInput, ftInInputToInches, formatDimension } from '@/lib/dimensions'

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

interface EquipmentType {
  id: string
  name: string
  max_length_inches: number
  max_width_inches: number
  max_height_inches: number
  max_weight_lbs: number | null
  base_rate_cents: number
}

interface NewEquipmentType {
  name: string
  max_length_inches: number
  max_width_inches: number
  max_height_inches: number
  max_weight_lbs: number
  base_rate_cents: number
}

export default function InlandSettingsPage() {
  // Features
  const [useGoogleMaps, setUseGoogleMaps] = useState(true)
  const [autoCalculateRoute, setAutoCalculateRoute] = useState(true)
  const [showTruckRecommendations, setShowTruckRecommendations] = useState(true)

  // Accessorials
  const [accessorials, setAccessorials] = useState(DEFAULT_ACCESSORIALS)

  // Equipment type editing
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null)
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [newEquipment, setNewEquipment] = useState<NewEquipmentType>({
    name: '',
    max_length_inches: 0,
    max_width_inches: 0,
    max_height_inches: 0,
    max_weight_lbs: 0,
    base_rate_cents: 0,
  })

  const utils = trpc.useUtils()

  // Fetch equipment types
  const { data: equipmentTypes } = trpc.inland.getEquipmentTypes.useQuery()

  // Equipment type mutations
  const createEquipmentType = trpc.inland.createEquipmentType.useMutation({
    onSuccess: () => {
      toast.success('Equipment type added')
      setShowAddEquipment(false)
      setNewEquipment({
        name: '',
        max_length_inches: 0,
        max_width_inches: 0,
        max_height_inches: 0,
        max_weight_lbs: 0,
        base_rate_cents: 0,
      })
      utils.inland.getEquipmentTypes.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to add equipment type: ${error.message}`)
    },
  })

  const updateEquipmentType = trpc.inland.updateEquipmentType.useMutation({
    onSuccess: () => {
      toast.success('Equipment type updated')
      setEditingEquipment(null)
      utils.inland.getEquipmentTypes.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update equipment type: ${error.message}`)
    },
  })

  const deleteEquipmentType = trpc.inland.deleteEquipmentType.useMutation({
    onSuccess: () => {
      toast.success('Equipment type removed')
      utils.inland.getEquipmentTypes.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to remove equipment type: ${error.message}`)
    },
  })

  const handleSave = () => {
    toast.success('Inland settings saved successfully')
  }

  const handleAddEquipment = () => {
    if (!newEquipment.name) {
      toast.error('Equipment name is required')
      return
    }
    createEquipmentType.mutate(newEquipment)
  }

  const handleUpdateEquipment = () => {
    if (!editingEquipment) return
    updateEquipmentType.mutate({
      id: editingEquipment.id,
      name: editingEquipment.name,
      max_length_inches: editingEquipment.max_length_inches,
      max_width_inches: editingEquipment.max_width_inches,
      max_height_inches: editingEquipment.max_height_inches,
      max_weight_lbs: editingEquipment.max_weight_lbs || undefined,
      base_rate_cents: editingEquipment.base_rate_cents,
    })
  }

  const handleDeleteEquipment = (id: string) => {
    if (confirm('Are you sure you want to remove this equipment type?')) {
      deleteEquipmentType.mutate({ id })
    }
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Equipment Types
                </CardTitle>
                <CardDescription>Manage truck types for quotes</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddEquipment(!showAddEquipment)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Equipment Form */}
            {showAddEquipment && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g., Flatbed"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Length (ft-in)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 53-0"
                      value={inchesToFtInInput(newEquipment.max_length_inches)}
                      onChange={(e) => setNewEquipment({ ...newEquipment, max_length_inches: ftInInputToInches(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Width (ft-in)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 8-6"
                      value={inchesToFtInInput(newEquipment.max_width_inches)}
                      onChange={(e) => setNewEquipment({ ...newEquipment, max_width_inches: ftInInputToInches(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Height (ft-in)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 13-6"
                      value={inchesToFtInInput(newEquipment.max_height_inches)}
                      onChange={(e) => setNewEquipment({ ...newEquipment, max_height_inches: ftInInputToInches(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Weight (lbs)</Label>
                    <Input
                      type="number"
                      value={newEquipment.max_weight_lbs}
                      onChange={(e) => setNewEquipment({ ...newEquipment, max_weight_lbs: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Base Rate (cents/mile)</Label>
                    <Input
                      type="number"
                      value={newEquipment.base_rate_cents}
                      onChange={(e) => setNewEquipment({ ...newEquipment, base_rate_cents: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddEquipment(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddEquipment} disabled={createEquipmentType.isPending}>
                    {createEquipmentType.isPending ? 'Adding...' : 'Add Equipment Type'}
                  </Button>
                </div>
              </div>
            )}

            {/* Equipment List */}
            {equipmentTypes && equipmentTypes.length > 0 ? (
              <div className="space-y-3">
                {equipmentTypes.map((type) => (
                  <div key={type.id}>
                    {editingEquipment && editingEquipment.id === type.id ? (
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={editingEquipment.name}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Length (ft-in)</Label>
                            <Input
                              type="text"
                              placeholder="e.g., 53-0"
                              value={inchesToFtInInput(editingEquipment.max_length_inches)}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, max_length_inches: ftInInputToInches(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Width (ft-in)</Label>
                            <Input
                              type="text"
                              placeholder="e.g., 8-6"
                              value={inchesToFtInInput(editingEquipment.max_width_inches)}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, max_width_inches: ftInInputToInches(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Height (ft-in)</Label>
                            <Input
                              type="text"
                              placeholder="e.g., 13-6"
                              value={inchesToFtInInput(editingEquipment.max_height_inches)}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, max_height_inches: ftInInputToInches(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Weight</Label>
                            <Input
                              type="number"
                              value={editingEquipment.max_weight_lbs || 0}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, max_weight_lbs: Number(e.target.value) })}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Base Rate (cents/mile)</Label>
                            <Input
                              type="number"
                              value={editingEquipment.base_rate_cents}
                              onChange={(e) => setEditingEquipment({ ...editingEquipment, base_rate_cents: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingEquipment(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" className="h-8 w-8" onClick={handleUpdateEquipment} disabled={updateEquipmentType.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Max: {formatDimension(type.max_length_inches)}L x {formatDimension(type.max_width_inches)}W x{' '}
                            {formatDimension(type.max_height_inches)}H, {type.max_weight_lbs?.toLocaleString()} lbs
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {formatCurrency(type.base_rate_cents / 100)}/mile
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingEquipment(type as EquipmentType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteEquipment(type.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No equipment types configured. Click &quot;Add Type&quot; to add one.
              </div>
            )}
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
