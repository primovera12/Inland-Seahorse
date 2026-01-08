'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  FileText,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Mail,
  Copy,
  Trash2,
  RefreshCw,
  Building2,
  DollarSign,
  GripVertical,
} from 'lucide-react'
import type { QuoteStatus } from '@/types/quotes'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types/quotes'

const STATUS_ICONS: Record<QuoteStatus, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  accepted: <CheckCircle2 className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
}

const PIPELINE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'rejected']

interface Quote {
  id: string
  quote_number: string
  status: QuoteStatus
  customer_name: string
  customer_company?: string
  make_name: string
  model_name: string
  total: number
  created_at: string
  updated_at: string
}

// Draggable Quote Card
function QuoteCard({ quote, isDragging }: { quote: Quote; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: quote.id,
    data: quote,
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const utils = trpc.useUtils()

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Status updated')
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
      toast.success('Quote deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`)
    },
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/quotes/${quote.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {quote.quote_number}
          </Link>
          <p className="font-medium text-sm truncate mt-0.5">
            {quote.make_name} {quote.model_name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/quotes/${quote.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {quote.status === 'draft' && (
              <DropdownMenuItem
                onClick={() =>
                  updateStatusMutation.mutate({ id: quote.id, status: 'sent' })
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </DropdownMenuItem>
            )}
            {['sent', 'viewed'].includes(quote.status) && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    updateStatusMutation.mutate({ id: quote.id, status: 'accepted' })
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Accepted
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateStatusMutation.mutate({ id: quote.id, status: 'rejected' })
                  }
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark as Rejected
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this quote?')) {
                  deleteMutation.mutate({ id: quote.id })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{quote.customer_company || quote.customer_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(quote.created_at)}
          </span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(quote.total)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Droppable Column
function PipelineColumn({
  status,
  quotes,
  total,
}: {
  status: QuoteStatus
  quotes: Quote[]
  total: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${QUOTE_STATUS_COLORS[status]}`}
          >
            {STATUS_ICONS[status]}
          </div>
          <div>
            <h3 className="font-medium text-sm">{QUOTE_STATUS_LABELS[status]}</h3>
            <p className="text-xs text-muted-foreground">
              {quotes.length} quotes • {formatCurrency(total)}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {quotes.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2 p-2 rounded-lg min-h-[400px] transition-colors ${
          isOver ? 'bg-primary/10 border-2 border-dashed border-primary' : 'bg-muted/30'
        }`}
      >
        {quotes.map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
        {quotes.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No quotes
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuotePipelinePage() {
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null)

  const { data, isLoading, refetch } = trpc.quotes.getHistory.useQuery({
    limit: 100,
    offset: 0,
  })

  const utils = trpc.useUtils()

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotes.getHistory.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group quotes by status
  const quotesByStatus = useMemo(() => {
    const grouped: Record<QuoteStatus, Quote[]> = {
      draft: [],
      sent: [],
      viewed: [],
      accepted: [],
      rejected: [],
      expired: [],
    }

    data?.quotes?.forEach((quote: Quote) => {
      if (grouped[quote.status]) {
        grouped[quote.status].push(quote)
      }
    })

    return grouped
  }, [data?.quotes])

  // Calculate totals by status
  const totalsByStatus = useMemo(() => {
    const totals: Record<QuoteStatus, number> = {
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    }

    Object.entries(quotesByStatus).forEach(([status, quotes]) => {
      totals[status as QuoteStatus] = quotes.reduce((sum, q) => sum + q.total, 0)
    })

    return totals
  }, [quotesByStatus])

  const handleDragStart = (event: DragStartEvent) => {
    const quote = data?.quotes?.find((q: Quote) => q.id === event.active.id) as Quote | undefined
    if (quote) {
      setActiveQuote(quote)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveQuote(null)

    if (!over) return

    const quoteId = active.id as string
    const newStatus = over.id as QuoteStatus

    const quote = data?.quotes?.find((q: Quote) => q.id === quoteId) as Quote | undefined
    if (!quote || quote.status === newStatus) return

    // Validate status transitions
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      draft: ['sent'],
      sent: ['viewed', 'accepted', 'rejected', 'expired'],
      viewed: ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: [],
      expired: [],
    }

    if (!validTransitions[quote.status]?.includes(newStatus)) {
      toast.error(`Cannot change status from ${quote.status} to ${newStatus}`)
      return
    }

    updateStatusMutation.mutate(
      { id: quoteId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Quote moved to ${QUOTE_STATUS_LABELS[newStatus]}`)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quote Pipeline</h1>
          <p className="text-muted-foreground">
            Drag and drop quotes between stages to update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/quotes/new">New Quote</Link>
          </Button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-5 gap-4">
        {PIPELINE_STATUSES.map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {STATUS_ICONS[status]}
                {QUOTE_STATUS_LABELS[status]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quotesByStatus[status]?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format((totalsByStatus[status] || 0) / 100)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="flex-1 min-w-[280px] max-w-[320px]">
              <Skeleton className="h-8 w-32 mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STATUSES.map((status) => (
              <PipelineColumn
                key={status}
                status={status}
                quotes={quotesByStatus[status] || []}
                total={totalsByStatus[status] || 0}
              />
            ))}
          </div>

          <DragOverlay>
            {activeQuote ? <QuoteCard quote={activeQuote} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
