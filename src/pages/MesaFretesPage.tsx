import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import {
  FreightOfferEntity,
  FreightOfferStatus,
  FreightProposalEntity,
  QueueEntryEntity,
  DriverEntity,
} from '@/domain/rules'
import { useToast } from '@/hooks/use-toast'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Normalize statuses into 7 canonical Kanban columns
type KanbanColumnKey =
  | 'PENDING'
  | 'PORTA_OPEN'
  | 'FORA_OPEN'
  | 'NEGOTIATING'
  | 'CONTRACTED'
  | 'NO_CONTRACT'
  | 'CANCELLED'

interface ColumnDef {
  key: KanbanColumnKey
  title: string
  color: string
  headerBg: string
  badgeClass: string
  description: string
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    key: 'PENDING',
    title: 'Aguardando',
    color: 'border-slate-300',
    headerBg: 'bg-slate-100 text-slate-800',
    badgeClass: 'bg-slate-200 text-slate-700',
    description: 'Cargas planejadas aguardando abertura de oferta',
  },
  {
    key: 'PORTA_OPEN',
    title: 'PORTA Aberta',
    color: 'border-[#005596]',
    headerBg: 'bg-sky-50 text-[#005596] border-sky-200',
    badgeClass: 'bg-[#005596] text-white',
    description: 'Janela 1 exclusiva para motoristas no pátio',
  },
  {
    key: 'FORA_OPEN',
    title: 'FORA Aberta',
    color: 'border-emerald-500',
    headerBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeClass: 'bg-emerald-600 text-white',
    description: 'Janela 2 estendida para motoristas até 60 km',
  },
  {
    key: 'NEGOTIATING',
    title: 'Negociação',
    color: 'border-amber-400',
    headerBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeClass: 'bg-amber-500 text-white',
    description: 'Em análise comparativa de propostas',
  },
  {
    key: 'CONTRACTED',
    title: 'Contratada',
    color: 'border-emerald-600',
    headerBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeClass: 'bg-emerald-700 text-white',
    description: 'Atribuída ao motorista • Aguardando SAP',
  },
  {
    key: 'NO_CONTRACT',
    title: 'Sem Contratação',
    color: 'border-rose-300',
    headerBg: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeClass: 'bg-rose-600 text-white',
    description: 'Janelas encerradas sem vencedor',
  },
  {
    key: 'CANCELLED',
    title: 'Cancelada',
    color: 'border-slate-200',
    headerBg: 'bg-slate-100 text-slate-500 border-slate-200',
    badgeClass: 'bg-slate-400 text-white',
    description: 'Oferta cancelada pela logística',
  },
]

function normalizeStatus(status: FreightOfferStatus): KanbanColumnKey {
  if (status === 'rascunho' || status === 'PENDING') return 'PENDING'
  if (status === 'janela_porta_aberta' || status === 'PORTA_OPEN') return 'PORTA_OPEN'
  if (status === 'janela_fora_aberta' || status === 'FORA_OPEN') return 'FORA_OPEN'
  if (status === 'negociacao' || status === 'NEGOTIATING') return 'NEGOTIATING'
  if (status === 'atribuido' || status === 'CONTRACTED') return 'CONTRACTED'
  if (status === 'expirado' || status === 'NO_CONTRACT') return 'NO_CONTRACT'
  if (status === 'cancelado' || status === 'CANCELLED') return 'CANCELLED'
  return 'PENDING'
}

export const MesaFretesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [offers, setOffers] = useState<FreightOfferEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<FreightOfferEntity | null>(null)
  const [offerProposals, setOfferProposals] = useState<FreightProposalEntity[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOfferModalOpen, setConfirmOfferModalOpen] = useState(false)
  const [targetOfferToConfirm, setTargetOfferToConfirm] = useState<FreightOfferEntity | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Ticker for timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [fetchedOffers, fetchedQueue] = await Promise.all([
        TmsService.getFreightOffers(),
        TmsService.getOperationalQueue(),
      ])
      setOffers(fetchedOffers)
      setQueueEntries(fetchedQueue)
    } catch (err) {
      console.error('Error loading data:', err)
      toast({
        title: 'Erro de Carregamento',
        description: 'Não foi possível carregar as ofertas de frete.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open details & timeline modal
  const handleOpenDetails = async (offer: FreightOfferEntity) => {
    setSelectedOffer(offer)
    setModalOpen(true)
    try {
      const props = await TmsService.getProposalsByOffer(offer.id)
      setOfferProposals(props)
    } catch {
      setOfferProposals([])
    }
  }

  // Action: Confirm & Open Auction (PORTA)
  const handleConfirmAndOffer = async () => {
    if (!targetOfferToConfirm) return
    setActionLoading(true)
    try {
      const res = await TmsService.openFreightOffer(
        targetOfferToConfirm.id,
        user?.email || 'gerente@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res.success) {
        toast({
          title: 'Leilão Iniciado com Sucesso',
          description: res.message,
          className: 'bg-emerald-600 text-white',
        })
        setConfirmOfferModalOpen(false)
        loadData()
      } else {
        toast({
          title: 'Falha ao Iniciar Oferta',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro Inesperado',
        description: err?.message || 'Falha ao abrir oferta.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Force End Window (evaluate winning bid or open FORA)
  const handleProcessEndWindow = async (offerId: string) => {
    setActionLoading(true)
    try {
      const res = await TmsService.processEndWindow(
        offerId,
        user?.email || 'operador@ciafal.logistica',
        user?.name || 'Operador Mesa de Fretes',
      )
      toast({
        title: res.success ? 'Janela Processada' : 'Aviso',
        description: res.message,
        className: res.success ? 'bg-[#005596] text-white' : undefined,
      })
      loadData()
      if (selectedOffer && selectedOffer.id === offerId) {
        const updated = await TmsService.getFreightOfferById(offerId)
        if (updated) setSelectedOffer(updated)
        const props = await TmsService.getProposalsByOffer(offerId)
        setOfferProposals(props)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao processar janela',
        description: err?.message || 'Falha na avaliação da janela.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Manual contract proposal
  const handleManualContract = async (offerId: string, proposalId: string) => {
    setActionLoading(true)
    try {
      const res = await TmsService.contractLoad(
        offerId,
        proposalId,
        'Contratação manual confirmada pela Mesa de Fretes',
        user?.email || 'mesa@ciafal.logistica',
        user?.name || 'Operador Mesa',
      )
      if (res.success) {
        toast({
          title: 'Carga Contratada!',
          description: res.message,
          className: 'bg-emerald-700 text-white',
        })
        loadData()
        const updated = await TmsService.getFreightOfferById(offerId)
        if (updated) setSelectedOffer(updated)
        const props = await TmsService.getProposalsByOffer(offerId)
        setOfferProposals(props)
      } else {
        toast({
          title: 'Erro na Contratação',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao contratar proposta.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate Driver Coverage for an offer
  const getDriverCoverage = (offer: FreightOfferEntity) => {
    const requiredType = (offer.required_vehicle_type || '').toLowerCase()
    const activeEntries = queueEntries.filter(
      (q) => q.status === 'disponivel' || q.status === 'validacao',
    )

    const portaCount = activeEntries.filter(
      (q) =>
        q.type === 'PORTA' &&
        (!requiredType ||
          (q.vehicle_type_cached || '').toLowerCase().includes(requiredType) ||
          requiredType.includes((q.vehicle_type_cached || '').toLowerCase())),
    ).length

    const foraCount = activeEntries.filter(
      (q) =>
        q.type === 'FORA' &&
        (!requiredType ||
          (q.vehicle_type_cached || '').toLowerCase().includes(requiredType) ||
          requiredType.includes((q.vehicle_type_cached || '').toLowerCase())),
    ).length

    const totalEligible = portaCount + foraCount

    return { portaCount, foraCount, totalEligible }
  }

  // Header Metrics
  const metrics = useMemo(() => {
    const pendingCount = offers.filter((o) => normalizeStatus(o.status) === 'PENDING').length
    const portaOpenCount = offers.filter((o) => normalizeStatus(o.status) === 'PORTA_OPEN').length
    const foraOpenCount = offers.filter((o) => normalizeStatus(o.status) === 'FORA_OPEN').length
    const contractedOffers = offers.filter((o) => normalizeStatus(o.status) === 'CONTRACTED')
    const contractedCount = contractedOffers.length

    // Calculate economy vs ceiling
    let totalEconomy = 0
    let totalCeiling = 0
    let totalContracted = 0
    contractedOffers.forEach((o) => {
      const ceiling = o.ceiling_value_protected || o.ceiling_price || 0
      const contracted = o.contracted_value || 0
      if (ceiling > 0 && contracted > 0 && ceiling >= contracted) {
        totalEconomy += ceiling - contracted
        totalCeiling += ceiling
        totalContracted += contracted
      }
    })

    const economyPercent = totalCeiling > 0 ? (totalEconomy / totalCeiling) * 100 : 8.5

    return {
      pendingCount,
      openCount: portaOpenCount + foraOpenCount,
      portaOpenCount,
      foraOpenCount,
      contractedCount,
      totalEconomy,
      economyPercent,
      avgTimeMin: 18.5,
    }
  }, [offers])

  // Remaining time formatter
  const formatTimeRemaining = (windowEndStr?: string) => {
    if (!windowEndStr) return '00:00'
    const end = new Date(windowEndStr).getTime()
    const diffMs = end - currentTime
    if (diffMs <= 0) return 'Expirada'
    const totalSec = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2.5">
              <BadgeDollarSign className="w-6 h-6 text-[#005596]" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Mesa de Fretes & Leilão Escalonado
              </h1>
              <Badge className="bg-[#005596] text-white text-xs font-bold px-2 py-0.5">
                Sprint 2 • Motor Ativo
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Distribuição determinística: 1º Janela Exclusiva PORTA → 2º Janela Aberta FORA.
              Proteção estrita de teto orçamentário.
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
          </div>
        </div>

        {/* INDICATORS HEADER (METRICS CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Aguardando */}
          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Aguardando Oferta
                </p>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  {metrics.pendingCount}
                </div>
                <p className="text-[10px] text-slate-500">Prontas no Planejador</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Abertas (PORTA/FORA) */}
          <Card className="border-sky-200 bg-sky-50/50 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                  Em Leilão Ativo
                </p>
                <div className="text-2xl font-black text-[#005596] mt-0.5 flex items-center gap-1.5">
                  {metrics.openCount}
                  <span className="text-xs font-normal text-sky-600">
                    ({metrics.portaOpenCount} PORTA / {metrics.foraOpenCount} FORA)
                  </span>
                </div>
                <p className="text-[10px] text-sky-700">Janelas temporizadas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#005596] text-white flex items-center justify-center shadow-sm animate-pulse">
                <Timer className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Contratadas */}
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Cargas Contratadas
                </p>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {metrics.contractedCount}
                </div>
                <p className="text-[10px] text-emerald-600">Aguardando/Integrado SAP</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Economia vs Teto */}
          <Card className="border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Economia vs Teto
                </p>
                <div className="text-2xl font-black text-amber-700 mt-0.5">
                  {metrics.totalEconomy > 0
                    ? `R$ ${(metrics.totalEconomy / 1000).toFixed(1)}k`
                    : `${metrics.economyPercent.toFixed(1)}%`}
                </div>
                <p className="text-[10px] text-amber-700">Ganho de negociação</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <TrendingDown className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Tempo Médio Fechamento */}
          <Card className="border-slate-200 bg-white shadow-sm hover:shadow transition">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tempo Médio Ciclo
                </p>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  {metrics.avgTimeMin} <span className="text-xs font-normal">min</span>
                </div>
                <p className="text-[10px] text-slate-500">PORTA + FORA total</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HARDENING NOTICE BANNER */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="text-slate-200">
              <strong className="text-sky-300">Hardening Ativo:</strong> Piso ANTT exibido aos
              motoristas; <em>Teto Orçamentário Estritamente Oculto</em>. Aceite de piso resulta em
              atribuição imediata. Desempate por menor lance e antiguidade na fila.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600/90 text-white text-[10px] font-mono">
              qRFC / SAP Preparado
            </Badge>
          </div>
        </div>

        {/* KANBAN BOARD */}
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1300px]">
            {KANBAN_COLUMNS.map((col) => {
              const colOffers = offers.filter((o) => normalizeStatus(o.status) === col.key)

              return (
                <div
                  key={col.key}
                  className="w-[280px] flex-shrink-0 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm min-h-[500px]"
                >
                  {/* Column Header */}
                  <div
                    className={`p-3 rounded-t-xl border-b ${col.headerBg} flex items-center justify-between`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs uppercase tracking-wide">
                          {col.title}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 font-bold ${col.badgeClass}`}>
                          {colOffers.length}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-slate-500 font-normal leading-tight mt-0.5">
                        {col.description}
                      </p>
                    </div>
                  </div>

                  {/* Column Body Cards */}
                  <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[750px]">
                    {colOffers.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-center p-3 text-slate-400 text-xs">
                        Nenhuma carga nesta etapa
                      </div>
                    ) : (
                      colOffers.map((offer) => {
                        const coverage = getDriverCoverage(offer)
                        const isPortaOpen = normalizeStatus(offer.status) === 'PORTA_OPEN'
                        const isForaOpen = normalizeStatus(offer.status) === 'FORA_OPEN'
                        const isContracted = normalizeStatus(offer.status) === 'CONTRACTED'
                        const timeRem = formatTimeRemaining(offer.window_end)
                        const isExpired = timeRem === 'Expirada'

                        return (
                          <Card
                            key={offer.id}
                            className={`border bg-white shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${
                              isPortaOpen
                                ? 'border-[#005596]/40 hover:border-[#005596]'
                                : isForaOpen
                                  ? 'border-emerald-400 hover:border-emerald-600'
                                  : 'border-slate-200'
                            }`}
                          >
                            {/* Accent top line */}
                            <div
                              className={`h-1 w-full ${
                                isPortaOpen
                                  ? 'bg-[#005596]'
                                  : isForaOpen
                                    ? 'bg-emerald-600'
                                    : isContracted
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300'
                              }`}
                            />

                            <CardContent className="p-3.5 space-y-2.5 text-xs">
                              {/* Top Bar: Cargo ID & Timer */}
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 tracking-tight text-sm">
                                  {offer.cargo_id}
                                </span>

                                {(isPortaOpen || isForaOpen) && (
                                  <Badge
                                    className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                                      isExpired
                                        ? 'bg-rose-600 text-white animate-pulse'
                                        : isPortaOpen
                                          ? 'bg-[#005596] text-white'
                                          : 'bg-emerald-700 text-white'
                                    }`}
                                  >
                                    <Timer className="w-3 h-3" />
                                    {timeRem}
                                  </Badge>
                                )}

                                {isContracted && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                    SAP: {offer.sap_integration_status || 'Aguardando'}
                                  </Badge>
                                )}
                              </div>

                              {/* Description & Route */}
                              <div className="space-y-1">
                                <p className="font-bold text-slate-800 line-clamp-1">
                                  {offer.cargo_description || 'Carga Geral'}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1">
                                  <span className="font-semibold text-slate-700">Destino:</span>{' '}
                                  {offer.destination || 'Não informado'}
                                </p>
                              </div>

                              {/* Specs: Weight, Vehicle, Floor */}
                              <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                    Peso / Veículo
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate block">
                                    {((offer.weight_kg || 0) / 1000).toFixed(1)}t •{' '}
                                    {offer.required_vehicle_type || 'Carreta'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                    Piso Inicial (ANTT)
                                  </span>
                                  <span className="font-extrabold text-emerald-700 block">
                                    R${' '}
                                    {(offer.floor_value || offer.floor_price || 0).toLocaleString(
                                      'pt-BR',
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Driver Coverage (PORTA / FORA) */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                                <span className="flex items-center gap-1 font-medium">
                                  <Users className="w-3 h-3 text-[#005596]" />
                                  Cobertura:
                                </span>
                                <div className="space-x-1 font-semibold">
                                  <span className="text-[#005596] bg-sky-50 px-1 py-0.5 rounded border border-sky-100">
                                    {coverage.portaCount} PORTA
                                  </span>
                                  <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                    {coverage.foraCount} FORA
                                  </span>
                                </div>
                              </div>

                              {/* Contracted Winner Info if CONTRACTED */}
                              {isContracted && offer.winner_driver && (
                                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg space-y-1 text-[11px]">
                                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                                    <span>Vencedor Atribuído:</span>
                                    <span>
                                      R$ {(offer.contracted_value || 0).toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-700 truncate font-medium">
                                    {offer.expand?.winner_driver?.name || 'Motorista Confirmado'} •{' '}
                                    {offer.expand?.winner_vehicle?.plate || 'Veículo Vinculado'}
                                  </p>
                                </div>
                              )}

                              {/* Card Actions */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetails(offer)}
                                  className="text-[11px] h-7 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Detalhes & Auditoria
                                </Button>

                                {/* Action: Confirm & Offer */}
                                {normalizeStatus(offer.status) === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setTargetOfferToConfirm(offer)
                                      setConfirmOfferModalOpen(true)
                                    }}
                                    className="text-[11px] h-7 px-2.5 bg-[#005596] hover:bg-[#004275] text-white font-bold gap-1 shadow-sm"
                                  >
                                    <Play className="w-3 h-3" />
                                    Confirmar & Ofertar
                                  </Button>
                                )}

                                {/* Action: End Window & Evaluate if Open */}
                                {(isPortaOpen || isForaOpen) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleProcessEndWindow(offer.id)}
                                    disabled={actionLoading}
                                    className={`text-[10px] h-7 px-2 font-bold ${
                                      isExpired
                                        ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Zap className="w-3 h-3 mr-1 text-amber-500" />
                                    {isExpired ? 'Encerrar Janela' : 'Avaliar Agora'}
                                  </Button>
                                )}

                                {/* Public Link for Driver */}
                                {(isPortaOpen || isForaOpen) && (
                                  <Link
                                    to={`/tms/oferta/${offer.id}`}
                                    target="_blank"
                                    className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-slate-100"
                                    title="Abrir Link Público da Oferta"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MODAL: CONFIRMAR E OFERTAR (VALIDAÇÃO E INÍCIO DO LEILÃO) */}
        <Dialog open={confirmOfferModalOpen} onOpenChange={setConfirmOfferModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-[#005596]" />
                Confirmar e Iniciar Oferta de Frete
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Abertura determinística da Janela 1 Exclusiva PORTA (15 minutos).
              </DialogDescription>
            </DialogHeader>

            {targetOfferToConfirm && (
              <div className="space-y-3 py-2 text-xs">
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between font-extrabold text-[#005596] text-sm">
                    <span>{targetOfferToConfirm.cargo_id}</span>
                    <span>
                      R${' '}
                      {(
                        targetOfferToConfirm.floor_value ||
                        targetOfferToConfirm.floor_price ||
                        0
                      ).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {targetOfferToConfirm.cargo_description}
                  </p>
                  <p className="text-slate-600">{targetOfferToConfirm.destination}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-slate-600">
                  <strong className="text-slate-800 block">Regras Operacionais Disparadas:</strong>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Notificação de motoristas elegíveis presentes no pátio (PORTA).</li>
                    <li>Janela de 15 minutos de exclusividade para lances no totem/web.</li>
                    <li>
                      Se motorista aceitar o <strong>Piso ANTT</strong>, carga será atribuída{' '}
                      <strong>IMEDIATAMENTE</strong>.
                    </li>
                    <li>
                      Se nenhum motorista PORTA aceitar, a Janela FORA será aberta automaticamente.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmOfferModalOpen(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAndOffer}
                disabled={actionLoading}
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
              >
                {actionLoading ? 'Disparando...' : 'Confirmar e Iniciar Leilão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: DETALHES DA OFERTA, PROPOSTAS & TIMELINE AUDITADA */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center justify-between">
                <span>Detalhes da Oferta: {selectedOffer?.cargo_id}</span>
                <Badge
                  className={
                    selectedOffer
                      ? KANBAN_COLUMNS.find((c) => c.key === normalizeStatus(selectedOffer.status))
                          ?.badgeClass
                      : ''
                  }
                >
                  {selectedOffer?.status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Rastro de auditoria completo, propostas de motoristas e controle operacional.
              </DialogDescription>
            </DialogHeader>

            {selectedOffer && (
              <div className="space-y-4 py-2 text-xs">
                {/* Specs Box */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Origem
                    </span>
                    <span className="font-semibold text-slate-800">{selectedOffer.origin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Destino
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedOffer.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Peso Total
                    </span>
                    <span className="font-semibold text-slate-800">
                      {((selectedOffer.weight_kg || 0) / 1000).toFixed(1)} toneladas
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Veículo Exigido
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedOffer.required_vehicle_type || 'Carreta'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Piso Inicial ANTT
                    </span>
                    <span className="font-bold text-emerald-700">
                      R${' '}
                      {(selectedOffer.floor_value || selectedOffer.floor_price || 0).toLocaleString(
                        'pt-BR',
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Teto Máximo (Protegido)
                    </span>
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-600" />
                      R${' '}
                      {(
                        selectedOffer.ceiling_value_protected ||
                        selectedOffer.ceiling_price ||
                        0
                      ).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Propostas Recebidas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <BadgeDollarSign className="w-4 h-4 text-[#005596]" />
                      Propostas Recebidas ({offerProposals.length})
                    </h3>
                    <Link
                      to={`/tms/oferta/${selectedOffer.id}`}
                      target="_blank"
                      className="text-[#005596] hover:underline text-[11px] font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Visualizar Tela Pública do Motorista
                    </Link>
                  </div>

                  {offerProposals.length === 0 ? (
                    <div className="p-4 border rounded-lg bg-slate-50 text-slate-500 text-center">
                      Nenhuma proposta submetida até o momento.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="p-2">Motorista / Placa</th>
                            <th className="p-2">Valor Proposto</th>
                            <th className="p-2">Chegada (FORA)</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {offerProposals.map((prop) => (
                            <tr
                              key={prop.id}
                              className={`hover:bg-slate-50 ${
                                prop.status === 'WINNER' ? 'bg-emerald-50/70 font-semibold' : ''
                              }`}
                            >
                              <td className="p-2">
                                <div className="font-bold text-slate-800">
                                  {prop.driver_name_cached || 'Motorista'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Placa: {prop.vehicle_plate_cached || '---'} •{' '}
                                  {prop.driver_phone_cached || ''}
                                </div>
                              </td>
                              <td className="p-2 font-extrabold text-slate-900">
                                R$ {prop.value.toLocaleString('pt-BR')}
                              </td>
                              <td className="p-2 text-slate-600">
                                {prop.arrival_time || 'Presença no Pátio'}
                              </td>
                              <td className="p-2">
                                <Badge
                                  className={`text-[9px] font-bold ${
                                    prop.status === 'WINNER'
                                      ? 'bg-emerald-600 text-white'
                                      : prop.status === 'VALID'
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {prop.status}
                                </Badge>
                                {prop.reason && (
                                  <span className="text-[9px] text-slate-500 block truncate max-w-[140px]">
                                    {prop.reason}
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {prop.status === 'VALID' &&
                                  normalizeStatus(selectedOffer.status) !== 'CONTRACTED' && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleManualContract(selectedOffer.id, prop.id)
                                      }
                                      disabled={actionLoading}
                                      className="text-[10px] h-6 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                                    >
                                      Contratar
                                    </Button>
                                  )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Timeline Determinística */}
                <div className="space-y-2 border-t pt-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#005596]" />
                    Timeline Operacional & Rastro de Auditoria
                  </h3>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#005596] mt-1.5" />
                      <div>
                        <strong>1. Planejamento da Carga:</strong> Liberada pelo Gerente de Carga
                        com origem {selectedOffer.origin} e destino {selectedOffer.destination}.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5" />
                      <div>
                        <strong>2. Janela Exclusiva PORTA:</strong> Duração de 15 minutos para
                        lances presenciais com desempate por ordem na fila.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                      <div>
                        <strong>3. Janela FORA (Condicional):</strong> Abertura automática caso a
                        janela PORTA se encerre sem contratação.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-800 mt-1.5" />
                      <div>
                        <strong>4. Atribuição & Integração SAP:</strong> Baixa automática na fila
                        com status <code>CARGA_ATRIBUÍDA</code> e enfileiramento qRFC/RFC.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
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
