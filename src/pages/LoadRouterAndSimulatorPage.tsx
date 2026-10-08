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
  evaluateComplementCandidates,
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
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { LoadingState } from '@/components/ui-custom/FeedbackStates'
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
  // Novos campos: Ocupação mínima e máxima (faixa 0–100%, formato inicial "00%", padrão brasileiro com vírgula)
  const [minOccupancyInput, setMinOccupancyInput] = useState<string>('70%')
  const [maxOccupancyInput, setMaxOccupancyInput] = useState<string>('95%')

  // Resultado do Motor Global de Otimização
  const [globalResult, setGlobalResult] = useState<GlobalOptimizerResult | null>(null)
  const [activeTab, setActiveTab] = useState<string>('proposed_cargos')
  const [isWaitingComplementModalOpen, setIsWaitingComplementModalOpen] = useState(false)
  const [selectedComplementTargetCargo, setSelectedComplementTargetCargo] =
    useState<ProposedCargoEntity | null>(null)
  const [isTargetOccupancyModalOpen, setIsTargetOccupancyModalOpen] = useState(false)
  const [newTargetOccupancyInput, setNewTargetOccupancyInput] = useState<string>('95%')

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
  const [sortBy, setSortBy] = useState<
    | 'rank'
    | 'customers_asc'
    | 'discharges_asc'
    | 'occupancy_desc'
    | 'freight_asc'
    | 'cost_ton_asc'
    | 'distance_asc'
    | 'expedition_date'
  >('rank')
  const [filterMaxCustomers, setFilterMaxCustomers] = useState<string>('ALL')
  const [filterMaxDischarges, setFilterMaxDischarges] = useState<string>('ALL')
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false)
  const [selectedWhyCargo, setSelectedWhyCargo] = useState<ProposedCargoEntity | null>(null)

  // Utilitário para parse de percentual brasileiro ("70%", "85,50%", etc.)
  const parsePercentBr = (str: string): number => {
    const cleaned = (str || '').replace('%', '').trim().replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

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
    minOccStr = minOccupancyInput,
    maxOccStr = maxOccupancyInput,
  ) => {
    const minOcc = parsePercentBr(minOccStr)
    const maxOcc = parsePercentBr(maxOccStr)

    // Validações obrigatórias
    if (minOcc === 0 && maxOcc === 0) {
      toast({
        variant: 'destructive',
        title: 'Faixa de ocupação obrigatória',
        description: 'Informe a faixa de ocupação mínima e máxima para realizar a otimização.',
      })
      return
    }

    if (minOcc > maxOcc || minOcc < 0 || maxOcc > 100) {
      toast({
        variant: 'destructive',
        title: 'Validação de Ocupação',
        description: 'A ocupação máxima deve ser igual ou superior à ocupação mínima.',
      })
      return
    }

    setOptimizing(true)
    setOptimizationStep('Lendo Carteira Única & Normalizando...')

    setTimeout(() => {
      setOptimizationStep('Avaliando elegibilidade, estoque DP34 & crédito...')
    }, 120)

    setTimeout(() => {
      setOptimizationStep('Agrupando por itinerários e combinando capacidades...')
    }, 240)

    setTimeout(async () => {
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
        minOccupancyPct: minOcc,
        maxOccupancyPct: maxOcc,
      })

      setGlobalResult(result)
      setOptimizing(false)
      setOptimizationStep('')

      // Persistir em load_proposals e gerar oportunidades de complemento no backend
      try {
        const candidatesByProposal: Record<string, any[]> = {}
        result.allProposedCargos.forEach((c) => {
          candidatesByProposal[c.cargoNumber] = evaluateComplementCandidates({
            cargo: c,
            allOrders: currentOrders,
            stocks: currentStocks,
            pcpOrders: currentPcp,
          })
        })

        await tmsService.saveLoadOptimizationRun({
          itineraryCode: itinFilter,
          plannedDate: date,
          vehicleType: vType,
          minOccupancyPct: minOcc,
          maxOccupancyPct: maxOcc,
          totalOrdersConsidered: currentOrders.length,
          totalProposalsCreated: result.allProposedCargos.length,
          totalWeightKg: result.kpis.totalPlannedWeightKg,
          avgOccupancyPct: result.kpis.avgOccupancyPct,
          proposals: result.allProposedCargos,
          candidatesByProposal,
          operatorEmail: user?.email || 'operador@ciafal.com.br',
          operatorName: user?.name || 'Operador TMS',
        })
      } catch (saveErr) {
        console.warn('Persistência de propostas em contingência:', saveErr)
      }
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
        minOccupancyInput,
        maxOccupancyInput,
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

  // Cargas filtradas por busca textual, filtros avançados e ordenação
  const filteredProposedCargos = useMemo(() => {
    if (!globalResult) return []
    let list = [...globalResult.allProposedCargos]

    // Filtro por quantidade máxima de clientes
    if (filterMaxCustomers !== 'ALL') {
      const maxC = parseInt(filterMaxCustomers, 10)
      if (!isNaN(maxC)) {
        list = list.filter((c) => c.customersCount <= maxC)
      }
    }

    // Filtro por quantidade máxima de descargas
    if (filterMaxDischarges !== 'ALL') {
      const maxD = parseInt(filterMaxDischarges, 10)
      if (!isNaN(maxD)) {
        list = list.filter((c) => c.dischargesCount <= maxD)
      }
    }

    // Busca textual ampla
    if (filterSearchQuery.trim()) {
      const query = filterSearchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.cargoNumber.toLowerCase().includes(query) ||
          c.itineraryCode.toLowerCase().includes(query) ||
          (c.itineraryDescription && c.itineraryDescription.toLowerCase().includes(query)) ||
          (c.vehicleType && c.vehicleType.toLowerCase().includes(query)) ||
          (c.uf && c.uf.toLowerCase().includes(query)) ||
          c.orders.some(
            (o) =>
              o.order_number.toLowerCase().includes(query) ||
              o.customer_name.toLowerCase().includes(query) ||
              (o.customer_code && o.customer_code.toLowerCase().includes(query)) ||
              (o.destination_city && o.destination_city.toLowerCase().includes(query)) ||
              (o.material && o.material.toLowerCase().includes(query)) ||
              (o.material_description && o.material_description.toLowerCase().includes(query)),
          ),
      )
    }

    // Ordenação
    list.sort((a, b) => {
      if (sortBy === 'customers_asc') {
        if (a.customersCount !== b.customersCount) return a.customersCount - b.customersCount
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'discharges_asc') {
        if (a.dischargesCount !== b.dischargesCount) return a.dischargesCount - b.dischargesCount
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'occupancy_desc') {
        if (b.occupancyPct !== a.occupancyPct) return b.occupancyPct - a.occupancyPct
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'freight_asc') {
        if (a.estimatedCost !== b.estimatedCost) return a.estimatedCost - b.estimatedCost
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'cost_ton_asc') {
        if (a.costPerTon !== b.costPerTon) return a.costPerTon - b.costPerTon
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'distance_asc') {
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm
        return a.priorityRanking - b.priorityRanking
      }
      if (sortBy === 'expedition_date') {
        return (a.plannedExpeditionDate || '').localeCompare(b.plannedExpeditionDate || '')
      }
      // Padrão: melhor aderência logística (Rank #1 a #N pelo motor lexicográfico)
      return a.priorityRanking - b.priorityRanking
    })

    return list
  }, [globalResult, filterSearchQuery, sortBy, filterMaxCustomers, filterMaxDischarges])

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Roteirizador & Simulador de Cargas Multicritério"
        subtitle="O TMS analisa a carteira e entrega as melhores cargas para sua decisão. Motor determinístico CIAFAL: Ocupação Máxima • Saída Imediata (DP34 + Crédito + PORTA) • Pedidos Atrasados • Menor Custo."
        icon={Truck}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Planejamento Logístico', href: '/tms/roteirizador' },
          { label: 'Roteirizador & Simulador de Cargas' },
        ]}
        badge={
          <div className="flex items-center gap-1.5">
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
              Fonte: SAP ECC 6.0 (RFC) ({orders.length} pedidos)
            </Badge>
          </div>
        }
        actions={
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
        }
      />

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
                <SelectItem value="Toco 2 Eixos">Toco 2 Eixos (8,00 t)</SelectItem>
                <SelectItem value="Truck 3 Eixos">Truck 3 Eixos (14,00 t)</SelectItem>
                <SelectItem value="Carreta 5 Eixos">Carreta 5 Eixos (28,00 t)</SelectItem>
                <SelectItem value="Carreta 6 Eixos">Carreta 6 Eixos (32,00 t)</SelectItem>
                <SelectItem value="Bitrem 7 Eixos">Bitrem 7 Eixos (37,00 t)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Faixa de Ocupação Alvo</span>
              </Label>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-semibold">
                Capacidade:{' '}
                {((vehicleCapacityKg || 28000) / 1000).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                t (auto)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Ocupação mínima</span>
                <Input
                  type="text"
                  placeholder="00%"
                  value={minOccupancyInput}
                  onChange={(e) => setMinOccupancyInput(e.target.value)}
                  onBlur={() => {
                    let val = minOccupancyInput.trim()
                    if (val && !val.endsWith('%')) val = `${val}%`
                    setMinOccupancyInput(val || '00%')
                  }}
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Ocupação máxima</span>
                <Input
                  type="text"
                  placeholder="00%"
                  value={maxOccupancyInput}
                  onChange={(e) => setMaxOccupancyInput(e.target.value)}
                  onBlur={() => {
                    let val = maxOccupancyInput.trim()
                    if (val && !val.endsWith('%')) val = `${val}%`
                    setMaxOccupancyInput(val || '00%')
                  }}
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO PRINCIPAL: CARDS EXECUTIVOS DAS CARGAS PROPOSTAS PELO TMS */}
      {globalResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 min-w-0">
          <Card
            className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px] cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
            onClick={() => setActiveTab('proposed_cargos')}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tight truncate">
                Cargas Propostas
              </span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            </div>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-indigo-900 dark:text-indigo-100 block">
                {globalResult.kpis.totalProposedCargos}
              </span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate block">
              Soluções calculadas
            </span>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tight truncate block">
              Saída Imediata
            </span>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-100 block">
                {globalResult.kpis.readyForImmediateExitCount}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate block">
              DP34 + Crédito OK
            </span>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-tight truncate block">
              Toneladas Roteirizadas
            </span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-100 block truncate">
                {((globalResult.kpis.totalPlannedWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                t
              </span>
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 truncate block">
              Peso em propostas
            </span>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-tight truncate block">
              Ocupação Média
            </span>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-purple-900 dark:text-purple-100 block">
                {globalResult.kpis.avgOccupancyPct.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                %
              </span>
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 truncate block">
              Aproveitamento
            </span>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tight truncate block">
              Pedidos Atendidos
            </span>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-100 block">
                {globalResult.kpis.attendedOrdersCount}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate block">
              Em cargas sugeridas
            </span>
          </Card>

          <Card
            className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px] cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
            onClick={() => setIsWaitingComplementModalOpen(true)}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tight truncate">
                Aguard. Complemento
              </span>
              <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-amber-900 dark:text-amber-100 block">
                {globalResult.kpis.waitingComplementCount}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate block">
              Clique para detalhar
            </span>
          </Card>

          <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate block">
              Prog. Futura (PCP)
            </span>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 block">
                {globalResult.kpis.futureProgrammingCount}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">Previsão de produção</span>
          </Card>

          <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 p-3 flex flex-col justify-between min-w-0 min-h-[96px]">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-tight truncate block">
              Exceções / Pendentes
            </span>
            <div className="my-1">
              <span className="text-2xl font-black tracking-tight text-rose-900 dark:text-rose-100 block">
                {globalResult.kpis.pendingOrdersCount}
              </span>
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 truncate block">
              Crédito / Data / Saldo
            </span>
          </Card>
        </div>
      )}

      {/* ABAS OPERACIONAIS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-100/90 dark:bg-slate-800/90 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          {/* TabsList com scroll horizontal controlado, whitespace-nowrap, min-w-max por tab, sem sobreposição nem truncamento */}
          <div className="overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            <TabsList className="inline-flex flex-nowrap items-center h-10 bg-transparent p-0 gap-1.5 min-w-max">
              <TabsTrigger
                value="proposed_cargos"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-900/60"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Cargas Propostas</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] font-bold px-1.5 py-0 h-4.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-0"
                >
                  {globalResult?.allProposedCargos.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="immediate_exit"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-900/60"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Saída Imediata</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] font-bold px-1.5 py-0 h-4.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-0"
                >
                  {globalResult?.immediateExitCargos.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="future_programming"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-900/60"
              >
                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Programação Futura</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] font-bold px-1.5 py-0 h-4.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-0"
                >
                  {globalResult?.futureProgrammingCargos.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="complement_cargos"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-900/60"
              >
                <Layers className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Complemento</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] font-bold px-1.5 py-0 h-4.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-0"
                >
                  {globalResult?.complementCargos.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="reconciliation_wallet"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-900/60"
              >
                <FileCheck className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span>Conciliação 100%</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] font-bold px-1.5 py-0 h-4.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-0"
                >
                  {orders.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Controles de Busca, Ordenação e Filtros Lexicográficos */}
          <div className="flex flex-wrap items-center gap-2 px-2 shrink-0 self-end lg:self-center w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por carga, cliente, cidade, pedido, placa..."
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                className="h-8.5 pl-8 text-xs w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-8.5 text-xs w-full sm:w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">⭐ Melhor Aderência Logística (Rank)</SelectItem>
                <SelectItem value="customers_asc">👥 Menor Nº de Clientes</SelectItem>
                <SelectItem value="discharges_asc">📦 Menor Nº de Descargas</SelectItem>
                <SelectItem value="occupancy_desc">📈 Maior Ocupação (%)</SelectItem>
                <SelectItem value="freight_asc">💰 Menor Frete Total (R$)</SelectItem>
                <SelectItem value="cost_ton_asc">⚖️ Menor Custo por Tonelada (R$/t)</SelectItem>
                <SelectItem value="distance_asc">🛣️ Menor Distância (km)</SelectItem>
                <SelectItem value="expedition_date">📅 Data de Expedição</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMaxCustomers} onValueChange={setFilterMaxCustomers}>
              <SelectTrigger className="h-8.5 text-xs w-full sm:w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Clientes máx." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Clientes: Todos</SelectItem>
                <SelectItem value="1">Até 1 Cliente</SelectItem>
                <SelectItem value="2">Até 2 Clientes</SelectItem>
                <SelectItem value="3">Até 3 Clientes</SelectItem>
                <SelectItem value="4">Até 4 Clientes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMaxDischarges} onValueChange={setFilterMaxDischarges}>
              <SelectTrigger className="h-8.5 text-xs w-full sm:w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Descargas máx." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Descargas: Todas</SelectItem>
                <SelectItem value="1">Até 1 Descarga</SelectItem>
                <SelectItem value="2">Até 2 Descargas</SelectItem>
                <SelectItem value="3">Até 3 Descargas</SelectItem>
                <SelectItem value="5">Até 5 Descargas</SelectItem>
              </SelectContent>
            </Select>
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
                  ? 'Sincronize a carteira SAP via RFC no menu Análises > Carteira de Vendas.'
                  : 'Experimente selecionar "Todos os Itinerários" ou ajustar a data prevista.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProposedCargos.map((cargo) => (
                <Card
                  key={cargo.id}
                  className={`border flex flex-col justify-between transition-all hover:shadow-lg ${
                    cargo.occupancyAlert?.includes('abaixo do mínimo ANTT')
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-50/20'
                      : cargo.readinessLabel === 'SAÍDA IMEDIATA'
                        ? 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900'
                        : cargo.readinessLabel === 'AGUARDANDO COMPLEMENTO'
                          ? 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div>
                    {/* Header do Card com badges ricos */}
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
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

                            {cargo.occupancyAlert?.includes('abaixo do mínimo ANTT') && (
                              <Badge className="bg-rose-600 text-white text-[9px] font-bold animate-pulse">
                                Alerta ANTT Infracional
                              </Badge>
                            )}

                            {cargo.isSuggestedItinerary && (
                              <Badge className="bg-purple-600 text-white text-[9px]">
                                Itinerário Sugerido TMS
                              </Badge>
                            )}
                          </div>

                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {cargo.cargoNumber}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 line-clamp-1 font-medium">
                            {cargo.itineraryCode} • {cargo.itineraryDescription} ({cargo.uf})
                          </CardDescription>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                            Ocupação
                          </span>
                          <span
                            className={`text-2xl font-black ${
                              cargo.occupancyPct >= 95
                                ? 'text-emerald-600'
                                : cargo.occupancyPct >= 80
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {cargo.occupancyPct.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            %
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3.5">
                      {/* Grid de Métricas Principais */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Carga / Cap.</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {((cargo.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t /{' '}
                            {((cargo.vehicleCapacityKg || 0) / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Clientes</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.customersCount} cli
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Descargas</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.dischargesCount} entregas
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Pedidos SAP</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.ordersCount} ped
                          </span>
                        </div>
                      </div>

                      {/* Status Operacionais dos Pedidos (Estoque, Crédito, PCP) */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-slate-600 dark:text-slate-400">Estoque:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cargo.readinessStatus === 'PLANEJAMENTO_FUTURO'
                              ? 'Saldo PCP'
                              : 'DP34 100%'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-slate-600 dark:text-slate-400">Crédito:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cargo.readinessStatus === 'PROGRAMACAO_IMPACTADA_REANALISE_NECESSARIA'
                              ? 'Em Análise'
                              : 'Liberado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                          <span className="text-slate-600 dark:text-slate-400">PCP:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cargo.isFutureMatch ? 'Programado' : 'Expedição'}
                          </span>
                        </div>
                      </div>

                      {/* Custos ANTT e Parâmetros Regulatórios */}
                      <div className="bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Veículo Indicado:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargo.vehicleType}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Distância + Pedágio:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cargo.distanceKm} km • R$ {cargo.tollsValue.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Piso Regulatório ANTT:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            R$ {cargo.anttFloorValue.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                            Frete Estimado Total:
                          </span>
                          <span className="font-black text-indigo-700 dark:text-indigo-400 text-sm">
                            R${' '}
                            {cargo.estimatedCost.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">
                              (R${' '}
                              {Number(cargo.costPerTon || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              /t)
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Alerta Regulatório ANTT se houver inconformidade */}
                      {cargo.occupancyAlert?.includes('abaixo do mínimo ANTT') && (
                        <div className="text-xs bg-rose-50 border border-rose-300 text-rose-800 p-2 rounded flex items-start gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{cargo.occupancyAlert}</span>
                        </div>
                      )}

                      {/* Explicabilidade Resumida */}
                      <div className="text-xs bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            Racional Lexicográfico
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold"
                            onClick={() => {
                              setSelectedWhyCargo(cargo)
                              setIsWhyModalOpen(true)
                            }}
                          >
                            Por que esta carga?
                            <HelpCircle className="h-3 w-3 ml-1 text-indigo-600" />
                          </Button>
                        </span>
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                          {cargo.whyProposed}
                        </p>
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
                      Pedidos ({cargo.ordersCount})
                    </Button>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      disabled={cargo.occupancyAlert?.includes('abaixo do mínimo ANTT')}
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
                    <span className="font-bold">
                      {((cargo.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
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
                    <span className="font-bold">
                      {((cargo.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
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
                      {((cargo.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t /{' '}
                      {((cargo.vehicleCapacityKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-amber-800 font-semibold">
                    <span>Espaço Livre:</span>
                    <span>
                      {(
                        ((cargo.vehicleCapacityKg || 0) - (cargo.totalWeightKg || 0)) /
                        1000
                      ).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t
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
                      Reconciliação Matemática da Carteira Única (SAP RFC)
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
                    {((selectedCargoDetail.vehicleCapacityKg || 0) / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    t)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso & Ocupação</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {((selectedCargoDetail.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    t ({selectedCargoDetail.occupancyPct} %)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Frete Estimado / Piso ANTT
                  </span>
                  <span className="font-bold">
                    R${' '}
                    {selectedCargoDetail.estimatedCost.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    (R${' '}
                    {Number(selectedCargoDetail.costPerTon || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    /t)
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
                            {((ord.weight_kg || 0) / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t
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

      {/* MODAL DE EXPLICABILIDADE LEXICOGRÁFICA: POR QUE ESTA CARGA? */}
      <Dialog open={isWhyModalOpen} onOpenChange={setIsWhyModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Por que esta carga foi proposta pelo Motor Lexicográfico?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Racional determinístico detalhado dos critérios de viabilidade e priorização
              hierárquica (P1 a P8).
            </DialogDescription>
          </DialogHeader>

          {selectedWhyCargo && (
            <div className="space-y-4 py-2 text-xs">
              {/* Racional principal */}
              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200 block">
                  {selectedWhyCargo.cargoNumber} — Rank #{selectedWhyCargo.priorityRanking}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedWhyCargo.whyProposed}
                </p>
              </div>

              {/* Parâmetros Operacionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-400 block text-[10px]">Itinerário</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedWhyCargo.itineraryCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Carga Total</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {(selectedWhyCargo.totalWeightKg / 1000).toFixed(1)} t (
                    {selectedWhyCargo.occupancyPct}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Clientes / Descargas</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedWhyCargo.customersCount} cli / {selectedWhyCargo.dischargesCount} desc
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Custo por Tonelada</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    R${' '}
                    {Number(selectedWhyCargo.costPerTon || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    /t
                  </span>
                </div>
              </div>

              {/* Racional ANTT e Regulatório */}
              <div className="border rounded-lg p-3 space-y-2 bg-white dark:bg-slate-900">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Conformidade Regulatória & Tabela Oficial ANTT:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded border">
                    <span className="text-slate-400 block text-[10px]">Piso ANTT Mínimo:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      R$ {selectedWhyCargo.anttFloorValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded border">
                    <span className="text-slate-400 block text-[10px]">Pedágio Estimado:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      R$ {selectedWhyCargo.tollsValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded border">
                    <span className="text-slate-400 block text-[10px]">Frete Logístico Total:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">
                      R$ {selectedWhyCargo.estimatedCost.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {selectedWhyCargo.occupancyAlert?.includes('abaixo do mínimo ANTT') ? (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{selectedWhyCargo.occupancyAlert}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    O frete sugerido cumpre 100% da resolução vigente da ANTT com margem de
                    segurança regulatória.
                  </p>
                )}
              </div>

              {/* Pedidos Selecionados nesta Carga */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Pedidos Selecionados ({selectedWhyCargo.orders.length}):
                </span>
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-white dark:bg-slate-900">
                  {selectedWhyCargo.orders.map((o) => (
                    <div key={o.id} className="p-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold">{o.order_number}</span> — {o.customer_name} (
                        {o.destination_city}/{o.uf})
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {((o.weight_kg || 0) / 1000).toFixed(1)} t
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Racional de Pedidos Não Selecionados na Carteira */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Por que outros pedidos deste itinerário não foram inseridos nesta proposta?
                </span>
                <div className="border rounded-md p-2.5 bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Critério P3 (Menor número de clientes):</strong> Adicionar outros
                      clientes fragmentaria a rota e aumentaria o número de paradas, desvio de km e
                      tempo de descarregamento em pátios terceiros.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Critério de Capacidade:</strong> O peso atual (
                      {((selectedWhyCargo.totalWeightKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t) já atinge {selectedWhyCargo.occupancyPct} % da capacidade física do veículo
                      (
                      {((selectedWhyCargo.vehicleCapacityKg || 0) / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsWhyModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
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
                    {((selectedCargoForApproval.totalWeightKg || 0) / 1000).toLocaleString(
                      'pt-BR',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}{' '}
                    t ({selectedCargoForApproval.occupancyPct} %)
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

      {/* MODAL DE DETALHAMENTO DE CARGAS AGUARDANDO COMPLEMENTO */}
      <Dialog open={isWaitingComplementModalOpen} onOpenChange={setIsWaitingComplementModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  Cargas Aguardando Complemento Comercial (
                  {globalResult?.complementCargos.length || 0})
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Cargas abaixo da meta de ocupação máxima ({maxOccupancyInput}). Registros com
                  oportunidade de fechamento comercial ativo.
                </DialogDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                Ação Comercial Pendente
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {globalResult?.complementCargos.map((cargo) => {
              const missingKg =
                cargo.missingWeightKg ||
                Math.max(0, cargo.vehicleCapacityKg * 0.95 - cargo.totalWeightKg)
              const candidates = evaluateComplementCandidates({
                cargo,
                allOrders: orders,
                stocks,
                pcpOrders,
              })

              return (
                <div
                  key={cargo.id}
                  className="p-4 rounded-lg border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-amber-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {cargo.cargoNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white font-mono">
                          {cargo.itineraryCode}
                        </Badge>
                        <Badge className="bg-amber-600 text-white text-[10px]">
                          {cargo.classificationStatus || 'Carga parcial — Complemento Comercial'}
                        </Badge>
                        {cargo.isFutureMatch && (
                          <Badge className="bg-blue-600 text-white text-[10px]">
                            Match Veículo Futuro
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                        Saída: {cargo.plannedExpeditionDate} • {cargo.itineraryDescription} (
                        {cargo.uf}) • {cargo.vehicleType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">
                        Programado: <strong>{(cargo.totalWeightKg / 1000).toFixed(1)}t</strong> (
                        {cargo.occupancyPct}%)
                      </span>
                      <span className="text-xs font-bold text-amber-700 block">
                        Complemento necessário: {(missingKg / 1000).toFixed(1)} t (Meta{' '}
                        {maxOccupancyInput})
                      </span>
                    </div>
                  </div>

                  {/* Resumo de Sugestões Comerciais */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded border text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        Recomendações da IA ({candidates.length} clientes elegíveis):
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Base: SAP RFC + MB52 + PCP + CRM 360°
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {candidates.slice(0, 2).map((cand) => (
                        <div
                          key={cand.customerCode}
                          className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 text-[11px] space-y-1"
                        >
                          <div className="flex justify-between items-start font-semibold">
                            <span>{cand.customerName}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                cand.creditStatus === 'Crédito OK'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-300'
                              }`}
                            >
                              {cand.creditStatus}
                            </Badge>
                          </div>
                          <span className="text-slate-600 dark:text-slate-400 block">
                            Material: <strong>{cand.materialDescription}</strong> (
                            {cand.stockStatus})
                          </span>
                          <span className="text-slate-500 block">
                            Sugerido: {(cand.suggestedQtyKg / 1000).toFixed(1)}t • Score:{' '}
                            {cand.rankingScore}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 8 AÇÕES OBRIGATÓRIAS DO USUÁRIO */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setSelectedCargoDetail(cargo)
                        setIsWaitingComplementModalOpen(false)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver carga
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        navigate('/tms/complemento-cargas')
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Ver clientes sugeridos
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        navigate('/tms/complemento-cargas')
                      }}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      Ver produtos sugeridos
                    </Button>

                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                      onClick={async () => {
                        toast({
                          title: 'Enviando ao Comercial...',
                          description: `Demanda de complemento de ${(missingKg / 1000).toFixed(1)}t criada e enviada para a equipe comercial/CRM 360°.`,
                        })
                        try {
                          await tmsService.sendLoadComplementToCommercial(
                            `OPP-${cargo.cargoNumber}`,
                            user?.email || 'operador@ciafal.com.br',
                            user?.name || 'Operador TMS',
                          )
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enviar ao Comercial
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 text-indigo-700 border-indigo-300"
                      onClick={() => navigate('/tms/complemento-cargas')}
                    >
                      Abrir Complemento de Cargas
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        runOptimization()
                        toast({
                          title: 'Reotimizando...',
                          description: 'Recálculo multicritério acionado para esta proposta.',
                        })
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reotimizar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        toast({
                          title: 'Oportunidade Descartada',
                          description: `A proposta ${cargo.cargoNumber} foi marcada para descarte manual.`,
                        })
                      }}
                    >
                      Descartar oportunidade
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setSelectedComplementTargetCargo(cargo)
                        setNewTargetOccupancyInput(`${cargo.maxOccupancyPct || 95}%`)
                        setIsTargetOccupancyModalOpen(true)
                      }}
                    >
                      Alterar ocupação alvo
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWaitingComplementModalOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ALTERAÇÃO DE OCUPAÇÃO ALVO */}
      <Dialog open={isTargetOccupancyModalOpen} onOpenChange={setIsTargetOccupancyModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Alterar Ocupação Alvo</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste a ocupação máxima para esta proposta específica (
              {selectedComplementTargetCargo?.cargoNumber}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 text-xs">
            <Label className="text-xs">Nova Ocupação Máxima Alvo</Label>
            <Input
              type="text"
              value={newTargetOccupancyInput}
              onChange={(e) => setNewTargetOccupancyInput(e.target.value)}
              placeholder="95%"
              className="h-9 font-semibold"
            />
            <span className="text-[10px] text-slate-500 block">
              Padrão brasileiro (ex: 85%, 90%, 95%). Apenas usuários com permissão.
            </span>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTargetOccupancyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 text-white"
              onClick={() => {
                setIsTargetOccupancyModalOpen(false)
                toast({
                  title: 'Ocupação Alvo Atualizada',
                  description: `Meta para ${selectedComplementTargetCargo?.cargoNumber} redefinida para ${newTargetOccupancyInput}.`,
                })
                runOptimization()
              }}
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
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
