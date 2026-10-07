// TMS CIAFAL — Modal de Adição Excepcional de Rota ao Itinerário
// Conforme Seções 2, 3, 4, 5, 6, 7, 8, 9, 21, 22 da especificação técnica.

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
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Truck,
  Plus,
  Trash2,
  Route,
  Search,
  Scale,
  Calendar,
  Building,
  ShieldAlert,
} from 'lucide-react'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'
import {
  ROUTE_ADDITION_REASONS,
  calculateRouteAdditionMetrics,
  generateRouteAdditionAiAnalysis,
  RouteAdditionEntity,
} from '@/domain/routeAdditionEngine'

interface RouteAdditionModalProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  cargoNumber?: string
  originalItineraryCode?: string
  originalItineraryDesc?: string
  currentOrders?: SapSalesOrderEntity[]
  availableOrders?: SapSalesOrderEntity[] // Carteira SAP unificada elegível
  availableItineraries?: SapItineraryEntity[]
  vehicleCapacityKg?: number
  vehiclePlate?: string
  candidateLoad?: any
  onSuccess?: () => void
  onConfirm?: (
    additionData: RouteAdditionEntity,
    addedOrders: SapSalesOrderEntity[],
  ) => Promise<void>
  currentUserEmail?: string
  currentUserRole?: string
}

export const RouteAdditionModal: React.FC<RouteAdditionModalProps> = ({
  isOpen: isOpenProp,
  open: openProp,
  onClose,
  onOpenChange,
  cargoNumber: cargoNumberProp,
  originalItineraryCode: origItinProp,
  originalItineraryDesc: origDescProp,
  currentOrders: currentOrdersProp,
  availableOrders: availableOrdersProp,
  availableItineraries: availableItinProp,
  vehicleCapacityKg: vehicleCapacityKgProp,
  vehiclePlate,
  candidateLoad,
  onSuccess,
  onConfirm,
  currentUserEmail = 'operador@ciafal.logistica',
  currentUserRole = 'planejador_cargas',
}) => {
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
  // Estado da seleção da rota complementar e pedidos
  const [selectedItineraryCode, setSelectedItineraryCode] = useState<string>('')
  const [selectedComplementaryOrders, setSelectedComplementaryOrders] = useState<
    SapSalesOrderEntity[]
  >([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedUf, setSelectedUf] = useState<string>('ALL')

  // Justificativa obrigatória (Item 4)
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('')
  const [userObservation, setUserObservation] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reseta ao abrir
  useEffect(() => {
    if (isModalOpen) {
      setSelectedItineraryCode('')
      setSelectedComplementaryOrders([])
      setSelectedReasonCode('')
      setUserObservation('')
      setSearchTerm('')
      setSelectedUf('ALL')
      setIsSubmitting(false)
    }
  }, [isModalOpen])

  // Itinerários complementares (exclui o original da carga)
  const complementaryItineraries = useMemo(() => {
    return availableItineraries.filter(
      (it) => it.sap_code !== originalItineraryCode && it.is_active,
    )
  }, [availableItineraries, originalItineraryCode])

  // Pedidos elegíveis para a rota complementar selecionada
  const eligibleComplementaryOrders = useMemo(() => {
    const currentOrderIds = new Set(currentOrders.map((o) => o.id))
    return availableOrders.filter((order) => {
      // Não pode já estar na carga atual
      if (currentOrderIds.has(order.id)) return false
      // Se selecionou itinerário complementar específico
      if (selectedItineraryCode && order.itinerary_code !== selectedItineraryCode) return false
      // Filtro por UF
      if (selectedUf !== 'ALL' && order.uf !== selectedUf) return false
      // Busca textual
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesCustomer = order.customer_name?.toLowerCase().includes(term)
        const matchesCity = order.destination_city?.toLowerCase().includes(term)
        const matchesOrder = order.order_number?.toLowerCase().includes(term)
        const matchesMaterial = order.material?.toLowerCase().includes(term)
        const matchesItin = order.itinerary_code?.toLowerCase().includes(term)
        if (!matchesCustomer && !matchesCity && !matchesOrder && !matchesMaterial && !matchesItin) {
          return false
        }
      }
      return true
    })
  }, [availableOrders, currentOrders, selectedItineraryCode, selectedUf, searchTerm])

  const handleToggleOrderSelection = (order: SapSalesOrderEntity) => {
    setSelectedComplementaryOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id)
      if (exists) {
        return prev.filter((o) => o.id !== order.id)
      } else {
        // Se ainda não selecionou itinerário e adicionou pedido, sincroniza com o itinerário do pedido
        if (!selectedItineraryCode && order.itinerary_code) {
          setSelectedItineraryCode(order.itinerary_code)
        }
        return [...prev, order]
      }
    })
  }

  // 1. Cálculo de Métricas Comparativas Antes x Depois (Item 8)
  const metrics = useMemo(() => {
    return calculateRouteAdditionMetrics({
      currentOrders,
      addedOrders: selectedComplementaryOrders,
      vehicleCapacityKg,
      baseDistanceKm: 210,
    })
  }, [currentOrders, selectedComplementaryOrders, vehicleCapacityKg])

  // 2. Análise de IA em Tempo Real (Item 5, 6, 7)
  const aiAnalysis = useMemo(() => {
    return generateRouteAdditionAiAnalysis({
      originalItineraryCode,
      addedItineraryCode:
        selectedItineraryCode || selectedComplementaryOrders[0]?.itinerary_code || 'COMPLEMENTAR',
      metrics,
      addedOrders: selectedComplementaryOrders,
      selectedReasonCode,
      userObservation,
    })
  }, [
    originalItineraryCode,
    selectedItineraryCode,
    metrics,
    selectedComplementaryOrders,
    selectedReasonCode,
    userObservation,
  ])

  // Validação para confirmação (Item 4)
  const canConfirm = useMemo(() => {
    if (selectedComplementaryOrders.length === 0) return false
    if (!selectedReasonCode) return false
    // Se "Outro" (17), observação é obrigatória com ao menos 5 caracteres
    if (selectedReasonCode === '17' && userObservation.trim().length < 5) return false
    return true
  }, [selectedComplementaryOrders, selectedReasonCode, userObservation])

  const handleConfirmAction = async () => {
    if (!canConfirm) return

    setIsSubmitting(true)
    try {
      const reasonObj = ROUTE_ADDITION_REASONS.find((r) => r.code === selectedReasonCode)
      const addedItinDesc =
        availableItineraries.find((it) => it.sap_code === selectedItineraryCode)?.description ||
        selectedItineraryCode

      const primaryAddedOrder = selectedComplementaryOrders[0]

      const additionRecord: RouteAdditionEntity = {
        load_id: cargoNumber,
        cargo_number: cargoNumber,
        original_itinerary_id: originalItineraryCode,
        original_itinerary_description:
          originalItineraryDesc || `Itinerário ${originalItineraryCode}`,
        added_itinerary_id: selectedItineraryCode || primaryAddedOrder.itinerary_code,
        added_itinerary_description: addedItinDesc,
        customer_code: primaryAddedOrder.customer_code,
        customer_name: primaryAddedOrder.customer_name,
        destination_city: primaryAddedOrder.destination_city,
        destination_uf: primaryAddedOrder.uf,
        order_numbers_json: selectedComplementaryOrders.map((o) => o.order_number),
        reason_code: selectedReasonCode,
        reason_description: reasonObj?.label || 'Adição Excepcional',
        user_observation: userObservation.trim(),
        ai_analysis: aiAnalysis.diagnostic,
        ai_user_alignment: aiAnalysis.alignment,
        ai_risk_level: aiAnalysis.riskLevel,
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
        // Fallback direto via TmsService se invocado a partir do LogisticalMapTowerView
        const { TmsService } = await import('@/services/tmsService')
        await TmsService.createRouteAddition(additionRecord)
      }
      if (onSuccess) onSuccess()
      handleClose()
    } catch (err) {
      console.error('Falha ao confirmar adição de rota:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const primaryCity = currentOrders[0]?.destination_city || 'Regional'
  const primaryUf = currentOrders[0]?.uf || 'MG'

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <DialogHeader className="p-4 bg-[#005596] text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Route className="w-4 h-4 text-sky-200" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">
                  Adicionar rota ao itinerário
                </DialogTitle>
                <DialogDescription className="text-xs text-sky-100 font-medium">
                  Exceção controlada · Carga {cargoNumber} · Itinerário SAP {originalItineraryCode}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 border-none">
              Exceção Controlada
            </Badge>
          </div>
        </DialogHeader>

        {/* Resumo no topo da carga atual (Item 2) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Itinerário Orig.
              </span>
              <strong className="text-xs font-mono text-[#005596]">{originalItineraryCode}</strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Destino Princ.
              </span>
              <strong className="text-xs text-slate-800 truncate block">
                {primaryCity}/{primaryUf}
              </strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Peso Atual
              </span>
              <strong className="text-xs font-mono text-slate-900">
                {metrics.weightBeforeTon.toFixed(1)} t
              </strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Capacidade
              </span>
              <strong className="text-xs font-mono text-slate-700">
                {((vehicleCapacityKg || 28000) / 1000).toFixed(1)} t
              </strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Ocupação Atual
              </span>
              <strong className="text-xs font-mono text-emerald-700">
                {metrics.occupancyBeforePct}%
              </strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Clientes / Entr.
              </span>
              <strong className="text-xs font-mono text-slate-900">
                {metrics.clientsBefore} / {metrics.dischargesBefore}
              </strong>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Frete Estimado
              </span>
              <strong className="text-xs font-mono text-slate-900">
                R$ {metrics.freightBeforeBrl.toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Seção 1: Seleção da Rota Complementar e Pedidos SAP (Item 3) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase">
                <Route className="w-4 h-4 text-[#005596]" />
                <span>1. Seleção da Rota Complementar (Carteira SAP Real)</span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] text-sky-700 bg-sky-50 border-sky-300"
              >
                {selectedComplementaryOrders.length} pedido(s) selecionado(s)
              </Badge>
            </div>

            {/* Filtros de Pesquisa da Rota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Itinerário SAP Complementar:
                </label>
                <Select value={selectedItineraryCode} onValueChange={setSelectedItineraryCode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o Itinerário SAP..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    <SelectItem value="">Todos os Itinerários Complementares</SelectItem>
                    {complementaryItineraries.map((it) => (
                      <SelectItem key={it.sap_code} value={it.sap_code}>
                        {it.sap_code} — {it.description} ({it.destination_uf || 'BR'})
                      </SelectItem>
                    ))}
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

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Buscar Cliente, Pedido ou Cidade:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Pedidos da Carteira SAP Elegíveis */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {eligibleComplementaryOrders.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 italic text-xs">
                    Nenhum pedido compatível encontrado com os filtros selecionados.
                  </div>
                ) : (
                  eligibleComplementaryOrders.map((order) => {
                    const isSelected = selectedComplementaryOrders.some((o) => o.id === order.id)
                    return (
                      <div
                        key={order.id}
                        onClick={() => handleToggleOrderSelection(order)}
                        className={`p-2 flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-50/80 border-l-4 border-[#005596]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-[#005596] focus:ring-[#005596]"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {order.order_number}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono px-1 py-0 bg-slate-50"
                              >
                                {order.itinerary_code}
                              </Badge>
                              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                                {order.customer_name}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>
                                {order.destination_city}/{order.uf}
                              </span>
                              <span>•</span>
                              <span>{order.material}</span>
                              <span>•</span>
                              <span>Descarga: {order.discharge_type || 'Padrão'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">
                            {((order.weight_kg || 0) / 1000).toFixed(1)} t
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Badge
                              className={`text-[8px] px-1 py-0 ${
                                order.production_status === 'Pronto'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              PCP: {order.production_status}
                            </Badge>
                            <Badge
                              className={`text-[8px] px-1 py-0 ${
                                order.credit_status === 'Liberado'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              Crédito: {order.credit_status}
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

          {/* Seção 2: Comparativo Antes x Depois (Item 8) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>2. Comparativo da Carga: Antes × Depois</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-100 text-[#005596] border border-sky-300 font-bold text-[10px]">
                  Desvio: +{metrics.additionalDistanceKm} km / +{metrics.additionalTimeMinutes} min
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
                    <td className="p-2 font-sans font-medium text-slate-700">
                      Quantidade de Clientes
                    </td>
                    <td className="p-2 text-right text-slate-600">{metrics.clientsBefore}</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.clientsAfter}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      +{metrics.clientsAfter - metrics.clientsBefore}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">
                      Número de Descargas
                    </td>
                    <td className="p-2 text-right text-slate-600">{metrics.dischargesBefore}</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.dischargesAfter}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      +{metrics.dischargesAfter - metrics.dischargesBefore}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td className="p-2 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                      <span>Fracionamentos</span>
                      {metrics.fractionationsDelta > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1 py-0 font-bold">
                          +{metrics.fractionationsDelta} fracionamento
                          {metrics.fractionationsDelta > 1 ? 's' : ''}
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
                        : metrics.fractionationsDelta}
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
                      {metrics.remessasAfter - metrics.remessasBefore > 0
                        ? `+${metrics.remessasAfter - metrics.remessasBefore}`
                        : metrics.remessasAfter - metrics.remessasBefore}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">Distância Estimada</td>
                    <td className="p-2 text-right text-slate-600">{metrics.distanceBeforeKm} km</td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {metrics.distanceAfterKm} km
                    </td>
                    <td className="p-2 text-right font-bold text-amber-700">
                      +{metrics.additionalDistanceKm} km
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium text-slate-700">
                      Custo Frete Estimado
                    </td>
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
                    <td className="p-2 font-sans font-medium text-slate-700">Pedágio Estimado</td>
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
                      R$ {metrics.costPerTonBeforeBrl}
                    </td>
                    <td className="p-2 text-right text-[#005596]">
                      R$ {metrics.costPerTonAfterBrl}
                    </td>
                    <td className="p-2 text-right">
                      {metrics.costPerTonAfterBrl <= metrics.costPerTonBeforeBrl ? (
                        <span className="text-emerald-700">
                          -R$ {metrics.costPerTonBeforeBrl - metrics.costPerTonAfterBrl}/t
                          (Melhoria)
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          +R$ {metrics.costPerTonAfterBrl - metrics.costPerTonBeforeBrl}/t
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 3: Justificativa Obrigatória (Item 4) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase border-b border-slate-100 pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>3. Justificativa Obrigatória de Exceção *</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Motivo da adição de rota * (Selecione uma das 17 opções padrão):
                </label>
                <Select value={selectedReasonCode} onValueChange={setSelectedReasonCode}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Selecione o motivo oficial da adição..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-60">
                    {ROUTE_ADDITION_REASONS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Observação do usuário{' '}
                  {selectedReasonCode === '17' ? '(Obrigatória para "Outro") *' : '(Opcional):'}
                </label>
                <Textarea
                  value={userObservation}
                  onChange={(e) => setUserObservation(e.target.value)}
                  placeholder={
                    selectedReasonCode === '17'
                      ? 'Descreva obrigatoriamente a necessidade operacional desta adição...'
                      : 'Complemente com detalhes operacionais, contato com cliente ou contexto logístico...'
                  }
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Análise Automática de IA (Item 5, 6, 7) */}
          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-purple-900 text-xs uppercase">
                  ANÁLISE DE IA — ADIÇÃO DE ROTA
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
                Avaliação: {aiAnalysis.alignment}
              </Badge>
            </div>

            {/* Diagnóstico Objetivo da IA (Item 5) */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200 text-xs">
              <span className="text-[10px] font-bold text-purple-900 uppercase block mb-1">
                Diagnóstico Objetivo da IA:
              </span>
              <p className="text-slate-800 leading-relaxed font-sans">{aiAnalysis.diagnostic}</p>
            </div>

            {/* Bloco de Contraposição IA x Justificativa (Item 6) */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase">
                  Avaliação da Justificativa Informada × Diagnóstico Técnico:
                </span>
                <span className="font-mono text-[10px] text-purple-800 font-bold">
                  Classificação: {aiAnalysis.alignment}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed italic">
                {aiAnalysis.alignmentConclusion}
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                A IA analisa e registra a conclusão para governança — a decisão permanece de
                responsabilidade do usuário.
              </div>
            </div>

            {/* Alerta de Decisão Fora do Padrão (Item 7) */}
            {aiAnalysis.hasRelevantImpactAlert && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-xs space-y-2 text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Atenção — adição de rota com impacto relevante:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-mono">
                  <li>+{aiAnalysis.alertDetails?.additionalKm} km de desvio logístico</li>
                  <li>
                    +{aiAnalysis.alertDetails?.additionalDischarges} descarga(s) adicional(is)
                  </li>
                  <li>
                    Aumento estimado de R${' '}
                    {aiAnalysis.alertDetails?.freightIncreaseBrl.toLocaleString('pt-BR')} no frete
                  </li>
                  <li>
                    Ocupação melhora de {aiAnalysis.alertDetails?.occupancyBeforePct}% para{' '}
                    {aiAnalysis.alertDetails?.occupancyAfterPct}% (+
                    {(aiAnalysis.alertDetails?.occupancyAfterPct || 0) -
                      (aiAnalysis.alertDetails?.occupancyBeforePct || 0)}{' '}
                    p.p.)
                  </li>
                  {!aiAnalysis.alertDetails?.hasUrgency && (
                    <li>Não existe urgência identificada nos pedidos</li>
                  )}
                </ul>
                <div className="font-bold text-rose-800 bg-rose-100/70 p-2 rounded border border-rose-200">
                  "A IA identificou impacto logístico superior ao benefício estimado. Revise a
                  decisão antes de confirmar."
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações (Item 9) */}
        <DialogFooter className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 font-semibold text-slate-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmAction}
            disabled={!canConfirm || isSubmitting}
            className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-9 font-bold px-4 shadow-sm"
          >
            {isSubmitting ? 'Gravando e Recalculando...' : 'Confirmar adição de rota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default RouteAdditionModal
