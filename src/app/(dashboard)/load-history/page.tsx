'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Truck,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  CheckSquare,
  X,
  Package,
  MapPin,
  ArrowRight,
  DollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  Calendar,
  Building2,
} from 'lucide-react'
import type {
  LoadHistoryStatus,
  EquipmentType,
  LoadHistoryListItem,
} from '@/types/load-history'
import {
  LOAD_STATUS_LABELS,
  LOAD_STATUS_COLORS,
  EQUIPMENT_TYPE_LABELS,
  getMarginColor,
} from '@/types/load-history'

export default function LoadHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<LoadHistoryStatus | 'all'>('all')
  const [originStateFilter, setOriginStateFilter] = useState<string>('')
  const [destinationStateFilter, setDestinationStateFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showNewLoadDialog, setShowNewLoadDialog] = useState(false)
  const pageSize = 25

  // New load form state
  const [newLoadForm, setNewLoadForm] = useState({
    customerName: '',
    customerCompany: '',
    originCity: '',
    originState: '',
    destinationCity: '',
    destinationState: '',
    totalMiles: '',
    cargoDescription: '',
    customerRateCents: '',
    carrierRateCents: '',
    pickupDate: '',
    deliveryDate: '',
    equipmentTypeUsed: '' as EquipmentType | '',
    status: 'completed' as LoadHistoryStatus,
    notes: '',
  })

  // Fetch loads
  const { data, isLoading, error } = trpc.loadHistory.getAll.useQuery({
    filters: {
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      originState: originStateFilter || undefined,
      destinationState: destinationStateFilter || undefined,
    },
    pagination: {
      page,
      pageSize,
      sortBy: 'pickupDate',
      sortOrder: 'desc',
    },
  })

  // Fetch stats
  const { data: stats } = trpc.loadHistory.getStats.useQuery()

  const utils = trpc.useUtils()

  // Mutations
  const createLoad = trpc.loadHistory.create.useMutation({
    onSuccess: () => {
      utils.loadHistory.getAll.invalidate()
      utils.loadHistory.getStats.invalidate()
      toast.success('Load recorded')
      setShowNewLoadDialog(false)
      resetNewLoadForm()
    },
    onError: (error) => {
      toast.error('Failed to record load', { description: error.message })
    },
  })

  const deleteLoad = trpc.loadHistory.delete.useMutation({
    onSuccess: () => {
      utils.loadHistory.getAll.invalidate()
      utils.loadHistory.getStats.invalidate()
      toast.success('Load deleted')
    },
    onError: (error) => {
      toast.error('Failed to delete load', { description: error.message })
    },
  })

  const resetNewLoadForm = () => {
    setNewLoadForm({
      customerName: '',
      customerCompany: '',
      originCity: '',
      originState: '',
      destinationCity: '',
      destinationState: '',
      totalMiles: '',
      cargoDescription: '',
      customerRateCents: '',
      carrierRateCents: '',
      pickupDate: '',
      deliveryDate: '',
      equipmentTypeUsed: '',
      status: 'completed',
      notes: '',
    })
  }

  const handleCreateLoad = () => {
    if (!newLoadForm.originCity || !newLoadForm.originState || !newLoadForm.destinationCity || !newLoadForm.destinationState) {
      toast.error('Origin and destination are required')
      return
    }

    createLoad.mutate({
      customerName: newLoadForm.customerName || undefined,
      customerCompany: newLoadForm.customerCompany || undefined,
      originCity: newLoadForm.originCity,
      originState: newLoadForm.originState,
      destinationCity: newLoadForm.destinationCity,
      destinationState: newLoadForm.destinationState,
      totalMiles: newLoadForm.totalMiles ? parseInt(newLoadForm.totalMiles) : undefined,
      cargoDescription: newLoadForm.cargoDescription || undefined,
      customerRateCents: newLoadForm.customerRateCents ? Math.round(parseFloat(newLoadForm.customerRateCents) * 100) : undefined,
      carrierRateCents: newLoadForm.carrierRateCents ? Math.round(parseFloat(newLoadForm.carrierRateCents) * 100) : undefined,
      pickupDate: newLoadForm.pickupDate || undefined,
      deliveryDate: newLoadForm.deliveryDate || undefined,
      equipmentTypeUsed: newLoadForm.equipmentTypeUsed || undefined,
      status: newLoadForm.status,
      notes: newLoadForm.notes || undefined,
    })
  }

  const loads = data?.data || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  // Selection helpers
  const allSelected = loads.length > 0 && loads.every((l) => selectedIds.has(l.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(loads.map((l) => l.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Are you sure you want to delete ${selectedIds.size} loads? This cannot be undone.`)) {
      const ids = Array.from(selectedIds)
      Promise.all(ids.map((id) => deleteLoad.mutateAsync({ id }))).then(() => {
        setSelectedIds(new Set())
      })
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setOriginStateFilter('')
    setDestinationStateFilter('')
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters =
    statusFilter !== 'all' || originStateFilter || destinationStateFilter || searchQuery

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Load History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track completed loads and analyze profitability
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewLoadDialog(true)} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-2" />
            Record Load
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalLoads}</div>
                  <p className="text-xs text-muted-foreground">Total Loads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenueCents)}</div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalCarrierCostCents)}</div>
                  <p className="text-xs text-muted-foreground">Carrier Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalMarginCents)}</div>
                  <p className="text-xs text-muted-foreground">Total Margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <div className={`text-2xl font-bold ${getMarginColor(stats.averageMarginPercentage)}`}>
                    {stats.averageMarginPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.averageRatePerMileCents)}</div>
                  <p className="text-xs text-muted-foreground">Avg $/Mile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedIds.size} selected</span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={deleteLoad.isPending}
                  className="flex-1 sm:flex-initial"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Delete Selected</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Loads</CardTitle>
          <CardDescription>{total} loads total</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, cargo, quote #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as LoadHistoryStatus | 'all')
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Origin State"
                value={originStateFilter}
                onChange={(e) => {
                  setOriginStateFilter(e.target.value.toUpperCase().slice(0, 2))
                  setPage(1)
                }}
                className="w-full sm:w-[120px]"
                maxLength={2}
              />

              <Input
                placeholder="Dest State"
                value={destinationStateFilter}
                onChange={(e) => {
                  setDestinationStateFilter(e.target.value.toUpperCase().slice(0, 2))
                  setPage(1)
                }}
                className="w-full sm:w-[120px]"
                maxLength={2}
              />

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table/Cards */}
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading loads...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              Error loading loads: {error.message}
            </div>
          ) : loads.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No loads found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowNewLoadDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record your first load
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {loads.map((load) => (
                  <div
                    key={load.id}
                    className={`rounded-lg border p-4 ${selectedIds.has(load.id) ? 'bg-primary/5 border-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(load.id)}
                          onCheckedChange={() => toggleSelect(load.id)}
                          aria-label={`Select load`}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {load.originCity}, {load.originState}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {load.destinationCity}, {load.destinationState}
                            </span>
                            <Badge className={LOAD_STATUS_COLORS[load.status]}>
                              {LOAD_STATUS_LABELS[load.status]}
                            </Badge>
                          </div>
                          {load.customerName && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {load.customerName}
                              {load.customerCompany && ` - ${load.customerCompany}`}
                            </p>
                          )}
                          {load.cargoDescription && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {load.cargoDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <LoadActionsMenu
                        load={load}
                        onDelete={() => deleteLoad.mutate({ id: load.id })}
                        isDeleting={deleteLoad.isPending}
                      />
                    </div>

                    <div className="mt-3 ml-8 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <p className="font-medium">{load.customerRateCents ? formatCurrency(load.customerRateCents) : '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>
                        <p className={`font-medium ${getMarginColor(load.marginPercentage)}`}>
                          {load.marginPercentage !== null ? `${load.marginPercentage.toFixed(1)}%` : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pickup:</span>
                        <p className="font-medium">{load.pickupDate ? formatDate(load.pickupDate) : '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivery:</span>
                        <p className="font-medium">{load.deliveryDate ? formatDate(load.deliveryDate) : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                          className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                        />
                      </TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Carrier</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loads.map((load) => (
                      <TableRow
                        key={load.id}
                        className={selectedIds.has(load.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(load.id)}
                            onCheckedChange={() => toggleSelect(load.id)}
                            aria-label={`Select load`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{load.originCity}, {load.originState}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                            <span>{load.destinationCity}, {load.destinationState}</span>
                          </div>
                          {load.totalMiles && (
                            <p className="text-xs text-muted-foreground">
                              {load.totalMiles.toLocaleString()} miles
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px]">
                            <p className="truncate">{load.customerName || '-'}</p>
                            {load.customerCompany && (
                              <p className="text-xs text-muted-foreground truncate">
                                {load.customerCompany}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px]">
                            <p className="truncate text-sm">
                              {load.cargoDescription || '-'}
                            </p>
                            {load.equipmentTypeUsed && (
                              <p className="text-xs text-muted-foreground">
                                {EQUIPMENT_TYPE_LABELS[load.equipmentTypeUsed]}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {load.pickupDate ? formatDate(load.pickupDate) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {load.customerRateCents ? formatCurrency(load.customerRateCents) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {load.carrierRateCents ? formatCurrency(load.carrierRateCents) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-medium ${getMarginColor(load.marginPercentage)}`}>
                            {load.marginPercentage !== null ? (
                              <span>{load.marginPercentage.toFixed(1)}%</span>
                            ) : (
                              '-'
                            )}
                          </div>
                          {load.marginCents !== null && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(load.marginCents)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={LOAD_STATUS_COLORS[load.status]}>
                            {LOAD_STATUS_LABELS[load.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <LoadActionsMenu
                            load={load}
                            onDelete={() => deleteLoad.mutate({ id: load.id })}
                            isDeleting={deleteLoad.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of{' '}
                    {total} loads
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1 text-sm">
                      <span>
                        Page {page} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Load Dialog */}
      <Dialog open={showNewLoadDialog} onOpenChange={setShowNewLoadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Load</DialogTitle>
            <DialogDescription>
              Record a completed or in-progress load for tracking and analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Customer */}
            <div className="space-y-4">
              <h4 className="font-medium">Customer</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={newLoadForm.customerName}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={newLoadForm.customerCompany}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, customerCompany: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-4">
              <h4 className="font-medium">Route *</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin City *</Label>
                  <Input
                    value={newLoadForm.originCity}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, originCity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origin State *</Label>
                  <Input
                    value={newLoadForm.originState}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, originState: e.target.value.toUpperCase().slice(0, 2) })}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Destination City *</Label>
                  <Input
                    value={newLoadForm.destinationCity}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, destinationCity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destination State *</Label>
                  <Input
                    value={newLoadForm.destinationState}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, destinationState: e.target.value.toUpperCase().slice(0, 2) })}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total Miles</Label>
                <Input
                  type="number"
                  value={newLoadForm.totalMiles}
                  onChange={(e) => setNewLoadForm({ ...newLoadForm, totalMiles: e.target.value })}
                />
              </div>
            </div>

            {/* Cargo */}
            <div className="space-y-4">
              <h4 className="font-medium">Cargo</h4>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newLoadForm.cargoDescription}
                  onChange={(e) => setNewLoadForm({ ...newLoadForm, cargoDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Select
                  value={newLoadForm.equipmentTypeUsed}
                  onValueChange={(value) => setNewLoadForm({ ...newLoadForm, equipmentTypeUsed: value as EquipmentType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                    <SelectItem value="step_deck">Step Deck</SelectItem>
                    <SelectItem value="rgn">RGN</SelectItem>
                    <SelectItem value="lowboy">Lowboy</SelectItem>
                    <SelectItem value="double_drop">Double Drop</SelectItem>
                    <SelectItem value="hotshot">Hotshot</SelectItem>
                    <SelectItem value="conestoga">Conestoga</SelectItem>
                    <SelectItem value="dry_van">Dry Van</SelectItem>
                    <SelectItem value="reefer">Reefer</SelectItem>
                    <SelectItem value="power_only">Power Only</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-4">
              <h4 className="font-medium">Financials</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newLoadForm.customerRateCents}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, customerRateCents: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carrier Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newLoadForm.carrierRateCents}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, carrierRateCents: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h4 className="font-medium">Dates & Status</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input
                    type="date"
                    value={newLoadForm.pickupDate}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, pickupDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input
                    type="date"
                    value={newLoadForm.deliveryDate}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, deliveryDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newLoadForm.status}
                    onValueChange={(value) => setNewLoadForm({ ...newLoadForm, status: value as LoadHistoryStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newLoadForm.notes}
                onChange={(e) => setNewLoadForm({ ...newLoadForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLoadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLoad} disabled={createLoad.isPending}>
              {createLoad.isPending ? 'Recording...' : 'Record Load'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Load Actions Menu Component
interface LoadActionsMenuProps {
  load: LoadHistoryListItem
  onDelete: () => void
  isDeleting: boolean
}

function LoadActionsMenu({ load, onDelete, isDeleting }: LoadActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/load-history/${load.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/load-history/${load.id}?edit=true`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Load
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (confirm('Are you sure you want to delete this load?')) {
              onDelete()
            }
          }}
          className="text-red-600"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete Load'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
