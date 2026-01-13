'use client'

import { useState, useEffect } from 'react'
import { supabase, Company, Contact, CompanyWithContacts, CompanyStatus, ContactRole } from '@/lib/supabase'
import AdvancedImportView from './AdvancedImportView'

interface CompanyManagementViewProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void
}

const COMPANY_STATUSES: { value: CompanyStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'prospect', label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
  { value: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
]

const CONTACT_ROLES: { value: ContactRole; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'billing', label: 'Billing' },
  { value: 'operations', label: 'Operations' },
  { value: 'technical', label: 'Technical' },
]

const emptyCompany: Omit<Company, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  industry: null,
  website: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  zip: null,
  billing_address: null,
  billing_city: null,
  billing_state: null,
  billing_zip: null,
  payment_terms: 'Net 30',
  tax_id: null,
  tags: [],
  status: 'active',
  notes: null,
}

const emptyContact: Omit<Contact, 'id' | 'created_at' | 'updated_at'> = {
  company_id: null,
  first_name: '',
  last_name: null,
  title: null,
  email: null,
  phone: null,
  mobile: null,
  role: 'general',
  is_primary: false,
  notes: null,
}

export default function CompanyManagementView({ onShowToast }: CompanyManagementViewProps) {
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'all'>('all')
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null)

  // Company editing
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [companyForm, setCompanyForm] = useState<Omit<Company, 'id' | 'created_at' | 'updated_at'>>(emptyCompany)
  const [isSavingCompany, setIsSavingCompany] = useState(false)

  // Contact editing
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isCreatingContact, setIsCreatingContact] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>(emptyContact)
  const [isSavingContact, setIsSavingContact] = useState(false)

  // Tag input
  const [newTag, setNewTag] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Unassigned company for orphaned contacts
  const [unassignedCompanyId, setUnassignedCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
    loadUnassignedCompanyId()
  }, [])

  // Load "Unassigned" company ID for orphaned contacts fallback
  const loadUnassignedCompanyId = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Unassigned')
      .single()
    if (data) {
      setUnassignedCompanyId(data.id)
    }
  }

  const loadCompanies = async () => {
    setLoading(true)
    try {
      // Load companies with contact count
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (companiesError) throw companiesError

      // Load contacts for count
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('company_id')

      if (contactsError) throw contactsError

      // Count contacts per company
      const contactCounts: Record<string, number> = {}
      contactsData?.forEach(c => {
        if (c.company_id) {
          contactCounts[c.company_id] = (contactCounts[c.company_id] || 0) + 1
        }
      })

      const companiesWithCounts = (companiesData || []).map(company => ({
        ...company,
        contact_count: contactCounts[company.id] || 0,
      }))

      setCompanies(companiesWithCounts)
    } catch (err) {
      console.error('Error loading companies:', err)
      onShowToast?.('Failed to load companies', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanyContacts = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('first_name')

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error loading contacts:', err)
      return []
    }
  }

  const handleSelectCompany = async (company: CompanyWithContacts) => {
    const contacts = await loadCompanyContacts(company.id)
    setSelectedCompany({ ...company, contacts })
    setIsEditingCompany(false)
    setIsCreatingCompany(false)
    setIsEditingContact(false)
    setIsCreatingContact(false)
  }

  // Filter companies
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchTerm ||
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Company CRUD
  const handleCreateCompany = () => {
    setSelectedCompany(null)
    setCompanyForm(emptyCompany)
    setIsCreatingCompany(true)
    setIsEditingCompany(true)
  }

  const handleEditCompany = (company: CompanyWithContacts) => {
    setCompanyForm({
      name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zip: company.zip,
      billing_address: company.billing_address,
      billing_city: company.billing_city,
      billing_state: company.billing_state,
      billing_zip: company.billing_zip,
      payment_terms: company.payment_terms,
      tax_id: company.tax_id,
      tags: company.tags || [],
      status: company.status,
      notes: company.notes,
    })
    setIsCreatingCompany(false)
    setIsEditingCompany(true)
  }

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      onShowToast?.('Company name is required', 'error')
      return
    }

    setIsSavingCompany(true)
    try {
      if (isCreatingCompany) {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            name: companyForm.name.trim(),
            industry: companyForm.industry?.trim() || null,
            website: companyForm.website?.trim() || null,
            phone: companyForm.phone?.trim() || null,
            address: companyForm.address?.trim() || null,
            city: companyForm.city?.trim() || null,
            state: companyForm.state?.trim() || null,
            zip: companyForm.zip?.trim() || null,
            billing_address: companyForm.billing_address?.trim() || null,
            billing_city: companyForm.billing_city?.trim() || null,
            billing_state: companyForm.billing_state?.trim() || null,
            billing_zip: companyForm.billing_zip?.trim() || null,
            payment_terms: companyForm.payment_terms || 'Net 30',
            tax_id: companyForm.tax_id?.trim() || null,
            tags: companyForm.tags,
            status: companyForm.status,
            notes: companyForm.notes?.trim() || null,
          })
          .select()
          .single()

        if (error) throw error

        // Auto-create placeholder primary contact for the new company
        const { data: contactData } = await supabase
          .from('contacts')
          .insert({
            company_id: data.id,
            first_name: 'Primary Contact',
            role: 'general',
            is_primary: true,
          })
          .select()
          .single()

        const placeholderContact = contactData ? [contactData] : []
        setCompanies(prev => [...prev, { ...data, contact_count: placeholderContact.length }])
        setSelectedCompany({ ...data, contacts: placeholderContact, contact_count: placeholderContact.length })
        onShowToast?.('Company created successfully', 'success')
      } else if (selectedCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: companyForm.name.trim(),
            industry: companyForm.industry?.trim() || null,
            website: companyForm.website?.trim() || null,
            phone: companyForm.phone?.trim() || null,
            address: companyForm.address?.trim() || null,
            city: companyForm.city?.trim() || null,
            state: companyForm.state?.trim() || null,
            zip: companyForm.zip?.trim() || null,
            billing_address: companyForm.billing_address?.trim() || null,
            billing_city: companyForm.billing_city?.trim() || null,
            billing_state: companyForm.billing_state?.trim() || null,
            billing_zip: companyForm.billing_zip?.trim() || null,
            payment_terms: companyForm.payment_terms || 'Net 30',
            tax_id: companyForm.tax_id?.trim() || null,
            tags: companyForm.tags,
            status: companyForm.status,
            notes: companyForm.notes?.trim() || null,
          })
          .eq('id', selectedCompany.id)

        if (error) throw error

        const updatedCompany = { ...selectedCompany, ...companyForm }
        setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updatedCompany : c))
        setSelectedCompany(updatedCompany)
        onShowToast?.('Company updated successfully', 'success')
      }
      setIsEditingCompany(false)
      setIsCreatingCompany(false)
    } catch (err) {
      console.error('Error saving company:', err)
      onShowToast?.('Failed to save company', 'error')
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleDeleteCompany = async (company: CompanyWithContacts) => {
    if (!confirm(`Delete "${company.name}" and all its contacts? This cannot be undone.`)) return

    try {
      const { error } = await supabase.from('companies').delete().eq('id', company.id)
      if (error) throw error

      setCompanies(prev => prev.filter(c => c.id !== company.id))
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(null)
      }
      onShowToast?.('Company deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting company:', err)
      onShowToast?.('Failed to delete company', 'error')
    }
  }

  // Contact CRUD
  const handleCreateContact = () => {
    setContactForm({ ...emptyContact, company_id: selectedCompany?.id || null })
    setSelectedContact(null)
    setIsCreatingContact(true)
    setIsEditingContact(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setContactForm({
      company_id: contact.company_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      role: contact.role,
      is_primary: contact.is_primary,
      notes: contact.notes,
    })
    setIsCreatingContact(false)
    setIsEditingContact(true)
  }

  const handleSaveContact = async () => {
    if (!contactForm.first_name.trim()) {
      onShowToast?.('First name is required', 'error')
      return
    }

    setIsSavingContact(true)
    try {
      if (isCreatingContact) {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            company_id: contactForm.company_id || unassignedCompanyId,
            first_name: contactForm.first_name.trim(),
            last_name: contactForm.last_name?.trim() || null,
            title: contactForm.title?.trim() || null,
            email: contactForm.email?.trim() || null,
            phone: contactForm.phone?.trim() || null,
            mobile: contactForm.mobile?.trim() || null,
            role: contactForm.role,
            is_primary: contactForm.is_primary,
            notes: contactForm.notes?.trim() || null,
          })
          .select()
          .single()

        if (error) throw error

        if (selectedCompany) {
          const contacts = [...(selectedCompany.contacts || []), data]
          setSelectedCompany({ ...selectedCompany, contacts, contact_count: contacts.length })
          setCompanies(prev => prev.map(c =>
            c.id === selectedCompany.id ? { ...c, contact_count: contacts.length } : c
          ))
        }
        onShowToast?.('Contact created successfully', 'success')
      } else if (selectedContact) {
        const { error } = await supabase
          .from('contacts')
          .update({
            first_name: contactForm.first_name.trim(),
            last_name: contactForm.last_name?.trim() || null,
            title: contactForm.title?.trim() || null,
            email: contactForm.email?.trim() || null,
            phone: contactForm.phone?.trim() || null,
            mobile: contactForm.mobile?.trim() || null,
            role: contactForm.role,
            is_primary: contactForm.is_primary,
            notes: contactForm.notes?.trim() || null,
          })
          .eq('id', selectedContact.id)

        if (error) throw error

        if (selectedCompany) {
          const contacts = selectedCompany.contacts?.map(c =>
            c.id === selectedContact.id ? { ...c, ...contactForm } : c
          ) || []
          setSelectedCompany({ ...selectedCompany, contacts })
        }
        onShowToast?.('Contact updated successfully', 'success')
      }
      setIsEditingContact(false)
      setIsCreatingContact(false)
    } catch (err) {
      console.error('Error saving contact:', err)
      onShowToast?.('Failed to save contact', 'error')
    } finally {
      setIsSavingContact(false)
    }
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Delete contact "${contact.first_name} ${contact.last_name || ''}"?`)) return

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contact.id)
      if (error) throw error

      if (selectedCompany) {
        const contacts = selectedCompany.contacts?.filter(c => c.id !== contact.id) || []
        setSelectedCompany({ ...selectedCompany, contacts, contact_count: contacts.length })
        setCompanies(prev => prev.map(c =>
          c.id === selectedCompany.id ? { ...c, contact_count: contacts.length } : c
        ))
      }
      onShowToast?.('Contact deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting contact:', err)
      onShowToast?.('Failed to delete contact', 'error')
    }
  }

  // Tag management
  const handleAddTag = () => {
    if (newTag.trim() && !companyForm.tags.includes(newTag.trim())) {
      setCompanyForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setCompanyForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const getStatusBadge = (status: CompanyStatus) => {
    const statusConfig = COMPANY_STATUSES.find(s => s.value === status)
    return statusConfig ? (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    ) : null
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies & Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{companies.length} companies</p>
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
            onClick={handleCreateCompany}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Company List */}
        <div className="w-full lg:w-96 lg:flex-shrink-0">
          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search companies..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {COMPANY_STATUSES.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Company List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 mt-4">No companies found</p>
              <button onClick={handleCreateCompany} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
                Add your first company
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCompany?.id === company.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                        {getStatusBadge(company.status)}
                      </div>
                      {company.industry && (
                        <p className="text-sm text-gray-500 truncate">{company.industry}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {company.contact_count || 0} contacts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details Panel */}
        <div className="flex-1">
          {isEditingCompany ? (
            // Company Edit Form
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {isCreatingCompany ? 'New Company' : 'Edit Company'}
              </h2>
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={companyForm.industry || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="e.g., Construction, Manufacturing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={companyForm.status}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, status: e.target.value as CompanyStatus }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    >
                      {COMPANY_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={companyForm.phone || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={companyForm.website || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {companyForm.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="Add tag..."
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Primary Address */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Primary Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={companyForm.address || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={companyForm.city || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="City"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={companyForm.state || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={companyForm.zip || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, zip: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Billing Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={companyForm.billing_address || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, billing_address: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="Billing street address"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={companyForm.billing_city || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, billing_city: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="City"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={companyForm.billing_state || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, billing_state: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={companyForm.billing_zip || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, billing_zip: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="ZIP"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <select
                        value={companyForm.payment_terms || 'Net 30'}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                        <option value="2/10 Net 30">2/10 Net 30</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                      <input
                        type="text"
                        value={companyForm.tax_id || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, tax_id: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={companyForm.notes || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="Internal notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveCompany}
                    disabled={isSavingCompany}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSavingCompany ? 'Saving...' : isCreatingCompany ? 'Create Company' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => { setIsEditingCompany(false); setIsCreatingCompany(false) }}
                    className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : isEditingContact ? (
            // Contact Edit Form
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {isCreatingContact ? 'New Contact' : 'Edit Contact'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactForm.first_name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={contactForm.last_name || ''}
                      onChange={(e) => setContactForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={contactForm.title || ''}
                      onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="e.g., Project Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={contactForm.role}
                      onChange={(e) => setContactForm(prev => ({ ...prev, role: e.target.value as ContactRole }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    >
                      {CONTACT_ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={contactForm.email || ''}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={contactForm.phone || ''}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={contactForm.mobile || ''}
                      onChange={(e) => setContactForm(prev => ({ ...prev, mobile: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contactForm.is_primary}
                        onChange={(e) => setContactForm(prev => ({ ...prev, is_primary: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Primary Contact</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={contactForm.notes || ''}
                    onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveContact}
                    disabled={isSavingContact}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSavingContact ? 'Saving...' : isCreatingContact ? 'Add Contact' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => { setIsEditingContact(false); setIsCreatingContact(false) }}
                    className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedCompany ? (
            // Company Details View
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h2>
                      {getStatusBadge(selectedCompany.status)}
                    </div>
                    {selectedCompany.industry && (
                      <p className="text-gray-500 mt-1">{selectedCompany.industry}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCompany(selectedCompany)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(selectedCompany)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {selectedCompany.tags && selectedCompany.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedCompany.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Company Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedCompany.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2 text-gray-900">{selectedCompany.phone}</span>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div>
                      <span className="text-gray-500">Website:</span>
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                        {selectedCompany.website}
                      </a>
                    </div>
                  )}
                  {selectedCompany.payment_terms && (
                    <div>
                      <span className="text-gray-500">Payment Terms:</span>
                      <span className="ml-2 text-gray-900">{selectedCompany.payment_terms}</span>
                    </div>
                  )}
                </div>

                {/* Address */}
                {(selectedCompany.address || selectedCompany.billing_address) && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                    {selectedCompany.address && (
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Primary Address</h4>
                        <p className="text-sm text-gray-900">{selectedCompany.address}</p>
                        {(selectedCompany.city || selectedCompany.state || selectedCompany.zip) && (
                          <p className="text-sm text-gray-900">
                            {[selectedCompany.city, selectedCompany.state, selectedCompany.zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedCompany.billing_address && (
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Billing Address</h4>
                        <p className="text-sm text-gray-900">{selectedCompany.billing_address}</p>
                        {(selectedCompany.billing_city || selectedCompany.billing_state || selectedCompany.billing_zip) && (
                          <p className="text-sm text-gray-900">
                            {[selectedCompany.billing_city, selectedCompany.billing_state, selectedCompany.billing_zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contacts Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Contacts ({selectedCompany.contacts?.length || 0})
                  </h3>
                  <button
                    onClick={handleCreateContact}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Contact
                  </button>
                </div>

                {(!selectedCompany.contacts || selectedCompany.contacts.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p>No contacts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCompany.contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {contact.first_name[0]}{contact.last_name?.[0] || ''}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {contact.first_name} {contact.last_name}
                              </span>
                              {contact.is_primary && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  Primary
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                {CONTACT_ROLES.find(r => r.value === contact.role)?.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {contact.title && <span>{contact.title}</span>}
                              {contact.email && <span className="ml-2">{contact.email}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditContact(contact)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 mt-4">Select a company to view details</p>
              <p className="text-gray-400 text-sm mt-1">or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Import Companies from CSV</h3>
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
                targetTable="companies"
                onImportComplete={() => {
                  setShowImport(false)
                  loadCompanies()
                  onShowToast?.('Companies imported successfully!', 'success')
                }}
                onShowToast={onShowToast || (() => {})}
                onClose={() => setShowImport(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
