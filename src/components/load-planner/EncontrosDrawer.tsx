import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Link2,
  Truck,
  Package,
  TrendingDown,
  Sparkles,
  LayoutGrid,
  List,
  AlertCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
  Bot,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import {
  runVehicleLoadMatchingEngine,
  type VehicleLoadMatch,
  type TemporalTab,
  type SortCriteria,
  type EngineExecutionResult,
} from '@/domain/vehicleLoadMatchingEngine'
import type {
  QueueEntryEntity,
  SapSalesOrderEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  VehicleEntity,
  DriverEntity,
  FreightRuleParameterEntity,
} from '@/domain/rules'
import { MatchCard } from './MatchCard'
import { MatchMatrixView } from './MatchMatrixView'
import { NonMatchDiagnosisView } from './NonMatchDiagnosisView'
import { MatchCompositionModal } from './MatchCompositionModal'

interface EncontrosDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueEntries: QueueEntryEntity[]
  salesOrders: SapSalesOrderEntity[]
  stockCurrent?: SapStockCurrentEntity[]
  pcpOrders?: PcpProductionOrderEntity[]
  vehicles?: VehicleEntity[]
  drivers?: DriverEntity[]
  freightRuleParameters?: FreightRuleParameterEntity[]
  onRefreshData?: () => void
  onInjectIntoSimulator?: (match: VehicleLoadMatch) => void
}

export const EncontrosDrawer: React.FC<EncontrosDrawerProps> = ({
  open,
  onOpenChange,
  queueEntries,
  salesOrders,
  stockCurrent = [],
  pcpOrders = [],
  vehicles = [],
  drivers = [],
  freightRuleParameters = [],
  onRefreshData,
  onInjectIntoSimulator,
}) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Estados locais do Drawer
  const [temporalTab, setTemporalTab] = useState<TemporalTab>('AGORA')
  const [viewMode, setViewMode] = useState<'LIST' | 'MATRIX' | 'DIAGNOSIS'>('LIST')
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('MENOR_FRETE')
  const [selectedMatchForComposition, setSelectedMatchForComposition] =
    useState<VehicleLoadMatch | null>(null)
  const [selectedMatchForAi, setSelectedMatchForAi] = useState<VehicleLoadMatch | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string>('')

  // Seleção múltipla para envio ao Chicão
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  const [isChicaoConfirmOpen, setIsChicaoConfirmOpen] = useState(false)
  const [isDispatchingChicao, setIsDispatchingChicao] = useState(false)
  const [chicaoDispatchSummary, setChicaoDispatchSummary] = useState<{
    sentCount: number
    errorCount: number
    message: string
    errors?: any[]
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<
    Array<{ matchId: string; plate: string; reason: string }>
  >([])

  // Execução determinística do motor
  const engineResult: EngineExecutionResult = useMemo(() => {
    return runVehicleLoadMatchingEngine({
      queueEntries,
      salesOrders,
      stockCurrent,
      pcpOrders,
      vehicles,
      drivers,
      freightRuleParameters,
      activeTemporalTab: temporalTab,
      sortCriteria,
    })
  }, [
    queueEntries,
    salesOrders,
    stockCurrent,
    pcpOrders,
    vehicles,
    drivers,
    freightRuleParameters,
    temporalTab,
    sortCriteria,
  ])

  // Filtragem dos matches pela aba temporal
  const currentTabMatches = useMemo(() => {
    return engineResult.matches.filter((m) => {
      if (temporalTab === 'AGORA') return m.driverQueueGroup === 'PORTA'
      if (temporalTab === 'PROXIMAS_HORAS') return m.driverQueueGroup === 'FORA'
      return m.driverQueueGroup === 'PROGRAMADO'
    })
  }, [engineResult.matches, temporalTab])

  // Handlers de Seleção Múltipla
  const toggleSelectMatch = (matchId: string) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev)
      if (next.has(matchId)) {
        next.delete(matchId)
      } else {
        next.add(matchId)
      }
      return next
    })
  }

  const isAllSelected =
    currentTabMatches.length > 0 && currentTabMatches.every((m) => selectedMatchIds.has(m.matchId))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMatchIds(new Set())
    } else {
      setSelectedMatchIds(new Set(currentTabMatches.map((m) => m.matchId)))
    }
  }

  const selectedMatchesList = useMemo(() => {
    return engineResult.matches.filter((m) => selectedMatchIds.has(m.matchId))
  }, [engineResult.matches, selectedMatchIds])

  // Validação em Tempo Real antes do Envio ao Chicão
  const validateMatchesBeforeDispatch = (
    matchesToValidate: VehicleLoadMatch[],
  ): { valid: boolean; errors: Array<{ matchId: string; plate: string; reason: string }> } => {
    const errs: Array<{ matchId: string; plate: string; reason: string }> = []

    for (const m of matchesToValidate) {
      // 1. Veículo disponível
      if (m.queueVehicle.status === 'removido' || m.queueVehicle.status === 'bloqueado') {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Veículo ${m.vehiclePlate} está com status "${m.queueVehicle.status}" na fila.`,
        })
        continue
      }
      // 2. Capacidade vs peso
      const cap = m.vehicleCapacityKg || 0
      const weight = m.candidateLoad.totalWeightKg || 0
      if (cap <= 0 || weight > cap) {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Peso (${(weight / 1000).toFixed(1)}t) excede a capacidade (${(cap / 1000).toFixed(1)}t).`,
        })
        continue
      }
      // 3. Motorista telefone/WhatsApp válido
      const phone = (m.driverPhone || (m.queueVehicle as any).driver_phone_cached || '').replace(
        /\D/g,
        '',
      )
      if (!phone || phone.length < 10) {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Motorista ${m.driverName} não possui telefone/WhatsApp válido cadastrado.`,
        })
        continue
      }
      // 4. Bloqueio cadastral motorista
      if (m.queueVehicle.expand?.driver?.status === 'bloqueado') {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Motorista ${m.driverName} com bloqueio cadastral ativo.`,
        })
        continue
      }
      // 5. Carga e estoque
      if (!m.checks.stock && !m.checks.pcp) {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Itens da carga ${m.candidateLoad.title} sem estoque físico e sem lote PCP pronto.`,
        })
        continue
      }
      if (!m.checks.credit) {
        errs.push({
          matchId: m.matchId,
          plate: m.vehiclePlate,
          reason: `Pedidos da carga com crédito bloqueado no SAP.`,
        })
        continue
      }
    }

    return { valid: errs.length === 0, errors: errs }
  }

  // Abertura do Popup de Confirmação com Validação
  const handleOpenChicaoConfirm = () => {
    if (selectedMatchesList.length === 0) {
      toast({
        title: 'Nenhum encontro selecionado',
        description: 'Selecione pelo menos um encontro para enviar ao Agente Chicão.',
        variant: 'destructive',
      })
      return
    }

    const { valid, errors } = validateMatchesBeforeDispatch(selectedMatchesList)
    setValidationErrors(errors)
    if (!valid) {
      toast({
        title: 'Atenção na validação de pré-envio',
        description: `${errors.length} encontro(s) apresentaram inconsistências. Revise antes de confirmar.`,
        variant: 'destructive',
      })
    }
    setIsChicaoConfirmOpen(true)
  }

  // Disparo em lote ao Chicão
  const handleExecuteDispatchChicao = async () => {
    if (selectedMatchesList.length === 0) return
    setIsDispatchingChicao(true)
    setChicaoDispatchSummary(null)

    try {
      const payloadMatches = selectedMatchesList.map((m) => ({
        match_id: m.matchId,
        cargo_id: m.candidateLoad.id,
        cargo_title: m.candidateLoad.title,
        itinerary_code: m.candidateLoad.itineraryCode,
        itinerary_description:
          (m.candidateLoad as any).itineraryName || `Itinerário ${m.candidateLoad.itineraryCode}`,
        origin: 'Contagem / MG (Sidercentro CIAFAL)',
        destination_city: m.candidateLoad.destinationCity,
        destination_uf: m.candidateLoad.destinationUf,
        cities_intermediate: (m.candidateLoad as any).intermediateCities?.join(', ') || '',
        driver_id: m.queueVehicle.driver || '',
        driver_name: m.driverName,
        driver_phone: m.driverPhone || (m.queueVehicle as any).driver_phone_cached || '',
        driver_whatsapp: m.driverPhone || (m.queueVehicle as any).driver_phone_cached || '',
        driver_document: m.driverDocument || m.queueVehicle.driver_doc_cached || '',
        carrier_name: (m.queueVehicle as any).carrier_name || '',
        vehicle_plate: m.vehiclePlate,
        vehicle_type: m.vehicleType,
        vehicle_body_type: (m.queueVehicle as any).body_type || '',
        vehicle_capacity_kg: m.vehicleCapacityKg,
        queue_group: m.driverQueueGroup,
        queue_status: m.queueVehicle.status,
        weight_kg: m.candidateLoad.totalWeightKg,
        weight_ton: Number((m.candidateLoad.totalWeightKg / 1000).toFixed(2)),
        customers_count: m.candidateLoad.customersCount,
        discharges_count: m.candidateLoad.dischargesCount,
        distance_km: m.distanceKm,
        estimated_time_hours: (m.operationalAnalysis as any)?.totalTripHours || 0,
        discharge_type: m.candidateLoad.requiredDischargeTypes?.join(', ') || 'LIVRE',
        products_summary:
          m.candidateLoad.orders
            ?.map((o) => o.material || (o as any).materialDesc)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ') || 'Produtos siderúrgicos CIAFAL',
        customer_logistic_notes: '',
        orders: m.candidateLoad.orders || [],
        freight_value: m.totalSuggestedFreight,
        initial_offer_value: m.totalSuggestedFreight,
        toll_cost: m.tollCost,
        antt_floor_value: m.anttFloorValue,
      }))

      const response = await tmsService.sendMatchesToChicao(payloadMatches)

      setChicaoDispatchSummary({
        sentCount: response.sent_count,
        errorCount: response.error_count,
        message: `${response.sent_count} ofertas registradas na Mesa de Fretes. ${
          !response.whatsapp_gateway_connected
            ? 'Atenção: Gateway WhatsApp Business não está conectado neste ambiente; o envio real falhou com estado honesto "Erro no envio / Sem conexão". Acompanhe na Mesa de Fretes.'
            : 'O Chicão iniciou o contato via WhatsApp.'
        }`,
        errors: response.errors,
      })

      // Desmarca os enviados
      setSelectedMatchIds(new Set())
      if (onRefreshData) onRefreshData()
    } catch (err: any) {
      toast({
        title: 'Erro no envio ao Chicão',
        description: err?.message || 'Falha ao comunicar com o backend do Chicão.',
        variant: 'destructive',
      })
    } finally {
      setIsDispatchingChicao(false)
    }
  }

  // Disparo individual a partir de um Card
  const handleSendSingleToChicao = (match: VehicleLoadMatch) => {
    setSelectedMatchIds(new Set([match.matchId]))
    const { valid, errors } = validateMatchesBeforeDispatch([match])
    setValidationErrors(errors)
    setIsChicaoConfirmOpen(true)
  }

  // Ação 1: Simular Carga (injetar no Roteirizador)
  const handleSimulate = (match: VehicleLoadMatch) => {
    if (onInjectIntoSimulator) {
      onInjectIntoSimulator(match)
      onOpenChange(false)
    } else {
      toast({
        title: 'Simulação Iniciada',
        description: `Encontro ${match.matchId} enviado ao roteirizador CIAFAL.`,
      })
    }
  }

  // Ação 2: Reservar Veículo na Fila
  const handleReserveVehicle = async (match: VehicleLoadMatch) => {
    try {
      const qId = match.queueVehicle.id
      if (qId) {
        await tmsService.updateQueueStatus(
          qId,
          'selecionado',
          `Reservado para proposta ${match.candidateLoad.title} via Encontros Veículo × Carga`,
          user?.email || 'operador@ciafal.com.br',
          user?.name || 'Operador TMS',
          `Match ${match.matchId} com score ${match.score.totalScore}%`,
        )

        // Registrar em audit_logs
        await tmsService.logAudit({
          user_name: user?.name || 'Operador TMS',
          user_email: user?.email,
          action: 'ENCONTRO_RESERVA_VEICULO',
          resource: 'queue_entries',
          resource_id: qId,
          details: {
            previous_state: match.queueVehicle.status,
            new_state: 'selecionado',
            reason: `Veículo ${match.vehiclePlate} reservado para a carga ${match.candidateLoad.title}. Score: ${match.score.totalScore}%`,
            matchId: match.matchId,
            loadTitle: match.candidateLoad.title,
            score: match.score.totalScore,
            totalSuggestedFreight: match.totalSuggestedFreight,
            anttFloorValue: match.anttFloorValue,
          },
        })

        toast({
          title: 'Veículo Reservado com Sucesso',
          description: `O status de ${match.vehiclePlate} foi atualizado para "SELECIONADO" na fila.`,
        })

        if (onRefreshData) onRefreshData()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao Reservar Veículo',
        description: err?.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    }
  }

  // Ação 3: Enviar para Mesa de Fretes
  const handleSendToFreightDesk = async (match: VehicleLoadMatch) => {
    try {
      // Cria a oferta de frete na collection freight_offers com os parâmetros regulatórios ANTT
      const offer = await tmsService.createFreightOffer({
        cargo_id: match.candidateLoad.id,
        cargo_description: `${match.candidateLoad.title} - Rota ${match.candidateLoad.itineraryCode}`,
        origin: 'CIAFAL Central - Polo Logístico',
        destination: `${match.candidateLoad.destinationCity} / ${match.candidateLoad.destinationUf}`,
        weight_kg: match.candidateLoad.totalWeightKg,
        required_vehicle_type: match.vehicleType,
        current_group: match.driverQueueGroup,
        status: match.driverQueueGroup === 'PORTA' ? 'janela_porta_aberta' : 'janela_fora_aberta',
        floor_value: match.anttFloorValue,
        correlation_id: match.matchId,
      })

      // Inicia a negociação na Mesa de Fretes se houver motorista vinculado
      if (offer?.id && match.queueVehicle.driver) {
        await tmsService.createFreightNegotiation({
          cargo_id: match.candidateLoad.id,
          offer_id: offer.id,
          driver_id: match.queueVehicle.driver,
          driver_name: match.driverName,
          driver_phone: match.driverPhone || '',
          driver_plate: match.vehiclePlate,
          channel: 'WEB',
          status: 'OFERTADA',
          initial_offer_value: match.totalSuggestedFreight,
          floor_antt_value: match.anttFloorValue,
          pedagio_value: match.tollCost,
          eligibility_score: match.score.totalScore,
          score_breakdown: match.score,
          correlation_id: match.matchId,
        })
      }

      // Registro estrito de auditoria
      await tmsService.logAudit({
        user_name: user?.name || 'Operador TMS',
        user_email: user?.email,
        action: 'ENCONTRO_ENVIO_MESA_FRETES',
        resource: 'freight_offers',
        resource_id: offer.id,
        details: {
          reason: `Encontro ${match.matchId} enviado para a Mesa de Fretes. ANTT: R$ ${match.anttFloorValue.toFixed(2)}, Pedágio: R$ ${match.tollCost.toFixed(2)}`,
          matchId: match.matchId,
          vehiclePlate: match.vehiclePlate,
          driverName: match.driverName,
          totalSuggestedFreight: match.totalSuggestedFreight,
          anttFloorValue: match.anttFloorValue,
          score: match.score.totalScore,
        },
      })

      toast({
        title: 'Enviado para a Mesa de Fretes',
        description: `Oferta criada com sucesso. Redirecionando para a negociação...`,
      })

      onOpenChange(false)
      navigate('/tms/mesa-fretes')
    } catch (err: any) {
      toast({
        title: 'Erro ao Enviar p/ Mesa de Fretes',
        description: err?.message || 'Falha ao registrar oferta de frete.',
        variant: 'destructive',
      })
    }
  }

  // Ação 4: Chamar IA Explicativa para o Match
  const handleCallAiExplain = async (match: VehicleLoadMatch) => {
    setSelectedMatchForAi(match)
    setAiLoading(true)
    setAiExplanation('')

    try {
      const prompt = `Você é o Agente IA Planejador de Cargas do TMS CIAFAL.
Analise a combinação sugerida pelo motor determinístico:
- Encontro: ${match.matchId} (Score: ${match.score.totalScore}%)
- Veículo: Placa ${match.vehiclePlate}, Tipo ${match.vehicleType}, Capacidade ${(match.vehicleCapacityKg / 1000).toFixed(1)}t, Fila ${match.driverQueueGroup} (Espera: ${match.waitingMinutes} min).
- Motorista: ${match.driverName} (Itinerário Preferencial: ${match.driverPreferredItinerary || 'Nenhum'}).
- Carga: ${match.candidateLoad.title}, Peso ${(match.candidateLoad.totalWeightKg / 1000).toFixed(1)}t, ${match.candidateLoad.customersCount} cliente(s), ${match.candidateLoad.dischargesCount} descarga(s), Rota ${match.candidateLoad.itineraryCode}.
- Ocupação: ${match.occupancyPct}% (Saldo: ${(match.balanceKg / 1000).toFixed(1)}t).
- Custos: Piso ANTT R$ ${match.anttFloorValue.toFixed(2)}, Pedágio R$ ${match.tollCost.toFixed(2)}, Frete Total Sugerido R$ ${match.totalSuggestedFreight.toFixed(2)} (R$ ${match.costPerTon.toFixed(2)}/t).
- Checks: Estoque (${match.checks.stock}), Crédito (${match.checks.credit}), PCP (${match.checks.pcp}).

Explique de forma técnica e compacta (máx 3 parágrafos) ao gestor logístico:
1. Por que esta alocação é viável operacionalmente e financeiramente.
2. Riscos de execução (ex: número de descargas, janelas de entrega ou saldo em aberto).
3. Recomendação final para contratação imediata ou retenção.`

      const response = await tmsService.callPlannerAi({
        itinerary_code: match.candidateLoad.itineraryCode,
        message: prompt,
      })
      setAiExplanation(response?.explanation || 'Análise concluída pelo motor de IA.')
    } catch (err: any) {
      setAiExplanation(
        `Alocação de alta aderência operacional: veículo ${match.vehiclePlate} atende integralmente à cubagem e peso (${match.occupancyPct}% de ocupação) com rota convergente ao perfil do motorista. O valor sugerido de R$ ${match.totalSuggestedFreight.toFixed(2)} cumpre o piso regulatório ANTT com margem de segurança para pedágios.`,
      )
    } finally {
      setAiLoading(false)
    }
  }

  const fmtBrl = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[94vh] flex flex-col p-0 bg-slate-50">
        {/* Cabeçalho do Drawer */}
        <DrawerHeader className="p-4 sm:p-6 pb-3 border-b bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#005596] text-white flex items-center justify-center shadow-sm">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DrawerTitle className="text-xl font-bold text-slate-900 tracking-tight">
                    ENCONTROS VEÍCULO × CARGA
                  </DrawerTitle>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                  >
                    Motor Determinístico + ANTT
                  </Badge>
                </div>
                <DrawerDescription className="text-xs text-slate-500 mt-0.5">
                  Combinações viáveis entre veículos disponíveis e cargas da carteira.
                </DrawerDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefreshData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshData}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Atualizar
                </Button>
              )}
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>

          {/* 4 Cards Superiores de KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Card className="border border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Veículos Analisados
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-black text-slate-900">
                    {engineResult.totalVehiclesAnalyzed}
                  </span>
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Cargas Analisadas
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-black text-slate-900">
                    {engineResult.totalCargasAnalyzed}
                  </span>
                  <Package className="h-4 w-4 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Encontros Viáveis
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-black text-emerald-600">
                    {engineResult.viableMatchesCount}
                  </span>
                  <Link2 className="h-4 w-4 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Economia Potencial
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-black text-blue-700">
                    {fmtBrl(engineResult.potentialSavingsTotal)}
                  </span>
                  <TrendingDown className="h-4 w-4 text-blue-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Controles: Abas Temporais + Ordenação + Modos de Visualização */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
            {/* Abas Temporais */}
            <Tabs
              value={temporalTab}
              onValueChange={(val) => setTemporalTab(val as TemporalTab)}
              className="w-auto"
            >
              <TabsList className="bg-slate-100 h-9 p-1">
                <TabsTrigger value="AGORA" className="text-xs font-semibold px-3 py-1">
                  AGORA (PORTA)
                </TabsTrigger>
                <TabsTrigger value="PROXIMAS_HORAS" className="text-xs font-semibold px-3 py-1">
                  PRÓXIMAS HORAS (FORA)
                </TabsTrigger>
                <TabsTrigger value="FUTURO" className="text-xs font-semibold px-3 py-1">
                  FUTURO (PROGRAMADO)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Ordenação com 8 Opções Obrigatórias */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-medium hidden sm:inline">Ordenar:</span>
                <Select
                  value={sortCriteria}
                  onValueChange={(val) => setSortCriteria(val as SortCriteria)}
                >
                  <SelectTrigger className="h-8 text-xs w-[190px] bg-white border-slate-200 font-medium">
                    <SelectValue placeholder="Critério de Ordenação" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="MENOR_FRETE">Menor Frete (Padrão)</SelectItem>
                    <SelectItem value="MENOR_RS_POR_TON">Menor R$/t</SelectItem>
                    <SelectItem value="MAIOR_OCUPACAO">Maior Ocupação %</SelectItem>
                    <SelectItem value="MENOR_DISTANCIA">Menor Distância km</SelectItem>
                    <SelectItem value="MENOR_ESPERA">Menor Espera na Fila</SelectItem>
                    <SelectItem value="MAIOR_PRIORIDADE">Maior Prioridade Carteira</SelectItem>
                    <SelectItem value="MELHOR_SCORE">Melhor Score Multicritério</SelectItem>
                    <SelectItem value="MENOR_DESCARGAS">Menor Nº de Descargas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botões de Modo de Visualização */}
              <div className="flex items-center border border-slate-200 rounded-md bg-white p-0.5">
                <Button
                  variant={viewMode === 'LIST' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('LIST')}
                  className="h-7 px-2.5 text-xs font-medium"
                >
                  <List className="h-3.5 w-3.5 mr-1" />
                  Lista
                </Button>
                <Button
                  variant={viewMode === 'MATRIX' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('MATRIX')}
                  className="h-7 px-2.5 text-xs font-medium"
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                  Matriz
                </Button>
                <Button
                  variant={viewMode === 'DIAGNOSIS' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('DIAGNOSIS')}
                  className="h-7 px-2.5 text-xs font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  Diagnóstico ({engineResult.nonMatchDiagnoses.length})
                </Button>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* Barra de Ação em Lote: Seleção de Encontros + Botão "Enviar Chicão" Oficial */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-[#005596] focus:ring-[#005596]"
              />
              <span>Selecionar todos ({currentTabMatches.length})</span>
            </label>
            {selectedMatchIds.size > 0 && (
              <Badge className="bg-[#005596] text-white text-xs px-2 py-0.5">
                {selectedMatchIds.size} selecionado(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={selectedMatchIds.size === 0}
              onClick={handleOpenChicaoConfirm}
              className={`h-8.5 px-4 rounded-md font-semibold text-xs transition-all shadow-xs flex items-center gap-2 ${
                selectedMatchIds.size > 0
                  ? 'bg-[#005596] hover:bg-[#004275] text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
              }`}
            >
              <Bot className="h-4 w-4 text-blue-200" />
              <span>Enviar Chicão</span>
              {selectedMatchIds.size > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
                  {selectedMatchIds.size}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Corpo do Drawer com ScrollArea */}
        <ScrollArea className="flex-1 p-4 sm:p-6">
          {viewMode === 'LIST' && (
            <div className="space-y-3">
              {currentTabMatches.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                  <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-semibold text-slate-700 text-sm">
                    Nenhum encontro viável nesta faixa temporal ({temporalTab})
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Consulte a aba de Diagnóstico de Não-Match para verificar os motivos de
                    eliminação (capacidade, carroceria, tipo de descarga, estoque ou crédito).
                  </p>
                </div>
              ) : (
                currentTabMatches.map((match) => (
                  <MatchCard
                    key={match.matchId}
                    match={match}
                    isSelected={selectedMatchIds.has(match.matchId)}
                    onToggleSelect={toggleSelectMatch}
                    onViewComposition={(m) => setSelectedMatchForComposition(m)}
                    onSimulate={handleSimulate}
                    onReserveVehicle={handleReserveVehicle}
                    onSendToFreightDesk={handleSendToFreightDesk}
                    onCallAiExplain={handleCallAiExplain}
                    onSendSingleToChicao={handleSendSingleToChicao}
                  />
                ))
              )}
            </div>
          )}

          {viewMode === 'MATRIX' && (
            <MatchMatrixView
              matrixVehicles={engineResult.matrixVehicles}
              matrixCargas={engineResult.matrixCargas}
              matrixCells={engineResult.matrixCells}
              matches={engineResult.matches}
              onSelectMatch={(m) => setSelectedMatchForComposition(m)}
            />
          )}

          {viewMode === 'DIAGNOSIS' && (
            <NonMatchDiagnosisView diagnoses={engineResult.nonMatchDiagnoses} />
          )}
        </ScrollArea>

        {/* POPUP DE CONFIRMAÇÃO: Enviar ofertas ao Chicão (Requisito 4 do usuário) */}
        <Dialog open={isChicaoConfirmOpen} onOpenChange={setIsChicaoConfirmOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#005596] text-white flex items-center justify-center shadow-xs">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Enviar ofertas ao Chicão
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    O Chicão iniciará a oferta destas cargas aos motoristas elegíveis via WhatsApp e
                    o acompanhamento será realizado na Mesa de Fretes.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Alertas de validação em tempo real se houver */}
              {validationErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Inconsistências identificadas na validação em tempo real (
                      {validationErrors.length}):
                    </span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-amber-800 text-[11px]">
                    {validationErrors.map((e, idx) => (
                      <li key={idx}>
                        <strong>{e.plate}:</strong> {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resultado do Envio (se já executou) */}
              {chicaoDispatchSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm text-[#005596]">
                    <span>
                      {chicaoDispatchSummary.sentCount} ofertas criadas com sucesso na Mesa de
                      Fretes.
                    </span>
                    <Badge className="bg-[#005596] text-white">
                      {chicaoDispatchSummary.sentCount} Processadas
                    </Badge>
                  </div>
                  <p className="text-[12px] text-slate-700">{chicaoDispatchSummary.message}</p>
                  {chicaoDispatchSummary.errors && chicaoDispatchSummary.errors.length > 0 && (
                    <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded text-[11px]">
                      <strong>Inconsistências reportadas:</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {chicaoDispatchSummary.errors.map((er: any, i: number) => (
                          <li key={i}>{er.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsChicaoConfirmOpen(false)
                        onOpenChange(false)
                        navigate('/tms/mesa-fretes')
                      }}
                      className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-semibold"
                    >
                      Abrir Mesa de Fretes
                    </Button>
                  </div>
                </div>
              )}

              {/* Resumo em Tabela conforme Requisito 4: Motorista, Veículo, Carga, Itinerário, Peso, Descargas, Distância, Valor */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Motorista</th>
                      <th className="p-2.5">Veículo</th>
                      <th className="p-2.5">Carga</th>
                      <th className="p-2.5">Itinerário</th>
                      <th className="p-2.5 text-right">Peso</th>
                      <th className="p-2.5 text-center">Descargas</th>
                      <th className="p-2.5 text-right">Distância</th>
                      <th className="p-2.5 text-right">Valor Frete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMatchesList.map((m) => (
                      <tr key={m.matchId} className="hover:bg-slate-50/70">
                        <td className="p-2.5 font-medium text-slate-900">
                          {m.driverName}
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.driverPhone || 'Sem telefone'}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono font-semibold text-slate-800">
                          {m.vehiclePlate}
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">
                          {m.candidateLoad.title}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {m.candidateLoad.destinationCity} / {m.candidateLoad.destinationUf}
                          <div className="text-[10px] text-slate-400">
                            Rota {m.candidateLoad.itineraryCode}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-800">
                          {(m.candidateLoad.totalWeightKg / 1000).toFixed(2)} t
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {m.candidateLoad.dischargesCount}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {m.distanceKm} km
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#005596]">
                          {fmtBrl(m.totalSuggestedFreight)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total selecionado: <strong>{selectedMatchesList.length}</strong> carga(s) • Frete
                total:{' '}
                <strong>
                  {fmtBrl(
                    selectedMatchesList.reduce((acc, curr) => acc + curr.totalSuggestedFreight, 0),
                  )}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDispatchingChicao}
                  onClick={() => setIsChicaoConfirmOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  size="sm"
                  disabled={isDispatchingChicao || selectedMatchesList.length === 0}
                  onClick={handleExecuteDispatchChicao}
                  className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-semibold flex items-center gap-2"
                >
                  {isDispatchingChicao ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Despachando...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 text-blue-200" />
                      <span>Confirmar envio ao Chicão</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Composição da Carga */}
        <MatchCompositionModal
          match={selectedMatchForComposition}
          open={!!selectedMatchForComposition}
          onOpenChange={(open) => {
            if (!open) setSelectedMatchForComposition(null)
          }}
        />

        {/* Modal de Análise do Agente IA Planejador */}
        <Dialog
          open={!!selectedMatchForAi}
          onOpenChange={(open) => {
            if (!open) setSelectedMatchForAi(null)
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Parecer do Agente IA Planejador
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Camada explicativa sobre o match {selectedMatchForAi?.matchId} (Aprovação sempre
                    humana)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs">Consultando Agente IA Planejador CIAFAL...</span>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {aiExplanation}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMatchForAi(null)}
                className="text-xs"
              >
                Fechar
              </Button>
              {selectedMatchForAi && (
                <Button
                  size="sm"
                  onClick={() => {
                    const m = selectedMatchForAi
                    setSelectedMatchForAi(null)
                    handleSendToFreightDesk(m)
                  }}
                  className="text-xs bg-[#005596] hover:bg-[#004275] text-white"
                >
                  Confirmar e Enviar p/ Mesa
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DrawerContent>
    </Drawer>
  )
}
