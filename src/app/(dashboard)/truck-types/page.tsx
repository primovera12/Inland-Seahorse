'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import {
  Truck,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  RotateCcw,
  Ruler,
  Weight,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  TRUCK_CATEGORIES,
  TRUCK_CATEGORY_LABELS,
  LOADING_METHODS,
  LOADING_METHOD_LABELS,
  type TruckCategory,
  type LoadingMethod,
  type TruckTypeListItem,
  type TruckTypeRecord,
} from '@/types/truck-types'

// Quick filter presets
const QUICK_FILTERS = [
  { label: 'Low Deck (<3ft)', filter: { maxDeckHeight: 3 } },
  { label: 'Heavy Haul (>60k lbs)', filter: { minWeight: 60000 } },
  { label: 'Drive-On', filter: { loadingMethod: 'drive-on' as LoadingMethod } },
  { label: 'Crane Loading', filter: { loadingMethod: 'crane' as LoadingMethod } },
  { label: 'Long (>53ft)', filter: { minLength: 53 } },
  { label: 'Extra Wide (>8.5ft)', filter: { minWidth: 9 } },
] as const

// Format number with commas
function formatNumber(num: number): string {
  return num.toLocaleString()
}

export default function TruckTypesPage() {
  const utils = trpc.useUtils()

  // State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TruckCategory | 'all'>('all')
  const [loadingMethodFilter, setLoadingMethodFilter] = useState<LoadingMethod | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<TruckTypeRecord | null>(null)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)

  // Range filters
  const [minDeckLength, setMinDeckLength] = useState<number | ''>('')
  const [maxDeckLength, setMaxDeckLength] = useState<number | ''>('')
  const [minDeckHeight, setMinDeckHeight] = useState<number | ''>('')
  const [maxDeckHeight, setMaxDeckHeight] = useState<number | ''>('')
  const [minWeight, setMinWeight] = useState<number | ''>('')
  const [maxWeight, setMaxWeight] = useState<number | ''>('')
  const [minWidth, setMinWidth] = useState<number | ''>('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'FLATBED' as TruckCategory,
    description: '',
    deckHeightFt: 5,
    deckLengthFt: 48,
    deckWidthFt: 8.5,
    wellLengthFt: '',
    wellHeightFt: '',
    maxCargoWeightLbs: 48000,
    tareWeightLbs: '',
    maxLegalCargoHeightFt: '',
    maxLegalCargoWidthFt: '',
    features: '',
    bestFor: '',
    loadingMethod: '' as LoadingMethod | '',
    isActive: true,
    sortOrder: 0,
  })

  // Queries
  const { data: truckTypesData, isLoading } = trpc.truckTypes.getAll.useQuery({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    includeInactive: showInactive,
    search: search || undefined,
  })

  const { data: categoryCounts } = trpc.truckTypes.getCategoryCounts.useQuery()

  // Mutations
  const createTruckType = trpc.truckTypes.create.useMutation({
    onSuccess: () => {
      toast.success('Truck type created')
      setDialogOpen(false)
      resetForm()
      utils.truckTypes.getAll.invalidate()
      utils.truckTypes.getCategoryCounts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateTruckType = trpc.truckTypes.update.useMutation({
    onSuccess: () => {
      toast.success('Truck type updated')
      setDialogOpen(false)
      setEditingTruck(null)
      resetForm()
      utils.truckTypes.getAll.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteTruckType = trpc.truckTypes.delete.useMutation({
    onSuccess: () => {
      toast.success('Truck type deactivated')
      utils.truckTypes.getAll.invalidate()
      utils.truckTypes.getCategoryCounts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const restoreTruckType = trpc.truckTypes.restore.useMutation({
    onSuccess: () => {
      toast.success('Truck type restored')
      utils.truckTypes.getAll.invalidate()
      utils.truckTypes.getCategoryCounts.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Helpers
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'FLATBED',
      description: '',
      deckHeightFt: 5,
      deckLengthFt: 48,
      deckWidthFt: 8.5,
      wellLengthFt: '',
      wellHeightFt: '',
      maxCargoWeightLbs: 48000,
      tareWeightLbs: '',
      maxLegalCargoHeightFt: '',
      maxLegalCargoWidthFt: '',
      features: '',
      bestFor: '',
      loadingMethod: '',
      isActive: true,
      sortOrder: 0,
    })
  }

  const openCreateDialog = () => {
    setEditingTruck(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = async (truck: TruckTypeListItem) => {
    // Fetch full record
    const fullTruck = await utils.truckTypes.getById.fetch({ id: truck.id })
    setEditingTruck(fullTruck)
    setFormData({
      name: fullTruck.name,
      category: fullTruck.category,
      description: fullTruck.description || '',
      deckHeightFt: fullTruck.deckHeightFt,
      deckLengthFt: fullTruck.deckLengthFt,
      deckWidthFt: fullTruck.deckWidthFt,
      wellLengthFt: fullTruck.wellLengthFt?.toString() || '',
      wellHeightFt: fullTruck.wellHeightFt?.toString() || '',
      maxCargoWeightLbs: fullTruck.maxCargoWeightLbs,
      tareWeightLbs: fullTruck.tareWeightLbs?.toString() || '',
      maxLegalCargoHeightFt: fullTruck.maxLegalCargoHeightFt?.toString() || '',
      maxLegalCargoWidthFt: fullTruck.maxLegalCargoWidthFt?.toString() || '',
      features: fullTruck.features.join('\n'),
      bestFor: fullTruck.bestFor.join('\n'),
      loadingMethod: fullTruck.loadingMethod || '',
      isActive: fullTruck.isActive,
      sortOrder: fullTruck.sortOrder,
    })
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      deckHeightFt: formData.deckHeightFt,
      deckLengthFt: formData.deckLengthFt,
      deckWidthFt: formData.deckWidthFt,
      wellLengthFt: formData.wellLengthFt ? parseFloat(formData.wellLengthFt) : undefined,
      wellHeightFt: formData.wellHeightFt ? parseFloat(formData.wellHeightFt) : undefined,
      maxCargoWeightLbs: formData.maxCargoWeightLbs,
      tareWeightLbs: formData.tareWeightLbs ? parseInt(formData.tareWeightLbs) : undefined,
      maxLegalCargoHeightFt: formData.maxLegalCargoHeightFt ? parseFloat(formData.maxLegalCargoHeightFt) : undefined,
      maxLegalCargoWidthFt: formData.maxLegalCargoWidthFt ? parseFloat(formData.maxLegalCargoWidthFt) : undefined,
      features: formData.features ? formData.features.split('\n').filter(Boolean) : undefined,
      bestFor: formData.bestFor ? formData.bestFor.split('\n').filter(Boolean) : undefined,
      loadingMethod: formData.loadingMethod as LoadingMethod || undefined,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
    }

    if (editingTruck) {
      updateTruckType.mutate({ id: editingTruck.id, ...data })
    } else {
      createTruckType.mutate(data)
    }
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      categoryFilter !== 'all' ||
      loadingMethodFilter !== 'all' ||
      minDeckLength !== '' ||
      maxDeckLength !== '' ||
      minDeckHeight !== '' ||
      maxDeckHeight !== '' ||
      minWeight !== '' ||
      maxWeight !== '' ||
      minWidth !== '' ||
      search !== ''
    )
  }, [categoryFilter, loadingMethodFilter, minDeckLength, maxDeckLength, minDeckHeight, maxDeckHeight, minWeight, maxWeight, minWidth, search])

  // Clear all filters
  const clearAllFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setLoadingMethodFilter('all')
    setMinDeckLength('')
    setMaxDeckLength('')
    setMinDeckHeight('')
    setMaxDeckHeight('')
    setMinWeight('')
    setMaxWeight('')
    setMinWidth('')
  }

  // Apply quick filter
  const applyQuickFilter = (filter: typeof QUICK_FILTERS[number]['filter']) => {
    if ('maxDeckHeight' in filter) setMaxDeckHeight(filter.maxDeckHeight)
    if ('minWeight' in filter) setMinWeight(filter.minWeight)
    if ('loadingMethod' in filter) setLoadingMethodFilter(filter.loadingMethod)
    if ('minLength' in filter) setMinDeckLength(filter.minLength)
    if ('minWidth' in filter) setMinWidth(filter.minWidth)
  }

  // Apply client-side filters
  const filteredTrucks = useMemo(() => {
    if (!truckTypesData?.data) return []

    return truckTypesData.data.filter((truck) => {
      // Loading method filter
      if (loadingMethodFilter !== 'all' && truck.loadingMethod !== loadingMethodFilter) {
        return false
      }

      // Deck length filters
      if (minDeckLength !== '' && truck.deckLengthFt < minDeckLength) {
        return false
      }
      if (maxDeckLength !== '' && truck.deckLengthFt > maxDeckLength) {
        return false
      }

      // Deck height filters
      if (minDeckHeight !== '' && truck.deckHeightFt < minDeckHeight) {
        return false
      }
      if (maxDeckHeight !== '' && truck.deckHeightFt > maxDeckHeight) {
        return false
      }

      // Weight filters
      if (minWeight !== '' && truck.maxCargoWeightLbs < minWeight) {
        return false
      }
      if (maxWeight !== '' && truck.maxCargoWeightLbs > maxWeight) {
        return false
      }

      // Width filter
      if (minWidth !== '' && truck.deckWidthFt < minWidth) {
        return false
      }

      return true
    })
  }, [truckTypesData, loadingMethodFilter, minDeckLength, maxDeckLength, minDeckHeight, maxDeckHeight, minWeight, maxWeight, minWidth])

  // Group trucks by category for display
  const groupedTrucks = useMemo(() => {
    const grouped: Record<string, TruckTypeListItem[]> = {}
    for (const truck of filteredTrucks) {
      if (!grouped[truck.category]) {
        grouped[truck.category] = []
      }
      grouped[truck.category].push(truck)
    }
    return grouped
  }, [filteredTrucks])

  const totalCount = truckTypesData?.total || 0
  const filteredCount = filteredTrucks.length

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Truck Types
          </h1>
          <p className="text-muted-foreground">
            Manage truck/trailer configurations for Load Planner AI recommendations
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Truck Type
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setCategoryFilter('all')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Types</div>
          </CardContent>
        </Card>
        {Object.entries(categoryCounts || {}).slice(0, 5).map(([category, count]) => (
          <Card
            key={category}
            className={`cursor-pointer hover:bg-muted/50 ${categoryFilter === category ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setCategoryFilter(category as TruckCategory)}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground truncate">
                {TRUCK_CATEGORY_LABELS[category as TruckCategory] || category}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Quick filters:</span>
        {QUICK_FILTERS.map((qf) => (
          <Badge
            key={qf.label}
            variant="outline"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => applyQuickFilter(qf.filter)}
          >
            {qf.label}
          </Badge>
        ))}
        {hasActiveFilters && (
          <Badge
            variant="destructive"
            className="cursor-pointer"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Primary Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search truck types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as TruckCategory | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TRUCK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {TRUCK_CATEGORY_LABELS[cat]} {categoryCounts?.[cat] ? `(${categoryCounts[cat]})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={loadingMethodFilter}
              onValueChange={(v) => setLoadingMethodFilter(v as LoadingMethod | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loading Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loading Methods</SelectItem>
                {LOADING_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {LOADING_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
                id="show-inactive"
              />
              <Label htmlFor="show-inactive" className="text-sm whitespace-nowrap">
                Show Inactive
              </Label>
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Advanced Filters
                {advancedFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Deck Length */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Deck Length (ft)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minDeckLength}
                      onChange={(e) => setMinDeckLength(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxDeckLength}
                      onChange={(e) => setMaxDeckLength(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Deck Height */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Deck Height (ft)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      step="0.5"
                      value={minDeckHeight}
                      onChange={(e) => setMinDeckHeight(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      step="0.5"
                      value={maxDeckHeight}
                      onChange={(e) => setMaxDeckHeight(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Max Cargo Weight */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Weight className="h-4 w-4" />
                    Max Cargo Weight (lbs)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      step="1000"
                      value={minWeight}
                      onChange={(e) => setMinWeight(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      step="1000"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Deck Width */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Min Deck Width (ft)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 8.5"
                    step="0.5"
                    value={minWidth}
                    onChange={(e) => setMinWidth(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-24"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground self-center">Active:</span>
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Category: {TRUCK_CATEGORY_LABELS[categoryFilter]}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
                </Badge>
              )}
              {loadingMethodFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Loading: {LOADING_METHOD_LABELS[loadingMethodFilter]}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setLoadingMethodFilter('all')} />
                </Badge>
              )}
              {minDeckLength !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Length ≥ {minDeckLength}ft
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinDeckLength('')} />
                </Badge>
              )}
              {maxDeckLength !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Length ≤ {maxDeckLength}ft
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxDeckLength('')} />
                </Badge>
              )}
              {minDeckHeight !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Height ≥ {minDeckHeight}ft
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinDeckHeight('')} />
                </Badge>
              )}
              {maxDeckHeight !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Height ≤ {maxDeckHeight}ft
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxDeckHeight('')} />
                </Badge>
              )}
              {minWeight !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Weight ≥ {formatNumber(minWeight)} lbs
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinWeight('')} />
                </Badge>
              )}
              {maxWeight !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Weight ≤ {formatNumber(maxWeight)} lbs
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxWeight('')} />
                </Badge>
              )}
              {minWidth !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Width ≥ {minWidth}ft
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinWidth('')} />
                </Badge>
              )}
              {search !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{search}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch('')} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} truck types
        </div>
      )}

      {/* Truck Types Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading truck types...</p>
          </CardContent>
        </Card>
      ) : !filteredTrucks.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No truck types match your filters' : 'No truck types found'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            ) : (
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Truck Type
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Deck (L×W×H)</TableHead>
                  <TableHead className="text-center">Max Weight</TableHead>
                  <TableHead className="text-center">Max Legal Height</TableHead>
                  <TableHead className="text-center">Loading</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => (
                  <TableRow key={truck.id} className={!truck.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{truck.name}</p>
                        {truck.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {truck.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TRUCK_CATEGORY_LABELS[truck.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        {truck.deckLengthFt}' × {truck.deckWidthFt}' × {truck.deckHeightFt}'
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Weight className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(truck.maxCargoWeightLbs)} lbs
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {truck.maxLegalCargoHeightFt ? (
                        <span className="text-sm">{truck.maxLegalCargoHeightFt}'</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {truck.loadingMethod ? (
                        <Badge variant="secondary" className="text-xs">
                          {LOADING_METHOD_LABELS[truck.loadingMethod]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {truck.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(truck)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {truck.isActive ? (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Deactivate this truck type?')) {
                                  deleteTruckType.mutate({ id: truck.id })
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => restoreTruckType.mutate({ id: truck.id })}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTruck ? 'Edit Truck Type' : 'Add Truck Type'}
            </DialogTitle>
            <DialogDescription>
              Configure truck/trailer specifications for Load Planner recommendations
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Flatbed 48'"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as TruckCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUCK_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {TRUCK_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe when to use this truck type..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loadingMethod">Loading Method</Label>
                  <Select
                    value={formData.loadingMethod}
                    onValueChange={(v) => setFormData({ ...formData, loadingMethod: v as LoadingMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LOADING_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {LOADING_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  id="isActive"
                />
                <Label htmlFor="isActive">Active (available for Load Planner)</Label>
              </div>
            </TabsContent>

            <TabsContent value="dimensions" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deckLengthFt">Deck Length (ft) *</Label>
                  <Input
                    id="deckLengthFt"
                    type="number"
                    step="0.5"
                    value={formData.deckLengthFt}
                    onChange={(e) => setFormData({ ...formData, deckLengthFt: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deckWidthFt">Deck Width (ft) *</Label>
                  <Input
                    id="deckWidthFt"
                    type="number"
                    step="0.5"
                    value={formData.deckWidthFt}
                    onChange={(e) => setFormData({ ...formData, deckWidthFt: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deckHeightFt">Deck Height (ft) *</Label>
                  <Input
                    id="deckHeightFt"
                    type="number"
                    step="0.5"
                    value={formData.deckHeightFt}
                    onChange={(e) => setFormData({ ...formData, deckHeightFt: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Height from ground to deck</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wellLengthFt">Well Length (ft)</Label>
                  <Input
                    id="wellLengthFt"
                    type="number"
                    step="0.5"
                    placeholder="For step deck/RGN/lowboy"
                    value={formData.wellLengthFt}
                    onChange={(e) => setFormData({ ...formData, wellLengthFt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wellHeightFt">Well Height (ft)</Label>
                  <Input
                    id="wellHeightFt"
                    type="number"
                    step="0.5"
                    placeholder="Height in well section"
                    value={formData.wellHeightFt}
                    onChange={(e) => setFormData({ ...formData, wellHeightFt: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxCargoWeightLbs">Max Cargo Weight (lbs) *</Label>
                  <Input
                    id="maxCargoWeightLbs"
                    type="number"
                    value={formData.maxCargoWeightLbs}
                    onChange={(e) => setFormData({ ...formData, maxCargoWeightLbs: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tareWeightLbs">Tare Weight (lbs)</Label>
                  <Input
                    id="tareWeightLbs"
                    type="number"
                    placeholder="Empty trailer weight"
                    value={formData.tareWeightLbs}
                    onChange={(e) => setFormData({ ...formData, tareWeightLbs: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLegalCargoHeightFt">Max Legal Cargo Height (ft)</Label>
                  <Input
                    id="maxLegalCargoHeightFt"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 8.5"
                    value={formData.maxLegalCargoHeightFt}
                    onChange={(e) => setFormData({ ...formData, maxLegalCargoHeightFt: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">13.5' total - deck height</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLegalCargoWidthFt">Max Legal Cargo Width (ft)</Label>
                  <Input
                    id="maxLegalCargoWidthFt"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 8.5"
                    value={formData.maxLegalCargoWidthFt}
                    onChange={(e) => setFormData({ ...formData, maxLegalCargoWidthFt: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  placeholder="Most economical option&#10;Widely available&#10;Easy loading from sides"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bestFor">Best For (one per line)</Label>
                <Textarea
                  id="bestFor"
                  placeholder="Steel coils and beams&#10;Lumber and building materials&#10;Palletized freight"
                  value={formData.bestFor}
                  onChange={(e) => setFormData({ ...formData, bestFor: e.target.value })}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createTruckType.isPending || updateTruckType.isPending}
            >
              {(createTruckType.isPending || updateTruckType.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTruck ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
