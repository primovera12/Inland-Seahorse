'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import { trpc } from '@/lib/trpc/client'
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete'
import { Search, Building2, ClipboardPaste, Users, Trash2 } from 'lucide-react'
import { EmailSignatureDialog } from './email-signature-dialog'
import type { ParsedSignature } from '@/lib/email-signature-parser'

export interface CustomerAddress {
  address: string
  city: string
  state: string
  zip: string
}

interface CustomerFormProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string
  customerAddress?: string | CustomerAddress
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerCompanyChange: (value: string) => void
  onCustomerAddressChange?: (value: CustomerAddress) => void
  onCompanySelect: (id: string, name: string) => void
  onContactSelect?: (id: string, name: string) => void
  // Optional notes section (used by inland quotes)
  notes?: string
  onNotesChange?: (value: string) => void
}

type SelectionMode = 'browse' | 'search' | 'manual'

export function CustomerForm({
  customerName,
  customerEmail,
  customerPhone,
  customerCompany,
  customerAddress,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onCustomerCompanyChange,
  onCustomerAddressChange,
  onCompanySelect,
  onContactSelect,
  notes,
  onNotesChange,
}: CustomerFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('browse')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')

  // Helper to get customer address as an object
  const getCustomerAddressObj = (): CustomerAddress => {
    if (!customerAddress) {
      return { address: '', city: '', state: '', zip: '' }
    }
    if (typeof customerAddress === 'string') {
      return { address: customerAddress, city: '', state: '', zip: '' }
    }
    return customerAddress
  }

  const addressObj = getCustomerAddressObj()

  // Helper to update customer address field
  const updateCustomerAddressField = (field: keyof CustomerAddress, value: string) => {
    if (onCustomerAddressChange) {
      onCustomerAddressChange({ ...addressObj, [field]: value })
    }
  }

  // Fetch all companies for dropdown
  const { data: companiesData, isLoading: companiesLoading } = trpc.companies.getAll.useQuery(
    { limit: 100 },
    { enabled: selectionMode === 'browse' }
  )

  // Fetch contacts for selected company
  const { data: contactsData, isLoading: contactsLoading } = trpc.contacts.getByCompany.useQuery(
    { companyId: selectedCompanyId },
    { enabled: !!selectedCompanyId && selectionMode === 'browse' }
  )

  // Search companies
  const { data: searchResults } = trpc.companies.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 && selectionMode === 'search' }
  )

  // Auto-select primary contact when contacts load for selected company
  useEffect(() => {
    if (contactsData?.contacts && contactsData.contacts.length > 0 && selectedCompanyId && !selectedContactId) {
      // Find the primary contact (contacts are already sorted with primary first)
      const primaryContact = contactsData.contacts.find(c => c.is_primary)
      if (primaryContact) {
        // Auto-select the primary contact
        setSelectedContactId(primaryContact.id)
        const fullName = `${primaryContact.first_name} ${primaryContact.last_name}`.trim()
        onCustomerNameChange(fullName)
        if (primaryContact.email) onCustomerEmailChange(primaryContact.email)
        if (primaryContact.phone) onCustomerPhoneChange(primaryContact.phone)
        if (onContactSelect) {
          onContactSelect(primaryContact.id, fullName)
        }
      }
    }
  }, [contactsData, selectedCompanyId, selectedContactId, onCustomerNameChange, onCustomerEmailChange, onCustomerPhoneChange, onContactSelect])

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setSelectedContactId('')

    const company = companiesData?.companies?.find(c => c.id === companyId)
    if (company) {
      onCompanySelect(company.id, company.name)
      onCustomerCompanyChange(company.name)
      if (company.phone) onCustomerPhoneChange(company.phone)
      // Update address if available
      if (onCustomerAddressChange && company.address) {
        onCustomerAddressChange({
          address: company.address || '',
          city: company.city || '',
          state: company.state || '',
          zip: company.zip || '',
        })
      }
    }
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId)

    const contact = contactsData?.contacts?.find(c => c.id === contactId)
    if (contact) {
      const fullName = `${contact.first_name} ${contact.last_name}`.trim()
      onCustomerNameChange(fullName)
      if (contact.email) onCustomerEmailChange(contact.email)
      if (contact.phone) onCustomerPhoneChange(contact.phone)
      if (onContactSelect) {
        onContactSelect(contact.id, fullName)
      }
    }
  }

  const handleApplySignature = (parsed: ParsedSignature) => {
    if (parsed.fullName) onCustomerNameChange(parsed.fullName)
    if (parsed.email) onCustomerEmailChange(parsed.email)
    if (parsed.phone) onCustomerPhoneChange(parsed.phone)
    if (parsed.mobile && !parsed.phone) onCustomerPhoneChange(parsed.mobile)
    if (parsed.company) onCustomerCompanyChange(parsed.company)

    if (onCustomerAddressChange && (parsed.city || parsed.state || parsed.zip || parsed.address)) {
      onCustomerAddressChange({
        address: parsed.address || addressObj.address,
        city: parsed.city || addressObj.city,
        state: parsed.state || addressObj.state,
        zip: parsed.zip || addressObj.zip,
      })
    }
  }

  const clearSelection = () => {
    setSelectedCompanyId('')
    setSelectedContactId('')
    onCustomerNameChange('')
    onCustomerEmailChange('')
    onCustomerPhoneChange('')
    onCustomerCompanyChange('')
    if (onCustomerAddressChange) {
      onCustomerAddressChange({ address: '', city: '', state: '', zip: '' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Selection Mode Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant={selectionMode === 'browse' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectionMode('browse')}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Browse Companies
        </Button>
        <Button
          type="button"
          variant={selectionMode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectionMode('search')}
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button
          type="button"
          variant={selectionMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectionMode('manual')}
        >
          Manual Entry
        </Button>
        <EmailSignatureDialog
          onApply={handleApplySignature}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste Signature
            </Button>
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Form
        </Button>
      </div>

      {/* Browse Mode - Company and Contact Dropdowns */}
      {selectionMode === 'browse' && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company Dropdown */}
            <div className="space-y-2">
              <Label>Select Company</Label>
              <SearchableSelect
                value={selectedCompanyId}
                onChange={handleCompanySelect}
                options={(companiesData?.companies || []).map((company): SearchableSelectOption => ({
                  value: company.id,
                  label: company.name,
                  description: company.city && company.state ? `${company.city}, ${company.state}` : undefined,
                }))}
                placeholder={companiesLoading ? "Loading..." : "Choose a company..."}
                searchPlaceholder="Search companies..."
                disabled={companiesLoading}
                emptyMessage="No companies found"
              />
            </div>

            {/* Contact Dropdown */}
            <div className="space-y-2">
              <Label>Select Contact</Label>
              <Select
                value={selectedContactId}
                onValueChange={handleContactSelect}
                disabled={!selectedCompanyId || contactsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedCompanyId
                        ? "Select company first"
                        : contactsLoading
                          ? "Loading..."
                          : "Choose a contact..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {contactsData?.contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.first_name} {contact.last_name}</span>
                        {contact.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCompanyId && contactsData?.contacts?.length === 0 && (
                <p className="text-sm text-muted-foreground">No contacts for this company</p>
              )}
            </div>
          </div>

          {(selectedCompanyId || selectedContactId) && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={clearSelection}
              className="mt-2"
            >
              Clear Selection
            </Button>
          )}
        </div>
      )}

      {/* Search Mode */}
      {selectionMode === 'search' && (
        <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
          <Label>Search Existing Companies</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-auto">
              {searchResults.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    // Set selected company ID so contacts query runs
                    setSelectedCompanyId(company.id)
                    setSelectedContactId('')
                    onCompanySelect(company.id, company.name)
                    onCustomerCompanyChange(company.name)
                    if (company.phone) onCustomerPhoneChange(company.phone)
                    // Populate address if available
                    if (onCustomerAddressChange && company.address) {
                      onCustomerAddressChange({
                        address: company.address || '',
                        city: company.city || '',
                        state: company.state || '',
                        zip: company.zip || '',
                      })
                    }
                    // Switch to browse mode so contacts query runs and auto-selects primary contact
                    setSelectionMode('browse')
                    setSearchQuery('')
                  }}
                >
                  <p className="font-medium">{company.name}</p>
                  {company.phone && (
                    <p className="text-sm text-muted-foreground">{company.phone}</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults?.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No companies found</p>
          )}
        </div>
      )}

      {/* Contact Information */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Contact Name *</Label>
            <Input
              id="customerName"
              placeholder="John Smith"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerCompany">Company</Label>
            <Input
              id="customerCompany"
              placeholder="Acme Construction"
              value={customerCompany}
              onChange={(e) => onCustomerCompanyChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="john@company.com"
              value={customerEmail}
              onChange={(e) => onCustomerEmailChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={customerPhone}
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
            />
          </div>

          {onCustomerAddressChange && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customerAddress">Street Address</Label>
                <AddressAutocomplete
                  id="customerAddress"
                  placeholder="Start typing an address..."
                  value={addressObj.address}
                  onChange={(value) => updateCustomerAddressField('address', value)}
                  onSelect={(components) => {
                    if (onCustomerAddressChange) {
                      onCustomerAddressChange({
                        address: components.address,
                        city: components.city || addressObj.city,
                        state: components.state || addressObj.state,
                        zip: components.zip || addressObj.zip,
                      })
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerCity">City</Label>
                <Input
                  id="customerCity"
                  placeholder="New York"
                  value={addressObj.city}
                  onChange={(e) => updateCustomerAddressField('city', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="customerState">State</Label>
                  <Input
                    id="customerState"
                    placeholder="NY"
                    value={addressObj.state}
                    onChange={(e) => updateCustomerAddressField('state', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerZip">ZIP Code</Label>
                  <Input
                    id="customerZip"
                    placeholder="10001"
                    value={addressObj.zip}
                    onChange={(e) => updateCustomerAddressField('zip', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Optional Notes Section (for inland quotes) */}
      {onNotesChange && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Internal Notes</h3>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Internal notes (not visible to customer)..."
            value={notes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
      )}

    </div>
  )
}
