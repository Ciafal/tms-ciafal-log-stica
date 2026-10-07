// TMS CIAFAL — Modal de Adição Excepcional de Rotas a um Itinerário
// Conforme especificações exatas:
// Requisitos 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
// Mensagem exata de sucesso: "Rotas adicionadas ao itinerário com sucesso."
// Mensagem exata de divergência IA: "A justificativa informada não está plenamente sustentada pelos dados disponíveis."

import React, { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Route,
  Search,
  Scale,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  MapPin,
  Clock,
  DollarSign,
  Plus,
} from 'lucide-react'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'
import {
  ROUTE_ADDITION_REASONS,
  calculateRouteAdditionMetrics,
  generateRouteAdditionAiAnalysis,
  evaluateEligibleRouteWithAi,
  RouteAdditionEntity,
  AiRouteRecommendation,
} from '@/domain/routeAdditionEngine'
import { useToast } from '@/hooks/use-toast'

export interface RouteAdditionModalProps {
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  cargoNumber?: string
  originalItineraryCode?: string
  originalItineraryDesc?: string
  currentOrders?: SapSalesOrderEntity[]
  availableOrders?: SapSalesOrderEntity[]
  availableItineraries?: SapItineraryEntity[]
  vehicleCapacityKg?: number
  vehiclePlate?: string
  candidateLoad?: any
  onSuccess?: () => void
  onConfirm?: (
    additionRecord: RouteAdditionEntity,
    addedOrders: SapSalesOrderEntity[],
  ) => Promise<void>
  currentUserEmail?: string
  currentUserRole?: string
}

export const RouteAdditionModal: React.FC<RouteAdditionModalProps> = ({
  open: openProp,
  isOpen: isOpenProp,
  onOpenChange,
  onClose,
  cargoNumber: cargoNumberProp,
  originalItineraryCode: origItinProp,
  originalItineraryDesc: origDescProp,
  currentOrders: currentOrdersProp,
  availableOrders: availableOrdersProp,
  availableItineraries: availableItinProp,
  vehicleCapacityKg: vehicleCapacityKgProp,
  candidateLoad,
  onSuccess,
  onConfirm,
  currentUserEmail = 'operador@ciafal.logistica',
  currentUserRole = 'planejador_cargas',
}) => {
  const { toast } = useToast()
  const isModalOpen = openProp !== undefined ? openProp : !!isOpenProp
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false)
    if (onClose) onClose()
  }

  const cargoNumber =
    cargoNumberProp || candidateLoad?.id || candidateLoad?.cargo_number || 'CARGA-NOVA'
  const originalItineraryCode =
    origItinProp || candidateLoad?.itineraryCode || candidateLoad?.original_itinerary_id || 'MG-01'
  const originalItineraryDesc =
    origDescProp || candidateLoad?.itineraryDescription || `Itinerário ${originalItineraryCode}`
  const currentOrders = currentOrdersProp || candidateLoad?.orders || []
  const availableOrders = availableOrdersProp || []
  const availableItineraries = availableItinProp || []
  const vehicleCapacityKg = vehicleCapacityKgProp || candidateLoad?.capacityKg || 28000

  // Seleção de múltiplas rotas elegíveis (ou pedidos)
  const [selectedRouteCodes, setSelectedRouteCodes] = useState<string[]>([])
  const [selectedComplementaryOrders, setSelectedComplementaryOrders] = useState<
    SapSalesOrderEntity[]
  >([])

  // Filtros de busca na lista de rotas
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedUf, setSelectedUf] = useState<string>('ALL')
  const [filterAiRecommendation, setFilterAiRecommendation] = useState<string>('ALL')

  // Justificativa obrigatória (Requisito 5: 16 opções)
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('')
  const [userObservation, setUserObservation] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reseta ao abrir
  useEffect(() => {
    if (isModalOpen) {
      setSelectedRouteCodes([])
      setSelectedComplementaryOrders([])
      setSelectedReasonCode('')
      setUserObservation('')
      setSearchTerm('')
      setSelectedUf('ALL')
      setFilterAiRecommendation('ALL')
      setIsSubmitting(false)
    }
  }, [isModalOpen])

  // Identifica rotas elegíveis reais a partir da carteira SAP disponível
  // Agrupa pedidos por código de rota (ou itinerário)
  const eligibleRoutesGrouped = useMemo(() => {
    const currentOrderIds = new Set(currentOrders.map((o) => o.id))
    const validOrders = availableOrders.filter((o) => !currentOrderIds.has(o.id))

    const routeMap = new Map<string, SapSalesOrderEntity[]>()
    validOrders.forEach((o) => {
      // Chave da rota: route_code se houver, ou itinerary_code
      const rKey = o.route_code || o.itinerary_code || 'ROTA-LIVRE'
      // Exclui se for o mesmo itinerário principal
      if (rKey === originalItineraryCode && o.itinerary_code === originalItineraryCode) {
        // Pode ser pedido remanescente, mas se for a rota principal não é rota complementar
      }
      const list = routeMap.get(rKey) || []
      list.push(o)
      routeMap.set(rKey, list)
    })

    // Avalia cada rota com IA (Requisito 4)
    const evaluated: AiRouteRecommendation[] = []
    routeMap.forEach((orders, rCode) => {
      const itinCode = orders[0]?.itinerary_code || rCode
      // Exclui a rota original se for exatamente igual
      if (rCode === originalItineraryCode) return

      const evalResult = evaluateEligibleRouteWithAi({
        routeCode: rCode,
        itineraryCode: itinCode,
        orders,
        currentLoadOrders: currentOrders,
        vehicleCapacityKg,
      })
      evaluated.push(evalResult)
    })

    // Ordena: Recomendada primeiro, depois Possível, depois Não recomendada
    return evaluated.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
  }, [availableOrders, currentOrders, originalItineraryCode, vehicleCapacityKg])

  // Rotas filtradas por busca/UF/Recomendação IA
  const filteredRoutes = useMemo(() => {
    return eligibleRoutesGrouped.filter((item) => {
      if (selectedUf !== 'ALL' && item.destinationUf !== selectedUf) return false
      if (filterAiRecommendation !== 'ALL' && item.classification !== filterAiRecommendation)
        return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchRoute = item.routeCode.toLowerCase().includes(term)
        const matchCity = item.destinationCity.toLowerCase().includes(term)
        const matchCustomer = item.customerNames.some((c) => c.toLowerCase().includes(term))
        const matchOrder = item.orderNumbers.some((num) => num.toLowerCase().includes(term))
        if (!matchRoute && !matchCity && !matchCustomer && !matchOrder) return false
      }
      return true
    })
  }, [eligibleRoutesGrouped, selectedUf, filterAiRecommendation, searchTerm])

  // Alterna seleção de uma rota inteira (Requisito 3: Checkbox múltiplo)
  const handleToggleRoute = (routeItem: AiRouteRecommendation) => {
    const isSelected = selectedRouteCodes.includes(routeItem.routeCode)
    const routeOrders = availableOrders.filter((o) => {
      const rKey = o.route_code || o.itinerary_code || 'ROTA-LIVRE'
      return rKey === routeItem.routeCode
    })

    if (isSelected) {
      setSelectedRouteCodes((prev) => prev.filter((rc) => rc !== routeItem.routeCode))
      setSelectedComplementaryOrders((prev) =>
        prev.filter((o) => !routeOrders.some((ro) => ro.id === o.id)),
      )
    } else {
      setSelectedRouteCodes((prev) => [...prev, routeItem.routeCode])
      setSelectedComplementaryOrders((prev) => {
        const newOrders = routeOrders.filter((ro) => !prev.some((p) => p.id === ro.id))
        return [...prev, ...newOrders]
      })
    }
  }

  // Permite selecionar todas as recomendadas com 1 clique
  const handleSelectAllRecommended = () => {
    const recommended = eligibleRoutesGrouped.filter((r) => r.classification === 'Recomendada')
    const recCodes = recommended.map((r) => r.routeCode)
    setSelectedRouteCodes(recCodes)

    const allRecOrders = availableOrders.filter((o) => {
      const rKey = o.route_code || o.itinerary_code || 'ROTA-LIVRE'
      return recCodes.includes(rKey)
    })
    setSelectedComplementaryOrders(allRecOrders)
  }

  // 1. Métricas Comparativas Antes x Depois (Requisitos 8 e 9)
  const metrics = useMemo(() => {
    return calculateRouteAdditionMetrics({
      currentOrders,
      addedOrders: selectedComplementaryOrders,
      vehicleCapacityKg,
      baseDistanceKm: candidateLoad?.distanceKm || 220,
    })
  }, [currentOrders, selectedComplementaryOrders, vehicleCapacityKg, candidateLoad])

  // 2. Análise de IA em Tempo Real (Requisitos 6 e 7)
  const aiAnalysis = useMemo(() => {
    const addedItins = selectedRouteCodes.join(', ') || 'COMPLEMENTAR'
    return generateRouteAdditionAiAnalysis({
      originalItineraryCode,
      addedItineraryCode: addedItins,
      metrics,
      addedOrders: selectedComplementaryOrders,
      selectedReasonCode,
      userObservation,
    })
  }, [
    originalItineraryCode,
    selectedRouteCodes,
    metrics,
    selectedComplementaryOrders,
    selectedReasonCode,
    userObservation,
  ])

  // Validação para confirmação (Requisito 5: Motivo obrigatório; Se 16=Outro, observação obrigatória)
  const canConfirm = useMemo(() => {
    if (selectedComplementaryOrders.length === 0) return false
    if (!selectedReasonCode) return false
    if (selectedReasonCode === '16' && userObservation.trim().length < 5) return false
    return true
  }, [selectedComplementaryOrders, selectedReasonCode, userObservation])

  // Ação de confirmação
  const handleConfirmAction = async () => {
    if (!canConfirm) return

    setIsSubmitting(true)
    try {
      const reasonObj = ROUTE_ADDITION_REASONS.find((r) => r.code === selectedReasonCode)
      const primaryAddedOrder = selectedComplementaryOrders[0]

      const addedRouteCode = selectedRouteCodes.join('+') || primaryAddedOrder.itinerary_code
      const addedDesc = `Rotas adicionais (${selectedRouteCodes.length}): ${selectedRouteCodes.join(', ')}`

      const additionRecord: RouteAdditionEntity = {
        load_id: cargoNumber,
        cargo_number: cargoNumber,
        transport_order_id: cargoNumber,
        original_itinerary_id: originalItineraryCode,
        original_itinerary_code: originalItineraryCode,
        original_itinerary_description: originalItineraryDesc,
        added_itinerary_id: addedRouteCode,
        added_route_id: addedRouteCode,
        added_itinerary_description: addedDesc,
        complementary_itinerary_code: addedRouteCode,
        complementary_itinerary_description: addedDesc,
        customer_code: primaryAddedOrder.customer_code,
        customer_name: primaryAddedOrder.customer_name,
        destination_city: primaryAddedOrder.destination_city,
        destination_uf: primaryAddedOrder.uf,
        order_numbers_json: selectedComplementaryOrders.map((o) => o.order_number),
        reason_code: selectedReasonCode,
        reason_description: reasonObj?.label || 'Adição de Rota',
        user_observation: userObservation.trim(),
        ai_analysis: aiAnalysis.diagnostic,
        ai_user_alignment: aiAnalysis.alignment,
        ai_alignment: aiAnalysis.alignment,
        ai_risk_level: aiAnalysis.riskLevel,
        ai_risk: aiAnalysis.riskLevel,
        ai_alert_flag: aiAnalysis.hasRelevantImpactAlert,
        ai_alert_message: aiAnalysis.alertMessage,
        distance_before: metrics.distanceBeforeKm,
        distance_after: metrics.distanceAfterKm,
        additional_distance: metrics.additionalDistanceKm,
        additional_time_hours: Math.round((metrics.additionalTimeMinutes / 60) * 10) / 10,
        weight_before: metrics.weightBeforeTon * 1000,
        weight_after: metrics.weightAfterTon * 1000,
        occupancy_before: metrics.occupancyBeforePct,
        occupancy_after: metrics.occupancyAfterPct,
        vehicle_capacity_kg: vehicleCapacityKg,
        freight_before: metrics.freightBeforeBrl,
        freight_after: metrics.freightAfterBrl,
        toll_before: metrics.tollBeforeBrl,
        toll_after: metrics.tollAfterBrl,
        cost_per_ton_before: metrics.costPerTonBeforeBrl,
        cost_per_ton_after: metrics.costPerTonAfterBrl,
        deliveries_before: metrics.dischargesBefore,
        deliveries_after: metrics.dischargesAfter,
        clients_before: metrics.clientsBefore,
        clients_after: metrics.clientsAfter,
        fractionations_before: metrics.fractionationsBefore,
        fractionations_after: metrics.fractionationsAfter,
        fractionations_delta: metrics.fractionationsDelta,
        fractions_before: metrics.fractionationsBefore,
        fractions_after: metrics.fractionationsAfter,
        remessas_before: metrics.remessasBefore,
        remessas_after: metrics.remessasAfter,
        status: 'ATIVA',
        created_by: currentUserEmail,
        created_by_role: currentUserRole,
        created_at_dt: new Date().toISOString(),
      }

      if (onConfirm) {
        await onConfirm(additionRecord, selectedComplementaryOrders)
      } else {
        const { TmsService } = await import('@/services/tmsService')
        await TmsService.createRouteAddition(additionRecord)
      }

      // Mensagem EXATA conforme Requisito 10
      toast({
        title: 'Sucesso',
        description: 'Rotas adicionadas ao itinerário com sucesso.',
      })

      if (onSuccess) onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Falha ao confirmar adição de rotas:', err)
      toast({
        title: 'Erro ao adicionar rotas',
        description: err?.message || 'Falha ao registrar adição no sistema.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const primaryCity = currentOrders[0]?.destination_city || 'Regional'
  const primaryUf = currentOrders[0]?.uf || 'MG'
  const currentDate = new Date().toLocaleDateString('pt-BR')

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[94vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <DialogHeader className="p-4 bg-[#005596] text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
                <Route className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>Adicionar Rotas ao Itinerário</span>
                  <Badge className="bg-white/20 text-white text-[10px] font-semibold border-none">
                    Multi-rotas
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-sky-100 font-medium">
                  Exceção controlada para esta carga · Preserva o Itinerário SAP TVROT original
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedRouteCodes.length > 0 && (
                <Badge className="bg-amber-400 text-slate-900 text-xs font-black uppercase px-2.5 py-0.5 border-none shadow-xs">
                  +{selectedRouteCodes.length} Rota{selectedRouteCodes.length > 1 ? 's' : ''}{' '}
                  selecionada{selectedRouteCodes.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Requisito 2: Cabeçalho rico com métricas canônicas */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
            <span>
              Centro: <strong className="text-slate-800">WSTL - CIAFAL Contagem</strong> · Empresa:{' '}
              <strong className="text-slate-800">1000 - CIAFAL Aços</strong>
            </span>
            <span className="flex items-center gap-1 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#005596]" /> Carregamento:{' '}
              <strong className="text-slate-900">{currentDate}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Itinerário Orig.
              </span>
              <strong className="text-xs font-mono text-[#005596]">{originalItineraryCode}</strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Carga Atual
              </span>
              <strong className="text-xs font-mono text-slate-900">
                {metrics.weightBeforeTon.toFixed(1)} t
              </strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Capacidade
              </span>
              <strong className="text-xs font-mono text-slate-700">
                {((vehicleCapacityKg || 28000) / 1000).toFixed(1)} t
              </strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Ocupação Atual
              </span>
              <strong className="text-xs font-mono text-emerald-700">
                {metrics.occupancyBeforePct}%
              </strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Clientes Atuais
              </span>
              <strong className="text-xs font-mono text-slate-900">{metrics.clientsBefore}</strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Nº Fracionamentos
              </span>
              <strong className="text-xs font-mono text-amber-800">
                {metrics.fractionationsBefore}
              </strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Distância Prevista
              </span>
              <strong className="text-xs font-mono text-slate-900">
                {metrics.distanceBeforeKm} km
              </strong>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate">
                Custo / Custo por t
              </span>
              <strong className="text-xs font-mono text-slate-900 truncate block">
                R$ {metrics.freightBeforeBrl} · {metrics.costPerTonBeforeBrl} R$/t
              </strong>
            </div>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Seção 1: Lista de Rotas Elegíveis com Sugestão de IA (Requisitos 3 e 4) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-[#005596]" />
                <span className="font-bold text-slate-900 text-xs uppercase">
                  1. Rotas Elegíveis da Carteira SAP com Classificação de IA
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                  {filteredRoutes.length} rotas disponíveis
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllRecommended}
                  className="h-7 text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Selecionar Recomendadas
                </Button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Buscar Rota, Cliente, Cidade ou Pedido:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por qualquer campo..."
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Classificação da IA:
                </label>
                <Select value={filterAiRecommendation} onValueChange={setFilterAiRecommendation}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todas as Classificações</SelectItem>
                    <SelectItem value="Recomendada">🟢 Recomendada (Alta sinergia)</SelectItem>
                    <SelectItem value="Possível">🟡 Possível (Com impactos)</SelectItem>
                    <SelectItem value="Não recomendada">
                      🔴 Não recomendada (Desvio alto)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Filtrar por UF:
                </label>
                <Select value={selectedUf} onValueChange={setSelectedUf}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todas as UFs</SelectItem>
                    <SelectItem value="MG">MG — Minas Gerais</SelectItem>
                    <SelectItem value="SP">SP — São Paulo</SelectItem>
                    <SelectItem value="RJ">RJ — Rio de Janeiro</SelectItem>
                    <SelectItem value="ES">ES — Espírito Santo</SelectItem>
                    <SelectItem value="GO">GO — Goiás</SelectItem>
                    <SelectItem value="BA">BA — Bahia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requisito 3: Tabela de Rotas Elegíveis (Dados Reais SAP) */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredRoutes.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Nenhuma rota compatível encontrada na carteira SAP para os filtros atuais.
                  </div>
                ) : (
                  filteredRoutes.map((routeItem) => {
                    const isSelected = selectedRouteCodes.includes(routeItem.routeCode)
                    const isRec = routeItem.classification === 'Recomendada'
                    const isPoss = routeItem.classification === 'Possível'

                    return (
                      <div
                        key={routeItem.routeCode}
                        onClick={() => handleToggleRoute(routeItem)}
                        className={`p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-50/90 border-l-4 border-[#005596]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 rounded text-[#005596] focus:ring-[#005596] cursor-pointer"
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-slate-900 text-xs">
                                {routeItem.routeCode}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono px-1 py-0 bg-slate-100 text-slate-700"
                              >
                                Itin: {routeItem.itineraryCode}
                              </Badge>
                              <Badge
                                className={`text-[9px] px-1.5 py-0 font-bold ${
                                  isRec
                                    ? 'bg-emerald-600 text-white'
                                    : isPoss
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-rose-600 text-white'
                                }`}
                              >
                                {routeItem.classification} ({routeItem.compatibilityScore}%)
                              </Badge>
                              {routeItem.isCustomerAlreadyInLoad && (
                                <Badge className="bg-sky-100 text-[#005596] border border-sky-300 text-[9px] font-bold">
                                  Mesmo Cliente (0 fracionamento extra)
                                </Badge>
                              )}
                              {routeItem.hasUrgency && (
                                <Badge className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] font-bold">
                                  Urgente / Prazo Crítico
                                </Badge>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-700 flex items-center gap-2 flex-wrap">
                              <span>
                                <strong>Destino:</strong> {routeItem.destinationCity}/
                                {routeItem.destinationUf}
                              </span>
                              <span>•</span>
                              <span>
                                <strong>Cliente(s):</strong> {routeItem.customerNames.join(', ')}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-500">
                                Pedido(s): {routeItem.orderNumbers.slice(0, 3).join(', ')}
                                {routeItem.orderNumbers.length > 3 ? '...' : ''}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-500 italic leading-snug">
                              IA: {routeItem.explanation}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                          <div>
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {(routeItem.totalWeightKg / 1000).toFixed(1)} t
                            </div>
                            <div className="text-[10px] font-mono text-amber-700 font-semibold">
                              +{routeItem.estimatedDistanceKm} km
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`text-[8px] px-1 py-0 ${
                                routeItem.stockStatusSummary === 'Estoque Pronto'
                                  ? 'bg-emerald-600 text-white'
                                  : routeItem.stockStatusSummary === 'Estoque Parcial'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-slate-600 text-white'
                              }`}
                            >
                              {routeItem.stockStatusSummary}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Comparativo Antes x Depois (Requisito 8) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900 text-xs uppercase">
                  2. Comparativo da Carga: Antes × Depois
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-100 text-[#005596] border border-sky-300 font-bold text-[10px]">
                  Desvio: +{metrics.additionalDistanceKm} km · {metrics.additionalTimeFormatted}
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                    <th className="p-2">Indicador Logístico</th>
                    <th className="p-2 text-right">Antes (Original)</th>
                    <th className="p-2 text-right">Depois (Com Adição)</th>
                    <th className="p-2 text-right">Variação / Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Peso da Carga</td>
                    <td className="p-2 text-right text-slate-600">
                      {metrics.weightBeforeTon.toFixed(1)} t
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.weightAfterTon.toFixed(1)} t
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-700">
                      +{(metrics.weightAfterTon - metrics.weightBeforeTon).toFixed(1)} t
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">
                      Ocupação do Veículo
                    </td>
                    <td className="p-2 text-right text-slate-600">{metrics.occupancyBeforePct}%</td>
                    <td className="p-2 text-right font-bold text-emerald-700">
                      {metrics.occupancyAfterPct}%
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-700">
                      +{metrics.occupancyAfterPct - metrics.occupancyBeforePct} p.p.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Clientes</td>
                    <td className="p-2 text-right text-slate-600">{metrics.clientsBefore}</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.clientsAfter}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      +{metrics.clientsAfter - metrics.clientsBefore}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td className="p-2 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                      <span>Fracionamentos</span>
                      {metrics.fractionationsDelta > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1 py-0 font-bold">
                          +{metrics.fractionationsDelta} fracionamento
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right text-slate-600">
                      {metrics.fractionationsBefore}
                    </td>
                    <td className="p-2 text-right font-bold text-amber-900">
                      {metrics.fractionationsAfter}
                    </td>
                    <td className="p-2 text-right font-bold text-amber-700">
                      {metrics.fractionationsDelta > 0
                        ? `+${metrics.fractionationsDelta}`
                        : '0 (mesmo cliente)'}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/40">
                    <td className="p-2 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                      <span>Remessas Previstas</span>
                      {metrics.remessasAfter > metrics.remessasBefore && (
                        <Badge className="bg-blue-100 text-[#005596] border-blue-300 text-[9px] px-1 py-0 font-bold">
                          +{metrics.remessasAfter - metrics.remessasBefore} remessa prevista
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right text-slate-600">{metrics.remessasBefore}</td>
                    <td className="p-2 text-right font-bold text-[#005596]">
                      {metrics.remessasAfter}
                    </td>
                    <td className="p-2 text-right font-bold text-blue-700">
                      +{metrics.remessasAfter - metrics.remessasBefore}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Descargas</td>
                    <td className="p-2 text-right text-slate-600">{metrics.dischargesBefore}</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.dischargesAfter}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      +{metrics.dischargesAfter - metrics.dischargesBefore}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Distância</td>
                    <td className="p-2 text-right text-slate-600">{metrics.distanceBeforeKm} km</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.distanceAfterKm} km
                    </td>
                    <td className="p-2 text-right font-bold text-amber-700">
                      +{metrics.additionalDistanceKm} km
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Tempo Estimado</td>
                    <td className="p-2 text-right text-slate-600">{metrics.timeBeforeFormatted}</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.timeAfterFormatted}
                    </td>
                    <td className="p-2 text-right font-bold text-amber-700">
                      {metrics.additionalTimeFormatted}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Frete Previsto</td>
                    <td className="p-2 text-right text-slate-600">
                      R$ {metrics.freightBeforeBrl.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      R$ {metrics.freightAfterBrl.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2 text-right text-slate-700 font-bold">
                      +R${' '}
                      {(metrics.freightAfterBrl - metrics.freightBeforeBrl).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Pedágio Previsto</td>
                    <td className="p-2 text-right text-slate-600">
                      R$ {metrics.tollBeforeBrl.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      R$ {metrics.tollAfterBrl.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      +R$ {(metrics.tollAfterBrl - metrics.tollBeforeBrl).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 font-sans text-slate-800">Custo por Tonelada (R$/t)</td>
                    <td className="p-2 text-right text-slate-700">
                      R$ {metrics.costPerTonBeforeBrl}/t
                    </td>
                    <td className="p-2 text-right text-[#005596]">
                      R$ {metrics.costPerTonAfterBrl}/t
                    </td>
                    <td className="p-2 text-right">
                      {metrics.costPerTonAfterBrl <= metrics.costPerTonBeforeBrl ? (
                        <span className="text-emerald-700 font-semibold">
                          -R$ {metrics.costPerTonBeforeBrl - metrics.costPerTonAfterBrl}/t
                          (Melhoria)
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">
                          +R$ {metrics.costPerTonAfterBrl - metrics.costPerTonBeforeBrl}/t
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 3: Justificativa Obrigatória com exatamente 16 opções (Requisito 5) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-900 text-xs uppercase">
                3. Motivo da Adição de Rota *
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                  Motivo Oficial da Adição * (16 opções):
                </label>
                <Select value={selectedReasonCode} onValueChange={setSelectedReasonCode}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50">
                    <SelectValue placeholder="Selecione o motivo da adição..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-60">
                    {ROUTE_ADDITION_REASONS.map((r) => (
                      <SelectItem key={r.code} value={r.code} className="py-1.5">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                  Observação{' '}
                  {selectedReasonCode === '16' ? (
                    <strong className="text-rose-600">(OBRIGATÓRIA PARA 'OUTRO') *</strong>
                  ) : (
                    '(Opcional)'
                  )}
                  :
                </label>
                <Textarea
                  value={userObservation}
                  onChange={(e) => setUserObservation(e.target.value)}
                  placeholder={
                    selectedReasonCode === '16'
                      ? 'Descreva obrigatoriamente a justificativa desta exceção operacional...'
                      : 'Observações adicionais para governança e auditoria...'
                  }
                  rows={2}
                  className="text-xs resize-none bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Análise IA da Adição de Rotas (Requisito 6) e Validação da Justificativa (Requisito 7) */}
          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-700 text-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-purple-900 text-xs uppercase">
                  Análise IA da Adição de Rotas & Validação de Justificativa
                </span>
              </div>
              <Badge
                className={`text-[9px] font-bold ${
                  aiAnalysis.alignment === 'Coerente'
                    ? 'bg-emerald-600 text-white'
                    : aiAnalysis.alignment === 'Parcialmente coerente'
                      ? 'bg-amber-500 text-white'
                      : aiAnalysis.alignment === 'Divergente'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-600 text-white'
                }`}
              >
                Classificação: {aiAnalysis.alignment}
              </Badge>
            </div>

            {/* Requisito 6: Análise Independente da Situação */}
            <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-purple-900 uppercase block">
                Parecer Técnico da IA (Situação Operacional):
              </span>
              <p className="text-slate-800 leading-relaxed font-sans">{aiAnalysis.diagnostic}</p>
            </div>

            {/* Requisito 7: Confronto IA x Usuário */}
            <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase">
                  Validação da Justificativa (Evidências da IA vs Motivo Informado):
                </span>
                <span className="font-mono text-[10px] text-purple-800 font-bold">
                  {aiAnalysis.alignment}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed italic">
                {aiAnalysis.alignmentConclusion}
              </p>
            </div>

            {/* Requisito 7: Alerta Exato em caso de divergência ou impacto elevado */}
            {aiAnalysis.hasRelevantImpactAlert && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs space-y-1.5 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Atenção:</span>
                </div>
                <div className="font-bold text-amber-950 bg-amber-100/80 p-2 rounded border border-amber-200">
                  "A justificativa informada não está plenamente sustentada pelos dados
                  disponíveis."
                </div>
                <div className="text-[10px] text-amber-700">
                  O usuário pode prosseguir caso possua permissão operacional, ficando o registro
                  auditado na base de conformidade. A IA não bloqueia automaticamente.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações (Requisito 10) */}
        <DialogFooter className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs h-9 font-semibold text-slate-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmAction}
            disabled={!canConfirm || isSubmitting}
            className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-9 font-bold px-5 shadow-sm"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Adição de Rotas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RouteAdditionModal
