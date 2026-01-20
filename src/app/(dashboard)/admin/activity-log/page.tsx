'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { trpc } from '@/lib/trpc/client'
import { formatDate } from '@/lib/utils'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Users,
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  Building2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  LogIn,
  LogOut,
  FilePlus,
  FileEdit,
  Trash2,
  Truck,
  UserPlus,
  UserCog,
  Settings,
  Key,
} from 'lucide-react'

const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  // CRM activities
  call: { label: 'Call', icon: Phone, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  email: { label: 'Email', icon: Mail, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  meeting: { label: 'Meeting', icon: Users, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  note: { label: 'Note', icon: FileText, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  task: { label: 'Task', icon: CheckCircle2, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  quote_sent: { label: 'Quote Sent', icon: Send, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  quote_accepted: { label: 'Quote Accepted', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  quote_rejected: { label: 'Quote Rejected', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  follow_up: { label: 'Follow Up', icon: Calendar, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  // System events - User
  login: { label: 'Login', icon: LogIn, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' },
  logout: { label: 'Logout', icon: LogOut, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  password_changed: { label: 'Password Changed', icon: Key, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  // System events - Quotes
  quote_created: { label: 'Quote Created', icon: FilePlus, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  quote_updated: { label: 'Quote Updated', icon: FileEdit, color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  quote_deleted: { label: 'Quote Deleted', icon: Trash2, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
  // System events - Inland Quotes
  inland_quote_created: { label: 'Inland Quote Created', icon: Truck, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  inland_quote_updated: { label: 'Inland Quote Updated', icon: Truck, color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  inland_quote_deleted: { label: 'Inland Quote Deleted', icon: Trash2, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
  // System events - Companies & Contacts
  company_created: { label: 'Company Created', icon: Building2, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  company_updated: { label: 'Company Updated', icon: Building2, color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300' },
  contact_created: { label: 'Contact Created', icon: UserPlus, color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300' },
  contact_updated: { label: 'Contact Updated', icon: User, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  // System events - User Management
  user_created: { label: 'User Created', icon: UserPlus, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  user_updated: { label: 'User Updated', icon: UserCog, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  // System events - Settings
  settings_updated: { label: 'Settings Updated', icon: Settings, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
}

export default function AdminActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(0)
  const limit = 50

  // Check if user is admin
  const { data: currentUser, isLoading: isLoadingUser } = trpc.user.me.useQuery()

  // Get team members for user filter
  const { data: teamMembers } = trpc.user.getTeamMembers.useQuery({
    limit: 100,
    offset: 0,
  })
  const [userFilter, setUserFilter] = useState<string>('all')

  // Get all activities (admin only)
  const { data, isLoading, isError, error } = trpc.activity.getAllActivities.useQuery(
    {
      limit,
      offset: page * limit,
      activityType: activityTypeFilter === 'all' ? undefined : activityTypeFilter as any,
      userId: userFilter === 'all' ? undefined : userFilter,
      search: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate ? `${endDate}T23:59:59` : undefined, // Include full end day
    },
    {
      enabled: !!currentUser && ['admin', 'owner', 'super_admin'].includes(currentUser.role),
    }
  )

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Check if user has admin access
  const isAdmin = currentUser && ['admin', 'owner', 'super_admin'].includes(currentUser.role)

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              You do not have permission to view this page. Admin access is required.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activities = data?.activities || []
  const totalActivities = data?.total || 0
  const totalPages = Math.ceil(totalActivities / limit)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">
            View all system activity across all users
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {totalActivities.toLocaleString()} total activities
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter activities by type, user, date range, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="pl-10"
              />
            </div>

            {/* Activity Type Filter */}
            <Select
              value={activityTypeFilter}
              onValueChange={(value) => {
                setActivityTypeFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Activity Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity Types</SelectItem>
                {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Filter */}
            <Select
              value={userFilter}
              onValueChange={(value) => {
                setUserFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {teamMembers?.users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* From Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                placeholder="From date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(0)
                }}
                className="pl-10"
              />
            </div>

            {/* To Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                placeholder="To date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(0)
                }}
                className="pl-10"
              />
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setActivityTypeFilter('all')
                setUserFilter('all')
                setStartDate('')
                setEndDate('')
                setPage(0)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-muted-foreground">
                {error?.message || 'Failed to load activities'}
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No activities found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {activities.map((activity) => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || {
                    label: activity.activity_type,
                    icon: FileText,
                    color: 'bg-gray-100 text-gray-800',
                  }
                  const Icon = config.icon
                  const user = Array.isArray(activity.user) ? activity.user[0] : activity.user
                  const company = Array.isArray(activity.company) ? activity.company[0] : activity.company

                  return (
                    <div
                      key={activity.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.created_at)}
                        </span>
                      </div>

                      <div>
                        <p className="font-medium">{activity.subject}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {user && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                        {company && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {company.name}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => {
                      const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || {
                        label: activity.activity_type,
                        icon: FileText,
                        color: 'bg-gray-100 text-gray-800',
                      }
                      const Icon = config.icon
                      const user = Array.isArray(activity.user) ? activity.user[0] : activity.user
                      const company = Array.isArray(activity.company) ? activity.company[0] : activity.company

                      return (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <Badge className={config.color}>
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.subject}</p>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{user.first_name} {user.last_name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {company ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{company.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(activity.created_at)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalActivities)} of{' '}
                    {totalActivities} activities
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
