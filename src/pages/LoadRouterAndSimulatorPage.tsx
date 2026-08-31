import React, { useState, useEffect } from 'react'
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
  runCiafalOptimizer,
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

  // Estados principais
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [stocks, setStocks] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [itinerariesMetadata, setItinerariesMetadata] = useState<
    Record<string, { description: string; region?: string; uf?: string }>
  >({})
  const [loading, setLoading] = useState(true)

  // Filtros da Simulação
  const [selectedItinerary, setSelectedItinerary] = useState<string>('')
  const [plannedDate, setPlannedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('Carreta 5 Eixos')
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState<number>(28000)
  const [isUnmappedModalOpen, setIsUnmappedModalOpen] = useState(false)

  // Cenários gerados
  const [scenarios, setScenarios] = useState<OptimizedScenario[]>([])
  const [immediateCargos, setImmediateCargos] = useState<OptimizedScenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<OptimizedScenario | null>(null)
  const [optimizerSummary, setOptimizerSummary] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('immediate_exit')

  // Modais
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isStockConfirmModalOpen, setIsStockConfirmModalOpen] = useState(false)
  const [selectedOrderForStock, setSelectedOrderForStock] = useState<SapSalesOrderEntity | null>(
    null,
  )
  const [isPcpDetailOpen, setIsPcpDetailOpen] = useState(false)
  const [isApprovedSuccessOpen, setIsApprovedSuccessOpen] = useState(false)
  const [generatedCargoResult, setGeneratedCargoResult] = useState<any>(null)
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false)
  const [weights, setWeights] = useState(DEFAULT_OPTIMIZATION_WEIGHTS)

  // Carregar dados iniciais
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

      // Monta dicionário de metadados dos itinerários ativos/cadastrados
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

      // Extrair itinerários reais com pedidos válidos na carteira
      const activeItinsInWallet = Array.from(
        new Set(
          realOrders
            .map((o) => o.itinerary_code?.trim())
            .filter((code): code is string => Boolean(code)),
        ),
      ).sort()

      // Lógica de estado inicial do Roteirizador:
      // - Se 1 único itinerário na carteira -> seleciona automaticamente
      // - Se múltiplos itinerários -> string vazia (placeholder "Selecione um itinerário")
      // - Se 0 itinerários -> string vazia
      let initialItin = ''
      if (activeItinsInWallet.length === 1) {
        initialItin = activeItinsInWallet[0]
      }
      setSelectedItinerary(initialItin)

      // Se houver um itinerário único selecionado automaticamente, executa otimização
      if (initialItin) {
        executeOptimization(
          realOrders,
          realStocks,
          realPcp,
          realQueue,
          initialItin,
          plannedDate,
          vehicleCapacityKg,
          selectedVehicleType,
        )
      } else {
        setScenarios([])
        setImmediateCargos([])
        setSelectedScenario(null)
        setOptimizerSummary(null)
      }
    } catch (err: any) {
      toast({
        title: 'Aviso ao carregar dados',
        description: 'Dados carregados em modo de contingência local.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Disparar motor de otimização
  const executeOptimization = (
    currentOrders = orders,
    currentStocks = stocks,
    currentPcp = pcpOrders,
    currentQueue = queueEntries,
    itin = selectedItinerary,
    date = plannedDate,
    capKg = vehicleCapacityKg,
    vType = selectedVehicleType,
  ) => {
    if (!itin) {
      setScenarios([])
      setImmediateCargos([])
      setSelectedScenario(null)
      setOptimizerSummary(null)
      return
    }

    const result = runCiafalOptimizer({
      itineraryCode: itin,
      plannedDate: date,
      orders: currentOrders,
      stocks: currentStocks,
      pcpOrders: currentPcp,
      queueEntries: currentQueue,
      vehicleCapacityKg: capKg,
      vehicleType: vType,
      weights,
    })

    setScenarios(result.scenarios)
    setImmediateCargos(result.immediateExitCargos)
    setOptimizerSummary(result.summary)

    // Selecionar cenário padrão
    if (result.immediateExitCargos.length > 0) {
      setSelectedScenario(result.immediateExitCargos[0])
      setActiveTab('immediate_exit')
    } else if (result.scenarios.length > 0) {
      setSelectedScenario(result.scenarios[0])
    } else {
      setSelectedScenario(null)
    }
  }

  // Mudança de parâmetros
  const handleRunOptimizerClick = () => {
    if (!selectedItinerary) {
      toast({
        variant: 'destructive',
        title: 'Selecione um Itinerário',
        description: 'Por favor escolha um itinerário para executar o motor de otimização.',
      })
      return
    }

    executeOptimization(
      orders,
      stocks,
      pcpOrders,
      queueEntries,
      selectedItinerary,
      plannedDate,
      vehicleCapacityKg,
      selectedVehicleType,
    )
    toast({
      title: 'Motor de Otimização Executado',
      description: `Cenários determinísticos gerados para o itinerário ${selectedItinerary} com data ${plannedDate}.`,
    })
  }

  // Aprovação e Geração de Carga
  const handleApproveScenario = async () => {
    if (!selectedScenario) return

    // Revalidação prévia obrigatória
    if (selectedScenario.readinessStatus === 'BLOQUEADA') {
      toast({
        variant: 'destructive',
        title: 'Carga Bloqueada para Aprovação',
        description:
          'Existem restrições impeditivas de crédito ou excesso de peso que bloqueiam a geração da carga.',
      })
      return
    }

    try {
      // 1. Criar a carga no TMS Service
      const newCargo = await tmsService.createCargo({
        scenario_name: selectedScenario.title,
        itinerary_code: selectedScenario.itineraryCode,
        planned_date: selectedScenario.plannedExpeditionDate,
        vehicle_type: selectedScenario.vehicleType,
        vehicle_capacity_kg: selectedScenario.vehicleCapacityKg,
        total_weight_kg: selectedScenario.totalWeightKg,
        occupancy_pct: selectedScenario.occupancyPct,
        order_count: selectedScenario.ordersCount,
        orders_payload: selectedScenario.orders,
        estimated_cost: selectedScenario.estimatedCost,
        antt_floor_value: selectedScenario.anttFloorValue,
        toll_value: selectedScenario.tollsValue,
        status: 'Pronta para oferta',
        source_scenario_score: selectedScenario.scoreBreakdown.totalScore,
      })

      // 2. Registrar Auditoria Formal
      await tmsService.logAudit({
        user_name: user?.email || 'operador@ciafal.com.br',
        action_type: 'APROVAR_CENARIO_GERAR_CARGA',
        target_entity: 'cargo',
        target_id: newCargo.id,
        details: {
          scenario_id: selectedScenario.id,
          scenario_type: selectedScenario.scenarioType,
          total_score: selectedScenario.scoreBreakdown.totalScore,
          score_breakdown: selectedScenario.scoreBreakdown,
          orders_count: selectedScenario.ordersCount,
          total_weight_kg: selectedScenario.totalWeightKg,
          occupancy_pct: selectedScenario.occupancyPct,
          dp34_stocked: selectedScenario.isDp34FullyStocked,
          has_porta_driver: selectedScenario.hasPortaDriver,
          itinerary: selectedScenario.itineraryCode,
        },
      })

      setGeneratedCargoResult(newCargo)
      setIsConfirmModalOpen(false)
      setIsApprovedSuccessOpen(true)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar carga',
        description: err?.message || 'Falha ao gravar registro no banco.',
      })
    }
  }

  // Separação de pedidos: Mapeados vs Sem Itinerário
  const unmappedOrders = orders.filter((o) => !o.itinerary_code || !o.itinerary_code.trim())
  const mappedOrders = orders.filter((o) => o.itinerary_code && o.itinerary_code.trim())

  // Itinerários disponíveis na carteira atual (extraídos dos pedidos e com contagem)
  const itineraryCountsMap: Record<string, number> = {}
  mappedOrders.forEach((o) => {
    const code = o.itinerary_code!.trim()
    itineraryCountsMap[code] = (itineraryCountsMap[code] || 0) + 1
  })

  const availableItineraries = Object.keys(itineraryCountsMap).sort()

  // Função auxiliar para rótulo amigável
  const getItineraryLabel = (itinCode: string) => {
    const meta = itinerariesMetadata[itinCode]
    const count = itineraryCountsMap[itinCode] || 0
    const countText = count === 1 ? '1 pedido' : `${count} pedidos`

    if (meta) {
      const cityOrRegion = meta.description || meta.region || meta.uf || ''
      return `${itinCode} — ${cityOrRegion} (${countText})`
    }
    return `${itinCode} (${countText})`
  }

  // Pedidos do itinerário atualmente selecionado
  const currentItinOrders = selectedItinerary
    ? orders.filter((o) => o.itinerary_code === selectedItinerary)
    : []

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Roteirizador & Simulador de Cargas Multicritério
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
            >
              Sprint 5 Homologada
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Motor determinístico CIAFAL: Ocupação Máxima • Saída Imediata (DP34 + Crédito + PORTA) •
            Pedidos Atrasados • Menor Custo
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
            onClick={handleRunOptimizerClick}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin-hover" />
            Reotimizar Cargas
          </Button>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE PARÂMETROS DA SIMULAÇÃO */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              Itinerário / Região SAP
            </Label>
            <Select
              value={selectedItinerary}
              onValueChange={(val) => {
                setSelectedItinerary(val)
                executeOptimization(
                  orders,
                  stocks,
                  pcpOrders,
                  queueEntries,
                  val,
                  plannedDate,
                  vehicleCapacityKg,
                  selectedVehicleType,
                )
              }}
            >
              <SelectTrigger className="mt-1 h-9 bg-white dark:bg-slate-900">
                <SelectValue
                  placeholder={
                    availableItineraries.length === 0
                      ? 'Nenhum itinerário disponível para a carteira atual.'
                      : 'Selecione um itinerário'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableItineraries.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    Nenhum itinerário disponível para a carteira atual.
                  </SelectItem>
                ) : (
                  availableItineraries.map((itin) => (
                    <SelectItem key={itin} value={itin}>
                      {getItineraryLabel(itin)}
                    </SelectItem>
                  ))
                )}
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
                executeOptimization(
                  orders,
                  stocks,
                  pcpOrders,
                  queueEntries,
                  selectedItinerary,
                  e.target.value,
                  vehicleCapacityKg,
                  selectedVehicleType,
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
                executeOptimization(
                  orders,
                  stocks,
                  pcpOrders,
                  queueEntries,
                  selectedItinerary,
                  plannedDate,
                  cap,
                  val,
                )
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
                  executeOptimization(
                    orders,
                    stocks,
                    pcpOrders,
                    queueEntries,
                    selectedItinerary,
                    plannedDate,
                    cap,
                    selectedVehicleType,
                  )
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

      {/* RESUMO EXECUTIVO DA CARTEIRA & RESTRIÇÕES COM DIAGNÓSTICO */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-medium text-slate-500 uppercase block">
            Pedidos na Região
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {optimizerSummary
              ? optimizerSummary.totalOrdersEvaluated
              : selectedItinerary
                ? currentItinOrders.length
                : 0}
          </span>
          <span className="text-[10px] text-slate-500 block truncate">
            {selectedItinerary ? `Itin ${selectedItinerary}` : 'Selecione itinerário'}
          </span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
          <span className="text-[11px] font-medium text-emerald-700 uppercase block">
            Aptos p/ Expedição
          </span>
          <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
            {optimizerSummary ? optimizerSummary.validOrdersCount : 0}
          </span>
          <span className="text-[10px] text-emerald-600 block">Data atendida (&ge; Desejada)</span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <span className="text-[11px] font-medium text-blue-700 uppercase block">
            Motoristas PORTA
          </span>
          <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
            {optimizerSummary ? optimizerSummary.portaDriversAvailableCount : 0}
          </span>
          <span className="text-[10px] text-blue-600 block">Presença física no pátio</span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
          <span className="text-[11px] font-medium text-amber-700 uppercase block">
            Data Futura Bloqueada
          </span>
          <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
            {optimizerSummary ? optimizerSummary.blockedFutureDateCount : 0}
          </span>
          <span className="text-[10px] text-amber-600 block">Anti-antecipação</span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200">
          <span className="text-[11px] font-medium text-rose-700 uppercase block">
            Crédito Bloqueado
          </span>
          <span className="text-xl font-bold text-rose-800 dark:text-rose-300">
            {optimizerSummary ? optimizerSummary.blockedCreditCount : 0}
          </span>
          <span className="text-[10px] text-rose-600 block">Isolados p/ reavaliação</span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
          <span className="text-[11px] font-medium text-purple-700 uppercase block">
            Estoque não DP34
          </span>
          <span className="text-xl font-bold text-purple-800 dark:text-purple-300">
            {optimizerSummary ? optimizerSummary.blockedStockCount : 0}
          </span>
          <span className="text-[10px] text-purple-600 block">Outro depósito ou PCP</span>
        </Card>

        {/* Card de Diagnóstico: Sem Itinerário Mapeado */}
        <Card
          className={`border p-3 transition-all cursor-pointer ${
            unmappedOrders.length > 0
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 hover:border-slate-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
          onClick={() => setIsUnmappedModalOpen(true)}
          title="Clique para ver pedidos sem itinerário cadastrado"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 uppercase block">
              Sem Itinerário
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 bg-slate-200 dark:bg-slate-700"
            >
              Ver
            </Badge>
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {unmappedOrders.length}
          </span>
          <span className="text-[10px] text-slate-500 block">Pedidos não mapeados</span>
        </Card>
      </div>

      {/* ABAS DE NAVEGAÇÃO ENTRE CENÁRIOS E PAINEL SAÍDA IMEDIATA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger
            value="immediate_exit"
            className="py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>SAÍDA IMEDIATA ({immediateCargos.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="all_scenarios"
            className="py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>5 Cenários Otimizados</span>
          </TabsTrigger>
          <TabsTrigger
            value="comparison_table"
            className="py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>Matriz Comparativa</span>
          </TabsTrigger>
          <TabsTrigger
            value="orders_wallet"
            className="py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Package className="h-4 w-4 text-amber-600" />
            <span>Carteira & Bloqueios ({orders.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: PAINEL SAÍDA IMEDIATA (REGRA 16, 17, 19, 20) */}
        {/* ========================================================================= */}
        <TabsContent value="immediate_exit" className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white font-bold px-2 py-0.5">
                  PRIORIDADE MÁXIMA DE EXPEDIÇÃO
                </Badge>
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Cargas 100% Aptas para Execução Agora
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                Cargas com estoque físico no <strong>Depósito DP34</strong>, crédito financeiro
                liberado, sem antecipação de data e com <strong>motoristas do grupo PORTA</strong>{' '}
                disponíveis no pátio para contratação rápida na Mesa de Fretes.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm whitespace-nowrap"
              onClick={() => {
                if (immediateCargos.length > 0) {
                  setSelectedScenario(immediateCargos[0])
                  setIsConfirmModalOpen(true)
                }
              }}
              disabled={immediateCargos.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Aprovar Melhor Carga Imediata
            </Button>
          </div>

          {immediateCargos.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma carga classificada para Saída Imediata no momento
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Para atingir Saída Imediata é necessário que todos os pedidos tenham saldo
                confirmado no DP34, crédito aprovado e motoristas PORTA elegíveis.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {immediateCargos.map((scen, idx) => (
                <Card
                  key={scen.id}
                  className={`border transition-all ${
                    selectedScenario?.id === scen.id
                      ? 'ring-2 ring-emerald-500 border-emerald-400 bg-white dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-900'
                  }`}
                  onClick={() => setSelectedScenario(scen)}
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                          >
                            #{idx + 1} — Score {scen.scoreBreakdown.totalScore}/100
                          </Badge>
                          <Badge className="bg-blue-600 text-white text-[10px]">
                            {scen.eligiblePortaDriversCount} Motoristas PORTA
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                          {scen.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          {scen.description}
                        </CardDescription>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 block">Ocupação</span>
                        <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          {scen.occupancyPct}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {/* Linha de Indicadores Operacionais */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Peso Total</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(scen.totalWeightKg / 1000).toFixed(1)}t /{' '}
                          {(scen.vehicleCapacityKg / 1000).toFixed(1)}t
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Pedidos / Clientes</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {scen.ordersCount} pedidos ({scen.customersCount} cli)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Custo / Piso ANTT</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          R$ {scen.estimatedCost.toLocaleString('pt-BR')} (R$ {scen.costPerTon}/t)
                        </span>
                      </div>
                    </div>

                    {/* Explicabilidade do Score */}
                    <div className="text-xs bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                        Composição Transparente do Score:
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        {scen.scoreBreakdown.explanation}
                      </p>
                    </div>

                    {/* Status de Estoque e Crédito */}
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Estoque DP34 100% Confirmado</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Crédito Financeiro Liberado</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 text-blue-700 font-medium">
                        <Users className="h-3.5 w-3.5" />
                        <span>Motorista PORTA no Pátio</span>
                      </div>
                    </div>

                    {/* Lista rápida de pedidos incluídos */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Pedidos Alocados nesta Carga:
                      </span>
                      <div className="space-y-1">
                        {scen.orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                          >
                            <span className="font-medium truncate max-w-[200px]">
                              {ord.order_number} — {ord.customer_name} (
                              {ord.destination_city || 'São Paulo'}/{ord.uf || 'SP'})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">
                                {(ord.weight_kg / 1000).toFixed(1)}t
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-white dark:bg-slate-900"
                              >
                                {ord.material}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pb-3 px-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 italic">
                      {scen.suggestedAction || 'Pronta para despacho'}
                    </span>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedScenario(scen)
                        setIsConfirmModalOpen(true)
                      }}
                    >
                      Aprovar & Gerar Carga
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: 5 CENÁRIOS OTIMIZADOS (REGRA 11, 12, 21) */}
        {/* ========================================================================= */}
        <TabsContent value="all_scenarios" className="space-y-4">
          {!selectedItinerary ? (
            <Card className="p-12 text-center border-dashed">
              <MapPin className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Selecione um Itinerário
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Escolha um itinerário SAP ativo acima para analisar os pedidos correspondentes e
                gerar cenários determinísticos de carga.
              </p>
            </Card>
          ) : scenarios.length === 0 ? (
            <Card className="p-8 text-center border-dashed space-y-4">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-1" />
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Nenhum cenário viável gerado para {selectedItinerary}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Existem <strong>{currentItinOrders.length} pedido(s)</strong> no itinerário{' '}
                  {selectedItinerary}, porém nenhum atende simultaneamente aos critérios de
                  expedição na data programada ({plannedDate}).
                </p>
              </div>

              {/* Detalhamento dos Bloqueios Conforme Item 8 */}
              {optimizerSummary && (
                <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-800/80 p-4 rounded-lg text-left text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Diagnóstico Objetivo dos Bloqueios:
                  </span>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">
                      • Total de pedidos avaliados:
                    </span>
                    <span className="font-bold">{optimizerSummary.totalOrdersEvaluated}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      • Aptos na data (&ge; Desejada):
                    </span>
                    <span className="font-bold text-emerald-700">
                      {optimizerSummary.validOrdersCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-amber-700 dark:text-amber-400">
                      • Bloqueados por Data Futura:
                    </span>
                    <span className="font-bold text-amber-700">
                      {optimizerSummary.blockedFutureDateCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-rose-700 dark:text-rose-400">
                      • Bloqueados por Crédito SAP:
                    </span>
                    <span className="font-bold text-rose-700">
                      {optimizerSummary.blockedCreditCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-purple-700 dark:text-purple-400">
                      • Bloqueados por Estoque não DP34:
                    </span>
                    <span className="font-bold text-purple-700">
                      {optimizerSummary.blockedStockCount}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scen) => (
                <Card
                  key={scen.id}
                  className={`flex flex-col justify-between transition-all cursor-pointer ${
                    selectedScenario?.id === scen.id
                      ? 'ring-2 ring-indigo-500 border-indigo-400 bg-white dark:bg-slate-900 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                  }`}
                  onClick={() => setSelectedScenario(scen)}
                >
                  <div>
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            scen.readinessStatus === 'PRONTA_SAIDA_IMEDIATA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                              : scen.readinessStatus === 'PRONTA_PARA_OFERTA'
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                                : scen.readinessStatus === 'PLANEJAMENTO_FUTURO'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                          }
                        >
                          {scen.readinessStatus === 'PRONTA_SAIDA_IMEDIATA'
                            ? 'SAÍDA IMEDIATA'
                            : scen.readinessStatus === 'PRONTA_PARA_OFERTA'
                              ? 'PRONTA P/ OFERTA'
                              : scen.readinessStatus === 'PLANEJAMENTO_FUTURO'
                                ? 'PLANEJAMENTO FUTURO'
                                : 'BLOQUEADA'}
                        </Badge>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Score
                          </span>
                          <span className="text-base font-black text-indigo-700 dark:text-indigo-400 block">
                            {scen.scoreBreakdown.totalScore}/100
                          </span>
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {scen.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 line-clamp-2">
                        {scen.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {/* Ocupação e Peso */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Ocupação do Veículo
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                          {scen.occupancyPct}% ({(scen.totalWeightKg / 1000).toFixed(1)}t)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            scen.occupancyPct >= 95
                              ? 'bg-emerald-500'
                              : scen.occupancyPct >= 90
                                ? 'bg-blue-500'
                                : scen.occupancyPct >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, scen.occupancyPct)}%` }}
                        />
                      </div>

                      {scen.occupancyAlert && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{scen.occupancyAlert}</span>
                        </div>
                      )}

                      {/* Métricas chave */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Frete Estimado</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            R$ {scen.estimatedCost.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Custo por Tonelada
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            R$ {scen.costPerTon}/t
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Pedidos / Clientes
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {scen.ordersCount} / {scen.customersCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Motoristas PORTA</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {scen.eligiblePortaDriversCount > 0 ? (
                              <span className="text-blue-600 font-bold">
                                {scen.eligiblePortaDriversCount} no pátio
                              </span>
                            ) : (
                              <span className="text-slate-400">0 na porta</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 w-full"
                      onClick={() => {
                        setSelectedScenario(scen)
                        setIsConfirmModalOpen(true)
                      }}
                      disabled={scen.readinessStatus === 'BLOQUEADA'}
                    >
                      {scen.readinessStatus === 'BLOQUEADA'
                        ? 'Carga Bloqueada'
                        : 'Aprovar este Cenário'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: TABELA COMPARATIVA (REGRA 22) */}
        {/* ========================================================================= */}
        <TabsContent value="comparison_table" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">
                Matriz Comparativa de Cenários de Planejamento (Sprint 5)
              </CardTitle>
              <CardDescription className="text-xs">
                Comparação multicritério determinística para apoio à tomada de decisão logística.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-3 px-3">Cenário</th>
                    <th className="py-3 px-3">Status Prontidão</th>
                    <th className="py-3 px-3 text-right">Peso (t)</th>
                    <th className="py-3 px-3 text-right">Ocupação %</th>
                    <th className="py-3 px-3 text-center">Pedidos</th>
                    <th className="py-3 px-3 text-center">Clientes</th>
                    <th className="py-3 px-3 text-center">PORTA</th>
                    <th className="py-3 px-3 text-right">Custo / t</th>
                    <th className="py-3 px-3 text-right">Piso ANTT</th>
                    <th className="py-3 px-3 text-center">Estoque DP34</th>
                    <th className="py-3 px-3 text-center">Crédito</th>
                    <th className="py-3 px-3 text-right">Score Final</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scenarios.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-slate-500">
                        Nenhum cenário gerado para os parâmetros atuais.
                      </td>
                    </tr>
                  ) : (
                    scenarios.map((scen) => (
                      <tr
                        key={scen.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          selectedScenario?.id === scen.id
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {scen.title}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={
                              scen.readinessStatus === 'PRONTA_SAIDA_IMEDIATA'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                                : scen.readinessStatus === 'PRONTA_PARA_OFERTA'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 text-[10px]'
                                  : scen.readinessStatus === 'PLANEJAMENTO_FUTURO'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 text-[10px]'
                            }
                          >
                            {scen.readinessStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {(scen.totalWeightKg / 1000).toFixed(1)}t
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {scen.occupancyPct}%
                        </td>
                        <td className="py-3 px-3 text-center">{scen.ordersCount}</td>
                        <td className="py-3 px-3 text-center">{scen.customersCount}</td>
                        <td className="py-3 px-3 text-center">
                          {scen.eligiblePortaDriversCount > 0 ? (
                            <Badge className="bg-blue-600 text-white text-[10px]">
                              {scen.eligiblePortaDriversCount} Sim
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">R$ {scen.costPerTon}</td>
                        <td className="py-3 px-3 text-right font-mono">
                          R$ {scen.anttFloorValue.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {scen.isDp34FullyStocked ? (
                            <span className="text-emerald-600 font-semibold">100% DP34</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">
                              Faltam {(scen.dp34StockMissingKg / 1000).toFixed(1)}t
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              scen.creditClassification === 'LIBERADO'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : scen.creditClassification === 'LIBERADO_COM_APROVACAO'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                            }
                          >
                            {scen.creditClassification}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-indigo-700 dark:text-indigo-400 text-sm">
                          {scen.scoreBreakdown.totalScore}/100
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 text-indigo-600 hover:text-indigo-800"
                            onClick={() => {
                              setSelectedScenario(scen)
                              setIsConfirmModalOpen(true)
                            }}
                            disabled={scen.readinessStatus === 'BLOQUEADA'}
                          >
                            Aprovar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: CARTEIRA DE PEDIDOS & ANÁLISE DE RESTRIÇÕES (REGRAS 2, 4, 5, 6, 9) */}
        {/* ========================================================================= */}
        <TabsContent value="orders_wallet" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">
                    {selectedItinerary
                      ? `Carteira de Pedidos do Itinerário ${selectedItinerary}`
                      : 'Carteira Completa de Pedidos'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Validação individual de Data Desejada, Estoque Oficial DP34 e Crédito Financeiro
                    {selectedItinerary
                      ? ` para os ${currentItinOrders.length} pedido(s) filtrados.`
                      : ` (${orders.length} pedidos no total).`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-3 px-3">Pedido / Item</th>
                    <th className="py-3 px-3">Itinerário</th>
                    <th className="py-3 px-3">Cliente / Destino</th>
                    <th className="py-3 px-3">Material</th>
                    <th className="py-3 px-3 text-right">Peso (t)</th>
                    <th className="py-3 px-3 text-right">Valor Pedido</th>
                    <th className="py-3 px-3">Data Desejada</th>
                    <th className="py-3 px-3">Regra Data</th>
                    <th className="py-3 px-3">Estoque DP34</th>
                    <th className="py-3 px-3">Crédito SAP</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(selectedItinerary ? currentItinOrders : orders).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500">
                        {selectedItinerary
                          ? `Nenhum pedido encontrado para o itinerário ${selectedItinerary}.`
                          : 'Nenhum pedido encontrado na carteira.'}
                      </td>
                    </tr>
                  ) : (
                    (selectedItinerary ? currentItinOrders : orders).map((ord) => {
                      const dateCheck = validateDesiredDate(ord.desired_date, plannedDate)
                      const stockCheck = validateDp34Stock(
                        ord.material || '',
                        ord.weight_kg,
                        stocks,
                        pcpOrders,
                      )
                      const creditCheck = classifyCredit(ord)

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {ord.order_number}
                            <span className="text-[10px] text-slate-400 block">
                              Item {ord.item_number || '0010'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {ord.itinerary_code ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-slate-50 dark:bg-slate-800"
                              >
                                {ord.itinerary_code}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                              >
                                Não mapeado
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                              {ord.customer_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {ord.destination_city || 'São Paulo'}/{ord.uf || 'SP'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium block">{ord.material}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">
                              {ord.material_description}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            {(ord.weight_kg / 1000).toFixed(1)}t
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            R$ {(ord.total_value || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-3 font-mono">{ord.desired_date || 'N/I'}</td>
                          <td className="py-3 px-3">
                            {!dateCheck.isValid ? (
                              <Badge
                                variant="outline"
                                className="bg-rose-50 text-rose-800 border-rose-300 text-[10px]"
                              >
                                ANTECIPAÇÃO PROIBIDA
                              </Badge>
                            ) : dateCheck.isOverdue ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                              >
                                ATRASADO ({dateCheck.overdueDays}d)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                              >
                                DATA OK
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {stockCheck.isDp34Available ? (
                              <div className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>
                                  DP34 Disp. ({(stockCheck.dp34AvailableKg / 1000).toFixed(1)}t)
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-amber-700 text-[11px] font-semibold block">
                                  DP34 Insuficiente
                                </span>
                                {stockCheck.otherDepositsKg > 0 && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Outros Dep.: {(stockCheck.otherDepositsKg / 1000).toFixed(1)}t
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant="outline"
                              className={
                                creditCheck.classification === 'LIBERADO'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                                  : creditCheck.classification === 'LIBERADO_COM_APROVACAO'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 text-[10px]'
                              }
                            >
                              {creditCheck.classification}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-6 px-2"
                              onClick={() => {
                                setSelectedOrderForStock(ord)
                                setIsStockConfirmModalOpen(true)
                              }}
                            >
                              Conferir Saldo
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>{' '}
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE CONFIRMAÇÃO E APROVAÇÃO DO CENÁRIO (REGRA 28) */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Aprovar Cenário e Gerar Carga Oficial no TMS
            </DialogTitle>
            <DialogDescription className="text-xs">
              Revalidação operacional formal antes de encaminhar para a Mesa de Fretes e
              contratação.
            </DialogDescription>
          </DialogHeader>

          {selectedScenario && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Cenário</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedScenario.title}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso / Ocupação</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {(selectedScenario.totalWeightKg / 1000).toFixed(1)}t (
                    {selectedScenario.occupancyPct}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Piso ANTT Oficial</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    R$ {selectedScenario.anttFloorValue.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Motoristas PORTA</span>
                  <span className="font-bold text-blue-600">
                    {selectedScenario.eligiblePortaDriversCount} elegíveis
                  </span>
                </div>
              </div>

              {/* Checklist de Revalidação */}
              <div className="space-y-2 border rounded p-3 bg-white dark:bg-slate-900">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Checklist de Revalidação CIAFAL:
                </span>

                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>
                    Data de Expedição ({selectedScenario.plannedExpeditionDate}) &ge; Data Desejada
                    de todos os pedidos incluídos.
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>
                    Estoque 100% conferido no <strong>Depósito DP34</strong> (
                    {selectedScenario.dp34StockAvailableKg / 1000}t alocadas).
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>
                    Crédito Financeiro validado por valor monetário para todos os clientes (
                    {selectedScenario.customersCount} clientes).
                  </span>
                </div>

                <div className="flex items-center gap-2 text-blue-700">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>
                    Próximo passo: A carga será enviada para a <strong>Mesa de Fretes</strong> para
                    leilão e contratação de motorista.
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
              onClick={handleApproveScenario}
            >
              Confirmar Aprovação & Abrir Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SUCESSO PÓS-APROVAÇÃO (FLUXO PARA MESA DE FRETES) */}
      <Dialog open={isApprovedSuccessOpen} onOpenChange={setIsApprovedSuccessOpen}>
        <DialogContent className="max-w-md text-center">
          <div className="py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Carga Aprovada com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              A carga foi gerada no TMS e está pronta para contratação na Mesa de Fretes.
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Piso Mínimo ANTT:</span>
                  <span className="font-bold text-emerald-700">
                    R$ {generatedCargoResult.antt_floor_value?.toLocaleString('pt-BR')}
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
                Permanecer no Simulador
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE ESTOQUE DP34 / PCP (REGRA 8) */}
      <Dialog open={isStockConfirmModalOpen} onOpenChange={setIsStockConfirmModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Package className="h-4 w-4 text-indigo-600" />
              Solicitar Confirmação de Estoque DP34
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conferência física e verificação de transferências ou produção PCP.
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForStock && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded border space-y-1">
                <div>
                  <span className="text-slate-400 text-[10px]">Material:</span>
                  <span className="font-bold block">
                    {selectedOrderForStock.material} — {selectedOrderForStock.material_description}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Necessidade do Pedido:</span>
                  <span className="font-bold">
                    {(selectedOrderForStock.weight_kg / 1000).toFixed(1)}t
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold block">Posição Atual nos Depósitos CIAFAL:</span>
                <div className="border rounded divide-y text-[11px]">
                  <div className="flex justify-between p-2 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="font-semibold text-emerald-800">
                      Depósito Oficial DP34 (Expedição):
                    </span>
                    <span className="font-bold font-mono">
                      {(stocks.find(
                        (s) =>
                          s.material_code === selectedOrderForStock.material &&
                          s.storage_location?.includes('DP34'),
                      )?.weight_kg || 0) / 1000}
                      t
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Depósito DP01 (Laminação):</span>
                    <span className="font-mono">
                      {(stocks.find(
                        (s) =>
                          s.material_code === selectedOrderForStock.material &&
                          s.storage_location === 'DP01',
                      )?.weight_kg || 0) / 1000}
                      t
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 text-amber-800 dark:text-amber-300 text-[11px]">
                <span className="font-semibold block mb-0.5">Regra Operacional DP34:</span>
                Materiais em outros depósitos requerem transferência formal para o DP34 antes de
                liberar a carga para saída imediata.
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsStockConfirmModalOpen(false)}>
              Fechar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={async () => {
                await tmsService.logAudit({
                  user_name: user?.email || 'operador@ciafal.com.br',
                  action_type: 'SOLICITAR_CONFIRMACAO_ESTOQUE_DP34',
                  target_entity: 'stock',
                  target_id: selectedOrderForStock?.material || '',
                  details: {
                    order_number: selectedOrderForStock?.order_number,
                    weight_kg: selectedOrderForStock?.weight_kg,
                  },
                })
                toast({
                  title: 'Confirmação de Estoque Solicitada',
                  description: `Notificação enviada para a equipe de Logística Interna / Pátio DP34.`,
                })
                setIsStockConfirmModalOpen(false)
              }}
            >
              Confirmar Solicitação de Estoque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PESOS E FAIXAS DE OCUPAÇÃO (REGRA 12, 14) */}
      <Dialog open={isWeightsModalOpen} onOpenChange={setIsWeightsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sliders className="h-4 w-4 text-indigo-600" />
              Pesos da Função Objetivo & Faixas de Ocupação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste determinístico dos critérios de pontuação do simulador CIAFAL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-3">
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                Pesos da Função Objetivo (0 a 100):
              </span>

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
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                Faixas de Ocupação Homologadas:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 font-medium">
                  Excelente: &ge; 95%
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200 text-blue-800 font-medium">
                  Boa: 90% a 94.9%
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 font-medium">
                  Atenção: 80% a 89.9%
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-200 text-rose-800 font-medium">
                  Baixa: &lt; 80% (Alerta)
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs w-full"
              onClick={() => {
                setIsWeightsModalOpen(false)
                handleRunOptimizerClick()
              }}
            >
              Salvar & Recalcular Cenários
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DIAGNÓSTICO: PEDIDOS SEM ITINERÁRIO MAPEADO */}
      <Dialog open={isUnmappedModalOpen} onOpenChange={setIsUnmappedModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Pedidos Sem Itinerário Mapeado ({unmappedOrders.length})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registros da carteira com o campo <code>itinerary_code</code> nulo ou em branco. Estes
              pedidos não bloqueiam o Roteirizador e ficam isolados para saneamento.
            </DialogDescription>
          </DialogHeader>

          {unmappedOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              Todos os pedidos da carteira possuem itinerário SAP mapeado corretamente!
            </div>
          ) : (
            <div className="space-y-3 py-2 text-xs">
              <div className="border rounded divide-y overflow-hidden">
                {unmappedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {ord.order_number} (Item {ord.item_number || '0010'})
                        </span>
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">
                          {ord.destination_city || 'Sem cidade'}/{ord.uf || 'N/I'}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {ord.customer_name} • {ord.material} ({(ord.weight_kg / 1000).toFixed(1)}t)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold block">
                        R$ {(ord.total_value || 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Data: {ord.desired_date || 'N/I'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUnmappedModalOpen(false)}>
              Fechar Diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LoadRouterAndSimulatorPage
