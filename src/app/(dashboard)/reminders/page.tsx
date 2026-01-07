'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  Building2,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ReminderPriority } from '@/types/crm'

const PRIORITY_COLORS: Record<ReminderPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export default function RemindersPage() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as ReminderPriority,
  })

  const utils = trpc.useUtils()

  // Get reminders based on active tab
  const { data: pendingData, isLoading: loadingPending } = trpc.reminders.getAll.useQuery({
    completed: false,
    limit: 50,
  })

  const { data: completedData, isLoading: loadingCompleted } = trpc.reminders.getAll.useQuery({
    completed: true,
    limit: 50,
  })

  const { data: overdueReminders } = trpc.reminders.getOverdue.useQuery()
  const { data: stats } = trpc.reminders.getStats.useQuery()

  // Get companies for dropdown
  const { data: companiesData } = trpc.companies.getAll.useQuery({
    limit: 100,
    offset: 0,
    status: 'active',
  })

  const createReminder = trpc.reminders.create.useMutation({
    onSuccess: () => {
      toast.success('Reminder created successfully')
      setShowAddDialog(false)
      setNewReminder({ title: '', description: '', due_date: '', priority: 'medium' })
      setSelectedCompanyId('')
      utils.reminders.getAll.invalidate()
      utils.reminders.getStats.invalidate()
      utils.reminders.getOverdue.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create reminder: ${error.message}`)
    },
  })

  const toggleComplete = trpc.reminders.toggleComplete.useMutation({
    onSuccess: () => {
      utils.reminders.getAll.invalidate()
      utils.reminders.getStats.invalidate()
      utils.reminders.getOverdue.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update reminder: ${error.message}`)
    },
  })

  const deleteReminder = trpc.reminders.delete.useMutation({
    onSuccess: () => {
      toast.success('Reminder deleted')
      utils.reminders.getAll.invalidate()
      utils.reminders.getStats.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to delete reminder: ${error.message}`)
    },
  })

  const handleCreateReminder = () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company')
      return
    }
    if (!newReminder.title) {
      toast.error('Please enter a title')
      return
    }
    if (!newReminder.due_date) {
      toast.error('Please select a due date')
      return
    }

    createReminder.mutate({
      company_id: selectedCompanyId,
      title: newReminder.title,
      description: newReminder.description || undefined,
      due_date: new Date(newReminder.due_date).toISOString(),
      priority: newReminder.priority,
    })
  }

  const companies = companiesData?.companies || []
  const pendingReminders = pendingData?.reminders || []
  const completedReminders = completedData?.reminders || []

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date()

  const ReminderItem = ({
    reminder,
    showCheckbox = true,
  }: {
    reminder: (typeof pendingReminders)[0]
    showCheckbox?: boolean
  }) => {
    const overdue = !reminder.is_completed && isOverdue(reminder.due_date)

    return (
      <div
        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
          reminder.is_completed
            ? 'bg-muted/30 opacity-60'
            : overdue
              ? 'border-red-200 bg-red-50'
              : 'hover:bg-muted/50'
        }`}
      >
        {showCheckbox && (
          <Checkbox
            checked={reminder.is_completed}
            onCheckedChange={() => toggleComplete.mutate({ id: reminder.id })}
            className="mt-1"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={PRIORITY_COLORS[reminder.priority as ReminderPriority]}>
              {PRIORITY_LABELS[reminder.priority as ReminderPriority]}
            </Badge>
            {overdue && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
            {reminder.is_completed && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <p className={`font-medium ${reminder.is_completed ? 'line-through' : ''}`}>
            {reminder.title}
          </p>
          {reminder.description && (
            <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {reminder.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {(reminder.company as { name: string }).name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due: {formatDate(new Date(reminder.due_date))}
            </span>
            {reminder.completed_at && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed: {formatDate(new Date(reminder.completed_at))}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => deleteReminder.mutate({ id: reminder.id })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Follow-up Reminders</h1>
          <p className="text-muted-foreground">Track your follow-ups and never miss a deadline</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Follow-up Reminder</DialogTitle>
              <DialogDescription>Set a reminder to follow up with a customer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  placeholder="Follow up on quote"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newReminder.due_date}
                  onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newReminder.priority}
                  onValueChange={(value) =>
                    setNewReminder({ ...newReminder, priority: value as ReminderPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Additional details..."
                  value={newReminder.description}
                  onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReminder} disabled={createReminder.isPending}>
                {createReminder.isPending ? 'Creating...' : 'Create Reminder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reminders</CardDescription>
            <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{stats?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={overdueReminders && overdueReminders.length > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats?.overdue || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueReminders && overdueReminders.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Reminders ({overdueReminders.length})
            </CardTitle>
            <CardDescription className="text-red-700">
              These follow-ups are past their due date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueReminders.slice(0, 3).map((reminder) => (
              <ReminderItem key={reminder.id} reminder={reminder} />
            ))}
            {overdueReminders.length > 3 && (
              <p className="text-sm text-red-700 text-center">
                +{overdueReminders.length - 3} more overdue reminders
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <CircleDot className="h-4 w-4" />
                Pending ({pendingReminders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed ({completedReminders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {loadingPending ? (
                <div className="text-center py-10 text-muted-foreground">Loading reminders...</div>
              ) : pendingReminders.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending reminders</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first reminder
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReminders.map((reminder) => (
                    <ReminderItem key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {loadingCompleted ? (
                <div className="text-center py-10 text-muted-foreground">Loading reminders...</div>
              ) : completedReminders.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed reminders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedReminders.map((reminder) => (
                    <ReminderItem key={reminder.id} reminder={reminder} showCheckbox={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
