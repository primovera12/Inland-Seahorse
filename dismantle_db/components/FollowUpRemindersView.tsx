'use client'

import { useState, useEffect } from 'react'
import { supabase, FollowUpReminder, ReminderPriority, ReminderStatus, REMINDER_PRIORITIES, Company, Contact } from '@/lib/supabase'

interface FollowUpRemindersViewProps {
  companyId?: string
  onShowToast?: (message: string, type: 'success' | 'error') => void
}

interface ReminderWithRelations extends FollowUpReminder {
  company?: { name: string } | null
  contact?: { first_name: string; last_name: string | null } | null
}

export default function FollowUpRemindersView({ companyId, onShowToast }: FollowUpRemindersViewProps) {
  const [reminders, setReminders] = useState<ReminderWithRelations[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderWithRelations | null>(null)
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_id: companyId || '',
    contact_id: '',
    reminder_date: '',
    reminder_time: '',
    priority: 'medium' as ReminderPriority
  })

  useEffect(() => {
    loadReminders()
    if (!companyId) loadCompanies()
  }, [companyId, filter])

  useEffect(() => {
    if (formData.company_id) loadContacts()
  }, [formData.company_id])

  const loadReminders = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('follow_up_reminders')
        .select(`
          *,
          company:companies(name),
          contact:contacts(first_name, last_name)
        `)
        .in('status', ['pending', 'snoozed'])
        .order('reminder_date', { ascending: true })

      if (companyId) query = query.eq('company_id', companyId)

      const today = new Date().toISOString().split('T')[0]

      if (filter === 'today') {
        query = query.eq('reminder_date', today)
      } else if (filter === 'overdue') {
        query = query.lt('reminder_date', today)
      } else if (filter === 'upcoming') {
        query = query.gt('reminder_date', today)
      }

      const { data, error } = await query

      if (error) throw error
      setReminders(data || [])
    } catch (err) {
      console.error('Error loading reminders:', err)
      onShowToast?.('Failed to load reminders', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name')
    if (data) setCompanies(data as Company[])
  }

  const loadContacts = async () => {
    let query = supabase.from('contacts').select('id, first_name, last_name, company_id')
    if (formData.company_id) {
      query = query.eq('company_id', formData.company_id)
    }
    const { data } = await query.order('first_name')
    if (data) setContacts(data as Contact[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const reminderData = {
        title: formData.title,
        description: formData.description || null,
        company_id: formData.company_id || companyId || null,
        contact_id: formData.contact_id || null,
        reminder_date: formData.reminder_date,
        reminder_time: formData.reminder_time || null,
        priority: formData.priority,
        status: 'pending' as ReminderStatus
      }

      if (editingReminder) {
        const { error } = await supabase
          .from('follow_up_reminders')
          .update({ ...reminderData, updated_at: new Date().toISOString() })
          .eq('id', editingReminder.id)

        if (error) throw error
        onShowToast?.('Reminder updated', 'success')
      } else {
        const { error } = await supabase.from('follow_up_reminders').insert(reminderData)
        if (error) throw error
        onShowToast?.('Reminder created', 'success')
      }

      setShowAddModal(false)
      setEditingReminder(null)
      resetForm()
      loadReminders()
    } catch (err) {
      console.error('Error saving reminder:', err)
      onShowToast?.('Failed to save reminder', 'error')
    }
  }

  const completeReminder = async (reminder: ReminderWithRelations) => {
    try {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reminder.id)

      if (error) throw error
      onShowToast?.('Reminder completed', 'success')
      loadReminders()
    } catch (err) {
      console.error('Error completing reminder:', err)
      onShowToast?.('Failed to complete reminder', 'error')
    }
  }

  const snoozeReminder = async (reminder: ReminderWithRelations, days: number) => {
    const snoozedDate = new Date()
    snoozedDate.setDate(snoozedDate.getDate() + days)

    try {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({
          status: 'snoozed',
          snoozed_until: snoozedDate.toISOString().split('T')[0],
          snooze_count: (reminder.snooze_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', reminder.id)

      if (error) throw error
      onShowToast?.(`Snoozed for ${days} day${days > 1 ? 's' : ''}`, 'success')
      loadReminders()
    } catch (err) {
      console.error('Error snoozing reminder:', err)
      onShowToast?.('Failed to snooze reminder', 'error')
    }
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Delete this reminder?')) return

    try {
      const { error } = await supabase.from('follow_up_reminders').delete().eq('id', id)
      if (error) throw error
      onShowToast?.('Reminder deleted', 'success')
      loadReminders()
    } catch (err) {
      console.error('Error deleting reminder:', err)
      onShowToast?.('Failed to delete reminder', 'error')
    }
  }

  const resetForm = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    setFormData({
      title: '',
      description: '',
      company_id: companyId || '',
      contact_id: '',
      reminder_date: tomorrow.toISOString().split('T')[0],
      reminder_time: '09:00',
      priority: 'medium'
    })
  }

  const openEditModal = (reminder: ReminderWithRelations) => {
    setEditingReminder(reminder)
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      company_id: reminder.company_id || '',
      contact_id: reminder.contact_id || '',
      reminder_date: reminder.reminder_date,
      reminder_time: reminder.reminder_time || '',
      priority: reminder.priority
    })
    setShowAddModal(true)
  }

  const getPriorityColor = (priority: ReminderPriority) => {
    const colors: Record<ReminderPriority, string> = {
      low: 'bg-gray-100 text-gray-600 border-gray-200',
      medium: 'bg-blue-100 text-blue-600 border-blue-200',
      high: 'bg-orange-100 text-orange-600 border-orange-200',
      urgent: 'bg-red-100 text-red-600 border-red-200'
    }
    return colors[priority]
  }

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date(new Date().toISOString().split('T')[0])
  }

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0]
  }

  const overdueCount = reminders.filter(r => isOverdue(r.reminder_date)).length
  const todayCount = reminders.filter(r => isToday(r.reminder_date)).length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Follow-up Reminders</h3>
            <p className="text-sm text-gray-500">
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium">{overdueCount} overdue</span>
              )}
              {overdueCount > 0 && todayCount > 0 && ' • '}
              {todayCount > 0 && (
                <span className="text-blue-600 font-medium">{todayCount} due today</span>
              )}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true) }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Reminder
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'today', 'overdue', 'upcoming'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No reminders {filter !== 'all' ? `(${filter})` : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`p-4 rounded-lg border ${
                  isOverdue(reminder.reminder_date)
                    ? 'bg-red-50 border-red-200'
                    : isToday(reminder.reminder_date)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                      {isOverdue(reminder.reminder_date) && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Overdue
                        </span>
                      )}
                      {isToday(reminder.reminder_date) && !isOverdue(reminder.reminder_date) && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Today
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                    {reminder.description && (
                      <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(reminder.reminder_date).toLocaleDateString()}
                        {reminder.reminder_time && ` at ${reminder.reminder_time}`}
                      </span>
                      {reminder.company && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {reminder.company.name}
                        </span>
                      )}
                      {reminder.contact && (
                        <span>
                          {reminder.contact.first_name} {reminder.contact.last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Complete Button */}
                    <button
                      onClick={() => completeReminder(reminder)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Complete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    {/* Snooze Dropdown */}
                    <div className="relative group">
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Snooze"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-10">
                        <button
                          onClick={() => snoozeReminder(reminder, 1)}
                          className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                        >
                          1 day
                        </button>
                        <button
                          onClick={() => snoozeReminder(reminder, 3)}
                          className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                        >
                          3 days
                        </button>
                        <button
                          onClick={() => snoozeReminder(reminder, 7)}
                          className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                        >
                          1 week
                        </button>
                      </div>
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(reminder)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingReminder(null); resetForm() }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="Follow up on quote"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminder_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="flex gap-2">
                  {REMINDER_PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        formData.priority === p.value
                          ? getPriorityColor(p.value) + ' font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company */}
              {!companyId && companies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value, contact_id: '' }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  >
                    <option value="">Select company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contact */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <select
                    value={formData.contact_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingReminder(null); resetForm() }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700"
                >
                  {editingReminder ? 'Update' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
