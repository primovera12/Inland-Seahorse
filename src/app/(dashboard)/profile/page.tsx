'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Shield,
  Clock,
  Calendar,
  Check,
  AlertCircle,
  Save,
  KeyRound,
  Smartphone,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  owner: { label: 'Owner', color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  manager: { label: 'Manager', color: 'bg-green-100 text-green-800' },
  member: { label: 'Member', color: 'bg-gray-100 text-gray-800' },
  viewer: { label: 'Viewer', color: 'bg-yellow-100 text-yellow-800' },
}

export default function ProfilePage() {
  const { data: user, isLoading } = trpc.user.me.useQuery()
  const utils = trpc.useUtils()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Initialize form values when user data loads
  const initEditMode = () => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setIsEditing(true)
    }
  }

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully')
      setIsEditing(false)
      utils.user.me.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`)
    },
  })

  const handleSave = () => {
    updateProfile.mutate({
      first_name: firstName || undefined,
      last_name: lastName || undefined,
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">User not found</div>
      </div>
    )
  }

  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || user.email[0].toUpperCase()

  const roleConfig = ROLE_LABELS[user.role] || ROLE_LABELS.member

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatar_url} alt={user.first_name || 'User'} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={updateProfile.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">First Name</Label>
                      <p className="font-medium">{user.first_name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Last Name</Label>
                      <p className="font-medium">{user.last_name || '-'}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={initEditMode}>
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Verification */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Verify your email address for account security
                    </p>
                  </div>
                </div>
                {user.email_verified ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                {user.two_factor_enabled ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Enable
                  </Button>
                )}
              </div>

              {/* Change Password */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Change your account password
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {user.is_active ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since:</span>
                </div>
                <p className="font-medium">{formatDate(new Date(user.created_at))}</p>
              </div>
              {user.last_login_at && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last login:</span>
                    </div>
                    <p className="font-medium">{formatDate(new Date(user.last_login_at))}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="font-medium">{roleConfig.label}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-mono text-xs truncate max-w-[150px]">{user.email}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
