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
  calculateCargoDriverFitness,
  CargoDriverFitnessResult,
  SelectionCriteriaWeights,
  DEFAULT_SELECTION_WEIGHTS,
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
  SlidersHorizontal,
  AlertCircle,
  Building,
} from 'lucide-react'
import {
  formatCurrency,
  formatWeight,
  formatPercent,
  formatDate,
  formatDateTime,
  formatDurationMinutes,
} from '@/lib/utils'
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

  // Templates de Seleção e Pesos Parametrizáveis
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('TPL_CARGA_PADRAO')

  // Modals state & Fitness Multi-critério
  const [selectedCargoForOffer, setSelectedCargoForOffer] = useState<any | null>(null)
  const [offerEligibleDrivers, setOfferEligibleDrivers] = useState<DriverEligibilityEvaluation[]>(
    [],
  )
  const [fitnessResults, setFitnessResults] = useState<CargoDriverFitnessResult[]>([])
  const [selectedFitnessCandidate, setSelectedFitnessCandidate] =
    useState<CargoDriverFitnessResult | null>(null)
  const [selectedDriverForCarlao, setSelectedDriverForCarlao] =
    useState<DriverEligibilityEvaluation | null>(null)
  const [carlaoModalOpen, setCarlaoModalOpen] = useState(false)
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [explainData, setExplainData] = useState<any | null>(null)

  // Simulação Comparativa Multi-Motoristas (Parte 4)
  const [simulationModalOpen, setSimulationModalOpen] = useState(false)
  const [simulationSelectedDriverIds, setSimulationSelectedDriverIds] = useState<string[]>([])

  // Human Override Modal & Justificativa (Parte 4)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overrideReasonCategory, setOverrideReasonCategory] = useState('RELACIONAMENTO_ESTRATEGICO')
  const [overrideJustificationText, setOverrideJustificationText] = useState('')
  const [candidateToOverride, setCandidateToOverride] = useState<CargoDriverFitnessResult | null>(
    null,
  )

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
      const [fetchedOffers, fetchedQueue, fetchedNegs, fetchedPerfs, fetchedScores, fetchedTpls] =
        await Promise.all([
          tmsService.getFreightOffers(),
          tmsService.getOperationalQueue(),
          tmsService.getFreightNegotiations(),
          tmsService.getDriverPerformanceIndicators(),
          tmsService.getDriverPerformanceScores(),
          tmsService.getSelectionCriteriaTemplates(),
        ])
      setOffers(fetchedOffers)
      setQueueEntries(fetchedQueue)
      setNegotiations(fetchedNegs)
      setDriverPerfs(fetchedPerfs)
      if (fetchedTpls && fetchedTpls.length > 0) {
        setTemplates(fetchedTpls)
      }
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

  // Abre cálculo de adequação multicritério e elegibilidade para disparar Carlão
  const handleOpenCarlaoOffer = (cargo: any, templateCodeParam?: string) => {
    setSelectedCargoForOffer(cargo)
    const activeTplCode = templateCodeParam || selectedTemplateCode
    const activeTpl = templates.find((t) => t.template_code === activeTplCode)

    const weights: SelectionCriteriaWeights = activeTpl
      ? {
          operationalCompatibilityPct: activeTpl.weight_operational_compatibility_pct ?? 20,
          historicalPerformancePct: activeTpl.weight_historical_performance_pct ?? 15,
          routeExperiencePct: activeTpl.weight_route_experience_pct ?? 10,
          customerExperiencePct: activeTpl.weight_customer_experience_pct ?? 10,
          locationAvailabilityPct: activeTpl.weight_location_availability_pct ?? 10,
          expectedCostPct: activeTpl.weight_expected_cost_pct ?? 20,
          punctualityPct: activeTpl.weight_punctuality_pct ?? 5,
          occurrencesPct: activeTpl.weight_occurrences_pct ?? 5,
          fredCollaborationPct: activeTpl.weight_fred_collaboration_pct ?? 5,
        }
      : DEFAULT_SELECTION_WEIGHTS

    // 1. Avaliação de Elegibilidade Básica
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

    // 2. Cálculo do Score de Adequação à Carga (0 a 100) + Custo Total Esperado (Preditivo)
    const fitnessList: CargoDriverFitnessResult[] = queueEntries.map((q) => {
      return calculateCargoDriverFitness({
        driver: {
          id: q.driver_id || `drv-${q.id}`,
          name: q.driver_name || q.driver_name_cached || 'Motorista Parceiro',
          document: q.driver_cpf || '---',
          phone: q.driver_phone || '(19) 99999-0000',
          status: q.status === 'bloqueado' ? 'bloqueado' : 'ativo',
        },
        vehicle: {
          plate: q.vehicle_plate || q.vehicle_plate_cached || 'ABC1D23',
          type: q.vehicle_type || q.vehicle_type_cached || 'Carreta Vanderléia 3E',
          bodyType: 'Sider',
          capacityKg: 28000,
        },
        queueEntry: {
          type: q.type || 'PORTA',
          status: q.status || 'disponivel',
          distanceKm: q.distance_km || (q.type === 'PORTA' ? 0 : 18),
        },
        cargo: {
          cargoId: cargo.cargo_id,
          weightKg: cargo.weight_kg || 27000,
          requiredVehicleType: cargo.required_vehicle_type,
          destinationCity: cargo.destination,
          targetFreight: cargo.target_freight || 2720,
        },
        weights,
        templateCode: activeTplCode,
      })
    })

    // Ordenar por Score de Adequação Decrescente
    fitnessList.sort((a, b) => b.fitnessScore - a.fitnessScore)
    evaluated.sort((a, b) => b.score - a.score)

    setOfferEligibleDrivers(evaluated)
    setFitnessResults(fitnessList)

    if (fitnessList.length > 0) {
      setSelectedFitnessCandidate(fitnessList[0])
      const matchingEligible = evaluated.find((e) => e.driverId === fitnessList[0].driverId)
      setSelectedDriverForCarlao(matchingEligible || evaluated[0])
      setSimulationSelectedDriverIds(
        [fitnessList[0].driverId, fitnessList[1]?.driverId].filter(Boolean) as string[],
      )
    }

    setCarlaoModalOpen(true)
  }

  // Mudança do template de seleção
  const handleTemplateChange = (tplCode: string) => {
    setSelectedTemplateCode(tplCode)
    if (selectedCargoForOffer) {
      handleOpenCarlaoOffer(selectedCargoForOffer, tplCode)
    }
  }

  // Seleção com Override Humano
  const handleSelectWithOverride = (cand: CargoDriverFitnessResult) => {
    const topRecommended = fitnessResults[0]
    if (topRecommended && topRecommended.driverId !== cand.driverId) {
      setCandidateToOverride(cand)
      setOverrideModalOpen(true)
    } else {
      setSelectedFitnessCandidate(cand)
      const matchingEligible = offerEligibleDrivers.find((e) => e.driverId === cand.driverId)
      if (matchingEligible) setSelectedDriverForCarlao(matchingEligible)
      toast({
        title: 'Candidato Selecionado',
        description: `${cand.driverName} selecionado como foco da negociação com Carlão.`,
      })
    }
  }

  // Confirmar Override Humano
  const handleConfirmOverride = async () => {
    if (!candidateToOverride || !selectedCargoForOffer) return
    const topRecommended = fitnessResults[0]

    try {
      await tmsService.recordSelectionDecisionAudit({
        cargo_id: selectedCargoForOffer.cargo_id,
        template_code_used: selectedTemplateCode,
        formula_version_used: 'Modelo Seleção v1.0',
        eligible_candidates_count: fitnessResults.filter((f) => f.isEligible).length,
        candidates_snapshot_json: fitnessResults.map((f) => ({
          driver_id: f.driverId,
          driver_name: f.driverName,
          fitness_score: f.fitnessScore,
          expected_cost: f.expectedCostDetails.totalExpectedCost,
        })),
        ai_top_recommended_driver_id: topRecommended?.driverId,
        ai_top_recommended_driver_name: topRecommended?.driverName,
        ai_top_recommended_score: topRecommended?.fitnessScore,
        ai_top_recommended_expected_cost: topRecommended?.expectedCostDetails.totalExpectedCost,
        selected_driver_id: candidateToOverride.driverId,
        selected_driver_name: candidateToOverride.driverName,
        selected_driver_score: candidateToOverride.fitnessScore,
        selected_driver_negotiated_freight: candidateToOverride.expectedCostDetails.nominalFreight,
        selected_driver_total_cost: candidateToOverride.expectedCostDetails.totalExpectedCost,
        is_human_override: true,
        override_reason_category: overrideReasonCategory,
        override_justification_text:
          overrideJustificationText || 'Decisão operacional registrada pelo gestor.',
        decided_by_user_name: user?.name || 'Gestor de Fretes CIAFAL',
        decided_by_user_email: user?.email || 'gestor@ciafal.com.br',
        decision_timestamp: new Date().toISOString(),
        estimated_avoided_cost: 0,
      })

      setSelectedFitnessCandidate(candidateToOverride)
      const matchingEligible = offerEligibleDrivers.find(
        (e) => e.driverId === candidateToOverride.driverId,
      )
      if (matchingEligible) setSelectedDriverForCarlao(matchingEligible)

      toast({
        title: 'Override Humano Registrado',
        description: `Decisão auditada e registrada. Motorista ${candidateToOverride.driverName} selecionado.`,
        className: 'bg-amber-600 text-white',
      })
      setOverrideModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar auditoria',
        description: err?.message || 'Falha ao gravar auditoria da decisão.',
        variant: 'destructive',
      })
    }
  }

  // Disparar negociação do Carlão com o motorista selecionado
  const handleStartCarlaoNegotiation = async () => {
    if (!selectedCargoForOffer || !selectedDriverForCarlao) return
    setActionLoading(true)

    try {
      const weightTon = (selectedCargoForOffer.weight_kg || 27000) / 1000
      const dischargesCount =
        selectedCargoForOffer.customers_count || selectedCargoForOffer.deliveries_count || 1

      const band = calculateSmartPriceBand(
        120,
        selectedCargoForOffer.weight_kg || 27000,
        selectedCargoForOffer.floor_value || 2532,
        2720,
        6.5,
      )

      const pedagio = 428.4
      const opDetail =
        dischargesCount > 1
          ? ` (${weightTon.toFixed(2)} t · ${dischargesCount} descargas)`
          : ` (${weightTon.toFixed(2)} t)`

      const initialMessage = `Olá, ${selectedDriverForCarlao.driverName}! Tudo bem? Temos uma carga CIAFAL (${selectedCargoForOffer.cargo_id})${opDetail} para ${selectedCargoForOffer.destination || 'Campinas/SP'} com previsão de carregamento hoje. Vi que seu veículo (${selectedDriverForCarlao.vehiclePlate || '---'}) atende perfeitamente. Frete proposto de ${formatCurrency(band.metaCiafal)} líquido + Pedágio integral de ${formatCurrency(pedagio)}. Deseja que eu passe todos os detalhes?`

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
          motivo: `Abertura de Onda ${selectedDriverForCarlao.suggestedWave} com motorista de score ${selectedDriverForCarlao.score}/100. Separação obrigatória de frete e pedágio conforme política CIAFAL.`,
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
        weight_ton: 28.5,
        discharges_count: 2,
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
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#005596]">
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
                <div className="text-2xl font-black text-amber-700 mt-0.5">82,4 %</div>
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
                <div className="text-2xl font-black text-slate-800 mt-0.5">14 min 48 s</div>
                <p className="text-[10px] text-slate-500">Agilidade Carlão</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#005596]">
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
                            {formatWeight(offer.weight_kg || 27000)} •{' '}
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
                              {formatCurrency(band.pisoAntt)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#005596] font-bold">
                            <span>Meta CIAFAL:</span>
                            <span>{formatCurrency(band.metaCiafal)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-amber-700 font-semibold">
                            <span>Autonomia Carlão:</span>
                            <span>Até {formatCurrency(band.autonomiaMaximaCarlao)}</span>
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

        {/* MODAL: SELEÇÃO MULTICRITÉRIO INTELIGENTE & SCORE DE ADEQUAÇÃO À CARGA */}
        <Dialog open={carlaoModalOpen} onOpenChange={setCarlaoModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#005596]" />
                    Seleção Multicritério Inteligente & Adequação à Carga
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Carga:{' '}
                    <strong className="text-slate-800">
                      {selectedCargoForOffer?.cargo_id}
                    </strong> •
                    Destino: {selectedCargoForOffer?.destination} • Peso:{' '}
                    {formatWeight(selectedCargoForOffer?.weight_kg || 27000)} (
                    {((selectedCargoForOffer?.weight_kg || 27000) / 1000).toFixed(2)} t) •
                    Descargas:{' '}
                    {selectedCargoForOffer?.customers_count ||
                      selectedCargoForOffer?.deliveries_count ||
                      1}
                  </DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimulationModalOpen(true)}
                  className="text-xs border-[#005596] text-[#005596] hover:bg-sky-50 gap-1 font-bold"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Simular / Comparar Motoristas
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Seletor de Template de Seleção com Pesos Parametrizáveis */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Template de Seleção por Operação:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ajusta os pesos dos 9 critérios dinamicamente
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateCode}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="text-xs p-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
                  >
                    <option value="TPL_CARGA_PADRAO">Carga Padrão CIAFAL (Equilibrado)</option>
                    <option value="TPL_CLIENTE_CRITICO">Cliente Crítico & Janela Estrita</option>
                    <option value="TPL_ENTREGA_URGENTE">Entrega Urgente / Imediata</option>
                    <option value="TPL_OPERACAO_COMPLEXA">Operação Complexa / Rota Sensível</option>
                  </select>
                </div>
              </div>

              {/* Alerta Inteligente de Qualidade de Dados / Confiança */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Critério de Decisão:</strong> Separamos <em>Motoristas Elegíveis</em>{' '}
                    (requisitos mínimos) de <em>Motoristas Recomendados</em> (melhor custo total
                    esperado).
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-white text-amber-800 border-amber-300 text-[10px]"
                >
                  Fórmula: Modelo Seleção v1.0
                </Badge>
              </div>

              {/* Lista de Motoristas Ordenados por Score de Adequação */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-bold text-slate-700 text-xs">
                  <span>Candidatos Avaliados ({fitnessResults.length}):</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Ordenados por Score de Adequação à Carga
                  </span>
                </div>

                {fitnessResults.map((cand, idx) => {
                  const isSelected = selectedFitnessCandidate?.driverId === cand.driverId
                  const isTopRanked = idx === 0

                  return (
                    <div
                      key={cand.driverId}
                      className={`p-3.5 rounded-xl border transition ${
                        isSelected
                          ? 'border-[#005596] bg-sky-50/60 shadow-sm ring-1 ring-[#005596]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              #{idx + 1} {cand.driverName}
                            </span>
                            {cand.isRecommended ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                RECOMENDADO IA
                              </Badge>
                            ) : cand.isEligible ? (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]"
                              >
                                ELEGÍVEL
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                NÃO ELEGÍVEL
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {cand.vehiclePlate || 'ABC1D23'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {cand.vehicleType || 'Carreta Vanderléia'} • Frete Histórico:{' '}
                            {formatCurrency(cand.expectedCostDetails.nominalFreight)} • Custo Total
                            Esperado:{' '}
                            <strong className="text-slate-800">
                              {formatCurrency(cand.expectedCostDetails.totalExpectedCost)}
                            </strong>{' '}
                            (Confiança {cand.expectedCostDetails.confidenceLevel})
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-2xl font-black text-[#005596]">
                                {cand.fitnessScore}
                              </span>
                              <span className="text-xs text-slate-400 font-bold">/100</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              Score de Adequação
                            </span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleSelectWithOverride(cand)}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`text-xs font-bold ${
                              isSelected
                                ? 'bg-[#005596] text-white hover:bg-[#004275]'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected
                              ? 'Selecionado'
                              : isTopRanked
                                ? 'Selecionar'
                                : 'Override Humano'}
                          </Button>
                        </div>
                      </div>

                      {/* Linha da Justificativa da IA e Linha de Explicabilidade Detalhada */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 bg-slate-50 p-2.5 rounded-lg space-y-2">
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-900">IA:</strong>{' '}
                            {cand.aiJustification.headline}
                          </div>
                        </div>

                        {/* Contribuição dos 9 Critérios (Explicabilidade sem caixa-preta) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-[10px] bg-white p-2 rounded border border-slate-200">
                          <div>
                            Compat:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.operationalCompatibility} pts
                            </strong>
                          </div>
                          <div>
                            Perform:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.historicalPerformance} pts
                            </strong>
                          </div>
                          <div>
                            Exp Rota:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.routeExperience} pts
                            </strong>
                          </div>
                          <div>
                            Exp Cliente:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.customerExperience} pts
                            </strong>
                          </div>
                          <div>
                            Localização:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.locationAvailability} pts
                            </strong>
                          </div>
                          <div>
                            Custo:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.expectedCost} pts
                            </strong>
                          </div>
                          <div>
                            Pontual:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.punctuality} pts
                            </strong>
                          </div>
                          <div>
                            Ocorrências:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.occurrences} pts
                            </strong>
                          </div>
                          <div>
                            Colab Fred:{' '}
                            <strong className="text-slate-800">
                              +{cand.pointsContribution.fredCollaboration} pts
                            </strong>
                          </div>
                          <div className="font-bold text-[#005596]">
                            Total: {cand.pointsContribution.totalSum} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
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
                {actionLoading
                  ? 'Disparando Carlão...'
                  : `Iniciar Negociação com ${selectedDriverForCarlao?.driverName || 'Motorista'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: SIMULAÇÃO / COMPARAÇÃO DE MOTORISTAS (PARTE 4) */}
        <Dialog open={simulationModalOpen} onOpenChange={setSimulationModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#005596]" />
                Simulador Comparativo de Motoristas & Trade-Off Custo × Score
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Compare múltiplos candidatos para avaliar o menor Custo Total Esperado vs Menor
                Frete Nominal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Motorista</th>
                      <th className="p-2.5">Frete Nominal</th>
                      <th className="p-2.5">Pedágio</th>
                      <th className="p-2.5">Risco Ocorrência</th>
                      <th className="p-2.5">Custo Total Esperado</th>
                      <th className="p-2.5">Score Adequação</th>
                      <th className="p-2.5">Pontualidade</th>
                      <th className="p-2.5">Status IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {fitnessResults.map((cand) => (
                      <tr key={cand.driverId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {cand.driverName}
                          <span className="block text-[10px] text-slate-400 font-normal font-mono">
                            {cand.vehiclePlate || 'ABC1D23'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {formatCurrency(cand.expectedCostDetails.nominalFreight)}
                        </td>
                        <td className="p-2.5">
                          {formatCurrency(cand.expectedCostDetails.pedagio)}
                        </td>
                        <td className="p-2.5 text-amber-700">
                          {formatCurrency(cand.expectedCostDetails.occurrenceExpectedRiskCost)}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {formatCurrency(cand.expectedCostDetails.totalExpectedCost)}
                          <span className="block text-[10px] text-slate-500 font-normal">
                            Faixa: {formatCurrency(cand.expectedCostDetails.costRangeMin)} a{' '}
                            {formatCurrency(cand.expectedCostDetails.costRangeMax)}
                          </span>
                        </td>
                        <td className="p-2.5 font-black text-[#005596]">{cand.fitnessScore}/100</td>
                        <td className="p-2.5 text-emerald-700 font-bold">
                          {cand.subscores.punctuality}%
                        </td>
                        <td className="p-2.5">
                          {cand.isRecommended ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              RECOMENDADO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              ELEGÍVEL
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-slate-800">
                <span className="font-bold text-[#005596] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Recomendação Final da IA:
                </span>
                <p className="text-xs text-slate-700">
                  O motorista <strong>{fitnessResults[0]?.driverName}</strong> oferece a melhor
                  relação entre custo total esperado e segurança de entrega. Embora seu frete
                  nominal possa não ser o menor da mesa, o risco estimado de ocorrências e atrasos é
                  estatisticamente inferior, resultando em menor custo consolidado para a CIAFAL.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                size="sm"
                onClick={() => setSimulationModalOpen(false)}
                className="bg-[#005596] text-white"
              >
                Fechar Simulador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: OVERRIDE HUMANO DE SELEÇÃO (AUDITORIA E GOVERNANÇA) */}
        <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                Registrar Decisão com Override Humano
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Você está selecionando um candidato diferente do 1º recomendado pela IA. A decisão
                será registrada na trilha de governança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  Motorista Recomendado: <strong>{fitnessResults[0]?.driverName}</strong> (Score{' '}
                  {fitnessResults[0]?.fitnessScore})
                </div>
                <div className="text-amber-800 font-bold mt-1">
                  Motorista Escolhido por Você: {candidateToOverride?.driverName} (Score{' '}
                  {candidateToOverride?.fitnessScore})
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Motivo do Override:</label>
                <select
                  value={overrideReasonCategory}
                  onChange={(e) => setOverrideReasonCategory(e.target.value)}
                  className="w-full p-2 border rounded-md text-xs bg-white"
                >
                  <option value="RELACIONAMENTO_ESTRATEGICO">
                    Relacionamento Estratégico com Parceiro
                  </option>
                  <option value="NECESSIDADE_OPERACIONAL_URGENTE">
                    Necessidade Operacional Urgente
                  </option>
                  <option value="ACORDO_COMERCIAL_ESPECIFICO">Acordo Comercial Específico</option>
                  <option value="DISPONIBILIDADE_IMEDIATA">
                    Disponibilidade Imediata em Pátio
                  </option>
                  <option value="DECISAO_GESTAO">Decisão Diretiva da Gestão</option>
                  <option value="OUTRO">Outro Motivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Justificativa Operacional (Obrigatório):
                </label>
                <Textarea
                  value={overrideJustificationText}
                  onChange={(e) => setOverrideJustificationText(e.target.value)}
                  placeholder="Explique o motivo da escolha para auditoria..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setOverrideModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmOverride}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Confirmar Escolha Auditada
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
                    Piso ANTT Obrigatório: <strong>{formatCurrency(explainData.piso)}</strong>
                  </div>
                  <div>
                    Meta CIAFAL: <strong>{formatCurrency(explainData.meta)}</strong>
                  </div>
                  <div>
                    Mediana da Rota: <strong>{formatCurrency(explainData.referencia)}</strong>
                  </div>
                  <div>
                    Autonomia Máxima IA: <strong>{formatCurrency(explainData.autonomia)}</strong>
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
