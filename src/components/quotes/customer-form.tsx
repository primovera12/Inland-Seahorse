'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { Search, Building2 } from 'lucide-react'

interface CustomerFormProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerCompanyChange: (value: string) => void
  onCompanySelect: (id: string, name: string) => void
  notes: string
  onNotesChange: (value: string) => void
}

export function CustomerForm({
  customerName,
  customerEmail,
  customerPhone,
  customerCompany,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onCustomerCompanyChange,
  onCompanySelect,
  notes,
  onNotesChange,
}: CustomerFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Search companies
  const { data: searchResults } = trpc.companies.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant={showSearch ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Building2 className="h-4 w-4 mr-2" />
          {showSearch ? 'Manual Entry' : 'Search Companies'}
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2 mb-6 p-4 rounded-lg border bg-muted/30">
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
            <div className="mt-2 border rounded-lg divide-y">
              {searchResults.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onCompanySelect(company.id, company.name)
                    onCustomerCompanyChange(company.name)
                    if (company.phone) onCustomerPhoneChange(company.phone)
                    setShowSearch(false)
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
        </div>
      )}

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
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Quote Notes</Label>
        <textarea
          id="notes"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Additional notes for this quote..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </div>
  )
}
