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
import { Wrench, Save, DollarSign, Percent, MapPin, Calculator, Ruler, Scale, FileText, Plus, Trash2, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

  // Dimension thresholds for oversize detection
  const [lengthThreshold, setLengthThreshold] = useState(636) // 53 feet in inches
  const [widthThreshold, setWidthThreshold] = useState(102)   // 8.5 feet in inches
  const [heightThreshold, setHeightThreshold] = useState(162) // 13.5 feet in inches
  const [weightThreshold, setWeightThreshold] = useState(48000) // lbs

  // Location templates with default costs
  interface LocationTemplate {
    id: string
    location: string
    isDefault: boolean
    costs: Record<string, number>
  }

  const [locationTemplates, setLocationTemplates] = useState<LocationTemplate[]>([
    {
      id: '1',
      location: 'New Jersey',
      isDefault: true,
      costs: {
        dismantling_loading_cost: 2500,
        blocking_bracing_cost: 500,
        processing_cost: 150,
      },
    },
    {
      id: '2',
      location: 'Houston',
      isDefault: false,
      costs: {
        dismantling_loading_cost: 2200,
        blocking_bracing_cost: 450,
        processing_cost: 125,
      },
    },
  ])

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)

  const addLocationTemplate = () => {
    const newTemplate: LocationTemplate = {
      id: crypto.randomUUID(),
      location: '',
      isDefault: false,
      costs: {},
    }
    setLocationTemplates([...locationTemplates, newTemplate])
    setEditingTemplate(newTemplate.id)
  }

  const removeLocationTemplate = (id: string) => {
    setLocationTemplates(locationTemplates.filter((t) => t.id !== id))
  }

  const updateLocationTemplate = (id: string, updates: Partial<LocationTemplate>) => {
    setLocationTemplates(
      locationTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }

  const setDefaultTemplate = (id: string) => {
    setLocationTemplates(
      locationTemplates.map((t) => ({
        ...t,
        isDefault: t.id === id,
      }))
    )
  }

  const duplicateTemplate = (template: LocationTemplate) => {
    const newTemplate: LocationTemplate = {
      ...template,
      id: crypto.randomUUID(),
      location: `${template.location} (Copy)`,
      isDefault: false,
    }
    setLocationTemplates([...locationTemplates, newTemplate])
  }

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

        {/* Dimension Thresholds */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Dimension Thresholds
            </CardTitle>
            <CardDescription>
              Configure legal limits for oversize/overweight detection. Equipment exceeding these thresholds will be flagged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="lengthThreshold" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Length (inches)
                </Label>
                <Input
                  id="lengthThreshold"
                  type="number"
                  min="0"
                  value={lengthThreshold}
                  onChange={(e) => setLengthThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(lengthThreshold / 12)}'-{lengthThreshold % 12}" ({(lengthThreshold * 2.54 / 100).toFixed(1)}m)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="widthThreshold" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Width (inches)
                </Label>
                <Input
                  id="widthThreshold"
                  type="number"
                  min="0"
                  value={widthThreshold}
                  onChange={(e) => setWidthThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(widthThreshold / 12)}'-{widthThreshold % 12}" ({(widthThreshold * 2.54 / 100).toFixed(1)}m)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heightThreshold" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Height (inches)
                </Label>
                <Input
                  id="heightThreshold"
                  type="number"
                  min="0"
                  value={heightThreshold}
                  onChange={(e) => setHeightThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(heightThreshold / 12)}'-{heightThreshold % 12}" ({(heightThreshold * 2.54 / 100).toFixed(1)}m)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightThreshold" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Max Weight (lbs)
                </Label>
                <Input
                  id="weightThreshold"
                  type="number"
                  min="0"
                  value={weightThreshold}
                  onChange={(e) => setWeightThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {(weightThreshold / 2000).toFixed(1)} tons ({(weightThreshold * 0.453592 / 1000).toFixed(1)} tonnes)
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> These thresholds are used to detect oversized and overweight equipment that may require special permits for transport.
                Standard legal limits are typically 53' length, 8.5' width, 13.5' height, and 48,000 lbs for single-axle trailers.
              </p>
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

        {/* Location Templates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Location Templates
            </CardTitle>
            <CardDescription>
              Pre-configured cost templates for each location. When creating a quote, selecting a location will auto-fill these default costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      value={template.location}
                      onChange={(e) =>
                        updateLocationTemplate(template.id, { location: e.target.value })
                      }
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium"
                    >
                      <option value="">Select location...</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    {template.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultTemplate(template.id)}
                        className="text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateTemplate(template)}
                      title="Duplicate template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLocationTemplate(template.id)}
                      className="text-destructive"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {COST_FIELDS.slice(0, 6).map((field) => (
                    <div key={field.id} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={template.costs[field.id] || ''}
                          onChange={(e) =>
                            updateLocationTemplate(template.id, {
                              costs: {
                                ...template.costs,
                                [field.id]: Number(e.target.value),
                              },
                            })
                          }
                          className="pl-6 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addLocationTemplate} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Location Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
