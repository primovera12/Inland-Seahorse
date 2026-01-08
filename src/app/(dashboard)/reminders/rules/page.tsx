'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  Bell,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  User,
  Clock,
  Power,
  PowerOff,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

type TriggerEvent =
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_created'
  | 'quote_expiring'
  | 'company_created'
  | 'contact_created'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  quote_sent: 'Quote Sent',
  quote_viewed: 'Quote Viewed',
  quote_accepted: 'Quote Accepted',
  quote_rejected: 'Quote Rejected',
  quote_created: 'Quote Created',
  quote_expiring: 'Quote Expiring',
  company_created: 'Company Created',
  contact_created: 'Contact Created',
}

const TRIGGER_ICONS: Record<TriggerEvent, React.ComponentType<{ className?: string }>> = {
  quote_sent: Send,
  quote_viewed: Eye,
  quote_accepted: CheckCircle2,
  quote_rejected: XCircle,
  quote_created: FileText,
  quote_expiring: Clock,
  company_created: Building,
  contact_created: User,
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

type RuleFormData = {
  name: string
  description: string
  trigger_event: TriggerEvent
  delay_days: number
  delay_hours: number
  reminder_title: string
  reminder_description: string
  reminder_priority: Priority
  applies_to: 'all' | 'dismantle' | 'inland'
  is_active: boolean
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  trigger_event: 'quote_sent',
  delay_days: 3,
  delay_hours: 0,
  reminder_title: '',
  reminder_description: '',
  reminder_priority: 'medium',
  applies_to: 'all',
  is_active: true,
}

export default function ReminderRulesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<(RuleFormData & { id: string }) | null>(null)
  const [form, setForm] = useState<RuleFormData>(defaultFormData)

  const { data: rules, isLoading, refetch } = trpc.reminders.getRules.useQuery()

  const createRule = trpc.reminders.createRule.useMutation({
    onSuccess: () => {
      toast.success('Rule created successfully')
      refetch()
      setShowCreateDialog(false)
      setForm(defaultFormData)
    },
    onError: (error) => {
      toast.error('Failed to create rule', { description: error.message })
    },
  })

  const updateRule = trpc.reminders.updateRule.useMutation({
    onSuccess: () => {
      toast.success('Rule updated')
      refetch()
      setEditingRule(null)
    },
    onError: (error) => {
      toast.error('Failed to update rule', { description: error.message })
    },
  })

  const toggleActive = trpc.reminders.toggleRuleActive.useMutation({
    onSuccess: () => {
      toast.success('Rule status updated')
      refetch()
    },
    onError: (error) => {
      toast.error('Failed to update rule', { description: error.message })
    },
  })

  const deleteRule = trpc.reminders.deleteRule.useMutation({
    onSuccess: () => {
      toast.success('Rule deleted')
      refetch()
    },
    onError: (error) => {
      toast.error('Failed to delete rule', { description: error.message })
    },
  })

  const handleCreate = () => {
    if (!form.name || !form.reminder_title) {
      toast.error('Please fill in required fields')
      return
    }
    createRule.mutate(form)
  }

  const handleUpdate = () => {
    if (!editingRule) return
    const { id, ...updates } = editingRule
    updateRule.mutate({ id, ...updates })
  }

  const openEditDialog = (rule: NonNullable<typeof rules>[0]) => {
    setEditingRule({
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      trigger_event: rule.trigger_event as TriggerEvent,
      delay_days: rule.delay_days,
      delay_hours: rule.delay_hours || 0,
      reminder_title: rule.reminder_title,
      reminder_description: rule.reminder_description || '',
      reminder_priority: rule.reminder_priority as Priority,
      applies_to: (rule.applies_to as 'all' | 'dismantle' | 'inland') || 'all',
      is_active: rule.is_active,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reminders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reminder Rules</h1>
            <p className="text-muted-foreground">
              Automate reminder creation based on events
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Rules
          </CardTitle>
          <CardDescription>
            {rules?.length || 0} rules configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading rules...
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No rules yet</p>
              <p className="text-sm">Create your first automation rule</p>
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => {
                const TriggerIcon = TRIGGER_ICONS[rule.trigger_event as TriggerEvent] || Zap
                return (
                  <div
                    key={rule.id}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      rule.is_active ? 'bg-background' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          rule.is_active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <TriggerIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          {!rule.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {rule.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            When:{' '}
                            <span className="font-medium text-foreground">
                              {TRIGGER_LABELS[rule.trigger_event as TriggerEvent]}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            Delay:{' '}
                            <span className="font-medium text-foreground">
                              {rule.delay_days}d {rule.delay_hours || 0}h
                            </span>
                          </span>
                          <Badge
                            className={
                              PRIORITY_COLORS[rule.reminder_priority as Priority]
                            }
                          >
                            {rule.reminder_priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Bell className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {rule.reminder_title}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => toggleActive.mutate({ id: rule.id })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Rule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive.mutate({ id: rule.id })}
                          >
                            {rule.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Delete this rule?')) {
                                deleteRule.mutate({ id: rule.id })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define when reminders should be automatically created
            </DialogDescription>
          </DialogHeader>
          <RuleForm
            form={form}
            onChange={setForm}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRule.isPending}>
              {createRule.isPending ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <RuleForm
              form={editingRule}
              onChange={(updates) =>
                setEditingRule({ ...editingRule, ...updates })
              }
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateRule.isPending}>
              {updateRule.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Rule Form Component
function RuleForm({
  form,
  onChange,
}: {
  form: RuleFormData
  onChange: (form: RuleFormData) => void
}) {
  return (
    <div className="space-y-6 py-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g., Follow up on sent quotes"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trigger">Trigger Event *</Label>
          <Select
            value={form.trigger_event}
            onValueChange={(v: TriggerEvent) =>
              onChange({ ...form, trigger_event: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => {
                const Icon = TRIGGER_ICONS[value as TriggerEvent]
                return (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Optional description of what this rule does..."
          rows={2}
        />
      </div>

      {/* Timing */}
      <div>
        <Label className="text-sm font-medium">Delay</Label>
        <p className="text-xs text-muted-foreground mb-2">
          How long after the trigger to create the reminder
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={365}
              value={form.delay_days}
              onChange={(e) =>
                onChange({ ...form, delay_days: parseInt(e.target.value) || 0 })
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={23}
              value={form.delay_hours}
              onChange={(e) =>
                onChange({ ...form, delay_hours: parseInt(e.target.value) || 0 })
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Reminder Details</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder_title">Reminder Title *</Label>
            <Input
              id="reminder_title"
              value={form.reminder_title}
              onChange={(e) =>
                onChange({ ...form, reminder_title: e.target.value })
              }
              placeholder="e.g., Follow up: {quote_number}"
            />
            <p className="text-xs text-muted-foreground">
              Use {'{quote_number}'} to include the quote number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_description">Reminder Description</Label>
            <Textarea
              id="reminder_description"
              value={form.reminder_description}
              onChange={(e) =>
                onChange({ ...form, reminder_description: e.target.value })
              }
              placeholder="What should be done when this reminder triggers..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.reminder_priority}
                onValueChange={(v: Priority) =>
                  onChange({ ...form, reminder_priority: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select
                value={form.applies_to}
                onValueChange={(v: 'all' | 'dismantle' | 'inland') =>
                  onChange({ ...form, applies_to: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quotes</SelectItem>
                  <SelectItem value="dismantle">Dismantle Only</SelectItem>
                  <SelectItem value="inland">Inland Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Active</Label>
          <p className="text-sm text-muted-foreground">
            Enable this rule to automatically create reminders
          </p>
        </div>
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked) => onChange({ ...form, is_active: checked })}
        />
      </div>
    </div>
  )
}
