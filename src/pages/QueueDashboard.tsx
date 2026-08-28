import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { TmsService } from '@/services/tmsService'
import {
  QueueEntryEntity,
  QueueStatus,
  maskDocument,
  maskPhone,
  formatDocument,
  formatPhone,
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
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGroup, setFilterGroup] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterVehicleType, setFilterVehicleType] = useState<string>('todos')

  // Action Modal State
  const [selectedEntry, setSelectedEntry] = useState<QueueEntryEntity | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<QueueStatus>('disponivel')
  const [actionReason, setActionReason] = useState('')
  const [operatorNotes, setOperatorNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detail Drawer / Modal State
  const [detailEntry, setDetailEntry] = useState<QueueEntryEntity | null>(null)

  // Load Queue Data
  const loadQueue = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getOperationalQueue()
      setQueue(data)
    } catch (err) {
      console.error('Error loading queue:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  // Subscribe to realtime updates on queue_entries
  useRealtime('queue_entries', () => {
    loadQueue()
  })

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = queue.length
    const porta = queue.filter((e) => e.type === 'PORTA' && e.status !== 'removido')
    const fora = queue.filter((e) => e.type === 'FORA' && e.status !== 'removido')
    const aptos = queue.filter((e) => e.status === 'disponivel')
    const pendentes = queue.filter((e) => e.status === 'validacao' || e.status === 'pendente')
    const semCanal = queue.filter((e) => !e.driver_whatsapp_cached)

    // Today's entries
    const today = new Date().toISOString().split('T')[0]
    const entriesToday = queue.filter((e) => e.entry_time && e.entry_time.startsWith(today)).length
    const exitsToday = queue.filter((e) => e.exit_time && e.exit_time.startsWith(today)).length

    return {
      totalDisponiveis: aptos.length,
      portaCount: porta.length,
      foraCount: fora.length,
      aptosCount: aptos.length,
      pendentesCount: pendentes.length,
      semCanalCount: semCanal.length,
      entriesToday: entriesToday || porta.length + fora.length,
      exitsToday: exitsToday,
    }
  }, [queue])

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

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const name = (item.driver_name_cached || '').toLowerCase()
        const doc = (item.driver_doc_cached || '').toLowerCase()
        const plate = (item.vehicle_plate_cached || '').toLowerCase()
        const vType = (item.vehicle_type_cached || '').toLowerCase()

        return (
          name.includes(term) || doc.includes(term) || plate.includes(term) || vType.includes(term)
        )
      }

      return true
    })
  }, [queue, filterGroup, filterStatus, filterVehicleType, searchTerm])

  // Split into PORTA and FORA lists
  const portaList = useMemo(() => filteredQueue.filter((e) => e.type === 'PORTA'), [filteredQueue])
  const foraList = useMemo(() => filteredQueue.filter((e) => e.type === 'FORA'), [filteredQueue])

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
        loadQueue()
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER OPERACIONAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Fila Operacional de Motoristas
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Ativa em Tempo Real</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dois painéis operacionais segregados:{' '}
            <strong className="text-[#005596]">PORTA (Na CIAFAL)</strong> e{' '}
            <strong className="text-emerald-700">FORA (Disponíveis até 60 km)</strong>. Prioridade
            temporal garantida.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadQueue}
            disabled={isLoading}
            className="text-xs text-slate-700 border-slate-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* DASHBOARD DE INDICADORES (KPIS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="border-sky-200 bg-sky-50/50 shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">
              PORTA (Na Planta)
            </div>
            <div className="text-2xl font-bold text-[#005596] mt-1">{kpis.portaCount}</div>
            <div className="text-[10px] text-sky-700 mt-0.5">Prioridade 1</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
              FORA (Região)
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.foraCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Raio ≤ 60 km</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Total Disponíveis
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalDisponiveis}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Prontos p/ oferta</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Cadastrados Aptos
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{kpis.aptosCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Status SAP Ativo</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
              Pré-cadastros
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.pendentesCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Exigem conferência</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Sem WhatsApp
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{kpis.semCanalCount}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">Sem contato direto</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Entradas Hoje
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{kpis.entriesToday}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Totem + Externo</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Saídas / Cargas
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{kpis.exitsToday}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Atribuídos / Saídos</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS OPERACIONAIS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filtrar por nome, CPF/CNPJ, placa ou tipo de veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          {/* Group Filter */}
          <div className="w-full md:w-44">
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Grupos</SelectItem>
                <SelectItem value="PORTA">Apenas PORTA</SelectItem>
                <SelectItem value="FORA">Apenas FORA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status da Fila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="disponivel">Disponível / Apto</SelectItem>
                <SelectItem value="validacao">Em Validação</SelectItem>
                <SelectItem value="pendente">Pendente Doc</SelectItem>
                <SelectItem value="selecionado">Selecionado Carga</SelectItem>
                <SelectItem value="negociacao">Em Negociação</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterGroup !== 'todos' || filterStatus !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterGroup('todos')
                setFilterStatus('todos')
              }}
              className="text-xs text-slate-500 h-9"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* PAINÉIS LADO A LADO: PORTA vs FORA (REGRA FUNDAMENTAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* PAINEL 1: PORTA — NA CIAFAL (PRIORIDADE TEMPORAL MÁXIMA) */}
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
                    Prioridade 1
                  </Badge>
                </div>
                <p className="text-xs text-sky-100/90">
                  Registrados pelo Totem Portaria • Presença Física Confirmada
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold">{portaList.length}</span>
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
              portaList.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-sky-400 transition-all space-y-3"
                >
                  {/* Card Header: Driver Name + Priority Ordinal */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-[#005596] font-extrabold text-xs flex items-center justify-center">
                        {idx + 1}º
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {entry.driver_name_cached || 'Motorista Sem Nome'}
                        </h3>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
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
                    <div>{getStatusBadge(entry.status)}</div>
                  </div>

                  {/* Vehicle & Entry Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-md text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Veículo / Placa
                      </span>
                      <div className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">
                          {entry.vehicle_plate_cached || 'SEM PLACA'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                        {entry.vehicle_type_cached || 'Carreta'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Tempo na Fila
                      </span>
                      <div className="font-bold text-[#005596] flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>{formatTimeInQueue(entry.entry_time)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Entrada:{' '}
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

                  {/* Card Footer with Quick Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      <span className="font-semibold text-slate-600">Último evento: </span>
                      {entry.last_event || 'Entrada registrada'}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailEntry(entry)}
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
              ))
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAINEL 2: FORA — DISPONÍVEIS NA REGIÃO (≤ 60 KM DA PLANTA) */}
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
                    Raio ≤ 60 km
                  </Badge>
                </div>
                <p className="text-xs text-emerald-100/90">
                  Disponibilizados pelo Link Externo • GPS Validado
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold">{foraList.length}</span>
              <span className="text-xs text-emerald-200 block">veículos</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border-x border-b border-slate-200 rounded-b-xl p-3 min-h-[420px] space-y-3">
            {foraList.length === 0 ? (
              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum motorista externo disponível no momento
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Motoristas que confirmarem disponibilidade via link web/WhatsApp com GPS
                  aparecerão aqui.
                </p>
              </div>
            ) : (
              foraList.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-emerald-500 transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
                        {idx + 1}º
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {entry.driver_name_cached || 'Motorista Sem Nome'}
                        </h3>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
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
                    <div>{getStatusBadge(entry.status)}</div>
                  </div>

                  {/* Vehicle & Location Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-emerald-50/40 p-2.5 rounded-md text-xs border border-emerald-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Veículo / Placa
                      </span>
                      <div className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">
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
                          {entry.distance_km != null ? `${entry.distance_km} km` : 'Validando GPS'}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">
                        {entry.location_status === 'validada' ? '✓ Raio validado' : 'Em validação'}
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

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      <span className="font-semibold text-slate-600">Último evento: </span>
                      {entry.last_event || 'Check-in externo validado'}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailEntry(entry)}
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE AÇÃO OPERACIONAL COM JUSTIFICATIVA OBRIGATÓRIA (AUDITORIA) */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#005596]" />
              <span>Alteração de Status Operacional</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Toda ação manual que afete a fila de motoristas é registrada com carimbo de tempo,
              usuário e justificativa.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 py-2 text-xs">
              {/* Summary Card */}
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
                    Grupo: <strong>{selectedEntry.type}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Status Atual: <strong className="uppercase">{selectedEntry.status}</strong>
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Novo Status da Fila:</label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível / Apto p/ Oferta</SelectItem>
                    <SelectItem value="validacao">Em Validação de Documento</SelectItem>
                    <SelectItem value="pendente">Pendente de Pré-cadastro</SelectItem>
                    <SelectItem value="selecionado">Selecionado para Carga</SelectItem>
                    <SelectItem value="negociacao">Em Negociação de Frete</SelectItem>
                    <SelectItem value="atribuido">Carga Atribuída (Concluído)</SelectItem>
                    <SelectItem value="indisponivel">Indisponível Temporariamente</SelectItem>
                    <SelectItem value="removido">Remover da Fila Operacional</SelectItem>
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
                  placeholder="Ex: Motorista compareceu à portaria com documentação regularizada"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Operator Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Observações Complementares do Pátio:
                </label>
                <Textarea
                  placeholder="Observações adicionais de vistoria, lacre, agendamento de doca..."
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

      {/* MODAL DE DETALHES COMPLETOS DO MOTORISTA */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-[#005596]" />
              <span>Ficha Operacional do Motorista na Fila</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dados consolidados da integração SAP ZSD004V_V2 e evento de entrada.
            </DialogDescription>
          </DialogHeader>

          {detailEntry && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Nome Completo
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {detailEntry.driver_name_cached}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status Atual
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
                    Conjunto / Veículo
                  </span>
                  <span className="font-medium text-slate-800">
                    {detailEntry.vehicle_type_cached || 'Carreta'}
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
              </div>

              {/* Queue Technical Parameters */}
              <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">
                  Parâmetros de Entrada e Localização
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Grupo de Entrada:</span>
                    <strong className="text-slate-900">{detailEntry.type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Distância da CIAFAL:</span>
                    <strong className="text-slate-900">
                      {detailEntry.distance_km != null
                        ? `${detailEntry.distance_km} km`
                        : '0 km (Na planta)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Validação GPS:</span>
                    <strong className="text-emerald-700">
                      {detailEntry.location_status || 'validada'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Data/Hora de Entrada:</span>
                    <strong className="text-slate-900">
                      {detailEntry.entry_time
                        ? new Date(detailEntry.entry_time).toLocaleString('pt-BR')
                        : '---'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tempo Total na Fila:</span>
                    <strong className="text-[#005596]">
                      {formatTimeInQueue(detailEntry.entry_time)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">IP de Registro:</span>
                    <strong className="font-mono text-slate-700">
                      {detailEntry.ip_address || '127.0.0.1'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Operational Audit History */}
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">
                  Última Movimentação Operacional
                </h4>
                <div className="text-slate-600 space-y-1">
                  <p>
                    <strong>Evento:</strong> {detailEntry.last_event || 'Registro inicial na fila'}
                  </p>
                  <p>
                    <strong>Operador Responsável:</strong>{' '}
                    {detailEntry.last_operator || 'Sistema Automático'}
                  </p>
                  {detailEntry.reason && (
                    <p>
                      <strong>Motivo Declarado:</strong> {detailEntry.reason}
                    </p>
                  )}
                  {detailEntry.operator_notes && (
                    <p>
                      <strong>Notas do Pátio:</strong> {detailEntry.operator_notes}
                    </p>
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
