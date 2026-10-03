import React, { useState, useEffect, useMemo } from 'react'
import {
  NegociacaoRecord,
  NegotiationKanbanStatus,
  calculateNegotiationIndicators,
  formatCurrencyBRL,
} from '@/domain/negociacoesEngine'
import { negociacoesService } from '@/services/negociacoesService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { RegionConsulta } from '@/components/ui-custom/RegionConsulta'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Layers,
  Bot,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { NegotiationKanbanCard } from '@/components/negociacoes/NegotiationKanbanCard'
import { NegotiationDetailDrawer } from '@/components/negociacoes/NegotiationDetailDrawer'
import { NegotiationConcludeModal } from '@/components/negociacoes/NegotiationConcludeModal'

export const NegociacoesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [records, setRecords] = useState<NegociacaoRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Filtros avançados (Item 14)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [actorFilter, setActorFilter] = useState<string>('ALL')
  const [sapStatusFilter, setSapStatusFilter] = useState<string>('ALL')
  const [ufFilter, setUfFilter] = useState<string>('ALL')

  // Modais e Drawers
  const [selectedNegotiation, setSelectedNegotiation] = useState<NegociacaoRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [concludeModalOpen, setConcludeModalOpen] = useState<boolean>(false)
  const [isConcluding, setIsConcluding] = useState<boolean>(false)
  const [isProcessingSap, setIsProcessingSap] = useState<boolean>(false)

  // Carregar lista de negociações do backend
  const loadData = async () => {
    try {
      setLoading(true)
      const data = await negociacoesService.listAll()
      setRecords(data)
    } catch (err) {
      console.error('Erro ao carregar negociações:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as negociações do servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Indicadores dinâmicos calculados a partir dos dados reais (Item 16)
  const indicators = useMemo(() => calculateNegotiationIndicators(records), [records])

  // Filtragem
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Busca textual ampla
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase()
        const matchNumber = r.negotiation_number.toLowerCase().includes(term)
        const matchCargo = r.cargo_id.toLowerCase().includes(term)
        const matchDriver = (r.driver_name || '').toLowerCase().includes(term)
        const matchCarrier = (r.carrier_name || '').toLowerCase().includes(term)
        const matchPlate = (r.vehicle_plate || '').toLowerCase().includes(term)
        const matchDest = (r.destination || '').toLowerCase().includes(term)
        const matchItinerary = (r.itinerary_code || '').toLowerCase().includes(term)
        const matchTransport = (r.sap_transport_number || '').toLowerCase().includes(term)

        // Itens de cliente
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
          !matchCustomer
        ) {
          return false
        }
      }

      // Filtro de status Kanban
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false
      }

      // Filtro de ator IA / Humano
      if (actorFilter !== 'ALL' && r.responsible_type !== actorFilter) {
        return false
      }

      // Filtro de status SAP
      if (sapStatusFilter !== 'ALL' && r.sap_pipeline_status !== sapStatusFilter) {
        return false
      }

      // Filtro de UF
      if (ufFilter !== 'ALL' && r.uf !== ufFilter) {
        return false
      }

      return true
    })
  }, [records, searchTerm, statusFilter, actorFilter, sapStatusFilter, ufFilter])

  // Divisão das 4 colunas estritas do Kanban (Item 2)
  const columnAberto = useMemo(
    () => filteredRecords.filter((r) => r.status === 'ABERTO'),
    [filteredRecords],
  )
  const columnEmNegociacao = useMemo(
    () => filteredRecords.filter((r) => r.status === 'EM_NEGOCIACAO'),
    [filteredRecords],
  )
  const columnRecusados = useMemo(
    () => filteredRecords.filter((r) => r.status === 'RECUSADO'),
    [filteredRecords],
  )
  const columnConcluidas = useMemo(
    () => filteredRecords.filter((r) => r.status === 'CONCLUIDA'),
    [filteredRecords],
  )

  // Abrir Drawer de Detalhes
  const handleOpenDetail = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setDrawerOpen(true)
  }

  // Avançar de ABERTO para EM_NEGOCIACAO
  const handleStartNegotiation = async (neg: NegociacaoRecord) => {
    try {
      const res = await negociacoesService.changeStatus(
        neg.id,
        'EM_NEGOCIACAO',
        'Início formal de contato e envio de proposta ao transportador/motorista.',
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
        description: `Negociação ${neg.negotiation_number} movida para "Em negociação".`,
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

  // Abrir Modal de Conclusão com Validação Estrita
  const handleOpenConcludeModal = (neg: NegociacaoRecord) => {
    setSelectedNegotiation(neg)
    setConcludeModalOpen(true)
  }

  // Confirmar Conclusão
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

  // Disparar / Reprocessar Pipeline SAP
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
        description: res.message || 'Status retido com dados íntegros aguardando liberação formal.',
        className: 'bg-[#005596] text-white',
      })
      await loadData()
    } finally {
      setIsProcessingSap(false)
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
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Padronizado */}
      <PageHeader
        title="Gestão de Negociações & Pipeline SAP"
        subtitle="Acompanhamento operacional em Kanban estrito, histórico rastreável e orquestração de remessas e transportes no SAP ECC."
        icon={Layers}
        badge={
          <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Governança de Contratação
          </Badge>
        }
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Contratação' },
          { label: 'Negociações' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs border-slate-300 gap-1.5 h-9"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#005596]' : ''}`} />
              Atualizar Dados
            </Button>
          </div>
        }
        className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs mb-0"
      />

      {/* 2. Indicadores do Topo (100% calculados com dados reais) — Item 16 */}
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
            <div className="text-xl font-mono font-black text-slate-800 mt-0.5">
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

      {/* 3. Filtros Avançados via RegionConsulta (Item 14) */}
      <RegionConsulta
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nº negociação, carga, motorista, transportadora, placa, cliente, pedido SAP..."
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
                <SelectTrigger className="h-8 text-xs w-[150px] bg-white border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="EM_NEGOCIACAO">Em negociação</SelectItem>
                  <SelectItem value="RECUSADO">Recusados</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
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
                  <SelectItem value="CHICAO_IA">🤖 Chicão — IA</SelectItem>
                  <SelectItem value="HUMANO">👤 Atendimento humano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Status SAP:</span>
              <Select value={sapStatusFilter} onValueChange={setSapStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[170px] bg-white border-slate-200">
                  <SelectValue placeholder="Status SAP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status SAP</SelectItem>
                  <SelectItem value="AGUARDANDO_INTEGRACAO">Aguardando integração</SelectItem>
                  <SelectItem value="VALIDANDO_DADOS">Validando dados</SelectItem>
                  <SelectItem value="CRIANDO_REMESSAS">Criando remessas</SelectItem>
                  <SelectItem value="REMESSAS_CRIADAS">Remessas criadas</SelectItem>
                  <SelectItem value="CRIANDO_TRANSPORTE">Criando transporte</SelectItem>
                  <SelectItem value="INTEGRADO_SAP">Integrado SAP</SelectItem>
                  <SelectItem value="ERRO_INTEGRACAO">Erro de integração</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">UF:</span>
              <Select value={ufFilter} onValueChange={setUfFilter}>
                <SelectTrigger className="h-8 text-xs w-[100px] bg-white border-slate-200">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas UF</SelectItem>
                  <SelectItem value="SP">SP</SelectItem>
                  <SelectItem value="MG">MG</SelectItem>
                  <SelectItem value="RJ">RJ</SelectItem>
                  <SelectItem value="ES">ES</SelectItem>
                  <SelectItem value="GO">GO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
      />

      {/* 4. Kanban Responsivo com 4 Colunas (Item 2) */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[1050px]">
          {/* Coluna 1: Aberto */}
          <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 flex flex-col space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                  Aberto
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-xs font-bold bg-white text-slate-700"
              >
                {columnAberto.length}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Ofertas disponíveis criadas sem negociação efetivamente iniciada.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
              {columnAberto.length > 0 ? (
                columnAberto.map((neg) => (
                  <NegotiationKanbanCard
                    key={neg.id}
                    negotiation={neg}
                    onOpenDetail={handleOpenDetail}
                    onMoveToNext={handleStartNegotiation}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-white/50 rounded-lg border border-dashed border-slate-200">
                  Nenhuma negociação em Aberto
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Em Negociação */}
          <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200 flex flex-col space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#005596]" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-sky-900">
                  Em Negociação
                </h3>
              </div>
              <Badge className="font-mono text-xs font-bold bg-[#005596] text-white">
                {columnEmNegociacao.length}
              </Badge>
            </div>
            <p className="text-[11px] text-sky-800">
              Interação ativa entre Chicão/humano e motorista/transportador.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
              {columnEmNegociacao.length > 0 ? (
                columnEmNegociacao.map((neg) => (
                  <NegotiationKanbanCard
                    key={neg.id}
                    negotiation={neg}
                    onOpenDetail={handleOpenDetail}
                    onConcludeModal={handleOpenConcludeModal}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-white/50 rounded-lg border border-dashed border-sky-200">
                  Nenhuma negociação em andamento
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Recusados */}
          <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-200 flex flex-col space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-rose-900">
                  Recusados
                </h3>
              </div>
              <Badge className="font-mono text-xs font-bold bg-rose-600 text-white">
                {columnRecusados.length}
              </Badge>
            </div>
            <p className="text-[11px] text-rose-800">
              Oferta recusada, encerrada ou sem acordo comercial.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
              {columnRecusados.length > 0 ? (
                columnRecusados.map((neg) => (
                  <NegotiationKanbanCard
                    key={neg.id}
                    negotiation={neg}
                    onOpenDetail={handleOpenDetail}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-white/50 rounded-lg border border-dashed border-rose-200">
                  Nenhuma negociação recusada
                </div>
              )}
            </div>
          </div>

          {/* Coluna 4: Concluídas */}
          <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200 flex flex-col space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900">
                  Concluídas
                </h3>
              </div>
              <Badge className="font-mono text-xs font-bold bg-emerald-600 text-white">
                {columnConcluidas.length}
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-800">
              Aceite formal validado e condições comerciais fechadas.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
              {columnConcluidas.length > 0 ? (
                columnConcluidas.map((neg) => (
                  <NegotiationKanbanCard
                    key={neg.id}
                    negotiation={neg}
                    onOpenDetail={handleOpenDetail}
                    onTriggerSap={handleTriggerSap}
                    isProcessingSap={isProcessingSap}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-white/50 rounded-lg border border-dashed border-emerald-200">
                  Nenhuma negociação concluída
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Drawer de Detalhamento Completo (Item 4) */}
      <NegotiationDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        negotiation={selectedNegotiation}
        canViewCpf={
          permissions.canViewAuditLogs ||
          user?.role === 'admin_master' ||
          user?.role === 'admin_tms'
        }
        onConclude={(neg) => {
          setDrawerOpen(false)
          handleOpenConcludeModal(neg)
        }}
        onTriggerSap={handleTriggerSap}
        isProcessingSap={isProcessingSap}
      />

      {/* 6. Modal de Conclusão com Validação Estrita de Requisitos (Item 6) */}
      <NegotiationConcludeModal
        open={concludeModalOpen}
        onOpenChange={setConcludeModalOpen}
        negotiation={selectedNegotiation}
        onConfirm={handleConfirmConclude}
        isSubmitting={isConcluding}
      />
    </div>
  )
}
export default NegociacoesPage
