'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Wrench, Save, DollarSign, Percent, MapPin, Calculator } from 'lucide-react'

// Cost fields that can be enabled/disabled
const COST_FIELDS = [
  { id: 'dismantling_loading_cost', label: 'Dismantling & Loading', description: 'Labor for dismantling and loading equipment' },
  { id: 'loading_cost', label: 'Loading Only', description: 'Labor for loading pre-dismantled equipment' },
  { id: 'blocking_bracing_cost', label: 'Blocking & Bracing', description: 'Securing equipment for transport' },
  { id: 'processing_cost', label: 'Processing', description: 'Administrative processing fees' },
  { id: 'certification_cost', label: 'Certification', description: 'Equipment certification and documentation' },
  { id: 'equipment_cost', label: 'Equipment', description: 'Special equipment rental' },
  { id: 'labor_cost', label: 'Additional Labor', description: 'Extra labor charges' },
  { id: 'crane_cost', label: 'Crane', description: 'Crane services for heavy lifts' },
  { id: 'rigging_cost', label: 'Rigging', description: 'Rigging and specialized lifting' },
  { id: 'permits_cost', label: 'Permits', description: 'Required permits and licenses' },
  { id: 'escort_cost', label: 'Escort', description: 'Pilot car / escort services' },
  { id: 'misc_cost', label: 'Miscellaneous', description: 'Other miscellaneous costs' },
]

// Locations
const LOCATIONS = [
  'New Jersey',
  'Savannah',
  'Houston',
  'Chicago',
  'Oakland',
  'Long Beach',
]

export default function DismantleSettingsPage() {
  // Default margin
  const [defaultMargin, setDefaultMargin] = useState(15)

  // Enabled cost fields
  const [enabledCosts, setEnabledCosts] = useState<Record<string, boolean>>({})

  // Default location
  const [defaultLocation, setDefaultLocation] = useState('')

  // Quote settings
  const [quoteValidityDays, setQuoteValidityDays] = useState(30)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)

  // Initialize enabled costs
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    COST_FIELDS.forEach(field => {
      defaults[field.id] = true
    })
    setEnabledCosts(defaults)
  }, [])

  const handleSave = () => {
    // In production, this would save to the database
    toast.success('Dismantle settings saved successfully')
  }

  const toggleCostField = (fieldId: string) => {
    setEnabledCosts(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dismantle Settings</h1>
          <p className="text-muted-foreground">Configure dismantling quote settings and defaults</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quote Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quote Defaults
            </CardTitle>
            <CardDescription>Default values for new quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <p className="text-sm text-muted-foreground">
                Applied to new quotes by default
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="defaultLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Default Location
              </Label>
              <select
                id="defaultLocation"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a location</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Pre-selected when creating new quotes
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="quoteValidity" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Quote Validity (days)
              </Label>
              <Input
                id="quoteValidity"
                type="number"
                min="1"
                max="365"
                value={quoteValidityDays}
                onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                className="max-w-[120px]"
              />
              <p className="text-sm text-muted-foreground">
                Days until quotes expire
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quote Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Quote Behavior
            </CardTitle>
            <CardDescription>Configure how quotes work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-save Drafts</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save quote drafts while editing
                </p>
              </div>
              <Switch
                checked={autoSaveEnabled}
                onCheckedChange={setAutoSaveEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Dimensions on PDF</Label>
                <p className="text-sm text-muted-foreground">
                  Include equipment dimensions in quote PDFs
                </p>
              </div>
              <Switch
                checked={showDimensions}
                onCheckedChange={setShowDimensions}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Fields */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Categories
            </CardTitle>
            <CardDescription>Enable or disable cost categories shown on quotes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {COST_FIELDS.map(field => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <Switch
                    checked={enabledCosts[field.id] ?? true}
                    onCheckedChange={() => toggleCostField(field.id)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
