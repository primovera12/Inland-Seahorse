'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Settings, Building2, Palette, FileText, Bell, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: 'Dismantle Pro',
    company_address: '',
    company_city: '',
    company_state: '',
    company_zip: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    primary_color: '#6366F1',
    default_payment_terms: 'Net 30',
    quote_validity_days: 30,
    default_margin_percentage: 15,
    quote_prefix: 'QT',
    email_notifications_enabled: true,
    notification_email: '',
  })

  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-muted-foreground">Manage your company information and preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
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
            <CardDescription>Customize the look of your quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>

            <Separator />

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Preview</p>
              <div
                className="h-10 rounded flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: settings.primary_color }}
              >
                {settings.company_name}
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
    </div>
  )
}
