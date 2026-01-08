'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  })

  const markAsRejected = trpc.quotes.markAsRejected.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote marked as rejected')
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

  const handleExportCSV = () => {
    if (filteredQuotes.length === 0) {
      toast.error('No quotes to export')
      return
    }
    exportToCSV(
      filteredQuotes,
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
    toast.success(`Exported ${filteredQuotes.length} quotes`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote History</h1>
          <p className="text-muted-foreground">
            View and manage all quotes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredQuotes.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link href="/quotes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
          <CardDescription>
            {total} quotes total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
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
              <SelectTrigger className="w-[180px]">
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

          {/* Table */}
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Quote
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes/${quote.id}/edit`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Quote
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
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} quotes
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
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
