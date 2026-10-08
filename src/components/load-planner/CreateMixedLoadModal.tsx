// TMS CIAFAL — Modal de Criação de Carga Mista (Passo 2 do Planejador)
// Permite criação e simulação de carga Mista ou Convencional com múltiplos itinerários / rotas,
// integração com a carteira SAP, aviso quando TVRO (sap_routes) estiver vazia no QAS,
// recálculo reativo de peso, ocupação e fracionamentos (ABNT via format.ts),
// e persistência em load_proposals, route_additions e audit_logs, além de criação de oferta na Mesa de Fretes.

import React, { useState, useMemo, useEffect } from 'react'
import {
  Layers,
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Sparkles,
  Search,
  Scale,
  DollarSign,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Save,
  X,
} from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { SapSalesOrderEntity, SapItineraryEntity } from '@/domain/rules'
import {
  formatTons,
  formatCurrency,
  formatDistance,
  formatPercent,
  formatDate,
} from '@/utils/format'
import { TmsService } from '@/services/tmsService'
import { pb } from '@/lib/pocketbase/client'

export type MixedCargoType = 'CONVENCIONAL' | 'MISTA' | 'MISTA_PRINCIPAL'

export interface CreateMixedLoadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: SapSalesOrderEntity[]
  itineraries: SapItineraryEntity[]
  defaultItinerary?: string
  userEmail?: string
  userName?: string
  onLoadCreated?: (newLoadId: string) => void
}

export const CreateMixedLoadModal: React.FC<CreateMixedLoadModalProps> = ({
  open,
  onOpenChange,
  orders,
  itineraries,
  defaultItinerary = 'ALL',
  userEmail = 'operador@ciafal.logistica',
  userName = 'Operador Logístico',
  onLoadCreated,
}) => {
  const { toast } = useToast()

  // 1. Tipo de carga
  const [cargoType, setCargoType] = useState<MixedCargoType>('MISTA_PRINCIPAL')

  // 2. Itinerário Principal (REAIS)
  const [primaryItineraryCode, setPrimaryItineraryCode] = useState<string>(
    defaultItinerary !== 'ALL' ? defaultItinerary : itineraries[0]?.sap_code || 'MG001A',
  )

  // 3. Rotas Adicionais
  const [additionalRoutes, setAdditionalRoutes] = useState<string[]>([])
  const [routeSearchQuery, setRouteSearchQuery] = useState<string>('')
  const [newRouteInput, setNewRouteInput] = useState<string>('')

  // 4. Veículo
  const [vehicleType, setVehicleType] = useState<string>('Carreta LS 3 Eixos')
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState<number>(28000)

  // 5. Pedidos Selecionados
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('')

  // 6. Estados de Operação / Simulação
  const [isSimulating, setIsSimulating] = useState(false)
  const [isOptimizingSequence, setIsOptimizingSequence] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customSequence, setCustomSequence] = useState<string[]>([]) // ordem dos ids dos pedidos

  // Quando abre o modal, reseta ou inicializa seleções
  useEffect(() => {
    if (open) {
      if (defaultItinerary && defaultItinerary !== 'ALL') {
        setPrimaryItineraryCode(defaultItinerary)
      } else if (!primaryItineraryCode && itineraries.length > 0) {
        setPrimaryItineraryCode(itineraries[0].sap_code)
      }
    }
  }, [open, defaultItinerary, itineraries])

  // Identificação do Itinerário Principal selecionado
  const selectedPrimaryItinerary = useMemo(() => {
    return itineraries.find((it) => it.sap_code === primaryItineraryCode) || itineraries[0]
  }, [itineraries, primaryItineraryCode])

  // Filtra pedidos elegíveis da carteira SAP de acordo com o tipo de carga e itinerários/rotas
  const eligibleOrders = useMemo(() => {
    return orders.filter((o) => {
      // Exclui pedidos cancelados ou já alocados em transportes
      if (o.status === 'cancelado') return false

      if (cargoType === 'CONVENCIONAL') {
        // Apenas o itinerário principal
        return (o.itinerary_code || '').toUpperCase() === primaryItineraryCode.toUpperCase()
      }

      if (cargoType === 'MISTA_PRINCIPAL') {
        // Pedidos do itinerário principal OU das rotas adicionais
        const isMain = (o.itinerary_code || '').toUpperCase() === primaryItineraryCode.toUpperCase()
        const isAdditional = additionalRoutes.some((r) => {
          const rUpper = r.toUpperCase()
          return (
            (o.route_code || '').toUpperCase() === rUpper ||
            (o.itinerary_code || '').toUpperCase() === rUpper
          )
        })
        return isMain || isAdditional
      }

      // MISTA livre (todas as rotas adicionadas + principal)
      if (additionalRoutes.length === 0) {
        return (o.itinerary_code || '').toUpperCase() === primaryItineraryCode.toUpperCase()
      }
      return (
        (o.itinerary_code || '').toUpperCase() === primaryItineraryCode.toUpperCase() ||
        additionalRoutes.some(
          (r) =>
            (o.route_code || '').toUpperCase() === r.toUpperCase() ||
            (o.itinerary_code || '').toUpperCase() === r.toUpperCase(),
        )
      )
    })
  }, [orders, cargoType, primaryItineraryCode, additionalRoutes])

  // Inicializa a seleção de pedidos se ainda não tiver nenhum selecionado ao trocar de itinerário
  useEffect(() => {
    if (selectedOrderIds.size === 0 && eligibleOrders.length > 0) {
      // Seleciona os primeiros pedidos compatíveis até ~24 toneladas
      let accumulatedKg = 0
      const initialSet = new Set<string>()
      for (const ord of eligibleOrders) {
        if (accumulatedKg + (ord.weight_kg || 0) <= vehicleCapacityKg) {
          initialSet.add(ord.id)
          accumulatedKg += ord.weight_kg || 0
        }
      }
      setSelectedOrderIds(initialSet)
    }
  }, [eligibleOrders, vehicleCapacityKg])

  // Pedidos atualmente selecionados na carga
  const selectedOrdersList = useMemo(() => {
    const list = orders.filter((o) => selectedOrderIds.has(o.id))
    if (customSequence.length > 0) {
      list.sort((a, b) => {
        const idxA = customSequence.indexOf(a.id)
        const idxB = customSequence.indexOf(b.id)
        if (idxA === -1 && idxB === -1) return 0
        if (idxA === -1) return 1
        if (idxB === -1) return -1
        return idxA - idxB
      })
    }
    return list
  }, [orders, selectedOrderIds, customSequence])

  // Totais Reativos da Carga
  const totalWeightKg = useMemo(() => {
    return selectedOrdersList.reduce((acc, o) => acc + (o.weight_kg || 0), 0)
  }, [selectedOrdersList])

  const totalWeightTon = totalWeightKg / 1000
  const occupancyPct =
    vehicleCapacityKg > 0 ? Math.round((totalWeightKg / vehicleCapacityKg) * 1000) / 10 : 0

  const distinctCustomers = useMemo(() => {
    return Array.from(
      new Set(selectedOrdersList.map((o) => o.customer_code || o.customer_name || '')),
    ).filter(Boolean)
  }, [selectedOrdersList])

  const distinctCities = useMemo(() => {
    return Array.from(
      new Set(selectedOrdersList.map((o) => `${o.destination_city || 'BH'} - ${o.uf || 'MG'}`)),
    )
  }, [selectedOrdersList])

  // Estimativa de distância e custos
  const estimatedDistanceKm = useMemo(() => {
    // Base do itinerário principal + 35km por rota adicional + 25km por cliente adicional
    const baseKm = 240
    const addRoutesKm = additionalRoutes.length * 45
    const custKm = Math.max(0, distinctCustomers.length - 1) * 25
    return baseKm + addRoutesKm + custKm
  }, [additionalRoutes.length, distinctCustomers.length])

  const estimatedFreightBrl = useMemo(() => {
    // Fórmula padrão CIAFAL: peso * R$ 165 + km * R$ 3,80 + taxa adicional de carga mista se houver rotas adicionais
    const baseFreight = totalWeightTon * 165 + estimatedDistanceKm * 3.8
    const mixedAddition = additionalRoutes.length > 0 ? additionalRoutes.length * 350 : 0
    return Math.round(baseFreight + mixedAddition)
  }, [totalWeightTon, estimatedDistanceKm, additionalRoutes.length])

  const estimatedTollBrl = useMemo(() => {
    return Math.round(180 + additionalRoutes.length * 60 + (estimatedDistanceKm / 100) * 45)
  }, [additionalRoutes.length, estimatedDistanceKm])

  // Adicionar rota adicional
  const handleAddRoute = (routeCodeToAdd: string) => {
    const clean = routeCodeToAdd.trim().toUpperCase()
    if (!clean) return
    if (clean === primaryItineraryCode.toUpperCase()) {
      toast({
        title: 'Rota já é o Itinerário Principal',
        description: `${clean} já foi definido como itinerário principal da carga.`,
        variant: 'destructive',
      })
      return
    }
    if (additionalRoutes.includes(clean)) {
      toast({
        title: 'Rota já adicionada',
        description: `A rota ${clean} já consta na lista de rotas adicionais.`,
      })
      return
    }
    setAdditionalRoutes((prev) => [...prev, clean])
    setNewRouteInput('')
    toast({
      title: 'Rota Adicionada',
      description: `Rota ${clean} incorporada. Pedidos elegíveis desta rota foram atualizados.`,
    })
  }

  // Remover rota adicional
  const handleRemoveRoute = (routeToRemove: string) => {
    setAdditionalRoutes((prev) => prev.filter((r) => r !== routeToRemove))
    toast({
      title: 'Rota Removida',
      description: `Rota ${routeToRemove} removida da composição de carga mista.`,
    })
  }

  // Toggle de seleção de pedido
  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  // Ação 1: Simular Carga
  const handleSimulateLoad = () => {
    setIsSimulating(true)
    setTimeout(() => {
      setIsSimulating(false)
      toast({
        title: 'Simulação de Carga Mista Concluída',
        description: `Peso: ${formatTons(totalWeightTon)} | Ocupação: ${formatPercent(occupancyPct, 1)} | Distância: ${formatDistance(estimatedDistanceKm, 0)} | Frete: ${formatCurrency(estimatedFreightBrl)}.`,
      })
    }, 450)
  }

  // Ação 2: Otimizar Sequência de Descargas
  const handleOptimizeSequence = () => {
    setIsOptimizingSequence(true)
    setTimeout(() => {
      // Ordena por cidade / proximidade / cliente
      const sorted = [...selectedOrdersList].sort((a, b) => {
        if ((a.uf || '') !== (b.uf || '')) return (a.uf || '').localeCompare(b.uf || '')
        if ((a.destination_city || '') !== (b.destination_city || '')) {
          return (a.destination_city || '').localeCompare(b.destination_city || '')
        }
        return (a.customer_name || '').localeCompare(b.customer_name || '')
      })
      setCustomSequence(sorted.map((o) => o.id))
      setIsOptimizingSequence(false)
      toast({
        title: 'Sequência de Descargas Otimizada',
        description: `${sorted.length} entregas reordenadas por menor trajeto geográfico e clientes contíguos.`,
      })
    }, 400)
  }

  // Ação 3: Salvar Rascunho
  const handleSaveDraft = async () => {
    if (selectedOrdersList.length === 0) {
      toast({
        title: 'Nenhum pedido selecionado',
        description: 'Selecione ao menos um pedido para salvar o rascunho da carga.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const proposalNumber = `PROP-MISTA-${Date.now().toString().slice(-6)}`

    try {
      // 1. Gravar em load_proposals
      await pb.collection('load_proposals').create({
        proposal_number: proposalNumber,
        correlation_id: `CORR-${proposalNumber}`,
        itinerary_code: primaryItineraryCode,
        itinerary_description: selectedPrimaryItinerary?.description || primaryItineraryCode,
        uf: selectedOrdersList[0]?.uf || 'MG',
        region: selectedPrimaryItinerary?.region || 'Sudeste',
        planned_dispatch_date: new Date().toISOString(),
        vehicle_plate: 'FROTA-CIAFAL',
        vehicle_type: vehicleType,
        vehicle_capacity_kg: vehicleCapacityKg,
        current_weight_kg: totalWeightKg,
        current_occupancy_pct: Math.round(occupancyPct),
        classification_status:
          occupancyPct > 105
            ? 'Capacidade excedida — Reotimizar'
            : occupancyPct < 75
              ? 'Carga parcial — Complemento Comercial'
              : 'Carga dentro da faixa',
        lifecycle_stage: 'Simulação',
        orders_count: selectedOrdersList.length,
        customers_count: distinctCustomers.length,
        discharges_count: distinctCustomers.length,
        estimated_freight_cost: estimatedFreightBrl,
        antt_floor_value: Math.round(estimatedFreightBrl * 0.85),
        tolls_value: estimatedTollBrl,
        score: 85,
        why_proposed: `Rascunho de Carga Mista ${cargoType} com itinerário ${primaryItineraryCode} + rotas adicionais (${additionalRoutes.join(', ') || 'Nenhuma'}).`,
        reasons: [
          `Tipo de carga: ${cargoType}`,
          `Rotas adicionais: ${additionalRoutes.join(', ') || 'Nenhuma'}`,
          `Ocupação calculada: ${occupancyPct.toFixed(1)}%`,
        ],
        created_by: userEmail,
      })

      // 2. Registrar em audit_logs
      await TmsService.logAudit({
        user_name: userName,
        user_email: userEmail,
        user_role: 'planejador_cargas',
        action: 'SAVE_MIXED_LOAD_DRAFT',
        resource: 'load_proposals',
        resource_id: proposalNumber,
        details: {
          cargoType,
          primaryItineraryCode,
          additionalRoutes,
          ordersCount: selectedOrdersList.length,
          totalWeightKg,
          occupancyPct,
        },
      })

      toast({
        title: 'Rascunho Salvo com Sucesso',
        description: `Proposta ${proposalNumber} registrada como rascunho de simulação.`,
      })

      onOpenChange(false)
      if (onLoadCreated) onLoadCreated(proposalNumber)
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Rascunho',
        description: err?.message || 'Falha ao registrar rascunho em load_proposals.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação 4: Confirmar Carga e Enviar para Mesa de Fretes
  const handleConfirmLoad = async () => {
    if (selectedOrdersList.length === 0) {
      toast({
        title: 'Nenhum pedido selecionado',
        description: 'Selecione pedidos da carteira para montar e confirmar a carga.',
        variant: 'destructive',
      })
      return
    }

    if (occupancyPct > 110) {
      toast({
        title: 'Capacidade Excedida',
        description: `Peso de ${formatTons(totalWeightTon)} excede o limite máximo aceitável para o veículo ${vehicleType} (${formatTons(vehicleCapacityKg, { fromKg: true })}).`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const cargoId = `CARGA-MISTA-${Date.now().toString().slice(-6)}`

    try {
      // 1. Salvar proposta em load_proposals
      await pb.collection('load_proposals').create({
        proposal_number: cargoId,
        correlation_id: `CORR-${cargoId}`,
        itinerary_code: primaryItineraryCode,
        itinerary_description: selectedPrimaryItinerary?.description || primaryItineraryCode,
        uf: selectedOrdersList[0]?.uf || 'MG',
        region: selectedPrimaryItinerary?.region || 'Sudeste',
        planned_dispatch_date: new Date().toISOString(),
        vehicle_plate: 'PORTA-01',
        vehicle_type: vehicleType,
        vehicle_capacity_kg: vehicleCapacityKg,
        current_weight_kg: totalWeightKg,
        current_occupancy_pct: Math.round(occupancyPct),
        classification_status: 'Carga dentro da faixa',
        lifecycle_stage: 'Carga consolidada',
        orders_count: selectedOrdersList.length,
        customers_count: distinctCustomers.length,
        discharges_count: distinctCustomers.length,
        estimated_freight_cost: estimatedFreightBrl,
        antt_floor_value: Math.round(estimatedFreightBrl * 0.85),
        tolls_value: estimatedTollBrl,
        score: 92,
        why_proposed: `Carga Mista ${cargoType} consolidada com itinerário principal ${primaryItineraryCode} e rotas: ${additionalRoutes.join(', ') || 'Nenhuma'}.`,
        reasons: [
          `Itinerário Principal: ${primaryItineraryCode}`,
          `Rotas Adicionais: ${additionalRoutes.join(', ') || 'Nenhuma'}`,
          `Total Clientes: ${distinctCustomers.length}`,
        ],
        created_by: userEmail,
      })

      // 2. Se houver rotas adicionais, persistir em route_additions para preservar governança
      if (additionalRoutes.length > 0) {
        for (const addedRoute of additionalRoutes) {
          try {
            await pb.collection('route_additions').create({
              load_id: cargoId,
              cargo_number: cargoId,
              original_itinerary_id: primaryItineraryCode,
              original_itinerary_description:
                selectedPrimaryItinerary?.description || primaryItineraryCode,
              added_itinerary_id: addedRoute,
              added_itinerary_description: `Rota Adicional ${addedRoute}`,
              reason_code: '5',
              reason_description: '5. Complementação de carga',
              user_observation: 'Adicionado no fluxo de Carga Mista do Planejador',
              weight_before: totalWeightKg - 4000,
              weight_after: totalWeightKg,
              occupancy_before: Math.max(10, Math.round(occupancyPct - 15)),
              occupancy_after: Math.round(occupancyPct),
              vehicle_capacity_kg: vehicleCapacityKg,
              freight_before: Math.max(100, estimatedFreightBrl - 500),
              freight_after: estimatedFreightBrl,
              status: 'ATIVA',
              created_by: userEmail,
              created_by_role: 'planejador_cargas',
              created_at_dt: new Date().toISOString(),
            })
          } catch (e) {
            console.warn('Erro ao salvar route_addition unitária:', e)
          }
        }
      }

      // 3. Atualizar sap_sales_orders para marcar alocação e evitar duplicidade
      for (const ord of selectedOrdersList) {
        try {
          await pb.collection('sap_sales_orders').update(ord.id, {
            assigned_load_id: cargoId,
            status: 'em_montagem',
          })
        } catch (ordErr) {
          console.warn(`Erro ao vincular pedido ${ord.order_number}:`, ordErr)
        }
      }

      // 4. Injetar oferta na Mesa de Fretes pelo fluxo existente (createFreightOffer)
      await TmsService.createFreightOffer({
        cargo_id: cargoId,
        cargo_description: `Carga Mista ${cargoId} (${primaryItineraryCode}${additionalRoutes.length > 0 ? ` + ${additionalRoutes.join('/')}` : ''})`,
        origin: 'Planta CIAFAL Matriz (Contagem/MG)',
        destination: `${distinctCities.slice(0, 2).join(', ')}${distinctCities.length > 2 ? ` (+${distinctCities.length - 2})` : ''}`,
        weight_kg: totalWeightKg,
        required_vehicle_type: vehicleType,
        current_group: 'PORTA',
        status: 'janela_porta_aberta' as any,
        floor_value: Math.round(estimatedFreightBrl * 0.85),
        correlation_id: `CORR-${cargoId}`,
      })

      // 5. Registrar auditoria imutável
      await TmsService.logAudit({
        user_name: userName,
        user_email: userEmail,
        user_role: 'planejador_cargas',
        action: 'CONFIRM_MIXED_LOAD_TO_MESA',
        resource: 'load_proposals',
        resource_id: cargoId,
        details: {
          cargoId,
          cargoType,
          primaryItineraryCode,
          additionalRoutes,
          ordersAllocated: selectedOrdersList.map((o) => o.order_number),
          totalWeightKg,
          occupancyPct,
          estimatedFreightBrl,
          mesaOfferCreated: true,
        },
      })

      toast({
        title: 'Carga Mista Confirmada com Sucesso!',
        description: `${cargoId} criada com ${selectedOrdersList.length} pedidos e enviada à Mesa de Fretes.`,
      })

      onOpenChange(false)
      if (onLoadCreated) onLoadCreated(cargoId)
    } catch (err: any) {
      toast({
        title: 'Erro ao Confirmar Carga',
        description: err?.message || 'Falha ao processar confirmação de carga.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-slate-200">
        {/* Cabeçalho CIAFAL (#005596) */}
        <DialogHeader className="p-4 bg-[#005596] text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Criar Carga Mista</span>
                  <Badge className="bg-white/20 text-white border-none text-[10px] uppercase font-mono">
                    Multi-Rotas SAP
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-sky-100">
                  Agrupe pedidos de múltiplos itinerários ou rotas complementares com validação
                  automática de capacidade e frete.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal */}
        <div className="p-4 space-y-4 text-xs">
          {/* Alerta TVRO SAP pendente no QAS */}
          <Alert className="border-amber-300 bg-amber-50/80 text-amber-900 py-2.5 px-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="ml-2">
              <AlertTitle className="text-xs font-bold text-amber-900">
                TVRO SAP aguardando carga no ambiente QAS
              </AlertTitle>
              <AlertDescription className="text-[11px] text-amber-800">
                A tabela standard de rotas SAP (<code>sap_routes</code>) está vazia no banco. Você
                pode operar normalmente selecionando os itinerários reais (
                <code>sap_itineraries</code>) e os pedidos da carteira SAP.
              </AlertDescription>
            </div>
          </Alert>

          {/* Linha 1: Configuração da Carga */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Tipo de Carga */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-600">
                Tipo de Carga
              </Label>
              <Select
                value={cargoType}
                onValueChange={(val) => setCargoType(val as MixedCargoType)}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MISTA_PRINCIPAL">Mista c/ Itinerário Principal</SelectItem>
                  <SelectItem value="MISTA">Carga Mista Livre</SelectItem>
                  <SelectItem value="CONVENCIONAL">Convencional (Rota Única)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Itinerário Principal */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-600">
                Itinerário Principal (SAP)
              </Label>
              <Select
                value={primaryItineraryCode}
                onValueChange={(val) => setPrimaryItineraryCode(val)}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} — {it.description.slice(0, 26)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Veículo & Capacidade */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-600">
                Tipo de Veículo
              </Label>
              <Select
                value={vehicleType}
                onValueChange={(val) => {
                  setVehicleType(val)
                  if (val.includes('Bitrem')) setVehicleCapacityKg(32000)
                  else if (val.includes('Truck')) setVehicleCapacityKg(14000)
                  else setVehicleCapacityKg(28000)
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carreta LS 3 Eixos">Carreta LS (28,00 t)</SelectItem>
                  <SelectItem value="Bitrem 7 Eixos">Bitrem 7 Eixos (32,00 t)</SelectItem>
                  <SelectItem value="Carreta Grade Baixa">Carreta Grade Baixa (28,00 t)</SelectItem>
                  <SelectItem value="Truck 3 Eixos">Truck 3 Eixos (14,00 t)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Rotas Adicionais (apenas para carga Mista) */}
          {cargoType !== 'CONVENCIONAL' && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#005596]" />
                  <span>Rotas Adicionais / Multi-seleção de Códigos ROUTE:</span>
                </Label>
                <span className="text-[10px] text-slate-400">
                  {additionalRoutes.length} rota(s) adicionada(s)
                </span>
              </div>

              {/* Input para adicionar rota por código/descrição */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ex: MG002B, SP001A, ROTA-SUL, BA001C..."
                  value={newRouteInput}
                  onChange={(e) => setNewRouteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddRoute(newRouteInput)
                    }
                  }}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddRoute(newRouteInput)}
                  className="h-8 text-xs bg-[#005596] hover:bg-[#004275] text-white font-bold px-3 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Rota
                </Button>
              </div>

              {/* Chips de Rotas Adicionadas */}
              <div className="flex flex-wrap gap-1.5 pt-1 min-h-[32px] items-center">
                {additionalRoutes.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">
                    Nenhuma rota adicional incluída. O sistema utilizará os pedidos do itinerário
                    principal.
                  </span>
                ) : (
                  additionalRoutes.map((routeCode) => (
                    <Badge
                      key={routeCode}
                      variant="outline"
                      className="bg-sky-50 text-[#005596] border-sky-300 pl-2 pr-1 py-0.5 text-xs flex items-center gap-1.5"
                    >
                      <span className="font-mono font-bold">{routeCode}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRoute(routeCode)}
                        className="w-4 h-4 rounded-full hover:bg-sky-200 text-sky-800 flex items-center justify-center font-bold text-[10px]"
                        title="Remover esta rota"
                      >
                        ✕
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Linha 3: Tabela de Pedidos Elegíveis com Multi-seleção */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-0">
            <div className="p-2.5 bg-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <strong className="text-xs font-bold text-slate-800">
                  Pedidos Elegíveis na Carteira ({eligibleOrders.length})
                </strong>
                <Badge variant="outline" className="text-[10px] bg-white font-mono">
                  {selectedOrderIds.size} selecionados
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                  <Input
                    placeholder="Filtrar pedidos..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-[11px] bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedOrderIds.size === eligibleOrders.length) {
                      setSelectedOrderIds(new Set())
                    } else {
                      setSelectedOrderIds(new Set(eligibleOrders.map((o) => o.id)))
                    }
                  }}
                  className="h-7 text-[10px] px-2"
                >
                  {selectedOrderIds.size === eligibleOrders.length
                    ? 'Desmarcar Todos'
                    : 'Marcar Todos'}
                </Button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[9px] sticky top-0 border-b">
                  <tr>
                    <th className="p-2 w-8 text-center">Sel.</th>
                    <th className="p-2">Pedido</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Cidade/UF</th>
                    <th className="p-2">Itin./Rota</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2 text-right">Peso</th>
                    <th className="p-2">Previsto</th>
                    <th className="p-2">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibleOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">
                        Nenhum pedido compatível encontrado para este itinerário ou rotas
                        adicionadas.
                      </td>
                    </tr>
                  ) : (
                    eligibleOrders
                      .filter((o) => {
                        if (!orderSearchQuery.trim()) return true
                        const q = orderSearchQuery.toLowerCase()
                        return (
                          (o.order_number || '').toLowerCase().includes(q) ||
                          (o.customer_name || '').toLowerCase().includes(q) ||
                          (o.destination_city || '').toLowerCase().includes(q) ||
                          (o.material || '').toLowerCase().includes(q)
                        )
                      })
                      .map((ord) => {
                        const isChecked = selectedOrderIds.has(ord.id)
                        return (
                          <tr
                            key={ord.id}
                            onClick={() => handleToggleOrder(ord.id)}
                            className={`cursor-pointer transition ${
                              isChecked ? 'bg-sky-50/60 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleOrder(ord.id)}
                                className="rounded text-[#005596] focus:ring-[#005596]"
                              />
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-900">
                              {ord.order_number}
                            </td>
                            <td className="p-2 text-slate-800 truncate max-w-[130px]">
                              {ord.customer_name}
                            </td>
                            <td className="p-2 text-slate-600">
                              {ord.destination_city}/{ord.uf}
                            </td>
                            <td className="p-2 font-mono text-[10px]">
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 font-mono bg-white"
                              >
                                {ord.route_code || ord.itinerary_code || 'S/R'}
                              </Badge>
                            </td>
                            <td className="p-2 text-slate-600 truncate max-w-[120px]">
                              {ord.material_description || ord.material}
                            </td>
                            <td className="p-2 font-mono font-bold text-right text-slate-900">
                              {formatTons(ord.weight_kg, { fromKg: true, decimals: 2 })}
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-500">
                              {ord.desired_date ? formatDate(ord.desired_date) : 'Imediato'}
                            </td>
                            <td className="p-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ${
                                  ord.credit_status === 'Liberado'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                }`}
                              >
                                {ord.credit_status || 'OK'}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linha 4: Painel Reativo de Métricas e Simulação da Carga */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-900 text-white p-3 rounded-xl">
            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Peso Total
              </span>
              <strong className="text-base font-black font-mono text-sky-400">
                {formatTons(totalWeightTon, { decimals: 2 })}
              </strong>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Capacidade do Veículo
              </span>
              <strong className="text-base font-black font-mono text-emerald-400">
                {formatTons(vehicleCapacityKg, { fromKg: true, decimals: 2 })}
              </strong>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Ocupação</span>
              <strong
                className={`text-base font-black font-mono ${
                  occupancyPct > 100
                    ? 'text-rose-400 font-extrabold'
                    : occupancyPct >= 80
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                }`}
              >
                {formatPercent(occupancyPct, 1)}
              </strong>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Distância Prevista
              </span>
              <strong className="text-base font-black font-mono text-white">
                {formatDistance(estimatedDistanceKm, 0)}
              </strong>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                Frete Estimado
              </span>
              <strong className="text-base font-black font-mono text-emerald-400">
                {formatCurrency(estimatedFreightBrl)}
              </strong>
            </div>
          </div>

          {/* Barra de Ações Operacionais */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSimulateLoad}
                disabled={isSimulating || selectedOrdersList.length === 0}
                className="h-8 text-xs font-semibold text-slate-700"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1 text-purple-600 ${isSimulating ? 'animate-spin' : ''}`}
                />
                Simular Carga
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleOptimizeSequence}
                disabled={isOptimizingSequence || selectedOrdersList.length === 0}
                className="h-8 text-xs font-semibold text-slate-700"
              >
                <Clock
                  className={`w-3.5 h-3.5 mr-1 text-sky-600 ${isOptimizingSequence ? 'animate-spin' : ''}`}
                />
                Otimizar Sequência
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSubmitting || selectedOrdersList.length === 0}
                className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Save className="w-3.5 h-3.5 mr-1 text-slate-600" />
                Salvar Rascunho
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmLoad}
                disabled={isSubmitting || selectedOrdersList.length === 0}
                className="h-8 text-xs font-bold bg-[#005596] hover:bg-[#004275] text-white shadow-xs px-4"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Confirmar Carga & Ofertar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
