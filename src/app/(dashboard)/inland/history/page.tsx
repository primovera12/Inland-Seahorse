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
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils'
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
  Link2,
  Pencil,
  Clock,
  AlertTriangle,
  CheckSquare,
  X,
  GitCompare,
} from 'lucide-react'

// Helper to check if quote is expiring soon (within 7 days)
function getExpirationStatus(expiresAt: string | null | undefined): 'expired' | 'expiring-soon' | 'valid' | null {
  if (!expiresAt) return null
  const now = new Date()
  const expires = new Date(expiresAt)
  if (expires < now) return 'expired'
  const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry <= 7) return 'expiring-soon'
  return 'valid'
}

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

export default function InlandHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const limit = 20

  const { data, isLoading } = trpc.inland.getHistory.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const utils = trpc.useUtils()

  const deleteQuote = trpc.inland.delete.useMutation({
    onSuccess: () => {
      utils.inland.getHistory.invalidate()
      toast.success('Quote deleted')
    },
    onError: (error) => {
      toast.error('Failed to delete quote', { description: error.message })
    },
  })

  const markAsSent = trpc.inland.markAsSent.useMutation({
    onSuccess: () => {
      utils.inland.getHistory.invalidate()
      toast.success('Quote marked as sent')
    },
    onError: (error) => {
      toast.error('Failed to mark as sent', { description: error.message })
    },
  })

  const markAsAccepted = trpc.inland.markAsAccepted.useMutation({
    onSuccess: () => {
      utils.inland.getHistory.invalidate()
      toast.success('Quote marked as accepted')
    },
    onError: (error) => {
      toast.error('Failed to mark as accepted', { description: error.message })
    },
  })

  const markAsRejected = trpc.inland.markAsRejected.useMutation({
    onSuccess: () => {
      utils.inland.getHistory.invalidate()
      toast.success('Quote marked as rejected')
    },
    onError: (error) => {
      toast.error('Failed to mark as rejected', { description: error.message })
    },
  })

  // Track exports
  const trackExport = trpc.activity.recordExport.useMutation()

  const cloneQuote = trpc.inland.clone.useMutation({
    onSuccess: (data) => {
      utils.inland.getHistory.invalidate()
      toast.success('Quote cloned', {
        description: `New quote ${data.quote_number} created`,
        action: {
          label: 'Edit',
          onClick: () => window.location.href = `/inland/${data.id}/edit`,
        },
      })
    },
    onError: (error) => {
      toast.error('Failed to clone quote', { description: error.message })
    },
  })

  // Batch operations
  const batchUpdateStatus = trpc.inland.batchUpdateStatus.useMutation({
    onSuccess: (data) => {
      utils.inland.getHistory.invalidate()
      setSelectedIds(new Set())
      toast.success(`Updated ${data.updated} quotes`)
    },
    onError: (error) => {
      toast.error('Failed to update quotes', { description: error.message })
    },
  })

  const batchDelete = trpc.inland.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.inland.getHistory.invalidate()
      setSelectedIds(new Set())
      toast.success(`Deleted ${data.deleted} quotes`)
    },
    onError: (error) => {
      toast.error('Failed to delete quotes', { description: error.message })
    },
  })

  const quotes = data?.quotes || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Filter by search query (client-side for now)
  const filteredQuotes = quotes.filter((quote) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      quote.quote_number.toLowerCase().includes(query) ||
      quote.customer_name.toLowerCase().includes(query) ||
      (quote.customer_company?.toLowerCase().includes(query) ?? false)
    )
  })

  // Selection helpers
  const allSelected = filteredQuotes.length > 0 && filteredQuotes.every(q => selectedIds.has(q.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredQuotes.map(q => q.id)))
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

  const handleBatchStatusChange = (status: QuoteStatus) => {
    if (selectedIds.size === 0) return
    batchUpdateStatus.mutate({ ids: Array.from(selectedIds), status })
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Are you sure you want to delete ${selectedIds.size} quotes? This cannot be undone.`)) {
      batchDelete.mutate({ ids: Array.from(selectedIds) })
    }
  }

  const handleExportCSV = () => {
    const quotesToExport = selectedIds.size > 0
      ? filteredQuotes.filter(q => selectedIds.has(q.id))
      : filteredQuotes

    if (quotesToExport.length === 0) {
      toast.error('No quotes to export')
      return
    }
    exportToCSV(
      quotesToExport,
      [
        { key: 'quote_number', header: 'Quote #' },
        { key: 'customer_name', header: 'Customer Name' },
        { key: 'customer_company', header: 'Company' },
        { key: 'total', header: 'Total', formatter: (v) => (Number(v) / 100).toFixed(2) },
        { key: 'status', header: 'Status' },
        { key: 'created_at', header: 'Created', formatter: (v) => formatDate(v as string) },
      ],
      `inland-quotes-export-${new Date().toISOString().split('T')[0]}`
    )
    // Track the export
    trackExport.mutate({
      export_type: 'csv',
      data_type: 'inland quotes',
      record_count: quotesToExport.length,
    })
    toast.success(`Exported ${quotesToExport.length} quotes`)
  }

  const isBatchLoading = batchUpdateStatus.isPending || batchDelete.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inland History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage inland transportation quotes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredQuotes.length === 0} className="flex-1 sm:flex-initial">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
            {selectedIds.size > 0 && ` (${selectedIds.size})`}
          </Button>
          <Link href="/inland/new" className="flex-1 sm:flex-initial">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </Link>
        </div>
      </div>

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isBatchLoading} className="flex-1 sm:flex-initial">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBatchStatusChange('draft')}>
                      Mark as Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchStatusChange('sent')}>
                      <Send className="h-4 w-4 mr-2" />
                      Mark as Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBatchStatusChange('accepted')}
                      className="text-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBatchStatusChange('rejected')}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isBatchLoading}
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

      <Card>
        <CardHeader>
          <CardTitle>All Inland Quotes</CardTitle>
          <CardDescription>{total} quotes total</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table/Cards */}
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading quotes...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-10">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No inland quotes found</p>
              <Link href="/inland/new">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first inland quote
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {filteredQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={`rounded-lg border p-4 ${selectedIds.has(quote.id) ? 'bg-primary/5 border-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(quote.id)}
                          onCheckedChange={() => toggleSelect(quote.id)}
                          aria-label={`Select ${quote.quote_number}`}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{quote.quote_number}</span>
                            <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="font-medium mt-1">{quote.customer_name}</p>
                          {quote.customer_company && (
                            <p className="text-sm text-muted-foreground">{quote.customer_company}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <ViewQuoteMenuItem quoteId={quote.id} />
                          <DropdownMenuItem asChild>
                            <Link href={`/inland/${quote.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Quote
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => cloneQuote.mutate({ id: quote.id })}
                            disabled={cloneQuote.isPending}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {cloneQuote.isPending ? 'Cloning...' : 'Clone Quote'}
                          </DropdownMenuItem>
                          <ShareLinkMenuItem quoteId={quote.id} />
                          <DownloadQuoteMenuItem quoteId={quote.id} />
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          {quote.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => markAsSent.mutate({ id: quote.id })}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(quote.status === 'draft' || quote.status === 'sent') && (
                            <>
                              <DropdownMenuItem
                                onClick={() => markAsAccepted.mutate({ id: quote.id })}
                                className="text-green-600"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Accepted
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => markAsRejected.mutate({ id: quote.id })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark as Rejected
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this quote?')) {
                                deleteQuote.mutate({ id: quote.id })
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 ml-8 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-mono font-medium">{formatCurrency(quote.total)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="font-medium">{formatDate(quote.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created By:</span>
                        <p className="font-medium">{quote.created_by_name || 'System'}</p>
                      </div>
                      {quote.expires_at && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Expires:</span>
                          <p className={`font-medium flex items-center gap-1 ${
                            getExpirationStatus(quote.expires_at) === 'expired'
                              ? 'text-red-500'
                              : getExpirationStatus(quote.expires_at) === 'expiring-soon'
                              ? 'text-yellow-600'
                              : ''
                          }`}>
                            {getExpirationStatus(quote.expires_at) === 'expired' && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {getExpirationStatus(quote.expires_at) === 'expiring-soon' && (
                              <Clock className="h-3 w-3" />
                            )}
                            {formatDate(quote.expires_at)}
                          </p>
                        </div>
                      )}
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
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow
                        key={quote.id}
                        className={selectedIds.has(quote.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(quote.id)}
                            onCheckedChange={() => toggleSelect(quote.id)}
                            aria-label={`Select ${quote.quote_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{quote.quote_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{quote.customer_name}</p>
                            {quote.customer_company && (
                              <p className="text-sm text-muted-foreground">
                                {quote.customer_company}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(quote.total)}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(quote.created_at)}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">{quote.created_by_name || 'System'}</span>
                        </TableCell>
                        <TableCell>
                          {quote.expires_at ? (
                            <div className="flex items-center gap-1">
                              {getExpirationStatus(quote.expires_at) === 'expired' && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                              {getExpirationStatus(quote.expires_at) === 'expiring-soon' && (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                              <span className={
                                getExpirationStatus(quote.expires_at) === 'expired'
                                  ? 'text-red-500'
                                  : getExpirationStatus(quote.expires_at) === 'expiring-soon'
                                  ? 'text-yellow-600'
                                  : ''
                              }>
                                {formatDate(quote.expires_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
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
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <ViewQuoteMenuItem quoteId={quote.id} />
                              <DropdownMenuItem asChild>
                                <Link href={`/inland/${quote.id}/edit`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Quote
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => cloneQuote.mutate({ id: quote.id })}
                                disabled={cloneQuote.isPending}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                {cloneQuote.isPending ? 'Cloning...' : 'Clone Quote'}
                              </DropdownMenuItem>
                              <ShareLinkMenuItem quoteId={quote.id} />
                              <DownloadQuoteMenuItem quoteId={quote.id} />
                              <DropdownMenuItem asChild>
                                <Link href={`/inland/${quote.id}/versions`}>
                                  <GitCompare className="h-4 w-4 mr-2" />
                                  Compare Versions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {quote.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={() => markAsSent.mutate({ id: quote.id })}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              )}
                              {(quote.status === 'draft' || quote.status === 'sent') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => markAsAccepted.mutate({ id: quote.id })}
                                    className="text-green-600"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Accepted
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => markAsRejected.mutate({ id: quote.id })}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Mark as Rejected
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this quote?')) {
                                    deleteQuote.mutate({ id: quote.id })
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Quote
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} quotes
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
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

function ViewQuoteMenuItem({ quoteId }: { quoteId: string }) {
  const { data, isLoading, error } = trpc.inland.getPublicLink.useQuery({ id: quoteId })

  const viewQuote = () => {
    if (error) {
      toast.error('Failed to get quote link', { description: error.message })
      return
    }
    if (!data?.token) {
      toast.error('Failed to get quote link')
      return
    }
    window.open(`/quote/${data.token}`, '_blank')
  }

  return (
    <DropdownMenuItem onClick={viewQuote} disabled={isLoading}>
      <Eye className="h-4 w-4 mr-2" />
      {isLoading ? 'Loading...' : 'View Quote'}
    </DropdownMenuItem>
  )
}

function ShareLinkMenuItem({ quoteId }: { quoteId: string }) {
  const { data, isLoading, error } = trpc.inland.getPublicLink.useQuery({ id: quoteId })

  const copyShareLink = async () => {
    if (error) {
      toast.error('Failed to get share link', { description: error.message })
      return
    }
    if (!data?.token) {
      toast.error('Failed to get share link')
      return
    }
    const url = `${window.location.origin}/quote/${data.token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied!', {
        description: 'Customers can view the quote using this link.',
      })
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <DropdownMenuItem onClick={copyShareLink} disabled={isLoading}>
      <Link2 className="h-4 w-4 mr-2" />
      {isLoading ? 'Loading...' : 'Copy Share Link'}
    </DropdownMenuItem>
  )
}

function DownloadQuoteMenuItem({ quoteId }: { quoteId: string }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { refetch } = trpc.inland.getForDownload.useQuery(
    { id: quoteId },
    { enabled: false }
  )

  // Track PDF downloads in activity history
  const recordDownload = trpc.activity.recordPdfDownload.useMutation()

  const downloadQuote = async () => {
    setIsDownloading(true)
    try {
      const { data: quote } = await refetch()
      if (!quote || !quote.company_settings) {
        toast.error('Failed to load quote data')
        return
      }

      const settings = quote.company_settings
      const quoteData = quote.quote_data as Record<string, unknown> | null

      // Import PDF utilities
      const { settingsToCompanyInfo } = await import('@/lib/pdf')
      type InlandTransportInfo = {
        enabled: boolean
        pickup?: { address: string; city: string; state: string; zip: string }
        dropoff?: { address: string; city: string; state: string; zip: string }
        distance_miles?: number
        static_map_url?: string
        total?: number
        accessorials_total?: number
        destinationBlocks?: Array<{
          id: string
          label: string
          pickup_address: string
          pickup_city: string
          pickup_state: string
          pickup_zip: string
          dropoff_address: string
          dropoff_city: string
          dropoff_state: string
          dropoff_zip: string
          distance_miles?: number
          static_map_url?: string
          load_blocks: Array<{
            id: string
            truck_type_id: string
            truck_type_name: string
            cargo_items: Array<{
              id: string
              description: string
              quantity: number
              length_inches: number
              width_inches: number
              height_inches: number
              weight_lbs: number
              is_oversize?: boolean
              is_overweight?: boolean
              is_equipment?: boolean
              equipment_make_name?: string
              equipment_model_name?: string
              custom_make_name?: string
              custom_model_name?: string
              image_url?: string
              image_url_2?: string
              front_image_url?: string
              side_image_url?: string
            }>
            service_items: Array<{
              id: string
              name: string
              rate: number
              quantity: number
              total: number
            }>
            accessorial_charges: Array<{
              id: string
              name: string
              billing_unit: string
              rate: number
              quantity: number
              total: number
            }>
            subtotal: number
            accessorials_total: number
          }>
          subtotal: number
          accessorials_total?: number
        }>
      }

      // Build company info from settings
      const companyInfo = settingsToCompanyInfo({
        company_name: settings.company_name || 'Company',
        company_logo_url: settings.company_logo_url,
        logo_size_percentage: settings.logo_size_percentage,
        company_address: settings.company_address,
        company_city: settings.company_city,
        company_state: settings.company_state,
        company_zip: settings.company_zip,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_website: settings.company_website,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
      })

      // Parse destination blocks from quote_data
      const destinationBlocks = quoteData?.destinationBlocks as Array<{
        id: string
        label: string
        pickup_address: string
        pickup_city: string
        pickup_state: string
        pickup_zip: string
        dropoff_address: string
        dropoff_city: string
        dropoff_state: string
        dropoff_zip: string
        distance_miles?: number
        static_map_url?: string
        load_blocks: Array<{
          id: string
          truck_type_id: string
          truck_type_name: string
          cargo_items?: Array<{
            id: string
            description: string
            quantity: number
            length_inches: number
            width_inches: number
            height_inches: number
            weight_lbs: number
            is_oversize?: boolean
            is_overweight?: boolean
            is_equipment?: boolean
            equipment_make_name?: string
            equipment_model_name?: string
            custom_make_name?: string
            custom_model_name?: string
            image_url?: string
            image_url_2?: string
            front_image_url?: string
            side_image_url?: string
          }>
          service_items: Array<{
            id: string
            name: string
            rate: number
            quantity: number
            total: number
          }>
          accessorial_charges: Array<{
            id: string
            name: string
            billing_unit: string
            rate: number
            quantity: number
            total: number
          }>
          subtotal: number
          accessorials_total?: number
        }>
        subtotal: number
        accessorials_total?: number
      }> | undefined

      // Build inland transport info
      const inlandTransport: InlandTransportInfo = {
        enabled: true,
        pickup: {
          address: (quote as { origin_address?: string }).origin_address || '',
          city: (quote as { origin_city?: string }).origin_city || '',
          state: (quote as { origin_state?: string }).origin_state || '',
          zip: (quote as { origin_zip?: string }).origin_zip || '',
        },
        dropoff: {
          address: (quote as { destination_address?: string }).destination_address || '',
          city: (quote as { destination_city?: string }).destination_city || '',
          state: (quote as { destination_state?: string }).destination_state || '',
          zip: (quote as { destination_zip?: string }).destination_zip || '',
        },
        distance_miles: (quote as { distance_miles?: number }).distance_miles,
        static_map_url: quoteData?.static_map_url as string | undefined,
        total: quote.total || 0,
        accessorials_total: quoteData?.accessorials_total as number | undefined,
        destinationBlocks: destinationBlocks?.map(dest => ({
          id: dest.id,
          label: dest.label,
          pickup_address: dest.pickup_address,
          pickup_city: dest.pickup_city,
          pickup_state: dest.pickup_state,
          pickup_zip: dest.pickup_zip,
          dropoff_address: dest.dropoff_address,
          dropoff_city: dest.dropoff_city,
          dropoff_state: dest.dropoff_state,
          dropoff_zip: dest.dropoff_zip,
          distance_miles: dest.distance_miles,
          static_map_url: dest.static_map_url,
          load_blocks: dest.load_blocks.map(lb => ({
            id: lb.id,
            truck_type_id: lb.truck_type_id,
            truck_type_name: lb.truck_type_name,
            cargo_items: lb.cargo_items || [],
            service_items: lb.service_items,
            accessorial_charges: lb.accessorial_charges,
            subtotal: lb.subtotal,
            accessorials_total: lb.accessorials_total || 0,
          })),
          subtotal: dest.subtotal,
          accessorials_total: dest.accessorials_total,
        })) as InlandTransportInfo['destinationBlocks'],
      }

      // Build UnifiedPDFData for inland quote
      const pdfData = {
        quoteType: 'inland' as const,
        quoteNumber: quote.quote_number || '',
        issueDate: new Date(quote.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        validUntil: quote.expires_at
          ? new Date(quote.expires_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : undefined,
        company: companyInfo,
        customer: {
          name: quote.customer_name || 'Customer',
          company: quote.customer_company,
          email: quote.customer_email,
          phone: quote.customer_phone,
        },
        equipment: [],
        isMultiEquipment: false,
        inlandTransport,
        equipmentSubtotal: 0,
        miscFeesTotal: 0,
        inlandTotal: quote.total || 0,
        grandTotal: quote.total || 0,
        customerNotes: quoteData?.notes as string | undefined,
        termsAndConditions: (settings as { quote_terms?: string }).quote_terms,
      }

      // Generate PDF via API
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inland-quote-${quote.quote_number || quoteId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Record the download in activity history
      recordDownload.mutate({
        quote_type: 'inland',
        quote_id: quoteId,
        quote_number: quote.quote_number || '',
        customer_name: quote.customer_name || undefined,
      })

      toast.success('Quote downloaded!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download quote')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DropdownMenuItem onClick={downloadQuote} disabled={isDownloading}>
      <Download className="h-4 w-4 mr-2" />
      {isDownloading ? 'Downloading...' : 'Download Quote'}
    </DropdownMenuItem>
  )
}
