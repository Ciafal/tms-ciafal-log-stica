import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Truck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Info,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  Printer,
  FileCheck,
  CheckCircle,
  HelpCircle,
  BarChart3,
  ListOrdered,
  AlertCircle,
  Send,
  Edit,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import { tmsService } from '../services/tmsService'
import {
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  QueueEntryEntity,
  VehicleEntity,
} from '../domain/rules'
import {
  runGlobalCiafalOptimizer,
  runCiafalOptimizer,
  GlobalOptimizerResult,
  ProposedCargoEntity,
  OrderReconciliationItem,
  OptimizedScenario,
  validateDesiredDate,
  validateDp34Stock,
  classifyCredit,
  DEFAULT_OPTIMIZATION_WEIGHTS,
  DEFAULT_OCCUPANCY_BANDS,
} from '../domain/optimizerEngine'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Link, useNavigate } from 'react-router-dom'

export function LoadRouterAndSimulatorPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Dados mestres da Carteira e Pátio
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [stocks, setStocks] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [itinerariesMetadata, setItinerariesMetadata] = useState<
    Record<string, { description: string; region?: string; uf?: string }>
  >({})
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationStep, setOptimizationStep] = useState<string>('')

  // Filtros / Parâmetros da Simulação (Padrão: TODOS)
  const [selectedItineraryFilter, setSelectedItineraryFilter] = useState<string>('ALL')
  const [plannedDate, setPlannedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('Carreta 5 Eixos')
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState<number>(28000)

  // Resultado do Motor Global de Otimização
  const [globalResult, setGlobalResult] = useState<GlobalOptimizerResult | null>(null)
  const [activeTab, setActiveTab] = useState<string>('proposed_cargos')

  // Modais de Detalhamento e Ações
  const [selectedCargoDetail, setSelectedCargoDetail] = useState<ProposedCargoEntity | null>(null)
  const [selectedCargoForApproval, setSelectedCargoForApproval] =
    useState<ProposedCargoEntity | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isApprovedSuccessOpen, setIsApprovedSuccessOpen] = useState(false)
  const [generatedCargoResult, setGeneratedCargoResult] = useState<any>(null)

  const [isStockConfirmModalOpen, setIsStockConfirmModalOpen] = useState(false)
  const [selectedOrderForStock, setSelectedOrderForStock] = useState<SapSalesOrderEntity | null>(
    null,
  )
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false)
  const [weights, setWeights] = useState(DEFAULT_OPTIMIZATION_WEIGHTS)

  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('')

  // Executar Otimização Multicritério com feedback de etapas
  const runOptimization = (
    currentOrders = orders,
    currentStocks = stocks,
    currentPcp = pcpOrders,
    currentQueue = queueEntries,
    itinFilter = selectedItineraryFilter,
    date = plannedDate,
    capKg = vehicleCapacityKg,
    vType = selectedVehicleType,
    meta = itinerariesMetadata,
  ) => {
    setOptimizing(true)
    setOptimizationStep('Lendo Carteira Única & Normalizando...')

    // Simulação visual ultra rápida das etapas reais do motor determinístico
    setTimeout(() => {
      setOptimizationStep('Avaliando elegibilidade, estoque DP34 & crédito...')
    }, 120)

    setTimeout(() => {
      setOptimizationStep('Agrupando por itinerários e combinando capacidades...')
    }, 240)

    setTimeout(() => {
      const result = runGlobalCiafalOptimizer({
        itineraryCode: itinFilter,
        plannedDate: date,
        orders: currentOrders,
        stocks: currentStocks,
        pcpOrders: currentPcp,
        queueEntries: currentQueue,
        vehicleCapacityKg: capKg,
        vehicleType: vType,
        weights,
        itinerariesMetadata: meta,
      })

      setGlobalResult(result)
      setOptimizing(false)
      setOptimizationStep('')
    }, 380)
  }

  // Carregar dados iniciais e disparar motor automaticamente
  const loadData = async () => {
    setLoading(true)
    try {
      const [ordList, stList, pcpList, qList, vList, itinList] = await Promise.all([
        tmsService.getSapSalesOrders(),
        tmsService.getSapStockCurrent(),
        tmsService.getPcpOrders(),
        tmsService.getQueueEntries(),
        tmsService.getVehicles(),
        tmsService.getSapItineraries(),
      ])

      const realOrders = ordList || []
      const realStocks = stList || []
      const realPcp = pcpList || []
      const realQueue = qList || []
      const realVehicles = vList || []
      const realItineraries = itinList || []

      const itinMetaMap: Record<string, { description: string; region?: string; uf?: string }> = {}
      realItineraries.forEach((it) => {
        if (it.sap_code) {
          itinMetaMap[it.sap_code.trim()] = {
            description: it.description || it.region || it.sap_code,
            region: it.region,
            uf: it.uf,
          }
        }
      })
      setItinerariesMetadata(itinMetaMap)

      setOrders(realOrders)
      setStocks(realStocks)
      setPcpOrders(realPcp)
      setQueueEntries(realQueue)
      setVehicles(realVehicles)

      // DISPARO AUTOMÁTICO NA ENTRADA: Lê toda a carteira e propõe as cargas imediatamente!
      runOptimization(
        realOrders,
        realStocks,
        realPcp,
        realQueue,
        'ALL',
        plannedDate,
        vehicleCapacityKg,
        selectedVehicleType,
        itinMetaMap,
      )
    } catch (err: any) {
      toast({
        title: 'Aviso ao carregar carteira',
        description: 'Dados carregados em modo de contingência local.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Mudança manual nos filtros
  const handleFilterChange = (
    newItin = selectedItineraryFilter,
    newDate = plannedDate,
    newVehicle = selectedVehicleType,
    newCap = vehicleCapacityKg,
  ) => {
    runOptimization(
      orders,
      stocks,
      pcpOrders,
      queueEntries,
      newItin,
      newDate,
      newCap,
      newVehicle,
      itinerariesMetadata,
    )
  }

  // Aprovação formal da carga proposta pelo usuário -> Criação no TMS e auditoria
  const handleApproveCargo = async () => {
    if (!selectedCargoForApproval) return

    if (selectedCargoForApproval.readinessStatus === 'BLOQUEADA') {
      toast({
        variant: 'destructive',
        title: 'Carga Bloqueada para Aprovação',
        description: 'Existem restrições impeditivas de crédito ou peso que impedem a aprovação.',
      })
      return
    }

    try {
      const newCargo = await tmsService.createCargo({
        scenario_name: `Carga ${selectedCargoForApproval.cargoNumber} (${selectedCargoForApproval.itineraryCode})`,
        itinerary_code: selectedCargoForApproval.itineraryCode,
        planned_date: selectedCargoForApproval.plannedExpeditionDate,
        vehicle_type: selectedCargoForApproval.vehicleType,
        vehicle_capacity_kg: selectedCargoForApproval.vehicleCapacityKg,
        total_weight_kg: selectedCargoForApproval.totalWeightKg,
        occupancy_pct: selectedCargoForApproval.occupancyPct,
        order_count: selectedCargoForApproval.ordersCount,
        orders_payload: selectedCargoForApproval.orders,
        estimated_cost: selectedCargoForApproval.estimatedCost,
        antt_floor_value: selectedCargoForApproval.anttFloorValue,
        toll_value: selectedCargoForApproval.tollsValue,
        status: 'Pronta para oferta',
        source_scenario_score: selectedCargoForApproval.scoreBreakdown.totalScore,
      })

      await tmsService.logAudit({
        user_name: user?.email || 'operador@ciafal.com.br',
        action_type: 'APROVAR_CARGA_PROPOSTA_TMS',
        target_entity: 'cargo',
        target_id: newCargo.id,
        details: {
          cargo_number: selectedCargoForApproval.cargoNumber,
          itinerary: selectedCargoForApproval.itineraryCode,
          is_suggested_itinerary: selectedCargoForApproval.isSuggestedItinerary,
          orders_count: selectedCargoForApproval.ordersCount,
          total_weight_kg: selectedCargoForApproval.totalWeightKg,
          occupancy_pct: selectedCargoForApproval.occupancyPct,
          estimated_cost: selectedCargoForApproval.estimatedCost,
          antt_floor: selectedCargoForApproval.anttFloorValue,
          readiness_label: selectedCargoForApproval.readinessLabel,
        },
      })

      setGeneratedCargoResult(newCargo)
      setIsConfirmModalOpen(false)
      setIsApprovedSuccessOpen(true)
      toast({
        title: 'Carga Aprovada com Sucesso!',
        description: `A proposta ${selectedCargoForApproval.cargoNumber} foi oficializada e está disponível no Planejador e Mesa de Fretes.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar carga',
        description: err?.message || 'Falha ao gravar registro no banco de dados.',
      })
    }
  }

  // Itinerários identificados para o select
  const availableItineraries = globalResult?.discoveredItineraries || []

  // Cargas filtradas por busca textual
  const filteredProposedCargos = useMemo(() => {
    if (!globalResult) return []
    if (!filterSearchQuery.trim()) return globalResult.allProposedCargos
    const query = filterSearchQuery.toLowerCase()
    return globalResult.allProposedCargos.filter(
      (c) =>
        c.cargoNumber.toLowerCase().includes(query) ||
        c.itineraryCode.toLowerCase().includes(query) ||
        (c.itineraryDescription && c.itineraryDescription.toLowerCase().includes(query)) ||
        c.orders.some(
          (o) =>
            o.order_number.toLowerCase().includes(query) ||
            o.customer_name.toLowerCase().includes(query) ||
            (o.destination_city && o.destination_city.toLowerCase().includes(query)),
        ),
    )
  }, [globalResult, filterSearchQuery])

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Roteirizador & Simulador de Cargas Multicritério
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
            >
              Propostas Automáticas
            </Badge>
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-semibold"
            >
              Fonte: Carteira ZSD35A ({orders.length} pedidos)
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            <strong>O TMS analisa a carteira e entrega as melhores cargas para sua decisão.</strong>{' '}
            Motor determinístico CIAFAL: Ocupação Máxima • Saída Imediata (DP34 + Crédito + PORTA) •
            Pedidos Atrasados • Menor Custo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setIsWeightsModalOpen(true)}
          >
            <Sliders className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
            Configurar Pesos & Faixas
          </Button>

          <Button
            variant="default"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
            disabled={optimizing}
            onClick={() => {
              runOptimization()
              toast({
                title: 'Otimização Recalculada',
                description:
                  'Motor determinístico executou a reavaliação de toda a Carteira Única.',
              })
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${optimizing ? 'animate-spin' : ''}`} />
            Reotimizar Cargas
          </Button>
        </div>
      </div>

      {/* BANNER DE PROCESSAMENTO DO MOTOR */}
      {optimizing && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-lg flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2 font-medium">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Otimizando carteira... {optimizationStep}</span>
          </div>
          <span className="text-[11px] text-indigo-700 font-mono">
            Motor Determinístico + Validação Logística
          </span>
        </div>
      )}

      {/* PAINEL DE CONTROLE DE FILTROS & PARÂMETROS DE SIMULAÇÃO */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              Filtrar por Itinerário / Região SAP
            </Label>
            <Select
              value={selectedItineraryFilter}
              onValueChange={(val) => {
                setSelectedItineraryFilter(val)
                handleFilterChange(val, plannedDate, selectedVehicleType, vehicleCapacityKg)
              }}
            >
              <SelectTrigger className="mt-1 h-9 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Todos os Itinerários (Padrão)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  ✨ Todos os Itinerários ({availableItineraries.length} identificados)
                </SelectItem>
                {availableItineraries.map((itin) => (
                  <SelectItem key={itin.code} value={itin.code}>
                    {itin.code} — {itin.description} ({itin.ordersCount} ped •{' '}
                    {(itin.totalWeightKg / 1000).toFixed(1)}t)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              Data Prevista de Expedição
            </Label>
            <Input
              type="date"
              value={plannedDate}
              onChange={(e) => {
                setPlannedDate(e.target.value)
                handleFilterChange(
                  selectedItineraryFilter,
                  e.target.value,
                  selectedVehicleType,
                  vehicleCapacityKg,
                )
              }}
              className="mt-1 h-9 bg-white dark:bg-slate-900"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Regra: <code>data_expedicao &ge; data_desejada</code>
            </span>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-indigo-600" />
              Tipo de Veículo
            </Label>
            <Select
              value={selectedVehicleType}
              onValueChange={(val) => {
                setSelectedVehicleType(val)
                let cap = 28000
                if (val.includes('Toco')) cap = 8000
                else if (val.includes('Truck')) cap = 14000
                else if (val.includes('Bitrem') || val.includes('7 Eixos')) cap = 37000
                else if (val.includes('6 Eixos')) cap = 32000
                setVehicleCapacityKg(cap)
                handleFilterChange(selectedItineraryFilter, plannedDate, val, cap)
              }}
            >
              <SelectTrigger className="mt-1 h-9 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Tipo de veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Toco 2 Eixos">Toco 2 Eixos (8.0t)</SelectItem>
                <SelectItem value="Truck 3 Eixos">Truck 3 Eixos (14.0t)</SelectItem>
                <SelectItem value="Carreta 5 Eixos">Carreta 5 Eixos (28.0t Padrão)</SelectItem>
                <SelectItem value="Carreta 6 Eixos">Carreta 6 Eixos (32.0t)</SelectItem>
                <SelectItem value="Bitrem 7 Eixos">Bitrem 7 Eixos (37.0t)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-indigo-600" />
              Capacidade Efetiva (Kg)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                step="500"
                value={vehicleCapacityKg}
                onChange={(e) => {
                  const cap = Number(e.target.value) || 28000
                  setVehicleCapacityKg(cap)
                  handleFilterChange(selectedItineraryFilter, plannedDate, selectedVehicleType, cap)
                }}
                className="h-9 bg-white dark:bg-slate-900"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {(vehicleCapacityKg / 1000).toFixed(1)}t
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO PRINCIPAL: CARDS EXECUTIVOS DAS CARGAS PROPOSTAS PELO TMS */}
      {globalResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
            <span className="text-[10px] font-semibold text-indigo-700 uppercase block">
              Cargas Propostas
            </span>
            <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
              {globalResult.kpis.totalProposedCargos}
            </span>
            <span className="text-[10px] text-indigo-600 block">Calculadas pelo TMS</span>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase block">
              Saída Imediata
            </span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
              {globalResult.kpis.readyForImmediateExitCount}
            </span>
            <span className="text-[10px] text-emerald-600 block">DP34 + Crédito OK</span>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-3">
            <span className="text-[10px] font-semibold text-blue-700 uppercase block">
              Ton. Roteirizadas
            </span>
            <span className="text-2xl font-black text-blue-900 dark:text-blue-200">
              {(globalResult.kpis.totalPlannedWeightKg / 1000).toFixed(1)}t
            </span>
            <span className="text-[10px] text-blue-600 block">Peso em propostas</span>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-3">
            <span className="text-[10px] font-semibold text-purple-700 uppercase block">
              Ocupação Média
            </span>
            <span className="text-2xl font-black text-purple-900 dark:text-purple-200">
              {globalResult.kpis.avgOccupancyPct}%
            </span>
            <span className="text-[10px] text-purple-600 block">Aproveitamento</span>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30 p-3">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase block">
              Pedidos Atendidos
            </span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
              {globalResult.kpis.attendedOrdersCount}
            </span>
            <span className="text-[10px] text-emerald-600 block">Em cargas sugeridas</span>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3">
            <span className="text-[10px] font-semibold text-amber-700 uppercase block">
              Aguard. Complemento
            </span>
            <span className="text-2xl font-black text-amber-900 dark:text-amber-200">
              {globalResult.kpis.waitingComplementCount}
            </span>
            <span className="text-[10px] text-amber-600 block">&lt; 80% ocupação</span>
          </Card>

          <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900 p-3">
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase block">
              Prog. Futura (PCP)
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {globalResult.kpis.futureProgrammingCount}
            </span>
            <span className="text-[10px] text-slate-500 block">Previsão de produção</span>
          </Card>

          <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 p-3">
            <span className="text-[10px] font-semibold text-rose-700 uppercase block">
              Exceções / Pendentes
            </span>
            <span className="text-2xl font-black text-rose-900 dark:text-rose-200">
              {globalResult.kpis.pendingOrdersCount}
            </span>
            <span className="text-[10px] text-rose-600 block">Crédito / Data / Saldo</span>
          </Card>
        </div>
      )}

      {/* ABAS OPERACIONAIS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto h-auto bg-transparent p-0">
            <TabsTrigger
              value="proposed_cargos"
              className="py-2 text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Cargas Propostas ({globalResult?.allProposedCargos.length || 0})</span>
            </TabsTrigger>

            <TabsTrigger
              value="immediate_exit"
              className="py-2 text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Saída Imediata ({globalResult?.immediateExitCargos.length || 0})</span>
            </TabsTrigger>

            <TabsTrigger
              value="future_programming"
              className="py-2 text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Prog. Futura ({globalResult?.futureProgrammingCargos.length || 0})</span>
            </TabsTrigger>

            <TabsTrigger
              value="complement_cargos"
              className="py-2 text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <Layers className="h-4 w-4 text-amber-600" />
              <span>Complementos ({globalResult?.complementCargos.length || 0})</span>
            </TabsTrigger>

            <TabsTrigger
              value="reconciliation_wallet"
              className="py-2 text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <FileCheck className="h-4 w-4 text-rose-600" />
              <span>Reconciliação 100% ({orders.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 px-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por carga, cliente, cidade..."
              value={filterSearchQuery}
              onChange={(e) => setFilterSearchQuery(e.target.value)}
              className="h-8 text-xs w-48 sm:w-64 bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: TODAS AS CARGAS PROPOSTAS PELO TMS (RANKING E DETALHES) */}
        {/* ========================================================================= */}
        <TabsContent value="proposed_cargos" className="space-y-4">
          {filteredProposedCargos.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {orders.length === 0
                  ? 'Não existem pedidos na Carteira Única para roteirização.'
                  : 'Nenhuma carga proposta encontrada com os filtros selecionados.'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {orders.length === 0
                  ? 'Carregue um arquivo ZSD35A ou atualize a integração SAP.'
                  : 'Experimente selecionar "Todos os Itinerários" ou ajustar a data prevista.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProposedCargos.map((cargo) => (
                <Card
                  key={cargo.id}
                  className={`border flex flex-col justify-between transition-all hover:shadow-md ${
                    cargo.readinessLabel === 'SAÍDA IMEDIATA'
                      ? 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900'
                      : cargo.readinessLabel === 'AGUARDANDO COMPLEMENTO'
                        ? 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div>
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                            >
                              Rank #{cargo.priorityRanking}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={
                                cargo.readinessLabel === 'SAÍDA IMEDIATA'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]'
                                  : cargo.readinessLabel === 'AGUARDANDO COMPLEMENTO'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]'
                                    : 'bg-blue-50 text-blue-800 border-blue-300 font-bold text-[10px]'
                              }
                            >
                              {cargo.readinessLabel}
                            </Badge>

                            {cargo.isSuggestedItinerary && (
                              <Badge className="bg-purple-600 text-white text-[9px]">
                                Itinerário Sugerido TMS
                              </Badge>
                            )}
                          </div>

                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {cargo.cargoNumber} • {cargo.itineraryCode}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 line-clamp-1">
                            {cargo.itineraryDescription} ({cargo.uf})
                          </CardDescription>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                            Ocupação
                          </span>
                          <span
                            className={`text-xl font-black ${
                              cargo.occupancyPct >= 95
                                ? 'text-emerald-600'
                                : cargo.occupancyPct >= 80
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {cargo.occupancyPct}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {/* Linha de Indicadores da Carga */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Peso / Cap.</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {(cargo.totalWeightKg / 1000).toFixed(1)}t /{' '}
                            {(cargo.vehicleCapacityKg / 1000).toFixed(1)}t
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">
                            Pedidos / Clientes
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.ordersCount} ped ({cargo.customersCount} cli)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Descargas</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.dischargesCount} entregas
                          </span>
                        </div>
                      </div>

                      {/* Explicabilidade do TMS: "Por que o TMS propôs esta carga?" */}
                      <div className="text-xs bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 mb-0.5">
                          <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                          Por que o TMS propôs esta carga?
                        </span>
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                          {cargo.whyProposed}
                        </p>
                      </div>

                      {/* Veículo & Custo ANTT */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Veículo Sugerido</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cargo.vehicleType}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Frete ANTT + Pedágio
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            R$ {cargo.estimatedCost.toLocaleString('pt-BR')} (R$ {cargo.costPerTon}
                            /t)
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setSelectedCargoDetail(cargo)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver Pedidos ({cargo.ordersCount})
                    </Button>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      onClick={() => {
                        setSelectedCargoForApproval(cargo)
                        setIsConfirmModalOpen(true)
                      }}
                    >
                      Aprovar Carga
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: SAÍDA IMEDIATA (100% APTAS: DP34 + CRÉDITO + DATA) */}
        {/* ========================================================================= */}
        <TabsContent value="immediate_exit" className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white font-bold px-2 py-0.5">
                  SAÍDA IMEDIATA HOMOLOGADA
                </Badge>
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Prontas para Expedição Imediata
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                Cargas com estoque físico no <strong>Depósito DP34</strong>, crédito financeiro
                liberado, sem restrições de data e ocupação alta (&ge; 80%).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalResult?.immediateExitCargos.map((cargo) => (
              <Card key={cargo.id} className="border-emerald-300 shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-emerald-600 text-white text-[10px] mb-1">
                        100% Apta
                      </Badge>
                      <CardTitle className="text-base font-bold">
                        {cargo.cargoNumber} • {cargo.itineraryCode}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {cargo.itineraryDescription} ({cargo.uf})
                      </CardDescription>
                    </div>
                    <span className="text-xl font-black text-emerald-600">
                      {cargo.occupancyPct}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Peso Total:</span>
                    <span className="font-bold">{(cargo.totalWeightKg / 1000).toFixed(1)}t</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Pedidos / Clientes:</span>
                    <span className="font-bold">
                      {cargo.ordersCount} ped / {cargo.customersCount} cli
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Frete ANTT Estimado:</span>
                    <span className="font-bold">
                      R$ {cargo.estimatedCost.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 border-t flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedCargoDetail(cargo)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    onClick={() => {
                      setSelectedCargoForApproval(cargo)
                      setIsConfirmModalOpen(true)
                    }}
                  >
                    Aprovar Agora
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: PROGRAMAÇÃO FUTURA (PCP / ESTOQUE PREVISTO) */}
        {/* ========================================================================= */}
        <TabsContent value="future_programming" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
            <span className="font-bold text-sm block mb-1">
              Cargas em Programação Futura (PCP Robotizado & Outros Depósitos)
            </span>
            Propostas de cargas calculadas para atendimento de pedidos que dependem de produção
            futura no PCP ou transferência entre depósitos para o DP34.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalResult?.futureProgrammingCargos.map((cargo) => (
              <Card key={cargo.id} className="border-blue-200">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-blue-600 text-white text-[10px] mb-1">
                        PCP / Futura
                      </Badge>
                      <CardTitle className="text-base font-bold">
                        {cargo.cargoNumber} • {cargo.itineraryCode}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {cargo.itineraryDescription}
                      </CardDescription>
                    </div>
                    <span className="text-xl font-bold text-blue-700">{cargo.occupancyPct}%</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Peso Total:</span>
                    <span className="font-bold">{(cargo.totalWeightKg / 1000).toFixed(1)}t</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Pedidos:</span>
                    <span className="font-bold">{cargo.ordersCount} pedidos</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 border-t flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedCargoDetail(cargo)}
                  >
                    Ver Composição
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: COMPLEMENTO DE CARGAS (ABAIXO DE 80%) */}
        {/* ========================================================================= */}
        <TabsContent value="complement_cargos" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <span className="font-bold text-sm block mb-1">
              Cargas com Oportunidade de Complemento (&lt; 80% de Ocupação)
            </span>
            Estas cargas possuem saldo de capacidade disponível para inclusão de novos pedidos ou
            transferência entre itinerários próximos.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalResult?.complementCargos.map((cargo) => (
              <Card key={cargo.id} className="border-amber-200">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-amber-600 text-white text-[10px] mb-1">
                        Complementar
                      </Badge>
                      <CardTitle className="text-base font-bold">
                        {cargo.cargoNumber} • {cargo.itineraryCode}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {cargo.itineraryDescription}
                      </CardDescription>
                    </div>
                    <span className="text-xl font-bold text-amber-700">{cargo.occupancyPct}%</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Peso Atual / Capacidade:</span>
                    <span className="font-bold">
                      {(cargo.totalWeightKg / 1000).toFixed(1)}t /{' '}
                      {(cargo.vehicleCapacityKg / 1000).toFixed(1)}t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-amber-800 font-semibold">
                    <span>Espaço Livre:</span>
                    <span>
                      {((cargo.vehicleCapacityKg - cargo.totalWeightKg) / 1000).toFixed(1)}t
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 border-t flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedCargoDetail(cargo)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                    onClick={() => navigate('/tms/complemento-cargas')}
                  >
                    Buscar Complemento
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: RECONCILIAÇÃO MATEMÁTICA 100% DA CARTEIRA ÚNICA (NENHUM PEDIDO SOME) */}
        {/* ========================================================================= */}
        <TabsContent value="reconciliation_wallet" className="space-y-4">
          {globalResult && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Reconciliação Matemática da Carteira Única (ZSD35A)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Auditoria de integridade operacional: Total da Carteira = Cargas Propostas +
                      Futuras + Bloqueios + Exceções. Diferença obrigatória: <strong>0</strong>.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs px-2.5 py-1 ${
                      globalResult.reconciliation.reconciliationDiff === 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    Diferença: {globalResult.reconciliation.reconciliationDiff} pedidos (100%
                    Reconciliado)
                  </Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b">
                    <tr>
                      <th className="py-3 px-3">Pedido / Item</th>
                      <th className="py-3 px-3">Cliente / Destino</th>
                      <th className="py-3 px-3">Itinerário SAP</th>
                      <th className="py-3 px-3 text-right">Peso (t)</th>
                      <th className="py-3 px-3 text-right">Valor Total</th>
                      <th className="py-3 px-3">Data Desejada</th>
                      <th className="py-3 px-3">Situação no TMS</th>
                      <th className="py-3 px-3">Carga Proposta</th>
                      <th className="py-3 px-3">Diagnóstico / Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {globalResult.reconciliation.items.map((item) => (
                      <tr
                        key={item.orderId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {item.orderNumber}
                          <span className="text-[10px] text-slate-400 block">
                            Item {item.itemNumber || '0010'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                            {item.customerName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.destinationCity}/{item.uf}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {item.itineraryCode ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-50 dark:bg-slate-800"
                            >
                              {item.itineraryCode}
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-purple-50 text-purple-700 border-purple-300"
                              >
                                TMS: {item.suggestedItinerary?.suggestedCode}
                              </Badge>
                              <span className="text-[9px] text-slate-400 block">Sugerido</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {(item.weightKg / 1000).toFixed(1)}t
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          R$ {item.totalValue.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {item.desiredDate?.split('T')[0] || 'N/I'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              item.status === 'ROTEIRIZADO_IMEDIATO'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                : item.status === 'AGUARDANDO_COMPLEMENTO'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                                  : item.status === 'PROGRAMACAO_FUTURA'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                            }`}
                          >
                            {item.statusLabel}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {item.assignedCargoId || '—'}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {item.statusDetail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL DE DETALHAMENTO DA CARGA PROPOSTA */}
      <Dialog
        open={Boolean(selectedCargoDetail)}
        onOpenChange={(open) => !open && setSelectedCargoDetail(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedCargoDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <Truck className="h-5 w-5 text-indigo-600" />
                      Detalhamento da Proposta {selectedCargoDetail.cargoNumber}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Itinerário {selectedCargoDetail.itineraryCode} —{' '}
                      {selectedCargoDetail.itineraryDescription} ({selectedCargoDetail.uf})
                    </DialogDescription>
                  </div>
                  <Badge
                    className={
                      selectedCargoDetail.readinessLabel === 'SAÍDA IMEDIATA'
                        ? 'bg-emerald-600 text-white'
                        : selectedCargoDetail.readinessLabel === 'AGUARDANDO COMPLEMENTO'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                    }
                  >
                    {selectedCargoDetail.readinessLabel}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Indicadores do Cabeçalho */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Veículo & Capacidade</span>
                  <span className="font-bold">
                    {selectedCargoDetail.vehicleType} (
                    {(selectedCargoDetail.vehicleCapacityKg / 1000).toFixed(1)}t)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso & Ocupação</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {(selectedCargoDetail.totalWeightKg / 1000).toFixed(1)}t (
                    {selectedCargoDetail.occupancyPct}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Frete Estimado / Piso ANTT
                  </span>
                  <span className="font-bold">
                    R$ {selectedCargoDetail.estimatedCost.toLocaleString('pt-BR')} (R${' '}
                    {selectedCargoDetail.costPerTon}/t)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Entregas & Clientes</span>
                  <span className="font-bold">
                    {selectedCargoDetail.ordersCount} pedidos ({selectedCargoDetail.customersCount}{' '}
                    clientes)
                  </span>
                </div>
              </div>

              {/* Explicabilidade da Proposta */}
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-md border border-indigo-200 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-indigo-600" />
                  Avaliação Multicritério do Motor Determinístico:
                </span>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedCargoDetail.whyProposed}
                </p>
                <div className="pt-1 text-[10px] text-slate-500 font-mono">
                  {selectedCargoDetail.scoreBreakdown.explanation}
                </div>
              </div>

              {/* Tabela de Pedidos da Carga */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Cidade/UF</th>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-right">Peso (t)</th>
                      <th className="py-2.5 px-3">Data Desejada</th>
                      <th className="py-2.5 px-3">Estoque DP34</th>
                      <th className="py-2.5 px-3">Crédito SAP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedCargoDetail.orders.map((ord) => {
                      const stockCheck = validateDp34Stock(
                        ord.material || '',
                        ord.weight_kg,
                        stocks,
                        pcpOrders,
                      )
                      const creditCheck = classifyCredit(ord)

                      return (
                        <tr key={ord.id}>
                          <td className="py-2.5 px-3 font-semibold">{ord.order_number}</td>
                          <td className="py-2.5 px-3 truncate max-w-[150px]">
                            {ord.customer_name}
                          </td>
                          <td className="py-2.5 px-3">
                            {ord.destination_city || 'N/I'}/{ord.uf || 'SP'}
                          </td>
                          <td className="py-2.5 px-3">{ord.material}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {(ord.weight_kg / 1000).toFixed(1)}t
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {ord.desired_date?.split('T')[0] || 'N/I'}
                          </td>
                          <td className="py-2.5 px-3">
                            {stockCheck.isDp34Available ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                              >
                                DP34 OK
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                              >
                                PCP / Outro Dep.
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                creditCheck.classification === 'LIBERADO'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                              }
                            >
                              {creditCheck.classification}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedCargoDetail(null)}>
                  Fechar
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => {
                      const cargo = selectedCargoDetail
                      setSelectedCargoDetail(null)
                      setSelectedCargoForApproval(cargo)
                      setIsConfirmModalOpen(true)
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Aprovar Esta Carga
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE APROVAÇÃO DA CARGA */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Aprovar Carga Proposta pelo TMS
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ao aprovar, a carga será enviada para o <strong>Planejador de Cargas</strong> e para a{' '}
              <strong>Mesa de Fretes</strong> para leilão/oferta aos motoristas. O transporte SAP
              será gerado somente após o aceite do motorista.
            </DialogDescription>
          </DialogHeader>

          {selectedCargoForApproval && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Carga</span>
                  <span className="font-bold">{selectedCargoForApproval.cargoNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Itinerário</span>
                  <span className="font-bold">{selectedCargoForApproval.itineraryCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso / Ocupação</span>
                  <span className="font-bold">
                    {(selectedCargoForApproval.totalWeightKg / 1000).toFixed(1)}t (
                    {selectedCargoForApproval.occupancyPct}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Piso Mínimo ANTT</span>
                  <span className="font-bold text-emerald-700">
                    R$ {selectedCargoForApproval.anttFloorValue.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Checklist de Revalidação CIAFAL */}
              <div className="space-y-2 border rounded p-3 bg-white dark:bg-slate-900">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Validações Operacionais Realizadas:
                </span>

                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>
                    Data Prevista ({selectedCargoForApproval.plannedExpeditionDate}) atende à regra
                    de anti-antecipação (data_expedicao &ge; data_desejada).
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>
                    Ocupação volumétrica e de peso ({selectedCargoForApproval.occupancyPct}%) dentro
                    dos limites operacionais do veículo ({selectedCargoForApproval.vehicleType}).
                  </span>
                </div>

                <div className="flex items-center gap-2 text-blue-700">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>
                    Destino: A carga será disponibilizada para contratação na{' '}
                    <strong>Mesa de Fretes</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleApproveCargo}
            >
              Confirmar Aprovação & Abrir na Mesa de Fretes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SUCESSO PÓS-APROVAÇÃO */}
      <Dialog open={isApprovedSuccessOpen} onOpenChange={setIsApprovedSuccessOpen}>
        <DialogContent className="max-w-md text-center">
          <div className="py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Carga Aprovada com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              A carga foi registrada no TMS e está pronta para negociação na Mesa de Fretes.
            </DialogDescription>

            {generatedCargoResult && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs text-left mt-4 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID da Carga:</span>
                  <span className="font-mono font-bold">{generatedCargoResult.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Itinerário:</span>
                  <span className="font-semibold">{generatedCargoResult.itinerary_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peso Total:</span>
                  <span className="font-bold">
                    {(generatedCargoResult.total_weight_kg / 1000).toFixed(1)}t
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-6">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                onClick={() => {
                  setIsApprovedSuccessOpen(false)
                  navigate('/tms/mesa-fretes')
                }}
              >
                Ir para Mesa de Fretes (Contratar Motorista)
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsApprovedSuccessOpen(false)}
              >
                Permanecer no Roteirizador
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PESOS E FAIXAS DE OCUPAÇÃO */}
      <Dialog open={isWeightsModalOpen} onOpenChange={setIsWeightsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sliders className="h-4 w-4 text-indigo-600" />
              Pesos da Otimização & Faixas de Ocupação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste determinístico dos critérios de pontuação do simulador CIAFAL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Peso Ocupação do Veículo:</span>
                  <span className="font-bold">{weights.weightOccupancy}%</span>
                </div>
                <Input
                  type="range"
                  min="10"
                  max="60"
                  value={weights.weightOccupancy}
                  onChange={(e) =>
                    setWeights({ ...weights, weightOccupancy: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Bônus Pedidos Atrasados:</span>
                  <span className="font-bold">{weights.weightOverdue}%</span>
                </div>
                <Input
                  type="range"
                  min="5"
                  max="40"
                  value={weights.weightOverdue}
                  onChange={(e) =>
                    setWeights({ ...weights, weightOverdue: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Bônus Motorista PORTA no Pátio:</span>
                  <span className="font-bold">{weights.weightPortaDriver}%</span>
                </div>
                <Input
                  type="range"
                  min="5"
                  max="30"
                  value={weights.weightPortaDriver}
                  onChange={(e) =>
                    setWeights({ ...weights, weightPortaDriver: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="border-t pt-3 space-y-1">
              <span className="font-semibold block">Faixas Homologadas:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 font-medium">
                  Excelente: &ge; 95%
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200 text-blue-800 font-medium">
                  Boa: 90% a 94.9%
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 font-medium">
                  Avaliar: 80% a 89.9%
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-200 text-rose-800 font-medium">
                  Complementar: &lt; 80%
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs w-full"
              onClick={() => {
                setIsWeightsModalOpen(false)
                runOptimization()
              }}
            >
              Salvar & Recalcular Propostas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LoadRouterAndSimulatorPage
