import React, { useState, useEffect, useMemo } from 'react'
import {
  CalendarCheck,
  Filter,
  Truck,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Info,
  Building,
  Radio,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Link2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  QueueEntryEntity,
  VehicleEntity,
  DriverEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  FreightRuleParameterEntity,
  avaliar_montagem_carga,
  identificar_oportunidade_complemento,
} from '@/domain/rules'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { LoadingState, EmptyState } from '@/components/ui-custom/FeedbackStates'
import { EncontrosDrawer } from '@/components/load-planner/EncontrosDrawer'
import { runVehicleLoadMatchingEngine } from '@/domain/vehicleLoadMatchingEngine'
import { useRealtime } from '@/hooks/use-realtime'
import { CustomerLogisticInfoEntity } from '@/domain/customerLogisticInfoEngine'
import { customerLogisticInfoService } from '@/services/customerLogisticInfoService'
import { CustomerLogisticDetailModal } from '@/components/CustomerLogisticDetailModal'

export const LoadPlannerPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [stockCurrent, setStockCurrent] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [drivers, setDrivers] = useState<DriverEntity[]>([])
  const [freightRuleParams, setFreightRuleParams] = useState<FreightRuleParameterEntity[]>([])
  const [isEncontrosOpen, setIsEncontrosOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [walletMeta, setWalletMeta] = useState<{
    source: 'SAP_RFC'
    sourceName: string
    lastSyncDate: string
    totalItems: number
    totalOrders: number
  }>({
    source: 'SAP_RFC',
    sourceName: 'SAP ECC 6.0 (RFC ZSD35_CARTEIRA_GET)',
    lastSyncDate: new Date().toISOString(),
    totalItems: 396,
    totalOrders: 221,
  })

  // Filters — ALL por padrão para exibir todos os 396 itens/221 pedidos imediatamente
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [filterItinerary, setFilterItinerary] = useState<string>('ALL')
  const [filterClient, setFilterClient] = useState<string>('ALL')
  const [filterUf, setFilterUf] = useState<string>('ALL')
  const [filterLine, setFilterLine] = useState<string>('ALL')
  const [filterFamily, setFilterFamily] = useState<string>('ALL')
  const [filterMaterial, setFilterMaterial] = useState<string>('ALL')
  const [filterProdStatus, setFilterProdStatus] = useState<string>('ALL')
  const [filterCreditStatus, setFilterCreditStatus] = useState<string>('ALL')
  const [filterVehicleType, setFilterVehicleType] = useState<string>('ALL')
  const [filterDischargeType, setFilterDischargeType] = useState<string>('ALL')

  // Load Assembly Center Staging
  const [cargoName, setCargoName] = useState<string>('CARGA-PLANEJADA-01')
  const [selectedOrders, setSelectedOrders] = useState<SapSalesOrderEntity[]>([])
  const [selectedQueueVehicle, setSelectedQueueVehicle] = useState<QueueEntryEntity | null>(null)

  // Informações Logísticas de Clientes (SAP RFC HUB)
  const [customerProfiles, setCustomerProfiles] = useState<CustomerLogisticInfoEntity[]>([])
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerLogisticInfoEntity | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Sprint 6: Agente IA Planejador Nativo Skip Cloud
  const [aiExplanation, setAiExplanation] = useState<string>('')
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false)
  const [aiScenarios, setAiScenarios] = useState<any[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])

  const handleRunAiPlanner = async () => {
    setIsAiLoading(true)
    try {
      const res = await TmsService.callPlannerAi({
        itinerary_code: filterItinerary,
        message: `Analise os pedidos do itinerário ${filterItinerary} considerando estoque físico DP34, crédito financeiro e veículos PORTA disponíveis.`,
      })
      setAiExplanation(res.explanation)
      toast({
        title: 'Análise do Agente IA Concluída',
        description: res.fallback_used
          ? 'Planejamento determinístico ativo (Fallback).'
          : 'Recomendações do AGENTE IA — PLANEJADOR DE CARGAS geradas.',
      })
    } catch (err: any) {
      setAiExplanation('IA indisponível — planejamento determinístico ativo.')
    } finally {
      setIsAiLoading(false)
    }
  }
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [
        ordData,
        itinData,
        qData,
        metaData,
        stockData,
        pcpData,
        vehData,
        drvData,
        ruleData,
        custProfilesData,
      ] = await Promise.all([
        TmsService.getUnifiedSalesWallet(),
        TmsService.getSapItineraries(),
        TmsService.getOperationalQueue(),
        TmsService.getLatestWalletMetadata(),
        TmsService.getStockCurrent(),
        TmsService.getPcpProductionOrders(),
        TmsService.getVehicles(),
        TmsService.getDrivers(),
        TmsService.getFreightRuleParameters(),
        customerLogisticInfoService.getAllCustomers().catch(() => []),
      ])
      setCustomerProfiles(custProfilesData || [])
      setOrders(ordData)
      setItineraries(itinData)
      setQueueEntries(qData)
      setWalletMeta(metaData)
      setStockCurrent(stockData)
      setPcpOrders(pcpData)
      setVehicles(vehData)
      setDrivers(drvData)
      setFreightRuleParams(ruleData)

      toast({
        title: 'Carteira SAP Sincronizada',
        description: `${ordData.length} itens (${metaData.totalOrders} pedidos) disponíveis na carteira única.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao carregar carteira de pedidos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Inscrições Realtime para manter o contador de Encontros sincronizado ao vivo
  useRealtime('queue_entries', () => {
    TmsService.getOperationalQueue()
      .then(setQueueEntries)
      .catch(() => {})
  })

  useRealtime('sap_sales_orders', () => {
    TmsService.getUnifiedSalesWallet()
      .then(setOrders)
      .catch(() => {})
  })

  useRealtime('sap_stock_current', () => {
    TmsService.getStockCurrent()
      .then(setStockCurrent)
      .catch(() => {})
  })

  useRealtime('pcp_production_orders', () => {
    TmsService.getPcpProductionOrders()
      .then(setPcpOrders)
      .catch(() => {})
  })

  // Cálculo reativo da contagem de Encontros Viáveis em tempo real
  const viableMatchesCount = useMemo(() => {
    const res = runVehicleLoadMatchingEngine({
      queueEntries,
      salesOrders: orders,
      stockCurrent,
      pcpOrders,
      vehicles,
      drivers,
      freightRuleParameters: freightRuleParams,
    })
    return res.viableMatchesCount
  }, [queueEntries, orders, stockCurrent, pcpOrders, vehicles, drivers, freightRuleParams])

  // Filtered Orders (Esquerda)
  const availableOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedOrders.some((so) => so.id === o.id)) return false
      if (filterItinerary && filterItinerary !== 'ALL' && o.itinerary_code !== filterItinerary)
        return false
      if (filterClient !== 'ALL' && o.customer_name !== filterClient) return false
      if (filterUf !== 'ALL' && o.uf !== filterUf) return false
      if (filterLine !== 'ALL' && o.line !== filterLine) return false
      if (filterFamily !== 'ALL' && o.family !== filterFamily) return false
      if (filterMaterial !== 'ALL' && o.material !== filterMaterial) return false
      if (filterProdStatus !== 'ALL' && o.production_status !== filterProdStatus) return false
      if (filterCreditStatus !== 'ALL' && o.credit_status !== filterCreditStatus) return false
      if (filterDischargeType !== 'ALL' && o.discharge_type !== filterDischargeType) return false
      return true
    })
  }, [
    orders,
    selectedOrders,
    filterItinerary,
    filterClient,
    filterUf,
    filterLine,
    filterFamily,
    filterMaterial,
    filterProdStatus,
    filterCreditStatus,
    filterDischargeType,
  ])

  // Filtered Queue for the selected Itinerary and Date (Direita)
  const availableVehiclesForItinerary = useMemo(() => {
    return queueEntries.filter((q) => {
      if (['removido', 'bloqueado', 'atribuido'].includes(q.status)) return false
      if (q.preferred_itinerary && filterItinerary && q.preferred_itinerary !== filterItinerary) {
        // Driver prefers another itinerary, but might still be considered
      }
      return true
    })
  }, [queueEntries, filterItinerary])

  const portaList = availableVehiclesForItinerary.filter((v) => v.type === 'PORTA')
  const foraList = availableVehiclesForItinerary.filter((v) => v.type === 'FORA')
  const progList = availableVehiclesForItinerary.filter((v) => v.type === 'PROGRAMADO')

  // Rule Engine Evaluation (Motor Determinístico)
  const assemblyEvaluation = useMemo(() => {
    const candidateVehicle: VehicleEntity | null = selectedQueueVehicle
      ? {
          id: selectedQueueVehicle.id,
          plate: selectedQueueVehicle.vehicle_plate_cached || 'SEM PLACA',
          type: selectedQueueVehicle.vehicle_type_cached || 'Carreta LS',
          capacity_kg: selectedQueueVehicle.vehicle_capacity_kg_cached || 0,
        }
      : null

    return avaliar_montagem_carga({
      orders: selectedOrders,
      vehicle: candidateVehicle,
      targetItineraryCode: filterItinerary,
      customerLogisticProfiles: customerProfiles,
    })
  }, [selectedOrders, selectedQueueVehicle, filterItinerary, customerProfiles])

  // Helper para indicador de informações logísticas de clientes
  const getCustomerIndicator = (customerCode?: string, customerName?: string) => {
    const prof = customerProfiles.find(
      (p) =>
        (p.customer_code === customerCode ||
          p.ship_to_code === customerCode ||
          p.customer_name.toLowerCase() === (customerName || '').toLowerCase()) &&
        p.is_active,
    )
    if (!prof) {
      return {
        label: 'Sem restrições',
        color: 'border-slate-300 text-slate-500 bg-slate-50',
        profile: null,
      }
    }
    if (prof.highest_restriction_level === 'CRITICA') {
      return {
        label: 'Restrição crítica',
        color: 'border-red-400 text-red-700 bg-red-50 font-bold',
        profile: prof,
      }
    }
    if (
      prof.highest_restriction_level === 'RESTRITIVA' ||
      prof.highest_restriction_level === 'ALERTA'
    ) {
      return {
        label: 'Atenção logística',
        color: 'border-amber-400 text-amber-800 bg-amber-50 font-medium',
        profile: prof,
      }
    }
    if (prof.scheduling_restrictions_json?.requiresScheduling) {
      return {
        label: 'Agendamento obrigatório',
        color: 'border-blue-400 text-blue-700 bg-blue-50 font-medium',
        profile: prof,
      }
    }
    return {
      label: 'Informações disponíveis',
      color: 'border-sky-300 text-sky-700 bg-sky-50',
      profile: prof,
    }
  }

  // Complement Opportunity check
  const complementOpportunity = useMemo(() => {
    if (!selectedQueueVehicle?.vehicle_capacity_kg_cached || selectedOrders.length === 0)
      return null
    return identificar_oportunidade_complemento({
      cargoCode: cargoName,
      itineraryCode: filterItinerary,
      currentWeightKg: assemblyEvaluation.calculatedWeightKg,
      vehicleCapacityKg: selectedQueueVehicle.vehicle_capacity_kg_cached,
      candidateOrders: orders.filter((o) => !selectedOrders.some((so) => so.id === o.id)),
    })
  }, [selectedQueueVehicle, selectedOrders, cargoName, filterItinerary, assemblyEvaluation, orders])

  const handleAddOrder = (order: SapSalesOrderEntity) => {
    setSelectedOrders((prev) => [...prev, order])
  }

  const handleRemoveOrder = (orderId: string) => {
    setSelectedOrders((prev) => prev.filter((o) => o.id !== orderId))
  }

  const handleGenerateComplementOpportunity = async () => {
    if (!complementOpportunity) return
    try {
      const opp = await TmsService.createComplementOpportunity(complementOpportunity)
      if (opp) {
        toast({
          title: 'Oportunidade de Complemento Gerada',
          description: `Identificado saldo de ${(complementOpportunity.balance_kg / 1000).toFixed(1)}t. Enviado para análise comercial / CRM.`,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao registrar oportunidade.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planejador de Cargas"
        subtitle={`Carteira SAP atualizada em ${
          walletMeta.lastSyncDate
            ? new Date(walletMeta.lastSyncDate).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'
        } · Integrando estoque DP34, limites de crédito, PCP, fila e motor determinístico.`}
        icon={Layers}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Planejamento Logístico', href: '/tms/planejador-cargas' },
          { label: 'Planejador de Cargas' },
        ]}
        badge={
          <div className="flex items-center gap-1.5">
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              REPOSITÓRIO ÚNICO
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-300"
            >
              Carteira SAP RFC Online
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setIsEncontrosOpen(true)}
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 font-bold shadow-xs flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ENCONTROS VEÍCULO × CARGA</span>
              <span className="sm:hidden">ENCONTROS</span>
              <Badge className="bg-white/20 hover:bg-white/30 text-white font-mono text-[10px] px-1.5 py-0 border-none font-extrabold">
                ENCONTROS {viableMatchesCount}
              </Badge>
            </Button>

            <Button
              onClick={handleRunAiPlanner}
              disabled={isAiLoading}
              size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-8 font-bold"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">AGENTE IA — PLANEJADOR</span>
              <span className="md:hidden">AGENTE IA</span>
            </Button>

            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar agora</span>
            </Button>
          </div>
        }
      />

      {/* Indicador Visual Detalhado da Carteira SAP RFC */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-xs">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Fonte Canônica:
          </span>
          <span className="font-bold text-slate-800 truncate text-[11px]">SAP ECC 6.0 (RFC)</span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Posição Válida:
          </span>
          <span className="font-mono text-slate-800 text-[11px]">
            {walletMeta.lastSyncDate
              ? new Date(walletMeta.lastSyncDate).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Status Conexão:
          </span>
          <span className="font-bold text-blue-700 truncate text-[11px]">
            AGUARDANDO_CONEXAO_RFC
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Carteira:
          </span>
          <span className="font-bold text-emerald-700 text-[11px]">
            {orders.length} itens / {new Set(orders.map((o) => o.order_number)).size} pedidos
          </span>
        </div>
      </div>

      {/* Box do Agente IA Planejador de Cargas */}
      {aiExplanation && (
        <Card className="bg-purple-50/60 border border-purple-200 shadow-sm">
          <CardContent className="p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-900 uppercase">
                  Parecer do Agente IA — Planejador de Cargas
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] border-purple-300 text-purple-700 bg-white"
                >
                  Decisão Humana Obrigatória
                </Badge>
              </div>
              <p className="text-purple-800 text-[11px] leading-relaxed">{aiExplanation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar (11 Critérios de Filtro) */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            {/* Itinerário */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Itinerário SAP:
              </label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Itinerários ({orders.length} itens)</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} — {it.description}
                    </SelectItem>
                  ))}
                </SelectContent>{' '}
              </Select>
            </div>

            {/* Data Planejada */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Data de Carregamento:
              </label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Status Produção */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Status PCP:</label>
              <Select value={filterProdStatus} onValueChange={setFilterProdStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="Pronto">Pronto</SelectItem>
                  <SelectItem value="Em Produção">Em Produção</SelectItem>
                  <SelectItem value="Programado">Programado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Crédito */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Crédito Financeiro:
              </label>
              <Select value={filterCreditStatus} onValueChange={setFilterCreditStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Créditos</SelectItem>
                  <SelectItem value="Liberado">Liberado</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Descarga */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Tipo Descarga:
              </label>
              <Select value={filterDischargeType} onValueChange={setFilterDischargeType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas as Descargas</SelectItem>
                  <SelectItem value="Ponte Rolante">Ponte Rolante</SelectItem>
                  <SelectItem value="Munck">Munck</SelectItem>
                  <SelectItem value="Empilhadeira">Empilhadeira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Veículo Exigido */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Veículo Exigido:
              </label>
              <Select value={filterVehicleType} onValueChange={setFilterVehicleType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Veículos</SelectItem>
                  <SelectItem value="Carreta Grade Baixa">Carreta Grade Baixa</SelectItem>
                  <SelectItem value="Carreta LS">Carreta LS</SelectItem>
                  <SelectItem value="Bitrem">Bitrem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 COLUMNS OPERATIONAL WORKSPACE (ESQUERDA / CENTRO / DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA: PEDIDOS DISPONÍVEIS (SAP RFC) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase flex items-center space-x-1.5 text-slate-800">
                  <Package className="w-4 h-4 text-[#005596]" />
                  <span>Pedidos Disponíveis ({availableOrders.length})</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-white font-mono">
                  {filterItinerary}
                </Badge>
              </div>
              <CardDescription className="text-[11px]">
                Carteira única de vendas pronta para montagem de carga.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
              {isLoading ? (
                <LoadingState message="Carregando pedidos da carteira SAP..." rows={3} />
              ) : availableOrders.length === 0 ? (
                <EmptyState
                  title="Nenhum pedido compatível"
                  description="Não há pedidos na carteira SAP para os filtros atuais."
                  className="py-6"
                />
              ) : (
                availableOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-[#005596]/60 transition-all space-y-1.5 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 font-mono text-xs">
                            {order.order_number}
                          </strong>
                          <Badge
                            variant="outline"
                            className="text-[8px] px-1 py-0 bg-sky-50 text-sky-700 border-sky-200 font-mono font-semibold"
                          >
                            SAP RFC
                          </Badge>
                        </div>
                        <div className="text-slate-700 font-semibold">{order.customer_name}</div>
                        <div className="text-[10px] text-slate-500">
                          {order.destination_city} / {order.uf}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddOrder(order)}
                        className="h-7 text-xs bg-[#005596] hover:bg-sky-700 text-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Montar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                      <div>
                        Peso:{' '}
                        <strong className="text-slate-900 font-mono">
                          {(order.weight_kg / 1000).toFixed(1)} t
                        </strong>
                      </div>
                      <div>
                        Valor:{' '}
                        <strong className="text-slate-900 font-mono">
                          R$ {order.total_value.toLocaleString('pt-BR')}
                        </strong>
                      </div>
                      <div>
                        Material: <span className="text-slate-600">{order.material}</span>
                      </div>
                      <div>
                        Descarga: <span className="text-slate-600">{order.discharge_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <div className="flex gap-1">
                        <Badge
                          variant="outline"
                          className={
                            order.production_status === 'Pronto'
                              ? 'border-emerald-500 text-emerald-700 bg-emerald-50 text-[9px]'
                              : 'border-amber-500 text-amber-700 bg-amber-50 text-[9px]'
                          }
                        >
                          PCP: {order.production_status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            order.credit_status === 'Liberado'
                              ? 'border-blue-500 text-blue-700 bg-blue-50 text-[9px]'
                              : 'border-rose-500 text-rose-700 bg-rose-50 text-[9px]'
                          }
                        >
                          Crédito: {order.credit_status}
                        </Badge>

                        {/* Indicador de Informações Logísticas de Clientes (Requisito 19) */}
                        {(() => {
                          const ind = getCustomerIndicator(order.customer_code, order.customer_name)
                          return (
                            <Badge
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (ind.profile) {
                                  setSelectedCustomerDetail(ind.profile)
                                  setCustomerModalOpen(true)
                                }
                              }}
                              className={`text-[9px] cursor-pointer hover:opacity-80 transition-opacity ${ind.color}`}
                              title="Clique para abrir ficha logística completa do cliente"
                            >
                              📋 {ind.label}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>

                    {order.sap_notes && (
                      <div className="text-[10px] text-slate-500 italic bg-amber-50/60 p-1 rounded border border-amber-200">
                        Obs SAP: {order.sap_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUNA CENTRO: CARGA EM MONTAGEM & MOTOR DETERMINÍSTICO */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-sky-50/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase flex items-center space-x-1.5 text-slate-800">
                  <Layers className="w-4 h-4 text-[#005596]" />
                  <span>Carga em Montagem ({selectedOrders.length} pedidos)</span>
                </CardTitle>
                <Badge
                  className={
                    assemblyEvaluation.decision === 'permitida'
                      ? 'bg-emerald-600 text-white font-bold text-[10px]'
                      : assemblyEvaluation.decision === 'exige_aprovacao'
                        ? 'bg-amber-500 text-white font-bold text-[10px]'
                        : 'bg-rose-600 text-white font-bold text-[10px]'
                  }
                >
                  {assemblyEvaluation.decision === 'permitida'
                    ? 'MONTAGEM PERMITIDA'
                    : assemblyEvaluation.decision === 'exige_aprovacao'
                      ? 'EXIGE APROVAÇÃO'
                      : 'MONTAGEM RECUSADA'}
                </Badge>
              </div>
              <CardDescription className="text-[11px]">
                Validação em tempo real das regras determinísticas de engenharia de carga.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
              {/* Veículo Selecionado para a Carga */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#005596]" />
                    Veículo Vinculado:
                  </span>
                  {selectedQueueVehicle ? (
                    <Badge className="bg-[#005596] text-white text-[10px] font-mono">
                      {selectedQueueVehicle.vehicle_plate_cached}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">
                      Nenhum veículo selecionado
                    </Badge>
                  )}
                </div>

                {selectedQueueVehicle ? (
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>{selectedQueueVehicle.driver_name_cached}</span>
                    <span>
                      Capacidade:{' '}
                      <strong className="text-slate-900 font-mono">
                        {selectedQueueVehicle.vehicle_capacity_kg_cached &&
                        selectedQueueVehicle.vehicle_capacity_kg_cached > 0
                          ? `${(selectedQueueVehicle.vehicle_capacity_kg_cached / 1000).toFixed(1)} t`
                          : 'Não informada'}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Selecione um veículo da coluna da direita (Disponibilidade Logística) para
                    vincular à carga.
                  </p>
                )}
              </div>

              {/* Métricas Acumuladas da Carga */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900 text-white p-3 rounded-lg text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Peso Total</span>
                  <strong className="text-sm font-mono text-sky-400">
                    {(assemblyEvaluation.calculatedWeightKg / 1000).toFixed(1)} t
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Capacidade</span>
                  <strong className="text-sm font-mono text-emerald-400">
                    {assemblyEvaluation.capacityKg && assemblyEvaluation.capacityKg > 0
                      ? `${(assemblyEvaluation.capacityKg / 1000).toFixed(1)} t`
                      : 'Não informada'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Saldo / Gap</span>
                  <strong
                    className={`text-sm font-mono ${
                      (assemblyEvaluation.balanceKg || 0) < 0
                        ? 'text-rose-400 font-black'
                        : 'text-amber-400'
                    }`}
                  >
                    {assemblyEvaluation.balanceKg !== undefined
                      ? `${(assemblyEvaluation.balanceKg / 1000).toFixed(1)} t`
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* Relatório de Motivos e Validações do Motor */}
              {assemblyEvaluation.reasons.length > 0 && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    assemblyEvaluation.decision === 'recusada'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {assemblyEvaluation.decision === 'recusada' ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>Motivos Apontados pelo Motor de Regras:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {assemblyEvaluation.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Oportunidade de Complemento (se houver saldo positivo e pedidos compatíveis) */}
              {complementOpportunity && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-purple-900 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Oportunidade de Complemento Detectada!
                    </span>
                    <Badge className="bg-purple-600 text-white text-[9px]">
                      Saldo: {(complementOpportunity.balance_kg / 1000).toFixed(1)} t
                    </Badge>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Existem pedidos no mesmo itinerário que cabem no saldo residual do veículo.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateComplementOpportunity}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 font-semibold"
                  >
                    Gerar Alerta de Oportunidade para CRM 360°
                  </Button>
                </div>
              )}

              {/* Lista de Pedidos na Carga */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Itens Selecionados na Carga:
                </span>
                {selectedOrders.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg text-slate-400 text-xs">
                    Arraste ou clique em "Montar" na coluna da esquerda.
                  </div>
                ) : (
                  selectedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <strong className="font-mono text-slate-900">{order.order_number}</strong> —{' '}
                        <span className="text-slate-700">{order.customer_name}</span>
                        <div className="text-[10px] text-slate-500">
                          {(order.weight_kg / 1000).toFixed(1)} t • {order.material}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveOrder(order.id)}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: DISPONIBILIDADE LOGÍSTICA (PORTA, FORA, PROGRAMADOS) */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase flex items-center space-x-1.5 text-slate-800">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Disponibilidade Logística ({availableVehiclesForItinerary.length})</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Motoristas e veículos disponíveis para alocação.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
              {/* Grupo PORTA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-[#005596]">
                    <Building className="w-3 h-3" /> PORTA (Pátio CIAFAL):
                  </span>
                  <Badge className="bg-[#005596] text-white text-[9px]">{portaList.length}</Badge>
                </div>
                {portaList.length === 0 ? (
                  <div className="text-[10px] text-slate-400 italic py-1">
                    Nenhum motorista disponível na PORTA
                  </div>
                ) : (
                  portaList.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedQueueVehicle(v)}
                      className={`p-2 rounded border cursor-pointer transition text-xs space-y-1 ${
                        selectedQueueVehicle?.id === v.id
                          ? 'border-[#005596] bg-sky-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-slate-900">{v.vehicle_plate_cached}</span>
                        <span className="text-slate-500 font-mono">
                          {v.vehicle_capacity_kg_cached && v.vehicle_capacity_kg_cached > 0
                            ? `${(v.vehicle_capacity_kg_cached / 1000).toFixed(1)} t`
                            : 'Cap. N/I'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">
                        {v.driver_name_cached} • {v.vehicle_type_cached}
                      </div>
                      <div className="pt-0.5">
                        {(() => {
                          const pItin = (v.preferred_itinerary || '').trim().toUpperCase()
                          const targetItin = (filterItinerary || '').trim().toUpperCase()
                          if (
                            pItin &&
                            pItin !== 'SEM_PREFERENCIA' &&
                            targetItin &&
                            targetItin !== 'ALL' &&
                            pItin === targetItin
                          ) {
                            return (
                              <Badge
                                title="Itinerário informado pelo motorista na entrada da fila coincide com esta carga (maior aderência de aceite)."
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] px-1.5 py-0 font-semibold cursor-help"
                              >
                                ★ Preferência: {v.preferred_itinerary}
                              </Badge>
                            )
                          }
                          if (!pItin || pItin === 'SEM_PREFERENCIA') {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-600 bg-slate-100 border-slate-300 text-[9px] px-1.5 py-0 font-normal"
                              >
                                Sem preferência de rota
                              </Badge>
                            )
                          }
                          return (
                            <Badge
                              title="Preferência informada para outra rota, porém elegível para alocação."
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 font-medium cursor-help"
                            >
                              Pref: {v.preferred_itinerary}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Grupo FORA */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Radio className="w-3 h-3" /> FORA (≤ 60 km):
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[9px]">{foraList.length}</Badge>
                </div>
                {foraList.length === 0 ? (
                  <div className="text-[10px] text-slate-400 italic py-1">
                    Nenhum motorista próximo no raio configurado
                  </div>
                ) : (
                  foraList.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedQueueVehicle(v)}
                      className={`p-2 rounded border cursor-pointer transition text-xs space-y-1 ${
                        selectedQueueVehicle?.id === v.id
                          ? 'border-emerald-600 bg-emerald-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-slate-900">{v.vehicle_plate_cached}</span>
                        <span className="text-slate-500 font-mono">
                          {v.vehicle_capacity_kg_cached && v.vehicle_capacity_kg_cached > 0
                            ? `${(v.vehicle_capacity_kg_cached / 1000).toFixed(1)} t`
                            : 'Cap. N/I'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">
                        {v.driver_name_cached} ({v.distance_km} km)
                      </div>
                      <div className="pt-0.5">
                        {(() => {
                          const pItin = (v.preferred_itinerary || '').trim().toUpperCase()
                          const targetItin = (filterItinerary || '').trim().toUpperCase()
                          if (
                            pItin &&
                            pItin !== 'SEM_PREFERENCIA' &&
                            targetItin &&
                            targetItin !== 'ALL' &&
                            pItin === targetItin
                          ) {
                            return (
                              <Badge
                                title="Itinerário informado pelo motorista na entrada da fila coincide com esta carga (maior aderência de aceite)."
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] px-1.5 py-0 font-semibold cursor-help"
                              >
                                ★ Preferência: {v.preferred_itinerary}
                              </Badge>
                            )
                          }
                          if (!pItin || pItin === 'SEM_PREFERENCIA') {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-600 bg-slate-100 border-slate-300 text-[9px] px-1.5 py-0 font-normal"
                              >
                                Sem preferência de rota
                              </Badge>
                            )
                          }
                          return (
                            <Badge
                              title="Preferência informada para outra rota, porém elegível para alocação."
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 font-medium cursor-help"
                            >
                              Pref: {v.preferred_itinerary}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Grupo PROGRAMADOS */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-purple-600">
                    <Calendar className="w-3 h-3" /> PROGRAMADOS (Futuro):
                  </span>
                  <Badge className="bg-purple-600 text-white text-[9px]">{progList.length}</Badge>
                </div>
                {progList.length === 0 ? (
                  <div className="text-[10px] text-slate-400 italic py-1">
                    Nenhum motorista programado para datas futuras
                  </div>
                ) : (
                  progList.map((v) => (
                    <div
                      key={v.id}
                      className="p-2 rounded border border-purple-100 bg-purple-50/50 text-xs space-y-1 opacity-80"
                    >
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-slate-900">{v.vehicle_plate_cached}</span>
                        <span className="text-purple-700 font-mono text-[10px]">
                          Previsto:{' '}
                          {v.scheduled_arrival_date
                            ? new Date(v.scheduled_arrival_date + 'T12:00:00').toLocaleDateString(
                                'pt-BR',
                              )
                            : '---'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">
                        {v.driver_name_cached} (Capacidade Futura)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Drawer amplo de ENCONTROS VEÍCULO × CARGA */}
      <EncontrosDrawer
        open={isEncontrosOpen}
        onOpenChange={setIsEncontrosOpen}
        queueEntries={queueEntries}
        salesOrders={orders}
        stockCurrent={stockCurrent}
        pcpOrders={pcpOrders}
        vehicles={vehicles}
        drivers={drivers}
        freightRuleParameters={freightRuleParams}
        onRefreshData={fetchData}
        onInjectIntoSimulator={(match) => {
          // Seleciona pedidos do match para montagem
          setSelectedOrders(match.candidateLoad.orders)
          setSelectedQueueVehicle(match.queueVehicle)
          setCargoName(match.candidateLoad.title)
          setFilterItinerary(match.candidateLoad.itineraryCode)
          toast({
            title: 'Carga Carregada na Montagem',
            description: `${match.candidateLoad.title} vinculada ao veículo ${match.vehiclePlate}.`,
          })
        }}
      />

      {/* Modal Resumido de Informações Logísticas do Cliente Selecionado */}
      <CustomerLogisticDetailModal
        customer={selectedCustomerDetail}
        open={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false)
          setSelectedCustomerDetail(null)
        }}
      />
    </div>
  )
}
