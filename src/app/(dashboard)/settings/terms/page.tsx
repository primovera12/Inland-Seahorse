'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Save, FileText, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function TermsSettingsPage() {
  const [dismantleTerms, setDismantleTerms] = useState('')
  const [inlandTerms, setInlandTerms] = useState('')
  const [activeTab, setActiveTab] = useState<'dismantle' | 'inland'>('dismantle')
  const [hasChanges, setHasChanges] = useState(false)

  const utils = trpc.useUtils()

  const { data: settings, isLoading } = trpc.settings.get.useQuery()

  const updateTermsMutation = trpc.settings.updateTerms.useMutation({
    onSuccess: (data) => {
      utils.settings.get.invalidate()
      toast.success(`Terms & Conditions updated (v${data.version})`)
      setHasChanges(false)
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message)
    },
  })

  // Load initial values
  useEffect(() => {
    if (settings) {
      setDismantleTerms(settings.terms_dismantle || '')
      setInlandTerms(settings.terms_inland || '')
    }
  }, [settings])

  const handleSave = () => {
    const content = activeTab === 'dismantle' ? dismantleTerms : inlandTerms
    updateTermsMutation.mutate({
      type: activeTab,
      content,
    })
  }

  const handleTermsChange = (value: string) => {
    setHasChanges(true)
    if (activeTab === 'dismantle') {
      setDismantleTerms(value)
    } else {
      setInlandTerms(value)
    }
  }

  const currentTerms = activeTab === 'dismantle' ? dismantleTerms : inlandTerms

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
            <p className="text-muted-foreground">
              Manage terms and conditions for your quotes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {settings?.terms_version && (
            <Badge variant="outline" className="text-xs">
              Version {settings.terms_version}
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateTermsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateTermsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Terms & Conditions
          </CardTitle>
          <CardDescription>
            Set different terms for Dismantle and Inland quotes. These will appear in the PDF footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dismantle' | 'inland')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="dismantle">Dismantle Quotes</TabsTrigger>
              <TabsTrigger value="inland">Inland Quotes</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {hasChanges && (
                <div className="flex items-center gap-2 text-amber-600 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">You have unsaved changes</span>
                </div>
              )}

              <TabsContent value="dismantle" className="mt-0">
                <div className="space-y-2">
                  <Label>Dismantle Quote Terms</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Terms for equipment dismantling and rigging quotes
                  </p>
                  <textarea
                    className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    value={dismantleTerms}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    placeholder="Enter terms and conditions for dismantle quotes..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="inland" className="mt-0">
                <div className="space-y-2">
                  <Label>Inland Quote Terms</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Terms for inland transportation and logistics quotes
                  </p>
                  <textarea
                    className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    value={inlandTerms}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    placeholder="Enter terms and conditions for inland quotes..."
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Suggested Terms Sections</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Payment Terms</h4>
                <p className="text-xs text-muted-foreground">
                  Define payment schedules, deposits, and accepted payment methods.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Liability & Insurance</h4>
                <p className="text-xs text-muted-foreground">
                  Specify liability limits, insurance requirements, and damage policies.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Cancellation Policy</h4>
                <p className="text-xs text-muted-foreground">
                  Outline cancellation fees and notice requirements.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Quote Validity</h4>
                <p className="text-xs text-muted-foreground">
                  Note that quote prices are valid for the specified period only.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
