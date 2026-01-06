'use client'

import { useState, useEffect } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import { parseEmailSignature } from '@/lib/emailSignatureParser'
import AdvancedImportView from './AdvancedImportView'

interface ClientManagementViewProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void
}

// Empty client template
const emptyClient: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  company: null,
  email: null,
  phone: null,
  address: null,
  billing_address: null,
  billing_city: null,
  billing_state: null,
  billing_zip: null,
  payment_terms: null,
  notes: null,
}

export default function ClientManagementView({ onShowToast }: ClientManagementViewProps) {
  const [clients, setClients] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editForm, setEditForm] = useState<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>(emptyClient)
  const [isSaving, setIsSaving] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showImport, setShowImport] = useState(false)
  const [showSignatureParser, setShowSignatureParser] = useState(false)
  const [signatureText, setSignatureText] = useState('')

  // Load clients on mount
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
      onShowToast?.('Failed to load clients', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort clients
  const filteredClients = clients
    .filter((client) => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        client.name.toLowerCase().includes(search) ||
        client.company?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.phone?.includes(search)
      )
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'company') {
        comparison = (a.company || '').localeCompare(b.company || '')
      } else if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Start creating a new client
  const handleCreate = () => {
    setSelectedClient(null)
    setEditForm(emptyClient)
    setIsCreating(true)
    setIsEditing(true)
  }

  // Start editing a client
  const handleEdit = (client: Customer) => {
    setSelectedClient(client)
    setEditForm({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      billing_address: client.billing_address,
      billing_city: client.billing_city,
      billing_state: client.billing_state,
      billing_zip: client.billing_zip,
      payment_terms: client.payment_terms,
      notes: client.notes,
    })
    setIsCreating(false)
    setIsEditing(true)
  }

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setEditForm(emptyClient)
  }

  // Parse email signature and fill form
  const handleParseSignature = () => {
    if (!signatureText.trim()) {
      onShowToast?.('Please paste an email signature first', 'error')
      return
    }

    const parsed = parseEmailSignature(signatureText)

    // Merge parsed data with existing form (only fill empty fields or overwrite if parsed has value)
    setEditForm(prev => ({
      ...prev,
      name: parsed.name || prev.name,
      company: parsed.company || prev.company,
      email: parsed.email || prev.email,
      phone: parsed.phone || prev.phone,
      address: parsed.address || prev.address,
      billing_address: parsed.billing_address || prev.billing_address,
      billing_city: parsed.billing_city || prev.billing_city,
      billing_state: parsed.billing_state || prev.billing_state,
      billing_zip: parsed.billing_zip || prev.billing_zip,
    }))

    // Show what was parsed
    const fieldsFound = Object.entries(parsed).filter(([, v]) => v).map(([k]) => k)
    if (fieldsFound.length > 0) {
      onShowToast?.(`Parsed: ${fieldsFound.join(', ')}`, 'success')
    } else {
      onShowToast?.('Could not extract any information from the signature', 'error')
    }

    setShowSignatureParser(false)
    setSignatureText('')
  }

  // Save client (create or update)
  const handleSave = async () => {
    if (!editForm.name.trim()) {
      onShowToast?.('Client name is required', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (isCreating) {
        // Create new client
        const { data, error } = await supabase
          .from('customers')
          .insert({
            name: editForm.name.trim(),
            company: editForm.company?.trim() || null,
            email: editForm.email?.trim() || null,
            phone: editForm.phone?.trim() || null,
            address: editForm.address?.trim() || null,
            billing_address: editForm.billing_address?.trim() || null,
            billing_city: editForm.billing_city?.trim() || null,
            billing_state: editForm.billing_state?.trim() || null,
            billing_zip: editForm.billing_zip?.trim() || null,
            payment_terms: editForm.payment_terms?.trim() || null,
            notes: editForm.notes?.trim() || null,
          })
          .select()
          .single()

        if (error) throw error

        setClients((prev) => [...prev, data])
        onShowToast?.('Client created successfully', 'success')
      } else if (selectedClient) {
        // Update existing client
        const { error } = await supabase
          .from('customers')
          .update({
            name: editForm.name.trim(),
            company: editForm.company?.trim() || null,
            email: editForm.email?.trim() || null,
            phone: editForm.phone?.trim() || null,
            address: editForm.address?.trim() || null,
            billing_address: editForm.billing_address?.trim() || null,
            billing_city: editForm.billing_city?.trim() || null,
            billing_state: editForm.billing_state?.trim() || null,
            billing_zip: editForm.billing_zip?.trim() || null,
            payment_terms: editForm.payment_terms?.trim() || null,
            notes: editForm.notes?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedClient.id)

        if (error) throw error

        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? { ...c, ...editForm, updated_at: new Date().toISOString() }
              : c
          )
        )
        onShowToast?.('Client updated successfully', 'success')
      }

      handleCancel()
    } catch (err) {
      console.error('Error saving client:', err)
      onShowToast?.('Failed to save client', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete client
  const handleDelete = async (client: Customer) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from('customers').delete().eq('id', client.id)

      if (error) throw error

      setClients((prev) => prev.filter((c) => c.id !== client.id))
      if (selectedClient?.id === client.id) {
        setSelectedClient(null)
        setIsEditing(false)
      }
      onShowToast?.('Client deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting client:', err)
      onShowToast?.('Failed to delete client', 'error')
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr))
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Client List */}
        <div className="flex-1 order-2 lg:order-1">
          {/* Search and Sort */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, company, email, or phone..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'company' | 'created_at')}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="company">Sort by Company</option>
                  <option value="created_at">Sort by Date Added</option>
                </select>
                <button
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Client List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-500 mt-4">
                {searchTerm ? 'No clients match your search' : 'No clients yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreate}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first client
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client)
                    setIsEditing(false)
                  }}
                  className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedClient?.id === client.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{client.name}</h3>
                        {client.company && (
                          <span className="text-sm text-gray-500">@ {client.company}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(client)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(client)
                        }}
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

        {/* Right: Details/Edit Panel */}
        <div className="w-full lg:w-96 order-1 lg:order-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            {isEditing ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {isCreating ? 'New Client' : 'Edit Client'}
                </h2>

                {/* Email Signature Parser Button */}
                <button
                  onClick={() => setShowSignatureParser(true)}
                  className="w-full mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-indigo-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-purple-700">Paste Email Signature</p>
                      <p className="text-xs text-purple-500">Auto-fill fields from signature</p>
                    </div>
                    <svg className="w-5 h-5 text-purple-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={editForm.company || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Full address"
                    />
                  </div>

                  {/* Billing Information Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Billing Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                        <input
                          type="text"
                          value={editForm.billing_address || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, billing_address: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                          placeholder="Street address"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={editForm.billing_city || ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, billing_city: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            placeholder="City"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            value={editForm.billing_state || ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, billing_state: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            placeholder="State"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                          <input
                            type="text"
                            value={editForm.billing_zip || ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, billing_zip: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            placeholder="ZIP"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                        <select
                          value={editForm.payment_terms || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        >
                          <option value="">Select payment terms...</option>
                          <option value="Due on Receipt">Due on Receipt</option>
                          <option value="Net 15">Net 15</option>
                          <option value="Net 30">Net 30</option>
                          <option value="Net 45">Net 45</option>
                          <option value="Net 60">Net 60</option>
                          <option value="2/10 Net 30">2/10 Net 30</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Internal notes about this client..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Saving...' : isCreating ? 'Create Client' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : selectedClient ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Client Details</h2>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="font-medium text-gray-900">{selectedClient.name}</p>
                  </div>
                  {selectedClient.company && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Company</label>
                      <p className="text-gray-700">{selectedClient.company}</p>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-gray-700">
                        <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline">
                          {selectedClient.email}
                        </a>
                      </p>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
                      <p className="text-gray-700">
                        <a href={`tel:${selectedClient.phone}`} className="text-blue-600 hover:underline">
                          {selectedClient.phone}
                        </a>
                      </p>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Address</label>
                      <p className="text-gray-700 whitespace-pre-line">{selectedClient.address}</p>
                    </div>
                  )}

                  {/* Billing Information */}
                  {(selectedClient.billing_address || selectedClient.billing_city || selectedClient.payment_terms) && (
                    <div className="pt-3 border-t border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Billing Information
                      </label>
                      {selectedClient.billing_address && (
                        <p className="text-gray-700 mt-1">{selectedClient.billing_address}</p>
                      )}
                      {(selectedClient.billing_city || selectedClient.billing_state || selectedClient.billing_zip) && (
                        <p className="text-gray-700">
                          {[selectedClient.billing_city, selectedClient.billing_state, selectedClient.billing_zip]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {selectedClient.payment_terms && (
                        <p className="text-gray-600 text-sm mt-1">
                          <span className="font-medium">Terms:</span> {selectedClient.payment_terms}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedClient.notes && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
                      <p className="text-gray-700 whitespace-pre-line">{selectedClient.notes}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Added: {formatDate(selectedClient.created_at)}</span>
                      <span>Updated: {formatDate(selectedClient.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(selectedClient)}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Edit Client
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <p className="text-gray-500 mt-4">Select a client to view details</p>
                <p className="text-gray-400 text-sm mt-1">or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Import Clients from CSV</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <AdvancedImportView
                targetTable="customers"
                onImportComplete={() => {
                  setShowImport(false)
                  loadClients()
                  onShowToast?.('Clients imported successfully!', 'success')
                }}
                onShowToast={onShowToast || (() => {})}
                onClose={() => setShowImport(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Signature Parser Modal */}
      {showSignatureParser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Parse Email Signature</h3>
                  <p className="text-sm text-gray-500">Paste a signature to auto-fill client info</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSignatureParser(false)
                  setSignatureText('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste email signature here
                </label>
                <textarea
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-mono text-sm"
                  placeholder={`Example:
John Smith
Sales Manager at ABC Company Inc.
john.smith@abccompany.com
(555) 123-4567
123 Main Street
New York, NY 10001`}
                />
              </div>
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-700">
                  <strong>Tip:</strong> Select and copy the signature block from an email, then paste it above.
                  The parser will extract name, company, email, phone, and address.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleParseSignature}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Parse & Fill Fields
                </button>
                <button
                  onClick={() => {
                    setShowSignatureParser(false)
                    setSignatureText('')
                  }}
                  className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
