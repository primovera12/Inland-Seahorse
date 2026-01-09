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
import { Plus, Users, Phone, Mail, Building2, Eye, Edit, Star, Tag, X, Download } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

type ContactRole = 'general' | 'decision_maker' | 'billing' | 'operations' | 'technical'

const ROLE_LABELS: Record<ContactRole, string> = {
  general: 'General',
  decision_maker: 'Decision Maker',
  billing: 'Billing',
  operations: 'Operations',
  technical: 'Technical',
}

const ROLE_COLORS: Record<ContactRole, string> = {
  general: 'bg-gray-100 text-gray-800',
  decision_maker: 'bg-purple-100 text-purple-800',
  billing: 'bg-green-100 text-green-800',
  operations: 'bg-blue-100 text-blue-800',
  technical: 'bg-orange-100 text-orange-800',
}

export default function ContactsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    role: 'general' as ContactRole,
    is_primary: false,
  })

  const utils = trpc.useUtils()

  // Get all companies for the dropdown
  const { data: companiesData } = trpc.companies.getAll.useQuery({
    limit: 100,
    offset: 0,
    status: 'active',
  })

  // Get contacts for selected company
  const { data: contactsData, isLoading } = trpc.contacts.getByCompany.useQuery(
    { companyId: selectedCompanyId },
    { enabled: !!selectedCompanyId }
  )
  const contacts = contactsData?.contacts || []

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success('Contact created successfully')
      setShowAddDialog(false)
      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        title: '',
        role: 'general',
        is_primary: false,
      })
      utils.contacts.getByCompany.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`)
    },
  })

  const handleCreateContact = () => {
    if (!newContact.first_name) {
      toast.error('First name is required')
      return
    }
    if (!selectedCompanyId) {
      toast.error('Please select a company first')
      return
    }
    createContact.mutate({
      ...newContact,
      company_id: selectedCompanyId,
      last_name: newContact.last_name || '',
    })
  }

  const companies = companiesData?.companies || []
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage contacts for your companies</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={!selectedCompanyId} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>Add a contact to {selectedCompany?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newContact.first_name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, first_name: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newContact.last_name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, last_name: e.target.value })
                    }
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newContact.title}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                  placeholder="Project Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={newContact.mobile}
                    onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                    placeholder="(555) 987-6543"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newContact.role}
                  onValueChange={(value) =>
                    setNewContact({ ...newContact, role: value as ContactRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateContact} disabled={createContact.isPending}>
                {createContact.isPending ? 'Creating...' : 'Create Contact'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a company to view contacts" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      {selectedCompanyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCompany?.name} Contacts
            </CardTitle>
            <CardDescription>{contactsData?.total || 0} contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No contacts for this company</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add first contact
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </div>
                            {contact.is_primary && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contact.title || '-'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ContactTags
                            contactId={contact.id}
                            tags={(contact as { tags?: string[] }).tags || []}
                            onUpdate={() => utils.contacts.getByCompany.invalidate()}
                          />
                        </TableCell>
                        <TableCell>
                          {contact.role && (
                            <Badge className={ROLE_COLORS[contact.role as ContactRole]}>
                              {ROLE_LABELS[contact.role as ContactRole]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="View contact">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit contact">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ContactTags({
  contactId,
  tags,
  onUpdate,
}: {
  contactId: string
  tags: string[]
  onUpdate: () => void
}) {
  const [open, setOpen] = useState(false)
  const { data: availableTags } = trpc.crm.getTags.useQuery()

  const addTag = trpc.crm.addTagsToContact.useMutation({
    onSuccess: () => {
      onUpdate()
      toast.success('Tag added')
    },
  })

  const removeTag = trpc.crm.removeTagFromContact.useMutation({
    onSuccess: () => {
      onUpdate()
      toast.success('Tag removed')
    },
  })

  const handleAddTag = (tagName: string) => {
    addTag.mutate({ contactId, tags: [tagName] })
  }

  const handleRemoveTag = (tagName: string) => {
    removeTag.mutate({ contactId, tag: tagName })
  }

  const unusedTags = (availableTags || []).filter((t) => !tags.includes(t.name))

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-xs gap-1 pr-1"
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="hover:bg-destructive/20 rounded p-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-2">Add Tag</p>
          {unusedTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No more tags available</p>
          ) : (
            <div className="space-y-1">
              {unusedTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    handleAddTag(tag.name)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 w-full text-left text-sm p-1.5 rounded hover:bg-muted"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
