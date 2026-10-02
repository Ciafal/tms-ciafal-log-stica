import React, { useState, useMemo, useRef } from 'react'
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  RotateCcw,
  Download,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Sparkles,
  Layers,
  Scale,
  Clock,
  DollarSign,
  Maximize2,
  Sliders,
  CheckCircle2,
  Table as TableIcon,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  GeneralTransportRecord,
  GeneralTransportFilterParams,
} from '@/domain/generalTransportReportEngine'
import { AiReportAnalysisResult } from '@/domain/transportAnalyticsEngine'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { exportToCsv, exportToXlsxXml } from '@/lib/exportUtils'

// Paleta de Cores HUB CIAFAL (Pantone 2945 e complementares executivos)
const COLORS = [
  '#005596', // CIAFAL Blue
  '#0284c7', // Sky Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#475569', // Slate
  '#0d9488', // Teal
]

interface ReportChartsDashboardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  records: GeneralTransportRecord[]
  filters: GeneralTransportFilterParams
  analysis: AiReportAnalysisResult | null
  isLoading: boolean
  isFiltersDirty: boolean
  onRefreshData: () => void
  onDrillDown: (field: string, value: string, filteredSubset: GeneralTransportRecord[]) => void
  userContext?: { name: string; email: string; role?: string }
}

export const ReportChartsDashboardModal: React.FC<ReportChartsDashboardModalProps> = ({
  open,
  onOpenChange,
  records,
  filters,
  analysis,
  isLoading,
  isFiltersDirty,
  onRefreshData,
  onDrillDown,
  userContext,
}) => {
  const dashboardRef = useRef<HTMLDivElement>(null)

  // Modos de visualização alternáveis nos gráficos 4 e 5
  const [itineraryMetricMode, setItineraryMetricMode] = useState<
    'count' | 'weight' | 'freight' | 'distance' | 'occupancy'
  >('count')

  const [freightItineraryMode, setFreightItineraryMode] = useState<
    'total' | 'costPerTon' | 'costPerKm'
  >('total')

  // Gráfico customizável pelo usuário
  const [customIndicator, setCustomIndicator] = useState<
    | 'count'
    | 'gross_weight'
    | 'net_weight'
    | 'nf_weight'
    | 'freight'
    | 'toll'
    | 'total_cost'
    | 'occupancy'
    | 'distance'
    | 'total_time'
    | 'diff_weight'
  >('count')

  const [customGroupBy, setCustomGroupBy] = useState<
    | 'center'
    | 'status'
    | 'itinerary'
    | 'plate'
    | 'vehicle_type'
    | 'transport_type'
    | 'freight_type'
    | 'date'
    | 'month'
  >('center')

  const [customChartType, setCustomChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar')

  // --- CÁLCULO DOS CARDS SUPERIORES EXCLUSIVAMENTE SOBRE OS FILTRADOS ---
  const upperCards = useMemo(() => {
    let totalFreight = 0
    let totalToll = 0
    let totalNetWeight = 0
    let sumOccupancy = 0
    let sumDwell = 0
    let scaleDiffCount = 0

    records.forEach((r) => {
      totalFreight += r.freight_cost || 0
      totalToll += r.toll_cost || 0
      totalNetWeight += r.net_weight_ton || 0
      sumOccupancy += r.occupancy_pct || 0
      sumDwell += r.total_time_min || 0

      if (Math.abs(r.diff_weight_ton || 0) > 0.05 || Math.abs(r.diff_weight_pct || 0) > 0.5) {
        scaleDiffCount++
      }
    })

    const count = records.length
    return {
      count,
      totalNetWeight: Number(totalNetWeight.toFixed(3)),
      totalFreight,
      totalToll,
      totalCost: totalFreight + totalToll,
      avgOccupancy: count > 0 ? Number((sumOccupancy / count).toFixed(1)) : 0,
      avgDwell: count > 0 ? Math.round(sumDwell / count) : 0,
      scaleDiffCount,
    }
  }, [records])

  // --- 10 GRÁFICOS PADRÃO (Agregações puras no dataset filtrado) ---

  // 1. Transportes por Status
  const statusData = useMemo(() => {
    const map: Record<string, number> = {}
    records.forEach((r) => {
      const st = r.transport_status || 'NÃO DEFINIDO'
      map[st] = (map[st] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [records])

  // 2. Transportes por Centro
  const centerTransportsData = useMemo(() => {
    const map: Record<string, number> = {}
    records.forEach((r) => {
      const c = r.center_code || 'WSTL'
      map[c] = (map[c] || 0) + 1
    })
    return Object.entries(map).map(([center, count]) => ({ center, count }))
  }, [records])

  // 3. Peso Transportado por Centro (t)
  const centerWeightData = useMemo(() => {
    const map: Record<string, number> = {}
    records.forEach((r) => {
      const c = r.center_code || 'WSTL'
      map[c] = (map[c] || 0) + (r.net_weight_ton || 0)
    })
    return Object.entries(map).map(([center, weight]) => ({
      center,
      weight: Number(weight.toFixed(3)),
    }))
  }, [records])

  // 4. Transportes por Itinerário (Top itinerários alternável)
  const itineraryData = useMemo(() => {
    const map: Record<
      string,
      { count: number; weight: number; freight: number; distance: number; sumOccup: number }
    > = {}

    records.forEach((r) => {
      const itin = r.itinerary_code || 'GERAL'
      if (!map[itin]) {
        map[itin] = { count: 0, weight: 0, freight: 0, distance: 0, sumOccup: 0 }
      }
      map[itin].count++
      map[itin].weight += r.net_weight_ton || 0
      map[itin].freight += (r.freight_cost || 0) + (r.toll_cost || 0)
      map[itin].distance += r.distance_km || 0
      map[itin].sumOccup += r.occupancy_pct || 0
    })

    return Object.entries(map)
      .map(([itinerary, val]) => ({
        itinerary,
        count: val.count,
        weight: Number(val.weight.toFixed(2)),
        freight: Math.round(val.freight),
        distance: Math.round(val.distance / val.count),
        occupancy: Number((val.sumOccup / val.count).toFixed(1)),
      }))
      .sort((a, b) => {
        if (itineraryMetricMode === 'weight') return b.weight - a.weight
        if (itineraryMetricMode === 'freight') return b.freight - a.freight
        if (itineraryMetricMode === 'distance') return b.distance - a.distance
        if (itineraryMetricMode === 'occupancy') return b.occupancy - a.occupancy
        return b.count - a.count
      })
      .slice(0, 8)
  }, [records, itineraryMetricMode])

  // 5. Frete por Itinerário (Alternável Total, R$/t, R$/km)
  const freightItineraryData = useMemo(() => {
    const map: Record<
      string,
      { totalCost: number; totalWeight: number; totalDistance: number; count: number }
    > = {}

    records.forEach((r) => {
      const itin = r.itinerary_code || 'GERAL'
      if (!map[itin]) {
        map[itin] = { totalCost: 0, totalWeight: 0, totalDistance: 0, count: 0 }
      }
      map[itin].totalCost += (r.freight_cost || 0) + (r.toll_cost || 0)
      map[itin].totalWeight += r.net_weight_ton || 0
      map[itin].totalDistance += r.distance_km || 0
      map[itin].count++
    })

    return Object.entries(map)
      .map(([itinerary, d]) => {
        const costPerTon = d.totalWeight > 0 ? Math.round(d.totalCost / d.totalWeight) : 0
        const costPerKm =
          d.totalDistance > 0 ? Number((d.totalCost / d.totalDistance).toFixed(2)) : 0
        return {
          itinerary,
          total: Math.round(d.totalCost),
          costPerTon,
          costPerKm,
        }
      })
      .sort((a, b) => {
        if (freightItineraryMode === 'costPerTon') return b.costPerTon - a.costPerTon
        if (freightItineraryMode === 'costPerKm') return b.costPerKm - a.costPerKm
        return b.total - a.total
      })
      .slice(0, 8)
  }, [records, freightItineraryMode])

  // 6. Evolução dos Transportes (Temporal adaptativa dia/semana/mês)
  const timelineData = useMemo(() => {
    const map: Record<string, { count: number; weight: number }> = {}
    records.forEach((r) => {
      const d = r.transport_date || 'N/D'
      const key = d.substring(0, 10)
      if (!map[key]) map[key] = { count: 0, weight: 0 }
      map[key].count++
      map[key].weight += r.net_weight_ton || 0
    })

    return Object.entries(map)
      .map(([date, val]) => ({
        date:
          date !== 'N/D' ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/D',
        rawDate: date,
        count: val.count,
        weight: Number(val.weight.toFixed(2)),
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
  }, [records])

  // 7. Ocupação dos Veículos em Faixas (<70%, 70-80%, 80-90%, 90-100%, >100%)
  const occupancyBandsData = useMemo(() => {
    let b1 = 0 // < 70%
    let b2 = 0 // 70-80%
    let b3 = 0 // 80-90%
    let b4 = 0 // 90-100%
    let b5 = 0 // > 100% (inconsistência ou sobrecarga)

    records.forEach((r) => {
      const occ = r.occupancy_pct || 0
      if (occ < 70) b1++
      else if (occ < 80) b2++
      else if (occ < 90) b3++
      else if (occ <= 100) b4++
      else b5++
    })

    return [
      { band: '< 70% (Baixa)', count: b1, fill: '#ef4444' },
      { band: '70% a 80%', count: b2, fill: '#f59e0b' },
      { band: '80% a 90%', count: b3, fill: '#3b82f6' },
      { band: '90% a 100% (Ideal)', count: b4, fill: '#10b981' },
      { band: '> 100% (Sobrecarga)', count: b5, fill: '#8b5cf6' },
    ]
  }, [records])

  // 8. Tempo Operacional Médio por Centro/Itinerário/Tipo de Veículo
  const operationalTimeData = useMemo(() => {
    const map: Record<string, { dwellSum: number; loadSum: number; count: number }> = {}
    records.forEach((r) => {
      const groupKey = r.vehicle_type || 'Geral'
      if (!map[groupKey]) map[groupKey] = { dwellSum: 0, loadSum: 0, count: 0 }
      map[groupKey].dwellSum += r.total_time_min || 0
      map[groupKey].loadSum += r.collection_time_min || 0
      map[groupKey].count++
    })

    return Object.entries(map).map(([vehicleType, d]) => ({
      vehicleType,
      avgDwell: Math.round(d.dwellSum / d.count),
      avgLoading: Math.round(d.loadSum / d.count),
    }))
  }, [records])

  // 9. Divergência de Pesagem (Diferença t e %)
  const weighingDiffData = useMemo(() => {
    return records
      .filter((r) => Math.abs(r.diff_weight_ton || 0) > 0.01)
      .slice(0, 10)
      .map((r) => ({
        transport: r.transport_number,
        diffTon: r.diff_weight_ton,
        diffPct: r.diff_weight_pct,
        plate: r.external_id_1,
      }))
  }, [records])

  // 10. Frete × Peso Transportado (Dispersão)
  const freightWeightScatterData = useMemo(() => {
    return records.map((r) => ({
      weight: Number((r.net_weight_ton || 0).toFixed(2)),
      freight: Math.round((r.freight_cost || 0) + (r.toll_cost || 0)),
      transport: r.transport_number,
      itinerary: r.itinerary_code,
    }))
  }, [records])

  // --- GRÁFICO CONFIGURÁVEL PELO USUÁRIO ---
  const customConfiguredData = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {}

    records.forEach((r) => {
      let groupKey = 'Outros'
      if (customGroupBy === 'center') groupKey = r.center_code || 'WSTL'
      else if (customGroupBy === 'status') groupKey = r.transport_status || 'N/A'
      else if (customGroupBy === 'itinerary') groupKey = r.itinerary_code || 'N/A'
      else if (customGroupBy === 'plate') groupKey = r.external_id_1 || 'N/A'
      else if (customGroupBy === 'vehicle_type') groupKey = r.vehicle_type || 'N/A'
      else if (customGroupBy === 'transport_type') groupKey = r.transport_type || 'N/A'
      else if (customGroupBy === 'freight_type') groupKey = r.freight_type || 'N/A'
      else if (customGroupBy === 'date') groupKey = r.transport_date || 'N/A'
      else if (customGroupBy === 'month')
        groupKey = (r.transport_date || '').substring(0, 7) || 'N/A'

      let val = 1
      if (customIndicator === 'gross_weight') val = r.gross_weight_ton || 0
      else if (customIndicator === 'net_weight') val = r.net_weight_ton || 0
      else if (customIndicator === 'nf_weight') val = r.nf_weight_ton || 0
      else if (customIndicator === 'freight') val = r.freight_cost || 0
      else if (customIndicator === 'toll') val = r.toll_cost || 0
      else if (customIndicator === 'total_cost') val = (r.freight_cost || 0) + (r.toll_cost || 0)
      else if (customIndicator === 'occupancy') val = r.occupancy_pct || 0
      else if (customIndicator === 'distance') val = r.distance_km || 0
      else if (customIndicator === 'total_time') val = r.total_time_min || 0
      else if (customIndicator === 'diff_weight') val = Math.abs(r.diff_weight_ton || 0)

      if (!map[groupKey]) map[groupKey] = { sum: 0, count: 0 }
      map[groupKey].sum += val
      map[groupKey].count++
    })

    return Object.entries(map)
      .map(([group, d]) => {
        const isAvg = ['occupancy'].includes(customIndicator)
        const finalVal = isAvg ? Number((d.sum / d.count).toFixed(1)) : Number(d.sum.toFixed(2))
        return {
          group,
          value: finalVal,
          count: d.count,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [records, customIndicator, customGroupBy])

  // --- EXPORTAÇÕES DA ANÁLISE GRÁFICA (PDF, IMAGEM, EXCEL) ---
  const handleExportChartsData = (format: 'EXCEL' | 'PDF' | 'IMAGE') => {
    const timestampFormatted = new Date().toLocaleString('pt-BR')
    const filename = `Analise_Grafica_TMS_${new Date().toISOString().split('T')[0]}`

    if (format === 'EXCEL') {
      const headers = [
        'Centro',
        'Status',
        'Itinerário',
        'Transporte',
        'Placa',
        'Peso Líquido (t)',
        'Peso NF (t)',
        'Frete (R$)',
        'Pedágio (R$)',
        'Custo Total (R$)',
        'Ocupação (%)',
        'Permanência Pátio (min)',
      ]
      const rows = records.map((r) => [
        r.center_code,
        r.transport_status,
        r.itinerary_code,
        r.transport_number,
        r.external_id_1,
        r.net_weight_ton,
        r.nf_weight_ton,
        r.freight_cost,
        r.toll_cost,
        (r.freight_cost || 0) + (r.toll_cost || 0),
        r.occupancy_pct,
        r.total_time_min,
      ])
      exportToXlsxXml(filename, 'Dados Análises Gráficas', headers, rows)
    } else if (format === 'PDF') {
      // Abre janela de impressão com todos os cards e resumo dos insights
      const printWin = window.open('', '_blank')
      if (!printWin) {
        window.print()
        return
      }

      const activeFiltersText = analysis?.activeFiltersFormatted.join(' | ') || 'Base completa'
      const insightsList = analysis?.topInsights.map((i) => `<li>${i}</li>`).join('') || ''

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Exportação Análises Gráficas — HUB CIAFAL</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #1e293b; padding: 15px; }
            .header { border-bottom: 3px solid #005596; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 16px; font-weight: 900; color: #005596; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
            .card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; }
            .card-title { font-size: 8px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .card-value { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px; }
            .insights { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 6px; margin-bottom: 15px; }
            .insights h3 { font-size: 11px; font-weight: bold; color: #1e40af; margin: 0 0 6px 0; }
            .insights ul { margin: 0; padding-left: 18px; }
            .footer { font-size: 8px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">HUB CIAFAL — ANÁLISES GRÁFICAS OPERACIONAIS</div>
              <div>Relatório Geral Transporte (SAP ZSD40 & Bases TMS)</div>
            </div>
            <div style="text-align: right; font-size: 9px; color: #64748b;">
              <div>Emissão: <strong>${timestampFormatted}</strong></div>
              <div>Usuário: <strong>${userContext?.name || 'Operador TMS'} (${userContext?.email || ''})</strong></div>
              <div>Filtros: <strong>${activeFiltersText}</strong></div>
            </div>
          </div>

          <div class="cards">
            <div class="card"><div class="card-title">Transportes</div><div class="card-value">${upperCards.count}</div></div>
            <div class="card"><div class="card-title">Peso Transportado</div><div class="card-value">${upperCards.totalNetWeight} t</div></div>
            <div class="card"><div class="card-title">Frete Total</div><div class="card-value">${formatCurrency(upperCards.totalFreight)}</div></div>
            <div class="card"><div class="card-title">Custo Total</div><div class="card-value">${formatCurrency(upperCards.totalCost)}</div></div>
            <div class="card"><div class="card-title">Ocupação Média</div><div class="card-value">${upperCards.avgOccupancy}%</div></div>
            <div class="card"><div class="card-title">Tempo Médio Pátio</div><div class="card-value">${upperCards.avgDwell} min</div></div>
            <div class="card"><div class="card-title">Divergências Balança</div><div class="card-value">${upperCards.scaleDiffCount}</div></div>
            <div class="card"><div class="card-title">Pedágio Total</div><div class="card-value">${formatCurrency(upperCards.totalToll)}</div></div>
          </div>

          <div class="insights">
            <h3>Síntese dos Insights IA da Análise Gráfica:</h3>
            <ul>${insightsList}</ul>
          </div>

          <div class="footer">
            Relatório gerado eletronicamente para fins de auditoria e controle de frotas • CIAFAL Wilson Santos S.A.
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 300); }
          </script>
        </body>
        </html>
      `
      printWin.document.open()
      printWin.document.write(html)
      printWin.document.close()
    } else if (format === 'IMAGE') {
      window.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#005596]/10 text-[#005596]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                    Análises Gráficas & Indicadores TMS
                  </DialogTitle>
                  <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                    HUB CIAFAL
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {records.length} transportes no dataset filtrado
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Dashboard interativo com drill-down direto aos 43 campos do transporte.
                  Recalculado dinamicamente conforme filtros.
                </DialogDescription>
              </div>
            </div>

            {/* Exportar & Atualizar */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Análise</span>
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 text-xs">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400">
                    Exportação Completa:
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleExportChartsData('PDF')}
                    className="gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-rose-600" />
                    Exportar Relatório PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportChartsData('EXCEL')}
                    className="gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Exportar Dados Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportChartsData('IMAGE')}
                    className="gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    Salvar Imagem / Imprimir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshData}
                disabled={isLoading}
                className="text-xs h-8 gap-1.5 border-slate-300 text-slate-700 bg-white shadow-sm hover:border-[#005596]"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#005596]' : ''}`}
                />
                <span>Recalcular</span>
              </Button>
            </div>
          </div>

          {/* Banner de aviso se filtros foram modificados na tela de origem */}
          {isFiltersDirty && (
            <div className="mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Os filtros do relatório foram alterados. Atualizar análise?</span>
              </div>
              <Button
                size="sm"
                onClick={onRefreshData}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 font-semibold shadow-sm"
              >
                Atualizar Análise
              </Button>
            </div>
          )}

          {/* Filtros Ativos Considerados */}
          <div className="mt-2 p-2 bg-slate-100/80 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Filtros considerados nesta análise:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis?.activeFiltersFormatted.map((filtro, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-300 text-[10px] font-medium py-0.5"
                >
                  {filtro}
                </Badge>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div ref={dashboardRef} className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 1. CARDS SUPERIORES EXECUTIVOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Transportes
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">{upperCards.count}</div>
                <span className="text-[9px] text-slate-400">Filtro atual</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Peso Líquido
                </span>
                <div className="text-lg font-black text-[#005596] mt-0.5">
                  {upperCards.totalNetWeight.toLocaleString('pt-BR')} t
                </div>
                <span className="text-[9px] text-slate-400">Soma oficial</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Frete Total
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(upperCards.totalFreight)}
                </div>
                <span className="text-[9px] text-slate-400">Motoristas</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Pedágio Total
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(upperCards.totalToll)}
                </div>
                <span className="text-[9px] text-slate-400">Vales obrigatórios</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Custo Total
                </span>
                <div className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatCurrency(upperCards.totalCost)}
                </div>
                <span className="text-[9px] text-slate-400">Frete + Pedágio</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Ocupação Média
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {upperCards.avgOccupancy}%
                </div>
                <span className="text-[9px] text-slate-400">Capacidade útil</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Tempo Médio
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {upperCards.avgDwell} min
                </div>
                <span className="text-[9px] text-slate-400">Permanência pátio</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Dif. Balança
                </span>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    upperCards.scaleDiffCount > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}
                >
                  {upperCards.scaleDiffCount}
                </div>
                <span className="text-[9px] text-slate-400">Aferição divergente</span>
              </CardContent>
            </Card>
          </div>

          {/* CARD DE INSIGHTS IA INTERNO NO PAINEL DE GRÁFICOS */}
          <Card className="border-slate-200 bg-white shadow-sm border-l-4 border-l-[#005596]">
            <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#005596]" />
                Insights IA com base nos Gráficos Retornados
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] border-sky-300 text-sky-800 bg-sky-50"
              >
                Interpretação Dinâmica
              </Badge>
            </CardHeader>
            <CardContent className="p-3.5 pt-1 space-y-1.5 text-xs text-slate-700">
              {analysis && analysis.topInsights.length > 0 ? (
                analysis.topInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#005596] mt-1.5 flex-shrink-0" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">
                  Aplique filtros para visualizar insights automáticos sobre os gráficos.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 10 GRÁFICOS EM GRID MODERNA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Gráfico 1: Transportes por Status (com Drill-Down interativo) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between border-b border-slate-100">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-800">
                    1. Transportes por Status SAP
                  </CardTitle>
                  <span className="text-[10px] text-slate-400">
                    Clique em uma fatia para ver transportes (Drill-Down)
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  Drill-Down
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                        onClick={(entry) => {
                          const subset = records.filter((r) => r.transport_status === entry.name)
                          onDrillDown('Status', entry.name, subset)
                        }}
                        className="cursor-pointer"
                      >
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${val} transportes (${Math.round((Number(val) / records.length) * 100)}%)`,
                          name,
                        ]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[10px]">
                  {statusData.map((s, idx) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        const subset = records.filter((r) => r.transport_status === s.name)
                        onDrillDown('Status', s.name, subset)
                      }}
                      className="flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span>
                        {s.name} ({s.value})
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Transportes por Centro */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-800">
                  2. Transportes por Centro Expedidor
                </CardTitle>
                <Badge variant="outline" className="text-[9px]">
                  Drill-Down
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={centerTransportsData}
                      onClick={(state: any) => {
                        if (state?.activePayload?.[0]?.payload) {
                          const c = state.activePayload[0].payload.center
                          const subset = records.filter((r) => r.center_code === c)
                          onDrillDown('Centro', c, subset)
                        }
                      }}
                    >
                      {' '}
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="center" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} transportes`, 'Quantidade']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#005596"
                        radius={[4, 4, 0, 0]}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 3: Peso Transportado por Centro (t) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  3. Peso Transportado por Centro (t)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={centerWeightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="center" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} toneladas`, 'Peso Líquido']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar dataKey="weight" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 4: Transportes por Itinerário (Alternável) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-1">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-800">
                    4. Top Itinerários
                  </CardTitle>
                  <span className="text-[10px] text-slate-400">Drill-Down ao clicar</span>
                </div>
                <Select
                  value={itineraryMetricMode}
                  onValueChange={(v: any) => setItineraryMetricMode(v)}
                >
                  <SelectTrigger className="h-7 text-[10px] w-28 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="count">Quantidade</SelectItem>
                    <SelectItem value="weight">Toneladas</SelectItem>
                    <SelectItem value="freight">Frete R$</SelectItem>
                    <SelectItem value="distance">Distância km</SelectItem>
                    <SelectItem value="occupancy">Ocupação %</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={itineraryData}
                      layout="vertical"
                      onClick={(state: any) => {
                        if (state?.activePayload?.[0]?.payload) {
                          const it = state.activePayload[0].payload.itinerary
                          const subset = records.filter(
                            (r) => r.itinerary_code === it || r.itinerary_description === it,
                          )
                          onDrillDown('Itinerário', it, subset)
                        }
                      }}
                    >
                      {' '}
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        dataKey="itinerary"
                        type="category"
                        width={80}
                        tick={{ fontSize: 9 }}
                      />
                      <Tooltip
                        formatter={(val: any, _, item: any) => {
                          const p = item.payload
                          return [
                            `Itinerário: ${p.itinerary} | Viagens: ${p.count} | Peso: ${p.weight} t | Frete: ${formatCurrency(p.freight)} | Ocupação: ${p.occupancy}%`,
                            'Indicadores',
                          ]
                        }}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar
                        dataKey={itineraryMetricMode}
                        fill="#059669"
                        radius={[0, 4, 4, 0]}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 5: Frete por Itinerário (Alternável Total, R$/t, R$/km) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-1">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-800">
                    5. Frete por Itinerário
                  </CardTitle>
                </div>
                <Select
                  value={freightItineraryMode}
                  onValueChange={(v: any) => setFreightItineraryMode(v)}
                >
                  <SelectTrigger className="h-7 text-[10px] w-28 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="total">Total (R$)</SelectItem>
                    <SelectItem value="costPerTon">R$ / Tonelada</SelectItem>
                    <SelectItem value="costPerKm">R$ / Km</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={freightItineraryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="itinerary" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          freightItineraryMode === 'total'
                            ? formatCurrency(Number(val))
                            : freightItineraryMode === 'costPerTon'
                              ? `${formatCurrency(Number(val))} / t`
                              : `${formatCurrency(Number(val))} / km`,
                          'Valor',
                        ]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar dataKey={freightItineraryMode} fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 6: Evolução dos Transportes (Temporal) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  6. Evolução Temporal dos Transportes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          name === 'count' ? `${val} viagens` : `${val} t`,
                          name === 'count' ? 'Transportes' : 'Peso Total',
                        ]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#005596"
                        fill="#005596"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 7: Ocupação dos Veículos em Faixas */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  7. Ocupação dos Veículos (Faixas %)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyBandsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="band" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} transportes`, 'Quantidade']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {occupancyBandsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 8: Tempo Operacional Médio */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  8. Tempo Operacional por Tipo de Veículo (min)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="vehicleType" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${val} minutos`,
                          name === 'avgDwell' ? 'Permanência Total' : 'Carregamento',
                        ]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '10px' }}
                        formatter={(value) =>
                          value === 'avgDwell' ? 'Permanência Total' : 'Carregamento'
                        }
                      />
                      <Bar dataKey="avgDwell" fill="#005596" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgLoading" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 9: Divergência de Pesagem Balança */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  9. Divergência de Pesagem (Diferença em t)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  {weighingDiffData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weighingDiffData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="transport" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(val: any, _, item: any) => [
                            `Diferença: ${val} t (${item.payload.diffPct}%) - Placa: ${item.payload.plate}`,
                            'Divergência',
                          ]}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                        <Bar dataKey="diffTon" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      Nenhuma divergência de peso relevante nos filtros selecionados.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 10: Frete × Peso Transportado (Dispersão) */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800">
                  10. Frete × Peso Transportado (Dispersão)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="weight"
                        name="Peso"
                        unit=" t"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="freight"
                        name="Frete"
                        unit=" R$"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(val: any, name: any, item: any) => [
                          name === 'Peso' ? `${val} t` : formatCurrency(val),
                          name,
                        ]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Scatter data={freightWeightScatterData} fill="#7c3aed" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* GRÁFICO 11 / CONFIGURÁVEL PELO USUÁRIO (Criar Análise Gráfica) */}
            <Card className="border-slate-200 bg-white shadow-sm md:col-span-2 border-2 border-slate-300/80">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#005596]" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Criar Análise Gráfica Personalizada
                  </CardTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Indicador */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">Indicador:</span>
                    <Select
                      value={customIndicator}
                      onValueChange={(v: any) => setCustomIndicator(v)}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-36 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="count">Qtd Transportes</SelectItem>
                        <SelectItem value="net_weight">Peso Líquido (t)</SelectItem>
                        <SelectItem value="gross_weight">Peso Bruto (t)</SelectItem>
                        <SelectItem value="nf_weight">Peso NF (t)</SelectItem>
                        <SelectItem value="freight">Valor Frete (R$)</SelectItem>
                        <SelectItem value="toll">Valor Pedágio (R$)</SelectItem>
                        <SelectItem value="total_cost">Custo Total (R$)</SelectItem>
                        <SelectItem value="occupancy">Ocupação Média (%)</SelectItem>
                        <SelectItem value="distance">Distância Total (km)</SelectItem>
                        <SelectItem value="total_time">Tempo Total (min)</SelectItem>
                        <SelectItem value="diff_weight">Divergência Pesagem (t)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agrupar por */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">Agrupar por:</span>
                    <Select value={customGroupBy} onValueChange={(v: any) => setCustomGroupBy(v)}>
                      <SelectTrigger className="h-7 text-[10px] w-32 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="itinerary">Itinerário</SelectItem>
                        <SelectItem value="plate">Placa</SelectItem>
                        <SelectItem value="vehicle_type">Tipo de Veículo</SelectItem>
                        <SelectItem value="transport_type">Tipo de Transporte</SelectItem>
                        <SelectItem value="freight_type">Tipo de Frete</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Gráfico */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">Tipo:</span>
                    <Select
                      value={customChartType}
                      onValueChange={(v: any) => setCustomChartType(v)}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-24 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="bar">Barras</SelectItem>
                        <SelectItem value="line">Linha</SelectItem>
                        <SelectItem value="area">Área</SelectItem>
                        <SelectItem value="pie">Pizza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 pt-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {customChartType === 'bar' ? (
                      <BarChart data={customConfiguredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#005596" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : customChartType === 'line' ? (
                      <LineChart data={customConfiguredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="#005596" strokeWidth={2} />
                      </LineChart>
                    ) : customChartType === 'area' ? (
                      <AreaChart data={customConfiguredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#005596"
                          fill="#005596"
                          fillOpacity={0.25}
                        />
                      </AreaChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={customConfiguredData}
                          dataKey="value"
                          nameKey="group"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                        >
                          {customConfiguredData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Agregação sob demanda sobre <strong>{records.length}</strong> registros filtrados no
            relatório.
          </span>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-4"
          >
            Fechar Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
