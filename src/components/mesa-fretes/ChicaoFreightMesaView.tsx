import React, { useMemo, useState } from 'react'
import {
  Search,
  Filter,
  RefreshCw,
  Send,
  UserCheck,
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Phone,
  FileText,
  Truck,
  MapPin,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { tmsService } from '@/services/tmsService'
import { ChicaoFreightOfferEntity, ChicaoOfferStatus } from '@/domain/rules'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { PageHeader } from '@/components/ui-custom/PageHeader'

// Mapeamento das 8 colunas do Kanban conforme especificado
export type KanbanColumnKey =
  | 'NOVA_OFERTA'
  | 'ENVIADA_CHICAO'
  | 'EM_NEGOCIACAO'
  | 'CONTRAPROPOSTA'
  | 'AGUARDANDO_HUMANO'
  | 'ACEITA'
  | 'TRANSPORTE_SAP'
  | 'FINALIZADA'

interface KanbanColumnConfig {
  key: KanbanColumnKey
  title: string
  colorBadge: string
  borderColor: string
  statuses: ChicaoOfferStatus[]
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    key: 'NOVA_OFERTA',
    title: 'Nova oferta',
    colorBadge: 'bg-slate-100 text-slate-800 border-slate-300',
    borderColor: 'border-slate-300',
    statuses: ['DISPONIVEL', 'SELECIONADO', 'ERRO_ENVIO'],
  },
  {
    key: 'ENVIADA_CHICAO',
    title: 'Enviada pelo Chicão',
    colorBadge: 'bg-sky-100 text-sky-800 border-sky-300',
    borderColor: 'border-sky-300',
    statuses: ['ENVIADO_CHICAO', 'OFERTA_ENVIADA', 'VISUALIZADA'],
  },
  {
    key: 'EM_NEGOCIACAO',
    title: 'Em negociação',
    colorBadge: 'bg-blue-100 text-[#005596] border-blue-300',
    borderColor: 'border-[#005596]',
    statuses: ['EM_NEGOCIACAO'],
  },
  {
    key: 'CONTRAPROPOSTA',
    title: 'Contraproposta',
    colorBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    borderColor: 'border-amber-400',
    statuses: ['CONTRAPROPOSTA'],
  },
  {
    key: 'AGUARDANDO_HUMANO',
    title: 'Aguardando humano',
    colorBadge: 'bg-orange-100 text-orange-900 border-orange-400',
    borderColor: 'border-orange-500',
    statuses: ['AGUARDANDO_APROVACAO'],
  },
  {
    key: 'ACEITA',
    title: 'Aceita',
    colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderColor: 'border-emerald-400',
    statuses: ['ACEITA'],
  },
  {
    key: 'TRANSPORTE_SAP',
    title: 'Transporte SAP',
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    borderColor: 'border-purple-400',
    statuses: [], // Status ACEITA que já possui sap_transport_number
  },
  {
    key: 'FINALIZADA',
    title: 'Finalizada',
    colorBadge: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    borderColor: 'border-zinc-300',
    statuses: ['RECUSADA', 'EXPIRADA', 'CANCELADA'],
  },
]

export const ChicaoFreightMesaView: React.FC = () => {
  const { toast } = useToast()

  const [offers, setOffers] = useState<ChicaoFreightOfferEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOffer, setSelectedOffer] = useState<ChicaoFreightOfferEntity | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Modais de Ação Humana
  const [takeoverModalOpen, setTakeoverModalOpen] = useState(false)
  const [takeoverReason, setTakeoverReason] = useState('')
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [approvalDecision, setApprovalDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  const [approvedCustomValue, setApprovedCustomValue] = useState<number>(0)

  // Simulação / Teste de Resposta do Motorista no modal
  const [testReplyText, setTestReplyText] = useState('')
  const [testCounterVal, setTestCounterVal] = useState<string>('')

  // 1. Carregamento inicial de ofertas reais
  const loadOffers = async () => {
    try {
      const data = await tmsService.getChicaoOffers('', '-created')
      setOffers(data)
    } catch (err: any) {
      console.warn('Erro ao carregar ofertas Chicão:', err)
      toast({
        title: 'Falha ao atualizar ofertas',
        description: err?.message || 'Não foi possível carregar as ofertas da coleção.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadOffers()
  }, [])

  // 2. Tempo Real via useRealtime sobre chicao_freight_offers
  useRealtime<any>('chicao_freight_offers', (sub) => {
    const rec = sub.record as ChicaoFreightOfferEntity
    if (sub.action === 'create') {
      setOffers((prev) => [rec, ...prev.filter((o) => o.id !== rec.id)])
    } else if (sub.action === 'update') {
      setOffers((prev) => prev.map((o) => (o.id === rec.id ? rec : o)))
      if (selectedOffer && selectedOffer.id === rec.id) {
        setSelectedOffer(rec)
      }
    } else if (sub.action === 'delete') {
      setOffers((prev) => prev.filter((o) => o.id !== rec.id))
      if (selectedOffer && selectedOffer.id === rec.id) {
        setSelectedOffer(null)
        setDetailModalOpen(false)
      }
    }
  })

  // 3. Filtragem de ofertas por busca
  const filteredOffers = useMemo(() => {
    if (!searchTerm.trim()) return offers
    const term = searchTerm.toLowerCase()
    return offers.filter(
      (o) =>
        (o.offer_code || '').toLowerCase().includes(term) ||
        (o.driver_name || '').toLowerCase().includes(term) ||
        (o.vehicle_plate || '').toLowerCase().includes(term) ||
        (o.cargo_id || '').toLowerCase().includes(term) ||
        (o.destination_city || '').toLowerCase().includes(term) ||
        (o.destination_uf || '').toLowerCase().includes(term) ||
        (o.itinerary_code || '').toLowerCase().includes(term),
    )
  }, [offers, searchTerm])

  // 4. Mapear ofertas para as 8 colunas do Kanban
  const offersByColumn = useMemo(() => {
    const map: Record<KanbanColumnKey, ChicaoFreightOfferEntity[]> = {
      NOVA_OFERTA: [],
      ENVIADA_CHICAO: [],
      EM_NEGOCIACAO: [],
      CONTRAPROPOSTA: [],
      AGUARDANDO_HUMANO: [],
      ACEITA: [],
      TRANSPORTE_SAP: [],
      FINALIZADA: [],
    }

    filteredOffers.forEach((o) => {
      // Regra especial: se ACEITA e possui transporte SAP gerado, cai na coluna Transporte SAP
      if (o.status === 'ACEITA' && o.sap_transport_number) {
        map.TRANSPORTE_SAP.push(o)
        return
      }

      if (['DISPONIVEL', 'SELECIONADO', 'ERRO_ENVIO'].includes(o.status)) {
        map.NOVA_OFERTA.push(o)
      } else if (['ENVIADO_CHICAO', 'OFERTA_ENVIADA', 'VISUALIZADA'].includes(o.status)) {
        map.ENVIADA_CHICAO.push(o)
      } else if (o.status === 'EM_NEGOCIACAO') {
        map.EM_NEGOCIACAO.push(o)
      } else if (o.status === 'CONTRAPROPOSTA') {
        map.CONTRAPROPOSTA.push(o)
      } else if (o.status === 'AGUARDANDO_APROVACAO') {
        map.AGUARDANDO_HUMANO.push(o)
      } else if (o.status === 'ACEITA') {
        map.ACEITA.push(o)
      } else if (['RECUSADA', 'EXPIRADA', 'CANCELADA'].includes(o.status)) {
        map.FINALIZADA.push(o)
      } else {
        map.NOVA_OFERTA.push(o)
      }
    })

    return map
  }, [filteredOffers])

  // 5. Indicadores calculados estritamente dos dados reais da coleção (sem mock)
  const metrics = useMemo(() => {
    const totalOffers = offers.length
    // Enviadas
    const sentOffers = offers.filter((o) => o.status !== 'DISPONIVEL' && o.status !== 'SELECIONADO')
    const sentCount = sentOffers.length

    // Respondidas: qualquer oferta que teve mensagens além da inicial ou status avançado
    const answeredOffers = offers.filter(
      (o) =>
        ['EM_NEGOCIACAO', 'CONTRAPROPOSTA', 'AGUARDANDO_APROVACAO', 'ACEITA', 'RECUSADA'].includes(
          o.status,
        ) ||
        (o.messages_history && o.messages_history.length > 1),
    )
    const answeredCount = answeredOffers.length
    const responseRate = sentCount > 0 ? (answeredCount / sentCount) * 100 : 0

    // Aceitas e Recusadas
    const acceptedCount = offers.filter((o) => o.status === 'ACEITA').length
    const acceptanceRate = answeredCount > 0 ? (acceptedCount / answeredCount) * 100 : 0

    const refusedCount = offers.filter((o) => o.status === 'RECUSADA').length
    const refusalRate = answeredCount > 0 ? (refusedCount / answeredCount) * 100 : 0

    // Valores financeiros
    const acceptedWithValues = offers.filter(
      (o) => o.status === 'ACEITA' && o.final_contracted_freight,
    )
    const totalInitialAccepted = acceptedWithValues.reduce(
      (acc, o) => acc + (Number(o.initial_offer_value) || 0),
      0,
    )
    const totalContracted = acceptedWithValues.reduce(
      (acc, o) => acc + (Number(o.final_contracted_freight) || 0),
      0,
    )

    // % Negociações 100% IA vs com intervenção humana
    const totalFinishedOrActive = offers.filter(
      (o) => o.status !== 'DISPONIVEL' && o.status !== 'SELECIONADO',
    )
    const humanIntervened = totalFinishedOrActive.filter(
      (o) =>
        o.active_actor === 'HUMANO' ||
        Boolean(o.human_takeover_user) ||
        (o.ai_handled_pct !== undefined && o.ai_handled_pct < 100),
    ).length
    const fullyAi = totalFinishedOrActive.length - humanIntervened
    const fullyAiPct =
      totalFinishedOrActive.length > 0 ? (fullyAi / totalFinishedOrActive.length) * 100 : 100
    const humanPct =
      totalFinishedOrActive.length > 0 ? (humanIntervened / totalFinishedOrActive.length) * 100 : 0

    // Recusas por motivo (agrupamento real de refusal_category / refusal_reason)
    const refusalsByCategory: Record<string, number> = {}
    offers
      .filter((o) => o.status === 'RECUSADA')
      .forEach((o) => {
        const cat = o.refusal_category || 'OUTRO'
        refusalsByCategory[cat] = (refusalsByCategory[cat] || 0) + 1
      })

    // Desempenho por itinerário / destino
    const performanceByRoute: Record<
      string,
      { sent: number; accepted: number; totalContracted: number }
    > = {}
    offers.forEach((o) => {
      const routeKey =
        o.itinerary_code || `${o.destination_city || 'Destino'}/${o.destination_uf || 'UF'}`.trim()
      if (!performanceByRoute[routeKey]) {
        performanceByRoute[routeKey] = { sent: 0, accepted: 0, totalContracted: 0 }
      }
      performanceByRoute[routeKey].sent += 1
      if (o.status === 'ACEITA') {
        performanceByRoute[routeKey].accepted += 1
        performanceByRoute[routeKey].totalContracted += Number(o.final_contracted_freight || 0)
      }
    })

    // Tempo médio de negociação calculado a partir do timeline_json se disponível
    let totalDurationMinutes = 0
    let durationCount = 0
    offers.forEach((o) => {
      if (o.timeline_json && o.timeline_json.length >= 2) {
        const t0 = new Date(o.timeline_json[0].timestamp).getTime()
        const tEnd = new Date(o.timeline_json[o.timeline_json.length - 1].timestamp).getTime()
        if (tEnd > t0 && !isNaN(t0) && !isNaN(tEnd)) {
          const diffMin = (tEnd - t0) / (1000 * 60)
          totalDurationMinutes += diffMin
          durationCount += 1
        }
      }
    })
    const avgDurationMin = durationCount > 0 ? Math.round(totalDurationMinutes / durationCount) : 0

    return {
      totalOffers,
      sentCount,
      answeredCount,
      responseRate,
      acceptedCount,
      acceptanceRate,
      refusedCount,
      refusalRate,
      totalInitialAccepted,
      totalContracted,
      fullyAiPct,
      humanPct,
      refusalsByCategory,
      performanceByRoute,
      avgDurationMin,
    }
  }, [offers])

  // Ações Operacionais
  const handleRetryOffer = async (offerId: string) => {
    setActionLoading(true)
    try {
      const res = await tmsService.retryChicaoOffer(offerId)
      toast({
        title: res.success ? 'Oferta Reenviada' : 'Aviso de Envio',
        description: res.message || 'Tentativa de reenvio executada com sucesso.',
        variant: res.success ? 'default' : 'destructive',
      })
      await loadOffers()
    } catch (err: any) {
      toast({
        title: 'Erro ao reenviar oferta',
        description: err?.message || 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleTakeover = async (action: 'TAKE' | 'HANDBACK') => {
    if (!selectedOffer) return
    setActionLoading(true)
    try {
      const res = await tmsService.takeoverChicaoOffer({
        offer_id: selectedOffer.id,
        action,
        reason:
          takeoverReason ||
          (action === 'TAKE' ? 'Atendimento humano acionado' : 'Devolvido ao Chicão'),
      })
      setSelectedOffer(res.offer)
      setTakeoverModalOpen(false)
      setTakeoverReason('')
      toast({
        title: action === 'TAKE' ? 'Você assumiu a conversa' : 'Conversa devolvida ao Chicão',
        description:
          action === 'TAKE'
            ? 'O Chicão foi pausado para esta oferta. Agora o atendimento é 100% humano.'
            : 'O Chicão voltou a conduzir a negociação desta oferta via IA.',
      })
      await loadOffers()
    } catch (err: any) {
      toast({
        title: 'Erro ao alternar interlocutor',
        description: err?.message || 'Falha ao processar a ação.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveOrReject = async () => {
    if (!selectedOffer) return
    setActionLoading(true)
    try {
      const res = await tmsService.approveChicaoOffer({
        offer_id: selectedOffer.id,
        decision: approvalDecision,
        approved_value:
          approvalDecision === 'APPROVE'
            ? approvedCustomValue ||
              selectedOffer.counter_value_requested ||
              selectedOffer.initial_offer_value
            : undefined,
      })
      setSelectedOffer(res.offer)
      setApproveModalOpen(false)
      toast({
        title:
          approvalDecision === 'APPROVE' ? 'Contraproposta Aprovada' : 'Contraproposta Rejeitada',
        description:
          approvalDecision === 'APPROVE'
            ? `Frete confirmado em ${formatCurrency(res.final_contracted_freight || 0)}. Carga bloqueada e pronta para o SAP.`
            : 'Contraproposta rejeitada. Oferta marcada como recusada.',
      })
      await loadOffers()
    } catch (err: any) {
      toast({
        title: 'Erro na aprovação',
        description: err?.message || 'Falha ao processar decisão.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendTestReply = async () => {
    if (!selectedOffer || (!testReplyText.trim() && !testCounterVal)) return
    setActionLoading(true)
    try {
      const res = await tmsService.processChicaoDriverReply({
        offer_id: selectedOffer.id,
        message_text: testReplyText.trim(),
        counter_value: testCounterVal ? Number(testCounterVal) : undefined,
      })
      setSelectedOffer(res.offer)
      setTestReplyText('')
      setTestCounterVal('')
      toast({
        title: 'Resposta processada',
        description: `Novo status: ${res.status}`,
      })
      await loadOffers()
    } catch (err: any) {
      toast({
        title: 'Erro ao simular resposta',
        description: err?.message || 'Falha ao enviar resposta do motorista.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO & INDICADORES REAIS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
        {/* Cabeçalho Reestruturado e Totalmente Responsivo com PageHeader */}
        <PageHeader
          title="Mesa de Fretes — Agente Chicão"
          subtitle="Gestão inteligente de ofertas, negociações automáticas e contratação com separação de frete e pedágio."
          icon={Bot}
          badge={
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2 py-0.5 shrink-0">
              Kanban 8 Colunas
            </Badge>
          }
          breadcrumbs={[
            { label: 'TMS CIAFAL', href: '/tms' },
            { label: 'Mesa de Fretes' },
            { label: 'Agente Chicão' },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={loadOffers}
              disabled={loading || actionLoading}
              className="h-9 gap-1.5 text-xs text-slate-700 font-semibold border-slate-300 hover:bg-slate-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          }
          className="pb-2 border-b-0 mb-0"
        />

        {/* Linha de Busca Ampla */}
        <div className="relative w-full max-w-2xl pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar oferta, motorista, placa, rota..."
            className="pl-9 h-9 text-xs w-full border-slate-300 bg-slate-50/50 focus:bg-white transition"
          />
        </div>

        {/* CARDS DE INDICADORES CALCULADOS DOS DADOS REAIS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-slate-200 bg-slate-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Ofertas Geradas</p>
              <div className="text-xl font-mono font-black text-slate-900 mt-0.5">
                {metrics.totalOffers}
              </div>
              <p className="text-[10px] text-slate-500">{metrics.sentCount} enviadas</p>
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-sky-50/40 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-sky-800 uppercase">Taxa de Resposta</p>
              <div className="text-xl font-mono font-black text-[#005596] mt-0.5">
                {metrics.responseRate.toFixed(1)}%
              </div>
              <p className="text-[10px] text-sky-700">{metrics.answeredCount} responderam</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Taxa de Aceite</p>
              <div className="text-xl font-mono font-black text-emerald-700 mt-0.5">
                {metrics.acceptanceRate.toFixed(1)}%
              </div>
              <p className="text-[10px] text-emerald-700">{metrics.acceptedCount} fechadas</p>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/40 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-rose-800 uppercase">Taxa de Recusa</p>
              <div className="text-xl font-mono font-black text-rose-700 mt-0.5">
                {metrics.refusalRate.toFixed(1)}%
              </div>
              <p className="text-[10px] text-rose-700">{metrics.refusedCount} recusadas</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/40 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-amber-900 uppercase">Autonomia Chicão</p>
              <div className="text-xl font-mono font-black text-amber-800 mt-0.5">
                {metrics.fullyAiPct.toFixed(0)}% IA
              </div>
              <p className="text-[10px] text-amber-700">
                {metrics.humanPct.toFixed(0)}% intervenção
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo Médio Negoc.</p>
              <div className="text-xl font-mono font-black text-slate-800 mt-0.5">
                {metrics.avgDurationMin > 0 ? `${metrics.avgDurationMin} min` : 'Em medição'}
              </div>
              <p className="text-[10px] text-slate-500">Agilidade Chicão</p>
            </CardContent>
          </Card>
        </div>

        {/* LINHA DE COMPARAÇÃO FINANCEIRA E PARETO DE RECUSAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Comparativo Financeiro (Aceitas)
              </span>
              <div className="flex items-center gap-3 mt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Proposto Inicial:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formatCurrency(metrics.totalInitialAccepted)}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-emerald-600 block font-bold">
                    Contratado Final:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(metrics.totalContracted)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="bg-white text-[11px] font-bold">
                Spread:{' '}
                {metrics.totalInitialAccepted > 0
                  ? (
                      ((metrics.totalContracted - metrics.totalInitialAccepted) /
                        metrics.totalInitialAccepted) *
                      100
                    ).toFixed(1) + '%'
                  : '0.0%'}
              </Badge>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
            <div className="w-full">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Motivos de Recusa Registrados ({metrics.refusedCount})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.keys(metrics.refusalsByCategory).length > 0 ? (
                  Object.entries(metrics.refusalsByCategory).map(([cat, count]) => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="bg-white text-[10px] font-semibold text-slate-700 border-slate-300"
                    >
                      {cat}: {count}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Nenhuma recusa registrada nesta base.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KANBAN COM AS 8 COLUNAS EXIGIDAS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#005596]" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Fluxo das Ofertas Chicão ({filteredOffers.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Clique em qualquer card para ver triângulo operacional, valores, chat e timeline.
          </span>
        </div>

        {/* Kanban com largura proporcional adaptada a 1366x768, 1440x900 e 1920x1080 */}
        <div className="flex gap-2.5 xl:gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin max-w-full">
          {KANBAN_COLUMNS.map((col) => {
            const colOffers = offersByColumn[col.key] || []
            return (
              <div
                key={col.key}
                className="bg-slate-100/80 rounded-xl p-2 sm:p-2.5 border border-slate-200 flex flex-col w-[240px] sm:w-[255px] xl:w-[calc((100%-7*0.75rem)/8)] min-w-[220px] max-w-[290px] shrink-0 xl:shrink max-h-[750px] snap-start transition-all"
              >
                {/* Header da Coluna */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                  <span className="font-extrabold text-xs text-slate-800 line-clamp-1">
                    {col.title}
                  </span>
                  <Badge className={`text-[10px] font-bold py-0 px-1.5 border ${col.colorBadge}`}>
                    {colOffers.length}
                  </Badge>
                </div>

                {/* Cards na Coluna */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {colOffers.map((offer) => {
                    const isError = offer.status === 'ERRO_ENVIO'
                    const isTakeover = offer.active_actor === 'HUMANO'
                    const isAwaitingApproval = offer.status === 'AGUARDANDO_APROVACAO'

                    return (
                      <div
                        key={offer.id}
                        onClick={() => {
                          setSelectedOffer(offer)
                          setApprovedCustomValue(
                            offer.counter_value_requested || offer.initial_offer_value,
                          )
                          setDetailModalOpen(true)
                        }}
                        className={`bg-white rounded-lg p-2.5 border cursor-pointer hover:shadow-md transition text-xs space-y-2 ${
                          isError
                            ? 'border-rose-300 bg-rose-50/30'
                            : isAwaitingApproval
                              ? 'border-orange-400 bg-orange-50/20 shadow-sm'
                              : 'border-slate-200 hover:border-[#005596]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-[#005596]">
                            {offer.offer_code}
                          </span>
                          {isError ? (
                            <Badge className="bg-rose-600 text-white text-[9px] py-0 px-1">
                              ERRO ENVIO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold">
                              {offer.status}
                            </Badge>
                          )}
                        </div>

                        {/* Motorista e Placa */}
                        <div>
                          <div className="font-bold text-slate-900 truncate">
                            {offer.driver_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between mt-0.5">
                            <span>{offer.vehicle_plate}</span>
                            <span>
                              {offer.weight_ton ? `${offer.weight_ton.toFixed(1)} t` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Destino */}
                        <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {offer.destination_city || 'Destino'} / {offer.destination_uf || 'UF'}
                          </span>
                        </div>

                        {/* Valores */}
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Frete:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatCurrency(
                              offer.final_contracted_freight ||
                                offer.counter_value_requested ||
                                offer.initial_offer_value,
                            )}
                          </span>
                        </div>

                        {/* Tags de status operacional */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-400 font-medium">
                            {offer.rounds_count ? `${offer.rounds_count}ª rodada` : '1ª rodada'}
                          </span>
                          {isTakeover ? (
                            <span className="text-amber-700 font-bold flex items-center gap-0.5">
                              <UserCheck className="w-3 h-3" /> Humano
                            </span>
                          ) : (
                            <span className="text-[#005596] font-bold flex items-center gap-0.5">
                              <Bot className="w-3 h-3" /> Chicão IA
                            </span>
                          )}
                        </div>

                        {/* Botão contextual para ERRO_ENVIO */}
                        {isError && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryOffer(offer.id)
                            }}
                            disabled={actionLoading}
                            className="w-full h-6 text-[10px] font-bold gap-1 mt-1 bg-rose-600 hover:bg-rose-700"
                          >
                            <RotateCcw className="w-3 h-3" /> Tentar novamente
                          </Button>
                        )}

                        {/* Botão contextual para AGUARDANDO_APROVACAO */}
                        {isAwaitingApproval && (
                          <div className="pt-1">
                            <span className="text-[10px] font-extrabold text-orange-700 block text-center bg-orange-100 py-0.5 rounded">
                              Requer Aprovação Humana
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {colOffers.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-slate-400 italic">
                      Nenhuma oferta
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. MODAL DE DETALHES COMPLETO (TRIÂNGULO + VALORES + CHAT + TIMELINE) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOffer && (
            <>
              <DialogHeader className="border-b pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-[#005596] shrink-0">
                        {selectedOffer.offer_code}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="truncate max-w-[280px] sm:max-w-md">
                        {selectedOffer.cargo_title || selectedOffer.cargo_id}
                      </span>
                    </DialogTitle>
                    <Badge className="text-xs font-bold shrink-0">{selectedOffer.status}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedOffer.active_actor === 'CHICAO' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTakeoverModalOpen(true)}
                        className="text-xs font-bold border-amber-400 text-amber-700 hover:bg-amber-50 gap-1.5 h-8"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assumir conversa
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleToggleTakeover('HANDBACK')}
                        disabled={actionLoading}
                        className="text-xs font-bold bg-[#005596] text-white hover:bg-[#004275] gap-1.5 h-8"
                      >
                        <Bot className="w-3.5 h-3.5" /> Devolver ao Chicão
                      </Button>
                    )}

                    {selectedOffer.status === 'AGUARDANDO_APROVACAO' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setApprovalDecision('APPROVE')
                          setApprovedCustomValue(
                            selectedOffer.counter_value_requested ||
                              selectedOffer.initial_offer_value,
                          )
                          setApproveModalOpen(true)
                        }}
                        className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 h-8"
                      >
                        <Check className="w-3.5 h-3.5" /> Decidir Contraproposta
                      </Button>
                    )}
                  </div>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Criada em {new Date(selectedOffer.created || Date.now()).toLocaleString('pt-BR')}{' '}
                  • Ator Atual: <strong>{selectedOffer.active_actor || 'CHICAO'}</strong> • IA
                  Handled: <strong>{selectedOffer.ai_handled_pct ?? 100}%</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* AVISO DE ERRO DE ENVIO SE HOUVER */}
                {selectedOffer.status === 'ERRO_ENVIO' && (
                  <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-rose-900 block font-bold">
                          Falha no Envio ao WhatsApp
                        </strong>
                        <p className="text-rose-800 mt-0.5">
                          {selectedOffer.whatsapp_error_message ||
                            'As credenciais da API do WhatsApp não estão configuradas neste ambiente.'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRetryOffer(selectedOffer.id)}
                      disabled={actionLoading}
                      className="shrink-0 text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
                    </Button>
                  </div>
                )}

                {/* 1. TRIÂNGULO VEÍCULO ↔ MOTORISTA ↔ CARGA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Vértice 1: Carga */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1">
                      <FileText className="w-3.5 h-3.5 text-[#005596]" />
                      <span>Carga ({selectedOffer.cargo_id})</span>
                    </div>
                    <div className="text-slate-600 space-y-0.5">
                      <p>
                        Rota:{' '}
                        <strong>
                          {selectedOffer.origin || 'Contagem / MG'} →{' '}
                          {selectedOffer.destination_city || 'Destino'} /{' '}
                          {selectedOffer.destination_uf || 'UF'}
                        </strong>
                      </p>
                      <p>
                        Itinerário:{' '}
                        <strong className="font-mono">
                          {selectedOffer.itinerary_code || '---'}
                        </strong>
                      </p>
                      <p>
                        Peso Total:{' '}
                        <strong>
                          {selectedOffer.weight_ton
                            ? `${selectedOffer.weight_ton.toFixed(2)} t (${selectedOffer.weight_kg} kg)`
                            : '---'}
                        </strong>
                      </p>
                      <p>
                        Descargas: <strong>{selectedOffer.discharges_count || 1}</strong> •
                        Distância: <strong>{selectedOffer.distance_km || 0} km</strong>
                      </p>
                      <p>
                        Tipo Descarga: <strong>{selectedOffer.discharge_type || 'Padrão'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Vértice 2: Motorista */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Motorista Parceiro</span>
                    </div>
                    <div className="text-slate-600 space-y-0.5">
                      <p>
                        Nome: <strong>{selectedOffer.driver_name}</strong>
                      </p>
                      <p>
                        WhatsApp / Cel:{' '}
                        <strong className="font-mono">
                          {selectedOffer.driver_whatsapp || selectedOffer.driver_phone || '---'}
                        </strong>
                      </p>
                      <p>
                        Documento (CPF):{' '}
                        <strong className="font-mono">
                          {selectedOffer.driver_document || '---'}
                        </strong>
                      </p>
                      <p>
                        Transportadora: <strong>{selectedOffer.carrier_name || 'Autônomo'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Vértice 3: Veículo */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b pb-1">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Veículo & Disponibilidade</span>
                    </div>
                    <div className="text-slate-600 space-y-0.5">
                      <p>
                        Placa:{' '}
                        <strong className="font-mono uppercase text-slate-900 font-extrabold">
                          {selectedOffer.vehicle_plate}
                        </strong>
                      </p>
                      <p>
                        Tipo:{' '}
                        <strong>
                          {selectedOffer.vehicle_type || 'Carreta'} •{' '}
                          {selectedOffer.vehicle_body_type || 'Sider'}
                        </strong>
                      </p>
                      <p>
                        Capacidade:{' '}
                        <strong>
                          {selectedOffer.vehicle_capacity_kg
                            ? `${selectedOffer.vehicle_capacity_kg / 1000} t`
                            : '---'}
                        </strong>
                      </p>
                      <p>
                        Fila / Grupo:{' '}
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {selectedOffer.queue_group || 'PORTA'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. VALORES (FRETE INICIAL, PEDÁGIO, CONTRAPROPOSTAS, R$/t, R$/km) */}
                <div className="bg-sky-50/60 p-3 rounded-lg border border-sky-200 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-200/60 pb-1.5">
                    <span className="font-extrabold text-[#005596] uppercase text-[11px]">
                      Composição Financeira & Alçadas da Oferta
                    </span>
                    <Badge variant="outline" className="bg-white text-[10px] font-bold">
                      Teto Chicão Autonomia: {formatCurrency(selectedOffer.max_autonomy_value || 0)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Frete Inicial:</span>
                      <strong className="font-mono text-slate-900">
                        {formatCurrency(selectedOffer.initial_offer_value || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Pedágio Destacado:</span>
                      <strong className="font-mono text-emerald-700">
                        {formatCurrency(selectedOffer.toll_cost || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Proposto:</span>
                      <strong className="font-mono text-slate-900 font-extrabold">
                        {formatCurrency(selectedOffer.total_offered_value || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Contraproposta:</span>
                      <strong className="font-mono text-amber-800">
                        {selectedOffer.counter_value_requested
                          ? formatCurrency(selectedOffer.counter_value_requested)
                          : 'Nenhuma'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">R$ / Tonelada:</span>
                      <strong className="font-mono text-slate-800">
                        {selectedOffer.cost_per_ton ? `R$ ${selectedOffer.cost_per_ton}/t` : '---'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">R$ / km:</span>
                      <strong className="font-mono text-slate-800">
                        {selectedOffer.cost_per_km ? `R$ ${selectedOffer.cost_per_km}/km` : '---'}
                      </strong>
                    </div>
                  </div>

                  {/* Diferença em R$ e % se houver contraproposta */}
                  {selectedOffer.counter_value_requested && (
                    <div className="bg-white p-2 rounded border border-sky-100 flex items-center justify-between text-[11px]">
                      <span>
                        Diferença solicitada pelo motorista:{' '}
                        <strong className="text-amber-700">
                          +
                          {formatCurrency(
                            selectedOffer.counter_value_requested -
                              selectedOffer.initial_offer_value,
                          )}
                        </strong>{' '}
                        (
                        {(
                          ((selectedOffer.counter_value_requested -
                            selectedOffer.initial_offer_value) /
                            selectedOffer.initial_offer_value) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                      {selectedOffer.final_contracted_freight && (
                        <span className="font-bold text-emerald-700">
                          Valor Contratado Final:{' '}
                          {formatCurrency(selectedOffer.final_contracted_freight)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. GRID: CHAT COMPLETO (ESQUERDA) × TIMELINE COMPLETA (DIREITA) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Chat Completo */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col h-80">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <MessageSquare className="w-3.5 h-3.5 text-[#005596]" />
                        <span>Histórico do Chat WhatsApp</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {selectedOffer.messages_history?.length || 0} msgs
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 p-2">
                      {selectedOffer.messages_history &&
                      selectedOffer.messages_history.length > 0 ? (
                        selectedOffer.messages_history.map((msg, i) => {
                          const isDriver = msg.sender === 'MOTORISTA'
                          const isChicao = msg.sender === 'CHICAO'
                          return (
                            <div
                              key={msg.id || i}
                              className={`flex flex-col ${isDriver ? 'items-start' : 'items-end'}`}
                            >
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                                <span className="font-bold text-slate-600">
                                  {isDriver
                                    ? selectedOffer.driver_name
                                    : isChicao
                                      ? 'Chicão (IA)'
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
                                className={`p-2 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                                  isDriver
                                    ? 'bg-white border border-slate-200 text-slate-800'
                                    : isChicao
                                      ? 'bg-sky-100 border border-sky-300 text-sky-900'
                                      : 'bg-amber-100 border border-amber-300 text-amber-950'
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          Nenhuma mensagem registrada.
                        </div>
                      )}
                    </div>

                    {/* Simulação de Resposta para Teste Rápido */}
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
                      <Input
                        value={testReplyText}
                        onChange={(e) => setTestReplyText(e.target.value)}
                        placeholder="Simular resposta do motorista (ex: SIM, Não, R$ 3200)..."
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendTestReply}
                        disabled={actionLoading || !testReplyText.trim()}
                        className="h-7 px-2 bg-[#005596] text-white text-xs shrink-0"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Timeline Completa Persistida */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col h-80">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-[#005596]" />
                        <span>Timeline Auditada da Negociação</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {selectedOffer.timeline_json?.length || 0} eventos
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 p-2">
                      {selectedOffer.timeline_json && selectedOffer.timeline_json.length > 0 ? (
                        selectedOffer.timeline_json.map((evt, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-[#005596] mt-1 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-bold text-slate-700">
                                  {evt.actor} • {evt.action}
                                </span>
                                <span>
                                  {new Date(evt.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-0.5 text-[11px]">{evt.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          Nenhum evento registrado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  {selectedOffer.sap_transport_number ? (
                    <span className="font-bold text-purple-700">
                      SAP Transporte Gerado: {selectedOffer.sap_transport_number}
                    </span>
                  ) : (
                    <span>Aguardando conclusão para envio ao SAP</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModalOpen(false)}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. MODAL ASSUMIR CONVERSA (TAKEOVER) */}
      <Dialog open={takeoverModalOpen} onOpenChange={setTakeoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" /> Assumir Conversa na Mesa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ao assumir o atendimento, o Chicão será pausado para esta oferta. Toda a negociação
              será conduzida manualmente por você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo da Intervenção Humana:
              </label>
              <Textarea
                value={takeoverReason}
                onChange={(e) => setTakeoverReason(e.target.value)}
                placeholder="Ex: Motorista solicitou ajuste especial de rota / negociação fora do padrão..."
                className="text-xs"
                rows={3}
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
              onClick={() => handleToggleTakeover('TAKE')}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Confirmar e Assumir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL APROVAR OU REJEITAR CONTRAPROPOSTA (AGUARDANDO_APROVACAO) */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" /> Decisão de Alçada da Mesa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A contraproposta do motorista ultrapassou a autonomia automática do Chicão. Registre
              sua aprovação ou recusa.
            </DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>Frete Proposto Original:</span>
                  <strong className="font-mono">
                    {formatCurrency(selectedOffer.initial_offer_value)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Contraproposta Solicitada:</span>
                  <strong className="font-mono text-amber-700">
                    {formatCurrency(selectedOffer.counter_value_requested || 0)}
                  </strong>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Teto Máximo do Chicão (+3%):</span>
                  <strong className="font-mono">
                    {formatCurrency(selectedOffer.max_autonomy_value || 0)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Decisão da Gestão:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={approvalDecision === 'APPROVE' ? 'default' : 'outline'}
                    onClick={() => setApprovalDecision('APPROVE')}
                    className={
                      approvalDecision === 'APPROVE'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                        : ''
                    }
                  >
                    Aprovar Frete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={approvalDecision === 'REJECT' ? 'default' : 'outline'}
                    onClick={() => setApprovalDecision('REJECT')}
                    className={
                      approvalDecision === 'REJECT'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                        : ''
                    }
                  >
                    Rejeitar e Liberar Carga
                  </Button>
                </div>
              </div>

              {approvalDecision === 'APPROVE' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Valor Final Aprovado (R$):
                  </label>
                  <Input
                    type="number"
                    value={approvedCustomValue}
                    onChange={(e) => setApprovedCustomValue(Number(e.target.value))}
                    className="h-8 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ao aprovar, a oferta muda para status ACEITA e a carga é bloqueada contra
                    duplicidade.
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApproveOrReject}
              disabled={actionLoading}
              className={
                approvalDecision === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
              }
            >
              Confirmar Decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ChicaoFreightMesaView
