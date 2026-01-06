'use client'

import { useState, useEffect } from 'react'
import { supabase, ActivityLog, ActivityType, ActivityOutcome, ACTIVITY_TYPES, Company, Contact } from '@/lib/supabase'

interface ActivityLogViewProps {
  companyId?: string
  contactId?: string
  quoteId?: string
  quoteType?: 'dismantling' | 'inland'
  compact?: boolean
  onShowToast?: (message: string, type: 'success' | 'error') => void
}

export default function ActivityLogView({
  companyId,
  contactId,
  quoteId,
  quoteType,
  compact = false,
  onShowToast
}: ActivityLogViewProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    activity_type: 'note' as ActivityType,
    title: '',
    description: '',
    company_id: companyId || '',
    contact_id: contactId || '',
    duration_minutes: '',
    outcome: '' as ActivityOutcome | '',
    follow_up_date: ''
  })

  useEffect(() => {
    loadActivities()
    if (!companyId) loadCompanies()
    if (!contactId) loadContacts()
  }, [companyId, contactId, quoteId])

  const loadActivities = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (companyId) query = query.eq('company_id', companyId)
      if (contactId) query = query.eq('contact_id', contactId)
      if (quoteId) {
        query = query.eq('quote_id', quoteId)
        if (quoteType) query = query.eq('quote_type', quoteType)
      }

      const { data, error } = await query

      if (error) throw error
      setActivities(data || [])
    } catch (err) {
      console.error('Error loading activities:', err)
      onShowToast?.('Failed to load activities', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name')
    if (data) setCompanies(data as Company[])
  }

  const loadContacts = async () => {
    let query = supabase.from('contacts').select('id, first_name, last_name, company_id').order('first_name')
    if (formData.company_id) {
      query = query.eq('company_id', formData.company_id)
    }
    const { data } = await query
    if (data) setContacts(data as Contact[])
  }

  // Load contacts when company changes
  useEffect(() => {
    if (formData.company_id && !contactId) {
      loadContacts()
    }
  }, [formData.company_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const activityData = {
        activity_type: formData.activity_type,
        title: formData.title,
        description: formData.description || null,
        company_id: formData.company_id || companyId || null,
        contact_id: formData.contact_id || contactId || null,
        quote_id: quoteId || null,
        quote_type: quoteType || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        outcome: formData.outcome || null,
        follow_up_date: formData.follow_up_date || null
      }

      if (editingActivity) {
        const { error } = await supabase
          .from('activity_logs')
          .update({ ...activityData, updated_at: new Date().toISOString() })
          .eq('id', editingActivity.id)

        if (error) throw error
        onShowToast?.('Activity updated', 'success')
      } else {
        const { error } = await supabase
          .from('activity_logs')
          .insert(activityData)

        if (error) throw error
        onShowToast?.('Activity logged', 'success')
      }

      setShowAddModal(false)
      setEditingActivity(null)
      resetForm()
      loadActivities()
    } catch (err) {
      console.error('Error saving activity:', err)
      onShowToast?.('Failed to save activity', 'error')
    }
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return

    try {
      const { error } = await supabase.from('activity_logs').delete().eq('id', id)
      if (error) throw error
      onShowToast?.('Activity deleted', 'success')
      loadActivities()
    } catch (err) {
      console.error('Error deleting activity:', err)
      onShowToast?.('Failed to delete activity', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      activity_type: 'note',
      title: '',
      description: '',
      company_id: companyId || '',
      contact_id: contactId || '',
      duration_minutes: '',
      outcome: '',
      follow_up_date: ''
    })
  }

  const openEditModal = (activity: ActivityLog) => {
    setEditingActivity(activity)
    setFormData({
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description || '',
      company_id: activity.company_id || '',
      contact_id: activity.contact_id || '',
      duration_minutes: activity.duration_minutes?.toString() || '',
      outcome: activity.outcome || '',
      follow_up_date: activity.follow_up_date || ''
    })
    setShowAddModal(true)
  }

  const getActivityIcon = (type: ActivityType) => {
    const icons: Record<ActivityType, JSX.Element> = {
      call: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      email: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      quote_sent: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      quote_accepted: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      quote_rejected: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      meeting: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      note: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      task: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      follow_up: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      status_change: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
    return icons[type] || icons.note
  }

  const getActivityColor = (type: ActivityType) => {
    const colors: Record<ActivityType, string> = {
      call: 'bg-blue-100 text-blue-600',
      email: 'bg-green-100 text-green-600',
      quote_sent: 'bg-purple-100 text-purple-600',
      quote_accepted: 'bg-emerald-100 text-emerald-600',
      quote_rejected: 'bg-red-100 text-red-600',
      meeting: 'bg-amber-100 text-amber-600',
      note: 'bg-gray-100 text-gray-600',
      task: 'bg-teal-100 text-teal-600',
      follow_up: 'bg-orange-100 text-orange-600',
      status_change: 'bg-indigo-100 text-indigo-600'
    }
    return colors[type] || colors.note
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (isLoading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-4' : 'p-4 border-b border-gray-200'}`}>
        <h3 className={`font-semibold ${compact ? 'text-base' : 'text-lg'} text-gray-900`}>
          Activity Log
        </h3>
        <button
          onClick={() => { resetForm(); setShowAddModal(true) }}
          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          + Log Activity
        </button>
      </div>

      {/* Activity List */}
      <div className={compact ? '' : 'p-4'}>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No activities logged yet</p>
            <button
              onClick={() => { resetForm(); setShowAddModal(true) }}
              className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Log your first activity
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {ACTIVITY_TYPES.find(t => t.value === activity.activity_type)?.label || activity.activity_type}
                        {activity.duration_minutes && ` • ${activity.duration_minutes} min`}
                        {activity.outcome && ` • ${activity.outcome}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(activity.created_at)}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => openEditModal(activity)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteActivity(activity.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                  )}
                  {activity.follow_up_date && !activity.follow_up_completed && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Follow-up: {new Date(activity.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingActivity ? 'Edit Activity' : 'Log Activity'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingActivity(null); resetForm() }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY_TYPES.slice(0, 6).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, activity_type: type.value }))}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        formData.activity_type === type.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="Brief summary of the activity"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="Additional details..."
                />
              </div>

              {/* Company Selection (if not fixed) */}
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

              {/* Contact Selection (if not fixed) */}
              {!contactId && contacts.length > 0 && (
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

              {/* Duration & Outcome (for calls/meetings) */}
              {(formData.activity_type === 'call' || formData.activity_type === 'meeting') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                    <select
                      value={formData.outcome}
                      onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value as ActivityOutcome }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                      <option value="no_answer">No Answer</option>
                      <option value="voicemail">Voicemail</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Follow-up</label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingActivity(null); resetForm() }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700"
                >
                  {editingActivity ? 'Update' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
