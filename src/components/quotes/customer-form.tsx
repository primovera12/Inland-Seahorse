'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { Search, Building2, Copy, ClipboardPaste } from 'lucide-react'
import { EmailSignatureDialog } from './email-signature-dialog'
import type { ParsedSignature } from '@/lib/email-signature-parser'

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
] as const

export interface BillingInfo {
  address: string
  city: string
  state: string
  zip: string
  paymentTerms: string
}

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
  // Billing info
  billingInfo?: BillingInfo
  onBillingInfoChange?: (info: BillingInfo) => void
  // Notes
  notes: string
  onNotesChange: (value: string) => void
}

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
  billingInfo = { address: '', city: '', state: '', zip: '', paymentTerms: 'net_30' },
  onBillingInfoChange,
  notes,
  onNotesChange,
}: CustomerFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sameAsCustomer, setSameAsCustomer] = useState(false)

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

  // Search companies
  const { data: searchResults } = trpc.companies.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  )

  const updateBillingField = (field: keyof BillingInfo, value: string) => {
    if (onBillingInfoChange) {
      onBillingInfoChange({ ...billingInfo, [field]: value })
    }
  }

  const handleCopyFromCustomer = () => {
    if (onBillingInfoChange) {
      onBillingInfoChange({
        ...billingInfo,
        address: addressObj.address,
        city: addressObj.city,
        state: addressObj.state,
        zip: addressObj.zip,
      })
    }
  }

  const handleSameAsCustomerChange = (checked: boolean) => {
    setSameAsCustomer(checked)
    if (checked && onBillingInfoChange) {
      onBillingInfoChange({
        ...billingInfo,
        address: addressObj.address,
        city: addressObj.city,
        state: addressObj.state,
        zip: addressObj.zip,
      })
    }
  }

  const hasCustomerAddress = Boolean(addressObj.address || addressObj.city || addressObj.state || addressObj.zip)

  const handleApplySignature = (parsed: ParsedSignature) => {
    if (parsed.fullName) onCustomerNameChange(parsed.fullName)
    if (parsed.email) onCustomerEmailChange(parsed.email)
    if (parsed.phone) onCustomerPhoneChange(parsed.phone)
    if (parsed.mobile && !parsed.phone) onCustomerPhoneChange(parsed.mobile)
    if (parsed.company) onCustomerCompanyChange(parsed.company)

    // Update customer address if we have address components
    if (onCustomerAddressChange && (parsed.city || parsed.state || parsed.zip || parsed.address)) {
      onCustomerAddressChange({
        address: parsed.address || addressObj.address,
        city: parsed.city || addressObj.city,
        state: parsed.state || addressObj.state,
        zip: parsed.zip || addressObj.zip,
      })
    }

    // Update billing info if we have address components
    if (onBillingInfoChange && (parsed.city || parsed.state || parsed.zip || parsed.address)) {
      onBillingInfoChange({
        ...billingInfo,
        address: parsed.address || billingInfo.address,
        city: parsed.city || billingInfo.city,
        state: parsed.state || billingInfo.state,
        zip: parsed.zip || billingInfo.zip,
      })
    }
  }

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
        <EmailSignatureDialog
          onApply={handleApplySignature}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste Signature
            </Button>
          }
        />
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
            <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-auto">
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
                <Input
                  id="customerAddress"
                  placeholder="123 Main St"
                  value={addressObj.address}
                  onChange={(e) => updateCustomerAddressField('address', e.target.value)}
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

      {/* Billing Information */}
      {onBillingInfoChange && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Billing Information</h3>
              {hasCustomerAddress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyFromCustomer}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy from Customer
                </Button>
              )}
            </div>

            {hasCustomerAddress && (
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="sameAsCustomer"
                  checked={sameAsCustomer}
                  onCheckedChange={handleSameAsCustomerChange}
                />
                <Label htmlFor="sameAsCustomer" className="text-sm cursor-pointer">
                  Same as customer address
                </Label>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Input
                  id="billingAddress"
                  placeholder="123 Billing St"
                  value={billingInfo.address}
                  onChange={(e) => updateBillingField('address', e.target.value)}
                  disabled={sameAsCustomer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCity">City</Label>
                <Input
                  id="billingCity"
                  placeholder="New York"
                  value={billingInfo.city}
                  onChange={(e) => updateBillingField('city', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="billingState">State</Label>
                  <Input
                    id="billingState"
                    placeholder="NY"
                    value={billingInfo.state}
                    onChange={(e) => updateBillingField('state', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingZip">ZIP Code</Label>
                  <Input
                    id="billingZip"
                    placeholder="10001"
                    value={billingInfo.zip}
                    onChange={(e) => updateBillingField('zip', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={billingInfo.paymentTerms}
                  onValueChange={(value) => updateBillingField('paymentTerms', value)}
                >
                  <SelectTrigger id="paymentTerms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {term.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      <Separator />
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
