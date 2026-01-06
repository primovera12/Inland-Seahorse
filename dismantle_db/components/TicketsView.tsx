'use client'

import { useState, useEffect } from 'react'
import { supabase, Ticket, TicketType, TicketStatus, TicketPriority, TICKET_TYPES, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_PAGES } from '@/lib/supabase'

interface TicketsViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

export default function TicketsView({ showToast }: TicketsViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Edit state
  const [editStatus, setEditStatus] = useState<TicketStatus>('new')
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium')
  const [editAdminNotes, setEditAdminNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load tickets
  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      showToast('Failed to load tickets', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false
    if (typeFilter !== 'all' && ticket.type !== typeFilter) return false
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        ticket.title.toLowerCase().includes(search) ||
        ticket.description.toLowerCase().includes(search) ||
        ticket.ticket_number.toLowerCase().includes(search) ||
        (ticket.submitted_by?.toLowerCase().includes(search) ?? false)
      )
    }
    return true
  })

  // Open ticket detail
  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setEditStatus(ticket.status)
    setEditPriority(ticket.priority)
    setEditAdminNotes(ticket.admin_notes || '')
    setShowDetailModal(true)
  }

  // Save ticket changes
  const saveTicketChanges = async () => {
    if (!selectedTicket) return

    setIsSaving(true)
    try {
      const updates: Partial<Ticket> = {
        status: editStatus,
        priority: editPriority,
        admin_notes: editAdminNotes || null,
        updated_at: new Date().toISOString(),
      }

      // Set resolved_at if status changed to resolved
      if (editStatus === 'resolved' && selectedTicket.status !== 'resolved') {
        updates.resolved_at = new Date().toISOString()
      } else if (editStatus !== 'resolved') {
        updates.resolved_at = null
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', selectedTicket.id)

      if (error) throw error

      // Update local state
      setTickets(prev => prev.map(t =>
        t.id === selectedTicket.id ? { ...t, ...updates } : t
      ))
      setSelectedTicket({ ...selectedTicket, ...updates })

      showToast('Ticket updated successfully', 'success')
    } catch (err) {
      console.error('Error updating ticket:', err)
      showToast('Failed to update ticket', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete ticket
  const deleteTicket = async (ticket: Ticket) => {
    if (!confirm(`Are you sure you want to delete ticket ${ticket.ticket_number}?`)) return

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticket.id)

      if (error) throw error

      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      if (selectedTicket?.id === ticket.id) {
        setShowDetailModal(false)
        setSelectedTicket(null)
      }

      showToast('Ticket deleted', 'success')
    } catch (err) {
      console.error('Error deleting ticket:', err)
      showToast('Failed to delete ticket', 'error')
    }
  }

  // Get status badge
  const getStatusBadge = (status: TicketStatus) => {
    const statusInfo = TICKET_STATUSES.find(s => s.value === status)
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}>
        {statusInfo?.label || status}
      </span>
    )
  }

  // Get type badge
  const getTypeBadge = (type: TicketType) => {
    const typeInfo = TICKET_TYPES.find(t => t.value === type)
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo?.color || 'bg-gray-100 text-gray-700'}`}>
        {typeInfo?.label || type}
      </span>
    )
  }

  // Get priority badge
  const getPriorityBadge = (priority: TicketPriority) => {
    const priorityInfo = TICKET_PRIORITIES.find(p => p.value === priority)
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityInfo?.color || 'bg-gray-100 text-gray-700'}`}>
        {priorityInfo?.label || priority}
      </span>
    )
  }

  // Get page label
  const getPageLabel = (pageValue: string) => {
    const pageInfo = TICKET_PAGES.find(p => p.value === pageValue)
    return pageInfo?.label || pageValue
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Stats
  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    features: tickets.filter(t => t.type === 'feature').length,
    updates: tickets.filter(t => t.type === 'update').length,
    errors: tickets.filter(t => t.type === 'error').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets & Feature Requests</h1>
          <p className="text-gray-600">Manage submitted tickets, feature requests, and bug reports</p>
        </div>
        <button
          onClick={loadTickets}
          className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Tickets</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-700">{stats.new}</div>
          <div className="text-sm text-yellow-600">New</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
          <div className="text-sm text-blue-600">In Progress</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.resolved}</div>
          <div className="text-sm text-green-600">Resolved</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-700">{stats.features}</div>
          <div className="text-sm text-emerald-600">Features</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100">
          <div className="text-2xl font-bold text-indigo-700">{stats.updates}</div>
          <div className="text-sm text-indigo-600">Updates</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100">
          <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            {TICKET_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TicketType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            {TICKET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Priorities</option>
            {TICKET_PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <svg className="w-8 h-8 animate-spin mx-auto text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-2 text-gray-500">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No tickets found</p>
            {(statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setTypeFilter('all')
                  setPriorityFilter('all')
                  setSearchTerm('')
                }}
                className="mt-2 text-purple-600 hover:text-purple-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openTicketDetail(ticket)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {ticket.screenshot_base64 && (
                          <img
                            src={ticket.screenshot_base64}
                            alt="Screenshot"
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{ticket.title}</div>
                          <div className="text-sm text-gray-500">{ticket.ticket_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getTypeBadge(ticket.type)}</td>
                    <td className="px-4 py-4">{getStatusBadge(ticket.status)}</td>
                    <td className="px-4 py-4">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{getPageLabel(ticket.page)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">{formatDate(ticket.created_at)}</div>
                      {ticket.submitted_by && (
                        <div className="text-xs text-gray-400">by {ticket.submitted_by}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTicket(ticket)
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete ticket"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.title}</h2>
                  {getTypeBadge(selectedTicket.type)}
                </div>
                <p className="text-sm text-gray-500">{selectedTicket.ticket_number}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Screenshot */}
              {selectedTicket.screenshot_base64 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Screenshot</label>
                  <img
                    src={selectedTicket.screenshot_base64}
                    alt="Screenshot"
                    className="w-full max-h-80 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <div className="p-4 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Page</label>
                  <div className="text-sm font-medium text-gray-900">{getPageLabel(selectedTicket.page)}</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Submitted By</label>
                  <div className="text-sm font-medium text-gray-900">{selectedTicket.submitted_by || 'Anonymous'}</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <div className="text-sm font-medium text-gray-900">{selectedTicket.submitted_email || 'Not provided'}</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Created</label>
                  <div className="text-sm font-medium text-gray-900">{formatDate(selectedTicket.created_at)}</div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Manage Ticket</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as TicketStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {TICKET_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {TICKET_PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Add internal notes about this ticket..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                {selectedTicket.resolved_at && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    Resolved on {formatDate(selectedTicket.resolved_at)}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveTicketChanges}
                    disabled={isSaving}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteTicket(selectedTicket)}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
