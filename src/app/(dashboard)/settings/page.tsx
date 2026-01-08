'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { ImageUpload } from '@/components/ui/image-upload'
import { Building2, Palette, FileText, Bell, Save, ChevronRight, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import Link from 'next/link'
import Image from 'next/image'

type SettingsState = {
  company_name: string
  company_address: string
  company_city: string
  company_state: string
  company_zip: string
  company_phone: string
  company_email: string
  company_website: string
  company_logo_url: string | null
  logo_size_percentage: number
  primary_color: string
  secondary_color: string | null
  default_payment_terms: string
  quote_validity_days: number
  default_margin_percentage: number
  quote_prefix: string
  email_notifications_enabled: boolean
  notification_email: string
}

const defaultSettings: SettingsState = {
  company_name: 'Dismantle Pro',
  company_address: '',
  company_city: '',
  company_state: '',
  company_zip: '',
  company_phone: '',
  company_email: '',
  company_website: '',
  company_logo_url: null,
  logo_size_percentage: 100,
  primary_color: '#6366F1',
  secondary_color: null,
  default_payment_terms: 'Net 30',
  quote_validity_days: 30,
  default_margin_percentage: 15,
  quote_prefix: 'QT',
  email_notifications_enabled: true,
  notification_email: '',
}

export default function SettingsPage() {
  const [localSettings, setLocalSettings] = useState<SettingsState | null>(null)

  const utils = trpc.useUtils()

  // Load settings from database
  const { data: savedSettings } = trpc.settings.get.useQuery()

  // Use local state if user has made edits, otherwise derive from saved data
  const settings: SettingsState = localSettings ?? (savedSettings ? {
    company_name: savedSettings.company_name || defaultSettings.company_name,
    company_address: savedSettings.company_address || defaultSettings.company_address,
    company_city: savedSettings.company_city || defaultSettings.company_city,
    company_state: savedSettings.company_state || defaultSettings.company_state,
    company_zip: savedSettings.company_zip || defaultSettings.company_zip,
    company_phone: savedSettings.company_phone || defaultSettings.company_phone,
    company_email: savedSettings.company_email || defaultSettings.company_email,
    company_website: savedSettings.company_website || defaultSettings.company_website,
    company_logo_url: savedSettings.company_logo_url || defaultSettings.company_logo_url,
    logo_size_percentage: savedSettings.logo_size_percentage || defaultSettings.logo_size_percentage,
    primary_color: savedSettings.primary_color || defaultSettings.primary_color,
    secondary_color: savedSettings.secondary_color || defaultSettings.secondary_color,
    default_payment_terms: savedSettings.default_payment_terms || defaultSettings.default_payment_terms,
    quote_validity_days: savedSettings.quote_validity_days || defaultSettings.quote_validity_days,
    default_margin_percentage: savedSettings.default_margin_percentage || defaultSettings.default_margin_percentage,
    quote_prefix: savedSettings.quote_prefix || defaultSettings.quote_prefix,
    email_notifications_enabled: savedSettings.email_notifications_enabled ?? defaultSettings.email_notifications_enabled,
    notification_email: savedSettings.notification_email || defaultSettings.notification_email,
  } : defaultSettings)

  const setSettings = (newSettings: SettingsState) => setLocalSettings(newSettings)

  // Update mutation
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate()
      setLocalSettings(null) // Reset to use saved data
      toast.success('Settings saved successfully')
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      company_name: settings.company_name,
      company_address: settings.company_address,
      company_city: settings.company_city,
      company_state: settings.company_state,
      company_zip: settings.company_zip,
      company_phone: settings.company_phone,
      company_email: settings.company_email || undefined,
      company_website: settings.company_website,
      company_logo_url: settings.company_logo_url,
      logo_size_percentage: settings.logo_size_percentage,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      default_payment_terms: settings.default_payment_terms,
      quote_validity_days: settings.quote_validity_days,
      default_margin_percentage: settings.default_margin_percentage,
      quote_prefix: settings.quote_prefix,
      email_notifications_enabled: settings.email_notifications_enabled,
      notification_email: settings.notification_email || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-muted-foreground">Manage your company information and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Basic company details for quotes and invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address">Address</Label>
              <Input
                id="company_address"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="company_city">City</Label>
                <Input
                  id="company_city"
                  value={settings.company_city}
                  onChange={(e) => setSettings({ ...settings, company_city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_state">State</Label>
                <Input
                  id="company_state"
                  value={settings.company_state}
                  onChange={(e) => setSettings({ ...settings, company_state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_zip">ZIP</Label>
                <Input
                  id="company_zip"
                  value={settings.company_zip}
                  onChange={(e) => setSettings({ ...settings, company_zip: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone</Label>
                <Input
                  id="company_phone"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                id="company_website"
                value={settings.company_website}
                onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Customize the look of your quotes and PDFs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Logo */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload your company logo to display on quote PDFs
              </p>
              <ImageUpload
                value={settings.company_logo_url}
                onChange={(url) => setSettings({ ...settings, company_logo_url: url })}
                bucket="company-assets"
                folder="logos"
                label="Upload Logo"
                maxSizeMB={2}
              />
            </div>

            {settings.company_logo_url && (
              <div className="space-y-2">
                <Label>Logo Size: {settings.logo_size_percentage}%</Label>
                <Slider
                  value={[settings.logo_size_percentage]}
                  onValueChange={([value]) => setSettings({ ...settings, logo_size_percentage: value })}
                  min={30}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust the size of your logo in the PDF header
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for PDF headers, buttons, and accents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.secondary_color || '#6366F1'}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.secondary_color || ''}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value || null })}
                  placeholder="Leave empty to use primary"
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for secondary highlights in PDFs
              </p>
            </div>

            <Separator />

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">PDF Header Preview</p>
              <div
                className="h-12 rounded flex items-center px-4 gap-3 text-white font-medium"
                style={{ backgroundColor: settings.primary_color }}
              >
                {settings.company_logo_url ? (
                  <div
                    className="relative bg-white rounded p-1"
                    style={{
                      width: `${(settings.logo_size_percentage / 100) * 40}px`,
                      height: `${(settings.logo_size_percentage / 100) * 40}px`,
                    }}
                  >
                    <Image
                      src={settings.company_logo_url}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : null}
                <span>{settings.company_name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Settings
            </CardTitle>
            <CardDescription>Default values for new quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote_prefix">Quote Number Prefix</Label>
              <Input
                id="quote_prefix"
                value={settings.quote_prefix}
                onChange={(e) => setSettings({ ...settings, quote_prefix: e.target.value })}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Example: {settings.quote_prefix}-20260107-1234
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_margin_percentage">Default Margin (%)</Label>
                <Input
                  id="default_margin_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.default_margin_percentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_margin_percentage: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote_validity_days">Quote Validity (days)</Label>
                <Input
                  id="quote_validity_days"
                  type="number"
                  min="1"
                  value={settings.quote_validity_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      quote_validity_days: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_payment_terms">Default Payment Terms</Label>
              <Input
                id="default_payment_terms"
                value={settings.default_payment_terms}
                onChange={(e) =>
                  setSettings({ ...settings, default_payment_terms: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Email notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about quotes
                </p>
              </div>
              <Switch
                checked={settings.email_notifications_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, email_notifications_enabled: checked })
                }
              />
            </div>

            {settings.email_notifications_enabled && (
              <div className="space-y-2">
                <Label htmlFor="notification_email">Notification Email</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_email: e.target.value })
                  }
                  placeholder="notifications@company.com"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terms & Conditions Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Terms & Conditions
          </CardTitle>
          <CardDescription>Manage terms and conditions for different quote types</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/terms">
            <Button variant="outline" className="w-full justify-between">
              <span>Manage Terms & Conditions</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">
            Set different terms for Dismantle and Inland quotes. Terms are versioned for compliance tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
