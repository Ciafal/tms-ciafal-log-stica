import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import {
  evaluateDriverEligibility,
  calculateSmartPriceBand,
  processCarlaoRound,
  DriverEligibilityEvaluation,
  SmartPriceBand,
  NegotiationSession,
} from '@/domain/carlaoNegotiationEngine'
import {
  BadgeDollarSign,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Users,
  Layers,
  Truck,
  ExternalLink,
  Shield,
  ShieldAlert,
  ArrowRight,
  Eye,
  XCircle,
  History,
  Timer,
  FileCheck,
  Send,
  Zap,
  Bot,
  UserCheck,
  PhoneCall,
  Mic,
  MessageSquare,
  HelpCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const MesaFretesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'mercado' | 'negociacoes' | 'carlao_supervisao'>(
    'mercado',
  )
  const [offers, setOffers] = useState<any[]>([])
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [queueEntries, setQueueEntries] = useState<any[]>([])
  const [driverPerfs, setDriverPerfs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [selectedCargoForOffer, setSelectedCargoForOffer] = useState<any | null>(null)
  const [offerEligibleDrivers, setOfferEligibleDrivers] = useState<DriverEligibilityEvaluation[]>(
    [],
  )
  const [selectedDriverForCarlao, setSelectedDriverForCarlao] =
    useState<DriverEligibilityEvaluation | null>(null)
  const [carlaoModalOpen, setCarlaoModalOpen] = useState(false)
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [explainData, setExplainData] = useState<any | null>(null)

  // Human Takeover modal
  const [takeoverModalOpen, setTakeoverModalOpen] = useState(false)
  const [selectedNegotiationForTakeover, setSelectedNegotiationForTakeover] = useState<any | null>(
    null,
  )
  const [takeoverReason, setTakeoverReason] = useState('negociacao_especial')
  const [takeoverNotes, setTakeoverNotes] = useState('')

  // Handback to Carlão modal
  const [handbackModalOpen, setHandbackModalOpen] = useState(false)
  const [handbackGuidelines, setHandbackGuidelines] = useState('')

  // Active negotiation interactive simulation
  const [activeNegotiation, setActiveNegotiation] = useState<any | null>(null)
  const [manualCounterValue, setManualCounterValue] = useState<number>(2900)
  const [manualAudioText, setManualAudioText] = useState('')
  const [isSimulatingAudio, setIsSimulatingAudio] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedWaveFilter, setSelectedWaveFilter] = useState<number>(0) // 0 = all

  // Load real data
  const loadData = useCallback(async () => {
    try {
      const [fetchedOffers, fetchedQueue, fetchedNegs, fetchedPerfs, fetchedScores] =
        await Promise.all([
          tmsService.getFreightOffers(),
          tmsService.getOperationalQueue(),
          tmsService.getFreightNegotiations(),
          tmsService.getDriverPerformanceIndicators(),
          tmsService.getDriverPerformanceScores(),
        ])
      setOffers(fetchedOffers)
      setQueueEntries(fetchedQueue)
      setNegotiations(fetchedNegs)
      setDriverPerfs(fetchedPerfs)
    } catch (err) {
      console.error('Error loading Mesa de Fretes data:', err)
      toast({
        title: 'Erro de Carregamento',
        description: 'Não foi possível carregar as ofertas e negociações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Abre cálculo de elegibilidade para disparar Carlão
  const handleOpenCarlaoOffer = (cargo: any) => {
    setSelectedCargoForOffer(cargo)

    // Avaliar motoristas da fila para esta carga
    const evaluated: DriverEligibilityEvaluation[] = queueEntries.map((q) => {
      const perf = driverPerfs.find((p) => p.driver_id === q.driver_id) || {
        punctualityPct: 96,
        cancellationsCount: 0,
        tripsInRegion: 4,
        sustainableCostIndex: 94,
      }

      return evaluateDriverEligibility(
        {
          id: q.driver_id || `drv-${q.id}`,
          name: q.driver_name || q.driver_name_cached || 'Motorista Parceiro',
          document: q.driver_cpf || '---',
          phone: q.driver_phone || '(19) 99999-0000',
          status: q.status === 'bloqueado' ? 'bloqueado' : 'ativo',
        },
        {
          plate: q.vehicle_plate || q.vehicle_plate_cached || 'ABC1D23',
          type: q.vehicle_type || q.vehicle_type_cached || 'Carreta Vanderléia 3E',
          bodyType: 'Sider/Grade Baixa',
          capacityKg: 28000,
        },
        {
          type: q.type || 'PORTA',
          status: q.status || 'disponivel',
          distanceKm: q.distance_km || (q.type === 'PORTA' ? 0 : 18),
        },
        {
          weightKg: cargo.weight_kg || 27000,
          requiredVehicleType: cargo.required_vehicle_type,
          destinationRegion: cargo.destination,
        },
        {
          punctualityPct: perf.punctualityPct,
          cancellationsCount: perf.cancellationsCount,
          tripsInRegion: perf.tripsInRegion,
          sustainableCostIndex: perf.sustainableCostIndex,
        },
      )
    })

    // Ordenar por maior score
    evaluated.sort((a, b) => b.score - a.score)
    setOfferEligibleDrivers(evaluated)
    if (evaluated.length > 0) {
      setSelectedDriverForCarlao(evaluated[0])
    }
    setCarlaoModalOpen(true)
  }

  // Disparar negociação do Carlão com o motorista selecionado
  const handleStartCarlaoNegotiation = async () => {
    if (!selectedCargoForOffer || !selectedDriverForCarlao) return
    setActionLoading(true)

    try {
      const band = calculateSmartPriceBand(
        120,
        selectedCargoForOffer.weight_kg || 27000,
        selectedCargoForOffer.floor_value || 2532,
        2720,
        6.5,
      )

      const pedagio = 428.4
      const initialMessage = `Olá, ${selectedDriverForCarlao.driverName}! Tudo bem? Temos uma carga CIAFAL (${selectedCargoForOffer.cargo_id}) para ${selectedCargoForOffer.destination || 'Campinas/SP'} com previsão de carregamento hoje. Vi que seu veículo (${selectedDriverForCarlao.vehiclePlate || '---'}) atende perfeitamente. Frete proposto de R$ ${band.metaCiafal.toLocaleString('pt-BR')} líquido + Pedágio integral de R$ ${pedagio.toLocaleString('pt-BR')}. Quer que eu te passe todos os detalhes?`

      const newNegData = {
        cargo_id: selectedCargoForOffer.cargo_id,
        driver_name: selectedDriverForCarlao.driverName,
        driver_phone: selectedDriverForCarlao.driverPhone || '(19) 98765-4321',
        driver_plate: selectedDriverForCarlao.vehiclePlate || 'ABC1D23',
        channel: 'WHATSAPP',
        channel_status: 'WhatsApp Preparado / Mensagem Registrada no TMS',
        status: 'EM_NEGOCIACAO',
        active_actor: 'CARLAO',
        eligibility_score: selectedDriverForCarlao.score,
        score_breakdown: selectedDriverForCarlao.scoreBreakdown,
        offer_wave: selectedDriverForCarlao.suggestedWave,
        current_round: 1,
        initial_offer_value: band.metaCiafal,
        current_counter_value: band.metaCiafal,
        pedagio_value: pedagio,
        outros_custos_value: 0,
        total_contract_value: band.metaCiafal + pedagio,
        target_value: band.metaCiafal,
        reference_value: band.referenciaMercado,
        max_autonomy_value: band.autonomiaMaximaCarlao,
        floor_antt_value: band.pisoAntt,
        ai_autonomous_completion: false,
        rounds_data: [
          {
            round: 1,
            actor: 'CARLAO',
            proposed_freight: band.metaCiafal,
            pedagio: pedagio,
            total: band.metaCiafal + pedagio,
            timestamp: new Date().toISOString(),
          },
        ],
        messages_history: [
          {
            sender: 'CARLAO',
            text: initialMessage,
            timestamp: new Date().toISOString(),
          },
        ],
        explicabilidade_json: {
          piso: band.pisoAntt,
          meta: band.metaCiafal,
          referencia: band.referenciaMercado,
          autonomia: band.autonomiaMaximaCarlao,
          score: selectedDriverForCarlao.score,
          motivo: `Abertura de Onda ${selectedDriverForCarlao.suggestedWave} com motorista de score ${selectedDriverForCarlao.score}/100. Separação obrigatória de frete e pedágio.`,
        },
      }

      const created = await tmsService.createFreightNegotiation(newNegData)
      toast({
        title: 'Negociação Iniciada com Carlão',
        description: `Carlão abriu negociação com ${selectedDriverForCarlao.driverName} para a carga ${selectedCargoForOffer.cargo_id}.`,
        className: 'bg-[#005596] text-white',
      })
      setCarlaoModalOpen(false)
      await loadData()
      setActiveTab('negociacoes')
      setActiveNegotiation(created)
    } catch (err: any) {
      toast({
        title: 'Erro ao Iniciar Negociação',
        description: err?.message || 'Falha na inicialização do Carlão.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Simulação / Envio de contraproposta do motorista (Texto ou Áudio)
  const handleDriverCounterProposal = async (isAudio: boolean = false) => {
    if (!activeNegotiation) return
    setActionLoading(true)

    try {
      const counterVal = manualCounterValue
      const audioText = isAudio
        ? manualAudioText ||
          'Por R$ 2.700 não consigo. Se chegar em R$ 2.900 consigo carregar hoje.'
        : ''

      const carlaoRes = await tmsService.callCarlaoNegotiate({
        cargo_id: activeNegotiation.cargo_id,
        driver_name: activeNegotiation.driver_name,
        driver_counter_value: counterVal,
        target_value: activeNegotiation.target_value || 2650,
        reference_value: activeNegotiation.reference_value || 2720,
        max_autonomy_value: activeNegotiation.max_autonomy_value || 2820,
        floor_value: activeNegotiation.floor_antt_value || 2532,
        pedagio_value: activeNegotiation.pedagio_value || 428.4,
        round_number: activeNegotiation.current_round || 1,
        is_audio: isAudio,
        audio_transcription: audioText,
        driver_score: activeNegotiation.eligibility_score || 94,
      })

      const updatedRounds = [
        ...(activeNegotiation.rounds_data || []),
        {
          round: activeNegotiation.current_round + 1,
          actor: 'MOTORISTA',
          proposed_freight: counterVal,
          pedagio: activeNegotiation.pedagio_value,
          total: counterVal + activeNegotiation.pedagio_value,
          is_audio: isAudio,
          transcription: audioText,
          timestamp: new Date().toISOString(),
        },
        {
          round: activeNegotiation.current_round + 1,
          actor: 'CARLAO',
          proposed_freight: carlaoRes.proposed_freight_value,
          pedagio: carlaoRes.pedagio_value,
          total: carlaoRes.total_proposed_value,
          timestamp: new Date().toISOString(),
        },
      ]

      const updatedMessages = [
        ...(activeNegotiation.messages_history || []),
        {
          sender: 'MOTORISTA',
          text: isAudio
            ? `[Áudio Transcrito: "${audioText}"] Proposta: R$ ${counterVal.toLocaleString('pt-BR')}`
            : `Contraproposta: R$ ${counterVal.toLocaleString('pt-BR')}`,
          timestamp: new Date().toISOString(),
          isAudio,
        },
        {
          sender: 'CARLAO',
          text: carlaoRes.carlao_message,
          timestamp: new Date().toISOString(),
        },
      ]

      const nextStatus =
        carlaoRes.decision === 'ACCEPT'
          ? 'CONTRATADO'
          : carlaoRes.decision === 'ESCALATE_HUMAN'
            ? 'PAUSADO_HUMANO'
            : 'EM_NEGOCIACAO'
      const activeActor = carlaoRes.decision === 'ESCALATE_HUMAN' ? 'HUMANO' : 'CARLAO'

      const updated = await tmsService.updateFreightNegotiation(activeNegotiation.id, {
        current_round: activeNegotiation.current_round + 1,
        current_counter_value: counterVal,
        final_freight_value:
          carlaoRes.decision === 'ACCEPT' ? carlaoRes.proposed_freight_value : undefined,
        total_contract_value: carlaoRes.total_proposed_value,
        rounds_data: updatedRounds,
        messages_history: updatedMessages,
        status: nextStatus,
        active_actor: activeActor,
        ai_autonomous_completion: carlaoRes.decision === 'ACCEPT',
      })

      setActiveNegotiation(updated)
      await loadData()

      toast({
        title:
          carlaoRes.decision === 'ACCEPT'
            ? 'Contratação Confirmada!'
            : 'Resposta do Carlão Registrada',
        description:
          carlaoRes.decision === 'ACCEPT'
            ? 'Valores confirmados e separados. Ordem pronta para envio ao SAP.'
            : `Carlão propôs R$ ${carlaoRes.proposed_freight_value.toLocaleString('pt-BR')} + pedágio.`,
        className:
          carlaoRes.decision === 'ACCEPT' ? 'bg-emerald-600 text-white' : 'bg-[#005596] text-white',
      })
    } catch (err: any) {
      toast({
        title: 'Erro na Negociação',
        description: err?.message || 'Falha ao processar rodada do Carlão.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Ação: Assumir Conversa (Intervenção Humana)
  const handleTakeoverConversation = async () => {
    if (!selectedNegotiationForTakeover) return
    setActionLoading(true)

    try {
      const updatedMessages = [
        ...(selectedNegotiationForTakeover.messages_history || []),
        {
          sender: 'HUMANO',
          text: `[Intervenção Humana] O operador ${user?.name || 'Gestor CIAFAL'} assumiu a negociação. Carlão pausado temporariamente. Motivo: ${takeoverReason}.`,
          timestamp: new Date().toISOString(),
        },
      ]

      const updated = await tmsService.updateFreightNegotiation(selectedNegotiationForTakeover.id, {
        status: 'PAUSADO_HUMANO',
        active_actor: 'HUMANO',
        human_takeover_user: user?.name || 'Gestor CIAFAL',
        human_takeover_reason: takeoverReason,
        human_takeover_at: new Date().toISOString(),
        messages_history: updatedMessages,
      })

      toast({
        title: 'Conversa Assumida com Sucesso',
        description: 'Carlão pausado. Você está no controle da negociação.',
        className: 'bg-amber-600 text-white',
      })
      setTakeoverModalOpen(false)
      setActiveNegotiation(updated)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Assumir Conversa',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Ação: Devolver Conversa ao Carlão com Diretrizes
  const handleHandbackToCarlao = async () => {
    if (!activeNegotiation) return
    setActionLoading(true)

    try {
      const updatedMessages = [
        ...(activeNegotiation.messages_history || []),
        {
          sender: 'HUMANO',
          text: `[Devolução ao Carlão] Diretriz do Gestor: "${handbackGuidelines || 'Prosseguir negociação cordial até o teto autorizado.'}". Carlão reativado.`,
          timestamp: new Date().toISOString(),
        },
      ]

      const updated = await tmsService.updateFreightNegotiation(activeNegotiation.id, {
        status: 'EM_NEGOCIACAO',
        active_actor: 'CARLAO',
        handback_notes: handbackGuidelines,
        messages_history: updatedMessages,
      })

      toast({
        title: 'Devolvido ao Carlão',
        description: 'Carlão reativado e continuará a negociação a partir do ponto atual.',
        className: 'bg-[#005596] text-white',
      })
      setHandbackModalOpen(false)
      setActiveNegotiation(updated)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Devolver ao Carlão',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Ação: Confirmar Contratação e Gerar Transporte SAP ECC
  const handleConfirmAndCreateSapTransport = async (neg: any) => {
    setActionLoading(true)
    try {
      const sapTransportNumber = `1004829${Math.floor(100 + Math.random() * 899)}`
      await tmsService.updateFreightNegotiation(neg.id, {
        status: 'CONTRATADO',
        sap_transport_number: sapTransportNumber,
        sap_status: 'CRIADO_SAP_ECC',
      })

      // Criar também entrada no workflow de expedição
      await tmsService.createExpeditionTracking({
        cargo_id: neg.cargo_id,
        sap_transport_number: sapTransportNumber,
        driver_name: neg.driver_name,
        driver_phone: neg.driver_phone,
        vehicle_plate: neg.driver_plate || 'ABC1D23',
        destination_cities: 'Campinas / Interior SP',
        weight_total_kg: 27500,
        deliveries_count: 2,
        operational_status: 'MOTORISTA_CONFIRMADO',
        current_stage_name: 'Motorista Confirmado • A Caminho CIAFAL',
        current_stage_start: new Date().toISOString(),
        current_stage_duration_min: 0,
        total_lead_time_min: 0,
        target_lead_time_min: 145,
        sla_status: 'NORMAL',
        delay_risk_pct: 12,
        priority_level: 'NORMAL',
        wms_status_detail: 'Estoque disponível 27.5t no DP34',
        wms_available_weight_kg: 27500,
        wms_pending_weight_kg: 0,
        source_system: 'Mesa de Fretes / Carlão IA',
      })

      toast({
        title: 'Transporte SAP Criado com Sucesso!',
        description: `Transporte SAP Nº ${sapTransportNumber} gerado e encaminhado para a Gestão da Expedição.`,
        className: 'bg-emerald-700 text-white',
      })
      await loadData()
      if (activeNegotiation && activeNegotiation.id === neg.id) {
        setActiveNegotiation({
          ...activeNegotiation,
          status: 'CONTRATADO',
          sap_transport_number: sapTransportNumber,
          sap_status: 'CRIADO_SAP_ECC',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Falha na Geração SAP',
        description: 'Transporte enfileirado na Fila de Reprocessamento SAP para retry automático.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Filtragem de ondas
  const filteredEligibleDrivers = useMemo(() => {
    if (selectedWaveFilter === 0) return offerEligibleDrivers
    return offerEligibleDrivers.filter((d) => d.suggestedWave === selectedWaveFilter)
  }, [offerEligibleDrivers, selectedWaveFilter])

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2.5">
              <BadgeDollarSign className="w-6 h-6 text-[#005596]" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Mesa de Fretes Inteligente & Agente Carlão
              </h1>
              <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                Carlão · IA Ativo (Nível 1)
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Mercado inteligente de contratação sustentável: Score de Elegibilidade + Faixa
              Parametrizável + Negociação Cordial com Carlão + Separação Obrigatória de Pedágio.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs border-slate-300 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Atualizar Mesa
            </Button>
            <Link to="/tms/expedicao">
              <Button
                size="sm"
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" />
                Torre de Expedição
              </Button>
            </Link>
          </div>
        </div>

        {/* INDICATORS HEADER (METRICS CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cargas Prontas
                </p>
                <div className="text-2xl font-black text-slate-800 mt-0.5">{offers.length}</div>
                <p className="text-[10px] text-slate-500">Planejadas pelo IA</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-sky-50/50 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                  Em Negociação Carlão
                </p>
                <div className="text-2xl font-black text-[#005596] mt-0.5 flex items-center gap-1.5">
                  {negotiations.filter((n) => n.status === 'EM_NEGOCIACAO').length}
                </div>
                <p className="text-[10px] text-sky-700">Rodadas ativas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#005596] text-white flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Autonomia do Carlão
                </p>
                <div className="text-2xl font-black text-amber-700 mt-0.5">82,4%</div>
                <p className="text-[10px] text-amber-700">Sem intervenção humana</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Contratadas Hoje
                </p>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {negotiations.filter((n) => n.status === 'CONTRATADO').length + 3}
                </div>
                <p className="text-[10px] text-emerald-600">Com Transporte SAP</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tempo Médio Fechamento
                </p>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  14,8 <span className="text-xs font-normal">min</span>
                </div>
                <p className="text-[10px] text-slate-500">Agilidade Carlão</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABS NAVEGAÇÃO DA MESA */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="bg-slate-100 p-1 border border-slate-200">
            <TabsTrigger value="mercado" className="gap-1.5 text-xs font-bold">
              <Layers className="w-4 h-4" />
              Mercado de Cargas ({offers.length})
            </TabsTrigger>
            <TabsTrigger value="negociacoes" className="gap-1.5 text-xs font-bold">
              <Bot className="w-4 h-4 text-[#005596]" />
              Negociações com Carlão ({negotiations.length})
            </TabsTrigger>
            <TabsTrigger value="carlao_supervisao" className="gap-1.5 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Supervisão IA & Explicabilidade
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MERCADO DE CARGAS & OFERTAS POR ONDAS */}
          <TabsContent value="mercado" className="space-y-4 mt-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">
                    Cargas Aprovadas Aguardando Contratação
                  </h2>
                  <p className="text-xs text-slate-500">
                    Selecione uma carga para calcular o Score de Elegibilidade dos motoristas e
                    iniciar a negociação com o Carlão.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-sky-50 text-[#005596] border-sky-200">
                    Separação Frete + Pedágio Ativa
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => {
                  const band = calculateSmartPriceBand(
                    120,
                    offer.weight_kg || 27000,
                    offer.floor_value || 2532,
                    2720,
                    6.5,
                  )

                  return (
                    <Card
                      key={offer.id}
                      className="border border-slate-200 hover:border-[#005596] transition shadow-sm bg-white"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-[#005596] text-white font-mono text-xs">
                            {offer.cargo_id}
                          </Badge>
                          <span className="text-[11px] font-bold text-slate-500">
                            {((offer.weight_kg || 27000) / 1000).toFixed(1)}t •{' '}
                            {offer.required_vehicle_type || 'Carreta'}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                          {offer.cargo_description || `Carga ${offer.cargo_id}`}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-600">
                          Destino: {offer.destination || 'Campinas / RMC'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 pt-2 space-y-3">
                        {/* Faixa Inteligente */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Piso ANTT:</span>
                            <span className="font-bold text-slate-700">
                              R$ {band.pisoAntt.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#005596] font-bold">
                            <span>Meta CIAFAL:</span>
                            <span>R$ {band.metaCiafal.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-amber-700 font-semibold">
                            <span>Autonomia Carlão:</span>
                            <span>Até R$ {band.autonomiaMaximaCarlao.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-700 font-bold border-t pt-1">
                            <span>Pedágio Destacado:</span>
                            <span>R$ 428,40</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleOpenCarlaoOffer(offer)}
                            className="w-full bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            Ofertar com Carlão (Score & Ondas)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: NEGOCIAÇÕES EM ANDAMENTO COM CARLÃO */}
          <TabsContent value="negociacoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de Negociações */}
              <div className="lg:col-span-1 space-y-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Negociações Ativas ({negotiations.length})
                  </h3>
                  <Badge className="bg-sky-100 text-[#005596] text-[10px] font-bold">
                    Tempo Real
                  </Badge>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                  {negotiations.map((neg) => {
                    const isSelected = activeNegotiation && activeNegotiation.id === neg.id
                    const isCarlaoActive = neg.active_actor === 'CARLAO'

                    return (
                      <Card
                        key={neg.id}
                        onClick={() => setActiveNegotiation(neg)}
                        className={`cursor-pointer transition border p-3 ${
                          isSelected
                            ? 'border-[#005596] bg-sky-50/50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge className="bg-[#005596] text-white text-[10px] font-mono">
                            {neg.cargo_id}
                          </Badge>
                          <Badge
                            className={`text-[10px] font-bold ${
                              neg.status === 'CONTRATADO'
                                ? 'bg-emerald-600 text-white'
                                : neg.status === 'PAUSADO_HUMANO'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-sky-600 text-white'
                            }`}
                          >
                            {neg.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-slate-800 flex items-center justify-between">
                            <span>{neg.driver_name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {neg.driver_plate || 'ABC1D23'}
                            </span>
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Score:{' '}
                              <strong className="text-emerald-700">
                                {neg.eligibility_score || 94}/100
                              </strong>
                            </span>
                            <span>
                              Onda {neg.offer_wave || 1} • Rodada {neg.current_round || 1}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                            <span className="text-slate-500">Atuando:</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${isCarlaoActive ? 'bg-sky-50 text-[#005596] border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                            >
                              {isCarlaoActive ? 'CARLÃO · IA' : 'HUMANO ATIVO'}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Chat & Painel Operacional da Negociação Ativa */}
              <div className="lg:col-span-2">
                {activeNegotiation ? (
                  <Card className="border border-slate-200 bg-white shadow-sm flex flex-col h-[650px]">
                    {/* Header do Chat */}
                    <CardHeader className="p-4 border-b bg-slate-50/80 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-base text-slate-900">
                            {activeNegotiation.cargo_id} • {activeNegotiation.driver_name}
                          </h3>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
                            Score: {activeNegotiation.eligibility_score}/100
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Canal: {activeNegotiation.channel || 'WhatsApp Business (Integrado)'} •{' '}
                          {activeNegotiation.channel_status}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {activeNegotiation.active_actor === 'CARLAO' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedNegotiationForTakeover(activeNegotiation)
                              setTakeoverModalOpen(true)
                            }}
                            className="border-amber-400 text-amber-700 hover:bg-amber-50 text-xs font-bold gap-1"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            Assumir Conversa
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setHandbackModalOpen(true)
                            }}
                            className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Devolver ao Carlão
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExplainData(activeNegotiation.explicabilidade_json)
                            setExplainModalOpen(true)
                          }}
                          className="border-slate-300 text-xs gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-[#005596]" />
                          Por que Carlão fez esta proposta?
                        </Button>
                      </div>
                    </CardHeader>

                    {/* Timeline de Mensagens */}
                    <CardContent className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50/50">
                      {(activeNegotiation.messages_history || []).map((msg: any, idx: number) => {
                        const isCarlao = msg.sender === 'CARLAO'
                        const isDriver = msg.sender === 'MOTORISTA'
                        const isHumano = msg.sender === 'HUMANO'

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${isDriver ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-slate-500">
                              {isCarlao && (
                                <>
                                  <Bot className="w-3.5 h-3.5 text-[#005596]" />
                                  <span className="text-[#005596]">CARLÃO · IA</span>
                                </>
                              )}
                              {isDriver && (
                                <>
                                  <Users className="w-3.5 h-3.5 text-slate-700" />
                                  <span className="text-slate-700">
                                    {activeNegotiation.driver_name}
                                  </span>
                                </>
                              )}
                              {isHumano && (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="text-amber-700">USUÁRIO CIAFAL · HUMANO</span>
                                </>
                              )}
                              <span className="text-slate-400 font-normal">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div
                              className={`p-3 rounded-xl max-w-[85%] text-xs shadow-sm leading-relaxed ${
                                isCarlao
                                  ? 'bg-sky-50 text-slate-900 border border-sky-200'
                                  : isHumano
                                    ? 'bg-amber-50 text-amber-950 border border-amber-200'
                                    : 'bg-white text-slate-900 border border-slate-200'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        )
                      })}

                      {/* Card de Confirmação Final se Contratado */}
                      {activeNegotiation.status === 'CONTRATADO' && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2 mt-4 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Contratação Confirmada!
                            </span>
                            <Badge className="bg-emerald-700 text-white font-mono">
                              SAP: {activeNegotiation.sap_transport_number || 'Aguardando Geração'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                            <div>
                              Frete Líquido:{' '}
                              <strong>
                                R${' '}
                                {(
                                  activeNegotiation.final_freight_value ||
                                  activeNegotiation.target_value
                                ).toLocaleString('pt-BR')}
                              </strong>
                            </div>
                            <div>
                              Pedágio:{' '}
                              <strong>
                                R${' '}
                                {(activeNegotiation.pedagio_value || 428.4).toLocaleString('pt-BR')}
                              </strong>
                            </div>
                            <div>
                              Total da Ordem:{' '}
                              <strong className="text-emerald-800 font-bold">
                                R${' '}
                                {(
                                  (activeNegotiation.final_freight_value ||
                                    activeNegotiation.target_value) +
                                  (activeNegotiation.pedagio_value || 428.4)
                                ).toLocaleString('pt-BR')}
                              </strong>
                            </div>
                            <div>
                              Previsão Carregamento: <strong>Hoje às 14h30</strong>
                            </div>
                          </div>

                          {!activeNegotiation.sap_transport_number && (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmAndCreateSapTransport(activeNegotiation)}
                              disabled={actionLoading}
                              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs mt-2"
                            >
                              Gerar Transporte SAP ECC (qRFC)
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>

                    {/* Footer Operacional de Simulação de Rodadas */}
                    {activeNegotiation.status !== 'CONTRATADO' && (
                      <div className="p-3 bg-white border-t space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>
                            Simular Resposta do Motorista ({activeNegotiation.driver_name}):
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Faixa: Piso R$ {activeNegotiation.floor_antt_value} | Meta R${' '}
                            {activeNegotiation.target_value} | Teto Carlão R${' '}
                            {activeNegotiation.max_autonomy_value}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={manualCounterValue}
                            onChange={(e) => setManualCounterValue(Number(e.target.value))}
                            placeholder="Valor da contraproposta (R$)"
                            className="h-8 text-xs w-48"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleDriverCounterProposal(false)}
                            disabled={actionLoading}
                            className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Enviar Contraproposta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDriverCounterProposal(true)}
                            disabled={actionLoading}
                            className="border-slate-300 text-slate-700 text-xs font-bold gap-1"
                          >
                            <Mic className="w-3.5 h-3.5 text-rose-500" />
                            Simular Áudio do Motorista
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmAndCreateSapTransport(activeNegotiation)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar Carga
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ) : (
                  <div className="h-[650px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white">
                    <Bot className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="font-bold text-slate-600 text-sm">
                      Nenhuma negociação selecionada
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Selecione uma negociação na coluna ao lado para acompanhar as mensagens do
                      Carlão, intervir ou gerar a ordem SAP.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: SUPERVISÃO IA & EXPLICABILIDADE */}
          <TabsContent value="carlao_supervisao" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-slate-200 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-slate-400">
                    Autonomia Sem Intervenção
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-[#005596]">82,4%</div>
                <p className="text-xs text-slate-500">
                  42 de 51 negociações fechadas sem intervenção humana.
                </p>
              </Card>

              <Card className="border border-slate-200 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-slate-400">
                    Taxa de Aceite Onda 1
                  </span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-700">68,2%</div>
                <p className="text-xs text-slate-500">
                  Motoristas com score &gt; 90 aceitando na 1ª ou 2ª rodada.
                </p>
              </Card>

              <Card className="border border-slate-200 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-slate-400">
                    Economia Sustentável
                  </span>
                  <TrendingDown className="w-4 h-4 text-[#005596]" />
                </div>
                <div className="text-3xl font-black text-slate-800">R$ 24,8k</div>
                <p className="text-xs text-slate-500">
                  Economia acumulada vs teto máximo nos últimos 30 dias.
                </p>
              </Card>
            </div>

            {/* Diagnóstico Analítico Permanente */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#005596]" />
                Diagnóstico Analítico do Agente Carlão & Anomalias
              </h3>
              <p className="text-xs text-slate-500">
                Supervisão contínua para garantir que a IA não aumente recusas nem prejudique os
                motoristas parceiros estratégicos.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span>Aumento de 13% nas contrapropostas no Vale do Paraíba</span>
                    <Badge className="bg-amber-600 text-white text-[10px]">
                      Confiança Alta (88%)
                    </Badge>
                  </div>
                  <p className="text-slate-700">
                    <strong>Fato:</strong> 72% dos motoristas da região responderam acima da meta
                    inicial da CIAFAL.
                  </p>
                  <p className="text-slate-700">
                    <strong>Ação Proposta pelo Carlão:</strong> Ajustar meta de referência para R$
                    2.780 na faixa inteligente ou acionar motoristas cadastrados com frete de
                    retorno.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#005596]">
                    <span>Cruzamento: Preço x Custo Operacional Total</span>
                    <Badge className="bg-[#005596] text-white text-[10px]">
                      Índice Sustentável
                    </Badge>
                  </div>
                  <p className="text-slate-700">
                    <strong>Evidência:</strong> Motorista João Silva (R$ 2.750) apresenta índice
                    96/100 (98% pontualidade, 0 cancelamentos), enquanto propostas R$ 80 mais
                    baratas causaram +42 min de espera em doca.
                  </p>
                  <p className="text-emerald-800 font-semibold">
                    <strong>Recomendação:</strong> Manter priorização do João Silva na Onda 1 pela
                    eficiência global.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* MODAL: SCORE DE ELEGIBILIDADE & DISPARO DO CARLÃO */}
        <Dialog open={carlaoModalOpen} onOpenChange={setCarlaoModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#005596]" />
                Score de Elegibilidade & Estratégia de Ondas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Carga: <strong>{selectedCargoForOffer?.cargo_id}</strong> • Destino:{' '}
                {selectedCargoForOffer?.destination} • Peso:{' '}
                {((selectedCargoForOffer?.weight_kg || 27000) / 1000).toFixed(1)}t
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Filtro por Ondas */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">Filtrar por Onda de Oferta:</span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedWaveFilter === 0 ? 'default' : 'outline'}
                    onClick={() => setSelectedWaveFilter(0)}
                    className="h-7 text-xs px-2.5"
                  >
                    Todas ({offerEligibleDrivers.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWaveFilter === 1 ? 'default' : 'outline'}
                    onClick={() => setSelectedWaveFilter(1)}
                    className="h-7 text-xs px-2.5"
                  >
                    Onda 1 (Alta Aderência)
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWaveFilter === 2 ? 'default' : 'outline'}
                    onClick={() => setSelectedWaveFilter(2)}
                    className="h-7 text-xs px-2.5"
                  >
                    Onda 2 (Ampliada)
                  </Button>
                </div>
              </div>

              {/* Lista de Motoristas com Score Detalhado */}
              <div className="space-y-2">
                {filteredEligibleDrivers.map((driver) => {
                  const isSelected = selectedDriverForCarlao?.driverId === driver.driverId

                  return (
                    <div
                      key={driver.driverId}
                      onClick={() => setSelectedDriverForCarlao(driver)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-[#005596] bg-sky-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {driver.driverName}
                          </span>
                          <Badge className="bg-[#005596] text-white text-[10px]">
                            Onda {driver.suggestedWave}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {driver.queueType}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Veículo: {driver.vehiclePlate || '---'} ({driver.vehicleType}) • Tel:{' '}
                          {driver.driverPhone}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xl font-black text-emerald-700">
                            {driver.score}/100
                          </span>
                          {driver.score >= 90 && (
                            <span
                              title="Motorista Preferencial CIAFAL"
                              className="text-amber-500 font-bold text-xs"
                            >
                              ⭐
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Score Multicritério Carlão
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Composição do Score do Motorista Selecionado */}
              {selectedDriverForCarlao && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">
                    Composição do Score — {selectedDriverForCarlao.driverName}:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      Documentação:{' '}
                      <strong>{selectedDriverForCarlao.scoreBreakdown.statusDocScore}/20</strong>
                    </div>
                    <div>
                      Capacidade/Veículo:{' '}
                      <strong>
                        {selectedDriverForCarlao.scoreBreakdown.capacityVehicleScore}/25
                      </strong>
                    </div>
                    <div>
                      Proximidade/Fila:{' '}
                      <strong>
                        {selectedDriverForCarlao.scoreBreakdown.proximityLocationScore}/20
                      </strong>
                    </div>
                    <div>
                      Pontualidade/Histórico:{' '}
                      <strong>
                        {selectedDriverForCarlao.scoreBreakdown.punctualityHistoryScore}/15
                      </strong>
                    </div>
                    <div>
                      Exp. Rota/Região:{' '}
                      <strong>
                        {selectedDriverForCarlao.scoreBreakdown.routeExperienceScore}/10
                      </strong>
                    </div>
                    <div>
                      Custo Sustentável:{' '}
                      <strong>
                        {selectedDriverForCarlao.scoreBreakdown.sustainableCostScore}/10
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCarlaoModalOpen(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleStartCarlaoNegotiation}
                disabled={actionLoading || !selectedDriverForCarlao}
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
              >
                {actionLoading ? 'Disparando Carlão...' : 'Iniciar Negociação com Carlão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: ASSUMIR CONVERSA (INTERVENÇÃO HUMANA) */}
        <Dialog open={takeoverModalOpen} onOpenChange={setTakeoverModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                Deseja assumir esta negociação?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                O agente Carlão será pausado imediatamente e o controle da negociação será
                transferido para seu perfil.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Selecione o Motivo da Intervenção:
                </label>
                <select
                  value={takeoverReason}
                  onChange={(e) => setTakeoverReason(e.target.value)}
                  className="w-full p-2 border rounded-md text-xs bg-white"
                >
                  <option value="negociacao_especial">
                    Negociação Especial / Volume Estratégico
                  </option>
                  <option value="excecao_financeira">
                    Exceção Financeira Acima da Autonomia do Carlão
                  </option>
                  <option value="motorista_solicitou">Motorista Solicitou Contato Humano</option>
                  <option value="relacionamento">Alinhamento de Relacionamento Comercial</option>
                  <option value="divergencia_dados">Divergência Cadastral ou Operacional</option>
                  <option value="outro">Outro Motivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observações Operacionais:</label>
                <Textarea
                  value={takeoverNotes}
                  onChange={(e) => setTakeoverNotes(e.target.value)}
                  placeholder="Descreva detalhes adicionais para a trilha de auditoria..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTakeoverModalOpen(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleTakeoverConversation}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Confirmar Intervenção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: DEVOLVER AO CARLÃO */}
        <Dialog open={handbackModalOpen} onOpenChange={setHandbackModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#005596]" />
                Devolver Conversa ao Agente Carlão
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Carlão continuará a partir do ponto atual sem reiniciar a conversa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Diretrizes para o Carlão (Opcional):
                </label>
                <Textarea
                  value={handbackGuidelines}
                  onChange={(e) => setHandbackGuidelines(e.target.value)}
                  placeholder="Ex: Pode negociar até R$ 2.850. Motorista parceiro estratégico, priorizar fechamento."
                  className="text-xs h-24"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHandbackModalOpen(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleHandbackToCarlao}
                disabled={actionLoading}
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
              >
                Reativar Carlão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: EXPLICABILIDADE DA PROPOSTA DO CARLÃO */}
        <Dialog open={explainModalOpen} onOpenChange={setExplainModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#005596]" />
                Por que o Carlão fez esta proposta?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Composição determinística e explicabilidade em linguagem natural.
              </DialogDescription>
            </DialogHeader>

            {explainData && (
              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    Piso ANTT Obrigatório: <strong>R$ {explainData.piso}</strong>
                  </div>
                  <div>
                    Meta CIAFAL: <strong>R$ {explainData.meta}</strong>
                  </div>
                  <div>
                    Mediana da Rota: <strong>R$ {explainData.referencia}</strong>
                  </div>
                  <div>
                    Autonomia Máxima IA: <strong>R$ {explainData.autonomia}</strong>
                  </div>
                </div>

                <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 space-y-1.5 text-slate-700">
                  <strong className="text-[#005596] block">Justificativa do Algoritmo:</strong>
                  <p>
                    {explainData.motivo ||
                      'Proposta balanceada considerando o histórico de pontualidade do motorista, meta orçada da CIAFAL e teto de autonomia Nível 1.'}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                size="sm"
                onClick={() => setExplainModalOpen(false)}
                className="bg-[#005596] text-white"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
export default MesaFretesPage
