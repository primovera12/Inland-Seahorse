'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  GitCompare,
  ArrowRight,
  Equal,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react'

export default function QuoteComparisonPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  // Fetch all versions of this quote
  const { data: versions, isLoading: versionsLoading } = trpc.quotes.getVersions.useQuery({
    quoteId,
  })

  // State for selected versions to compare
  const [version1Id, setVersion1Id] = useState<string | null>(null)
  const [version2Id, setVersion2Id] = useState<string | null>(null)

  // Auto-select latest two versions when data loads
  useMemo(() => {
    if (versions && versions.length >= 2 && !version1Id && !version2Id) {
      setVersion1Id(versions[1]?.id || null) // Second latest
      setVersion2Id(versions[0]?.id || null) // Latest
    } else if (versions && versions.length === 1 && !version2Id) {
      setVersion2Id(versions[0]?.id || null)
    }
  }, [versions, version1Id, version2Id])

  // Fetch comparison data when both versions are selected
  const { data: comparison, isLoading: comparisonLoading } = trpc.quotes.compareVersions.useQuery(
    { quoteId1: version1Id!, quoteId2: version2Id! },
    { enabled: !!version1Id && !!version2Id }
  )

  if (versionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Version Comparison</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No versions found</p>
            <p className="text-sm">This quote has no version history.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (versions.length === 1) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Version Comparison</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitCompare className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">Only one version exists</p>
            <p className="text-sm">Create a new revision to compare versions.</p>
            <Link href={`/quotes/${quoteId}/edit`}>
              <Button className="mt-4">
                Edit Quote
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Version Comparison</h1>
            <p className="text-muted-foreground">
              Compare changes between quote versions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            // Swap versions
            const temp = version1Id
            setVersion1Id(version2Id)
            setVersion2Id(temp)
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Swap Versions
        </Button>
      </div>

      {/* Version Selectors */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Older Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={version1Id || ''} onValueChange={setVersion1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select older version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === version2Id}>
                    Version {v.version} - {v.quote_number}
                    {v.is_latest_version && ' (Latest)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Newer Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={version2Id || ''} onValueChange={setVersion2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select newer version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === version1Id}>
                    Version {v.version} - {v.quote_number}
                    {v.is_latest_version && ' (Latest)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      {comparisonLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Comparing versions...</p>
            </div>
          </CardContent>
        </Card>
      ) : comparison ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  Differences Found
                </CardTitle>
                <CardDescription>
                  Comparing {comparison.quote1.quote_number} → {comparison.quote2.quote_number}
                </CardDescription>
              </div>
              <Badge variant={comparison.differences.length > 0 ? 'default' : 'secondary'}>
                {comparison.differences.length} change{comparison.differences.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {comparison.differences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Equal className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No differences found</p>
                <p className="text-sm">These two versions are identical.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comparison.differences.map((diff, index) => (
                  <DiffRow key={index} diff={diff} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : version1Id && version2Id ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">Unable to compare</p>
            <p className="text-sm">Please select two different versions to compare.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Version History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>
            All versions of this quote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="flex items-start gap-4 relative">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      version.is_latest_version
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground bg-background'
                    }`}
                  >
                    <span className="text-xs font-semibold">{version.version}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {version.quote_number}
                          {version.is_latest_version && (
                            <Badge className="ml-2" variant="secondary">
                              Current
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(version.created_at)}
                          {version.created_by_name && ` by ${version.created_by_name}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVersion1Id(version.id)}
                          disabled={version.id === version1Id}
                          className={version.id === version1Id ? 'bg-red-50 text-red-600' : ''}
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          Old
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVersion2Id(version.id)}
                          disabled={version.id === version2Id}
                          className={version.id === version2Id ? 'bg-green-50 text-green-600' : ''}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          New
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Diff row component
function DiffRow({
  diff,
}: {
  diff: {
    field: string
    label: string
    oldValue: unknown
    newValue: unknown
  }
}) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') {
      // Check if it looks like a currency value (cents)
      if (['subtotal', 'total', 'margin_amount'].includes(diff.field)) {
        return formatCurrency(value)
      }
      if (diff.field === 'margin_percentage') {
        return `${value}%`
      }
      return value.toLocaleString()
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const oldFormatted = formatValue(diff.oldValue)
  const newFormatted = formatValue(diff.newValue)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline">{diff.label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Old Value */}
        <div className="rounded bg-red-50 dark:bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs text-red-600 dark:text-red-400">
            <Minus className="h-3 w-3" />
            <span className="font-medium">Previous</span>
          </div>
          <p className="text-sm font-mono break-all">{oldFormatted}</p>
        </div>

        {/* New Value */}
        <div className="rounded bg-green-50 dark:bg-green-950/30 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs text-green-600 dark:text-green-400">
            <Plus className="h-3 w-3" />
            <span className="font-medium">Updated</span>
          </div>
          <p className="text-sm font-mono break-all">{newFormatted}</p>
        </div>
      </div>
    </div>
  )
}
