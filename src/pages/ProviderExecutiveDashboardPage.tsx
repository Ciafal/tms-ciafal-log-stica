import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
} from '@/domain/carrierHistoryEngine'
import { SmartAlertItem } from '@/domain/smartAlertsEngine'
import {
  ExecutiveDashboardFilters,
  calculateExecutiveCards,
  filterHistoricalTransports,
  generateAiExecutiveAnalysis,
  ExecutiveCardsSummary,
} from '@/domain/executiveDashboardEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Truck,
  User,
  Building,
  CheckCircle2,
  DollarSign,
  Filter,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  FileText,
  Calendar,
  Layers,
  Award,
} from 'lucide-react'
import { formatDate, formatWeight, formatCurrency } from '@/lib/utils'

export const ProviderExecutiveDashboardPage: React.FC = () => {
  const navigate = useNavigate()

  // Estados dos Dados Reais
  const [historyList, setHistoryList] = useState<CarrierOperationalRecord[]>([])
  const [evaluations, setEvaluations] = useState<CarrierEvaluationRecord[]>([])
  const [complaints, setComplaints] = useState<CarrierComplaintRecord[]>([])
  const [compliments, setCompliments] = useState<CarrierComplimentRecord[]>([])
  const [alerts, setAlerts] = useState<SmartAlertItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Filtros Globais Combináveis
  const [filters, setFilters] = useState<ExecutiveDashboardFilters>({
    plant: 'TODAS',
    carrierName: 'TODAS',
    driverName: 'TODOS',
    vehiclePlate: 'TODOS',
    itineraryCode: 'TODOS',
    region: 'TODAS',
    destinationUf: 'TODAS',
    customerName: '',
  })

  // Estado para Drill-Down Modal
  const [drillDownData, setDrillDownData] = useState<{
    title: string
    description: string
    records: CarrierOperationalRecord[]
    complaintRecords?: CarrierComplaintRecord[]
  } | null>(null)

  // Modal de Detalhe de Transporte Único
  const [selectedTransportDetail, setSelectedTransportDetail] =
    useState<CarrierOperationalRecord | null>(null)

  // Carregamento de dados das coleções existentes
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [histRes, evalsRes, compRes, complRes, alertsRes] = await Promise.all([
        carrierHistoryService.getOperationalHistory(250),
        carrierHistoryService.getEvaluations(250),
        carrierHistoryService.getComplaints(250),
        carrierHistoryService.getCompliments(250),
        carrierHistoryService.getSmartAlerts(),
      ])
      setHistoryList(histRes)
      setEvaluations(evalsRes)
      setComplaints(compRes)
      setCompliments(complRes)
      setAlerts(alertsRes)
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard Executivo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem dos registros operacionais
  const filteredTransports = useMemo(() => {
    return filterHistoricalTransports(historyList, filters)
  }, [historyList, filters])

  // Cálculo dos 4 grupos de cards executivos
  const cards: ExecutiveCardsSummary = useMemo(() => {
    return calculateExecutiveCards(filteredTransports, evaluations, complaints, compliments, alerts)
  }, [filteredTransports, evaluations, complaints, compliments, alerts])

  // Análise IA em 4 blocos rigorosos
  const aiBlocks = useMemo(() => {
    return generateAiExecutiveAnalysis(cards, filteredTransports, complaints)
  }, [cards, filteredTransports, complaints])

  // Listas distintas para popular filtros
  const distinctCarriers = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.carrier_name).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctDrivers = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.driver_name).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctPlates = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.vehicle_plate).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctItineraries = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.itinerary_code).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctUfs = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.destination_uf).filter(Boolean))).sort(),
    [historyList],
  )

  // =========================================================================
  // DRILL-DOWN HANDLERS
  // =========================================================================

  const handleDrillDownProcedenteComplaints = () => {
    const procedentes = complaints.filter((c) => c.status === 'PROCEDENTE')
    const relatedOrderNumbers = new Set(
      procedentes.map((c) => c.transport_order_number).filter(Boolean),
    )
    const relTransports = historyList.filter((h) =>
      relatedOrderNumbers.has(h.transport_order_number),
    )

    setDrillDownData({
      title: 'Drill-Down: Reclamações Julgadas Procedentes',
      description: `Relação de ${procedentes.length} reclamação(ões) procedente(s) e seus respectivos transportes originais.`,
      records: relTransports,
      complaintRecords: procedentes,
    })
  }

  const handleDrillDownDelayedTrips = () => {
    const delayed = filteredTransports.filter(
      (r) => r.is_on_time === false || (r.delay_minutes && r.delay_minutes > 0),
    )
    setDrillDownData({
      title: 'Drill-Down: Viagens com Atraso em Rota',
      description: `Exibindo ${delayed.length} ordens de transporte que não cumpriram a previsão de trânsito.`,
      records: delayed,
    })
  }

  const handleDrillDownInternalDwellAlerts = () => {
    const highDwell = filteredTransports.filter((r) => (r.total_internal_dwell_min || 0) > 150)
    setDrillDownData({
      title: 'Drill-Down: Gargalo de Permanência Interna (> 150 min)',
      description: `Ordens onde a permanência interna nas plantas CIAFAL ou Sidercentro ultrapassou 2h30min.`,
      records: highDwell,
    })
  }

  const handleDrillDownAllTransports = () => {
    setDrillDownData({
      title: 'Drill-Down: Visão Completa de Transportes Filtrados',
      description: `Relação detalhada das ${filteredTransports.length} viagens selecionadas pelo filtro executivo.`,
      records: filteredTransports,
    })
  }

  // =========================================================================
  // DADOS DE AGREGAÇÃO PARA OS 8 GRÁFICOS
  // =========================================================================

  // 10.1 Evolução mensal das avaliações
  const monthlyEvaluationAgg = useMemo(() => {
    const map = new Map<string, { month: string; sumRating: number; count: number }>()
    filteredTransports.forEach((r) => {
      const monthKey = r.transport_date ? r.transport_date.substring(0, 7) : '2026-02'
      const cur = map.get(monthKey) || { month: monthKey, sumRating: 0, count: 0 }
      if (r.driver_rating) {
        cur.sumRating += r.driver_rating
        cur.count++
      }
      map.set(monthKey, cur)
    })
    return Array.from(map.values()).map((v) => ({
      month: v.month,
      avgRating: v.count > 0 ? (v.sumRating / v.count).toFixed(2) : '5.00',
      totalTrips: v.count,
    }))
  }, [filteredTransports])

  // 10.3 Reclamações por categoria
  const complaintsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    complaints.forEach((c) => {
      map.set(c.category, (map.get(c.category) || 0) + 1)
    })
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }))
  }, [complaints])

  // 10.5 Pontualidade por itinerário
  const punctualityByItinerary = useMemo(() => {
    const map = new Map<string, { total: number; onTime: number; avgDelay: number }>()
    filteredTransports.forEach((r) => {
      if (r.itinerary_code) {
        const cur = map.get(r.itinerary_code) || { total: 0, onTime: 0, avgDelay: 0 }
        cur.total++
        if (r.is_on_time !== false) cur.onTime++
        if (r.delay_minutes) cur.avgDelay += r.delay_minutes
        map.set(r.itinerary_code, cur)
      }
    })
    return Array.from(map.entries()).map(([itCode, data]) => ({
      itCode,
      pctOnTime: Math.round((data.onTime / data.total) * 100),
      total: data.total,
      avgDelayMin: Math.round(data.avgDelay / data.total),
    }))
  }, [filteredTransports])

  // 10.6 Tempo de rota: Previsto x Real por itinerário
  const routeTimeComparison = useMemo(() => {
    const map = new Map<
      string,
      { itin: string; estimated: number; actual: number; count: number }
    >()
    filteredTransports.forEach((r) => {
      if (r.itinerary_code && r.route_estimated_min && r.route_actual_min) {
        const cur = map.get(r.itinerary_code) || {
          itin: r.itinerary_code,
          estimated: 0,
          actual: 0,
          count: 0,
        }
        cur.estimated += r.route_estimated_min
        cur.actual += r.route_actual_min
        cur.count++
        map.set(r.itinerary_code, cur)
      }
    })
    return Array.from(map.values()).map((v) => ({
      itin: v.itin,
      avgEstimated: Math.round(v.estimated / v.count),
      avgActual: Math.round(v.actual / v.count),
      delta: Math.round((v.actual - v.estimated) / v.count),
    }))
  }, [filteredTransports])

  // 10.8 Custos e Margens
  const financialMetrics = useMemo(() => {
    const totalRevenue = filteredTransports.reduce(
      (sum, r) => sum + (r.freight_billed_customer || 0),
      0,
    )
    const totalDriverCost = filteredTransports.reduce(
      (sum, r) => sum + (r.freight_cost_driver || 0),
      0,
    )
    const totalToll = filteredTransports.reduce((sum, r) => sum + (r.toll_cost || 0), 0)
    const totalMargin = totalRevenue - (totalDriverCost + totalToll)
    const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0
    const avgCostPerTon =
      cards.totalTonnageTon > 0 ? (totalDriverCost + totalToll) / cards.totalTonnageTon : 0

    return {
      totalRevenue,
      totalDriverCost,
      totalToll,
      totalMargin,
      marginPct: Number(marginPct.toFixed(1)),
      avgCostPerTon: Number(avgCostPerTon.toFixed(2)),
    }
  }, [filteredTransports, cards.totalTonnageTon])

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho HUB CIAFAL */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-[#005596]/10 text-[#005596] rounded-xl border border-[#005596]/20">
            <BarChart3 className="w-7 h-7 text-[#005596]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Dashboard Executivo de Prestadores
              </h1>
              <Badge className="bg-[#005596] text-white text-[10px] uppercase font-bold">
                Gestão Estratégica
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-[10px]">
                v0.0.60
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Indicadores consolidados de operação, qualidade, performance logística, decomposição
              de custos e rastreabilidade total de evidências.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tms/analises/historico-motoristas-veiculos')}
            className="text-xs text-slate-700 hover:text-[#005596]"
          >
            <Truck className="w-3.5 h-3.5 mr-1" />
            Histórico 360º
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tms/avaliacao-veiculo-motorista/configuracao-score')}
            className="text-xs text-slate-700 hover:text-[#005596]"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Governança Score
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS COMBINÁVEIS REATIVOS                                     */}
      {/* ========================================================================= */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-[#005596]" />
              <span>Filtros Executivos Combináveis (o dashboard inteiro reage em tempo real)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({
                  plant: 'TODAS',
                  carrierName: 'TODAS',
                  driverName: 'TODOS',
                  vehiclePlate: 'TODOS',
                  itineraryCode: 'TODOS',
                  region: 'TODAS',
                  destinationUf: 'TODAS',
                  customerName: '',
                })
              }
              className="text-xs text-slate-500 hover:text-slate-800 h-6 px-2"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Unidade / Planta
              </Label>
              <Select
                value={filters.plant}
                onValueChange={(val) => setFilters({ ...filters, plant: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODAS">Todas as Unidades</SelectItem>
                  <SelectItem value="Matriz Contagem">Matriz Contagem</SelectItem>
                  <SelectItem value="Sidercentro Laminados">Sidercentro Laminados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Transportadora
              </Label>
              <Select
                value={filters.carrierName}
                onValueChange={(val) => setFilters({ ...filters, carrierName: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {distinctCarriers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Motorista
              </Label>
              <Select
                value={filters.driverName}
                onValueChange={(val) => setFilters({ ...filters, driverName: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todos os Motoristas</SelectItem>
                  {distinctDrivers.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Placa Veículo
              </Label>
              <Select
                value={filters.vehiclePlate}
                onValueChange={(val) => setFilters({ ...filters, vehiclePlate: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todas as Placas</SelectItem>
                  {distinctPlates.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Itinerário SAP
              </Label>
              <Select
                value={filters.itineraryCode}
                onValueChange={(val) => setFilters({ ...filters, itineraryCode: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todos Itinerários</SelectItem>
                  {distinctItineraries.map((it) => (
                    <SelectItem key={it} value={it}>
                      {it}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                UF Destino
              </Label>
              <Select
                value={filters.destinationUf}
                onValueChange={(val) => setFilters({ ...filters, destinationUf: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODAS">Todas as UFs</SelectItem>
                  {distinctUfs.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4 GRUPOS DE CARDS EXECUTIVOS COM DRILL-DOWN CLICÁVEL                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GRUPO 1: OPERAÇÃO */}
        <Card
          className="border-slate-200 shadow-sm cursor-pointer hover:border-[#005596] transition"
          onClick={handleDrillDownAllTransports}
        >
          <CardHeader className="py-2.5 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#005596] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> 1. Operação
            </span>
            <Badge variant="outline" className="text-[10px]">
              Clique p/ Detalhar
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Transportes Realizados:</span>
              <span className="text-xl font-black text-slate-900">{cards.totalTransports}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Volume Transportado:</span>
              <span className="font-bold text-slate-800">
                {formatWeight(cards.totalTonnageTon, { unit: 't' })}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Motoristas Utilizados:</span>
              <span className="font-semibold text-slate-800">{cards.uniqueDrivers} condutores</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Veículos / Transportadoras:</span>
              <span className="font-semibold text-slate-800">
                {cards.uniqueVehicles} veíc. / {cards.uniqueCarriers} transp.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GRUPO 2: QUALIDADE */}
        <Card
          className="border-slate-200 shadow-sm cursor-pointer hover:border-[#005596] transition"
          onClick={handleDrillDownProcedenteComplaints}
        >
          <CardHeader className="py-2.5 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> 2. Qualidade
            </span>
            <Badge variant="outline" className="text-[10px]">
              Drill-Down
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Avaliação Média:</span>
              <span className="text-xl font-black text-sky-700">
                {cards.averageDriverRating.toFixed(1)} / 5,0
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Cobertura de Avaliação:</span>
              <span className="font-semibold text-slate-800">
                {cards.evaluatedTransportsPct}% dos fretes
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-slate-600">Reclamações Procedentes:</span>
              <span
                className={
                  cards.procedenteComplaints > 0
                    ? 'font-bold text-rose-600 underline'
                    : 'font-semibold text-slate-800'
                }
              >
                {cards.procedenteComplaints} de {cards.totalComplaints}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Elogios / Reconhecimentos:</span>
              <span className="font-bold text-emerald-700">{cards.totalCompliments} elogios</span>
            </div>
          </CardContent>
        </Card>

        {/* GRUPO 3: PERFORMANCE */}
        <Card
          className="border-slate-200 shadow-sm cursor-pointer hover:border-[#005596] transition"
          onClick={handleDrillDownDelayedTrips}
        >
          <CardHeader className="py-2.5 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> 3. Performance
            </span>
            <Badge variant="outline" className="text-[10px]">
              Ver Atrasos
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Entregas no Prazo:</span>
              <span className="text-xl font-black text-emerald-700">
                {cards.onTimeDeliveriesPct}%
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Tempo Médio Rota:</span>
              <span className="font-semibold text-slate-800">{cards.avgRouteDurationMin} min</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Carregamento Doca:</span>
              <span className="font-semibold text-slate-800">
                {cards.avgLoadingDurationMin} min
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Permanência Interna Total:</span>
              <span className="font-bold text-slate-900">{cards.avgInternalDwellMin} min</span>
            </div>
          </CardContent>
        </Card>

        {/* GRUPO 4: GESTÃO E ALERTAS */}
        <Card
          className="border-slate-200 shadow-sm cursor-pointer hover:border-[#005596] transition"
          onClick={() => navigate('/tms/analises/historico-motoristas-veiculos')}
        >
          <CardHeader className="py-2.5 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 4. Gestão & Alertas
            </span>
            <Badge variant="outline" className="text-[10px]">
              Ir p/ Alertas
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Alertas Abertos:</span>
              <span className="text-xl font-black text-amber-600">{cards.openAlertsCount}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Alertas Críticos:</span>
              <span
                className={
                  cards.criticalAlertsCount > 0
                    ? 'font-bold text-rose-600'
                    : 'font-semibold text-slate-700'
                }
              >
                {cards.criticalAlertsCount} crítico(s)
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Ações em Tratamento:</span>
              <span className="font-semibold text-slate-800">
                {cards.pendingActionsCount} pendentes
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-slate-600">
              <span>Sem Histórico Suficiente:</span>
              <span className="font-semibold text-slate-500">
                {cards.providersLowSampleCount} prestador(es)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* ÁREA DE ANÁLISE IA EM 4 BLOCOS OBRIGATÓRIOS                               */}
      {/* ========================================================================= */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/60 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-blue-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#005596]" />
            <CardTitle className="text-sm font-bold text-[#005596]">
              Análise IA TMS: Diagnóstico Operacional Explicável (Sem Alucinações)
            </CardTitle>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Diretriz: Nunca transformar correlação em causalidade
          </span>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiBlocks.map((block, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-2 text-xs"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#005596] block">
                    [Fato Observado]
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">{block.observedFact}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                    [Correlação Identificada]
                  </span>
                  <p className="text-slate-700 leading-relaxed">{block.identifiedCorrelation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">
                    [Hipótese Operacional]
                  </span>
                  <p className="text-slate-600 leading-relaxed italic">{block.workingHypothesis}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    [Ação Sugerida para Investigação]
                  </span>
                  <p className="text-slate-800 font-semibold leading-relaxed">
                    {block.suggestedAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* OS 8 GRÁFICOS EXECUTIVOS COM DRILL-DOWN TOTAL                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 10.1 Evolução da Avaliação */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#005596]" />
              10.1 Evolução Mensal da Avaliação & Volume de Viagens
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Histórico
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              {monthlyEvaluationAgg.map((item) => (
                <div key={item.month} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Mês: {item.month}</span>
                    <span className="text-sky-700 font-bold">
                      {item.avgRating} / 5,0 ({item.totalTrips} viagens)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#005596] h-full"
                      style={{ width: `${(Number(item.avgRating) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 10.3 Reclamações por Categoria */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              10.3 Reclamações por Categoria & Ocorrências
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDrillDownProcedenteComplaints}
              className="text-xs text-[#005596] h-6 px-2"
            >
              Ver Todas →
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {complaintsByCategory.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhuma reclamação registrada no período.
              </div>
            ) : (
              complaintsByCategory.map((c) => (
                <div key={c.category} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{c.category}</span>
                    <span className="text-rose-700 font-bold">{c.count} ocorrência(s)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${Math.min(100, c.count * 30)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 10.5 Pontualidade por Itinerário */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              10.5 Pontualidade (% no Prazo e Atraso Médio) por Itinerário
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              SLA de Rota
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {punctualityByItinerary.map((it) => (
              <div key={it.itCode} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>
                    {it.itCode} ({it.total} viagens)
                  </span>
                  <span
                    className={
                      it.pctOnTime >= 90 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'
                    }
                  >
                    {it.pctOnTime}% no prazo{' '}
                    {it.avgDelayMin > 0 && `(atraso médio ${it.avgDelayMin}m)`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={it.pctOnTime >= 90 ? 'bg-emerald-600 h-full' : 'bg-amber-500 h-full'}
                    style={{ width: `${it.pctOnTime}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 10.6 Tempo de Rota: Previsto x Real no Mesmo Par */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#005596]" />
              10.6 Tempo de Rota: Previsto x Real (Mesmo Itinerário)
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Anti-Distorção
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {routeTimeComparison.map((r) => (
              <div
                key={r.itin}
                className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1"
              >
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{r.itin}</span>
                  <span className={r.delta > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {r.delta > 0 ? `+${r.delta} min desvio` : `${r.delta} min no prazo`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Previsto: {r.avgEstimated} min</span>
                  <span>
                    Realizado: <strong>{r.avgActual} min</strong>
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 10.7 Tempo Interno: Decomposição de Espera, Carregamento e Faturamento */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#005596]" />
              10.7 Decomposição de Tempo Interno (Espera, Carga e Liberação)
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDrillDownInternalDwellAlerts}
              className="text-xs text-[#005596] h-6 px-2"
            >
              Ver Gargalos →
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Espera Pátio
                </span>
                <span className="text-base font-black text-slate-800">
                  {cards.avgInternalDwellMin > 0
                    ? Math.round(cards.avgInternalDwellMin * 0.25)
                    : 30}{' '}
                  min
                </span>
              </div>
              <div className="p-2 rounded bg-sky-50 border border-sky-100">
                <span className="text-[10px] text-[#005596] block uppercase font-bold">
                  Doca Carregamento
                </span>
                <span className="text-base font-black text-[#005596]">
                  {cards.avgLoadingDurationMin} min
                </span>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-100">
                <span className="text-[10px] text-amber-800 block uppercase font-bold">
                  Faturamento Fiscal
                </span>
                <span className="text-base font-black text-amber-900">
                  {cards.avgInvoicingDurationMin} min
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 text-center italic">
              Permanência Média Total: <strong>{cards.avgInternalDwellMin} min</strong> na área
              industrial CIAFAL/Sidercentro.
            </div>
          </CardContent>
        </Card>

        {/* 10.8 Custos, Frete e Margem */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
              10.8 Custos Operacionais, Pedágio e Margem de Frete
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Resultado R$
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Receita Frete Cobrada:
                </span>
                <strong className="text-slate-800 font-mono">
                  {formatCurrency(financialMetrics.totalRevenue)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Custo Prestador / Frete:
                </span>
                <strong className="text-slate-800 font-mono">
                  {formatCurrency(financialMetrics.totalDriverCost)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Pedágio & Extras:
                </span>
                <strong className="text-slate-800 font-mono">
                  {formatCurrency(financialMetrics.totalToll)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Margem Operacional:
                </span>
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatCurrency(financialMetrics.totalMargin)} ({financialMetrics.marginPct}%)
                </strong>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
              <span className="text-slate-600">Custo Médio por Tonelada Transportada:</span>
              <strong className="text-slate-900 font-mono">
                {formatCurrency(financialMetrics.avgCostPerTon)} / t
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE DRILL-DOWN TOTAL ATÉ O TRANSPORTE ORIGINAL                       */}
      {/* ========================================================================= */}
      <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {drillDownData && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#005596]" />
                  {drillDownData.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {drillDownData.description}
                </DialogDescription>
              </DialogHeader>

              {/* Tabela de Reclamações caso presente */}
              {drillDownData.complaintRecords && drillDownData.complaintRecords.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    Reclamações do Drill-Down:
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="p-2">Data</th>
                          <th className="p-2">Código</th>
                          <th className="p-2">Motorista</th>
                          <th className="p-2">Veículo</th>
                          <th className="p-2">Cliente</th>
                          <th className="p-2">Categoria</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {drillDownData.complaintRecords.map((c) => (
                          <tr key={c.complaint_number} className="hover:bg-slate-50">
                            <td className="p-2 whitespace-nowrap">
                              {formatDate(c.occurrence_date)}
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-900">
                              {c.complaint_number}
                            </td>
                            <td className="p-2">{c.driver_name || '—'}</td>
                            <td className="p-2 font-mono">{c.vehicle_plate || '—'}</td>
                            <td className="p-2 truncate max-w-[120px]">{c.customer_name || '—'}</td>
                            <td className="p-2">{c.category}</td>
                            <td className="p-2">
                              <Badge
                                className={
                                  c.status === 'PROCEDENTE'
                                    ? 'bg-rose-600 text-white text-[9px]'
                                    : 'bg-slate-200 text-slate-700 text-[9px]'
                                }
                              >
                                {c.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              {c.transport_order_number && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const rec = historyList.find(
                                      (r) => r.transport_order_number === c.transport_order_number,
                                    )
                                    if (rec) setSelectedTransportDetail(rec)
                                  }}
                                  className="h-6 text-[10px] text-[#005596]"
                                >
                                  Ver Frete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tabela de Ordens de Transporte Originais */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Transportes Originais Relacionados:
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2">Ordem / SAP</th>
                        <th className="p-2">Data</th>
                        <th className="p-2">Motorista</th>
                        <th className="p-2">Placa</th>
                        <th className="p-2">Itinerário</th>
                        <th className="p-2 text-right">Peso (t)</th>
                        <th className="p-2 text-center">Pontualidade</th>
                        <th className="p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drillDownData.records.map((r) => (
                        <tr key={r.transport_order_number} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900 font-mono">
                            {r.transport_order_number}
                          </td>
                          <td className="p-2 whitespace-nowrap">{formatDate(r.transport_date)}</td>
                          <td className="p-2 font-medium">{r.driver_name}</td>
                          <td className="p-2 font-mono">{r.vehicle_plate}</td>
                          <td className="p-2 text-[#005596] font-semibold">{r.itinerary_code}</td>
                          <td className="p-2 text-right">
                            {formatWeight(r.weight_ton, { unit: 't' })}
                          </td>
                          <td className="p-2 text-center">
                            {r.is_on_time !== false ? (
                              <Badge className="bg-emerald-600 text-white text-[9px]">
                                No Prazo
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-600 text-white text-[9px]">
                                Atraso ({r.delay_minutes}m)
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTransportDetail(r)}
                              className="h-6 text-[10px] text-[#005596]"
                            >
                              Abrir Detalhe
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE DETALHE DE TRANSPORTE ESPECÍFICO                                 */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedTransportDetail}
        onOpenChange={(open) => !open && setSelectedTransportDetail(null)}
      >
        <DialogContent className="max-w-2xl p-6 bg-white">
          {selectedTransportDetail && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#005596]" />
                  Ordem de Transporte {selectedTransportDetail.transport_order_number}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  SAP: {selectedTransportDetail.sap_transport_number || '800101'} • Data:{' '}
                  {formatDate(selectedTransportDetail.transport_date)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Motorista:
                    </span>
                    <strong className="text-slate-900">
                      {selectedTransportDetail.driver_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Veículo:
                    </span>
                    <strong className="font-mono text-slate-900">
                      {selectedTransportDetail.vehicle_plate}
                    </strong>{' '}
                    ({selectedTransportDetail.vehicle_type})
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Transportadora:
                    </span>
                    <span>{selectedTransportDetail.carrier_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Itinerário:
                    </span>
                    <strong className="text-[#005596]">
                      {selectedTransportDetail.itinerary_code}
                    </strong>{' '}
                    - {selectedTransportDetail.itinerary_description}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 border rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Peso
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatWeight(selectedTransportDetail.weight_ton, { unit: 't' })}
                    </span>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Permanência Interna
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedTransportDetail.total_internal_dwell_min || 0} min
                    </span>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Frete Realizado
                    </span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {formatCurrency(selectedTransportDetail.freight_cost_driver || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
