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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatDimension, formatWeight } from '@/lib/dimensions'
import { Search, Package, ChevronRight, ImageIcon, ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/ui/image-upload'

type FilterType = 'all' | 'has_dimensions' | 'no_dimensions' | 'has_image' | 'no_image'

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Fetch makes
  const { data: makes, isLoading: makesLoading } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models, isLoading: modelsLoading } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId! },
    { enabled: !!selectedMakeId }
  )

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
    setActiveFilter('all')
    setModelSearchQuery('')
  }

  const hasActiveFilters = activeFilter !== 'all' || modelSearchQuery.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage equipment makes, models, and dimensions</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Makes List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Makes
            </CardTitle>
            <CardDescription>{makes?.length || 0} makes total</CardDescription>
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
                  <button
                    key={make.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedMakeId === make.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMakeId(make.id)}
                  >
                    <span className="font-medium">{make.name}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
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

                  {/* Filter dropdown */}
                  <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      <SelectItem value="has_dimensions">Has Dimensions</SelectItem>
                      <SelectItem value="no_dimensions">No Dimensions</SelectItem>
                      <SelectItem value="has_image">Has Image</SelectItem>
                      <SelectItem value="no_image">No Image</SelectItem>
                    </SelectContent>
                  </Select>

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
                    {activeFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {activeFilter === 'has_dimensions' && 'Has Dimensions'}
                        {activeFilter === 'no_dimensions' && 'No Dimensions'}
                        {activeFilter === 'has_image' && 'Has Image'}
                        {activeFilter === 'no_image' && 'No Image'}
                        <button onClick={() => setActiveFilter('all')}>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchFilteredModels?.map((model) => (
                      <ModelRow key={model.id} model={model} activeFilter={activeFilter} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModelRow({ model, activeFilter }: { model: { id: string; name: string }; activeFilter: FilterType }) {
  const [expanded, setExpanded] = useState(false)
  const utils = trpc.useUtils()

  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
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

  const hasImages = dimensions?.front_image_url || dimensions?.side_image_url
  const imageCount = [dimensions?.front_image_url, dimensions?.side_image_url].filter(Boolean).length

  const hasDimensions = dimensions && (
    dimensions.length_inches > 0 ||
    dimensions.width_inches > 0 ||
    dimensions.height_inches > 0 ||
    dimensions.weight_lbs > 0
  )

  // Apply filter
  if (activeFilter === 'has_dimensions' && !hasDimensions) return null
  if (activeFilter === 'no_dimensions' && hasDimensions) return null
  if (activeFilter === 'has_image' && !hasImages) return null
  if (activeFilter === 'no_image' && hasImages) return null

  const handleFrontImageChange = (url: string | null) => {
    updateImagesMutation.mutate({ modelId: model.id, frontImageUrl: url })
  }

  const handleSideImageChange = (url: string | null) => {
    updateImagesMutation.mutate({ modelId: model.id, sideImageUrl: url })
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
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Front View</Label>
                <ImageUpload
                  value={dimensions?.front_image_url}
                  onChange={handleFrontImageChange}
                  folder={`equipment/${model.id}`}
                  label="Upload Front Image"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Side View</Label>
                <ImageUpload
                  value={dimensions?.side_image_url}
                  onChange={handleSideImageChange}
                  folder={`equipment/${model.id}`}
                  label="Upload Side Image"
                />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
