'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_COLORS,
  TICKET_PRIORITY_COLORS,
  TICKET_STATUS_COLORS,
  type Ticket,
  type TicketType,
  type TicketStatus,
  type TicketPriority,
} from '@/types/feedback'

const TYPE_ICONS: Record<TicketType, React.ReactNode> = {
  bug: <Bug className="h-4 w-4" />,
  feature: <Lightbulb className="h-4 w-4" />,
  enhancement: <Sparkles className="h-4 w-4" />,
  question: <HelpCircle className="h-4 w-4" />,
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<TicketStatus>('open')
  const [adminNotes, setAdminNotes] = useState('')

  const { data: stats, isLoading: statsLoading } = trpc.feedback.stats.useQuery()
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    refetch,
  } = trpc.feedback.list.useQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 100,
  })

  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Ticket updated')
      refetch()
      setDetailsOpen(false)
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`)
    },
  })

  const handleOpenDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setNewStatus(ticket.status as TicketStatus)
    setAdminNotes(ticket.admin_notes || '')
    setDetailsOpen(true)
  }

  const handleUpdateStatus = () => {
    if (!selectedTicket) return
    updateStatusMutation.mutate({
      id: selectedTicket.id,
      status: newStatus,
      admin_notes: adminNotes || undefined,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Feedback & Tickets</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage user feedback and support tickets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {stats?.byStatus.open || 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Loader2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">
                {stats?.byStatus.in_progress || 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.byStatus.resolved || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>
                {ticketsData?.total || 0} tickets total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TICKET_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TicketType | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TICKET_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : ticketsData?.tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tickets found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Ticket</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">Submitted</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsData?.tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => handleOpenDetails(ticket as Ticket)}
                  >
                    <TableCell className="font-mono text-xs">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TICKET_TYPE_COLORS[ticket.type as TicketType]}
                      >
                        <span className="flex items-center gap-1">
                          {TYPE_ICONS[ticket.type as TicketType]}
                          {TICKET_TYPE_LABELS[ticket.type as TicketType]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TICKET_PRIORITY_COLORS[ticket.priority as TicketPriority]}
                      >
                        {TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TICKET_STATUS_COLORS[ticket.status as TicketStatus]}
                      >
                        {TICKET_STATUS_LABELS[ticket.status as TicketStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {selectedTicket.ticket_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={TICKET_TYPE_COLORS[selectedTicket.type as TicketType]}
                  >
                    {TYPE_ICONS[selectedTicket.type as TicketType]}
                    {TICKET_TYPE_LABELS[selectedTicket.type as TicketType]}
                  </Badge>
                </DialogTitle>
                <DialogDescription>{selectedTicket.title}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={TICKET_PRIORITY_COLORS[selectedTicket.priority as TicketPriority]}
                      >
                        {TICKET_PRIORITY_LABELS[selectedTicket.priority as TicketPriority]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted By</Label>
                    <p className="mt-1">
                      {selectedTicket.submitted_by_name || selectedTicket.submitted_by_email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Page URL</Label>
                    <a
                      href={selectedTicket.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      {selectedTicket.page_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="mt-1 text-xs">{formatDate(selectedTicket.created_at)}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Screenshot */}
                {selectedTicket.screenshot_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Screenshot
                    </Label>
                    <a
                      href={selectedTicket.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={selectedTicket.screenshot_url}
                        alt="Ticket screenshot"
                        className="mt-2 max-h-48 rounded-md border cursor-pointer hover:opacity-90"
                      />
                    </a>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Update Status</Label>
                      <Select
                        value={newStatus}
                        onValueChange={(v) => setNewStatus(v as TicketStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {TICKET_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Textarea
                      placeholder="Add notes about this ticket..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Ticket'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
