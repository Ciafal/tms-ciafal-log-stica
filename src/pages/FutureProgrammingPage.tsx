import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Layers,
  Truck,
  Package,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  Filter,
  Download,
  Eye,
  PlusCircle,
  MapPin,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Boxes,
  Maximize2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { LoadingState } from '@/components/ui-custom/FeedbackStates'
import { tmsService } from '@/services/tmsService'
import { useAuth } from '@/contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import {
  SapItineraryEntity,
  SapSalesOrderEntity,
  QueueEntryEntity,
  LoadProposalEntity,
  VehicleEntity,
  DriverEntity,
  PreRegistrationEntity,
  ChicaoFreightOfferEntity,
  FreightOfferEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
} from '@/domain/rules'
import {
  getDefaultD1Date,
  isExactD1Date,
  calculateProjectedStockByMaterial,
  aggregateVehiclesD1,
  buildEligibleWalletList,
  calculateItineraryBalanceMatrix,
  calculateExecutiveCardsD1,
  findComplementCandidatesForVehicle,
  simulateComplementLoad,
  formatTons,
  getOccupancyBandLabel,
  getOccupancyBandBadgeClass,
  VehicleD1PlanItem,
  MaterialStockD1Summary,
  EligibleWalletItemD1,
  ComplementCandidateD1,
  ComplementSimulationResult,
  ItineraryBalanceMatrixD1,
  OccupancyBandClassification,
} from '@/domain/futureProgrammingD1Engine'

export const FutureProgrammingPage: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  // 1. DATA DE PROGRAMAÇÃO no topo: default HOJE+1
  const [programmingDate, setProgrammingDate] = useState<string>(getDefaultD1Date())

  // Estados dos dados reais carregados
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [proposals, setProposals] = useState<LoadProposalEntity[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [drivers, setDrivers] = useState<DriverEntity[]>([])
  const [preRegistrations, setPreRegistrations] = useState<PreRegistrationEntity[]>([])
  const [chicaoOffers, setChicaoOffers] = useState<ChicaoFreightOfferEntity[]>([])
  const [freightOffers, setFreightOffers] = useState<FreightOfferEntity[]>([])
  const [stockCurrent, setStockCurrent] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])

  // Controle de carregamento e atualização
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'veiculos' | 'estoque' | 'carteira' | 'matriz'>(
    'veiculos',
  )

  // Reserva provisória local para impedir dupla alocação entre veículos
  const [provisionalReservations, setProvisionalReservations] = useState<Map<string, number>>(
    new Map(),
  )

  // FILTROS
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterRegion, setFilterRegion] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterVehicleType, setFilterVehicleType] = useState('ALL')
  const [filterCarrier, setFilterCarrier] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterOccupancyBand, setFilterOccupancyBand] = useState('ALL')
  const [filterOnlyWithComplement, setFilterOnlyWithComplement] = useState(false)
  const [filterOnlyInsufficientStock, setFilterOnlyInsufficientStock] = useState(false)
  const [filterOnlyPcpDependent, setFilterOnlyPcpDependent] = useState(false)

  // Paginação do grid
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // ESTADO DO MODAL / POPUP DE COMPLEMENTO
  const [isComplementModalOpen, setIsComplementModalOpen] = useState(false)
  const [selectedVehicleForComplement, setSelectedVehicleForComplement] =
    useState<VehicleD1PlanItem | null>(null)
  const [complementCandidates, setComplementCandidates] = useState<ComplementCandidateD1[]>([])
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())
  const [simulationResult, setSimulationResult] = useState<ComplementSimulationResult | null>(null)
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false)
  const [isApplyingComplement, setIsApplyingComplement] = useState(false)

  // FETCH DATA
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const [
          itins,
          ords,
          qEntries,
          props,
          vehs,
          drivs,
          preregs,
          chOffers,
          fOffers,
          stocks,
          pcpList,
        ] = await Promise.all([
          tmsService.getSapItineraries(),
          tmsService.getSapSalesOrders(),
          tmsService.getQueueEntries(),
          tmsService.getLoadProposals(),
          tmsService.getVehicles(),
          tmsService.getDrivers(),
          tmsService.getPreRegistrations(),
          tmsService.getChicaoOffers(),
          tmsService.getFreightOffers(),
          tmsService.getSapStockCurrent(),
          tmsService.getPcpOrders(),
        ])

        setItineraries(itins || [])
        setOrders(ords || [])
        setQueueEntries(qEntries || [])
        setProposals(props || [])
        setVehicles(vehs || [])
        setDrivers(drivs || [])
        setPreRegistrations(preregs || [])
        setChicaoOffers(chOffers || [])
        setFreightOffers(fOffers || [])
        setStockCurrent(stocks || [])
        setPcpOrders(pcpList || [])

        const now = new Date()
        const formatted =
          now.toLocaleDateString('pt-BR') +
          ' ' +
          now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        setLastUpdateTimestamp(formatted)
      } catch (err: any) {
        toast({
          title: 'Perda temporária de conexão RFC / Backend',
          description:
            err?.message ||
            'Não foi possível atualizar todos os dados em tempo real. A tela mantém a visão dos dados válidos previamente carregados.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // REQUISITO 3: CÁLCULO DE ESTOQUE PROJETADO D+1
  const stockSummaries = useMemo(() => {
    const materials = Array.from(new Set(orders.map((o) => o.material).filter(Boolean) as string[]))
    return calculateProjectedStockByMaterial({
      materials,
      currentStockList: stockCurrent,
      pcpOrdersList: pcpOrders,
      salesOrdersList: orders,
      targetD1Date: programmingDate,
    })
  }, [orders, stockCurrent, pcpOrders, programmingDate])

  // REQUISITO 2 & 12: AGREGAÇÃO DE VEÍCULOS PREVISTOS D+1 COM MATCH AUTOMÁTICO
  const aggregatedVehicles = useMemo(() => {
    return aggregateVehiclesD1({
      targetD1Date: programmingDate,
      queueEntries,
      preRegistrations,
      chicaoOffers,
      freightOffers,
      proposals,
      registeredVehicles: vehicles,
      drivers,
      itineraries,
      salesOrders: orders,
      stockSummaries,
      temporaryReservations: provisionalReservations,
    })
  }, [
    programmingDate,
    queueEntries,
    preRegistrations,
    chicaoOffers,
    freightOffers,
    proposals,
    vehicles,
    drivers,
    itineraries,
    orders,
    stockSummaries,
    provisionalReservations,
  ])

  // REQUISITO 4 & 5: CARTEIRA ELEGÍVEL REAL SAP
  const eligibleWallet = useMemo(() => {
    return buildEligibleWalletList({
      salesOrders: orders,
      stockSummaries,
      targetD1Date: programmingDate,
      selectedItinerary: filterItinerary,
      temporaryReservations: provisionalReservations,
    })
  }, [orders, stockSummaries, programmingDate, filterItinerary, provisionalReservations])

  // REQUISITO 14: MATRIZ DE BALANÇO LOGÍSTICO POR ITINERÁRIO
  const itineraryMatrix = useMemo(() => {
    return calculateItineraryBalanceMatrix({
      itineraries,
      vehicles: aggregatedVehicles,
      eligibleWallet,
      stockSummaries,
      selectedItinerary: filterItinerary,
    })
  }, [itineraries, aggregatedVehicles, eligibleWallet, stockSummaries, filterItinerary])

  // REQUISITO 7: CARDS EXECUTIVOS D+1
  const executiveCards = useMemo(() => {
    return calculateExecutiveCardsD1({
      vehicles: aggregatedVehicles,
      stockSummaries,
    })
  }, [aggregatedVehicles, stockSummaries])

  // REQUISITO 6: FILTRAGEM DETERMINÍSTICA DO GRID DE VEÍCULOS
  const filteredVehicles = useMemo(() => {
    return aggregatedVehicles.filter((v) => {
      // 1. Filtros Rápidos
      if (selectedQuickFilter === 'veiculos_d1') {
        // Exatamente D+1
        if (!isExactD1Date(programmingDate)) return false
      } else if (selectedQuickFilter === 'com_espaco') {
        if (v.availableCapacityKg <= 100) return false
      } else if (selectedQuickFilter === 'ocupacao_menor_80') {
        if (v.occupancyPct >= 80) return false
      } else if (selectedQuickFilter === 'ocupacao_80_99') {
        if (v.occupancyPct < 80 || v.occupancyPct >= 99) return false
      } else if (selectedQuickFilter === 'carga_completa') {
        if (v.occupancyPct < 99) return false
      } else if (selectedQuickFilter === 'possivel_complemento') {
        if (v.possibleComplementTons <= 0) return false
      } else if (selectedQuickFilter === 'estoque_insuficiente') {
        if (v.operationalStatus !== 'Estoque insuficiente') return false
      } else if (selectedQuickFilter === 'aguardando_pcp') {
        if (!v.isPcpDependent) return false
      }

      // 2. Busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchText =
          v.plate.toLowerCase().includes(query) ||
          v.driverName.toLowerCase().includes(query) ||
          v.carrierName.toLowerCase().includes(query) ||
          v.itineraryCode.toLowerCase().includes(query) ||
          v.itineraryDesc.toLowerCase().includes(query) ||
          v.destination.toLowerCase().includes(query)
        if (!matchText) return false
      }

      // 3. Filtros Dropdowns
      if (filterItinerary !== 'ALL' && v.itineraryCode !== filterItinerary) return false
      if (filterRegion !== 'ALL' && v.region !== filterRegion) return false
      if (filterUf !== 'ALL' && v.uf !== filterUf) return false
      if (filterVehicleType !== 'ALL' && v.vehicleType !== filterVehicleType) return false
      if (filterCarrier !== 'ALL' && v.carrierName !== filterCarrier) return false
      if (filterStatus !== 'ALL' && v.operationalStatus !== filterStatus) return false
      if (filterOccupancyBand !== 'ALL' && v.occupancyBand !== filterOccupancyBand) return false

      // 4. Flags booleanas
      if (filterOnlyWithComplement && v.possibleComplementTons <= 0) return false
      if (filterOnlyInsufficientStock && v.operationalStatus !== 'Estoque insuficiente')
        return false
      if (filterOnlyPcpDependent && !v.isPcpDependent) return false

      return true
    })
  }, [
    aggregatedVehicles,
    selectedQuickFilter,
    programmingDate,
    searchQuery,
    filterItinerary,
    filterRegion,
    filterUf,
    filterVehicleType,
    filterCarrier,
    filterStatus,
    filterOccupancyBand,
    filterOnlyWithComplement,
    filterOnlyInsufficientStock,
    filterOnlyPcpDependent,
  ])

  // Paginação
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVehicles.slice(start, start + pageSize)
  }, [filteredVehicles, currentPage, pageSize])

  const totalPages = Math.ceil(filteredVehicles.length / pageSize) || 1

  // Listas únicas para os Selects de Filtros
  const distinctRegions = useMemo(
    () => Array.from(new Set(aggregatedVehicles.map((v) => v.region).filter(Boolean))),
    [aggregatedVehicles],
  )
  const distinctUfs = useMemo(
    () => Array.from(new Set(aggregatedVehicles.map((v) => v.uf).filter(Boolean))),
    [aggregatedVehicles],
  )
  const distinctVehicleTypes = useMemo(
    () => Array.from(new Set(aggregatedVehicles.map((v) => v.vehicleType).filter(Boolean))),
    [aggregatedVehicles],
  )
  const distinctCarriers = useMemo(
    () => Array.from(new Set(aggregatedVehicles.map((v) => v.carrierName).filter(Boolean))),
    [aggregatedVehicles],
  )

  // ========================================================
  // REQUISITOS 10 & 11: ABRIR POPUP DE COMPLEMENTO DE CARGA
  // ========================================================
  const handleOpenComplementModal = (vehicle: VehicleD1PlanItem) => {
    setSelectedVehicleForComplement(vehicle)
    const candidates = findComplementCandidatesForVehicle({
      vehicle,
      eligibleWallet,
      stockSummaries,
    })
    setComplementCandidates(candidates)

    // Pré-seleciona até completar a capacidade
    const preSelected = new Set<string>()
    let currentCapacity = vehicle.programmedWeightKg

    candidates.forEach((cand) => {
      if (currentCapacity + cand.suggestedQuantityKg <= vehicle.capacityKg * 1.02) {
        preSelected.add(cand.id)
        currentCapacity += cand.suggestedQuantityKg
      }
    })

    setSelectedCandidateIds(preSelected)
    const initialSelectedList = candidates.filter((c) => preSelected.has(c.id))
    const initialSim = simulateComplementLoad({
      vehicle,
      selectedCandidates: initialSelectedList,
    })
    setSimulationResult(initialSim)
    setIsComplementModalOpen(true)
  }

  // Toggle de seleção de candidato no popup
  const handleToggleCandidate = (candidateId: string) => {
    if (!selectedVehicleForComplement) return
    const nextSet = new Set(selectedCandidateIds)
    if (nextSet.has(candidateId)) {
      nextSet.delete(candidateId)
    } else {
      nextSet.add(candidateId)
    }
    setSelectedCandidateIds(nextSet)

    const selectedList = complementCandidates.filter((c) => nextSet.has(c.id))
    const sim = simulateComplementLoad({
      vehicle: selectedVehicleForComplement,
      selectedCandidates: selectedList,
    })
    setSimulationResult(sim)
  }

  // REQUISITO 11: BOTÃO "Simular rota"
  const handleSimulateRoute = () => {
    if (!selectedVehicleForComplement || !simulationResult) return
    setIsSimulatingRoute(true)
    setTimeout(() => {
      setIsSimulatingRoute(false)
      toast({
        title: 'Simulação de Rota Atualizada',
        description: `Itinerário ${simulationResult.itineraryCode}: Distância calculada ${simulationResult.routeEstimate.distanceKm} km, ~${Math.round(simulationResult.routeEstimate.durationMin / 60)}h, ${simulationResult.routeEstimate.stopsCount} paradas de descarga. Pedágio est. R$ ${simulationResult.routeEstimate.tollsEstimate},00.`,
      })
    }, 600)
  }

  // REQUISITO 11 & 19: BOTÃO "Aplicar complemento"
  const handleApplyComplement = async () => {
    if (!selectedVehicleForComplement || !simulationResult) return
    setIsApplyingComplement(true)

    try {
      const selectedItems = complementCandidates.filter((c) => selectedCandidateIds.has(c.id))
      const totalGainKg = selectedItems.reduce((acc, c) => acc + c.suggestedQuantityKg, 0)

      // Atualiza a reserva provisória do planejamento TMS para não usar a mesma quantidade em dois veículos (REQUISITO 5)
      const nextReservations = new Map(provisionalReservations)
      selectedItems.forEach((item) => {
        const cur = nextReservations.get(item.material) || 0
        nextReservations.set(item.material, cur + item.suggestedQuantityKg)
      })
      setProvisionalReservations(nextReservations)

      // REQUISITO 19: Rastreabilidade e Auditoria em audit_logs
      await tmsService.logAudit({
        user_name: user?.name || 'Operador Logístico CIAFAL',
        user_email: user?.email || 'operador.tms@ciafal.com.br',
        action_type: 'TMS_D1_COMPLEMENT_APPLIED',
        target_entity: 'future_programming_d1',
        target_id: selectedVehicleForComplement.id,
        details: {
          programmingDate,
          vehiclePlate: selectedVehicleForComplement.plate,
          itineraryCode: selectedVehicleForComplement.itineraryCode,
          carrierName: selectedVehicleForComplement.carrierName,
          beforeWeightTons: simulationResult.beforeWeightTons,
          beforeOccupancyPct: simulationResult.beforeOccupancyPct,
          afterWeightTons: simulationResult.afterWeightTons,
          afterOccupancyPct: simulationResult.afterOccupancyPct,
          weightGainTons: simulationResult.weightGainTons,
          candidatesApplied: selectedItems.map((c) => ({
            orderNumber: c.orderNumber,
            itemNumber: c.itemNumber,
            customerCode: c.customerCode,
            customerName: c.customerName,
            material: c.material,
            quantityKg: c.suggestedQuantityKg,
            isPcpDependent: c.isPcpDependent,
          })),
          routeEstimate: simulationResult.routeEstimate,
          dataSource: 'SAP + PCP Robotizado + TMS',
          appliedAt: new Date().toISOString(),
        },
      })

      toast({
        title: 'Complemento Aplicado ao Planejamento D+1',
        description: `Veículo ${selectedVehicleForComplement.plate}: Ocupação elevada de ${simulationResult.beforeOccupancyPct}% para ${simulationResult.afterOccupancyPct}% (+${simulationResult.weightGainTons} t). Reserva provisória garantida.`,
      })

      setIsComplementModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao aplicar complemento',
        description: err?.message || 'Falha ao registrar complemento no planejamento.',
        variant: 'destructive',
      })
    } finally {
      setIsApplyingComplement(false)
    }
  }

  // Exportação CSV do Grid
  const handleExportCsv = () => {
    const headers = [
      'Data',
      'Hora Prevista',
      'Placa',
      'Tipo Veículo',
      'Motorista',
      'Transportadora',
      'Itinerário',
      'Região',
      'Nº Descargas',
      'Capacidade (t)',
      'Peso Programado (t)',
      'Capacidade Disponível (t)',
      'Ocupação (%)',
      'Carteira Compatível (t)',
      'Estoque Atual (t)',
      'Remessas Geradas (t)',
      'PCP D+1 (t)',
      'Estoque Projetado D+1 (t)',
      'Complemento Possível (t)',
      'Status',
    ]

    const rows = filteredVehicles.map((v) => [
      v.date,
      v.scheduledTime,
      v.plate,
      `"${v.vehicleType}"`,
      `"${v.driverName}"`,
      `"${v.carrierName}"`,
      v.itineraryCode,
      `"${v.region}"`,
      v.dischargesCount,
      v.capacityTons,
      v.programmedWeightTons,
      v.availableCapacityTons,
      `${v.occupancyPct}%`,
      v.compatibleWalletTons,
      v.currentStockTons,
      v.remessasGeneratedTons,
      v.pcpD1Tons,
      v.projectedStockD1Tons,
      v.possibleComplementTons,
      `"${v.operationalStatus}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `programacao_logistica_d1_${programmingDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isD1 = isExactD1Date(programmingDate)

  return (
    <div className="space-y-4 pb-16 max-w-[1600px] mx-auto text-slate-800 dark:text-slate-100">
      {/* ========================================================
          1. HEADER E BARRA SUPERIOR DE DATA DE PROGRAMAÇÃO D+1
         ======================================================== */}
      <PageHeader
        title="Torre de Programação Logística D+1"
        subtitle="Planejamento operacional determinístico com estoque projetado livre, carteira SAP real sem remessas e gestão de capacidade."
        icon={Calendar}
        breadcrumbs={[{ label: 'TMS CIAFAL', href: '/tms' }, { label: 'Programação Futura D+1' }]}
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-[#005596] text-white text-[11px] font-bold px-2 py-0.5">
              TMS CIAFAL
            </Badge>
            {isD1 && (
              <Badge className="bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 animate-pulse">
                [D+1]
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
              Fonte: SAP + PCP Robotizado + TMS
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* DATA DE PROGRAMAÇÃO */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-[#005596]" />
              <label
                htmlFor="prog-date-input"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Data:
              </label>
              <Input
                id="prog-date-input"
                type="date"
                value={programmingDate}
                onChange={(e) => {
                  setProgrammingDate(e.target.value)
                  setProvisionalReservations(new Map())
                }}
                className="h-8 text-xs w-36 bg-white dark:bg-slate-900 font-mono"
              />
              {isD1 ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">[D+1]</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-[#005596] px-1.5 hover:bg-sky-50 font-semibold"
                  onClick={() => setProgrammingDate(getDefaultD1Date())}
                >
                  Voltar p/ D+1
                </Button>
              )}
            </div>

            {/* BOTÃO ATUALIZAR */}
            <Button
              onClick={() => fetchData(true)}
              variant="outline"
              size="sm"
              className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-200 hover:text-[#005596] border-slate-300"
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-[#005596]' : ''}`}
              />
              ATUALIZAR
            </Button>

            {/* EXPORTAR */}
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="text-xs h-9 text-slate-700 dark:text-slate-200"
              title="Exportar dados do grid para CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Exportar
            </Button>

            {/* ATALHO PARA CENTRAL DE COMPLEMENTO */}
            <Button
              asChild
              variant="default"
              size="sm"
              className="text-xs h-9 bg-[#005596] hover:bg-[#004275] text-white"
            >
              <Link to="/tms/complemento-cargas">
                Central Comercial <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* METADADOS DE SINCRONIZAÇÃO */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
          <span>Última atualização: {lastUpdateTimestamp || 'Carregando...'}</span>
          <span>•</span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            Fonte: SAP + PCP Robotizado + TMS
          </span>
        </span>
        <span className="hidden sm:inline text-slate-400">
          Cruzamento determinístico em tempo real — Remessas geradas e bloqueios respeitados
          rigorosamente.
        </span>
      </div>

      {/* ========================================================
          7. CARDS EXECUTIVOS D+1 (REQUISITO 7)
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Veículos Previstos D+1
          </div>
          <div className="text-xl font-extrabold text-[#005596] mt-1 font-mono">
            {executiveCards.vehiclesCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fila + Mesa + Programados</div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Capacidade Prevista (t)
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {formatTons(executiveCards.totalCapacityTons)} t
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total frota programada</div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Carga Programada (t)
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-1 font-mono">
            {formatTons(executiveCards.programmedWeightTons)} t
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Confirmado / alocado</div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Capacidade Disp. (t)
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
            {formatTons(executiveCards.availableCapacityTons)} t
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            Livre para complemento
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Ocupação Média %
          </div>
          <div className="text-xl font-extrabold text-indigo-700 mt-1 font-mono">
            {executiveCards.avgOccupancyPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Média ponderada frota</div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Compl. Possíveis
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">
            {executiveCards.possibleComplementsCount}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
            Com carteira e estoque
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Produção PCP D+1 (t)
          </div>
          <div className="text-xl font-extrabold text-sky-700 mt-1 font-mono">
            {formatTons(executiveCards.pcpProductionD1Tons)} t
          </div>
          <div className="text-[10px] text-sky-600 font-semibold mt-0.5">Previsto Robô PCP</div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
            Estoque Projetado
          </div>
          <div
            className={`text-xl font-extrabold mt-1 font-mono ${
              executiveCards.insufficientStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatTons(executiveCards.projectedStockTons)} t
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {executiveCards.insufficientStockCount > 0
              ? `${executiveCards.insufficientStockCount} mat. c/ gap`
              : 'Saldo livre D+1'}
          </div>
        </Card>
      </div>

      {/* ========================================================
          6. FILTROS COMPACTOS / RECOLHÍVEIS & FILTROS RÁPIDOS
         ======================================================== */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
        <CardContent className="p-3 space-y-3">
          {/* BARRA DE FILTROS RÁPIDOS */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
              <span className="text-xs font-bold text-slate-500 flex items-center mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-[#005596]" />
                Filtros rápidos:
              </span>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'veiculos_d1', label: 'Veículos D+1' },
                { id: 'com_espaco', label: 'Com espaço disponível' },
                { id: 'ocupacao_menor_80', label: 'Ocupação < 80%' },
                { id: 'ocupacao_80_99', label: '80–99%' },
                { id: 'carga_completa', label: 'Carga completa' },
                { id: 'possivel_complemento', label: 'Possível complemento' },
                { id: 'estoque_insuficiente', label: 'Estoque insuficiente' },
                { id: 'aguardando_pcp', label: 'Aguardando produção PCP' },
              ].map((btn) => (
                <Button
                  key={btn.id}
                  variant={selectedQuickFilter === btn.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedQuickFilter(btn.id)}
                  className={`text-xs h-7 px-2.5 rounded-full whitespace-nowrap ${
                    selectedQuickFilter === btn.id
                      ? 'bg-[#005596] hover:bg-[#004275] text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="text-xs h-7 text-[#005596] font-semibold"
            >
              {isFiltersExpanded ? (
                <>
                  Menos filtros <ChevronUp className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  Filtros detalhados <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* FILTROS RECOLHÍVEIS DETALHADOS */}
          {isFiltersExpanded && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Pesquisar
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <Input
                    placeholder="Placa, motorista, itinerário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Itinerário SAP
                </label>
                <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os Itinerários" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="ALL">Todos os Itinerários</SelectItem>
                    {itineraries.map((it) => (
                      <SelectItem key={it.sap_code} value={it.sap_code}>
                        {it.sap_code} — {it.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Região Logística
                </label>
                <Select value={filterRegion} onValueChange={setFilterRegion}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as Regiões" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todas as Regiões</SelectItem>
                    {distinctRegions.map((reg) => (
                      <SelectItem key={reg} value={reg}>
                        {reg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Tipo de Veículo
                </label>
                <Select value={filterVehicleType} onValueChange={setFilterVehicleType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os Tipos" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todos os Tipos</SelectItem>
                    {distinctVehicleTypes.map((vt) => (
                      <SelectItem key={vt} value={vt}>
                        {vt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Transportadora
                </label>
                <Select value={filterCarrier} onValueChange={setFilterCarrier}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todas as Transportadoras</SelectItem>
                    {distinctCarriers.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Faixa de Ocupação
                </label>
                <Select value={filterOccupancyBand} onValueChange={setFilterOccupancyBand}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as Faixas" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todas as Faixas</SelectItem>
                    <SelectItem value="baixa">Baixa (&lt; 50%)</SelectItem>
                    <SelectItem value="intermediaria">Intermediária (50% a 79%)</SelectItem>
                    <SelectItem value="proxima_da_capacidade">
                      Próxima da Capacidade (80% a 99%)
                    </SelectItem>
                    <SelectItem value="carga_completa">Carga Completa (100%)</SelectItem>
                    <SelectItem value="excedida">Capacidade Excedida (&gt; 100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          ABAS DE VISÃO OPERACIONAL
         ======================================================== */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-[600px]">
          <TabsTrigger value="veiculos" className="text-xs font-semibold">
            Veículos Previstos ({filteredVehicles.length})
          </TabsTrigger>
          <TabsTrigger value="estoque" className="text-xs font-semibold">
            Estoque Projetado ({stockSummaries.size})
          </TabsTrigger>
          <TabsTrigger value="carteira" className="text-xs font-semibold">
            Carteira Elegível ({eligibleWallet.length})
          </TabsTrigger>
          <TabsTrigger value="matriz" className="text-xs font-semibold">
            Matriz de Balanço ({itineraryMatrix.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================
            TAB 1: GRID PRINCIPAL POR VEÍCULO (REQUISITO 8 & 9)
           ======================================================== */}
        <TabsContent value="veiculos" className="space-y-3 pt-1">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[650px] relative">
              <table className="w-full text-left text-xs border-collapse">
                {/* CABEÇALHO FIXO (REQUISITO 8 & 20) */}
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                  <tr className="text-slate-700 dark:text-slate-300 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Data/Hora</th>
                    <th className="p-2.5">Veículo / Placa</th>
                    <th className="p-2.5">Motorista / Transportadora</th>
                    <th className="p-2.5">Itinerário / Região</th>
                    <th className="p-2.5 text-center">Descargas</th>
                    <th className="p-2.5 text-right">Capacidade (t)</th>
                    <th className="p-2.5 text-right">Programado (t)</th>
                    <th className="p-2.5 text-right">Disponível (t)</th>
                    <th className="p-2.5 w-44">Ocupação (%)</th>
                    <th className="p-2.5 text-right">Carteira (t)</th>
                    <th className="p-2.5 text-right">Estoque (t)</th>
                    <th className="p-2.5 text-right">Remessas (t)</th>
                    <th className="p-2.5 text-right">PCP D+1 (t)</th>
                    <th className="p-2.5 text-right font-bold text-[#005596]">Projetado (t)</th>
                    <th className="p-2.5 text-right font-bold text-amber-700">Compl. Possível</th>
                    <th className="p-2.5 text-center">Status Operacional</th>
                    <th className="p-2.5 text-center sticky right-0 bg-slate-100 dark:bg-slate-800 z-10">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="text-center py-12 text-slate-400 text-xs">
                        Nenhum veículo previsto encontrado para os filtros e data selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((v) => {
                      const hasSpace = v.availableCapacityKg > 100
                      const hasPossibleComplement = v.possibleComplementTons > 0

                      return (
                        <tr
                          key={v.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          {/* Data/Hora */}
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center">
                              <Clock className="w-3 h-3 mr-0.5 inline" /> {v.scheduledTime}
                            </div>
                          </td>

                          {/* Placa e Tipo */}
                          <td className="p-2.5 whitespace-nowrap">
                            <strong className="font-mono text-slate-900 dark:text-slate-100 text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                              {v.plate}
                            </strong>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">
                              {v.vehicleType}
                            </div>
                          </td>

                          {/* Motorista e Transportadora */}
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {v.driverName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {v.carrierName}
                            </div>
                          </td>

                          {/* Itinerário e Região */}
                          <td className="p-2.5">
                            <strong className="text-[#005596] font-mono text-xs">
                              {v.itineraryCode}
                            </strong>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {v.itineraryDesc}
                            </div>
                          </td>

                          {/* Nº Descargas */}
                          <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {v.dischargesCount}
                          </td>

                          {/* Capacidade (t) */}
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatTons(v.capacityTons)}
                          </td>

                          {/* Peso Programado (t) */}
                          <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                            {formatTons(v.programmedWeightTons)}
                          </td>

                          {/* Capacidade Disponível (t) */}
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            {formatTons(v.availableCapacityTons)}
                          </td>

                          {/* BARRA DE OCUPAÇÃO HORIZONTAL (REQUISITO 9) */}
                          <td className="p-2.5 w-44">
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {v.occupancyPct}%
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 h-4 border ${getOccupancyBandBadgeClass(
                                  v.occupancyBand,
                                )}`}
                              >
                                {v.occupancyBand === 'baixa'
                                  ? 'Baixa'
                                  : v.occupancyBand === 'intermediaria'
                                    ? 'Intermed.'
                                    : v.occupancyBand === 'proxima_da_capacidade'
                                      ? 'Próx. Cap.'
                                      : v.occupancyBand === 'carga_completa'
                                        ? 'Completa'
                                        : 'Excedida'}
                              </Badge>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                              <div
                                className={`h-full transition-all ${
                                  v.occupancyBand === 'baixa'
                                    ? 'bg-amber-500'
                                    : v.occupancyBand === 'intermediaria'
                                      ? 'bg-sky-500'
                                      : v.occupancyBand === 'proxima_da_capacidade'
                                        ? 'bg-[#005596]'
                                        : v.occupancyBand === 'carga_completa'
                                          ? 'bg-emerald-600'
                                          : 'bg-rose-600'
                                }`}
                                style={{ width: `${Math.min(100, v.occupancyPct)}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                              {getOccupancyBandLabel(v.occupancyBand)}
                            </div>
                          </td>

                          {/* Carteira Compatível (t) */}
                          <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            {formatTons(v.compatibleWalletTons)}
                          </td>

                          {/* Estoque Atual (t) */}
                          <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatTons(v.currentStockTons)}
                          </td>

                          {/* Remessas Geradas (t) */}
                          <td className="p-2.5 text-right font-mono text-slate-500">
                            {formatTons(v.remessasGeneratedTons)}
                          </td>

                          {/* PCP D+1 (t) */}
                          <td className="p-2.5 text-right font-mono text-sky-700">
                            {formatTons(v.pcpD1Tons)}
                          </td>

                          {/* Estoque Projetado D+1 (t) */}
                          <td
                            className={`p-2.5 text-right font-mono font-bold ${
                              v.projectedStockD1Tons < 0 ? 'text-rose-600' : 'text-[#005596]'
                            }`}
                          >
                            {formatTons(v.projectedStockD1Tons)}
                          </td>

                          {/* Complemento Possível (t) */}
                          <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                            {formatTons(v.possibleComplementTons)}
                          </td>

                          {/* Status Operacional (REQUISITO 15 & 16) */}
                          <td className="p-2.5 text-center">
                            <Badge
                              className={`text-[9px] font-bold px-2 py-0.5 whitespace-nowrap ${
                                v.operationalStatus === 'Carga completa'
                                  ? 'bg-emerald-600 text-white'
                                  : v.operationalStatus === 'Complemento disponível'
                                    ? 'bg-blue-600 text-white'
                                    : v.operationalStatus === 'Aguardando produção PCP'
                                      ? 'bg-amber-500 text-white'
                                      : v.operationalStatus === 'Estoque insuficiente'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-600 text-white'
                              }`}
                            >
                              {v.operationalStatus}
                            </Badge>
                            {v.isPcpDependent && (
                              <div
                                className="text-[9px] text-amber-600 font-bold mt-0.5 flex items-center justify-center truncate"
                                title="⚠ CARGA DEPENDENTE DE PRODUÇÃO PCP"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-500 inline" />
                                PCP Dep.
                              </div>
                            )}
                          </td>

                          {/* Ações (REQUISITO 10) */}
                          <td className="p-2.5 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                            {hasSpace ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenComplementModal(v)}
                                className={`text-[11px] h-7 px-2 font-bold ${
                                  hasPossibleComplement
                                    ? 'bg-[#005596] hover:bg-[#004275] text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                <PlusCircle className="w-3 h-3 mr-1" />
                                {hasPossibleComplement
                                  ? 'Complementar carga'
                                  : 'Ver complemento de carga'}
                              </Button>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-700 border-emerald-300"
                              >
                                100% Completo
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO DO GRID */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Exibindo <strong>{paginatedVehicles.length}</strong> de{' '}
                <strong>{filteredVehicles.length}</strong> veículos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Anterior
                </Button>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB 2: ESTOQUE PROJETADO D+1 (REQUISITO 3 & 16)
           ======================================================== */}
        <TabsContent value="estoque" className="space-y-3 pt-1">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#005596]" />
                Estoque Projetado D+1 por Material
              </CardTitle>
              <CardDescription className="text-xs">
                Fórmula oficial:{' '}
                <strong>ESTOQUE ATUAL SAP − REMESSAS COMPROMETIDAS + PCP D+1</strong>. Produção PCP
                só compõe se data anterior à necessidade logística.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 font-bold border-b border-slate-200">
                    <tr className="text-slate-700 dark:text-slate-300">
                      <th className="p-2.5">Código Material</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-right">Estoque Atual SAP (t)</th>
                      <th className="p-2.5 text-right text-slate-500">Remessas Geradas (t)</th>
                      <th className="p-2.5 text-right text-sky-700">Produção PCP D+1 (t)</th>
                      <th className="p-2.5 text-right font-bold text-[#005596]">
                        Estoque Projetado D+1 (t)
                      </th>
                      <th className="p-2.5 text-center">Diagnóstico / Alerta</th>
                      <th className="p-2.5">Previsão PCP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from(stockSummaries.values()).map((mat) => (
                      <tr
                        key={mat.materialCode}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {mat.materialCode}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">
                          {mat.materialDescription}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {formatTons(mat.currentStockTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-500">
                          {formatTons(mat.remessasGeneratedTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-sky-700 font-semibold">
                          {formatTons(mat.pcpD1Tons)}
                        </td>
                        <td
                          className={`p-2.5 text-right font-mono font-bold ${
                            mat.isInsufficient ? 'text-rose-600' : 'text-[#005596]'
                          }`}
                        >
                          {formatTons(mat.projectedStockTons)}
                        </td>
                        <td className="p-2.5 text-center">
                          {mat.isInsufficient ? (
                            <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                              ⚠ Estoque projetado insuficiente
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Saldo Disponível
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-[11px] text-sky-800 dark:text-sky-300 font-mono">
                          {mat.pcpScheduleNotice || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB 3: CARTEIRA ELEGÍVEL REAL SAP (REQUISITO 4 & 5)
           ======================================================== */}
        <TabsContent value="carteira" className="space-y-3 pt-1">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#005596]" />
                Carteira SAP Elegível para Programação D+1
              </CardTitle>
              <CardDescription className="text-xs">
                Apenas pedidos abertos sem remessa gerada (VL01N), sem atendimento prévio e
                liberados nas regras TMS.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 font-bold border-b border-slate-200">
                    <tr className="text-slate-700 dark:text-slate-300">
                      <th className="p-2.5">Pedido / Item</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Cidade/UF</th>
                      <th className="p-2.5">Itinerário</th>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5 text-right">Saldo Aberto (t)</th>
                      <th className="p-2.5 text-right font-bold text-[#005596]">
                        Qtde Elegível (t)
                      </th>
                      <th className="p-2.5 text-center">Crédito</th>
                      <th className="p-2.5 text-center">Remessa</th>
                      <th className="p-2.5 text-center">Elegibilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {eligibleWallet.slice(0, 100).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {ord.orderNumber} / {ord.itemNumber}
                        </td>
                        <td className="p-2.5 truncate max-w-[180px]">
                          <strong>{ord.customerName}</strong>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cód: {ord.customerCode}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {ord.destinationCity} / {ord.uf}
                        </td>
                        <td className="p-2.5 font-mono text-[#005596] font-bold">
                          {ord.itineraryCode}
                        </td>
                        <td className="p-2.5 truncate max-w-[200px]">
                          <div className="font-mono text-[11px]">{ord.material}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {ord.materialDescription}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {formatTons(ord.weightTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#005596]">
                          {formatTons(ord.quantityEligibleTons)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold ${
                              ord.creditStatus === 'Liberado'
                                ? 'bg-emerald-600 text-white'
                                : ord.creditStatus === 'Bloqueado'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                            }`}
                          >
                            {ord.creditStatus}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          {ord.hasRemessa ? (
                            <Badge className="bg-purple-600 text-white text-[9px]">
                              Com Remessa
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-slate-600 border-slate-300"
                            >
                              Sem Remessa
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {ord.isOpenAndEligible ? (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                              ✓ Elegível D+1
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-400 text-white text-[9px]">
                              Incompatível
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB 4: MATRIZ DE BALANÇO LOGÍSTICO (REQUISITO 14)
           ======================================================== */}
        <TabsContent value="matriz" className="space-y-3 pt-1">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#005596]" />
                Matriz de Balanço Logístico por Itinerário D+1
              </CardTitle>
              <CardDescription className="text-xs">
                Responde imediatamente:{' '}
                <em>"Tenho veículo sobrando ou carga sobrando neste itinerário amanhã?"</em>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 font-bold border-b border-slate-200">
                    <tr className="text-slate-700 dark:text-slate-300">
                      <th className="p-2.5">Itinerário SAP</th>
                      <th className="p-2.5 text-center">Veículos D+1</th>
                      <th className="p-2.5 text-right">Capacidade Total (t)</th>
                      <th className="p-2.5 text-right text-blue-700">Carga Programada (t)</th>
                      <th className="p-2.5 text-right text-emerald-700">Espaço Livre (t)</th>
                      <th className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        Carteira Elegível (t)
                      </th>
                      <th className="p-2.5 text-right font-bold text-[#005596]">
                        Estoque Projetado (t)
                      </th>
                      <th className="p-2.5 text-right text-sky-700">PCP D+1 (t)</th>
                      <th className="p-2.5 text-right font-bold text-amber-700">
                        Potencial Complemento (t)
                      </th>
                      <th className="p-2.5 text-center">Diagnóstico Operacional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itineraryMatrix.map((row) => (
                      <tr
                        key={row.itineraryCode}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2.5">
                          <strong className="text-[#005596] font-mono text-xs">
                            {row.itineraryCode}
                          </strong>
                          <div className="text-[10px] text-slate-400">{row.itineraryDesc}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-sky-800 dark:text-sky-300">
                          {row.vehiclesD1Count}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {formatTons(row.totalCapacityTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-700 font-semibold">
                          {formatTons(row.programmedLoadTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-bold">
                          {formatTons(row.freeSpaceTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatTons(row.eligibleWalletTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#005596]">
                          {formatTons(row.projectedStockTons)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-sky-700">
                          {formatTons(row.pcpD1Tons)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                          {formatTons(row.potentialComplementTons)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold px-2 py-0.5 uppercase ${
                              row.balanceDiagnosis === 'EQUILIBRADO'
                                ? 'bg-emerald-600 text-white'
                                : row.balanceDiagnosis === 'FALTA DE TRANSPORTE'
                                  ? 'bg-rose-600 text-white'
                                  : row.balanceDiagnosis === 'COMPLEMENTO POSSÍVEL'
                                    ? 'bg-purple-600 text-white'
                                    : row.balanceDiagnosis === 'MATERIAL INSUFICIENTE'
                                      ? 'bg-amber-500 text-white'
                                      : row.balanceDiagnosis === 'SEM VEÍCULO'
                                        ? 'bg-red-700 text-white'
                                        : 'bg-slate-600 text-white'
                            }`}
                          >
                            {row.balanceDiagnosis}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================
          11. POPUP DE COMPLEMENTO DE CARGA (REQUISITO 11)
         ======================================================== */}
      <Dialog open={isComplementModalOpen} onOpenChange={setIsComplementModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 text-slate-800 dark:text-slate-100">
          <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            {/* CABEÇALHO VERBATIM: COMPLEMENTO DE CARGA / Veículo / Itinerário / Capacidade livre */}
            <DialogTitle className="text-base font-extrabold flex items-center justify-between">
              <span className="text-[#005596]">
                COMPLEMENTO DE CARGA / {selectedVehicleForComplement?.plate} /{' '}
                {selectedVehicleForComplement?.itineraryCode} / Capacidade livre:{' '}
                {formatTons(selectedVehicleForComplement?.availableCapacityTons || 0)} t
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione os pedidos elegíveis da carteira SAP com estoque projetado para completar a
              capacidade do veículo.
            </DialogDescription>
          </DialogHeader>

          {/* PAINEL ANTES / DEPOIS / GANHO (REQUISITO 11) */}
          {simulationResult && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <div className="p-2 border rounded bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">ANTES</span>
                <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                  {formatTons(simulationResult.beforeWeightTons)} /{' '}
                  {formatTons(simulationResult.capacityTons)} t
                </div>
                <div className="text-xs font-bold text-blue-700 font-mono">
                  {simulationResult.beforeOccupancyPct}%
                </div>
              </div>

              <div className="p-2 border rounded bg-white dark:bg-slate-900 shadow-xs border-[#005596]">
                <span className="text-[10px] text-[#005596] uppercase font-bold block">DEPOIS</span>
                <div className="text-sm font-extrabold text-[#005596] font-mono mt-0.5">
                  {formatTons(simulationResult.afterWeightTons)} /{' '}
                  {formatTons(simulationResult.capacityTons)} t
                </div>
                <div className="text-xs font-bold text-emerald-700 font-mono">
                  {simulationResult.afterOccupancyPct}%
                </div>
              </div>

              <div className="p-2 border rounded bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 shadow-xs">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                  GANHO OPERACIONAL
                </span>
                <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                  +{formatTons(simulationResult.weightGainTons)} t
                </div>
                <div className="text-xs font-bold text-emerald-800 font-mono">
                  +{simulationResult.occupancyGainPct}%
                </div>
              </div>
            </div>
          )}

          {/* TABELA DE PEDIDOS CANDIDATOS (REQUISITO 11) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Pedidos Candidatos Compatíveis ({complementCandidates.length})</span>
              <span className="text-slate-500 font-normal text-[11px]">
                Marque para incluir ou desmarcar da composição de complemento.
              </span>
            </div>

            <div className="overflow-x-auto max-h-64 border rounded-lg border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold border-b border-slate-200">
                  <tr className="text-slate-700 dark:text-slate-300 text-[11px]">
                    <th className="p-2 text-center w-8">Sel.</th>
                    <th className="p-2">Prioridade</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Cidade</th>
                    <th className="p-2">Pedido</th>
                    <th className="p-2">Material</th>
                    <th className="p-2 text-right">Saldo Carteira</th>
                    <th className="p-2 text-right">Estoque D+1</th>
                    <th className="p-2 text-right font-bold text-[#005596]">Qtde Sugerida</th>
                    <th className="p-2 text-center">Ocupação Result.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {complementCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-slate-400 text-xs">
                        Nenhum pedido compatível com estoque disponível encontrado para este
                        veículo.
                      </td>
                    </tr>
                  ) : (
                    complementCandidates.map((cand) => {
                      const isSelected = selectedCandidateIds.has(cand.id)

                      return (
                        <tr
                          key={cand.id}
                          onClick={() => handleToggleCandidate(cand.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 dark:bg-blue-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCandidate(cand.id)}
                              className="rounded border-slate-300 text-[#005596] focus:ring-[#005596]"
                            />
                          </td>
                          <td className="p-2">
                            <Badge
                              className={`text-[9px] ${
                                cand.priorityLevel === 'Alta'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {cand.priorityLevel}
                            </Badge>
                          </td>
                          <td className="p-2 truncate max-w-[140px] font-semibold">
                            {cand.customerName}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {cand.destinationCity}/{cand.uf}
                          </td>
                          <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {cand.orderNumber}
                          </td>
                          <td className="p-2 truncate max-w-[150px] font-mono text-[11px]">
                            {cand.material}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {formatTons(cand.walletBalanceTons)} t
                          </td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-semibold">
                            {formatTons(cand.projectedStockD1Tons)} t
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-[#005596]">
                            +{formatTons(cand.suggestedQuantityTons)} t
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-blue-700">
                            {cand.resultingOccupancyPct}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEGURANÇA E EXPLICAÇÃO DO MATCH */}
          {selectedVehicleForComplement && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border text-xs space-y-1.5">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Critérios Determinísticos CIAFAL Atendidos:</span>
              </div>
              <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400 pl-5 list-disc">
                {selectedVehicleForComplement.matchReasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 italic mt-1 border-t pt-1">
                Segurança do Planejamento: Esta ação reserva provisoriamente o estoque no TMS. A
                geração de Remessa SAP só ocorre após a aprovação formal do fluxo logístico.
              </p>
            </div>
          )}

          {/* BOTÕES VERBATIM: Cancelar / Simular rota / Aplicar complemento */}
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComplementModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateRoute}
                disabled={isSimulatingRoute || selectedCandidateIds.size === 0}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 border-[#005596]"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#005596]" />
                Simular rota
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleApplyComplement}
                disabled={isApplyingComplement || selectedCandidateIds.size === 0}
                className="text-xs bg-[#005596] hover:bg-[#004275] text-white font-bold px-4"
              >
                {isApplyingComplement ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                Aplicar complemento
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FutureProgrammingPage
