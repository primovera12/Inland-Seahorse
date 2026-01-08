'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { formatDate, formatCurrency } from '@/lib/utils'
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
  Search,
  Eye,
  Folder,
  Building,
  Route,
  Calendar,
  Cpu,
  X,
  FolderPlus,
} from 'lucide-react'

type TemplateType = 'dismantle' | 'inland'

type Template = {
  id: string
  name: string
  description?: string | null
  template_type: string
  template_data: Record<string, unknown>
  category?: string | null
  use_count?: number | null
  created_at: string
  is_default?: boolean | null
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  general: Folder,
  equipment: Cpu,
  customer: Building,
  route: Route,
  seasonal: Calendar,
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  equipment: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
  route: 'bg-orange-100 text-orange-700',
  seasonal: 'bg-purple-100 text-purple-700',
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateType>('dismantle')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string
    name: string
    description: string
    category: string
  } | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'dismantle' as TemplateType,
    category: 'general',
    is_default: false,
  })

  // Fetch categories
  const { data: categories } = trpc.templates.getCategories.useQuery()

  // Fetch templates with filters
  const { data: dismantleTemplates, refetch: refetchDismantle } = trpc.templates.getAll.useQuery({
    type: 'dismantle',
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined,
    limit: 100,
  })

  const { data: inlandTemplates, refetch: refetchInland } = trpc.templates.getAll.useQuery({
    type: 'inland',
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined,
    limit: 100,
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
      setForm({ name: '', description: '', type: 'dismantle', category: 'general', is_default: false })
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

  const duplicateTemplate = trpc.templates.duplicate.useMutation({
    onSuccess: () => {
      toast.success('Template duplicated')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
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
      category: form.category,
      is_default: form.is_default,
    })
  }

  const handleUpdate = () => {
    if (!editingTemplate) return

    updateTemplate.mutate({
      id: editingTemplate.id,
      name: editingTemplate.name,
      description: editingTemplate.description || undefined,
      category: editingTemplate.category,
    })
  }

  const handlePreview = (template: typeof previewTemplate) => {
    setPreviewTemplate(template)
    setShowPreviewDialog(true)
  }

  const templates = activeTab === 'dismantle' ? dismantleTemplates : inlandTemplates

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    if (!templates) return {} as Record<string, Template[]>

    return templates.reduce((acc, template) => {
      const cat = template.category || 'general'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(template as Template)
      return acc
    }, {} as Record<string, Template[]>)
  }, [templates])

  // Get category counts
  const categoryCounts = useMemo(() => {
    if (!templates) return {}

    const counts: Record<string, number> = { all: templates.length }
    templates.forEach((t) => {
      const cat = t.category || 'general'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [templates])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Library</h1>
          <p className="text-muted-foreground">
            Organize and reuse quote configurations by category
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Tabs for Dismantle vs Inland */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
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

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Templates
            <Badge variant="secondary" className="ml-2">
              {categoryCounts.all || 0}
            </Badge>
          </Button>
          {categories?.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] || Folder
            const count = categoryCounts[cat.name] || 0
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.name)}
                className="gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {!templates || templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LayoutTemplate className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No templates found</p>
                <p className="text-sm">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create your first template to get started'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : selectedCategory === 'all' ? (
            // Show grouped by category view
            <div className="space-y-8">
              {(Object.entries(groupedTemplates) as [string, Template[]][]).map(([category, categoryTemplates]) => {
                const Icon = CATEGORY_ICONS[category] || Folder
                const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.general

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`p-1.5 rounded ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg font-semibold capitalize">{category}</h2>
                      <Badge variant="outline">{categoryTemplates.length}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onPreview={() => handlePreview(template)}
                          onEdit={() =>
                            setEditingTemplate({
                              id: template.id,
                              name: template.name,
                              description: template.description || '',
                              category: template.category || 'general',
                            })
                          }
                          onDuplicate={() => duplicateTemplate.mutate({ id: template.id })}
                          onSetDefault={() =>
                            updateTemplate.mutate({ id: template.id, is_default: true })
                          }
                          onDelete={() => {
                            if (confirm('Are you sure you want to delete this template?')) {
                              deleteTemplate.mutate({ id: template.id })
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Show flat list for specific category
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={() => handlePreview(template)}
                  onEdit={() =>
                    setEditingTemplate({
                      id: template.id,
                      name: template.name,
                      description: template.description || '',
                      category: template.category || 'general',
                    })
                  }
                  onDuplicate={() => duplicateTemplate.mutate({ id: template.id })}
                  onSetDefault={() =>
                    updateTemplate.mutate({ id: template.id, is_default: true })
                  }
                  onDelete={() => {
                    if (confirm('Are you sure you want to delete this template?')) {
                      deleteTemplate.mutate({ id: template.id })
                    }
                  }}
                />
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
              Save a quote configuration as a reusable template
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
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this template..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                        Dismantle
                      </div>
                    </SelectItem>
                    <SelectItem value="inland">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Inland
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.name] || Folder
                      return (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
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
                <Textarea
                  id="editDescription"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingTemplate.category}
                  onValueChange={(v) =>
                    setEditingTemplate({ ...editingTemplate, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.name] || Folder
                      return (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
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

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{previewTemplate.name}</h3>
                  {previewTemplate.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {previewTemplate.description}
                    </p>
                  )}
                </div>
                <Badge
                  className={
                    CATEGORY_COLORS[previewTemplate.category || 'general'] ||
                    CATEGORY_COLORS.general
                  }
                >
                  {(previewTemplate.category || 'general').charAt(0).toUpperCase() +
                    (previewTemplate.category || 'general').slice(1)}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="font-medium capitalize">
                    {previewTemplate.template_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Used:</span>{' '}
                  <span className="font-medium">
                    {previewTemplate.use_count || 0} times
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span className="font-medium">
                    {formatDate(new Date(previewTemplate.created_at))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Default:</span>{' '}
                  <span className="font-medium">
                    {previewTemplate.is_default ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {Object.keys(previewTemplate.template_data || {}).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Template Data</h4>
                    <ScrollArea className="h-48 rounded border p-3">
                      <pre className="text-xs">
                        {JSON.stringify(previewTemplate.template_data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                // TODO: Navigate to quote creation with template applied
                toast.info('Use Template feature coming soon')
                setShowPreviewDialog(false)
              }}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Template Card Component
function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
}: {
  template: Template
  onPreview: () => void
  onEdit: () => void
  onDuplicate: () => void
  onSetDefault: () => void
  onDelete: () => void
}) {
  const Icon = CATEGORY_ICONS[template.category || 'general'] || Folder
  const colorClass = CATEGORY_COLORS[template.category || 'general'] || CATEGORY_COLORS.general

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      {template.is_default && (
        <Badge className="absolute top-3 right-12 gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Star className="h-3 w-3 fill-current" />
          Default
        </Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {template.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {!template.is_default && (
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span>Used {template.use_count || 0} times</span>
          <span>{formatDate(new Date(template.created_at))}</span>
        </div>
        <Button className="w-full" variant="outline" size="sm" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview & Use
        </Button>
      </CardContent>
    </Card>
  )
}
