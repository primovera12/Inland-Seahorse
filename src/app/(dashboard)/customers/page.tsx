'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { Search, Plus, Building2, Phone, MapPin, Eye, Edit, History, ChevronDown, ChevronUp, Users, Mail, Star, UserPlus, Trash2 } from 'lucide-react'
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete'
import { CompanyTimeline } from '@/components/crm/company-timeline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

type CompanyStatus = 'active' | 'inactive' | 'prospect' | 'lead' | 'vip'

const STATUS_COLORS: Record<CompanyStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  lead: 'bg-purple-100 text-purple-800',
  vip: 'bg-yellow-100 text-yellow-800',
}

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'all'>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState<{
    id: string
    name: string
    phone: string
    address: string
    city: string
    state: string
    zip: string
    status: CompanyStatus
  } | null>(null)
  const [newCompany, setNewCompany] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    status: 'active' as CompanyStatus,
  })

  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.companies.getAll.useQuery({
    limit: 100,
    offset: 0,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  })

  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success('Company created successfully')
      setShowAddDialog(false)
      setNewCompany({
        name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        status: 'active',
      })
      utils.companies.getAll.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create company: ${error.message}`)
    },
  })

  const updateCompany = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success('Company updated successfully')
      setEditingCompany(null)
      utils.companies.getAll.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update company: ${error.message}`)
    },
  })

  const handleCreateCompany = () => {
    if (!newCompany.name) {
      toast.error('Company name is required')
      return
    }
    createCompany.mutate(newCompany)
  }

  const handleUpdateCompany = () => {
    if (!editingCompany) return
    if (!editingCompany.name) {
      toast.error('Company name is required')
      return
    }
    updateCompany.mutate({
      id: editingCompany.id,
      data: {
        name: editingCompany.name,
        phone: editingCompany.phone || undefined,
        address: editingCompany.address || undefined,
        city: editingCompany.city || undefined,
        state: editingCompany.state || undefined,
        zip: editingCompany.zip || undefined,
        status: editingCompany.status,
      },
    })
  }

  const handleAddressSelect = (components: AddressComponents) => {
    setNewCompany({
      ...newCompany,
      address: components.address,
      city: components.city || '',
      state: components.state || '',
      zip: components.zip || '',
    })
  }

  const handleEditAddressSelect = (components: AddressComponents) => {
    if (!editingCompany) return
    setEditingCompany({
      ...editingCompany,
      address: components.address,
      city: components.city || '',
      state: components.state || '',
      zip: components.zip || '',
    })
  }

  const openEditDialog = (company: typeof companies[0]) => {
    setEditingCompany({
      id: company.id,
      name: company.name,
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || '',
      status: company.status as CompanyStatus,
    })
  }

  const companies = data?.companies || []
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your customer companies</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>Add a new company to your CRM</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Acme Construction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <AddressAutocomplete
                  placeholder="Start typing an address..."
                  value={newCompany.address}
                  onChange={(value) => setNewCompany({ ...newCompany, address: value })}
                  onSelect={handleAddressSelect}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newCompany.state}
                    onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={newCompany.zip}
                    onChange={(e) => setNewCompany({ ...newCompany, zip: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newCompany.status}
                  onValueChange={(value) =>
                    setNewCompany({ ...newCompany, status: value as CompanyStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCompany} disabled={createCompany.isPending}>
                {createCompany.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Companies
          </CardTitle>
          <CardDescription>{total} companies</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CompanyStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No companies found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <>
                      <TableRow key={company.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setExpandedCompanyId(
                              expandedCompanyId === company.id ? null : company.id
                            )}
                          >
                            {expandedCompanyId === company.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{company.name}</div>
                          {company.industry && (
                            <div className="text-sm text-muted-foreground">{company.industry}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {company.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {company.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.city && company.state ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {company.city}, {company.state}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[company.status as CompanyStatus]}>
                            {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View company"
                              onClick={() => setSelectedCompanyId(company.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit company"
                              onClick={() => openEditDialog(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedCompanyId === company.id && (
                        <TableRow key={`${company.id}-contacts`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <CompanyContactsSection companyId={company.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompanyId} onOpenChange={(open) => !open && setSelectedCompanyId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          {selectedCompanyId && (
            <CompanyDetailDialog
              companyId={selectedCompanyId}
              onClose={() => setSelectedCompanyId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Company Name *</Label>
                <Input
                  id="edit-name"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editingCompany.phone}
                  onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <AddressAutocomplete
                  placeholder="Start typing an address..."
                  value={editingCompany.address}
                  onChange={(value) => setEditingCompany({ ...editingCompany, address: value })}
                  onSelect={handleEditAddressSelect}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editingCompany.city}
                    onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={editingCompany.state}
                    onChange={(e) => setEditingCompany({ ...editingCompany, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-zip">ZIP</Label>
                  <Input
                    id="edit-zip"
                    value={editingCompany.zip}
                    onChange={(e) => setEditingCompany({ ...editingCompany, zip: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingCompany.status}
                  onValueChange={(value) =>
                    setEditingCompany({ ...editingCompany, status: value as CompanyStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCompany(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCompany} disabled={updateCompany.isPending}>
              {updateCompany.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CompanyDetailDialog({
  companyId,
  onClose,
}: {
  companyId: string
  onClose: () => void
}) {
  const { data: company, isLoading } = trpc.companies.getById.useQuery({ id: companyId })

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading company details...
      </div>
    )
  }

  if (!company) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Company not found
      </div>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {company.name}
        </DialogTitle>
        <DialogDescription>
          {company.city && company.state
            ? `${company.city}, ${company.state}`
            : 'Company details and activity'}
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="timeline" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">
            <History className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="details">
            <Building2 className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <CompanyTimeline companyId={companyId} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="space-y-4">
            {company.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p>{company.address}</p>
                  {company.city && company.state && (
                    <p className="text-muted-foreground">
                      {company.city}, {company.state} {company.zip}
                    </p>
                  )}
                </div>
              </div>
            )}
            {company.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p>{company.industry}</p>
              </div>
            )}
            {company.contacts && company.contacts.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Contacts</p>
                <div className="space-y-2">
                  {company.contacts.map((contact: { id: string; first_name: string; last_name: string; email?: string; is_primary?: boolean }) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span>
                        {contact.first_name} {contact.last_name}
                        {contact.is_primary && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Primary
                          </Badge>
                        )}
                      </span>
                      {contact.email && (
                        <span className="text-muted-foreground">{contact.email}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

function CompanyContactsSection({ companyId }: { companyId: string }) {
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
  })
  const [editingContact, setEditingContact] = useState<{
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    position: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: company, isLoading } = trpc.companies.getById.useQuery({ id: companyId })

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success('Contact added successfully')
      setShowAddContact(false)
      setNewContact({ first_name: '', last_name: '', email: '', phone: '', position: '' })
      utils.companies.getById.invalidate({ id: companyId })
    },
    onError: (error) => {
      toast.error(`Failed to add contact: ${error.message}`)
    },
  })

  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success('Contact updated')
      utils.companies.getById.invalidate({ id: companyId })
    },
    onError: (error) => {
      toast.error(`Failed to update contact: ${error.message}`)
    },
  })

  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success('Contact removed')
      utils.companies.getById.invalidate({ id: companyId })
    },
    onError: (error) => {
      toast.error(`Failed to remove contact: ${error.message}`)
    },
  })

  const handleAddContact = () => {
    if (!newContact.first_name || !newContact.last_name) {
      toast.error('First and last name are required')
      return
    }
    createContact.mutate({
      company_id: companyId,
      ...newContact,
    })
  }

  const handleSetPrimary = (contactId: string) => {
    updateContact.mutate({
      id: contactId,
      data: {
        is_primary: true,
      },
    })
  }

  const handleDeleteContact = (contactId: string) => {
    if (confirm('Are you sure you want to remove this contact?')) {
      deleteContact.mutate({ id: contactId })
    }
  }

  const handleEditContact = (contact: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    position?: string
  }) => {
    setEditingContact({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
    })
    setShowAddContact(false)
  }

  const handleSaveEditContact = () => {
    if (!editingContact) return
    if (!editingContact.first_name || !editingContact.last_name) {
      toast.error('First and last name are required')
      return
    }
    updateContact.mutate({
      id: editingContact.id,
      data: {
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        email: editingContact.email || undefined,
        phone: editingContact.phone || undefined,
        position: editingContact.position || undefined,
      },
    }, {
      onSuccess: () => {
        setEditingContact(null)
      }
    })
  }

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading contacts...</div>
  }

  const contacts = company?.contacts || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">Contacts ({contacts.length})</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAddContact(!showAddContact)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {showAddContact && (
        <div className="p-4 border rounded-lg bg-background space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First Name *</Label>
              <Input
                placeholder="John"
                value={newContact.first_name}
                onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name *</Label>
              <Input
                placeholder="Doe"
                value={newContact.last_name}
                onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="john@company.com"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                placeholder="(555) 123-4567"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Position</Label>
            <Input
              placeholder="e.g., Sales Manager, Owner, Purchasing"
              value={newContact.position}
              onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddContact(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddContact} disabled={createContact.isPending}>
              {createContact.isPending ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </div>
      )}

      {editingContact && (
        <div className="p-4 border rounded-lg bg-background space-y-3 border-primary">
          <div className="text-sm font-medium text-primary">Edit Contact</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First Name *</Label>
              <Input
                placeholder="John"
                value={editingContact.first_name}
                onChange={(e) => setEditingContact({ ...editingContact, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name *</Label>
              <Input
                placeholder="Doe"
                value={editingContact.last_name}
                onChange={(e) => setEditingContact({ ...editingContact, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="john@company.com"
                type="email"
                value={editingContact.email}
                onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                placeholder="(555) 123-4567"
                value={editingContact.phone}
                onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Position</Label>
            <Input
              placeholder="e.g., Sales Manager, Owner, Purchasing"
              value={editingContact.position}
              onChange={(e) => setEditingContact({ ...editingContact, position: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEditContact} disabled={updateContact.isPending}>
              {updateContact.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No contacts yet. Add a contact to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact: {
            id: string
            first_name: string
            last_name: string
            email?: string
            phone?: string
            position?: string
            is_primary?: boolean
          }) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-background"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {contact.first_name} {contact.last_name}
                  </span>
                  {contact.is_primary && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                  {contact.position && (
                    <span className="text-xs text-muted-foreground">
                      ({contact.position})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!contact.is_primary && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSetPrimary(contact.id)}
                    title="Set as primary contact"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditContact(contact)}
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDeleteContact(contact.id)}
                  title="Remove contact"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
