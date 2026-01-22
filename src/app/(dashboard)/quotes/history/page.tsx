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
  FileText,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Clock,
  AlertTriangle,
  Pencil,
  Copy,
  Link2,
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

export default function QuoteHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const limit = 20

  const { data, isLoading } = trpc.quotes.getHistory.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const utils = trpc.useUtils()

  const deleteQuote = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote deleted')
    },
  })

  const markAsSent = trpc.quotes.markAsSent.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote marked as sent')
    },
  })

  const markAsAccepted = trpc.quotes.markAsAccepted.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote marked as accepted')
    },
    onError: (error) => {
      toast.error('Failed to mark quote as accepted', { description: error.message })
    },
  })

  const markAsRejected = trpc.quotes.markAsRejected.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote marked as rejected')
    },
    onError: (error) => {
      toast.error('Failed to mark quote as rejected', { description: error.message })
    },
  })

  // Track exports
  const trackExport = trpc.activity.recordExport.useMutation()

  const cloneQuote = trpc.quotes.clone.useMutation({
    onSuccess: (data) => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote cloned', {
        description: `New quote ${data.quote_number} created`,
        action: {
          label: 'Edit',
          onClick: () => window.location.href = `/quotes/${data.id}/edit`,
        },
      })
    },
    onError: (error) => {
      toast.error('Failed to clone quote', { description: error.message })
    },
  })

  // Batch operations
  const batchUpdateStatus = trpc.quotes.batchUpdateStatus.useMutation({
    onSuccess: (data) => {
      utils.quotes.getHistory.invalidate()
      setSelectedIds(new Set())
      toast.success(`Updated ${data.updated} quotes`)
    },
    onError: (error) => {
      toast.error('Failed to update quotes', { description: error.message })
    },
  })

  const batchDelete = trpc.quotes.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.quotes.getHistory.invalidate()
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
      (quote.customer_company?.toLowerCase().includes(query) ?? false) ||
      (quote.make_name?.toLowerCase().includes(query) ?? false) ||
      (quote.model_name?.toLowerCase().includes(query) ?? false)
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
        { key: 'make_name', header: 'Make' },
        { key: 'model_name', header: 'Model' },
        { key: 'location', header: 'Location' },
        { key: 'total', header: 'Total', formatter: (v) => (Number(v) / 100).toFixed(2) },
        { key: 'status', header: 'Status' },
        { key: 'created_at', header: 'Created', formatter: (v) => formatDate(v as string) },
      ],
      `quotes-export-${new Date().toISOString().split('T')[0]}`
    )
    // Track the export
    trackExport.mutate({
      export_type: 'csv',
      data_type: 'dismantle quotes',
      record_count: quotesToExport.length,
    })
    toast.success(`Exported ${quotesToExport.length} quotes`)
  }

  const isBatchLoading = batchUpdateStatus.isPending || batchDelete.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quote History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage all quotes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredQuotes.length === 0} className="flex-1 sm:flex-initial">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
            {selectedIds.size > 0 && ` (${selectedIds.size})`}
          </Button>
          <Link href="/quotes/new" className="flex-1 sm:flex-initial">
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
          <CardTitle>All Quotes</CardTitle>
          <CardDescription>
            {total} quotes total
          </CardDescription>
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
            <div className="text-center py-10 text-muted-foreground">
              Loading quotes...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quotes found</p>
              <Link href="/quotes/new">
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
                          <DownloadQuoteMenuItem quoteId={quote.id} />
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/${quote.id}/edit`}>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/${quote.id}/compare`}>
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
                    </div>

                    <div className="mt-3 ml-8 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Equipment:</span>
                        <p className="font-medium truncate">{quote.make_name} {quote.model_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-medium">{quote.location}</p>
                      </div>
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
                      <TableHead>Equipment</TableHead>
                      <TableHead>Location</TableHead>
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
                        <TableCell className="font-medium">
                          {quote.quote_number}
                        </TableCell>
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
                        <TableCell>
                          {quote.make_name} {quote.model_name}
                        </TableCell>
                        <TableCell>{quote.location}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(quote.total)}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[quote.status as QuoteStatus]}>
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(quote.created_at)}
                        </TableCell>
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
                              <DownloadQuoteMenuItem quoteId={quote.id} />
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes/${quote.id}/edit`}>
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
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes/${quote.id}/compare`}>
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
  const { data, isLoading, error } = trpc.quotes.getPublicLink.useQuery({ id: quoteId })

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
  const { data, isLoading, error } = trpc.quotes.getPublicLink.useQuery({ id: quoteId })

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
  const { refetch } = trpc.quotes.getForDownload.useQuery(
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

      // Transform quote data to UnifiedPDFData
      const equipmentBlocks = quoteData?.equipmentBlocks as Array<{
        id: string
        make_name: string
        model_name: string
        location?: string
        quantity: number
        length_inches?: number
        width_inches?: number
        height_inches?: number
        weight_lbs?: number
        front_image_url?: string
        side_image_url?: string
        costs: Record<string, number>
        enabled_costs: Record<string, boolean>
        cost_overrides: Record<string, number | null>
        misc_fees?: Array<{ id: string; title: string; description?: string; amount: number; is_percentage: boolean }>
        subtotal: number
        misc_fees_total?: number
        total_with_quantity: number
      }> | undefined

      const customerAddress = quote.customer_address
        ? (() => {
            const parts = (quote.customer_address as string).split(', ')
            return {
              address: parts[0] || undefined,
              city: parts[1] || undefined,
              state: parts[2] || undefined,
              zip: parts[3] || undefined,
            }
          })()
        : undefined

      const { buildUnifiedPDFData } = await import('@/lib/pdf')

      const pdfData = buildUnifiedPDFData({
        quoteNumber: quote.quote_number || '',
        quoteType: 'dismantle',
        customerName: quote.customer_name || 'Customer',
        customerEmail: quote.customer_email,
        customerPhone: quote.customer_phone,
        customerCompany: quote.customer_company,
        customerAddress,
        makeName: quote.make_name || 'Equipment',
        modelName: quote.model_name || '',
        location: quote.location,
        dimensions: quoteData?.dimensions ? {
          length_inches: (quoteData.dimensions as { length_inches?: number }).length_inches || 0,
          width_inches: (quoteData.dimensions as { width_inches?: number }).width_inches || 0,
          height_inches: (quoteData.dimensions as { height_inches?: number }).height_inches || 0,
          weight_lbs: (quoteData.dimensions as { weight_lbs?: number }).weight_lbs || 0,
        } : undefined,
        frontImageUrl: quoteData?.frontImageUrl as string | undefined,
        sideImageUrl: quoteData?.sideImageUrl as string | undefined,
        costs: quoteData?.costs as Record<string, number> | undefined,
        enabledCosts: quoteData?.enabledCosts as Record<string, boolean> | undefined,
        costOverrides: quoteData?.costOverrides as Record<string, number | null> | undefined,
        costDescriptions: quoteData?.costDescriptions as Record<string, string> | undefined,
        miscFees: quoteData?.miscFees as Array<{ id: string; title: string; description?: string; amount: number; is_percentage: boolean }> | undefined,
        isMultiEquipment: quoteData?.isMultiEquipment as boolean | undefined ?? (equipmentBlocks && equipmentBlocks.length > 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        equipmentBlocks: equipmentBlocks as any,
        inlandTransport: quoteData?.inlandTransport as {
          enabled: boolean
          pickup_address?: string
          pickup_city?: string
          pickup_state?: string
          pickup_zip?: string
          dropoff_address?: string
          dropoff_city?: string
          dropoff_state?: string
          dropoff_zip?: string
          transport_cost?: number
          distance_miles?: number
          duration_minutes?: number
          static_map_url?: string
        } | undefined,
        subtotal: quote.subtotal || 0,
        total: quote.total || 0,
        inlandTransportCost: quoteData?.inlandTransport ? (quoteData.inlandTransport as { transport_cost?: number }).transport_cost : undefined,
        miscFeesTotal: quoteData?.miscFeesTotal as number | undefined,
        notes: quoteData?.notes as string | undefined,
        settings: {
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
          quote_validity_days: settings.quote_validity_days || 30,
          terms_dismantle: (settings as { terms_dismantle?: string }).terms_dismantle,
        },
      })

      // Override validUntil with actual expiration date
      if (quote.expires_at) {
        pdfData.validUntil = new Date(quote.expires_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
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
      a.download = `quote-${quote.quote_number || quoteId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Record the download in activity history
      recordDownload.mutate({
        quote_type: 'dismantle',
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
