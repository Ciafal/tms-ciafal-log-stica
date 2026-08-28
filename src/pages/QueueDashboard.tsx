import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { TmsService } from '@/services/tmsService'
import {
  QueueEntryEntity,
  QueueStatus,
  PreRegistrationEntity,
  AuditLogEntity,
  maskDocument,
  maskPhone,
  formatDocument,
  formatPhone,
  avaliar_elegibilidade_motorista_oferta,
} from '@/domain/rules'
import {
  Users,
  Building,
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  Truck,
  Phone,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  MoreVertical,
  History,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpDown,
  Send,
  MessageSquare,
  Radio,
  UserX,
  Sparkles,
  ArrowRight,
  Info,
  Timer,
  BadgeAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export const QueueDashboard: React.FC = () => {
  const { user, role, permissions } = useAuth()
  const { toast } = useToast()

  const [queue, setQueue] = useState<QueueEntryEntity[]>([])
  const [preRegistrations, setPreRegistrations] = useState<PreRegistrationEntity[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGroup, setFilterGroup] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterVehicleType, setFilterVehicleType] = useState<string>('todos')
  const [filterChannel, setFilterChannel] = useState<string>('todos')

  // Action Modal State
  const [selectedEntry, setSelectedEntry] = useState<QueueEntryEntity | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<QueueStatus>('disponivel')
  const [actionReason, setActionReason] = useState('')
  const [operatorNotes, setOperatorNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detail Modal / Drawer State
  const [detailEntry, setDetailEntry] = useState<QueueEntryEntity | null>(null)
  const [detailLogs, setDetailLogs] = useState<AuditLogEntity[]>([])
  const [eligibilityTestGroup, setEligibilityTestGroup] = useState<'PORTA' | 'FORA'>('PORTA')

  // Load Queue Data
  const loadQueue = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const [data, preData, logsData] = await Promise.all([
        TmsService.getOperationalQueue(),
        TmsService.getPreRegistrations(),
        TmsService.getAuditLogs(150),
      ])
      setQueue(data)
      setPreRegistrations(preData)
      setAuditLogs(logsData)
      setLastSyncTime(new Date())
      if (silent) {
        setRealtimeNotice('Fila atualizada em tempo real')
        setTimeout(() => setRealtimeNotice(null), 3500)
      }
    } catch (err) {
      console.error('Error loading queue:', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  // Subscribe to realtime updates without flickering or clearing filters
  useRealtime('queue_entries', () => {
    loadQueue(true)
  })
  useRealtime('pre_registrations', () => {
    loadQueue(true)
  })

  // Controlled polling fallback every 20s
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue(true)
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  // KPI Calculations for Executive Header
  const kpis = useMemo(() => {
    const porta = queue.filter((e) => e.type === 'PORTA' && e.status !== 'removido')
    const fora = queue.filter((e) => e.type === 'FORA' && e.status !== 'removido')

    const portaAptos = porta.filter((e) => e.status === 'disponivel')
    const foraAptos = fora.filter((e) => e.status === 'disponivel')
    const totalAptos = queue.filter((e) => e.status === 'disponivel')

    const prePendentes = preRegistrations.filter(
      (p) => p.status === 'novo' || p.status === 'em_analise' || p.status === 'pendente',
    )
    const bloqueados = queue.filter((e) => e.status === 'bloqueado')
    const semCanal = queue.filter(
      (e) => !e.driver_whatsapp_cached || e.driver_whatsapp_cached.replace(/\D/g, '').length < 10,
    )

    // Communication coverage
    const portaComCanal = portaAptos.filter(
      (e) => !!e.driver_whatsapp_cached && e.driver_whatsapp_cached.replace(/\D/g, '').length >= 10,
    ).length
    const foraComCanal = foraAptos.filter(
      (e) => !!e.driver_whatsapp_cached && e.driver_whatsapp_cached.replace(/\D/g, '').length >= 10,
    ).length

    // Today's movements
    const today = new Date().toISOString().split('T')[0]
    const entriesToday = queue.filter((e) => e.entry_time && e.entry_time.startsWith(today)).length
    const exitsToday = queue.filter((e) => e.exit_time && e.exit_time.startsWith(today)).length

    // Average duration in minutes
    let totalMinutes = 0
    let countActive = 0
    let longestWaitDriver: { name: string; minutes: number; group: string } | null = null

    const now = new Date().getTime()
    queue
      .filter((e) => e.status !== 'removido' && e.entry_time)
      .forEach((e) => {
        const entryTs = new Date(e.entry_time).getTime()
        const diffMin = Math.max(0, Math.floor((now - entryTs) / (1000 * 60)))
        totalMinutes += diffMin
        countActive++

        if (!longestWaitDriver || diffMin > longestWaitDriver.minutes) {
          longestWaitDriver = {
            name: e.driver_name_cached || 'Motorista',
            minutes: diffMin,
            group: e.type,
          }
        }
      })

    const avgMinutes = countActive > 0 ? Math.round(totalMinutes / countActive) : 0
    const avgHours = Math.floor(avgMinutes / 60)
    const avgMinsRemainder = avgMinutes % 60
    const avgFormatted =
      avgHours > 0 ? `${avgHours}h ${avgMinsRemainder}m` : `${avgMinsRemainder} min`

    return {
      portaDisponiveis: portaAptos.length,
      foraDisponiveis: foraAptos.length,
      totalAptos: totalAptos.length,
      preCadastros: prePendentes.length,
      bloqueados: bloqueados.length,
      semCanal: semCanal.length,
      entriesToday: entriesToday || porta.length + fora.length,
      exitsToday,
      tempoMedioPermanencia: avgFormatted,
      longestWait: longestWaitDriver
        ? `${longestWaitDriver.name} (${Math.floor(longestWaitDriver.minutes / 60)}h ${longestWaitDriver.minutes % 60}m - ${longestWaitDriver.group})`
        : 'Nenhum motorista',
      portaCoverage: `${portaComCanal} de ${portaAptos.length}`,
      foraCoverage: `${foraComCanal} de ${foraAptos.length}`,
      totalReach: portaComCanal + foraComCanal,
      totalAptosCount: totalAptos.length,
    }
  }, [queue, preRegistrations])

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // Group filter
      if (filterGroup !== 'todos' && item.type !== filterGroup) return false

      // Status filter
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false

      // Vehicle type filter
      if (filterVehicleType !== 'todos' && item.vehicle_type_cached !== filterVehicleType) {
        return false
      }

      // Channel filter
      if (filterChannel === 'com_canal') {
        if (
          !item.driver_whatsapp_cached ||
          item.driver_whatsapp_cached.replace(/\D/g, '').length < 10
        )
          return false
      } else if (filterChannel === 'sem_canal') {
        if (
          item.driver_whatsapp_cached &&
          item.driver_whatsapp_cached.replace(/\D/g, '').length >= 10
        )
          return false
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const name = (item.driver_name_cached || '').toLowerCase()
        const doc = (item.driver_doc_cached || '').toLowerCase()
        const phone = (item.driver_whatsapp_cached || '').toLowerCase()
        const plate = (item.vehicle_plate_cached || '').toLowerCase()
        const vType = (item.vehicle_type_cached || '').toLowerCase()

        return (
          name.includes(term) ||
          doc.includes(term) ||
          phone.includes(term) ||
          plate.includes(term) ||
          vType.includes(term)
        )
      }

      return true
    })
  }, [queue, filterGroup, filterStatus, filterVehicleType, filterChannel, searchTerm])

  // Split into PORTA and FORA lists (STRICTLY SEPARATED)
  const portaList = useMemo(() => filteredQueue.filter((e) => e.type === 'PORTA'), [filteredQueue])
  const foraList = useMemo(() => filteredQueue.filter((e) => e.type === 'FORA'), [filteredQueue])

  // Unique vehicle types for filter dropdown
  const vehicleTypesAvailable = useMemo(() => {
    const set = new Set<string>()
    queue.forEach((q) => {
      if (q.vehicle_type_cached) set.add(q.vehicle_type_cached)
    })
    return Array.from(set)
  }, [queue])

  // Time in queue formatter
  const formatTimeInQueue = (entryTimeStr: string) => {
    if (!entryTimeStr) return '---'
    const entry = new Date(entryTimeStr)
    const now = new Date()
    const diffMs = now.getTime() - entry.getTime()
    if (diffMs < 0) return 'Agora'

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`
    }
    return `${diffMins} min`
  }

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'disponivel':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            Disponível / Apto
          </Badge>
        )
      case 'validacao':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">
            Em Validação
          </Badge>
        )
      case 'pendente':
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-medium">
            Pendente Doc
          </Badge>
        )
      case 'selecionado':
        return (
          <Badge className="bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            Selecionado Carga
          </Badge>
        )
      case 'negociacao':
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
            Em Negociação
          </Badge>
        )
      case 'atribuido':
        return (
          <Badge className="bg-blue-800 hover:bg-blue-900 text-white font-semibold">
            Carga Atribuída
          </Badge>
        )
      case 'removido':
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-300">
            Removido
          </Badge>
        )
      case 'bloqueado':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Bloqueado</Badge>
        )
      case 'indisponivel':
        return (
          <Badge variant="secondary" className="text-slate-700">
            Indisponível
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleOpenActionModal = (entry: QueueEntryEntity) => {
    setSelectedEntry(entry)
    setNewStatus(entry.status)
    setActionReason('')
    setOperatorNotes('')
    setIsActionModalOpen(true)
  }

  const handleSaveAction = async () => {
    if (!selectedEntry) return

    if (!actionReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description:
          'Toda alteração de estado na fila exige o preenchimento do motivo para fins de auditoria.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await TmsService.updateQueueStatus(
        selectedEntry.id,
        newStatus,
        actionReason,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador Logística',
        operatorNotes,
      )

      if (ok) {
        toast({
          title: 'Status atualizado com sucesso',
          description: `Motorista ${selectedEntry.driver_name_cached} alterado para ${newStatus.toUpperCase()}. Trilha auditada.`,
        })
        setIsActionModalOpen(false)
        loadQueue(true)
      } else {
        toast({
          title: 'Falha na atualização',
          description: 'Não foi possível atualizar o registro.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de processamento',
        description: err?.message || 'Erro ao registrar auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDetail = (entry: QueueEntryEntity) => {
    setDetailEntry(entry)
    setEligibilityTestGroup(entry.type)
    const logs = auditLogs.filter(
      (l) =>
        l.resource_id === entry.id ||
        (l.payload as any)?.driver_id === entry.driver ||
        (l.payload as any)?.doc === entry.driver_doc_cached,
    )
    setDetailLogs(logs)
  }

  // Evaluate eligibility for detail drawer
  const detailEligibility = useMemo(() => {
    if (!detailEntry) return null
    return avaliar_elegibilidade_motorista_oferta({
      driver: detailEntry.expand?.driver || {
        id: detailEntry.driver,
        name: detailEntry.driver_name_cached || '',
        document: detailEntry.driver_doc_cached || '',
        whatsapp: detailEntry.driver_whatsapp_cached || '',
        status: detailEntry.status === 'bloqueado' ? 'bloqueado' : 'ativo',
      },
      queueEntry: detailEntry,
      offerStageGroup: eligibilityTestGroup,
      requiredVehicleType: detailEntry.vehicle_type_cached,
    })
  }, [detailEntry, eligibilityTestGroup])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CABEÇALHO EXECUTIVO DEFINITIVO DA FILA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Painel Operacional Definitivo da Fila
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold">
              SPRINT 1.1 • Homologação
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Painéis separados:{' '}
            <strong className="text-[#005596]">PORTA (Presentes na CIAFAL)</strong> e{' '}
            <strong className="text-emerald-700">FORA (Disponíveis até 60 km)</strong>. Ordem
            temporal e prioridade estrita (1º PORTA, 2º FORA).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {realtimeNotice && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-fade-in flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
              {realtimeNotice}
            </span>
          )}

          <div className="text-right hidden sm:block text-[11px] text-slate-400">
            Última sincronização: {lastSyncTime.toLocaleTimeString('pt-BR')}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQueue(false)}
            disabled={isLoading}
            className="text-xs text-slate-700 border-slate-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* CABEÇALHO EXECUTIVO: KPIS COMPLETOS DA FILA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* PORTA Disponíveis */}
        <Card className="border-sky-200 bg-sky-50/60 shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-sky-900 uppercase tracking-wide">
              PORTA Disponíveis
            </div>
            <div className="text-2xl font-black text-[#005596] mt-1">{kpis.portaDisponiveis}</div>
            <div className="text-[10px] text-sky-700 mt-0.5 font-medium">1º Prioridade</div>
          </CardContent>
        </Card>

        {/* FORA Disponíveis */}
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">
              FORA Disponíveis
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{kpis.foraDisponiveis}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">2º Prioridade</div>
          </CardContent>
        </Card>

        {/* Total Aptos */}
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Total Aptos
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalAptos}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Prontos p/ oferta</div>
          </CardContent>
        </Card>

        {/* Pré-Cadastros */}
        <Card className="border-amber-200 bg-amber-50/60 shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">
              Pré-cadastros
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{kpis.preCadastros}</div>
            <div className="text-[10px] text-amber-700 mt-0.5 font-medium">Sem oferta</div>
          </CardContent>
        </Card>

        {/* Bloqueados */}
        <Card className="border-rose-200 bg-rose-50/60 shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wide">
              Bloqueados
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{kpis.bloqueados}</div>
            <div className="text-[10px] text-rose-700 mt-0.5 font-medium">Administrativo</div>
          </CardContent>
        </Card>

        {/* Sem Canal */}
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Sem Canal
            </div>
            <div className="text-2xl font-black text-slate-700 mt-1">{kpis.semCanal}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sem WhatsApp</div>
          </CardContent>
        </Card>

        {/* Entradas Hoje */}
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Entradas Hoje
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1">{kpis.entriesToday}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Totem + FORA</div>
          </CardContent>
        </Card>

        {/* Saídas Hoje */}
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Saídas Hoje
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1">{kpis.exitsToday}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Cargas/Removidos</div>
          </CardContent>
        </Card>
      </div>

      {/* COBERTURA PARA OFERTAS & INDICADORES DE TEMPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        {/* Cobertura Mensageria */}
        <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="p-2 bg-sky-100 text-[#005596] rounded-lg">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Cobertura de Mensageria (Alcançáveis)
            </span>
            <div className="font-bold text-slate-900 mt-0.5">
              PORTA: <strong className="text-[#005596]">{kpis.portaCoverage}</strong> • FORA:{' '}
              <strong className="text-emerald-700">{kpis.foraCoverage}</strong>
            </div>
            <span className="text-[10px] text-slate-500">
              {kpis.totalReach} de {kpis.totalAptosCount} motoristas aptos possuem canal ativo
            </span>
          </div>
        </div>

        {/* Tempo Médio de Permanência */}
        <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Tempo Médio de Permanência
            </span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {kpis.tempoMedioPermanencia}
            </div>
            <span className="text-[10px] text-slate-500">Média calculada em tempo real</span>
          </div>
        </div>

        {/* Há Mais Tempo Disponível */}
        <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Mais Tempo Disponível
            </span>
            <div className="font-bold text-slate-900 truncate mt-0.5">{kpis.longestWait}</div>
            <span className="text-[10px] text-slate-500">Desempate temporal prioritário</span>
          </div>
        </div>
      </div>

      {/* BUSCA E FILTROS OPERACIONAIS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, placa, CPF/CNPJ ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          {/* Group Filter */}
          <div>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Grupos</SelectItem>
                <SelectItem value="PORTA">Apenas PORTA (Na Planta)</SelectItem>
                <SelectItem value="FORA">Apenas FORA (Raio 60km)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="disponivel">Disponível / Apto</SelectItem>
                <SelectItem value="validacao">Em Validação</SelectItem>
                <SelectItem value="pendente">Pendente de Doc</SelectItem>
                <SelectItem value="selecionado">Selecionado p/ Carga</SelectItem>
                <SelectItem value="negociacao">Em Negociação</SelectItem>
                <SelectItem value="atribuido">Carga Atribuída</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="indisponivel">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Communication Channel Filter */}
          <div>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer Canal</SelectItem>
                <SelectItem value="com_canal">Com WhatsApp Ativo</SelectItem>
                <SelectItem value="sem_canal">Sem Canal de Contato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm ||
          filterGroup !== 'todos' ||
          filterStatus !== 'todos' ||
          filterChannel !== 'todos') && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterGroup('todos')
                setFilterStatus('todos')
                setFilterChannel('todos')
              }}
              className="text-xs text-slate-500 h-7"
            >
              Limpar Filtros de Busca
            </Button>
          </div>
        )}
      </div>

      {/* PAINÉIS LADO A LADO: PORTA vs FORA (SEGREGAÇÃO OBRIGATÓRIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* PAINEL 1: PORTA — PRESENTES NA CIAFAL (PRIORIDADE 1) */}
        {/* ========================================================= */}
        <div className="flex flex-col space-y-3">
          <div className="bg-[#005596] text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                <Building className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base tracking-tight">PORTA — Na CIAFAL</h2>
                  <Badge className="bg-sky-400/30 text-white text-[10px] font-bold border-none uppercase">
                    1ª Prioridade de Oferta
                  </Badge>
                </div>
                <p className="text-xs text-sky-100/90">
                  Presença física confirmada no Totem da Portaria
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black">{portaList.length}</span>
              <span className="text-xs text-sky-200 block">veículos</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border-x border-b border-slate-200 rounded-b-xl p-3 min-h-[420px] space-y-3">
            {portaList.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum motorista no pátio físico (PORTA)
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Motoristas que realizarem check-in no totem da portaria aparecerão aqui
                  automaticamente.
                </p>
              </div>
            ) : (
              portaList.map((entry, idx) => {
                const hasChannel =
                  !!entry.driver_whatsapp_cached &&
                  entry.driver_whatsapp_cached.replace(/\D/g, '').length >= 10
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-sky-400 transition-all space-y-3"
                  >
                    {/* Header: Ordinal, Nome, Documento, WhatsApp & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-sky-100 text-[#005596] font-black text-xs flex-shrink-0 flex items-center justify-center">
                          {idx + 1}º
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {entry.driver_name_cached || 'Motorista Sem Nome'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                            <span>
                              Doc:{' '}
                              <strong className="font-mono text-slate-700">
                                {permissions.canViewFullSensitiveData
                                  ? formatDocument(entry.driver_doc_cached || '')
                                  : maskDocument(entry.driver_doc_cached || '')}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <strong className="font-mono text-slate-700">
                                {permissions.canViewFullSensitiveData
                                  ? formatPhone(entry.driver_whatsapp_cached || '')
                                  : maskPhone(entry.driver_whatsapp_cached || '')}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {!hasChannel && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-rose-300 text-rose-700 bg-rose-50"
                          >
                            Sem Canal
                          </Badge>
                        )}
                        {getStatusBadge(entry.status)}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-md text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Veículo / Placa
                        </span>
                        <div className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900 font-bold">
                            {entry.vehicle_plate_cached || 'SEM PLACA'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                          {entry.vehicle_type_cached || 'Carreta'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Tempo no PORTA
                        </span>
                        <div className="font-bold text-[#005596] flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          <span>{formatTimeInQueue(entry.entry_time)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Chegada:{' '}
                          {entry.entry_time
                            ? new Date(entry.entry_time).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Origem / IP
                        </span>
                        <div className="font-medium text-slate-700 flex items-center space-x-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Totem Portaria</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                          IP: {entry.ip_address || '127.0.0.1'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        <span className="font-semibold text-slate-600">Último evento: </span>
                        {entry.last_event || 'Entrada registrada'}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(entry)}
                          className="text-xs h-7 text-slate-600 hover:text-slate-900"
                        >
                          Ver Detalhes
                        </Button>

                        {permissions.canManageQueueStatus && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenActionModal(entry)}
                            className="text-xs h-7 bg-[#005596] hover:bg-[#004071] text-white font-medium"
                          >
                            Alterar Status
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAINEL 2: FORA — NA REGIÃO ATÉ 60 KM (PRIORIDADE 2) */}
        {/* ========================================================= */}
        <div className="flex flex-col space-y-3">
          <div className="bg-emerald-800 text-white p-3.5 rounded-t-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base tracking-tight">FORA — Na Região</h2>
                  <Badge className="bg-emerald-500/40 text-white text-[10px] font-bold border-none uppercase">
                    2ª Prioridade (Raio ≤ 60 km)
                  </Badge>
                </div>
                <p className="text-xs text-emerald-100/90">
                  Disponibilidade externa com geofencing verificado no backend
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black">{foraList.length}</span>
              <span className="text-xs text-emerald-200 block">veículos</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border-x border-b border-slate-200 rounded-b-xl p-3 min-h-[420px] space-y-3">
            {foraList.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum motorista externo no raio de 60 km
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Motoristas que confirmarem disponibilidade via link web/WhatsApp aparecerão aqui.
                </p>
              </div>
            ) : (
              foraList.map((entry, idx) => {
                const hasChannel =
                  !!entry.driver_whatsapp_cached &&
                  entry.driver_whatsapp_cached.replace(/\D/g, '').length >= 10
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-emerald-500 transition-all space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex-shrink-0 flex items-center justify-center">
                          {idx + 1}º
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {entry.driver_name_cached || 'Motorista Sem Nome'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                            <span>
                              Doc:{' '}
                              <strong className="font-mono text-slate-700">
                                {permissions.canViewFullSensitiveData
                                  ? formatDocument(entry.driver_doc_cached || '')
                                  : maskDocument(entry.driver_doc_cached || '')}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <strong className="font-mono text-slate-700">
                                {permissions.canViewFullSensitiveData
                                  ? formatPhone(entry.driver_whatsapp_cached || '')
                                  : maskPhone(entry.driver_whatsapp_cached || '')}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {!hasChannel && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-rose-300 text-rose-700 bg-rose-50"
                          >
                            Sem Canal
                          </Badge>
                        )}
                        {getStatusBadge(entry.status)}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-emerald-50/40 p-2.5 rounded-md text-xs border border-emerald-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Veículo / Placa
                        </span>
                        <div className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900 font-bold">
                            {entry.vehicle_plate_cached || 'SEM PLACA'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                          {entry.vehicle_type_cached || 'Carreta'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Distância da CIAFAL
                        </span>
                        <div className="font-bold text-emerald-700 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {entry.distance_km != null
                              ? `${entry.distance_km} km`
                              : 'Recalculando GPS'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          {entry.location_status === 'validada'
                            ? '✓ Geofence auditado'
                            : 'Em validação'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Tempo Disponível
                        </span>
                        <div className="font-medium text-slate-700 flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatTimeInQueue(entry.entry_time)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Check-in:{' '}
                          {entry.entry_time
                            ? new Date(entry.entry_time).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        <span className="font-semibold text-slate-600">Último evento: </span>
                        {entry.last_event || 'Disponibilidade externa ativa'}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(entry)}
                          className="text-xs h-7 text-slate-600 hover:text-slate-900"
                        >
                          Ver Detalhes
                        </Button>

                        {permissions.canManageQueueStatus && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenActionModal(entry)}
                            className="text-xs h-7 bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                          >
                            Alterar Status
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE ALTERAÇÃO DE STATUS COM AUDITORIA OBRIGATÓRIA */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#005596]" />
              <span>Transição de Estado Operacional da Fila</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Toda saída ou modificação é registrada de forma imutável com data/hora, motivo e
              responsável.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-sm text-slate-800">
                  {selectedEntry.driver_name_cached}
                </div>
                <div className="text-slate-600 flex items-center space-x-3">
                  <span>
                    Placa: <strong>{selectedEntry.vehicle_plate_cached || 'N/A'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Grupo Atual: <strong>{selectedEntry.type}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Status Atual: <strong className="uppercase">{selectedEntry.status}</strong>
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Novo Status Operacional:</label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível / Apto para Oferta</SelectItem>
                    <SelectItem value="validacao">Em Validação de Documentação</SelectItem>
                    <SelectItem value="pendente">Pendente de Conferência</SelectItem>
                    <SelectItem value="selecionado">Selecionado para Carga</SelectItem>
                    <SelectItem value="negociacao">Em Negociação de Frete</SelectItem>
                    <SelectItem value="atribuido">Carga Atribuída (Saída com Carga)</SelectItem>
                    <SelectItem value="indisponivel">Indisponibilidade Temporária</SelectItem>
                    <SelectItem value="removido">
                      Remover da Fila (Saída Voluntária/Operador)
                    </SelectItem>
                    {permissions.canBlockDriver && (
                      <SelectItem value="bloqueado" className="text-rose-600 font-bold">
                        Bloquear Motorista (Administrativo)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Motivo da Alteração{' '}
                  <span className="text-rose-500 font-normal">(Obrigatório para Auditoria)</span>:
                </label>
                <Input
                  placeholder="Ex: Motorista solicitou saída para descanso / Carga atribuída / Bloqueio por CNH"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Operator Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Observações do Operador de Pátio:
                </label>
                <Textarea
                  placeholder="Detalhes adicionais para o histórico de auditoria..."
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="text-xs h-20 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              disabled={isSubmitting}
              className="text-xs bg-[#005596] hover:bg-[#004071] text-white font-semibold"
            >
              {isSubmitting ? 'Gravando Auditoria...' : 'Confirmar e Auditar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL/DRAWER DETALHADO DO MOTORISTA COM TIMELINE E AVALIAÇÃO DETERMINÍSTICA */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-[#005596]" />
              <span>Ficha Completa do Motorista & Timeline</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Identificação, situação na fila, histórico de eventos e avaliação de elegibilidade
              para ofertas.
            </DialogDescription>
          </DialogHeader>

          {detailEntry && (
            <div className="space-y-4 py-2 text-xs">
              {/* 1. Identificação Cadastral */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Nome Completo do Motorista
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {detailEntry.driver_name_cached}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status na Fila
                  </span>
                  <div className="mt-0.5">{getStatusBadge(detailEntry.status)}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Documento (CPF/CNPJ)
                  </span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {permissions.canViewFullSensitiveData
                      ? formatDocument(detailEntry.driver_doc_cached || '')
                      : maskDocument(detailEntry.driver_doc_cached || '')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    WhatsApp de Contato
                  </span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {permissions.canViewFullSensitiveData
                      ? formatPhone(detailEntry.driver_whatsapp_cached || '')
                      : maskPhone(detailEntry.driver_whatsapp_cached || '')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Placa do Veículo
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-slate-900">
                    {detailEntry.vehicle_plate_cached || 'NÃO INFORMADA'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Tipo de Veículo
                  </span>
                  <span className="font-medium text-slate-800">
                    {detailEntry.vehicle_type_cached || 'Carreta'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Grupo / Origem
                  </span>
                  <span className="font-bold text-[#005596]">{detailEntry.type}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Distância da Planta
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {detailEntry.distance_km != null
                      ? `${detailEntry.distance_km} km`
                      : '0 km (Na CIAFAL)'}
                  </span>
                </div>
              </div>

              {/* 2. Avaliação de Elegibilidade para Ofertas (Motor Determinístico) */}
              {detailEligibility && (
                <div className="border border-sky-200 rounded-lg p-3 bg-sky-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#005596]" />
                      <h4 className="font-bold text-slate-900 text-xs">
                        Diagnóstico Determinístico de Elegibilidade para Oferta
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500">Janela Testada:</span>
                      <Select
                        value={eligibilityTestGroup}
                        onValueChange={(val: any) => setEligibilityTestGroup(val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-24 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PORTA">PORTA</SelectItem>
                          <SelectItem value="FORA">FORA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge
                      className={
                        detailEligibility.isEligible
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-rose-600 text-white font-bold'
                      }
                    >
                      {detailEligibility.isEligible ? 'ELEGÍVEL PARA OFERTA' : 'NÃO ELEGÍVEL'}
                    </Badge>
                    <span className="text-[10px] text-slate-500">
                      Versão da Regra: {detailEligibility.ruleEngineVersion}
                    </span>
                  </div>

                  {detailEligibility.reasons.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-rose-800 uppercase">
                        Lista Completa de Restrições Encontradas:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                        {detailEligibility.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-800">
                      ✓ Todas as 8 regras corporativas foram satisfeitas (Fila, Cadastro Ativo,
                      Disponibilidade, Sem Carga, Veículo, WhatsApp Válido, Não Bloqueado, Grupo
                      Correto).
                    </p>
                  )}
                </div>
              )}

              {/* 3. Timeline de Histórico Operacional */}
              <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-[#005596]" />
                  <span>Timeline de Movimentações e Auditoria</span>
                </h4>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {detailLogs.length === 0 ? (
                    <div className="text-slate-500 italic text-[11px] p-2 bg-slate-50 rounded">
                      Registro inicial de entrada: {detailEntry.last_event || 'Entrada registrada'}{' '}
                      em {new Date(detailEntry.entry_time).toLocaleString('pt-BR')}.
                    </div>
                  ) : (
                    detailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {log.action}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.created ? new Date(log.created).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        <div className="text-slate-800 font-medium">
                          {log.previous_state ? `${log.previous_state} → ` : ''}
                          <strong>{log.new_state}</strong>
                        </div>
                        {log.reason && (
                          <div className="text-slate-600 italic">Motivo: "{log.reason}"</div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Responsável: {log.user_name || log.user_email}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setDetailEntry(null)}
              className="text-xs bg-slate-800 text-white"
            >
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
