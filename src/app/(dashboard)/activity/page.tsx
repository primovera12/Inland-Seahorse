'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  CheckSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Plus,
  Building2,
  User,
  Trash2,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { ActivityType } from '@/types/crm'

const ACTIVITY_ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckSquare,
  quote_sent: Send,
  quote_accepted: ThumbsUp,
  quote_rejected: ThumbsDown,
  follow_up: Clock,
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'bg-green-100 text-green-800',
  email: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
  note: 'bg-gray-100 text-gray-800',
  task: 'bg-orange-100 text-orange-800',
  quote_sent: 'bg-indigo-100 text-indigo-800',
  quote_accepted: 'bg-emerald-100 text-emerald-800',
  quote_rejected: 'bg-red-100 text-red-800',
  follow_up: 'bg-yellow-100 text-yellow-800',
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
  quote_sent: 'Quote Sent',
  quote_accepted: 'Quote Accepted',
  quote_rejected: 'Quote Rejected',
  follow_up: 'Follow Up',
}

export default function ActivityPage() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [newActivity, setNewActivity] = useState({
    activity_type: 'note' as ActivityType,
    subject: '',
    description: '',
  })

  const utils = trpc.useUtils()

  // Get recent activities
  const { data: activitiesData, isLoading } = trpc.activity.getRecent.useQuery({
    limit: 50,
    offset: 0,
  })

  // Get stats
  const { data: stats } = trpc.activity.getStats.useQuery()

  // Get companies for dropdown
  const { data: companiesData } = trpc.companies.getAll.useQuery({
    limit: 100,
    offset: 0,
    status: 'active',
  })

  const createActivity = trpc.activity.create.useMutation({
    onSuccess: () => {
      toast.success('Activity logged successfully')
      setShowAddDialog(false)
      setNewActivity({ activity_type: 'note', subject: '', description: '' })
      setSelectedCompanyId('')
      utils.activity.getRecent.invalidate()
      utils.activity.getStats.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to log activity: ${error.message}`)
    },
  })

  const deleteActivity = trpc.activity.delete.useMutation({
    onSuccess: () => {
      toast.success('Activity deleted')
      utils.activity.getRecent.invalidate()
      utils.activity.getStats.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to delete activity: ${error.message}`)
    },
  })

  const handleCreateActivity = () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company')
      return
    }
    if (!newActivity.subject) {
      toast.error('Please enter a subject')
      return
    }

    createActivity.mutate({
      company_id: selectedCompanyId,
      activity_type: newActivity.activity_type,
      subject: newActivity.subject,
      description: newActivity.description || undefined,
    })
  }

  const activities = activitiesData?.activities || []
  const companies = companiesData?.companies || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track all customer interactions</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log New Activity</DialogTitle>
              <DialogDescription>Record an interaction with a customer</DialogDescription>
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
                <Label>Activity Type</Label>
                <Select
                  value={newActivity.activity_type}
                  onValueChange={(value) =>
                    setNewActivity({ ...newActivity, activity_type: value as ActivityType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  placeholder="Brief summary of activity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Additional details..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateActivity} disabled={createActivity.isPending}>
                {createActivity.isPending ? 'Saving...' : 'Log Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Activities</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalActivities || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-3xl">{stats?.monthlyTotal || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calls This Month</CardDescription>
            <CardTitle className="text-3xl">{stats?.monthlyByType?.call || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Meetings This Month</CardDescription>
            <CardTitle className="text-3xl">{stats?.monthlyByType?.meeting || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Activities
          </CardTitle>
          <CardDescription>{activities.length} activities</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No activities logged yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log first activity
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type as ActivityType] || FileText
                const colorClass =
                  ACTIVITY_COLORS[activity.activity_type as ActivityType] || 'bg-gray-100 text-gray-800'
                const label =
                  ACTIVITY_LABELS[activity.activity_type as ActivityType] || activity.activity_type

                return (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={colorClass}>{label}</Badge>
                        {activity.company && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {(activity.company as { name: string }).name}
                          </span>
                        )}
                      </div>
                      <p className="font-medium">{activity.subject}</p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {activity.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(activity.user as { first_name?: string; last_name?: string; email: string })
                              .first_name ||
                              (activity.user as { email: string }).email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(new Date(activity.created_at))}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteActivity.mutate({ id: activity.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
