'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc/client'
import {
  formatDimension,
  formatWeight,
  inchesToFtInInput,
  ftInInputToInches,
  parseDimensionToInches,
  parseWeightToLbs,
  type DimensionUnit,
  type WeightUnit,
} from '@/lib/dimensions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Unit options for dimensions and weight
const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'inches', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'meters', label: 'm' },
]

const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
]
import { Search, Package, ChevronRight, ImageIcon, ChevronDown, ChevronUp, Filter, X, Plus, Pencil, Trash2, DollarSign, Ruler, Save, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/ui/image-upload'

interface FilterState {
  hasDimensions: boolean
  hasImage: boolean
  hasPrice: boolean
}

const LOCATIONS = [
  'New Jersey',
  'Savannah',
  'Houston',
  'Chicago',
  'Oakland',
  'Long Beach',
] as const

type LocationName = typeof LOCATIONS[number]

const COST_FIELDS = [
  { key: 'dismantling_loading_cost', label: 'Dismantling & Loading' },
  { key: 'loading_cost', label: 'Loading' },
  { key: 'blocking_bracing_cost', label: 'Blocking & Bracing' },
  { key: 'rigging_cost', label: 'Rigging' },
  { key: 'storage_cost', label: 'Storage' },
  { key: 'transport_cost', label: 'Transport' },
  { key: 'equipment_cost', label: 'Equipment' },
  { key: 'labor_cost', label: 'Labor' },
  { key: 'permit_cost', label: 'Permit' },
  { key: 'escort_cost', label: 'Escort' },
  { key: 'miscellaneous_cost', label: 'Miscellaneous' },
] as const

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({ hasDimensions: false, hasImage: false, hasPrice: false })

  // Dialog states
  const [showAddMakeDialog, setShowAddMakeDialog] = useState(false)
  const [showEditMakeDialog, setShowEditMakeDialog] = useState(false)
  const [showDeleteMakeDialog, setShowDeleteMakeDialog] = useState(false)
  const [showAddModelDialog, setShowAddModelDialog] = useState(false)
  const [editingMake, setEditingMake] = useState<{ id: string; name: string } | null>(null)
  const [newMakeName, setNewMakeName] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [showMigrationTool, setShowMigrationTool] = useState(false)

  const utils = trpc.useUtils()

  // Fetch makes
  const { data: makes, isLoading: makesLoading } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models, isLoading: modelsLoading } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId! },
    { enabled: !!selectedMakeId }
  )

  // Migration preview query
  const { data: migrationPreview, isLoading: migrationLoading, refetch: refetchMigration } = trpc.equipment.previewDimensionMigration.useQuery(
    undefined,
    { enabled: showMigrationTool }
  )

  // Migration mutation
  const applyMigrationMutation = trpc.equipment.applyDimensionMigration.useMutation({
    onSuccess: (data) => {
      toast.success(`Migration complete! Updated ${data.updatedCount} records.`)
      refetchMigration()
      utils.equipment.getDimensions.invalidate()
    },
    onError: (error) => {
      toast.error('Migration failed: ' + error.message)
    },
  })

  // Mutations
  const createMakeMutation = trpc.equipment.createMake.useMutation({
    onSuccess: () => {
      utils.equipment.getMakes.invalidate()
      setShowAddMakeDialog(false)
      setNewMakeName('')
      toast.success('Make created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create make: ' + error.message)
    },
  })

  const updateMakeMutation = trpc.equipment.updateMake.useMutation({
    onSuccess: () => {
      utils.equipment.getMakes.invalidate()
      setShowEditMakeDialog(false)
      setEditingMake(null)
      toast.success('Make updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update make: ' + error.message)
    },
  })

  const deleteMakeMutation = trpc.equipment.deleteMake.useMutation({
    onSuccess: () => {
      utils.equipment.getMakes.invalidate()
      setShowDeleteMakeDialog(false)
      setEditingMake(null)
      if (selectedMakeId === editingMake?.id) {
        setSelectedMakeId(null)
      }
      toast.success('Make deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete make: ' + error.message)
    },
  })

  const createModelMutation = trpc.equipment.createModel.useMutation({
    onSuccess: () => {
      utils.equipment.getModels.invalidate({ makeId: selectedMakeId! })
      setShowAddModelDialog(false)
      setNewModelName('')
      toast.success('Model created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create model: ' + error.message)
    },
  })

  // Filter makes by search
  const filteredMakes = makes?.filter((make) =>
    make.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedMake = makes?.find((m) => m.id === selectedMakeId)

  // Filter models by search query
  const searchFilteredModels = useMemo(() => {
    if (!models) return []
    if (!modelSearchQuery) return models
    return models.filter((model) =>
      model.name.toLowerCase().includes(modelSearchQuery.toLowerCase())
    )
  }, [models, modelSearchQuery])

  const clearFilters = () => {
    setFilters({ hasDimensions: false, hasImage: false, hasPrice: false })
    setModelSearchQuery('')
  }

  const hasActiveFilters = filters.hasDimensions || filters.hasImage || filters.hasPrice || modelSearchQuery.length > 0

  const handleAddMake = () => {
    if (newMakeName.trim()) {
      createMakeMutation.mutate({ name: newMakeName.trim() })
    }
  }

  const handleEditMake = () => {
    if (editingMake && editingMake.name.trim()) {
      updateMakeMutation.mutate({ id: editingMake.id, name: editingMake.name.trim() })
    }
  }

  const handleDeleteMake = () => {
    if (editingMake) {
      deleteMakeMutation.mutate({ id: editingMake.id })
    }
  }

  const handleAddModel = () => {
    if (selectedMakeId && newModelName.trim()) {
      createModelMutation.mutate({ makeId: selectedMakeId, name: newModelName.trim() })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage equipment makes, models, dimensions, and rates</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Makes List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Makes
                </CardTitle>
                <CardDescription>{makes?.length || 0} makes total</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddMakeDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search makes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {makesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredMakes?.map((make) => (
                  <div
                    key={make.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedMakeId === make.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <button
                      className="flex-1 text-left font-medium"
                      onClick={() => setSelectedMakeId(make.id)}
                    >
                      {make.name}
                    </button>
                    <div className={`flex items-center gap-1 ${selectedMakeId === make.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingMake({ id: make.id, name: make.name })
                          setShowEditMakeDialog(true)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingMake({ id: make.id, name: make.name })
                          setShowDeleteMakeDialog(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Models List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedMake ? `${selectedMake.name} Models` : 'Select a Make'}
                </CardTitle>
                <CardDescription>
                  {selectedMake
                    ? `${searchFilteredModels?.length || 0} models`
                    : 'Select a make to view its models'}
                </CardDescription>
              </div>
              {selectedMakeId && (
                <Button size="sm" onClick={() => setShowAddModelDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Model
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMakeId && (
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>

                  {/* Search within models */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search models..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>

                  {/* Filter checkboxes */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-dimensions"
                        checked={filters.hasDimensions}
                        onCheckedChange={(checked) => setFilters(f => ({ ...f, hasDimensions: checked === true }))}
                      />
                      <label htmlFor="filter-dimensions" className="text-sm cursor-pointer">
                        Has Dimensions
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-image"
                        checked={filters.hasImage}
                        onCheckedChange={(checked) => setFilters(f => ({ ...f, hasImage: checked === true }))}
                      />
                      <label htmlFor="filter-image" className="text-sm cursor-pointer">
                        Has Image
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="filter-price"
                        checked={filters.hasPrice}
                        onCheckedChange={(checked) => setFilters(f => ({ ...f, hasPrice: checked === true }))}
                      />
                      <label htmlFor="filter-price" className="text-sm cursor-pointer">
                        Has Price
                      </label>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Active filters display */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    {modelSearchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: "{modelSearchQuery}"
                        <button onClick={() => setModelSearchQuery('')}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.hasDimensions && (
                      <Badge variant="secondary" className="gap-1">
                        Has Dimensions
                        <button onClick={() => setFilters(f => ({ ...f, hasDimensions: false }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.hasImage && (
                      <Badge variant="secondary" className="gap-1">
                        Has Image
                        <button onClick={() => setFilters(f => ({ ...f, hasImage: false }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.hasPrice && (
                      <Badge variant="secondary" className="gap-1">
                        Has Price
                        <button onClick={() => setFilters(f => ({ ...f, hasPrice: false }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}

            {!selectedMakeId ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a make from the list to view models</p>
              </div>
            ) : modelsLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading models...</div>
            ) : searchFilteredModels?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No models found{modelSearchQuery ? ' matching your search' : ''}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Length</TableHead>
                      <TableHead>Width</TableHead>
                      <TableHead>Height</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead className="text-center">Images</TableHead>
                      <TableHead className="text-center">Rates</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchFilteredModels?.map((model) => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        makeId={selectedMakeId!}
                        filters={filters}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dimension Migration Tool */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowMigrationTool(!showMigrationTool)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-5 w-5" />
                Dimension Migration Tool
              </CardTitle>
              <CardDescription>Convert dimensions that may have been entered in ft-in format</CardDescription>
            </div>
            {showMigrationTool ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showMigrationTool && (
          <CardContent className="space-y-4">
            {migrationLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing dimensions...
              </div>
            ) : migrationPreview ? (
              <>
                <div className="flex items-center gap-4 text-sm">
                  <span>Total dimensions: <strong>{migrationPreview.totalDimensions}</strong></span>
                  <span>Needs conversion: <strong>{migrationPreview.needsConversion}</strong></span>
                </div>
                {migrationPreview.needsConversion > 0 ? (
                  <>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Make</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Changes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {migrationPreview.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.make_name}</TableCell>
                              <TableCell>{item.model_name}</TableCell>
                              <TableCell className="text-xs font-mono">
                                {item.changes.map((change, i) => (
                                  <div key={i}>{change}</div>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => applyMigrationMutation.mutate()}
                        disabled={applyMigrationMutation.isPending}
                      >
                        {applyMigrationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Apply Migration ({migrationPreview.needsConversion} records)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    All dimensions look correct. No conversion needed.
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        )}
      </Card>

      {/* Add Make Dialog */}
      <Dialog open={showAddMakeDialog} onOpenChange={setShowAddMakeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Make</DialogTitle>
            <DialogDescription>
              Enter the name of the equipment manufacturer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="make-name">Make Name</Label>
            <Input
              id="make-name"
              value={newMakeName}
              onChange={(e) => setNewMakeName(e.target.value)}
              placeholder="e.g., Caterpillar"
              onKeyDown={(e) => e.key === 'Enter' && handleAddMake()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMakeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMake} disabled={createMakeMutation.isPending || !newMakeName.trim()}>
              {createMakeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Make Dialog */}
      <Dialog open={showEditMakeDialog} onOpenChange={setShowEditMakeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Make</DialogTitle>
            <DialogDescription>
              Update the make name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-make-name">Make Name</Label>
            <Input
              id="edit-make-name"
              value={editingMake?.name || ''}
              onChange={(e) => setEditingMake(prev => prev ? { ...prev, name: e.target.value } : null)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditMake()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMakeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMake} disabled={updateMakeMutation.isPending || !editingMake?.name.trim()}>
              {updateMakeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Make Dialog */}
      <AlertDialog open={showDeleteMakeDialog} onOpenChange={setShowDeleteMakeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Make</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingMake?.name}"? This will also delete all associated models, dimensions, and rates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMake}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMakeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Model Dialog */}
      <Dialog open={showAddModelDialog} onOpenChange={setShowAddModelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Model</DialogTitle>
            <DialogDescription>
              Enter the model name for {selectedMake?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="model-name">Model Name</Label>
            <Input
              id="model-name"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="e.g., 320D"
              onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddModel} disabled={createModelMutation.isPending || !newModelName.trim()}>
              {createModelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModelRow({ model, makeId, filters }: { model: { id: string; name: string }; makeId: string; filters: FilterState }) {
  const [expanded, setExpanded] = useState(false)
  const [showEditModelDialog, setShowEditModelDialog] = useState(false)
  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false)
  const [editingModelName, setEditingModelName] = useState(model.name)
  const [activeTab, setActiveTab] = useState<'dimensions' | 'rates'>('dimensions')

  const utils = trpc.useUtils()

  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: model.id },
    { enabled: !!model.id }
  )

  const { data: allRates } = trpc.equipment.getAllRatesForModel.useQuery(
    { modelId: model.id },
    { enabled: !!model.id }
  )

  const updateImagesMutation = trpc.equipment.updateImages.useMutation({
    onSuccess: () => {
      utils.equipment.getDimensions.invalidate({ modelId: model.id })
      toast.success('Image updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update image: ' + error.message)
    },
  })

  const updateModelMutation = trpc.equipment.updateModel.useMutation({
    onSuccess: () => {
      utils.equipment.getModels.invalidate({ makeId })
      setShowEditModelDialog(false)
      toast.success('Model updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update model: ' + error.message)
    },
  })

  const deleteModelMutation = trpc.equipment.deleteModel.useMutation({
    onSuccess: () => {
      utils.equipment.getModels.invalidate({ makeId })
      setShowDeleteModelDialog(false)
      toast.success('Model deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete model: ' + error.message)
    },
  })

  const hasImages = dimensions?.front_image_url || dimensions?.side_image_url
  const imageCount = [dimensions?.front_image_url, dimensions?.side_image_url].filter(Boolean).length

  const hasDimensions = dimensions && (
    dimensions.length_inches > 0 ||
    dimensions.width_inches > 0 ||
    dimensions.height_inches > 0 ||
    dimensions.weight_lbs > 0
  )

  const ratesCount = allRates?.length || 0

  // Apply filters (AND logic - must match all selected filters)
  if (filters.hasDimensions && !hasDimensions) return null
  if (filters.hasImage && !hasImages) return null
  if (filters.hasPrice && ratesCount === 0) return null

  const handleFrontImageChange = (url: string | null) => {
    updateImagesMutation.mutate({ modelId: model.id, frontImageUrl: url })
  }

  const handleSideImageChange = (url: string | null) => {
    updateImagesMutation.mutate({ modelId: model.id, sideImageUrl: url })
  }

  const handleUpdateModel = () => {
    if (editingModelName.trim()) {
      updateModelMutation.mutate({ id: model.id, name: editingModelName.trim() })
    }
  }

  const handleDeleteModel = () => {
    deleteModelMutation.mutate({ id: model.id })
  }

  return (
    <>
      <TableRow className={expanded ? 'border-b-0' : ''}>
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{model.name}</TableCell>
        <TableCell className="font-mono">
          {dimensions && dimensions.length_inches > 0 ? formatDimension(dimensions.length_inches) : '-'}
        </TableCell>
        <TableCell className="font-mono">
          {dimensions && dimensions.width_inches > 0 ? formatDimension(dimensions.width_inches) : '-'}
        </TableCell>
        <TableCell className="font-mono">
          {dimensions && dimensions.height_inches > 0 ? formatDimension(dimensions.height_inches) : '-'}
        </TableCell>
        <TableCell className="font-mono">
          {dimensions && dimensions.weight_lbs > 0 ? formatWeight(dimensions.weight_lbs) : '-'}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <ImageIcon className={`h-4 w-4 ${hasImages ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">{imageCount}/2</span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <DollarSign className={`h-4 w-4 ${ratesCount > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">{ratesCount}/6</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setEditingModelName(model.name)
                setShowEditModelDialog(true)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteModelDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30 p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dimensions' | 'rates')}>
              <TabsList className="mb-4">
                <TabsTrigger value="dimensions" className="gap-2">
                  <Ruler className="h-4 w-4" />
                  Dimensions & Images
                </TabsTrigger>
                <TabsTrigger value="rates" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Rates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dimensions" className="mt-0">
                <DimensionsEditor
                  modelId={model.id}
                  dimensions={dimensions}
                  onFrontImageChange={handleFrontImageChange}
                  onSideImageChange={handleSideImageChange}
                />
              </TabsContent>

              <TabsContent value="rates" className="mt-0">
                <RatesEditor
                  modelId={model.id}
                  makeId={makeId}
                  allRates={allRates || []}
                />
              </TabsContent>
            </Tabs>
          </TableCell>
        </TableRow>
      )}

      {/* Edit Model Dialog */}
      <Dialog open={showEditModelDialog} onOpenChange={setShowEditModelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
            <DialogDescription>
              Update the model name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-model-name">Model Name</Label>
            <Input
              id="edit-model-name"
              value={editingModelName}
              onChange={(e) => setEditingModelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateModel()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModel} disabled={updateModelMutation.isPending || !editingModelName.trim()}>
              {updateModelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Model Dialog */}
      <AlertDialog open={showDeleteModelDialog} onOpenChange={setShowDeleteModelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{model.name}"? This will also delete all associated dimensions and rates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DimensionsEditor({
  modelId,
  dimensions,
  onFrontImageChange,
  onSideImageChange,
}: {
  modelId: string
  dimensions: {
    length_inches: number
    width_inches: number
    height_inches: number
    weight_lbs: number
    front_image_url: string | null
    side_image_url: string | null
  } | null | undefined
  onFrontImageChange: (url: string | null) => void
  onSideImageChange: (url: string | null) => void
}) {
  const [lengthInches, setLengthInches] = useState(dimensions?.length_inches || 0)
  const [widthInches, setWidthInches] = useState(dimensions?.width_inches || 0)
  const [heightInches, setHeightInches] = useState(dimensions?.height_inches || 0)
  const [weightLbs, setWeightLbs] = useState(dimensions?.weight_lbs || 0)
  const [hasChanges, setHasChanges] = useState(false)

  // Unit selection state
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('ft-in')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')

  // Local input state (in selected unit)
  const [dimensionInputs, setDimensionInputs] = useState({
    length: inchesToFtInInput(dimensions?.length_inches || 0),
    width: inchesToFtInInput(dimensions?.width_inches || 0),
    height: inchesToFtInInput(dimensions?.height_inches || 0),
  })
  const [weightInput, setWeightInput] = useState(String(dimensions?.weight_lbs || ''))

  const utils = trpc.useUtils()

  const upsertDimensionsMutation = trpc.equipment.upsertDimensions.useMutation({
    onSuccess: () => {
      utils.equipment.getDimensions.invalidate({ modelId })
      setHasChanges(false)
      toast.success('Dimensions saved successfully')
    },
    onError: (error) => {
      toast.error('Failed to save dimensions: ' + error.message)
    },
  })

  const handleSave = () => {
    upsertDimensionsMutation.mutate({
      modelId,
      length_inches: lengthInches,
      width_inches: widthInches,
      height_inches: heightInches,
      weight_lbs: weightLbs,
    })
  }

  // Handle dimension input change
  const handleDimensionInputChange = (field: 'length' | 'width' | 'height', value: string) => {
    setDimensionInputs(prev => ({ ...prev, [field]: value }))
  }

  // Handle dimension blur - parse and convert to inches
  const handleDimensionBlur = (field: 'length' | 'width' | 'height') => {
    const inputValue = dimensionInputs[field]
    const inches = parseDimensionToInches(inputValue, dimensionUnit)

    // Update internal state
    setHasChanges(true)
    switch (field) {
      case 'length': setLengthInches(inches); break
      case 'width': setWidthInches(inches); break
      case 'height': setHeightInches(inches); break
    }

    // Normalize display for ft-in
    if (dimensionUnit === 'ft-in') {
      setDimensionInputs(prev => ({ ...prev, [field]: inchesToFtInInput(inches) }))
    }
  }

  // Handle weight input change
  const handleWeightInputChange = (value: string) => {
    setWeightInput(value)
  }

  // Handle weight blur - parse and convert to lbs
  const handleWeightBlur = () => {
    const lbs = parseWeightToLbs(weightInput, weightUnit)
    setHasChanges(true)
    setWeightLbs(lbs)
  }

  // Handle dimension unit change
  const handleDimensionUnitChange = (newUnit: DimensionUnit) => {
    setDimensionUnit(newUnit)
    if (newUnit === 'ft-in') {
      setDimensionInputs({
        length: inchesToFtInInput(lengthInches),
        width: inchesToFtInInput(widthInches),
        height: inchesToFtInInput(heightInches),
      })
    } else {
      // Clear inputs - user will re-enter in new unit
      setDimensionInputs({ length: '', width: '', height: '' })
    }
  }

  // Handle weight unit change
  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    setWeightUnit(newUnit)
    setWeightInput('')
  }

  return (
    <div className="space-y-6">
      {/* Unit Selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Dimensions:</Label>
          <Select value={dimensionUnit} onValueChange={(v) => handleDimensionUnitChange(v as DimensionUnit)}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSION_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value} className="text-xs">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Weight:</Label>
          <Select value={weightUnit} onValueChange={(v) => handleWeightUnitChange(v as WeightUnit)}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEIGHT_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value} className="text-xs">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dimensions Form */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Length ({dimensionUnit})</Label>
          <Input
            type="text"
            placeholder={dimensionUnit === 'ft-in' ? 'e.g., 30-4' : '0'}
            value={dimensionInputs.length}
            onChange={(e) => handleDimensionInputChange('length', e.target.value)}
            onBlur={() => handleDimensionBlur('length')}
          />
          <p className="text-xs text-muted-foreground">
            {lengthInches > 0 ? formatDimension(lengthInches) : ''}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Width ({dimensionUnit})</Label>
          <Input
            type="text"
            placeholder={dimensionUnit === 'ft-in' ? 'e.g., 10-4' : '0'}
            value={dimensionInputs.width}
            onChange={(e) => handleDimensionInputChange('width', e.target.value)}
            onBlur={() => handleDimensionBlur('width')}
          />
          <p className="text-xs text-muted-foreground">
            {widthInches > 0 ? formatDimension(widthInches) : ''}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Height ({dimensionUnit})</Label>
          <Input
            type="text"
            placeholder={dimensionUnit === 'ft-in' ? 'e.g., 10-10' : '0'}
            value={dimensionInputs.height}
            onChange={(e) => handleDimensionInputChange('height', e.target.value)}
            onBlur={() => handleDimensionBlur('height')}
          />
          <p className="text-xs text-muted-foreground">
            {heightInches > 0 ? formatDimension(heightInches) : ''}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Weight ({weightUnit})</Label>
          <Input
            type="text"
            placeholder="0"
            value={weightInput}
            onChange={(e) => handleWeightInputChange(e.target.value)}
            onBlur={handleWeightBlur}
          />
          <p className="text-xs text-muted-foreground">
            {weightLbs > 0 ? formatWeight(weightLbs) : ''}
          </p>
        </div>
      </div>

      {hasChanges && (
        <Button onClick={handleSave} disabled={upsertDimensionsMutation.isPending}>
          {upsertDimensionsMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Dimensions
        </Button>
      )}

      {/* Images */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Front View</Label>
          <ImageUpload
            value={dimensions?.front_image_url}
            onChange={onFrontImageChange}
            folder={`equipment/${modelId}`}
            label="Upload Front Image"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Side View</Label>
          <ImageUpload
            value={dimensions?.side_image_url}
            onChange={onSideImageChange}
            folder={`equipment/${modelId}`}
            label="Upload Side Image"
          />
        </div>
      </div>
    </div>
  )
}

interface Rate {
  id: string
  location: string
  dismantling_loading_cost: number
  loading_cost: number
  blocking_bracing_cost: number
  rigging_cost: number
  storage_cost: number
  transport_cost: number
  equipment_cost: number
  labor_cost: number
  permit_cost: number
  escort_cost: number
  miscellaneous_cost: number
}

function RatesEditor({
  modelId,
  makeId,
  allRates,
}: {
  modelId: string
  makeId: string
  allRates: Rate[]
}) {
  const [selectedLocation, setSelectedLocation] = useState<LocationName>(LOCATIONS[0])

  return (
    <div className="space-y-4">
      {/* Location tabs */}
      <Tabs value={selectedLocation} onValueChange={(v) => setSelectedLocation(v as LocationName)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {LOCATIONS.map((location) => {
            const hasRate = allRates.some(r => r.location === location)
            return (
              <TabsTrigger key={location} value={location} className="gap-1.5">
                {location}
                {hasRate && (
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {LOCATIONS.map((location) => (
          <TabsContent key={location} value={location} className="mt-4">
            <LocationRateEditor
              modelId={modelId}
              makeId={makeId}
              location={location}
              existingRate={allRates.find(r => r.location === location)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function LocationRateEditor({
  modelId,
  makeId,
  location,
  existingRate,
}: {
  modelId: string
  makeId: string
  location: LocationName
  existingRate: Rate | undefined
}) {
  const [rates, setRates] = useState<Record<string, number>>(() => {
    if (existingRate) {
      return {
        dismantling_loading_cost: existingRate.dismantling_loading_cost,
        loading_cost: existingRate.loading_cost,
        blocking_bracing_cost: existingRate.blocking_bracing_cost,
        rigging_cost: existingRate.rigging_cost,
        storage_cost: existingRate.storage_cost,
        transport_cost: existingRate.transport_cost,
        equipment_cost: existingRate.equipment_cost,
        labor_cost: existingRate.labor_cost,
        permit_cost: existingRate.permit_cost,
        escort_cost: existingRate.escort_cost,
        miscellaneous_cost: existingRate.miscellaneous_cost,
      }
    }
    return COST_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {})
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const utils = trpc.useUtils()

  const upsertRateMutation = trpc.equipment.upsertRate.useMutation({
    onSuccess: () => {
      utils.equipment.getAllRatesForModel.invalidate({ modelId })
      setHasChanges(false)
      toast.success('Rates saved successfully')
    },
    onError: (error) => {
      toast.error('Failed to save rates: ' + error.message)
    },
  })

  const deleteRateMutation = trpc.equipment.deleteRate.useMutation({
    onSuccess: () => {
      utils.equipment.getAllRatesForModel.invalidate({ modelId })
      setShowDeleteDialog(false)
      setRates(COST_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {}))
      toast.success('Rates deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete rates: ' + error.message)
    },
  })

  const handleSave = () => {
    upsertRateMutation.mutate({
      makeId,
      modelId,
      location,
      dismantling_loading_cost: rates.dismantling_loading_cost,
      loading_cost: rates.loading_cost,
      blocking_bracing_cost: rates.blocking_bracing_cost,
      rigging_cost: rates.rigging_cost,
      storage_cost: rates.storage_cost,
      transport_cost: rates.transport_cost,
      equipment_cost: rates.equipment_cost,
      labor_cost: rates.labor_cost,
      permit_cost: rates.permit_cost,
      escort_cost: rates.escort_cost,
      miscellaneous_cost: rates.miscellaneous_cost,
    })
  }

  const handleDelete = () => {
    deleteRateMutation.mutate({ modelId, location })
  }

  const updateRate = (key: string, value: number) => {
    setRates(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // Convert cents to dollars for display
  const centsToDollars = (cents: number) => (cents / 100).toFixed(2)
  const dollarsToCents = (dollars: string) => Math.round(parseFloat(dollars || '0') * 100)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {COST_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm">{field.label}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="pl-7"
                value={centsToDollars(rates[field.key])}
                onChange={(e) => updateRate(field.key, dollarsToCents(e.target.value))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={upsertRateMutation.isPending || !hasChanges}>
          {upsertRateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Rates for {location}
        </Button>

        {existingRate && (
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* Delete Rate Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rates</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rates for {location}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
