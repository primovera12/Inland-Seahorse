'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'

type ChartType = 'line' | 'bar'

interface DataPoint {
  date: string
  [key: string]: string | number
}

interface TrendChartProps {
  title?: string
  description?: string
  data: DataPoint[]
  dataKey: string
  secondaryDataKey?: string
  type?: ChartType
  color?: string
  secondaryColor?: string
  formatValue?: (value: number) => string
  formatDate?: (date: string) => string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  loading?: boolean
  emptyMessage?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    color: string
  }>
  label?: string
  formatValue?: (value: number) => string
  formatDate?: (date: string) => string
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  formatDate,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const formattedDate = formatDate ? formatDate(label as string) : label

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-muted-foreground mb-2">{formattedDate}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm">
            {entry.name}: {formatValue ? formatValue(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({
  title,
  description,
  data,
  dataKey,
  secondaryDataKey,
  type = 'line',
  color = '#3b82f6',
  secondaryColor = '#10b981',
  formatValue,
  formatDate,
  height = 300,
  showGrid = true,
  showLegend = false,
  loading = false,
  emptyMessage = 'No data available',
}: TrendChartProps) {
  const defaultFormatDate = (date: string) => {
    try {
      return format(parseISO(date), 'MMM d')
    } catch {
      return date
    }
  }

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      formattedDate: (formatDate || defaultFormatDate)(item.date),
    }))
  }, [data, formatDate])

  const isEmpty = !data || data.length === 0

  const renderChart = () => {
    if (type === 'bar') {
      return (
        <BarChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatValue}
            className="text-muted-foreground"
          />
          <Tooltip
            content={<CustomTooltip formatValue={formatValue} formatDate={formatDate || defaultFormatDate} />}
          />
          {showLegend && <Legend />}
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            name={dataKey.replace(/([A-Z])/g, ' $1').trim()}
          />
          {secondaryDataKey && (
            <Bar
              dataKey={secondaryDataKey}
              fill={secondaryColor}
              radius={[4, 4, 0, 0]}
              name={secondaryDataKey.replace(/([A-Z])/g, ' $1').trim()}
            />
          )}
        </BarChart>
      )
    }

    return (
      <LineChart data={chartData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="formattedDate"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
          className="text-muted-foreground"
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatValue} formatDate={formatDate || defaultFormatDate} />}
        />
        {showLegend && <Legend />}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name={dataKey.replace(/([A-Z])/g, ' $1').trim()}
        />
        {secondaryDataKey && (
          <Line
            type="monotone"
            dataKey={secondaryDataKey}
            stroke={secondaryColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            name={secondaryDataKey.replace(/([A-Z])/g, ' $1').trim()}
          />
        )}
      </LineChart>
    )
  }

  const content = (
    <>
      {loading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-muted-foreground">{emptyMessage}</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </>
  )

  if (!title) return content

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
