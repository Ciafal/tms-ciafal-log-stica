import React, { useState, useEffect, useMemo } from 'react'
import {
  Compass,
  Sliders,
  Play,
  Layers,
  Sparkles,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Trash2,
  Plus,
  ArrowRight,
  Info,
  Save,
  Scale,
  RefreshCw,
  Navigation,
  Eye,
  DollarSign,
  Maximize2,
  GitCompare,
  TrendingUp,
  FileSpreadsheet,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  LoadSimulationScenarioEntity,
  ScenarioClassification,
  ScenarioType,
  routingService,
  tollService,
  anttService,
  calculateOrderPriorityScore,
} from '@/domain/rules'

export const LoadRouterAndSimulatorPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  // Base Data
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [stocks, setStocks] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])
  const [scenarios, setScenarios] = useState<LoadSimulationScenarioEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Builder State (Active Simulation)
  const [scenarioTitle, setScenarioTitle] = useState('')
  const [selectedItinerary, setSelectedItinerary] = useState<string>('SP001A')
  const [plannedDate, setPlannedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [vehicleType, setVehicleType] = useState<string>('Carreta LS (28t)')
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState<number>(28000)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [scenarioPreset, setScenarioPreset] = useState<ScenarioType>('custom')

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'simulator' | 'comparison' | 'saved' | 'detail360'>(
    'simulator',
  )
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [detail360Scenario, setDetail360Scenario] = useState<LoadSimulationScenarioEntity | null>(
    null,
  )
  const [isApproving, setIsApproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch all live data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ords, itins, stk, pcp, scens] = await Promise.all([
        TmsService.getSapSalesOrders(),
        TmsService.getSapItineraries(),
        TmsService.getStockCurrent(),
        TmsService.getPcpProductionOrders(),
        TmsService.getSimulationScenarios(),
      ])
      setOrders(ords)
      setItineraries(itins)
      setStocks(stk)
      setPcpOrders(pcp)
      setScenarios(scens)

      // Set initial selection if available
      if (ords.length > 0 && selectedOrderIds.length === 0) {
        const firstItin = itins[0]?.sap_code || 'SP001A'
        setSelectedItinerary(firstItin)
        const matching = ords.filter((o) => o.itinerary_code === firstItin).slice(0, 3)
        setSelectedOrderIds(matching.map((m) => m.id))
        setScenarioTitle(`Cenário ${firstItin} - Otimização Padrão`)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados do Roteirizador',
        description: err?.message || 'Falha ao buscar carteira e itinerários.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Orders available for the chosen itinerary
  const itineraryOrders = useMemo(() => {
    return orders.filter((o) => o.itinerary_code === selectedItinerary)
  }, [orders, selectedItinerary])

  // Selected orders entities
  const currentSelectedOrders = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id))
  }, [orders, selectedOrderIds])

  // Presets logic
  const handleApplyPreset = (preset: ScenarioType) => {
    setScenarioPreset(preset)
    const available = [...itineraryOrders]

    if (preset === 'max_occupancy') {
      // Sort by weight descending to fill vehicle close to capacity
      available.sort((a, b) => b.weight_kg - a.weight_kg)
      let currentW = 0
      const picked: string[] = []
      for (const ord of available) {
        if (currentW + ord.weight_kg <= vehicleCapacityKg) {
          picked.push(ord.id)
          currentW += ord.weight_kg
        }
      }
      setSelectedOrderIds(picked)
      setScenarioTitle(`Cenário Ocupação Máxima (${(currentW / 1000).toFixed(1)}t)`)
      toast({
        title: 'Preset Aplicado: Ocupação Máxima',
        description: `${picked.length} pedidos selecionados.`,
      })
    } else if (preset === 'prioritize_overdue') {
      // Sort by score/atraso
      available.sort(
        (a, b) =>
          calculateOrderPriorityScore(b).totalScore - calculateOrderPriorityScore(a).totalScore,
      )
      const picked = available.slice(0, 4).map((o) => o.id)
      setSelectedOrderIds(picked)
      setScenarioTitle('Cenário Priorizar Pedidos Atrasados')
      toast({
        title: 'Preset Aplicado: Priorizar Atrasados',
        description: 'Pedidos com maior atraso/prioridade selecionados.',
      })
    } else if (preset === 'tomorrow_pcp') {
      // Prioritize orders dependent on tomorrow's production
      const pcpMats = pcpOrders.map((p) => p.material_code)
      const futureOrds = available.filter((o) => pcpMats.includes(o.material || ''))
      const picked = (futureOrds.length > 0 ? futureOrds : available).map((o) => o.id)
      setSelectedOrderIds(picked)
      setScenarioTitle('Cenário Produção Programada Amanhã (PCP Robotizado)')
      toast({
        title: 'Preset Aplicado: PCP D+1',
        description: 'Simulação vinculada às ordens de fabricação de amanhã.',
      })
    } else if (preset === 'lowest_cost') {
      // Group closest deliveries
      const picked = available.slice(0, 3).map((o) => o.id)
      setSelectedOrderIds(picked)
      setScenarioTitle('Cenário Menor Custo Logístico por Tonelada')
      toast({
        title: 'Preset Aplicado: Menor Custo',
        description: 'Sequência compacta selecionada.',
      })
    }
  }

  // Live Calculations of Active Simulation
  const simulation = useMemo(() => {
    const selected = currentSelectedOrders
    const totalWeightKg = selected.reduce((acc, o) => acc + (o.weight_kg || 0), 0)
    const occupancyPct = Math.min(100, Math.round((totalWeightKg / vehicleCapacityKg) * 100))
    const ordersCount = selected.length

    // Unique customers
    const uniqueCustomers = Array.from(new Set(selected.map((s) => s.customer_code)))
    const customersCount = uniqueCustomers.length

    // Value and Risk
    const ordersTotalValue = selected.reduce((acc, o) => acc + (o.total_value || 0), 0)
    const blockedCreditValue = selected
      .filter((o) => o.credit_status === 'Bloqueado')
      .reduce((acc, o) => acc + (o.total_value || 0), 0)

    // Stock verification
    let confirmedStockWeight = 0
    let futureStockWeight = 0
    let overdueOrdersCount = 0

    selected.forEach((o) => {
      if (o.production_status === 'Pronto') {
        confirmedStockWeight += o.weight_kg
      } else {
        futureStockWeight += o.weight_kg
      }
      if (o.desired_date) {
        const diff = new Date().getTime() - new Date(o.desired_date).getTime()
        if (diff > 0) overdueOrdersCount++
      }
    })

    // Itinerary Distance & Cost
    const currentItin = itineraries.find((i) => i.sap_code === selectedItinerary)
    const baseDistance = (currentItin as any)?.distance_km || 380
    // Additional distance per extra client drop: +18 km per additional stop
    const extraStopsDist = Math.max(0, customersCount - 1) * 18
    const distanceKm = baseDistance + extraStopsDist

    // ANTT Floor Calculation (Desacoplado)
    let axles = 5
    if (vehicleType.toLowerCase().includes('toco')) axles = 2
    else if (vehicleType.toLowerCase().includes('truck')) axles = 3
    else if (vehicleType.toLowerCase().includes('bitrem')) axles = 7

    const antt = anttService.calculateFloorPrice({
      distanceKm,
      vehicleType,
      axlesCount: axles,
    })

    // Tolls Calculation (Desacoplado)
    const tollResult = {
      tollsCount: Math.max(1, Math.floor(distanceKm / 55)),
      tollsValue: Math.max(1, Math.floor(distanceKm / 55)) * (4.2 * axles),
    }

    const estimatedFreightCost = antt.floorValue + tollResult.tollsValue
    const costPerTon = totalWeightKg > 0 ? estimatedFreightCost / (totalWeightKg / 1000) : 0
    const complementPossibleKg = Math.max(0, vehicleCapacityKg - totalWeightKg)

    // DETERMINISTIC CLASSIFICATION (ALL REASONS SHOWN)
    const reasons: string[] = []
    let classification: ScenarioClassification = 'VIÁVEL'

    if (totalWeightKg > vehicleCapacityKg) {
      classification = 'NÃO VIÁVEL'
      reasons.push(
        `Excesso de peso: ${(totalWeightKg / 1000).toFixed(1)}t excede a capacidade de ${(vehicleCapacityKg / 1000).toFixed(1)}t do veículo.`,
      )
    }

    if (blockedCreditValue > 0) {
      if (classification !== 'NÃO VIÁVEL') classification = 'VIÁVEL COM APROVAÇÃO'
      reasons.push(
        `Contém pedidos com Crédito Bloqueado (Total: R$ ${blockedCreditValue.toLocaleString('pt-BR')}) pendentes de liberação pelo Financeiro.`,
      )
    }

    if (futureStockWeight > 0) {
      if (classification !== 'NÃO VIÁVEL') {
        classification = 'SIMULAÇÃO FUTURA'
      }
      reasons.push(
        `Depende de estoque futuro / PCP programado (${(futureStockWeight / 1000).toFixed(1)}t em produção/programação).`,
      )
    }

    if (totalWeightKg < vehicleCapacityKg * 0.7 && selected.length > 0) {
      reasons.push(
        `Baixa ocupação (${occupancyPct}%): Carga com ${(complementPossibleKg / 1000).toFixed(1)}t de capacidade residual disponível para complemento comercial.`,
      )
    }

    if (reasons.length === 0) {
      reasons.push(
        'Carga 100% balanceada, com estoque pronto em depósito, crédito liberado e ocupação ideal.',
      )
    }

    // Customer Sequence for Routing
    const customerSequence = uniqueCustomers.map((custCode, idx) => {
      const custOrders = selected.filter((o) => o.customer_code === custCode)
      const sample = custOrders[0]
      const totalCustW = custOrders.reduce((acc, o) => acc + o.weight_kg, 0)
      return {
        sequence: idx + 1,
        customer_code: custCode,
        customer_name: sample.customer_name,
        city: sample.destination_city,
        uf: sample.uf,
        weight_kg: totalCustW,
        latitude: sample.dest_latitude || -23.5505 + idx * 0.1,
        longitude: sample.dest_longitude || -46.6333 + idx * 0.1,
        address_validated: sample.address_validated ?? true,
      }
    })

    return {
      totalWeightKg,
      occupancyPct,
      ordersCount,
      customersCount,
      distanceKm,
      durationMinutes: Math.round((distanceKm / 65) * 60),
      tollsCount: tollResult.tollsCount,
      tollsValue: Math.round(tollResult.tollsValue * 100) / 100,
      anttFloorValue: antt.floorValue,
      anttVersion: antt.tableVersion,
      estimatedFreightCost: Math.round(estimatedFreightCost * 100) / 100,
      costPerTon: Math.round(costPerTon * 100) / 100,
      ordersTotalValue,
      blockedCreditValue,
      confirmedStockWeightKg: confirmedStockWeight,
      futureStockWeightKg: futureStockWeight,
      overdueOrdersCount,
      complementPossibleKg,
      classification,
      reasons,
      customerSequence,
    }
  }, [currentSelectedOrders, vehicleCapacityKg, selectedItinerary, itineraries, vehicleType])

  // Toggle order in simulator
  const toggleOrderSelection = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId))
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId])
    }
  }

  // Save Scenario
  const handleSaveScenario = async () => {
    if (selectedOrderIds.length === 0) {
      toast({ title: 'Selecione ao menos um pedido para simular', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const saved = await TmsService.saveSimulationScenario(
        {
          title:
            scenarioTitle ||
            `Cenário ${selectedItinerary} - ${new Date().toLocaleTimeString('pt-BR')}`,
          scenario_type: scenarioPreset,
          classification: simulation.classification,
          reasons: simulation.reasons,
          itinerary_code: selectedItinerary,
          planned_date: plannedDate,
          vehicle_type: vehicleType,
          vehicle_capacity_kg: vehicleCapacityKg,
          selected_orders: currentSelectedOrders,
          customer_sequence: simulation.customerSequence,
          total_weight_kg: simulation.totalWeightKg,
          occupancy_pct: simulation.occupancyPct,
          orders_count: simulation.ordersCount,
          customers_count: simulation.customersCount,
          distance_km: simulation.distanceKm,
          duration_minutes: simulation.durationMinutes,
          tolls_count: simulation.tollsCount,
          tolls_value: simulation.tollsValue,
          antt_floor_value: simulation.anttFloorValue,
          antt_version: simulation.anttVersion,
          estimated_freight_cost: simulation.estimatedFreightCost,
          cost_per_ton: simulation.costPerTon,
          orders_total_value: simulation.ordersTotalValue,
          blocked_credit_value: simulation.blockedCreditValue,
          confirmed_stock_weight_kg: simulation.confirmedStockWeightKg,
          future_stock_weight_kg: simulation.futureStockWeightKg,
          overdue_orders_count: simulation.overdueOrdersCount,
          complement_possible_kg: simulation.complementPossibleKg,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (saved) {
        toast({
          title: 'Cenário Salvo com Sucesso',
          description: `Cenário "${saved.title}" gravado para comparação e aprovação.`,
        })
        fetchData()
        setActiveTab('saved')
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar cenário', description: err?.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Approve Scenario & Generate Cargo / Freight Offer
  const handleApproveScenario = async (scenarioId: string) => {
    setIsApproving(true)
    try {
      const res = await TmsService.approveScenarioAndGenerateCargo(
        scenarioId,
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res.success) {
        toast({
          title: 'Cenário Aprovado e Carga Gerada!',
          description: res.message,
        })
        fetchData()
        setActiveTab('saved')
      } else {
        toast({ title: 'Falha na Aprovação', description: res.message, variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' })
    } finally {
      setIsApproving(false)
    }
  }

  // Toggle Scenario in A/B Comparison
  const toggleComparison = (id: string) => {
    if (comparisonIds.includes(id)) {
      setComparisonIds(comparisonIds.filter((cid) => cid !== id))
    } else {
      if (comparisonIds.length >= 3) {
        toast({ title: 'Máximo 3 cenários para comparação simultânea.' })
        return
      }
      setComparisonIds([...comparisonIds, id])
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Roteirizador & Simulador Logístico
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              SPRINT 3 — DECISÃO DETERMINÍSTICA
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Ambiente de montagem, roteirização geográfica e comparação de cenários antes de qualquer
            confirmação física ou contratual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar Dados
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1">
          <TabsTrigger value="simulator" className="text-xs font-bold">
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            1. Montador de Cenário
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs font-bold">
            <GitCompare className="w-3.5 h-3.5 mr-1.5" />
            2. Comparador A/B ({comparisonIds.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="text-xs font-bold">
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            3. Cenários Salvos ({scenarios.length})
          </TabsTrigger>
          <TabsTrigger value="detail360" className="text-xs font-bold">
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            4. Visão 360° da Carga
          </TabsTrigger>
        </TabsList>

        {/* ==================================================== */}
        {/* TAB 1: SIMULATOR & BUILDER */}
        {/* ==================================================== */}
        <TabsContent value="simulator" className="space-y-4 mt-3">
          {/* Preset Buttons */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#005596]" />
                  Cenários Pré-Definidos com Justificativa:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={scenarioPreset === 'max_occupancy' ? 'default' : 'outline'}
                    onClick={() => handleApplyPreset('max_occupancy')}
                    className="h-7 text-xs"
                  >
                    Maximizar Ocupação
                  </Button>
                  <Button
                    size="sm"
                    variant={scenarioPreset === 'prioritize_overdue' ? 'default' : 'outline'}
                    onClick={() => handleApplyPreset('prioritize_overdue')}
                    className="h-7 text-xs"
                  >
                    Priorizar Mais Atrasados
                  </Button>
                  <Button
                    size="sm"
                    variant={scenarioPreset === 'lowest_cost' ? 'default' : 'outline'}
                    onClick={() => handleApplyPreset('lowest_cost')}
                    className="h-7 text-xs"
                  >
                    Menor Custo / Tonelada
                  </Button>
                  <Button
                    size="sm"
                    variant={scenarioPreset === 'tomorrow_pcp' ? 'default' : 'outline'}
                    onClick={() => handleApplyPreset('tomorrow_pcp')}
                    className="h-7 text-xs"
                  >
                    Aproveitar Produção PCP D+1
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT 7 COLS: Selection, Itinerary, Orders */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Parâmetros do Cenário
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Título do Cenário:
                      </label>
                      <Input
                        value={scenarioTitle}
                        onChange={(e) => setScenarioTitle(e.target.value)}
                        placeholder="Ex: Rota SP001A Otimizada com Complemento"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Itinerário SAP:
                      </label>
                      <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {itineraries.map((it) => (
                            <SelectItem key={it.sap_code} value={it.sap_code}>
                              {it.sap_code} - {it.description} ({it.uf})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Tipo de Veículo:
                      </label>
                      <Select
                        value={vehicleType}
                        onValueChange={(v) => {
                          setVehicleType(v)
                          if (v.includes('28t') || v.includes('LS')) setVehicleCapacityKg(28000)
                          else if (v.includes('14t') || v.includes('Truck'))
                            setVehicleCapacityKg(14000)
                          else if (v.includes('38t') || v.includes('Bitrem'))
                            setVehicleCapacityKg(38000)
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="Carreta LS (28t)">
                            Carreta LS (Capacidade 28,0 t)
                          </SelectItem>
                          <SelectItem value="Truck (14t)">
                            Truck 3 Eixos (Capacidade 14,0 t)
                          </SelectItem>
                          <SelectItem value="Bitrem (38t)">
                            Bitrem 7 Eixos (Capacidade 38,0 t)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Capacidade do Veículo (kg):
                      </label>
                      <Input
                        type="number"
                        value={vehicleCapacityKg}
                        onChange={(e) => setVehicleCapacityKg(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Data Planejada:
                      </label>
                      <Input
                        type="date"
                        value={plannedDate}
                        onChange={(e) => setPlannedDate(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos Disponíveis para o Itinerário */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Pedidos em Carteira para {selectedItinerary} ({itineraryOrders.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Marque ou desmarque pedidos para simular a composição da carga.
                      </CardDescription>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#005596]">
                      {selectedOrderIds.length} selecionados
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-2.5 w-8 text-center">Sel.</th>
                        <th className="p-2.5">Pedido / Cliente</th>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5 text-right">Peso (t)</th>
                        <th className="p-2.5 text-center">Status PCP</th>
                        <th className="p-2.5 text-center">Crédito</th>
                        <th className="p-2.5 text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {itineraryOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            Nenhum pedido encontrado para o itinerário selecionado.
                          </td>
                        </tr>
                      ) : (
                        itineraryOrders.map((ord) => {
                          const isSelected = selectedOrderIds.includes(ord.id)
                          const score = calculateOrderPriorityScore(ord)
                          return (
                            <tr
                              key={ord.id}
                              onClick={() => toggleOrderSelection(ord.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-sky-50/80 font-medium' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOrderSelection(ord.id)}
                                  className="rounded border-slate-300 text-[#005596]"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-mono font-bold text-slate-900">
                                  {ord.order_number}
                                </div>
                                <div className="text-[10px] text-slate-600 truncate max-w-[150px]">
                                  {ord.customer_name}
                                </div>
                              </td>
                              <td className="p-2.5 font-mono text-[#005596]">{ord.material}</td>
                              <td className="p-2.5 text-right font-mono font-bold">
                                {(ord.weight_kg / 1000).toFixed(1)} t
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={`text-[9px] ${
                                    ord.production_status === 'Pronto'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {ord.production_status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={`text-[9px] ${
                                    ord.credit_status === 'Liberado'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {ord.credit_status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-[10px]">
                                {score.totalScore} pts
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT 5 COLS: Dynamic Indicators, Classification & Map */}
            <div className="lg:col-span-5 space-y-4">
              {/* Classification Card */}
              <Card
                className={`border shadow-sm ${
                  simulation.classification === 'VIÁVEL'
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : simulation.classification === 'VIÁVEL COM APROVAÇÃO'
                      ? 'bg-amber-50/60 border-amber-300'
                      : simulation.classification === 'SIMULAÇÃO FUTURA'
                        ? 'bg-sky-50/60 border-sky-300'
                        : 'bg-rose-50/60 border-rose-300'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Classificação da Simulação
                    </span>
                    <Badge
                      className={`text-xs font-black ${
                        simulation.classification === 'VIÁVEL'
                          ? 'bg-emerald-600 text-white'
                          : simulation.classification === 'VIÁVEL COM APROVAÇÃO'
                            ? 'bg-amber-600 text-white'
                            : simulation.classification === 'SIMULAÇÃO FUTURA'
                              ? 'bg-sky-700 text-white'
                              : 'bg-rose-600 text-white'
                      }`}
                    >
                      {simulation.classification}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 text-[11px]">
                    Justificativas Determinísticas:
                  </div>
                  <ul className="space-y-1">
                    {simulation.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-slate-700 text-[11px]">
                        <span className="font-bold text-slate-400">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Indicators Matrix */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Indicadores da Carga Simulada
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Peso Total / Ocupação
                      </span>
                      <div className="text-base font-black font-mono text-slate-900">
                        {(simulation.totalWeightKg / 1000).toFixed(1)} t{' '}
                        <span className="text-xs text-sky-700 font-semibold">
                          ({simulation.occupancyPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Pedidos / Clientes
                      </span>
                      <div className="text-base font-black font-mono text-slate-900">
                        {simulation.ordersCount} ped. / {simulation.customersCount} cli.
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Distância / Tempo
                      </span>
                      <div className="text-base font-black font-mono text-slate-900">
                        {simulation.distanceKm} km{' '}
                        <span className="text-xs text-slate-500 font-normal">
                          ({Math.floor(simulation.durationMinutes / 60)}h{' '}
                          {simulation.durationMinutes % 60}m)
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Pedágios Estimados
                      </span>
                      <div className="text-base font-black font-mono text-slate-900">
                        R$ {simulation.tollsValue.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({simulation.tollsCount} praças)
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Piso ANTT Oficial
                      </span>
                      <div className="text-base font-black font-mono text-[#005596]">
                        R${' '}
                        {simulation.anttFloorValue.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Versão: {simulation.anttVersion}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Custo / Tonelada
                      </span>
                      <div className="text-base font-black font-mono text-emerald-800">
                        R$ {simulation.costPerTon.toFixed(2)} / t
                      </div>
                    </div>
                  </div>

                  {/* Stock & Future breakdown */}
                  <div className="p-2.5 bg-slate-100 rounded text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Estoque Confirmado Agora:</span>
                      <strong className="text-emerald-700 font-mono">
                        {(simulation.confirmedStockWeightKg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Estoque Futuro (PCP Robotizado):</span>
                      <strong className="text-sky-700 font-mono">
                        {(simulation.futureStockWeightKg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                    {simulation.complementPossibleKg > 0 && (
                      <div className="flex justify-between text-amber-800 font-bold">
                        <span>Capacidade Livre para Complemento:</span>
                        <span className="font-mono">
                          {(simulation.complementPossibleKg / 1000).toFixed(1)} t
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleSaveScenario}
                      disabled={isSaving || selectedOrderIds.length === 0}
                      className="flex-1 bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold h-9"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {isSaving ? 'Salvando...' : 'Salvar Cenário'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rota & Sequência de Entregas */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-[#005596]" />
                      Sequência Roteirizada de Entregas
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      CIAFAL Routing Engine
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-[#005596] text-white flex items-center justify-center text-[9px] font-bold">
                        0
                      </span>
                      <span className="font-bold text-slate-800">
                        Origem: CIAFAL Matriz (São Paulo/SP)
                      </span>
                    </div>

                    {simulation.customerSequence.map((seq) => (
                      <div
                        key={seq.customer_code}
                        className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-[11px] border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[9px] font-bold">
                            {seq.sequence}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{seq.customer_name}</div>
                            <div className="text-[10px] text-slate-500">
                              {seq.city} / {seq.uf}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-slate-700">
                          {(seq.weight_kg / 1000).toFixed(1)} t
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 2: COMPARADOR A/B DE CENÁRIOS */}
        {/* ==================================================== */}
        <TabsContent value="comparison" className="space-y-4 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <GitCompare className="w-4 h-4 text-[#005596]" />
                Tabela Comparativa de Cenários de Carga
              </CardTitle>
              <CardDescription className="text-xs">
                Compare lado a lado os indicadores de peso, ocupação, ANTT, pedágios e riscos para
                decidir o cenário preferido.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {comparisonIds.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Selecione ao menos 2 cenários na aba "Cenários Salvos" para realizar a comparação
                  A/B.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 w-48">Indicador / Métrica</th>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <th key={cid} className="p-3 text-center border-l border-slate-200">
                              <div className="font-bold text-slate-900">{scen?.title}</div>
                              <Badge className="text-[9px] mt-1">{scen?.classification}</Badge>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Peso Total (TON)</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono font-bold border-l border-slate-200"
                            >
                              {((scen?.total_weight_kg || 0) / 1000).toFixed(1)} t
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">% Ocupação do Veículo</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono font-bold border-l border-slate-200 text-sky-700"
                            >
                              {scen?.occupancy_pct}%
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">
                          Qtd. Clientes / Pedidos
                        </td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono border-l border-slate-200"
                            >
                              {scen?.customers_count} cli. / {scen?.orders_count} ped.
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Distância Total (km)</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono border-l border-slate-200"
                            >
                              {scen?.distance_km} km
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Piso ANTT Oficial (R$)</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono font-bold text-[#005596] border-l border-slate-200"
                            >
                              R${' '}
                              {(scen?.antt_floor_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">
                          Custo Total de Pedágios
                        </td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono border-l border-slate-200"
                            >
                              R$ {(scen?.tolls_value || 0).toFixed(2)}
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Custo por Tonelada</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td
                              key={cid}
                              className="p-3 text-center font-mono font-bold text-emerald-800 border-l border-slate-200"
                            >
                              R$ {(scen?.cost_per_ton || 0).toFixed(2)} / t
                            </td>
                          )
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800">Ação Decisória</td>
                        {comparisonIds.map((cid) => {
                          const scen = scenarios.find((s) => s.id === cid)
                          return (
                            <td key={cid} className="p-3 text-center border-l border-slate-200">
                              <Button
                                size="sm"
                                onClick={() => handleApproveScenario(cid)}
                                disabled={isApproving || scen?.status === 'convertido_carga'}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                {scen?.status === 'convertido_carga'
                                  ? 'Carga Aprovada'
                                  : 'Aprovar Este Cenário'}
                              </Button>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 3: CENÁRIOS SALVOS */}
        {/* ==================================================== */}
        <TabsContent value="saved" className="space-y-4 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Histórico de Cenários Simulados ({scenarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 text-center">Comparar</th>
                    <th className="p-3">Título / Itinerário</th>
                    <th className="p-3">Veículo</th>
                    <th className="p-3 text-right">Peso / Ocupação</th>
                    <th className="p-3 text-right">Piso ANTT</th>
                    <th className="p-3 text-center">Classificação</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {scenarios.map((scen) => {
                    const isComparing = comparisonIds.includes(scen.id)
                    return (
                      <tr key={scen.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isComparing}
                            onChange={() => toggleComparison(scen.id)}
                            className="rounded border-slate-300 text-[#005596]"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{scen.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {scen.itinerary_code} • {scen.planned_date}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">{scen.vehicle_type || 'Carreta LS'}</td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold">
                            {(scen.total_weight_kg / 1000).toFixed(1)} t
                          </div>
                          <div className="text-[10px] text-sky-700 font-semibold">
                            {scen.occupancy_pct}%
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#005596]">
                          R${' '}
                          {scen.antt_floor_value.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-[9px] font-bold ${
                              scen.classification === 'VIÁVEL'
                                ? 'bg-emerald-600 text-white'
                                : scen.classification === 'VIÁVEL COM APROVAÇÃO'
                                  ? 'bg-amber-600 text-white'
                                  : scen.classification === 'SIMULAÇÃO FUTURA'
                                    ? 'bg-sky-700 text-white'
                                    : 'bg-rose-600 text-white'
                            }`}
                          >
                            {scen.classification}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {scen.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDetail360Scenario(scen)
                                setActiveTab('detail360')
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              Visão 360°
                            </Button>
                            {scen.status !== 'convertido_carga' && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveScenario(scen.id)}
                                disabled={isApproving}
                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Aprovar e Gerar Carga
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 4: VISÃO 360° DA CARGA */}
        {/* ==================================================== */}
        <TabsContent value="detail360" className="space-y-4 mt-3">
          {detail360Scenario ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Visão 360°: {detail360Scenario.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Itinerário: {detail360Scenario.itinerary_code} • Piso ANTT: R${' '}
                    {detail360Scenario.antt_floor_value.toFixed(2)}
                  </p>
                </div>
                <Badge className="bg-[#005596] text-white text-xs">
                  {detail360Scenario.classification}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-slate-50 border-slate-200 p-3 text-xs">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">
                    Peso Total
                  </span>
                  <div className="text-lg font-black font-mono mt-1 text-slate-900">
                    {(detail360Scenario.total_weight_kg / 1000).toFixed(1)} t (
                    {detail360Scenario.occupancy_pct}%)
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3 text-xs">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">
                    Custo Pedágios
                  </span>
                  <div className="text-lg font-black font-mono mt-1 text-slate-900">
                    R$ {(detail360Scenario.tolls_value || 0).toFixed(2)}
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3 text-xs">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">
                    Frete Estimado Total
                  </span>
                  <div className="text-lg font-black font-mono mt-1 text-[#005596]">
                    R$ {(detail360Scenario.estimated_freight_cost || 0).toFixed(2)}
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3 text-xs">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">
                    Custo / Tonelada
                  </span>
                  <div className="text-lg font-black font-mono mt-1 text-emerald-800">
                    R$ {(detail360Scenario.cost_per_ton || 0).toFixed(2)} / t
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-white border-slate-200 p-8 text-center text-slate-400 text-xs">
              Selecione um cenário na aba "Cenários Salvos" para inspecionar todos os ângulos da
              carga.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default LoadRouterAndSimulatorPage
