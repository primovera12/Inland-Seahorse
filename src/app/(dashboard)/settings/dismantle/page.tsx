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
import { Wrench, Save, DollarSign, MapPin, Calculator, Ruler, Scale, FileText, Plus, Trash2, Copy, Star, GripVertical, X, Pencil, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Cost category type
interface CostCategory {
  id: string
  label: string
  description: string
  isSystem: boolean // System categories cannot be deleted
}

// Default system cost fields
const DEFAULT_COST_FIELDS: CostCategory[] = [
  { id: 'dismantling_loading_cost', label: 'Dismantling & Loading', description: 'Labor for dismantling and loading equipment', isSystem: true },
  { id: 'loading_cost', label: 'Loading Only', description: 'Labor for loading pre-dismantled equipment', isSystem: true },
  { id: 'blocking_bracing_cost', label: 'Blocking & Bracing', description: 'Securing equipment for transport', isSystem: true },
  { id: 'processing_cost', label: 'Processing', description: 'Administrative processing fees', isSystem: false },
  { id: 'certification_cost', label: 'Certification', description: 'Equipment certification and documentation', isSystem: false },
  { id: 'equipment_cost', label: 'Equipment', description: 'Special equipment rental', isSystem: false },
  { id: 'labor_cost', label: 'Additional Labor', description: 'Extra labor charges', isSystem: false },
  { id: 'crane_cost', label: 'Crane', description: 'Crane services for heavy lifts', isSystem: false },
  { id: 'rigging_cost', label: 'Rigging', description: 'Rigging and specialized lifting', isSystem: false },
  { id: 'permits_cost', label: 'Permits', description: 'Required permits and licenses', isSystem: false },
  { id: 'escort_cost', label: 'Escort', description: 'Pilot car / escort services', isSystem: false },
  { id: 'misc_cost', label: 'Miscellaneous', description: 'Other miscellaneous costs', isSystem: false },
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
  // Cost categories (dynamic - can be added/removed)
  const [costCategories, setCostCategories] = useState<CostCategory[]>(DEFAULT_COST_FIELDS)

  // Cost category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ label: '', description: '' })

  // Enabled cost fields
  const [enabledCosts, setEnabledCosts] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {}
    DEFAULT_COST_FIELDS.forEach(field => {
      defaults[field.id] = true
    })
    return defaults
  })

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

  const [, setEditingTemplate] = useState<string | null>(null)

  // Popular makes management
  const [localPopularMakes, setLocalPopularMakes] = useState<string[] | null>(null)
  const [newMakeName, setNewMakeName] = useState('')

  // Fetch popular makes from settings
  const { data: savedPopularMakes, isLoading: loadingMakes } = trpc.settings.getPopularMakes.useQuery()

  // Use local state if user has made edits, otherwise use saved data
  const popularMakes: string[] = localPopularMakes ?? (savedPopularMakes as string[] | undefined) ?? []
  const setPopularMakes = (makes: string[]) => setLocalPopularMakes(makes)

  const updatePopularMakesMutation = trpc.settings.updatePopularMakes.useMutation({
    onSuccess: () => {
      toast.success('Popular makes updated')
      setLocalPopularMakes(null) // Reset to use saved data
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })

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

  // Popular makes helpers
  const addPopularMake = () => {
    const trimmed = newMakeName.trim()
    if (trimmed && !popularMakes.includes(trimmed)) {
      const updated = [...popularMakes, trimmed]
      setPopularMakes(updated)
      setNewMakeName('')
      updatePopularMakesMutation.mutate({ makes: updated })
    }
  }

  const removePopularMake = (make: string) => {
    const updated = popularMakes.filter(m => m !== make)
    setPopularMakes(updated)
    updatePopularMakesMutation.mutate({ makes: updated })
  }

  const movePopularMake = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === popularMakes.length - 1)
    ) {
      return
    }
    const updated = [...popularMakes]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setPopularMakes(updated)
    updatePopularMakesMutation.mutate({ makes: updated })
  }

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

  // Cost category management functions
  const openNewCategoryDialog = () => {
    setEditingCategory(null)
    setCategoryForm({ label: '', description: '' })
    setShowCategoryDialog(true)
  }

  const openEditCategoryDialog = (category: CostCategory) => {
    setEditingCategory(category)
    setCategoryForm({ label: category.label, description: category.description })
    setShowCategoryDialog(true)
  }

  const closeCategoryDialog = () => {
    setShowCategoryDialog(false)
    setEditingCategory(null)
    setCategoryForm({ label: '', description: '' })
  }

  const saveCostCategory = () => {
    if (!categoryForm.label.trim()) {
      toast.error('Category name is required')
      return
    }

    if (editingCategory) {
      // Update existing category
      setCostCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategory.id
            ? { ...cat, label: categoryForm.label.trim(), description: categoryForm.description.trim() }
            : cat
        )
      )
      toast.success('Cost category updated')
    } else {
      // Add new category
      const newId = categoryForm.label.toLowerCase().replace(/\s+/g, '_') + '_cost'
      // Check for duplicate IDs
      if (costCategories.some(cat => cat.id === newId)) {
        toast.error('A category with a similar name already exists')
        return
      }
      const newCategory: CostCategory = {
        id: newId,
        label: categoryForm.label.trim(),
        description: categoryForm.description.trim(),
        isSystem: false,
      }
      setCostCategories(prev => [...prev, newCategory])
      // Enable the new category by default
      setEnabledCosts(prev => ({ ...prev, [newId]: true }))
      toast.success('Cost category added')
    }
    closeCategoryDialog()
  }

  const deleteCostCategory = (categoryId: string) => {
    const category = costCategories.find(c => c.id === categoryId)
    if (category?.isSystem) {
      toast.error('System categories cannot be deleted')
      return
    }
    setCostCategories(prev => prev.filter(cat => cat.id !== categoryId))
    // Also remove from enabled costs
    setEnabledCosts(prev => {
      const updated = { ...prev }
      delete updated[categoryId]
      return updated
    })
    // Remove from location templates
    setLocationTemplates(prev =>
      prev.map(template => {
        const updatedCosts = { ...template.costs }
        delete updatedCosts[categoryId]
        return { ...template, costs: updatedCosts }
      })
    )
    toast.success('Cost category removed')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dismantle Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure dismantling quote settings and defaults</p>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto">
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

        {/* Popular Makes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Popular Makes
            </CardTitle>
            <CardDescription>
              Configure which equipment makes appear first in the equipment selector. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new make */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter make name (e.g., Caterpillar)"
                value={newMakeName}
                onChange={(e) => setNewMakeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPopularMake()}
                className="max-w-xs"
              />
              <Button onClick={addPopularMake} disabled={!newMakeName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Make
              </Button>
            </div>

            {/* Makes list */}
            <div className="space-y-2">
              {loadingMakes ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : popularMakes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No popular makes configured</p>
              ) : (
                popularMakes.map((make, index) => (
                  <div
                    key={make}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <span className="flex-1 font-medium">{make}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => movePopularMake(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Move up</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => movePopularMake(index, 'down')}
                        disabled={index === popularMakes.length - 1}
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Move down</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePopularMake(make)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              These makes will appear at the top of the equipment make selector, making it faster to select commonly used manufacturers.
            </p>
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
                  Max Length (ft-in)
                </Label>
                <Input
                  id="lengthThreshold"
                  type="number"
                  min="0"
                  value={lengthThreshold}
                  onChange={(e) => setLengthThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(lengthThreshold / 12)}&apos;-{lengthThreshold % 12}&quot; ({(lengthThreshold * 2.54 / 100).toFixed(1)}m)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="widthThreshold" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Width (ft-in)
                </Label>
                <Input
                  id="widthThreshold"
                  type="number"
                  min="0"
                  value={widthThreshold}
                  onChange={(e) => setWidthThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(widthThreshold / 12)}&apos;-{widthThreshold % 12}&quot; ({(widthThreshold * 2.54 / 100).toFixed(1)}m)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heightThreshold" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Height (ft-in)
                </Label>
                <Input
                  id="heightThreshold"
                  type="number"
                  min="0"
                  value={heightThreshold}
                  onChange={(e) => setHeightThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(heightThreshold / 12)}&apos;-{heightThreshold % 12}&quot; ({(heightThreshold * 2.54 / 100).toFixed(1)}m)
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
                Standard legal limits are typically 53&apos; length, 8.5&apos; width, 13.5&apos; height, and 48,000 lbs for single-axle trailers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Categories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Categories
                </CardTitle>
                <CardDescription>Manage and configure cost categories for quotes</CardDescription>
              </div>
              <Button onClick={openNewCategoryDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {costCategories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border group hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium truncate">{category.label}</Label>
                      {category.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">System</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditCategoryDialog(category)}
                      title="Edit category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!category.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => deleteCostCategory(category.id)}
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Switch
                      checked={enabledCosts[category.id] ?? true}
                      onCheckedChange={() => toggleCostField(category.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              System categories (marked with &quot;System&quot; badge) cannot be deleted but can be disabled. Custom categories can be edited or removed.
            </p>
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
                  {costCategories.filter(c => enabledCosts[c.id]).slice(0, 6).map((field) => (
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

      {/* Cost Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Cost Category' : 'Add Cost Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the cost category details below.'
                : 'Add a new cost category that can be used in quotes.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-label">Category Name</Label>
              <Input
                id="category-label"
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                placeholder="e.g., Storage Fees"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="e.g., Fees for equipment storage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCategoryDialog}>
              Cancel
            </Button>
            <Button onClick={saveCostCategory}>
              {editingCategory ? 'Update Category' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
