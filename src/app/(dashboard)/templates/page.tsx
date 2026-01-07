'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  MoreHorizontal,
  FileText,
  Truck,
  Star,
  Trash2,
  Pencil,
  Copy,
  LayoutTemplate,
} from 'lucide-react'

type TemplateType = 'dismantle' | 'inland'

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateType>('dismantle')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string
    name: string
    description: string
  } | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'dismantle' as TemplateType,
    is_default: false,
  })

  // Fetch templates
  const { data: dismantleTemplates, refetch: refetchDismantle } = trpc.templates.getAll.useQuery({
    type: 'dismantle',
    limit: 50,
  })

  const { data: inlandTemplates, refetch: refetchInland } = trpc.templates.getAll.useQuery({
    type: 'inland',
    limit: 50,
  })

  const refetch = () => {
    refetchDismantle()
    refetchInland()
  }

  // Mutations
  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success('Template created successfully')
      refetch()
      setShowCreateDialog(false)
      setForm({ name: '', description: '', type: 'dismantle', is_default: false })
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success('Template updated')
      refetch()
      setEditingTemplate(null)
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success('Template deleted')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })

  const handleCreate = () => {
    if (!form.name) {
      toast.error('Please enter a template name')
      return
    }

    createTemplate.mutate({
      name: form.name,
      description: form.description || undefined,
      template_type: form.type,
      template_data: {},
      is_default: form.is_default,
    })
  }

  const handleUpdate = () => {
    if (!editingTemplate) return

    updateTemplate.mutate({
      id: editingTemplate.id,
      name: editingTemplate.name,
      description: editingTemplate.description || undefined,
    })
  }

  const templates = activeTab === 'dismantle' ? dismantleTemplates : inlandTemplates

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote Templates</h1>
          <p className="text-muted-foreground">
            Save and reuse quote configurations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
        <TabsList>
          <TabsTrigger value="dismantle" className="gap-2">
            <FileText className="h-4 w-4" />
            Dismantle ({dismantleTemplates?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="inland" className="gap-2">
            <Truck className="h-4 w-4" />
            Inland ({inlandTemplates?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {!templates || templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LayoutTemplate className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No templates yet</p>
                <p className="text-sm">Create your first template to get started</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="relative">
                  {template.is_default && (
                    <Badge className="absolute top-3 right-3 gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setEditingTemplate({
                                id: template.id,
                                name: template.name,
                                description: template.description || '',
                              })
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {!template.is_default && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateTemplate.mutate({
                                  id: template.id,
                                  is_default: true,
                                })
                              }
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteTemplate.mutate({ id: template.id })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Used {template.use_count || 0} times</span>
                      <span>{formatDate(new Date(template.created_at))}</span>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Save your current quote configuration as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Standard Dismantle Quote"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this template"
              />
            </div>
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={form.type}
                onValueChange={(v: TemplateType) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dismantle">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Dismantle Quote
                    </div>
                  </SelectItem>
                  <SelectItem value="inland">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Inland Quote
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Template Name</Label>
                <Input
                  id="editName"
                  value={editingTemplate.name}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
