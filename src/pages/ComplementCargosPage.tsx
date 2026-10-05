import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  Sparkles,
  Send,
  Building,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Truck,
  Package,
  Users,
  Search,
  HelpCircle,
  Check,
  X,
  History,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Calendar,
  MapPin,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { LoadingState } from '@/components/ui-custom/FeedbackStates'
import { tmsService } from '@/services/tmsService'
import { formatWeight } from '@/lib/utils'
import {
  LoadComplementOpportunityEntity,
  LoadComplementCandidateEntity,
  LoadComplementHistoryEntity,
  CommercialOpportunityStatus,
  FinancialComplementRequestEntity,
  determineOpportunityRouting,
  isCreditBlockedReason,
} from '@/domain/rules'
import {
  CommercialComplementEngine,
  CustomerCommercialHistorySummary,
  CommercialAiEvaluationResult,
} from '@/domain/commercialComplementEngine'
import { CommercialHistoryDetailModal } from '@/components/commercial/CommercialHistoryDetailModal'
import { SendCommercialProposalModal } from '@/components/commercial/SendCommercialProposalModal'
import { CommercialFeedbackModal } from '@/components/commercial/CommercialFeedbackModal'
import { useRealtime } from '@/hooks/use-realtime'
import { DollarSign, FileText, BadgeAlert, ArrowUpRight, ShieldCheck } from 'lucide-react'

// Status com Badge e estilo consistente CIAFAL
export const renderStatusBadge = (status?: string) => {
  switch (status) {
    case 'Nova':
    case 'Nova oportunidade':
      return <Badge className="bg-sky-600 text-white text-[10px] font-semibold">NOVA</Badge>
    case 'Selecionada':
      return (
        <Badge className="bg-indigo-600 text-white text-[10px] font-semibold">SELECIONADA</Badge>
      )
    case 'Enviada ao Comercial':
      return (
        <Badge className="bg-[#005596] text-white text-[10px] font-bold">
          ENVIADA AO COMERCIAL
        </Badge>
      )
    case 'Em análise comercial':
    case 'Contato iniciado':
    case 'Cliente interessado':
      return (
        <Badge className="bg-amber-600 text-white text-[10px] font-semibold">
          EM ANÁLISE COMERCIAL
        </Badge>
      )
    case 'Aceita pelo Comercial':
      return (
        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
          ACEITA PELO COMERCIAL
        </Badge>
      )
    case 'Recusada pelo Comercial':
    case 'Recusado pelo cliente':
    case 'Descartado':
      return (
        <Badge className="bg-rose-600 text-white text-[10px] font-semibold">
          RECUSADA PELO COMERCIAL
        </Badge>
      )
    case 'Expirada':
    case 'Expirado':
      return <Badge className="bg-slate-500 text-white text-[10px] font-semibold">EXPIRADA</Badge>
    case 'Convertida em venda':
    case 'Associado à carga':
    case 'Pedido criado':
      return (
        <Badge className="bg-emerald-700 text-white text-[10px] font-black">
          CONVERTIDA EM VENDA
        </Badge>
      )
    default:
      return <Badge className="bg-slate-600 text-white text-[10px]">{status || 'INDEFINIDO'}</Badge>
  }
}

export const ComplementCargosPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<LoadComplementOpportunityEntity[]>([])
  const [candidatesMap, setCandidatesMap] = useState<
    Record<string, LoadComplementCandidateEntity[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ativas' | 'excecoes' | 'todas'>('ativas')

  // Filtros avançados
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterItinerary, setFilterItinerary] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [filterSalesRep, setFilterSalesRep] = useState<string>('all')
  const [filterCityUf, setFilterCityUf] = useState<string>('all')
  const [filterDispatchDate, setFilterDispatchDate] = useState<string>('')
  const [filterSentCommercial, setFilterSentCommercial] = useState<string>('all') // all | sim | nao
  const [filterConvertedSale, setFilterConvertedSale] = useState<string>('all') // all | sim | nao

  // 1. SELEÇÃO DE OPORTUNIDADES (Estado elevado na página para persistir entre navegações)
  const [selectedOppIds, setSelectedOppIds] = useState<string[]>([])

  // 2. BOTÃO E MODAL "Enviar p/ Comercial" (Individual ou em Lote)
  const [isBatchSendModalOpen, setIsBatchSendModalOpen] = useState(false)
  const [isSendingBatch, setIsSendingBatch] = useState(false)

  // Duplicidade e Reenvio
  const [duplicateWarningOpp, setDuplicateWarningOpp] =
    useState<LoadComplementOpportunityEntity | null>(null)
  const [isResendModalOpen, setIsResendModalOpen] = useState(false)
  const [resendReason, setResendReason] = useState('')
  const [isResending, setIsResending] = useState(false)

  // 7. HISTÓRICO DA OPORTUNIDADE (Timeline / Tabela de eventos auditáveis)
  const [historyModalOpp, setHistoryModalOpp] = useState<LoadComplementOpportunityEntity | null>(
    null,
  )
  const [oppHistoryList, setOppHistoryList] = useState<LoadComplementHistoryEntity[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Modais de detalhamento e explicabilidade da IA
  const [detailOpp, setDetailOpp] = useState<LoadComplementOpportunityEntity | null>(null)
  const [selectedCandidateExplanation, setSelectedCandidateExplanation] =
    useState<LoadComplementCandidateEntity | null>(null)

  // Atualização manual de status comercial
  const [statusUpdateOpp, setStatusUpdateOpp] = useState<LoadComplementOpportunityEntity | null>(
    null,
  )
  const [newStatusSelected, setNewStatusSelected] =
    useState<CommercialOpportunityStatus>('Em análise comercial')
  const [statusNotes, setStatusNotes] = useState('')

  // Modal para Simulação de Correlação Automática com Novo Pedido SAP
  const [isSimulateOrderModalOpen, setIsSimulateOrderModalOpen] = useState(false)
  const [targetOppForOrder, setTargetOppForOrder] =
    useState<LoadComplementOpportunityEntity | null>(null)
  const [simulatedSapOrders, setSimulatedSapOrders] = useState<any[]>([])

  // FLUXO "ENVIAR P/ FINANCEIRO" (REQUISITOS 1 A 9)
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false)
  const [financialTargetOpp, setFinancialTargetOpp] =
    useState<LoadComplementOpportunityEntity | null>(null)
  const [financialObservation, setFinancialObservation] = useState('')
  const [isSendingFinancial, setIsSendingFinancial] = useState(false)

  // Consulta / Detalhe da Solicitação Financeira ("Ver solicitação")
  const [viewFinancialRequestModal, setViewFinancialRequestModal] =
    useState<FinancialComplementRequestEntity | null>(null)
  const [isLoadingFinancialDetail, setIsLoadingFinancialDetail] = useState(false)

  // Painel de Fila Financeira (RBAC: perfil com permissão financeira)
  const [isFinancialDeskOpen, setIsFinancialDeskOpen] = useState(false)
  const [financialQueueList, setFinancialQueueList] = useState<FinancialComplementRequestEntity[]>(
    [],
  )
  const [isLoadingFinancialQueue, setIsLoadingFinancialQueue] = useState(false)
  const [financialDecisionModal, setFinancialDecisionModal] =
    useState<FinancialComplementRequestEntity | null>(null)
  const [financialDecisionAction, setFinancialDecisionAction] = useState<
    'LIBERAR' | 'REPROVAR' | 'SOLICITAR_INFORMACOES'
  >('LIBERAR')
  const [financialDecisionJustification, setFinancialDecisionJustification] = useState('')
  const [financialSapCondition, setFinancialSapCondition] = useState<'LIBERADO' | 'BLOQUEADO'>(
    'LIBERADO',
  )
  const [isProcessingFinancialDecision, setIsProcessingFinancialDecision] = useState(false)

  const userRole = user?.role || 'gerente_carga'
  const canResend = ['admin_master', 'admin_tms', 'gestor_logistica', 'gerente_carga'].includes(
    userRole,
  )
  const canAccessFinancialDesk = [
    'financeiro',
    'admin_master',
    'admin_tms',
    'gestor_logistica',
  ].includes(userRole)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [opps, sapOrders] = await Promise.all([
        tmsService.getLoadComplementOpportunities(),
        tmsService.getSapSalesOrders(),
      ])
      setOpportunities(opps)
      setSimulatedSapOrders(sapOrders || [])

      // Carregar candidatos de cada oportunidade
      const candMap: Record<string, LoadComplementCandidateEntity[]> = {}
      for (const opp of opps.slice(0, 20)) {
        try {
          const list = await tmsService.getLoadComplementCandidates(opp.opportunity_code)
          candMap[opp.opportunity_code] = list
        } catch {
          /* ignore */
        }
      }
      setCandidatesMap(candMap)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar oportunidades',
        description: err?.message || 'Falha ao buscar central de oportunidades.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Carregar histórico quando abrir modal de timeline
  const handleOpenHistory = async (opp: LoadComplementOpportunityEntity) => {
    setHistoryModalOpp(opp)
    setIsLoadingHistory(true)
    try {
      const hist = await tmsService.getLoadComplementHistory(opp.id || opp.opportunity_code)
      setOppHistoryList(hist)
    } catch (err) {
      console.error('Failed to load history:', err)
      setOppHistoryList([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Listas para dropdowns de filtros
  const filterOptions = useMemo(() => {
    const itineraries = Array.from(
      new Set(opportunities.map((o) => o.itinerary_id).filter(Boolean)),
    )
    const clients = Array.from(new Set(opportunities.map((o) => o.customer_name).filter(Boolean)))
    const salesReps = Array.from(
      new Set(
        opportunities.map((o) => o.commercial_representative || o.salesperson_id).filter(Boolean),
      ),
    )
    const cities = Array.from(
      new Set(
        opportunities
          .map((o) =>
            o.destination_city ? `${o.destination_city}/${o.destination_uf || 'BR'}` : '',
          )
          .filter(Boolean),
      ),
    )
    return { itineraries, clients, salesReps, cities }
  }, [opportunities])

  // Filtragem combinada
  const filteredOpps = useMemo(() => {
    return opportunities.filter((opp) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        opp.opportunity_code.toLowerCase().includes(q) ||
        opp.load_proposal_id.toLowerCase().includes(q) ||
        opp.itinerary_id.toLowerCase().includes(q) ||
        (opp.customer_name && opp.customer_name.toLowerCase().includes(q)) ||
        (opp.material_description && opp.material_description.toLowerCase().includes(q)) ||
        (opp.destination_city && opp.destination_city.toLowerCase().includes(q))

      if (!matchesSearch) return false

      // Abas de visualização
      if (activeTab === 'ativas') {
        const isNotActive =
          opp.commercial_status === 'Associado à carga' ||
          opp.commercial_status === 'Convertida em venda' ||
          opp.commercial_status === 'Descartado' ||
          opp.commercial_status === 'Expirado' ||
          opp.commercial_status === 'Expirada'
        if (isNotActive) return false
      } else if (activeTab === 'excecoes') {
        const hasBlock =
          opp.is_blocked ||
          opp.credit_status?.includes('Bloqueado') ||
          opp.stock_status?.includes('Indisponível')
        if (!hasBlock) return false
      }

      // Filtro por status
      if (filterStatus !== 'all' && opp.commercial_status !== filterStatus) return false

      // Filtro por itinerário
      if (filterItinerary !== 'all' && opp.itinerary_id !== filterItinerary) return false

      // Filtro por cliente
      if (filterClient !== 'all' && opp.customer_name !== filterClient) return false

      // Filtro por vendedor/representante
      if (
        filterSalesRep !== 'all' &&
        (opp.commercial_representative || opp.salesperson_id) !== filterSalesRep
      )
        return false

      // Filtro por Cidade/UF
      if (filterCityUf !== 'all') {
        const cityUfStr = opp.destination_city
          ? `${opp.destination_city}/${opp.destination_uf || 'BR'}`
          : ''
        if (cityUfStr !== filterCityUf) return false
      }

      // Filtro por Data da Programação
      if (filterDispatchDate) {
        if (
          !opp.planned_dispatch_date ||
          !opp.planned_dispatch_date.startsWith(filterDispatchDate)
        ) {
          return false
        }
      }

      // Filtro Enviado ao Comercial (Sim / Não)
      if (filterSentCommercial !== 'all') {
        const isSent =
          opp.commercial_status === 'Enviada ao Comercial' ||
          opp.commercial_status === 'Em análise comercial' ||
          opp.commercial_status === 'Aceita pelo Comercial' ||
          opp.commercial_status === 'Convertida em venda' ||
          Boolean(opp.commercial_sent_at)
        if (filterSentCommercial === 'sim' && !isSent) return false
        if (filterSentCommercial === 'nao' && isSent) return false
      }

      // Filtro Convertido em Venda (Sim / Não)
      if (filterConvertedSale !== 'all') {
        const isConverted =
          opp.commercial_status === 'Convertida em venda' ||
          opp.commercial_status === 'Associado à carga' ||
          opp.commercial_status === 'Pedido criado'
        if (filterConvertedSale === 'sim' && !isConverted) return false
        if (filterConvertedSale === 'nao' && isConverted) return false
      }

      return true
    })
  }, [
    opportunities,
    searchQuery,
    activeTab,
    filterStatus,
    filterItinerary,
    filterClient,
    filterSalesRep,
    filterCityUf,
    filterDispatchDate,
    filterSentCommercial,
    filterConvertedSale,
  ])

  // Oportunidades selecionadas elegíveis (calculadas a partir da seleção global)
  const selectedOpportunities = useMemo(() => {
    return opportunities.filter((o) => selectedOppIds.includes(o.id))
  }, [opportunities, selectedOppIds])

  // Lista dos registros visíveis atualmente na tela que NÃO estão bloqueados
  const selectableVisibleOpps = useMemo(() => {
    return filteredOpps.filter((o) => !o.is_blocked)
  }, [filteredOpps])

  const areAllVisibleSelected =
    selectableVisibleOpps.length > 0 &&
    selectableVisibleOpps.every((o) => selectedOppIds.includes(o.id))

  const handleToggleSelectAllVisible = () => {
    if (areAllVisibleSelected) {
      // Desmarca apenas os visíveis selecionáveis
      const visibleIds = new Set(selectableVisibleOpps.map((o) => o.id))
      setSelectedOppIds((prev) => prev.filter((id) => !visibleIds.has(id)))
    } else {
      // Adiciona todos os visíveis selecionáveis à seleção persistente
      const toAdd = selectableVisibleOpps.map((o) => o.id)
      setSelectedOppIds((prev) => Array.from(new Set([...prev, ...toAdd])))
    }
  }

  const handleToggleSelectOpp = (opp: LoadComplementOpportunityEntity) => {
    if (opp.is_blocked) return
    setSelectedOppIds((prev) =>
      prev.includes(opp.id) ? prev.filter((id) => id !== opp.id) : [...prev, opp.id],
    )
  }

  // Disparo ao clicar no botão "Enviar p/ Comercial" da área superior
  const handleTriggerSendBatch = () => {
    if (selectedOpportunities.length === 0) return

    // 6. Verificação de Duplicidade antes de abrir popup geral
    const alreadySentOne = selectedOpportunities.find(
      (o) =>
        (o.commercial_status === 'Enviada ao Comercial' ||
          o.commercial_status === 'Em análise comercial') &&
        Boolean(o.commercial_sent_at),
    )

    if (alreadySentOne && selectedOpportunities.length === 1) {
      // Aviso específico de duplicidade com opção de reenvio
      setDuplicateWarningOpp(alreadySentOne)
      return
    }

    setIsBatchSendModalOpen(true)
  }

  // Confirmação do Envio em Lote / Unitário
  const handleConfirmBatchSend = async () => {
    if (selectedOpportunities.length === 0) return
    setIsSendingBatch(true)

    try {
      const res = await tmsService.sendLoadComplementsBatchToCommercial({
        opportunityIds: selectedOpportunities.map((o) => o.id),
        userEmail: user?.email || 'operador@ciafal.com.br',
        userName: user?.name || 'Operador Logístico CIAFAL',
        userRole,
        isResend: false,
      })

      if (res.success) {
        toast({
          title: 'Envio ao Comercial Concluído',
          description: res.message,
        })
        setIsBatchSendModalOpen(false)
        setSelectedOppIds([])
        fetchData()
      } else if (res.alreadySent) {
        toast({
          title: 'Oportunidade já enviada',
          description: res.message,
          variant: 'destructive',
        })
      } else if (res.isBlocked) {
        toast({
          title: 'Oportunidade Indisponível',
          description: res.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Falha no envio',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: err?.message || 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingBatch(false)
    }
  }

  // Reenvio autorizado para duplicidade
  const handleConfirmResend = async () => {
    if (!duplicateWarningOpp) return
    setIsResending(true)

    try {
      const res = await tmsService.sendLoadComplementsBatchToCommercial({
        opportunityIds: [duplicateWarningOpp.id],
        userEmail: user?.email || 'gestor@ciafal.com.br',
        userName: user?.name || 'Gestor Logístico CIAFAL',
        userRole,
        isResend: true,
        resendReason: resendReason || 'Reavaliação comercial deliberada pelo gestor logístico',
      })

      if (res.success) {
        toast({
          title: 'Reenvio ao Comercial Concluído',
          description: `Oportunidade ${duplicateWarningOpp.opportunity_code} reenviada ao comercial com sucesso.`,
        })
        setIsResendModalOpen(false)
        setDuplicateWarningOpp(null)
        setResendReason('')
        fetchData()
      } else {
        toast({
          title: 'Falha no reenvio',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro no reenvio',
        description: err?.message || 'Falha no servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsResending(false)
    }
  }

  // Atualização manual de status comercial
  const handleUpdateStatus = async () => {
    if (!statusUpdateOpp) return
    try {
      const ok = await tmsService.updateCommercialOpportunityStatus(
        statusUpdateOpp.id,
        newStatusSelected,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logístico',
        statusNotes,
      )
      if (ok) {
        toast({
          title: 'Status Comercial Atualizado',
          description: `Oportunidade alterada para "${newStatusSelected}".`,
        })
        setStatusUpdateOpp(null)
        setStatusNotes('')
        fetchData()
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: err?.message,
      })
    }
  }

  // 4. Correlação Automática com Novo Pedido SAP
  const handleCorrelateSapOrder = async (orderId: string) => {
    try {
      const res = await tmsService.correlateSapOrderWithComplement(
        orderId,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logístico',
      )
      if (res.correlated) {
        toast({
          title: 'Venda confirmada / Integração SAP',
          description: res.message,
        })
        setIsSimulateOrderModalOpen(false)
        fetchData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Não correlacionado',
          description: res.message,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na correlação SAP',
        description: err?.message,
      })
    }
  }

  // ABERTURA DO MODAL "Enviar p/ Financeiro" (REQUISITO 3)
  const handleOpenSendFinancial = (opp: LoadComplementOpportunityEntity) => {
    setFinancialTargetOpp(opp)
    setFinancialObservation('')
    setIsFinancialModalOpen(true)
  }

  // ENVIO DA SOLICITAÇÃO FINANCEIRA (REQUISITO 4)
  const handleConfirmSendFinancial = async () => {
    if (!financialTargetOpp) return
    setIsSendingFinancial(true)

    try {
      const res = await tmsService.sendComplementToFinancial({
        opportunityId: financialTargetOpp.id,
        observation: financialObservation,
        userEmail: user?.email || 'operador@ciafal.com.br',
        userName: user?.name || 'Operador Logístico',
        userRole,
        creditLimit: 400000,
        creditUsed: 415000,
        creditAvailable: -15000,
        requiredValue: 28500,
        lastSapQueryAt: new Date().toISOString(),
      })

      if (res.success) {
        // Exatamente a mensagem requerida pelo requisito 4:
        toast({
          title: 'Solicitação Financeira Registrada',
          description:
            'Solicitação enviada ao Financeiro com sucesso. A oportunidade permanecerá bloqueada até nova avaliação do crédito.',
        })
        setIsFinancialModalOpen(false)
        setFinancialTargetOpp(null)
        setFinancialObservation('')
        fetchData()
      } else if (res.alreadyRequested) {
        toast({
          title: 'Análise Financeira Pendente',
          description: res.message,
          variant: 'destructive',
        })
        setIsFinancialModalOpen(false)
        fetchData()
      } else {
        toast({
          title: 'Falha no envio ao Financeiro',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: err?.message || 'Falha ao conectar com o serviço financeiro.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingFinancial(false)
    }
  }

  // ABRIR CONSULTA DA SOLICITAÇÃO EXISTENTE ("Ver solicitação" - REQUISITO 5)
  const handleViewFinancialRequest = async (opp: LoadComplementOpportunityEntity) => {
    setIsLoadingFinancialDetail(true)
    try {
      let req: FinancialComplementRequestEntity | null = null
      if (opp.financial_request_id) {
        const list = await tmsService.getFinancialComplementRequests(
          `id="${opp.financial_request_id}"`,
        )
        req = list[0] || null
      }
      if (!req) {
        req = await tmsService.getFinancialRequestByOpportunityId(opp.id)
      }
      if (req) {
        setViewFinancialRequestModal(req)
      } else {
        toast({
          title: 'Solicitação não localizada',
          description: 'Não foram encontrados detalhes no banco de dados para esta solicitação.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao consultar',
        description: err?.message || 'Falha ao buscar dados da solicitação financeira.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingFinancialDetail(false)
    }
  }

  // ABRIR PAINEL DO FINANCEIRO (REQUISITO 6)
  const handleOpenFinancialDesk = async () => {
    setIsFinancialDeskOpen(true)
    setIsLoadingFinancialQueue(true)
    try {
      const list = await tmsService.getFinancialComplementRequests()
      setFinancialQueueList(list)
    } catch (err: any) {
      toast({
        title: 'Erro na fila financeira',
        description: err?.message || 'Falha ao carregar solicitações financeiras.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingFinancialQueue(false)
    }
  }

  // PROCESSAR DECISÃO FINANCEIRA (REQUISITOS 6, 7 e 8)
  const handleProcessFinancialDecision = async () => {
    if (!financialDecisionModal) return
    if (!financialDecisionJustification.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description:
          'É necessário preencher uma observação/justificativa para registrar a decisão financeira.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessingFinancialDecision(true)
    try {
      const res = await tmsService.decideFinancialComplementRequest({
        requestId: financialDecisionModal.id,
        action: financialDecisionAction,
        justification: financialDecisionJustification.trim(),
        sapCondition: financialSapCondition,
        userEmail: user?.email || 'financeiro@ciafal.com.br',
        userName: user?.name || 'Analista Financeiro',
        userRole,
      })

      if (res.success) {
        toast({
          title: 'Decisão Financeira Processada',
          description: res.message,
        })
        setFinancialDecisionModal(null)
        setFinancialDecisionJustification('')
        // Recarregar fila e dados da página
        const updatedList = await tmsService.getFinancialComplementRequests()
        setFinancialQueueList(updatedList)
        fetchData()
      } else {
        toast({
          title: 'Falha ao processar decisão',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro no processamento',
        description: err?.message || 'Falha ao enviar decisão ao servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessingFinancialDecision(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 pb-16">
        <PageHeader
          title="Complemento de Cargas — Central de Oportunidades Comerciais"
          subtitle="Motor determinístico: itinerário programado + clientes elegíveis + histórico real + crédito + estoque DP34/PCP + capacidade residual."
          icon={Layers}
          breadcrumbs={[{ label: 'TMS CIAFAL', href: '/tms' }, { label: 'Complemento de Cargas' }]}
          badge={
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              OPORTUNIDADE COMERCIAL
            </Badge>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* CONTADOR DE SELEÇÃO VISÍVEL */}
              {selectedOppIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[#005596] border-[#005596]/30 text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#005596]" />
                  <span>
                    {selectedOppIds.length}{' '}
                    {selectedOppIds.length === 1
                      ? 'oportunidade selecionada'
                      : 'oportunidades selecionadas'}
                  </span>
                  <button
                    onClick={() => setSelectedOppIds([])}
                    className="ml-1 hover:text-rose-600 text-[10px] font-bold"
                    title="Limpar seleção"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {/* BOTÃO FILA FINANCEIRA (Visível para Financeiro e Gestores) */}
              {canAccessFinancialDesk && (
                <Button
                  onClick={handleOpenFinancialDesk}
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 text-[#005596] border-[#005596]/40 hover:bg-[#005596]/10 flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#005596]" />
                  <span>Fila Financeira</span>
                </Button>
              )}

              {/* BOTÃO "Enviar p/ Comercial" */}
              <Button
                onClick={handleTriggerSendBatch}
                disabled={selectedOpportunities.length === 0}
                className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-9 px-4 font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  Enviar p/ Comercial
                  {selectedOpportunities.length > 0 && ` (${selectedOpportunities.length})`}
                </span>
              </Button>

              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="text-xs h-9"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar Central
              </Button>
            </div>
          }
        />

        {/* BANNER INSTITUCIONAL CIAFAL */}
        <div className="bg-[#005596]/10 border border-[#005596]/30 rounded-xl p-4 text-xs text-[#005596] dark:text-sky-300 space-y-1">
          <div className="font-bold flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-[#005596]" />
            <span>MOTOR INTEGRADO DE RECOMENDAÇÃO (ANTI-ALUCINAÇÃO)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            Todas as oportunidades nascem automaticamente das programações do{' '}
            <strong>Roteirizador & Simulador</strong>. A IA analisa histórico de compras reais e
            disponibilidade em estoque/PCP, nunca inserindo pedido manual na carga — a venda nasce
            no SAP e o TMS correlaciona automaticamente via RFC/BAPI.
          </p>
        </div>

        {/* BARRA DE FILTROS & ABAS */}
        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="ativas" className="text-xs">
                  Ativas (
                  {
                    opportunities.filter(
                      (o) =>
                        o.commercial_status !== 'Associado à carga' &&
                        o.commercial_status !== 'Convertida em venda' &&
                        o.commercial_status !== 'Descartado' &&
                        o.commercial_status !== 'Expirada' &&
                        o.commercial_status !== 'Expirado',
                    ).length
                  }
                  )
                </TabsTrigger>
                <TabsTrigger value="excecoes" className="text-xs">
                  Exceções & Bloqueios
                </TabsTrigger>
                <TabsTrigger value="todas" className="text-xs">
                  Todas ({opportunities.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por proposta, código, itinerário, cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* 8. FILTROS ADICIONAIS CONFORME ESPECIFICADO */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
            {/* Status */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2"
              >
                <option value="all">Todos</option>
                <option value="Nova">Nova</option>
                <option value="Selecionada">Selecionada</option>
                <option value="Enviada ao Comercial">Enviada ao Comercial</option>
                <option value="Em análise comercial">Em análise comercial</option>
                <option value="Aceita pelo Comercial">Aceita pelo Comercial</option>
                <option value="Recusada pelo Comercial">Recusada pelo Comercial</option>
                <option value="Expirada">Expirada</option>
                <option value="Convertida em venda">Convertida em venda</option>
              </select>
            </div>

            {/* Itinerário */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Itinerário
              </label>
              <select
                value={filterItinerary}
                onChange={(e) => setFilterItinerary(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2"
              >
                <option value="all">Todos</option>
                {filterOptions.itineraries.map((it) => (
                  <option key={it} value={it}>
                    {it}
                  </option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1 truncate">
                Cliente
              </label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 truncate"
              >
                <option value="all">Todos</option>
                {filterOptions.clients.map((cli) => (
                  <option key={cli} value={cli}>
                    {cli}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendedor / Representante */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1 truncate">
                Vendedor / Repr.
              </label>
              <select
                value={filterSalesRep}
                onChange={(e) => setFilterSalesRep(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 truncate"
              >
                <option value="all">Todos</option>
                {filterOptions.salesReps.map((rep) => (
                  <option key={rep} value={rep}>
                    {rep}
                  </option>
                ))}
              </select>
            </div>

            {/* Cidade / UF */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1 truncate">
                Cidade/UF
              </label>
              <select
                value={filterCityUf}
                onChange={(e) => setFilterCityUf(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 truncate"
              >
                <option value="all">Todas</option>
                {filterOptions.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Data da Programação */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Data Programação
              </label>
              <input
                type="date"
                value={filterDispatchDate}
                onChange={(e) => setFilterDispatchDate(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2"
              />
            </div>

            {/* Enviado ao Comercial */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Env. Comercial?
              </label>
              <select
                value={filterSentCommercial}
                onChange={(e) => setFilterSentCommercial(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2"
              >
                <option value="all">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            {/* Convertido em venda */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Convertido Venda?
              </label>
              <select
                value={filterConvertedSale}
                onChange={(e) => setFilterConvertedSale(e.target.value)}
                className="w-full h-8 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2"
              >
                <option value="all">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>
        </div>

        {/* CABEÇALHO DA LISTAGEM COM "SELECIONAR TODOS" VISÍVEIS */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="select-all-visible"
              checked={areAllVisibleSelected}
              onCheckedChange={handleToggleSelectAllVisible}
              disabled={selectableVisibleOpps.length === 0}
              className="border-slate-400 data-[state=checked]:bg-[#005596] data-[state=checked]:border-[#005596]"
            />
            <label
              htmlFor="select-all-visible"
              className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none text-xs"
            >
              Selecionar todos os registros visíveis ({selectableVisibleOpps.length} aptos de{' '}
              {filteredOpps.length})
            </label>
          </div>

          <span className="text-[11px] text-slate-500">
            Total filtrado: <strong>{filteredOpps.length}</strong> oportunidades
          </span>
        </div>

        {/* GRID DE CARGAS E OPORTUNIDADES */}
        {filteredOpps.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
            <CardContent className="p-10 text-center text-slate-400 text-xs">
              Nenhuma oportunidade de complemento encontrada para os filtros atuais.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOpps.map((opp) => {
              const candidates = candidatesMap[opp.opportunity_code] || []
              const primaryCandidates = candidates.filter((c) => !c.is_exception)
              const exceptionCandidates = candidates.filter((c) => c.is_exception)
              const isSelected = selectedOppIds.includes(opp.id)
              const isBlocked =
                opp.is_blocked ||
                opp.credit_status?.includes('Bloqueado') ||
                opp.stock_status?.includes('Indisponível')

              return (
                <Card
                  key={opp.id}
                  className={`bg-white dark:bg-slate-900 border shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#005596] ring-1 ring-[#005596]/30'
                      : isBlocked
                        ? 'border-rose-200 dark:border-rose-950/60'
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div
                    className={`h-1.5 w-full ${
                      isBlocked ? 'bg-rose-500' : isSelected ? 'bg-[#005596]' : 'bg-[#005596]/70'
                    }`}
                  />

                  <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* 1 e 9. CHECKBOX INDIVIDUAL COM TOOLTIP EM CASO DE BLOQUEIO */}
                        {isBlocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="pt-0.5 cursor-not-allowed">
                                <Checkbox
                                  checked={false}
                                  disabled={true}
                                  className="border-slate-300 opacity-40 cursor-not-allowed"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-xs bg-slate-900 text-white"
                            >
                              <span>
                                Oportunidade indisponível para envio:{' '}
                                {opp.block_reason || 'restrição impeditiva'}.
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="pt-0.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelectOpp(opp)}
                              className="border-slate-400 data-[state=checked]:bg-[#005596] data-[state=checked]:border-[#005596]"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {opp.opportunity_code || `PROPOSTA ${opp.load_proposal_id}`}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                              Itinerário: {opp.itinerary_id}
                            </Badge>
                            {isBlocked && (
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge className="bg-rose-600 text-white text-[10px] flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" />
                                  BLOQUEADA
                                </Badge>
                                {opp.financial_substatus && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 font-medium"
                                  >
                                    {opp.financial_substatus}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <CardDescription className="text-xs text-slate-500 mt-1">
                            Saída prevista:{' '}
                            <strong>
                              {opp.planned_dispatch_date
                                ? new Date(opp.planned_dispatch_date).toLocaleDateString('pt-BR')
                                : 'A definir'}
                            </strong>{' '}
                            • Veículo: {opp.vehicle_type || 'Carreta 5 Eixos'} (
                            {((opp.vehicle_capacity_kg || 27000) / 1000).toFixed(1)} t)
                          </CardDescription>
                        </div>
                      </div>

                      {/* 4. STATUS COM BADGE COMPLETA */}
                      <div className="flex flex-col items-end gap-1">
                        {renderStatusBadge(opp.commercial_status)}
                        {opp.financial_request_number && (
                          <span className="text-[9px] font-mono text-slate-500">
                            {opp.financial_request_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs">
                    {/* METRICAS OPERACIONAIS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                          Programado
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {((opp.current_weight_kg || 0) / 1000).toFixed(1)} t
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                          Ocupação Atual
                        </span>
                        <strong className="text-blue-700 font-mono text-sm">
                          {opp.current_occupancy_pct}%
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                          Meta Máxima
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {opp.maximum_occupancy_pct}%
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                          Complemento Necessário
                        </span>
                        <strong className="text-amber-700 font-mono text-sm font-black">
                          {((opp.missing_weight_kg || 0) / 1000).toFixed(1)} t
                        </strong>
                      </div>
                    </div>

                    {/* DADOS DA OPORTUNIDADE: CLIENTE E PRODUTO SUGERIDO */}
                    <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-[#005596]" />
                          {opp.customer_name || 'Cliente Alvo na Rota'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Cód SAP: {opp.customer_sap_code || opp.customer_id || 'N/A'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          Produto sugerido:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {opp.material_description || opp.material_id || 'Laminados CA-50'}
                          </strong>
                        </div>
                        <div className="sm:text-right">
                          Destino:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {opp.destination_city || 'Destino na rota'}/{opp.destination_uf || 'BR'}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-800 text-slate-500">
                        <div>
                          Estoque: <strong>{opp.stock_status || 'DP34 liberado'}</strong>
                        </div>
                        <div>
                          Crédito:{' '}
                          <strong
                            className={
                              opp.credit_status?.includes('Bloqueado')
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }
                          >
                            {opp.credit_status || 'Liberado'}
                          </strong>
                        </div>
                        <div className="sm:text-right truncate">
                          Repr:{' '}
                          <strong>
                            {opp.commercial_representative ||
                              opp.salesperson_id ||
                              'Comercial CIAFAL'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* REGISTRO DE ENVIO COMERCIAL CASO JÁ TENHA SIDO ENVIADA */}
                    {opp.commercial_sent_at && (
                      <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded text-[11px] text-blue-950 dark:text-blue-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#005596]" />
                          Enviada em {new Date(opp.commercial_sent_at).toLocaleString('pt-BR')} por{' '}
                          <strong>{opp.commercial_sent_by || 'Operador Logístico'}</strong>
                        </span>
                        {opp.resend_count && opp.resend_count > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-amber-50 text-amber-700 border-amber-300"
                          >
                            Reenviada {opp.resend_count}x
                          </Badge>
                        ) : null}
                      </div>
                    )}

                    {/* BLOCO DE EXCEÇÃO VISÍVEL */}
                    {isBlocked && (
                      <div className="border border-rose-300 bg-rose-50/70 dark:bg-rose-950/30 rounded p-2 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Regra Impeditiva:
                        </span>
                        <p className="text-[10px]">
                          {opp.block_reason ||
                            'Crédito bloqueado no SAP ou material indisponível para expedição nesta data.'}
                        </p>
                      </div>
                    )}

                    {opp.ai_recommendation && (
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded text-[11px] text-slate-700 dark:text-slate-300 border">
                        <span className="font-bold block text-slate-800 dark:text-slate-200 mb-0.5">
                          Recomendação do Motor:
                        </span>
                        {opp.ai_recommendation}
                      </div>
                    )}
                  </CardContent>

                  {/* AÇÕES DA OPORTUNIDADE */}
                  <CardFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* BOTÃO HISTÓRICO */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-slate-700 hover:text-slate-900"
                        onClick={() => handleOpenHistory(opp)}
                      >
                        <History className="w-3.5 h-3.5 mr-1 text-[#005596]" />
                        Histórico
                      </Button>

                      {/* ALTERAR STATUS MANUAL */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          setStatusUpdateOpp(opp)
                          setNewStatusSelected(opp.commercial_status)
                        }}
                      >
                        Status
                      </Button>

                      {/* CORRELACIONAR SAP */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-emerald-700 border-emerald-300"
                        onClick={() => {
                          setTargetOppForOrder(opp)
                          setIsSimulateOrderModalOpen(true)
                        }}
                      >
                        Correlacionar SAP
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-[#005596]"
                        onClick={() => setDetailOpp(opp)}
                      >
                        Ver Detalhes
                      </Button>

                      {/* ROTEAMENTO POR NATUREZA: CRÉDITO -> FINANCEIRO | COMERCIAL -> COMERCIAL */}
                      {isCreditBlockedReason(opp.block_reason, opp.credit_status) ? (
                        // REQUISITO 1, 2 e 5: BLOQUEIO FINANCEIRO/CRÉDITO
                        opp.financial_substatus === 'Aguardando análise financeira' ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              disabled={true}
                              className="bg-amber-600/80 text-white text-xs h-8 font-medium cursor-not-allowed opacity-80"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Análise Financeira Pendente
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 text-[#005596] border-[#005596]/40 hover:bg-[#005596]/10"
                              onClick={() => handleViewFinancialRequest(opp)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Ver solicitação
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 font-semibold shadow-sm"
                            onClick={() => handleOpenSendFinancial(opp)}
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                            Enviar p/ Financeiro
                          </Button>
                        )
                      ) : (
                        // DEMAIS CASOS: FLUXO COMERCIAL PADRÃO
                        <Button
                          size="sm"
                          disabled={isBlocked}
                          className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 font-semibold shadow-sm disabled:opacity-40"
                          onClick={() => {
                            if (opp.commercial_sent_at) {
                              setDuplicateWarningOpp(opp)
                            } else {
                              setSelectedOppIds([opp.id])
                              setIsBatchSendModalOpen(true)
                            }
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Enviar p/ Comercial
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* 2 e 3. POPUP DE CONFIRMAÇÃO: "Enviar oportunidades para o Comercial" */}
        <Dialog open={isBatchSendModalOpen} onOpenChange={setIsBatchSendModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <Send className="w-4 h-4 text-[#005596]" />
                Enviar oportunidades para o Comercial
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Você está enviando <strong>{selectedOpportunities.length}</strong> oportunidade(s)
                de complemento de carga para avaliação da equipe Comercial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Resumo por oportunidade:
              </span>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedOpportunities.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[#005596] text-[11px]">
                      <span>
                        #{idx + 1} — {item.opportunity_code || `Proposta ${item.load_proposal_id}`}
                      </span>
                      <span>Itinerário: {item.itinerary_id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <div>
                        Cliente:{' '}
                        <strong>
                          {item.customer_name} (
                          {item.customer_sap_code || item.customer_id || 'SAP'})
                        </strong>
                      </div>
                      <div className="text-right">
                        Destino:{' '}
                        <strong>
                          {item.destination_city || 'N/A'}/{item.destination_uf || 'BR'}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <div>
                        Produto: <strong>{item.material_description || item.material_id}</strong>
                      </div>
                      <div className="text-right">
                        Quantidade Potencial:{' '}
                        <strong className="text-amber-700">
                          {(
                            (item.suggested_quantity_kg || item.missing_weight_kg || 0) / 1000
                          ).toFixed(1)}{' '}
                          t
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                      <div>
                        Cap. Residual:{' '}
                        <strong>{((item.missing_weight_kg || 0) / 1000).toFixed(1)} t</strong>
                      </div>
                      <div>
                        Estoque:{' '}
                        <strong className="text-blue-700">{item.stock_status || 'DP34 OK'}</strong>
                      </div>
                      <div className="text-right">
                        Saída:{' '}
                        <strong>
                          {item.planned_dispatch_date
                            ? new Date(item.planned_dispatch_date).toLocaleDateString('pt-BR')
                            : 'Prevista'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border">
                      <strong>Recomendação do Motor: </strong>
                      {item.ai_recommendation ||
                        item.adherence_explanation ||
                        'Complemento com alta aderência de itinerário e histórico de compra.'}
                    </div>

                    <div className="text-[10px] text-slate-500">
                      Responsável Comercial:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {item.commercial_representative ||
                          item.salesperson_id ||
                          'Comercial CIAFAL'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 rounded text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                <strong>Processo Integrado CIAFAL:</strong>
                <p>
                  O envio registra o despacho para avaliação da equipe comercial e CRM 360º. Nenhum
                  pedido manual é inserido na carga. Após fechamento comercial, o pedido entra no
                  SAP e o TMS correlaciona automaticamente via RFC/BAPI.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchSendModalOpen(false)}
                disabled={isSendingBatch}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-[#005596] hover:bg-[#004478] text-white"
                onClick={handleConfirmBatchSend}
                disabled={isSendingBatch}
              >
                {isSendingBatch ? 'Enviando...' : 'Confirmar Envio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. MODAL DE AVISO DE DUPLICIDADE */}
        <Dialog
          open={Boolean(duplicateWarningOpp) && !isResendModalOpen}
          onOpenChange={(open) => !open && setDuplicateWarningOpp(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Oportunidade Já Enviada ao Comercial
              </DialogTitle>
            </DialogHeader>

            {duplicateWarningOpp && (
              <div className="space-y-3 text-xs py-2">
                <p className="text-slate-700 dark:text-slate-300">
                  Esta oportunidade já foi enviada ao Comercial{' '}
                  {duplicateWarningOpp.commercial_sent_at
                    ? `em ${new Date(duplicateWarningOpp.commercial_sent_at).toLocaleDateString('pt-BR')} às ${new Date(duplicateWarningOpp.commercial_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}{' '}
                  por <strong>{duplicateWarningOpp.commercial_sent_by || 'outro usuário'}</strong>.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border text-[11px] space-y-1">
                  <div>
                    Oportunidade: <strong>{duplicateWarningOpp.opportunity_code}</strong>
                  </div>
                  <div>
                    Cliente: <strong>{duplicateWarningOpp.customer_name}</strong>
                  </div>
                  <div>
                    Status Atual: <strong>{duplicateWarningOpp.commercial_status}</strong>
                  </div>
                </div>

                {!canResend ? (
                  <p className="text-rose-600 text-[11px] font-medium">
                    Apenas Administradores e Gestores possuem permissão para realizar o reenvio ao
                    Comercial.
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    Como usuário autorizado ({userRole}), você pode registrar uma nova notificação
                    de reenvio fundamentado.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDuplicateWarningOpp(null)}>
                Voltar
              </Button>
              {canResend && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setIsResendModalOpen(true)}
                >
                  Reenviar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. MODAL DE CONFIRMAÇÃO DE REENVIO AUTORIZADO */}
        <Dialog open={isResendModalOpen} onOpenChange={setIsResendModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                Reenviar Oportunidade ao Comercial
              </DialogTitle>
              <DialogDescription className="text-xs">
                O reenvio será registrado no histórico auditável da oportunidade.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <div>
                <label className="font-semibold block mb-1">
                  Justificativa / Motivo do Reenvio:
                </label>
                <Input
                  placeholder="Ex: Reforço de prazo de fechamento ou mudança na programação..."
                  value={resendReason}
                  onChange={(e) => setResendReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResendModalOpen(false)}
                disabled={isResending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmResend}
                disabled={isResending}
              >
                {isResending ? 'Reenviando...' : 'Confirmar Reenvio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 7. MODAL DE HISTÓRICO DA OPORTUNIDADE (TIMELINE / TABELA AUDITÁVEL) */}
        <Dialog
          open={Boolean(historyModalOpp)}
          onOpenChange={(open) => !open && setHistoryModalOpp(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <History className="w-4 h-4 text-[#005596]" />
                Histórico da Oportunidade {historyModalOpp?.opportunity_code}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Timeline completa e auditável de eventos, usuários e transições de status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#005596]" />
                  Carregando trilha de auditoria...
                </div>
              ) : oppHistoryList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  Nenhum evento registrado até o momento.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-[10px] border-b">
                      <tr>
                        <th className="p-2.5">Data/Hora</th>
                        <th className="p-2.5">Evento</th>
                        <th className="p-2.5">Usuário</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {oppHistoryList.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-2.5 whitespace-nowrap font-mono text-slate-500">
                            {item.created ? new Date(item.created).toLocaleString('pt-BR') : 'N/A'}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            {item.event_title}
                          </td>
                          <td className="p-2.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300 block">
                              {item.user_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.user_role || 'operador'}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {renderStatusBadge(item.new_status)}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[10px]">
                            <div>{item.description || '—'}</div>
                            {item.metadata?.request_number && (
                              <div className="mt-1 font-mono text-[9px] text-blue-700 dark:text-blue-300">
                                Ref. Solicitação: {item.metadata.request_number}
                              </div>
                            )}
                            {item.metadata?.prior_sap && (
                              <div className="mt-0.5 text-[9px] text-slate-500 font-mono">
                                Pré-SAP: {item.metadata.prior_sap?.credit_status_sap || 'Bloqueado'}{' '}
                                • Pós-SAP:{' '}
                                {item.metadata.recheck_sap?.status ||
                                  item.metadata.new_sap_status ||
                                  'Revalidação'}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setHistoryModalOpp(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DETALHE COMPLETO DA OPORTUNIDADE */}
        <Dialog open={Boolean(detailOpp)} onOpenChange={(open) => !open && setDetailOpp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <Layers className="w-4 h-4 text-[#005596]" />
                Detalhes da Oportunidade {detailOpp?.opportunity_code}
              </DialogTitle>
            </DialogHeader>

            {detailOpp && (
              <div className="space-y-3 text-xs py-1">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Itinerário SAP:</span>
                    <span className="font-mono">{detailOpp.itinerary_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposta de Carga:</span>
                    <span className="font-mono">{detailOpp.load_proposal_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saída Prevista:</span>
                    <span>
                      {detailOpp.planned_dispatch_date
                        ? new Date(detailOpp.planned_dispatch_date).toLocaleDateString('pt-BR')
                        : 'A definir'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacidade Residual:</span>
                    <strong className="text-amber-700 font-mono">
                      {formatWeight(detailOpp.missing_weight_kg, { unit: 'kg' })}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente Sugerido:</span>
                    <span className="font-semibold">{detailOpp.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cód. SAP Cliente:</span>
                    <span className="font-mono">
                      {detailOpp.customer_sap_code || detailOpp.customer_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produto Recomendado:</span>
                    <span>{detailOpp.material_description || detailOpp.material_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status Atual:</span>
                    <span>{renderStatusBadge(detailOpp.commercial_status)}</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded text-[11px] text-slate-700 space-y-1">
                  <span className="font-bold text-indigo-900 block">
                    Critérios Auditados pelo Motor:
                  </span>
                  <p>• Rota programada sem desvio de itinerário.</p>
                  <p>• Condição financeira verificada: {detailOpp.credit_status}.</p>
                  <p>• Previsão física de estoque: {detailOpp.stock_status}.</p>
                  <p>
                    • Representante:{' '}
                    {detailOpp.commercial_representative ||
                      detailOpp.salesperson_id ||
                      'Comercial CIAFAL'}
                    .
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDetailOpp(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL ATUALIZAR STATUS COMERCIAL */}
        <Dialog
          open={Boolean(statusUpdateOpp)}
          onOpenChange={(open) => !open && setStatusUpdateOpp(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Atualizar Fluxo Comercial da Oportunidade
              </DialogTitle>
              <DialogDescription className="text-xs">
                Proposta {statusUpdateOpp?.load_proposal_id} • Registra usuário e data/hora para
                auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <div>
                <span className="text-[11px] font-semibold block mb-1">Novo Status:</span>
                <select
                  value={newStatusSelected}
                  onChange={(e) => setNewStatusSelected(e.target.value as any)}
                  className="w-full h-9 border rounded p-2 text-xs bg-white dark:bg-slate-900"
                >
                  <option value="Nova">Nova</option>
                  <option value="Selecionada">Selecionada</option>
                  <option value="Enviada ao Comercial">Enviada ao Comercial</option>
                  <option value="Em análise comercial">Em análise comercial</option>
                  <option value="Aceita pelo Comercial">Aceita pelo Comercial</option>
                  <option value="Recusada pelo Comercial">Recusada pelo Comercial</option>
                  <option value="Expirada">Expirada</option>
                  <option value="Convertida em venda">Convertida em venda</option>
                  <option value="Contato iniciado">Contato iniciado</option>
                  <option value="Cliente interessado">Cliente interessado</option>
                  <option value="Aguardando pedido SAP">Aguardando pedido SAP</option>
                  <option value="Pedido criado">Pedido criado</option>
                  <option value="Associado à carga">Associado à carga</option>
                  <option value="Descartado">Descartado</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] font-semibold block mb-1">
                  Observações da Negociação:
                </span>
                <Input
                  placeholder="Ex: Cliente aceitou antecipar compra de CA-50..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setStatusUpdateOpp(null)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#005596] text-white" onClick={handleUpdateStatus}>
                Salvar Alteração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE CORRELAÇÃO DE PEDIDO SAP COM CARGA */}
        <Dialog open={isSimulateOrderModalOpen} onOpenChange={setIsSimulateOrderModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Correlacionar Novo Pedido SAP à Carga {targetOppForOrder?.load_proposal_id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Quando a venda nasce no SAP via RFC/BAPI, o TMS identifica a rota e incorpora à
                carga recalculando peso, ocupação e status para CONVERTIDA EM VENDA.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <span className="font-semibold text-slate-700 block">
                Pedidos da Carteira SAP no Itinerário {targetOppForOrder?.itinerary_id}:
              </span>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold border-b text-[10px]">
                    <tr>
                      <th className="p-2">Pedido</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2 text-right">Peso (t)</th>
                      <th className="p-2">Crédito</th>
                      <th className="p-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]">
                    {simulatedSapOrders
                      .filter(
                        (o) =>
                          !targetOppForOrder?.itinerary_id ||
                          o.itinerary_code === targetOppForOrder.itinerary_id ||
                          o.uf === 'MG' ||
                          o.uf === 'SP',
                      )
                      .slice(0, 6)
                      .map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold">{ord.order_number}</td>
                          <td className="p-2">{ord.customer_name}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {((ord.weight_kg || 5000) / 1000).toFixed(1)} t
                          </td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-300"
                            >
                              {ord.credit_status || 'Liberado'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-6"
                              onClick={() => handleCorrelateSapOrder(ord.id)}
                            >
                              Associar à Carga
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSimulateOrderModalOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. POPUP "ENVIAR P/ FINANCEIRO" (PADRÃO HUB CIAFAL - REQUISITO 3) */}
        <Dialog open={isFinancialModalOpen} onOpenChange={setIsFinancialModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <DollarSign className="w-5 h-5 text-[#005596]" />
                Enviar Oportunidade para Análise Financeira
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Encaminhamento ao setor Financeiro para reavaliação de crédito/limite no SAP ECC. A
                oportunidade permanecerá bloqueada até parecer conclusivo.
              </DialogDescription>
            </DialogHeader>

            {financialTargetOpp && (
              <div className="space-y-3.5 py-1 text-xs">
                {/* BLOCO 1: DADOS DA OPORTUNIDADE & VEÍCULO */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-[#005596] flex items-center gap-1.5 text-xs">
                      <Truck className="w-3.5 h-3.5" />
                      Dados da Oportunidade & Carga
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {financialTargetOpp.opportunity_code ||
                        `PROPOSTA ${financialTargetOpp.load_proposal_id}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Itinerário SAP:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        {financialTargetOpp.itinerary_id || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Data Saída:</span>
                      <strong>
                        {financialTargetOpp.planned_dispatch_date
                          ? new Date(financialTargetOpp.planned_dispatch_date).toLocaleDateString(
                              'pt-BR',
                            )
                          : 'A definir'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Veículo Programado:</span>
                      <strong className="truncate block">
                        {financialTargetOpp.vehicle_type || 'Carreta'} (
                        {((financialTargetOpp.vehicle_capacity_kg || 27000) / 1000).toFixed(1)}t)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Peso Atual / Ocupação:
                      </span>
                      <strong className="text-blue-700">
                        {((financialTargetOpp.current_weight_kg || 0) / 1000).toFixed(1)}t (
                        {financialTargetOpp.current_occupancy_pct || 0}%)
                      </strong>
                    </div>
                  </div>

                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900 flex items-center justify-between text-[11px]">
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">
                      Complemento necessário para atingir meta de carga:
                    </span>
                    <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-xs">
                      {((financialTargetOpp.missing_weight_kg || 0) / 1000).toFixed(1)} t
                    </span>
                  </div>
                </div>

                {/* BLOCO 2: DADOS DO CLIENTE & ITEM */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <Building className="w-3.5 h-3.5 text-[#005596]" />
                      Dados do Cliente & Item Sugerido
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      SAP:{' '}
                      {financialTargetOpp.customer_sap_code ||
                        financialTargetOpp.customer_id ||
                        '15882'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Razão Social:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {financialTargetOpp.customer_name || 'Cliente'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cidade/UF:</span>
                      <strong>
                        {financialTargetOpp.destination_city || 'Destino'}/
                        {financialTargetOpp.destination_uf || 'BR'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Representante:</span>
                      <strong className="truncate block">
                        {financialTargetOpp.commercial_representative ||
                          financialTargetOpp.salesperson_id ||
                          'Comercial CIAFAL'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Material:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {financialTargetOpp.material_description ||
                          financialTargetOpp.material_id ||
                          'Laminados CA-50'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Quantidade / Peso:</span>
                      <strong className="text-[#005596]">
                        {(
                          (financialTargetOpp.suggested_quantity_kg ||
                            financialTargetOpp.missing_weight_kg ||
                            0) / 1000
                        ).toFixed(1)}{' '}
                        t
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Pedido SAP Relacionado:
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {financialTargetOpp.sap_order_id || 'Aguardando liberação de crédito'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 3: SITUAÇÃO FINANCEIRA RETORNADA PELO SAP (REQUISITO 3) */}
                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5 border-rose-200 dark:border-rose-900">
                    <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Situação Financeira Oficial (SAP ECC)
                    </span>
                    <Badge className="bg-rose-600 text-white text-[10px]">
                      {financialTargetOpp.credit_status || 'Crédito Bloqueado (Financeiro)'}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-rose-900 dark:text-rose-200">
                    <strong>Motivo do Bloqueio: </strong>
                    <span>
                      {financialTargetOpp.block_reason ||
                        'Crédito bloqueado no SAP pelo financeiro (limite excedido)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded border border-rose-200 dark:border-rose-900/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Limite de Crédito:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        R$ 400.000,00
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Crédito Utilizado:</span>
                      <strong className="font-mono text-rose-700">R$ 415.000,00</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Crédito Disponível:</span>
                      <strong className="font-mono text-rose-700">- R$ 15.000,00</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Valor Necessário Item:
                      </span>
                      <strong className="font-mono text-amber-700">R$ 28.500,00</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span>Consulta SAP: RFC/BAPI FD32 / KNKK (Ambiente QAS)</span>
                    <span>
                      Última consulta:{' '}
                      <strong className="font-mono">
                        {new Date().toLocaleDateString('pt-BR')} às{' '}
                        {new Date().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* BLOCO 4: CAMPO OBSERVAÇÃO PARA O FINANCEIRO */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-[#005596]" />
                    Observação para o Financeiro:
                  </label>
                  <textarea
                    rows={3}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-1 focus:ring-[#005596] focus:outline-none"
                    placeholder="Informe detalhes comerciais ou operacionais relevantes (ex.: cliente solicitou prorrogação ou pagamento antecipado em análise)..."
                    value={financialObservation}
                    onChange={(e) => setFinancialObservation(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">
                    O envio registrará número sequencial e log de auditoria permanente. A carga
                    permanecerá bloqueada.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFinancialModalOpen(false)}
                disabled={isSendingFinancial}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-[#005596] hover:bg-[#004478] text-white font-semibold"
                onClick={handleConfirmSendFinancial}
                disabled={isSendingFinancial}
              >
                {isSendingFinancial ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar para análise'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5. MODAL DE CONSULTA: "Ver solicitação" (REQUISITO 5) */}
        <Dialog
          open={Boolean(viewFinancialRequestModal)}
          onOpenChange={(open) => !open && setViewFinancialRequestModal(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <FileText className="w-4 h-4 text-[#005596]" />
                Solicitação Financeira {viewFinancialRequestModal?.request_number}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rastreabilidade e status da avaliação de crédito enviada ao setor Financeiro.
              </DialogDescription>
            </DialogHeader>

            {viewFinancialRequestModal && (
              <div className="space-y-3 text-xs py-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-slate-500">Status do Fluxo:</span>
                    <Badge className="bg-amber-600 text-white font-mono text-[10px]">
                      {viewFinancialRequestModal.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Oportunidade:</span>
                      <strong className="font-mono">
                        {viewFinancialRequestModal.opportunity_code}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Data Solicitação:</span>
                      <strong>
                        {viewFinancialRequestModal.requested_at
                          ? new Date(viewFinancialRequestModal.requested_at).toLocaleString('pt-BR')
                          : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Solicitante:</span>
                      <strong>
                        {viewFinancialRequestModal.requester_name} (
                        {viewFinancialRequestModal.requester_role || 'operador'})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cliente SAP:</span>
                      <strong>
                        {viewFinancialRequestModal.customer_name} (
                        {viewFinancialRequestModal.customer_sap_code})
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px]">Motivo do Bloqueio:</span>
                    <span className="text-rose-700 font-medium">
                      {viewFinancialRequestModal.block_reason || 'Crédito bloqueado no SAP'}
                    </span>
                  </div>

                  {viewFinancialRequestModal.requester_observation && (
                    <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded border">
                      <strong className="block text-slate-700 dark:text-slate-300">
                        Observação enviada pelo operador:
                      </strong>
                      <p className="text-slate-600 dark:text-slate-400">
                        {viewFinancialRequestModal.requester_observation}
                      </p>
                    </div>
                  )}
                </div>

                {/* PARECER SE HOUVER */}
                {viewFinancialRequestModal.decision && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-bold text-blue-950 dark:text-blue-200">
                      <span>Parecer Financeiro: {viewFinancialRequestModal.decision}</span>
                      <span>
                        {viewFinancialRequestModal.financial_decided_at
                          ? new Date(viewFinancialRequestModal.financial_decided_at).toLocaleString(
                              'pt-BR',
                            )
                          : ''}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Justificativa: </strong>
                      {viewFinancialRequestModal.decision_justification}
                    </p>
                    <div className="text-[10px] text-slate-500">
                      Responsável: {viewFinancialRequestModal.financial_analyst_name}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewFinancialRequestModal(null)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. PAINEL DO FINANCEIRO / FILA DE SOLICITAÇÕES (REQUISITO 6) */}
        <Dialog open={isFinancialDeskOpen} onOpenChange={setIsFinancialDeskOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between text-[#005596]">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#005596]" />
                  <span>Fila de Avaliação Financeira (Complemento de Cargas)</span>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-50 font-mono">
                  {financialQueueList.length} solicitação(ões)
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Acesso restrito ao perfil Financeiro e Gestão Logística. A liberação exige
                justificativa obrigatória e revalidação automática de crédito no SAP ECC.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {isLoadingFinancialQueue ? (
                <div className="p-10 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#005596]" />
                  Carregando fila financeira...
                </div>
              ) : financialQueueList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  Nenhuma solicitação financeira pendente de análise no momento.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-[10px] border-b">
                      <tr>
                        <th className="p-2.5">Solicitação / Data</th>
                        <th className="p-2.5">Cliente (SAP)</th>
                        <th className="p-2.5">Material / Peso</th>
                        <th className="p-2.5">Situação Crédito</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {financialQueueList.map((req) => (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-2.5">
                            <strong className="font-mono text-[#005596] block">
                              {req.request_number}
                            </strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {req.requested_at
                                ? new Date(req.requested_at).toLocaleString('pt-BR')
                                : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Por: {req.requester_name}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <strong className="block text-slate-800 dark:text-slate-200">
                              {req.customer_name}
                            </strong>
                            <span className="text-[10px] font-mono text-slate-500">
                              Cód: {req.customer_sap_code} • {req.destination_city || 'Destino'}/
                              {req.destination_uf || 'BR'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="block text-slate-700 dark:text-slate-300">
                              {req.material_description || req.material_id || 'Laminados CA-50'}
                            </span>
                            <span className="font-mono text-amber-700 font-bold text-[10px]">
                              {(
                                (req.suggested_quantity_kg || req.missing_weight_kg || 0) / 1000
                              ).toFixed(1)}{' '}
                              t
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-rose-600 font-semibold block text-[10px]">
                              {req.block_reason || 'Limite excedido'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Disp: R$ -15.000 | Req: R$ 28.500
                            </span>
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                req.status === 'AGUARDANDO_ANALISE'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : req.status === 'LIBERADO_FINANCEIRO' ||
                                      req.status === 'REVALIDACAO_SAP_CONFIRMADA'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              className="bg-[#005596] hover:bg-[#004478] text-white text-[11px] h-7"
                              onClick={() => {
                                setFinancialDecisionModal(req)
                                setFinancialDecisionAction('LIBERAR')
                                setFinancialDecisionJustification('')
                                setFinancialSapCondition('LIBERADO')
                              }}
                            >
                              Avaliar Parecer
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsFinancialDeskOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6, 7 e 8. MODAL DE DECISÃO FINANCEIRA: "Liberar | Reprovar | Solicitar informações" */}
        <Dialog
          open={Boolean(financialDecisionModal)}
          onOpenChange={(open) => !open && setFinancialDecisionModal(null)}
        >
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#005596]">
                <ShieldCheck className="w-5 h-5 text-[#005596]" />
                Parecer Financeiro • {financialDecisionModal?.request_number}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cliente: <strong>{financialDecisionModal?.customer_name}</strong> (SAP:{' '}
                {financialDecisionModal?.customer_sap_code})
              </DialogDescription>
            </DialogHeader>

            {financialDecisionModal && (
              <div className="space-y-3.5 py-1 text-xs">
                {/* ESCOLHA DA AÇÃO */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Decisão do Setor Financeiro:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFinancialDecisionAction('LIBERAR')}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        financialDecisionAction === 'LIBERAR'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Liberar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinancialDecisionAction('REPROVAR')}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        financialDecisionAction === 'REPROVAR'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Reprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinancialDecisionAction('SOLICITAR_INFORMACOES')}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        financialDecisionAction === 'SOLICITAR_INFORMACOES'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Pedir Info
                    </button>
                  </div>
                </div>

                {/* JUSTIFICATIVA OBRIGATÓRIA (REQUISITO 6) */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Observação / Justificativa Obrigatória:
                  </label>
                  <textarea
                    rows={3}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-1 focus:ring-[#005596] focus:outline-none"
                    placeholder="Fundamente formalmente a decisão para auditoria e histórico..."
                    value={financialDecisionJustification}
                    onChange={(e) => setFinancialDecisionJustification(e.target.value)}
                  />
                </div>

                {/* SIMULAÇÃO DE REVALIDAÇÃO CONTRA O SAP (REQUISITO 7 e 8) */}
                {financialDecisionAction === 'LIBERAR' && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 space-y-2">
                    <span className="font-bold text-blue-950 dark:text-blue-200 block text-[11px]">
                      Governança SAP: Consulta Oficial de Revalidação
                    </span>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      O sistema executará a chamada RFC ao SAP ECC antes da efetivação. Selecione a
                      condição retornada pelo ambiente SAP QAS:
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="sapCond"
                          value="LIBERADO"
                          checked={financialSapCondition === 'LIBERADO'}
                          onChange={() => setFinancialSapCondition('LIBERADO')}
                        />
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">
                          SAP: Limite Liberado (OK)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="sapCond"
                          value="BLOQUEADO"
                          checked={financialSapCondition === 'BLOQUEADO'}
                          onChange={() => setFinancialSapCondition('BLOQUEADO')}
                        />
                        <span className="font-medium text-rose-700 dark:text-rose-300">
                          SAP: Crédito Ainda Bloqueado (Divergência)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFinancialDecisionModal(null)}
                disabled={isProcessingFinancialDecision}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-[#005596] hover:bg-[#004478] text-white font-semibold"
                onClick={handleProcessFinancialDecision}
                disabled={isProcessingFinancialDecision}
              >
                {isProcessingFinancialDecision ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Registrar Decisão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default ComplementCargosPage
