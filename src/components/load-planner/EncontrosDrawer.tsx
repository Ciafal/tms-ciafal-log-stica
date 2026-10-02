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
                    onViewComposition={(m) => setSelectedMatchForComposition(m)}
                    onSimulate={handleSimulate}
                    onReserveVehicle={handleReserveVehicle}
                    onSendToFreightDesk={handleSendToFreightDesk}
                    onCallAiExplain={handleCallAiExplain}
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
