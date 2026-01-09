'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Mail,
  Plus,
  Trash2,
  Clock,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Users,
  BarChart3,
} from 'lucide-react'

const TRIGGER_EVENTS = [
  { value: 'quote_sent', label: 'Quote Sent', icon: Send },
  { value: 'quote_viewed', label: 'Quote Viewed', icon: Eye },
  { value: 'quote_accepted', label: 'Quote Accepted', icon: CheckCircle },
  { value: 'quote_rejected', label: 'Quote Rejected', icon: XCircle },
] as const

const TRIGGER_COLORS: Record<string, string> = {
  quote_sent: 'bg-blue-100 text-blue-800',
  quote_viewed: 'bg-purple-100 text-purple-800',
  quote_accepted: 'bg-green-100 text-green-800',
  quote_rejected: 'bg-red-100 text-red-800',
}

type Step = {
  id?: string
  step_order: number
  delay_days: number
  delay_hours: number
  email_subject: string
  email_body: string
  stop_if_status: string[]
}

type SequenceFormData = {
  name: string
  description: string
  trigger_event: string
  is_active: boolean
  steps: Step[]
}

export default function SequencesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSequence, setEditingSequence] = useState<string | null>(null)
  const [form, setForm] = useState<SequenceFormData>({
    name: '',
    description: '',
    trigger_event: 'quote_sent',
    is_active: true,
    steps: [
      {
        step_order: 1,
        delay_days: 3,
        delay_hours: 0,
        email_subject: '',
        email_body: '',
        stop_if_status: ['accepted', 'rejected'],
      },
    ],
  })

  const utils = trpc.useUtils()

  const { data: sequences, isLoading } = trpc.sequences.getAll.useQuery()
  const { data: stats } = trpc.sequences.getStats.useQuery()

  const createSequence = trpc.sequences.create.useMutation({
    onSuccess: () => {
      toast.success('Sequence created successfully')
      setShowCreateDialog(false)
      resetForm()
      utils.sequences.getAll.invalidate()
      utils.sequences.getStats.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to create sequence', { description: error.message })
    },
  })

  const updateSequence = trpc.sequences.update.useMutation({
    onSuccess: () => {
      toast.success('Sequence updated')
      utils.sequences.getAll.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to update sequence', { description: error.message })
    },
  })

  const toggleActive = trpc.sequences.toggleActive.useMutation({
    onSuccess: () => {
      utils.sequences.getAll.invalidate()
      utils.sequences.getStats.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to toggle sequence', { description: error.message })
    },
  })

  const deleteSequence = trpc.sequences.delete.useMutation({
    onSuccess: () => {
      toast.success('Sequence deleted')
      utils.sequences.getAll.invalidate()
      utils.sequences.getStats.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to delete sequence', { description: error.message })
    },
  })

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      trigger_event: 'quote_sent',
      is_active: true,
      steps: [
        {
          step_order: 1,
          delay_days: 3,
          delay_hours: 0,
          email_subject: '',
          email_body: '',
          stop_if_status: ['accepted', 'rejected'],
        },
      ],
    })
    setEditingSequence(null)
  }

  const addStep = () => {
    setForm({
      ...form,
      steps: [
        ...form.steps,
        {
          step_order: form.steps.length + 1,
          delay_days: 3,
          delay_hours: 0,
          email_subject: '',
          email_body: '',
          stop_if_status: ['accepted', 'rejected'],
        },
      ],
    })
  }

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) {
      toast.error('Sequence must have at least one step')
      return
    }
    const newSteps = form.steps.filter((_, i) => i !== index)
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, step_order: i + 1 }))
    setForm({ ...form, steps: renumbered })
  }

  const updateStep = (index: number, updates: Partial<Step>) => {
    const newSteps = [...form.steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setForm({ ...form, steps: newSteps })
  }

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error('Please enter a sequence name')
      return
    }

    const hasEmptySteps = form.steps.some(
      (step) => !step.email_subject.trim() || !step.email_body.trim()
    )
    if (hasEmptySteps) {
      toast.error('Please fill in all email subjects and bodies')
      return
    }

    createSequence.mutate({
      name: form.name,
      description: form.description || undefined,
      trigger_event: form.trigger_event as 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_rejected',
      is_active: form.is_active,
      steps: form.steps,
    })
  }

  const getTriggerLabel = (event: string) => {
    return TRIGGER_EVENTS.find((t) => t.value === event)?.label || event
  }

  const formatDelay = (days: number, hours: number) => {
    const parts = []
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
    return parts.join(' ') || 'Immediately'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Email Sequences</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Automate follow-up emails based on quote events
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sequences</CardDescription>
            <CardTitle className="text-3xl">{stats?.total_sequences || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Play className="h-4 w-4 text-green-500" />
              Active
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.active_sequences || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-500" />
              Enrollments
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.active_enrollments || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.completed_enrollments || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sequences List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Your Sequences
          </CardTitle>
          <CardDescription>
            Manage automated email sequences for quote follow-ups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              Loading sequences...
            </div>
          ) : !sequences || sequences.length === 0 ? (
            <div className="text-center py-10">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No email sequences yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first sequence
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {sequences.map((sequence) => (
                <AccordionItem key={sequence.id} value={sequence.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sequence.is_active}
                          onCheckedChange={() => toggleActive.mutate({ id: sequence.id })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{sequence.name}</p>
                        {sequence.description && (
                          <p className="text-sm text-muted-foreground">
                            {sequence.description}
                          </p>
                        )}
                      </div>
                      <Badge className={TRIGGER_COLORS[sequence.trigger_event]}>
                        {getTriggerLabel(sequence.trigger_event)}
                      </Badge>
                      <Badge variant="outline">
                        {(sequence.steps as Step[])?.length || 0} step
                        {((sequence.steps as Step[])?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 space-y-4">
                      {/* Steps timeline */}
                      <div className="space-y-4">
                        {(sequence.steps as Step[])
                          ?.sort((a, b) => a.step_order - b.step_order)
                          .map((step, index) => (
                            <div
                              key={step.id || index}
                              className="flex gap-4 p-4 rounded-lg border bg-muted/30"
                            >
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                  {step.step_order}
                                </div>
                                {index < (sequence.steps as Step[]).length - 1 && (
                                  <div className="w-0.5 flex-1 bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  Wait {formatDelay(step.delay_days, step.delay_hours)}
                                </div>
                                <p className="font-medium">{step.email_subject}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {step.email_body}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteSequence.mutate({ id: sequence.id })
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Sequence</DialogTitle>
            <DialogDescription>
              Set up automated follow-up emails triggered by quote events
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Sequence Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Quote Follow-up"
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Event *</Label>
                <Select
                  value={form.trigger_event}
                  onValueChange={(value) =>
                    setForm({ ...form, trigger_event: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this sequence"
              />
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Email Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {form.steps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Step {step.step_order}</CardTitle>
                      {form.steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Wait Days</Label>
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={step.delay_days}
                          onChange={(e) =>
                            updateStep(index, {
                              delay_days: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Wait Hours</Label>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={step.delay_hours}
                          onChange={(e) =>
                            updateStep(index, {
                              delay_hours: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Subject *</Label>
                      <Input
                        value={step.email_subject}
                        onChange={(e) =>
                          updateStep(index, { email_subject: e.target.value })
                        }
                        placeholder="Following up on your quote..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Body *</Label>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={step.email_body}
                        onChange={(e) =>
                          updateStep(index, { email_body: e.target.value })
                        }
                        placeholder="Hi {{customer_name}},&#10;&#10;Just wanted to follow up on the quote we sent..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Available variables: {'{{customer_name}}'}, {'{{quote_number}}'},{' '}
                        {'{{total}}'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Activate sequence immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createSequence.isPending}>
              {createSequence.isPending ? 'Creating...' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
