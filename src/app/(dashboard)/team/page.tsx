'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  UserX,
  Mail,
  Users,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  KeyRound,
} from 'lucide-react'

type UserRole = 'admin' | 'manager' | 'member' | 'viewer'
type UserStatus = 'active' | 'inactive' | 'invited'

// Permission categories and permissions
const PERMISSION_CATEGORIES = [
  {
    id: 'quotes',
    name: 'Quotes',
    permissions: [
      { id: 'quotes_view', label: 'View Quotes' },
      { id: 'quotes_create', label: 'Create Quotes' },
      { id: 'quotes_edit', label: 'Edit Quotes' },
      { id: 'quotes_delete', label: 'Delete Quotes' },
      { id: 'quotes_export', label: 'Export Quotes' },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    permissions: [
      { id: 'customers_view', label: 'View Customers' },
      { id: 'customers_create', label: 'Create Customers' },
      { id: 'customers_edit', label: 'Edit Customers' },
      { id: 'customers_delete', label: 'Delete Customers' },
    ],
  },
  {
    id: 'equipment',
    name: 'Equipment',
    permissions: [
      { id: 'equipment_view', label: 'View Equipment' },
      { id: 'equipment_create', label: 'Create Equipment' },
      { id: 'equipment_edit', label: 'Edit Equipment' },
      { id: 'equipment_delete', label: 'Delete Equipment' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    permissions: [
      { id: 'reports_view', label: 'View Reports' },
      { id: 'reports_export', label: 'Export Reports' },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    permissions: [
      { id: 'settings_view', label: 'View Settings' },
      { id: 'settings_edit', label: 'Edit Settings' },
    ],
  },
  {
    id: 'team',
    name: 'Team Management',
    permissions: [
      { id: 'team_view', label: 'View Team' },
      { id: 'team_invite', label: 'Invite Members' },
      { id: 'team_edit', label: 'Edit Members' },
      { id: 'team_delete', label: 'Remove Members' },
      { id: 'team_roles', label: 'Manage Roles' },
    ],
  },
]

// Role type with permissions
interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean // System roles cannot be deleted
  permissions: string[]
  color: string
}

// Default roles
const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all features',
    isSystem: true,
    permissions: PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.id)),
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage quotes, customers, and equipment',
    isSystem: true,
    permissions: [
      'quotes_view', 'quotes_create', 'quotes_edit', 'quotes_delete', 'quotes_export',
      'customers_view', 'customers_create', 'customers_edit', 'customers_delete',
      'equipment_view', 'equipment_create', 'equipment_edit',
      'reports_view', 'reports_export',
      'settings_view',
      'team_view',
    ],
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Create and manage own quotes',
    isSystem: true,
    permissions: [
      'quotes_view', 'quotes_create', 'quotes_edit', 'quotes_export',
      'customers_view', 'customers_create',
      'equipment_view',
      'reports_view',
    ],
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'View only access',
    isSystem: true,
    permissions: ['quotes_view', 'customers_view', 'equipment_view', 'reports_view'],
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
]

// Available colors for custom roles
const ROLE_COLOR_OPTIONS = [
  { id: 'red', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { id: 'blue', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'green', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'yellow', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { id: 'purple', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'orange', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { id: 'pink', class: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { id: 'gray', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
]

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  invited: 'bg-yellow-100 text-yellow-800',
}

interface TeamMember {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
  avatar_url?: string
  created_at: string
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member' as UserRole,
  })
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member' as UserRole,
  })
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member' as UserRole,
  })

  // Roles management state
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: ROLE_COLOR_OPTIONS[0].class,
    permissions: [] as string[],
  })

  // Get role helpers
  const getRoleLabel = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    return role?.name || roleId
  }

  const getRoleColor = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    return role?.color || 'bg-gray-100 text-gray-800'
  }

  // Fetch team members
  const { data, isLoading, refetch } = trpc.user.getTeamMembers.useQuery({
    limit: 50,
    offset: 0,
    search: searchQuery || undefined,
  })

  // Mutations
  const inviteMember = trpc.user.inviteTeamMember.useMutation({
    onSuccess: () => {
      toast.success('Team member invited successfully')
      refetch()
      setShowInviteDialog(false)
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'member' })
    },
    onError: (error) => {
      toast.error(`Failed to invite member: ${error.message}`)
    },
  })

  const createMember = trpc.user.createTeamMember.useMutation({
    onSuccess: () => {
      toast.success('Team member created successfully')
      refetch()
      setShowCreateDialog(false)
      setCreateForm({ email: '', first_name: '', last_name: '', role: 'member' })
    },
    onError: (error) => {
      toast.error(`Failed to create member: ${error.message}`)
    },
  })

  const updateMember = trpc.user.updateTeamMember.useMutation({
    onSuccess: () => {
      toast.success('Team member updated successfully')
      refetch()
      setShowEditDialog(false)
      setEditingMember(null)
    },
    onError: (error) => {
      toast.error(`Failed to update member: ${error.message}`)
    },
  })

  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Role updated successfully')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`)
    },
  })

  const updateStatus = trpc.user.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`)
    },
  })

  const removeMember = trpc.user.removeTeamMember.useMutation({
    onSuccess: () => {
      toast.success('Team member removed')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`)
    },
  })

  const handleInvite = () => {
    if (!inviteForm.email || !inviteForm.first_name || !inviteForm.last_name) {
      toast.error('Please fill in all required fields')
      return
    }
    inviteMember.mutate(inviteForm)
  }

  const handleCreate = () => {
    if (!createForm.email || !createForm.first_name || !createForm.last_name) {
      toast.error('Please fill in all required fields')
      return
    }
    createMember.mutate(createForm)
  }

  const handleEdit = () => {
    if (!editingMember) return
    if (!editForm.email || !editForm.first_name || !editForm.last_name) {
      toast.error('Please fill in all required fields')
      return
    }
    updateMember.mutate({
      userId: editingMember.id,
      email: editForm.email,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      role: editForm.role,
    })
  }

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member)
    setEditForm({
      email: member.email,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      role: member.role as UserRole,
    })
    setShowEditDialog(true)
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  // Role management functions
  const openNewRoleDialog = () => {
    setEditingRole(null)
    setRoleForm({
      name: '',
      description: '',
      color: ROLE_COLOR_OPTIONS[4].class, // Purple for new roles
      permissions: [],
    })
    setShowRoleDialog(true)
  }

  const openEditRoleDialog = (role: Role) => {
    setEditingRole(role)
    setRoleForm({
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    })
    setShowRoleDialog(true)
  }

  const closeRoleDialog = () => {
    setShowRoleDialog(false)
    setEditingRole(null)
    setRoleForm({
      name: '',
      description: '',
      color: ROLE_COLOR_OPTIONS[0].class,
      permissions: [],
    })
  }

  const togglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }

  const toggleCategoryPermissions = (categoryId: string) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return

    const categoryPermissionIds = category.permissions.map(p => p.id)
    const allSelected = categoryPermissionIds.every(id => roleForm.permissions.includes(id))

    if (allSelected) {
      // Remove all category permissions
      setRoleForm(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissionIds.includes(p)),
      }))
    } else {
      // Add all category permissions
      setRoleForm(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissionIds])],
      }))
    }
  }

  const saveRole = () => {
    if (!roleForm.name.trim()) {
      toast.error('Role name is required')
      return
    }

    if (editingRole) {
      // Update existing role
      setRoles(prev =>
        prev.map(r =>
          r.id === editingRole.id
            ? {
                ...r,
                name: roleForm.name.trim(),
                description: roleForm.description.trim(),
                color: roleForm.color,
                permissions: roleForm.permissions,
              }
            : r
        )
      )
      toast.success('Role updated successfully')
    } else {
      // Create new role
      const newId = roleForm.name.toLowerCase().replace(/\s+/g, '_')
      if (roles.some(r => r.id === newId)) {
        toast.error('A role with a similar name already exists')
        return
      }
      const newRole: Role = {
        id: newId,
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        isSystem: false,
        color: roleForm.color,
        permissions: roleForm.permissions,
      }
      setRoles(prev => [...prev, newRole])
      toast.success('Role created successfully')
    }
    closeRoleDialog()
  }

  const deleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.isSystem) {
      toast.error('System roles cannot be deleted')
      return
    }
    // Check if any users have this role
    const usersWithRole = data?.users?.filter(u => u.role === roleId).length || 0
    if (usersWithRole > 0) {
      toast.error(`Cannot delete role: ${usersWithRole} user(s) have this role assigned`)
      return
    }
    setRoles(prev => prev.filter(r => r.id !== roleId))
    toast.success('Role deleted successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        {activeTab === 'members' ? (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowCreateDialog(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
            <Button variant="outline" onClick={() => setShowInviteDialog(true)} className="flex-1 sm:flex-none">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        ) : (
          <Button onClick={openNewRoleDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.users?.filter((u) => u.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.users?.filter((u) => u.status === 'invited').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.users?.filter((u) => u.role === 'admin').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading team members...
            </div>
          ) : !data?.users || data.users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members found</p>
              <p className="text-sm">Invite your first team member to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[user.status as UserStatus] || ''}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(user.created_at))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(user as TeamMember)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              updateRole.mutate({
                                userId: user.id,
                                role: 'admin',
                              })
                            }
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateRole.mutate({
                                userId: user.id,
                                role: 'manager',
                              })
                            }
                          >
                            Make Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateRole.mutate({
                                userId: user.id,
                                role: 'member',
                              })
                            }
                          >
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatus.mutate({
                                  userId: user.id,
                                  status: 'inactive',
                                })
                              }
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatus.mutate({
                                  userId: user.id,
                                  status: 'active',
                                })
                              }
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMember.mutate({ userId: user.id })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="grid gap-6">
            {/* Roles List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles
                </CardTitle>
                <CardDescription>
                  Manage roles and their associated permissions. Click on a role to edit its permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge className={role.color}>{role.name}</Badge>
                        <div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.permissions.length} permissions
                            {role.isSystem && ' • System role'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditRoleDialog(role)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteRole(role.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Permissions Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Permissions Overview
                </CardTitle>
                <CardDescription>
                  See which permissions are assigned to each role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Permission</TableHead>
                        {roles.map(role => (
                          <TableHead key={role.id} className="text-center">
                            <Badge variant="outline" className={role.color}>
                              {role.name}
                            </Badge>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PERMISSION_CATEGORIES.map(category => (
                        <>
                          <TableRow key={category.id} className="bg-muted/50">
                            <TableCell colSpan={roles.length + 1} className="font-semibold">
                              {category.name}
                            </TableCell>
                          </TableRow>
                          {category.permissions.map(permission => (
                            <TableRow key={permission.id}>
                              <TableCell className="text-sm pl-6">
                                {permission.label}
                              </TableCell>
                              {roles.map(role => (
                                <TableCell key={role.id} className="text-center">
                                  {role.permissions.includes(permission.id) ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={inviteForm.first_name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={inviteForm.last_name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: UserRole) =>
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${role.color.split(' ')[0]}`} />
                        {role.name} - {role.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMember.isPending}>
              {inviteMember.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team Member</DialogTitle>
            <DialogDescription>
              Create a new user account directly (no email invitation)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="createFirstName">First Name *</Label>
                <Input
                  id="createFirstName"
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createLastName">Last Name *</Label>
                <Input
                  id="createLastName"
                  value={createForm.last_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createEmail">Email *</Label>
              <Input
                id="createEmail"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createRole">Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value: UserRole) =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${role.color.split(' ')[0]}`} />
                        {role.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMember.isPending}>
              {createMember.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member&apos;s details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: UserRole) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${role.color.split(' ')[0]}`} />
                        {role.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMember.isPending}>
              {updateMember.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Edit/Create Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Modify the role settings and permissions below.'
                : 'Define a new role with custom permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Role Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Sales Rep"
                  disabled={editingRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Input
                  id="roleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="e.g., Can create and manage quotes"
                />
              </div>
            </div>

            {/* Role Color */}
            <div className="space-y-2">
              <Label>Badge Color</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setRoleForm({ ...roleForm, color: color.class })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${color.class} ${
                      roleForm.color === color.class ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                  >
                    {color.id.charAt(0).toUpperCase() + color.id.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Permissions */}
            <div className="space-y-4">
              <div>
                <Label className="text-base">Permissions</Label>
                <p className="text-sm text-muted-foreground">
                  Select which permissions this role should have
                </p>
              </div>

              {PERMISSION_CATEGORIES.map(category => {
                const categoryPermissionIds = category.permissions.map(p => p.id)
                const allSelected = categoryPermissionIds.every(id => roleForm.permissions.includes(id))
                const someSelected = categoryPermissionIds.some(id => roleForm.permissions.includes(id))

                return (
                  <div key={category.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={allSelected}
                          onCheckedChange={() => toggleCategoryPermissions(category.id)}
                        />
                        <Label className="font-medium">{category.name}</Label>
                        {someSelected && !allSelected && (
                          <span className="text-xs text-muted-foreground">(partial)</span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 pl-6 md:grid-cols-2">
                      {category.permissions.map(permission => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <Switch
                            checked={roleForm.permissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                            className="scale-75"
                          />
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRoleDialog}>
              Cancel
            </Button>
            <Button onClick={saveRole}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
