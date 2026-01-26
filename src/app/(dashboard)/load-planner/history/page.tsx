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
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Pencil,
  Clock,
  CheckSquare,
  X,
  Package,
  MapPin,
  ArrowRight,
  FileText,
} from 'lucide-react'
import type { LoadPlannerQuoteStatus, LoadPlannerQuoteListItem } from '@/types/load-planner-quotes'

const STATUS_COLORS: Record<LoadPlannerQuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
}

const STATUS_LABELS: Record<LoadPlannerQuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
}

export default function LoadPlannerHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<LoadPlannerQuoteStatus | 'all'>('all')
  const [pickupStateFilter, setPickupStateFilter] = useState<string>('')
  const [dropoffStateFilter, setDropoffStateFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const pageSize = 25

  // Fetch quotes
  const { data, isLoading, error } = trpc.loadPlannerQuotes.getAll.useQuery({
    filters: {
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      pickupState: pickupStateFilter || undefined,
      dropoffState: dropoffStateFilter || undefined,
    },
    pagination: {
      page,
      pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  })

  // Fetch stats
  const { data: stats } = trpc.loadPlannerQuotes.getStats.useQuery()

  const utils = trpc.useUtils()

  // Mutations
  const deleteQuote = trpc.loadPlannerQuotes.delete.useMutation({
    onSuccess: () => {
      utils.loadPlannerQuotes.getAll.invalidate()
      utils.loadPlannerQuotes.getStats.invalidate()
      toast.success('Quote deleted')
    },
    onError: (error) => {
      toast.error('Failed to delete quote', { description: error.message })
    },
  })

  const updateStatus = trpc.loadPlannerQuotes.updateStatus.useMutation({
    onSuccess: () => {
      utils.loadPlannerQuotes.getAll.invalidate()
      utils.loadPlannerQuotes.getStats.invalidate()
      toast.success('Quote status updated')
    },
    onError: (error) => {
      toast.error('Failed to update status', { description: error.message })
    },
  })

  const duplicateQuote = trpc.loadPlannerQuotes.duplicate.useMutation({
    onSuccess: (data) => {
      utils.loadPlannerQuotes.getAll.invalidate()
      utils.loadPlannerQuotes.getStats.invalidate()
      toast.success('Quote duplicated', {
        description: `New quote ${data.quoteNumber} created`,
        action: {
          label: 'Edit',
          onClick: () => (window.location.href = `/load-planner?edit=${data.id}`),
        },
      })
    },
    onError: (error) => {
      toast.error('Failed to duplicate quote', { description: error.message })
    },
  })

  const recordAsLoad = trpc.loadHistory.createFromQuote.useMutation({
    onSuccess: () => {
      utils.loadPlannerQuotes.getAll.invalidate()
      toast.success('Load recorded', {
        description: 'Quote has been added to load history',
        action: {
          label: 'View',
          onClick: () => (window.location.href = '/load-history'),
        },
      })
    },
    onError: (error) => {
      toast.error('Failed to record load', { description: error.message })
    },
  })

  const quotes = data?.data || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  // Selection helpers
  const allSelected = quotes.length > 0 && quotes.every((q) => selectedIds.has(q.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(quotes.map((q) => q.id)))
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
    if (confirm(`Are you sure you want to delete ${selectedIds.size} quotes? This cannot be undone.`)) {
      // Delete each quote individually
      const ids = Array.from(selectedIds)
      Promise.all(ids.map((id) => deleteQuote.mutateAsync({ id }))).then(() => {
        setSelectedIds(new Set())
      })
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setPickupStateFilter('')
    setDropoffStateFilter('')
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters =
    statusFilter !== 'all' || pickupStateFilter || dropoffStateFilter || searchQuery

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Load Planner History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage Load Planner v2 quotes
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inland/new-v2" className="flex-1 sm:flex-initial">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.viewed}</div>
              <p className="text-xs text-muted-foreground">Viewed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
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
                  disabled={deleteQuote.isPending}
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
          <CardTitle>All Load Planner Quotes</CardTitle>
          <CardDescription>{total} quotes total</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by quote #, customer name, company..."
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
                  setStatusFilter(value as LoadPlannerQuoteStatus | 'all')
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Origin State"
                value={pickupStateFilter}
                onChange={(e) => {
                  setPickupStateFilter(e.target.value.toUpperCase().slice(0, 2))
                  setPage(1)
                }}
                className="w-full sm:w-[130px]"
                maxLength={2}
              />

              <Input
                placeholder="Dest State"
                value={dropoffStateFilter}
                onChange={(e) => {
                  setDropoffStateFilter(e.target.value.toUpperCase().slice(0, 2))
                  setPage(1)
                }}
                className="w-full sm:w-[130px]"
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
            <div className="text-center py-10 text-muted-foreground">Loading quotes...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              Error loading quotes: {error.message}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No Load Planner quotes found</p>
              <Link href="/inland/new-v2">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first quote
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={`rounded-lg border p-4 ${selectedIds.has(quote.id) ? 'bg-primary/5 border-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(quote.id)}
                          onCheckedChange={() => toggleSelect(quote.id)}
                          aria-label={`Select ${quote.quoteNumber}`}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{quote.quoteNumber}</span>
                            <Badge className={STATUS_COLORS[quote.status]}>
                              {STATUS_LABELS[quote.status]}
                            </Badge>
                          </div>
                          <p className="font-medium mt-1">
                            {quote.customerName || quote.customerCompany || 'No customer'}
                          </p>
                          {quote.pickupState && quote.dropoffState && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {quote.pickupCity ? `${quote.pickupCity}, ` : ''}
                              {quote.pickupState}
                              <ArrowRight className="h-3 w-3" />
                              {quote.dropoffCity ? `${quote.dropoffCity}, ` : ''}
                              {quote.dropoffState}
                            </p>
                          )}
                        </div>
                      </div>
                      <QuoteActionsMenu
                        quote={quote}
                        onDelete={() => deleteQuote.mutate({ id: quote.id })}
                        onDuplicate={() => duplicateQuote.mutate({ id: quote.id })}
                        onRecordAsLoad={() => recordAsLoad.mutate({ quoteId: quote.id })}
                        onStatusChange={(status) =>
                          updateStatus.mutate({ id: quote.id, status })
                        }
                        isDeleting={deleteQuote.isPending}
                        isDuplicating={duplicateQuote.isPending}
                        isRecordingLoad={recordAsLoad.isPending}
                      />
                    </div>

                    <div className="mt-3 ml-8 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-mono font-medium">
                          {quote.totalCents ? formatCurrency(quote.totalCents) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="font-medium">{formatDate(quote.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trucks:</span>
                        <p className="font-medium flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {quote.trucksCount}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cargo Items:</span>
                        <p className="font-medium flex items-center gap-1">
                          <Package className="h-3 w-3" /> {quote.cargoItemsCount}
                        </p>
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
                      <TableHead>Quote #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-center">Trucks</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow
                        key={quote.id}
                        className={selectedIds.has(quote.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(quote.id)}
                            onCheckedChange={() => toggleSelect(quote.id)}
                            aria-label={`Select ${quote.quoteNumber}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {quote.customerName || quote.customerCompany || '-'}
                            </p>
                            {quote.customerName && quote.customerCompany && (
                              <p className="text-sm text-muted-foreground">
                                {quote.customerCompany}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {quote.pickupState && quote.dropoffState ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span>
                                {quote.pickupCity ? `${quote.pickupCity}, ` : ''}
                                {quote.pickupState}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {quote.dropoffCity ? `${quote.dropoffCity}, ` : ''}
                                {quote.dropoffState}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {quote.trucksCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {quote.cargoItemsCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {quote.totalCents ? formatCurrency(quote.totalCents) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[quote.status]}>
                            {STATUS_LABELS[quote.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(quote.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <QuoteActionsMenu
                            quote={quote}
                            onDelete={() => deleteQuote.mutate({ id: quote.id })}
                            onDuplicate={() => duplicateQuote.mutate({ id: quote.id })}
                            onRecordAsLoad={() => recordAsLoad.mutate({ quoteId: quote.id })}
                            onStatusChange={(status) =>
                              updateStatus.mutate({ id: quote.id, status })
                            }
                            isDeleting={deleteQuote.isPending}
                            isDuplicating={duplicateQuote.isPending}
                            isRecordingLoad={recordAsLoad.isPending}
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
                    {total} quotes
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
                      <span>Page {page} of {totalPages}</span>
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
    </div>
  )
}

interface QuoteActionsMenuProps {
  quote: LoadPlannerQuoteListItem
  onDelete: () => void
  onDuplicate: () => void
  onRecordAsLoad: () => void
  onStatusChange: (status: LoadPlannerQuoteStatus) => void
  isDeleting: boolean
  isDuplicating: boolean
  isRecordingLoad: boolean
}

function QuoteActionsMenu({
  quote,
  onDelete,
  onDuplicate,
  onRecordAsLoad,
  onStatusChange,
  isDeleting,
  isDuplicating,
  isRecordingLoad,
}: QuoteActionsMenuProps) {
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
          <Link href={`/inland/new-v2?edit=${quote.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Quote
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate} disabled={isDuplicating}>
          <Copy className="h-4 w-4 mr-2" />
          {isDuplicating ? 'Duplicating...' : 'Duplicate Quote'}
        </DropdownMenuItem>
        {quote.status === 'accepted' && (
          <DropdownMenuItem onClick={onRecordAsLoad} disabled={isRecordingLoad} className="text-green-600">
            <CheckSquare className="h-4 w-4 mr-2" />
            {isRecordingLoad ? 'Recording...' : 'Record as Load'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        {quote.status === 'draft' && (
          <DropdownMenuItem onClick={() => onStatusChange('sent')}>
            <Send className="h-4 w-4 mr-2" />
            Mark as Sent
          </DropdownMenuItem>
        )}
        {(quote.status === 'draft' || quote.status === 'sent' || quote.status === 'viewed') && (
          <>
            <DropdownMenuItem onClick={() => onStatusChange('accepted')} className="text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Accepted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('rejected')} className="text-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              Mark as Rejected
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (confirm('Are you sure you want to delete this quote?')) {
              onDelete()
            }
          }}
          className="text-red-600"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete Quote'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
