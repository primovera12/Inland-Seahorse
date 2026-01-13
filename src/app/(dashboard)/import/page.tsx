'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Building2,
  Users,
  Package,
  DollarSign,
} from 'lucide-react'

type ImportType = 'makes' | 'models' | 'companies' | 'contacts' | 'rates'

const IMPORT_CONFIG: Record<
  ImportType,
  { label: string; icon: typeof Building2; description: string; columns: string[] }
> = {
  makes: {
    label: 'Equipment Makes',
    icon: Package,
    description: 'Import equipment manufacturers (e.g., Caterpillar, Komatsu)',
    columns: ['name', 'popularity_rank (optional)'],
  },
  models: {
    label: 'Equipment Models',
    icon: Package,
    description: 'Import equipment models with their make',
    columns: ['make_name', 'name'],
  },
  companies: {
    label: 'Companies',
    icon: Building2,
    description: 'Import customer companies',
    columns: ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'status'],
  },
  contacts: {
    label: 'Contacts',
    icon: Users,
    description: 'Import contacts linked to companies',
    columns: ['company_name', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_primary'],
  },
  rates: {
    label: 'Equipment Rates',
    icon: DollarSign,
    description: 'Import pricing rates by make, model, and location',
    columns: [
      'make_name',
      'model_name',
      'location',
      'dismantling_loading_cost',
      'loading_cost',
      'blocking_bracing_cost',
      'rigging_cost',
      'storage_cost',
      'transport_cost',
      'equipment_cost',
      'labor_cost',
      'permit_cost',
      'escort_cost',
      'miscellaneous_cost',
    ],
  },
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('companies')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([])
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    updated?: number
    errors: string[]
  } | null>(null)

  // Import mutations
  const importMakes = trpc.import.importMakes.useMutation()
  const importModels = trpc.import.importModels.useMutation()
  const importCompanies = trpc.import.importCompanies.useMutation()
  const importContacts = trpc.import.importContacts.useMutation()
  const importRates = trpc.import.importRates.useMutation()

  const parseCSV = useCallback((text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const data: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }

    return data
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return

      setFile(selectedFile)
      setResult(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const data = parseCSV(text)
        setParsedData(data)
      }
      reader.readAsText(selectedFile)
    },
    [parseCSV]
  )

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import')
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      let importResult: { imported: number; skipped: number; updated?: number; errors: string[] }

      switch (importType) {
        case 'makes':
          importResult = await importMakes.mutateAsync({
            data: parsedData.map((row) => ({
              name: String(row.name || ''),
              popularity_rank: row.popularity_rank ? Number(row.popularity_rank) : undefined,
            })),
            skipDuplicates,
          })
          break

        case 'models':
          importResult = await importModels.mutateAsync({
            data: parsedData.map((row) => ({
              make_name: String(row.make_name || ''),
              name: String(row.name || ''),
            })),
            skipDuplicates,
          })
          break

        case 'companies':
          importResult = await importCompanies.mutateAsync({
            data: parsedData.map((row) => ({
              name: String(row.name || ''),
              email: row.email ? String(row.email) : undefined,
              phone: row.phone ? String(row.phone) : undefined,
              address: row.address ? String(row.address) : undefined,
              city: row.city ? String(row.city) : undefined,
              state: row.state ? String(row.state) : undefined,
              zip: row.zip ? String(row.zip) : undefined,
              status: row.status as 'active' | 'inactive' | 'prospect' | 'vip' | undefined,
            })),
            skipDuplicates,
          })
          break

        case 'contacts':
          importResult = await importContacts.mutateAsync({
            data: parsedData.map((row) => ({
              company_name: String(row.company_name || ''),
              first_name: String(row.first_name || ''),
              last_name: String(row.last_name || ''),
              email: row.email ? String(row.email) : undefined,
              phone: row.phone ? String(row.phone) : undefined,
              role: row.role ? String(row.role) : undefined,
              is_primary: row.is_primary === 'true' || row.is_primary === '1',
            })),
            skipDuplicates,
          })
          break

        case 'rates':
          importResult = await importRates.mutateAsync({
            data: parsedData.map((row) => ({
              make_name: String(row.make_name || ''),
              model_name: String(row.model_name || ''),
              location: String(row.location || ''),
              dismantling_loading_cost: row.dismantling_loading_cost
                ? Number(row.dismantling_loading_cost)
                : undefined,
              loading_cost: row.loading_cost ? Number(row.loading_cost) : undefined,
              blocking_bracing_cost: row.blocking_bracing_cost
                ? Number(row.blocking_bracing_cost)
                : undefined,
              rigging_cost: row.rigging_cost ? Number(row.rigging_cost) : undefined,
              storage_cost: row.storage_cost ? Number(row.storage_cost) : undefined,
              transport_cost: row.transport_cost ? Number(row.transport_cost) : undefined,
              equipment_cost: row.equipment_cost ? Number(row.equipment_cost) : undefined,
              labor_cost: row.labor_cost ? Number(row.labor_cost) : undefined,
              permit_cost: row.permit_cost ? Number(row.permit_cost) : undefined,
              escort_cost: row.escort_cost ? Number(row.escort_cost) : undefined,
              miscellaneous_cost: row.miscellaneous_cost
                ? Number(row.miscellaneous_cost)
                : undefined,
            })),
            skipDuplicates,
          })
          break

        default:
          throw new Error('Invalid import type')
      }

      setResult(importResult)

      if (importResult.errors.length === 0) {
        toast.success(
          `Successfully imported ${importResult.imported} records${
            importResult.updated ? `, updated ${importResult.updated}` : ''
          }`
        )
      } else {
        toast.warning(
          `Imported ${importResult.imported} records with ${importResult.errors.length} errors`
        )
      }
    } catch (error) {
      toast.error(`Import failed: ${(error as Error).message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const config = IMPORT_CONFIG[importType]
    const csvContent = config.columns.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${importType}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const config = IMPORT_CONFIG[importType]
  const Icon = config.icon

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Import</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Import data from CSV files into your system
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
            <CardDescription>Select what you want to import and upload your file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Data Type</Label>
              <Select
                value={importType}
                onValueChange={(value: ImportType) => {
                  setImportType(value)
                  setFile(null)
                  setParsedData([])
                  setResult(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className="h-4 w-4" />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-medium">{config.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Required columns:</p>
                <div className="flex flex-wrap gap-1">
                  {config.columns.slice(0, 6).map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                  {config.columns.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{config.columns.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-2 px-0"
                onClick={downloadTemplate}
              >
                <Download className="h-3 w-3 mr-1" />
                Download template
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedData.length} rows found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">CSV files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipDuplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
              />
              <Label htmlFor="skipDuplicates" className="text-sm">
                Skip duplicate records
              </Label>
            </div>

            <Button
              className="w-full"
              disabled={parsedData.length === 0 || isImporting}
              onClick={handleImport}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : `Import ${parsedData.length} Records`}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Review the results of your import</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mb-4 opacity-50" />
                <p>Upload and import a file to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{result.imported}</p>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                    <p className="text-2xl font-bold">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="text-2xl font-bold">{result.errors.length}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-destructive">Errors:</p>
                    <div className="max-h-[200px] overflow-y-auto rounded-lg border p-3 bg-destructive/5">
                      {result.errors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
