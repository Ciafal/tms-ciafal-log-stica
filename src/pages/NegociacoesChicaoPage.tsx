import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { RegionConsulta } from '@/components/ui-custom/RegionConsulta'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Bot,
  User,
  RotateCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Mic,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Check,
  Layers,
  ChevronRight,
  TrendingUp,
  Scale,
  BrainCircuit,
  UserCheck,
} from 'lucide-react'
import {
  NegociacaoRecord,
  CONSOLIDATED_KANBAN_COLUMNS,
  ConsolidatedKanbanColumnKey,
  mapNegotiationToConsolidatedColumn,
  calculateNegotiationIndicators,
  formatCurrencyBRL,
  formatWeightTon,
  formatDistanceKm,
  formatDateTimeBR,
  computeNegotiationIntelligence,
  detectOperationalAlerts,
} from '@/domain/negociacoesEngine'
import { negociacoesService } from '@/services/negociacoesService'
import { NegotiationKanbanCard } from '@/components/negociacoes/NegotiationKanbanCard'
import { NegotiationDetailDrawer } from '@/components/negociacoes/NegotiationDetailDrawer'
import { NegotiationConcludeModal } from '@/components/negociacoes/NegotiationConcludeModal'
import { useAuth } from '@/contexts/AuthContext'

export const NegociacoesChicaoPage: React.FC = () => {
  const { toast } = useToast()
  const { user, permissions } = useAuth()
  const canViewCpf = permissions.canViewFullSensitiveData

  // Estado Principal
  const [records, setRecords] = useState<NegociacaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Drawer e Modais
  const [selectedNegotiation, setSelectedNegotiation] = useState<NegociacaoRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [concludeModalOpen, setConcludeModalOpen] = useState(false)
  const [isConcluding, setIsConcluding] = useState(false)
  const [isProcessingSap, setIsProcessingSap] = useState(false)

  // Modal de Takeover Humano
  const [takeoverModalOpen, setTakeoverModalOpen] = useState(false)
  const [takeoverReason, setTakeoverReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Modal de Decisão de Alçada
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [customApprovedValue, setCustomApprovedValue] = useState<number>(0)
  const [approvalJustification, setApprovalJustification] = useState('')

  // Modal / Seção de Chat WhatsApp e Áudio
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [chatInputText, setChatInputText] = useState('')
  const [chatSenderRole, setChatSenderRole] = useState<'HUMANO' | 'MOTORISTA'>('HUMANO')

  // Filtros Combinados
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [actorFilter, setActorFilter] = useState<string>('ALL')
  const [sapStatusFilter, setSapStatusFilter] = useState<string>('ALL')
  const [ufFilter, setUfFilter] = useState<string>('ALL')

  // Carregar dados da fonte única de verdade
  const loadData = async () => {
    try {
      setLoading(true)
      const data = await negociacoesService.listAll()
      setRecords(data)

      // Atualizar o registro selecionado se estiver aberto
      if (selectedNegotiation) {
        const updated = data.find((r) => r.id === selectedNegotiation.id)
        if (updated) setSelectedNegotiation(updated)
      }
    } catch (err: any) {
      console.error('Erro ao carregar negociações:', err)
      toast({
        title: 'Falha ao sincronizar dados',
        description: err?.message || 'Não foi possível buscar as negociações ativas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Inscrição em Tempo Real (PocketBase Realtime) em `negociacoes` e `chicao_freight_offers`
  useRealtime<any>('negociacoes', (event) => {
    const rec = event.record as NegociacaoRecord
    if (event.action === 'create') {
      setRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)])
    } else if (event.action === 'update') {
      setRecords((prev) => prev.map((r) => (r.id === rec.id ? rec : r)))
      if (selectedNegotiation && selectedNegotiation.id === rec.id) {
        setSelectedNegotiation(rec)
      }
    } else if (event.action === 'delete') {
      setRecords((prev) => prev.filter((r) => r.id !== rec.id))
      if (selectedNegotiation && selectedNegotiation.id === rec.id) {
        setSelectedNegotiation(null)
        setDrawerOpen(false)
      }
    }
  })

  useRealtime<any>('chicao_freight_offers', () => {
    // Quando uma oferta do Chicão atualiza status/chat, sincronizamos
    loadData()
  })

  // 8 KPIs Unificados via negociacoesEngine
  const indicators = useMemo(() => calculateNegotiationIndicators(records), [records])

  // Filtragem combinada completa (Item 4)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Busca global
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase()
        const matchNumber = (r.negotiation_number || '').toLowerCase().includes(term)
        const matchCargo = (r.cargo_id || '').toLowerCase().includes(term)
        const matchDriver = (r.driver_name || '').toLowerCase().includes(term)
        const matchCarrier = (r.carrier_name || '').toLowerCase().includes(term)
        const matchPlate = (r.vehicle_plate || '').toLowerCase().includes(term)
        const matchDest = (r.destination || '').toLowerCase().includes(term)
        const matchItinerary = (r.itinerary_code || '').toLowerCase().includes(term)
        const matchTransport = (r.sap_transport_number || '').toLowerCase().includes(term)
        const matchPhone = (r.driver_phone || '').toLowerCase().includes(term)
        const matchCpf = (r.driver_cpf || r.driver_cpf_masked || '').toLowerCase().includes(term)
        const matchResp = (r.responsible_user_name || '').toLowerCase().includes(term)

        let matchCustomer = false
        if (r.orders_items_json && Array.isArray(r.orders_items_json)) {
          matchCustomer = r.orders_items_json.some(
            (it) =>
              it.customerName.toLowerCase().includes(term) ||
              it.customerCode.toLowerCase().includes(term) ||
              it.orderNumber.toLowerCase().includes(term),
          )
        }

        if (
          !matchNumber &&
          !matchCargo &&
          !matchDriver &&
          !matchCarrier &&
          !matchPlate &&
          !matchDest &&
          !matchItinerary &&
          !matchTransport &&
          !matchPhone &&
          !matchCpf &&
          !matchResp &&
          !matchCustomer
        ) {
          return false
        }
      }

      // 2. Status
      if (statusFilter !== 'ALL') {
        const colKey = mapNegotiationToConsolidatedColumn(r)
        if (colKey !== statusFilter && r.status !== statusFilter) {
          return false
        }
      }

      // 3. Responsável
      if (actorFilter !== 'ALL') {
        if (actorFilter === 'CHICAO_IA' && r.responsible_type !== 'CHICAO_IA') return false
        if (actorFilter === 'HUMANO' && r.responsible_type !== 'HUMANO') return false
      }

      // 4. Status SAP
      if (sapStatusFilter !== 'ALL') {
        if (sapStatusFilter === 'INTEGRADO' && r.sap_pipeline_status !== 'INTEGRADO_SAP')
          return false
        if (sapStatusFilter === 'PENDENTE' && r.sap_pipeline_status === 'INTEGRADO_SAP')
          return false
        if (sapStatusFilter === 'ERRO' && r.sap_pipeline_status !== 'ERRO_INTEGRACAO') return false
      }

      // 5. UF
      if (ufFilter !== 'ALL' && r.uf !== ufFilter) {
        return false
      }

      return true
    })
  }, [records, searchTerm, statusFilter, actorFilter, sapStatusFilter, ufFilter])

  // Agrupamento nas 10 Colunas Operacionais do Kanban Consolidado (Item 2)
  const columnsData = useMemo(() => {
    const map: Record<ConsolidatedKanbanColumnKey, NegociacaoRecord[]> = {
      AGUARDANDO_NEGOCIACAO: [],
      OFERTA_ENVIADA: [],
      AGUARDANDO_RESPOSTA: [],
      EM_NEGOCIACAO: [],
      CONTRAPROPOSTA: [],
      AGUARDANDO_APROVACAO: [],
      ACEITA: [],
      RECUSADA: [],
      PENDENTE_SAP: [],
      INTEGRADA_SAP: [],
    }

    filteredRecords.forEach((neg) => {
      const colKey = mapNegotiationToConsolidatedColumn(neg)
      if (map[colKey]) {
        map[colKey].push(neg)
      } else {
        map.AGUARDANDO_NEGOCIACAO.push(neg)
      }
    })

    return map
  }, [filteredRecords])

  // Abertura de Drawer de Detalhes
  const handleOpenDetail = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setDrawerOpen(true)
  }

  // Avançar de AGUARDANDO_NEGOCIACAO para EM_NEGOCIACAO
  const handleStartNegotiation = async (neg: NegociacaoRecord) => {
    try {
      const res = await negociacoesService.changeStatus(
        neg.id,
        'EM_NEGOCIACAO',
        'Oferta formal e acionamento do agente Chicão para negociação.',
      )
      if (!res.success) {
        toast({
          title: 'Não foi possível alterar status',
          description: res.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Negociação Iniciada',
        description: `Negociação ${neg.negotiation_number} aberta no canal de atendimento do Chicão.`,
        className: 'bg-[#005596] text-white',
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro operacional',
        description: err?.message || 'Falha ao iniciar negociação.',
        variant: 'destructive',
      })
    }
  }

  // Modal de Conclusão com Validação Estrita
  const handleOpenConcludeModal = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setConcludeModalOpen(true)
  }

  const handleConfirmConclude = async (
    negotiationId: string,
    acceptedBy: string,
    acceptanceAt: string,
    completionNotes: string,
  ) => {
    try {
      setIsConcluding(true)
      const res = await negociacoesService.conclude(
        negotiationId,
        acceptedBy,
        acceptanceAt,
        completionNotes,
      )

      if (!res.success) {
        if (res.pendingFields && res.pendingFields.length > 0) {
          toast({
            title: 'Informações Obrigatórias Pendentes',
            description: `${res.error} Pendências: ${res.pendingFields.join(', ')}`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Falha na Conclusão',
            description: res.error,
            variant: 'destructive',
          })
        }
        return
      }

      toast({
        title: 'Negociação Concluída com Sucesso',
        description: 'Parceiro, valores e pedidos validados. Pipeline SAP pronto para integração.',
        className: 'bg-emerald-600 text-white',
      })
      await loadData()
    } finally {
      setIsConcluding(false)
    }
  }

  // Pipeline SAP de 4 Etapas
  const handleTriggerSap = async (neg: NegociacaoRecord) => {
    try {
      setIsProcessingSap(true)
      const res = await negociacoesService.triggerSapPipeline(neg.id)

      if (!res.success) {
        toast({
          title: 'Falha no Pipeline SAP',
          description: res.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Pipeline SAP RFC Orquestrado',
        description: res.message || 'Remessas e Transporte sincronizados com sucesso no SAP ECC.',
        className: 'bg-[#005596] text-white',
      })
      await loadData()
    } finally {
      setIsProcessingSap(false)
    }
  }

  // Ação de Takeover (Assumir Atendimento)
  const handleOpenTakeover = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setTakeoverReason('')
    setTakeoverModalOpen(true)
  }

  const handleConfirmTakeover = async () => {
    if (!selectedNegotiation) return
    try {
      setActionLoading(true)
      const opName = user?.name || 'Operador Logístico CIAFAL'
      const res = await negociacoesService.takeover(
        selectedNegotiation.id,
        opName,
        takeoverReason || 'Intervenção humana solicitada pela mesa de negociação.',
        selectedNegotiation.chicao_offer_id,
      )

      if (res.success) {
        toast({
          title: 'Atendimento Humano Assumido',
          description:
            'O Chicão IA foi pausado para esta negociação. Você está no controle do diálogo.',
          className: 'bg-amber-600 text-white',
        })
        setTakeoverModalOpen(false)
        await loadData()
      } else {
        toast({ title: 'Erro ao assumir', description: res.message, variant: 'destructive' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Devolver Atendimento ao Chicão IA
  const handleHandbackToChicao = async (neg: NegociacaoRecord) => {
    try {
      setActionLoading(true)
      const res = await negociacoesService.handbackToChicao(neg.id, neg.chicao_offer_id)
      if (res.success) {
        toast({
          title: 'Devolvido ao Chicão IA',
          description: 'O agente Chicão voltou a conduzir a negociação autonomamente.',
          className: 'bg-[#005596] text-white',
        })
        await loadData()
      } else {
        toast({ title: 'Erro ao devolver', description: res.message, variant: 'destructive' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Abrir Modal de Decisão de Alçada
  const handleOpenApproveModal = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setCustomApprovedValue(neg.counter_value_requested || neg.initial_freight_value || 0)
    setApprovalJustification('')
    setApproveModalOpen(true)
  }

  const handleConfirmApproval = async () => {
    if (!selectedNegotiation) return
    try {
      setActionLoading(true)
      const res = await negociacoesService.approveExtraBudget(
        selectedNegotiation.id,
        customApprovedValue,
        approvalJustification || 'Aprovado alçada excepcional pela gerência de transportes.',
        selectedNegotiation.chicao_offer_id,
      )

      if (res.success) {
        toast({
          title: 'Alçada Extraordinária Aprovada',
          description: `Novo valor acordado: ${formatCurrencyBRL(customApprovedValue)}. Negociação liberada para prosseguir.`,
          className: 'bg-emerald-600 text-white',
        })
        setApproveModalOpen(false)
        await loadData()
      } else {
        toast({ title: 'Falha na aprovação', description: res.message, variant: 'destructive' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Abrir Chat WhatsApp Integrado
  const handleOpenChat = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setChatInputText('')
    setChatModalOpen(true)
  }

  const handleSendMessage = async (isAudio = false) => {
    if (!selectedNegotiation || !chatInputText.trim()) return
    try {
      setActionLoading(true)
      const res = await negociacoesService.sendChatMessage(
        selectedNegotiation.id,
        chatSenderRole,
        chatInputText.trim(),
        isAudio,
        selectedNegotiation.chicao_offer_id,
      )

      if (res.success) {
        setChatInputText('')
        await loadData()
      } else {
        toast({
          title: 'Erro ao enviar mensagem',
          description: res.message,
          variant: 'destructive',
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Limpar Filtros
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setActorFilter('ALL')
    setSapStatusFilter('ALL')
    setUfFilter('ALL')
  }

  const activeFiltersCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (actorFilter !== 'ALL' ? 1 : 0) +
    (sapStatusFilter !== 'ALL' ? 1 : 0) +
    (ufFilter !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() !== '' ? 1 : 0)

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header Oficial CIAFAL sem truncamento de texto */}
      <PageHeader
        title="Negociações & Chicão"
        subtitle="Acompanhamento operacional em Kanban estrito, histórico rastreável e orquestração de remessas e transportes no SAP ECC com governança de autonomia da IA."
        icon={Layers}
        badge={
          <Badge className="bg-[#005596] text-white text-xs font-bold px-3 py-1 flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Central Única de Negociação CIAFAL
          </Badge>
        }
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Contratação & Fretes', href: '/tms/mesa-fretes' },
          { label: 'Negociações & Chicão (Pipeline)' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs border-slate-300 gap-1.5 h-9 bg-white hover:bg-slate-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#005596]' : ''}`} />
              Atualizar Mesa
            </Button>
          </div>
        }
        className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-xs mb-0"
      />

      {/* 2. Os 8 Indicadores Unificados no Topo (negociacoesEngine com dados reais) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Abertas
            </p>
            <div className="text-xl font-mono font-black text-slate-800 mt-0.5">
              {indicators.abertasCount}
            </div>
            <p className="text-[9px] text-slate-500 truncate">Aguardando início</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50/50 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 truncate">
              Em Negociação
            </p>
            <div className="text-xl font-mono font-black text-[#005596] mt-0.5">
              {indicators.emNegociacaoCount}
            </div>
            <p className="text-[9px] text-sky-700 truncate">Interação ativa</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/40 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 truncate">
              Recusadas
            </p>
            <div className="text-xl font-mono font-black text-rose-700 mt-0.5">
              {indicators.recusadasCount}
            </div>
            <p className="text-[9px] text-rose-600 truncate">Sem acordo</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 truncate">
              Concluídas
            </p>
            <div className="text-xl font-mono font-black text-emerald-700 mt-0.5">
              {indicators.concluidasCount}
            </div>
            <p className="text-[9px] text-emerald-600 truncate">Aceite formal</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Integradas SAP
            </p>
            <div className="text-xl font-mono font-black text-purple-700 mt-0.5">
              {indicators.integradasSapCount}
            </div>
            <p className="text-[9px] text-slate-500 truncate">Com remessas/transp.</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 truncate">
              Pendentes SAP
            </p>
            <div className="text-xl font-mono font-black text-amber-700 mt-0.5">
              {indicators.pendentesIntegracaoCount}
            </div>
            <p className="text-[9px] text-amber-700 truncate">Aguardando RFC QAS</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Tempo Médio
            </p>
            <div className="text-xl font-mono font-black text-slate-800 mt-0.5">
              {indicators.tempoMedioNegociacaoMin} min
            </div>
            <p className="text-[9px] text-slate-500 truncate">Duração fechamento</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50/30 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#005596] truncate">
              Autonomia Chicão
            </p>
            <div className="text-xl font-mono font-black text-[#005596] mt-0.5 flex items-center gap-1">
              <span>{indicators.autonomiaChicaoPct} %</span>
            </div>
            <p className="text-[9px] text-sky-700 truncate">Sem takeover humano</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filtros Combinados Avançados */}
      <RegionConsulta
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nº negociação, carga, motorista, transportadora, placa, cliente, telefone..."
        onRefresh={loadData}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
        totalRecords={records.length}
        filteredRecords={filteredRecords.length}
        filtersContent={
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[170px] bg-white border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os 10 Status</SelectItem>
                  {CONSOLIDATED_KANBAN_COLUMNS.map((col) => (
                    <SelectItem key={col.key} value={col.key}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Responsável:</span>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px] bg-white border-slate-200">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos (IA e Humano)</SelectItem>
                  <SelectItem value="CHICAO_IA">🤖 Chicão IA</SelectItem>
                  <SelectItem value="HUMANO">👤 Humano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Status SAP:</span>
              <Select value={sapStatusFilter} onValueChange={setSapStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px] bg-white border-slate-200">
                  <SelectValue placeholder="Status SAP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status SAP</SelectItem>
                  <SelectItem value="INTEGRADO">Integrado SAP ECC</SelectItem>
                  <SelectItem value="PENDENTE">Pendente / Aguardando</SelectItem>
                  <SelectItem value="ERRO">Com Pendência / Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">UF:</span>
              <Select value={ufFilter} onValueChange={setUfFilter}>
                <SelectTrigger className="h-8 text-xs w-[110px] bg-white border-slate-200">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas UF</SelectItem>
                  <SelectItem value="MG">MG</SelectItem>
                  <SelectItem value="SP">SP</SelectItem>
                  <SelectItem value="RJ">RJ</SelectItem>
                  <SelectItem value="ES">ES</SelectItem>
                  <SelectItem value="GO">GO</SelectItem>
                  <SelectItem value="BA">BA</SelectItem>
                  <SelectItem value="DF">DF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
      />

      {/* 4. Kanban Consolidado de 10 Colunas Operacionais */}
      <div className="relative">
        <div className="overflow-x-auto pb-6 pt-1">
          <div className="flex gap-3.5 min-w-[3200px]">
            {CONSOLIDATED_KANBAN_COLUMNS.map((col) => {
              const colItems = columnsData[col.key] || []
              return (
                <div
                  key={col.key}
                  className="w-[305px] shrink-0 bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-col max-h-[780px]"
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <h3 className="text-xs font-black text-slate-800 tracking-tight">
                        {col.title}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-2 py-0.5 ${col.colorBadge}`}
                    >
                      {colItems.length}
                    </Badge>
                  </div>

                  {/* Lista de Cards com Scroll Interno */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {colItems.map((neg) => (
                      <div key={neg.id} className="relative group">
                        <NegotiationKanbanCard
                          negotiation={neg}
                          onOpenDetail={handleOpenDetail}
                          onMoveToNext={handleStartNegotiation}
                          onConcludeModal={handleOpenConcludeModal}
                          onTriggerSap={handleTriggerSap}
                          onTakeover={handleOpenTakeover}
                          onHandback={handleHandbackToChicao}
                          isProcessingSap={isProcessingSap}
                        />

                        {/* Botão de Atalho para o Chat WhatsApp */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenChat(neg)
                            }}
                            className="h-6 w-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                            title="Abrir Chat WhatsApp da Negociação"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {colItems.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs italic">
                        Nenhuma negociação nesta coluna
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 5. GAVETA DE DETALHES COMPLETA (6 ABAS: Geral, Motorista/Rota, Clientes/SAP, Comercial/ANTT, Histórico, SAP Pipeline) */}
      <NegotiationDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        negotiation={selectedNegotiation}
        canViewCpf={canViewCpf}
        onConclude={handleOpenConcludeModal}
        onTriggerSap={handleTriggerSap}
        isProcessingSap={isProcessingSap}
      />

      {/* 6. MODAL DE FECHAMENTO COM VALIDAÇÃO ESTRITA */}
      <NegotiationConcludeModal
        open={concludeModalOpen}
        onOpenChange={setConcludeModalOpen}
        negotiation={selectedNegotiation}
        onConfirm={handleConfirmConclude}
        isSubmitting={isConcluding}
      />

      {/* 7. MODAL DE TAKEOVER HUMANO COM MOTIVO */}
      <Dialog open={takeoverModalOpen} onOpenChange={setTakeoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Assumir Negociação (Takeover Humano)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O agente Chicão IA será pausado para esta negociação. As próximas mensagens com o
              motorista serão enviadas diretamente pelo operador humano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Motivo da Intervenção Humana:
              </label>
              <Textarea
                value={takeoverReason}
                onChange={(e) => setTakeoverReason(e.target.value)}
                placeholder="Ex.: Motorista solicitou negociação de rota de retorno; exigência de adiantamento específico; recusa do valor inicial."
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTakeoverModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmTakeover}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              Confirmar e Assumir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. MODAL DE DECISÃO DE ALÇADA EXTRAORDINÁRIA */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#005596]" />
              Aprovação de Alçada Extraordinária
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O motorista solicitou um valor acima do teto de autonomia automática do Chicão (+3%).
              Avalie e aprove conforme autorização da gerência.
            </DialogDescription>
          </DialogHeader>

          {selectedNegotiation && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Frete Inicial CIAFAL:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrencyBRL(selectedNegotiation.initial_freight_value)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Teto Autonomia Chicão:</span>
                  <span className="font-mono font-bold text-[#005596]">
                    {formatCurrencyBRL(selectedNegotiation.max_autonomy_value)}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t">
                  <span className="text-[10px] text-amber-700 font-bold block">
                    Valor Solicitado pelo Motorista:
                  </span>
                  <span className="font-mono font-black text-lg text-amber-900">
                    {formatCurrencyBRL(
                      selectedNegotiation.counter_value_requested ||
                        selectedNegotiation.negotiated_freight_value,
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Valor Aprovado Final (R$):
                </label>
                <Input
                  type="number"
                  value={customApprovedValue}
                  onChange={(e) => setCustomApprovedValue(Number(e.target.value))}
                  className="h-9 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Justificativa Operacional:
                </label>
                <Textarea
                  value={approvalJustification}
                  onChange={(e) => setApprovalJustification(e.target.value)}
                  placeholder="Justifique a aprovação de valor extraordinário para fins de auditoria interna."
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApproval}
              disabled={actionLoading || customApprovedValue <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Aprovar Alçada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. MODAL DE CHAT WHATSAPP COM ÁUDIO E TRANSCRIÇÕES */}
      <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Chat WhatsApp da Negociação {selectedNegotiation?.negotiation_number}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Motorista: {selectedNegotiation?.driver_name || 'Autônomo'} (
                  {selectedNegotiation?.driver_phone || '---'}) • Carga:{' '}
                  {selectedNegotiation?.cargo_id}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedNegotiation?.responsible_type === 'CHICAO_IA' ? (
                  <Badge className="bg-sky-100 text-[#005596] border-sky-300 text-xs font-bold gap-1">
                    <Bot className="w-3.5 h-3.5" /> Chicão IA Ativo
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold gap-1">
                    <User className="w-3.5 h-3.5" /> Operador Humano
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Histórico de Mensagens / Áudios */}
          <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 my-2 min-h-[300px] max-h-[420px]">
            {selectedNegotiation?.messages_history &&
            selectedNegotiation.messages_history.length > 0 ? (
              selectedNegotiation.messages_history.map((msg, idx) => {
                const isDriver = msg.sender === 'MOTORISTA'
                const isChicao = msg.sender === 'CHICAO' || msg.sender === 'CHICAO_IA'
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isDriver ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-slate-600">
                        {isDriver
                          ? selectedNegotiation.driver_name || 'Motorista'
                          : isChicao
                            ? 'Chicão IA'
                            : 'Operador Humano'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl max-w-[85%] text-xs leading-relaxed shadow-2xs ${
                        isDriver
                          ? 'bg-white border border-slate-200 text-slate-800'
                          : isChicao
                            ? 'bg-sky-100/90 border border-sky-300 text-sky-950'
                            : 'bg-amber-100/90 border border-amber-300 text-amber-950'
                      }`}
                    >
                      {msg.is_audio ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Mic className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mensagem de Áudio WhatsApp</span>
                          </div>
                          {msg.audio_transcript && (
                            <div className="text-[11px] italic bg-white/70 p-1.5 rounded border border-slate-200 text-slate-600">
                              "{msg.audio_transcript}"
                            </div>
                          )}
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16 text-xs text-slate-400">
                Nenhuma mensagem registrada no chat desta negociação.
              </div>
            )}
          </div>

          {/* Barra de Envio com Opção de Áudio e Papel */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Simular envio como:
                </span>
                <Button
                  size="sm"
                  variant={chatSenderRole === 'HUMANO' ? 'default' : 'outline'}
                  onClick={() => setChatSenderRole('HUMANO')}
                  className="h-7 text-[11px] px-2.5"
                >
                  <User className="w-3 h-3 mr-1" /> Operador
                </Button>
                <Button
                  size="sm"
                  variant={chatSenderRole === 'MOTORISTA' ? 'default' : 'outline'}
                  onClick={() => setChatSenderRole('MOTORISTA')}
                  className="h-7 text-[11px] px-2.5"
                >
                  Motorista
                </Button>
              </div>

              {selectedNegotiation?.responsible_type === 'CHICAO_IA' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenTakeover(selectedNegotiation)}
                  className="h-7 text-[11px] border-amber-300 text-amber-800"
                >
                  Assumir conversa
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedNegotiation && handleHandbackToChicao(selectedNegotiation)}
                  className="h-7 text-[11px] border-sky-300 text-[#005596]"
                >
                  Devolver ao Chicão
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(false)}
                placeholder="Digite a mensagem para o motorista no WhatsApp..."
                className="text-xs h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendMessage(true)}
                disabled={actionLoading || !chatInputText.trim()}
                className="h-9 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 shrink-0"
                title="Enviar como simulação de áudio transcrito"
              >
                <Mic className="w-3.5 h-3.5" /> Áudio
              </Button>
              <Button
                size="sm"
                onClick={() => handleSendMessage(false)}
                disabled={actionLoading || !chatInputText.trim()}
                className="h-9 px-3 text-xs bg-[#005596] hover:bg-[#004275] text-white shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NegociacoesChicaoPage
