import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  Truck,
  Building,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  QrCode,
  Search,
  Filter,
  RefreshCw,
  Eye,
  MoreVertical,
  ShieldAlert,
  ArrowUpDown,
  Send,
  Calendar,
  Phone,
  FileSpreadsheet,
  Route,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  QueueEntryEntity,
  PreRegistrationEntity,
  SapItineraryEntity,
  QueueGroup,
  QueueStatus,
  maskDocument,
  maskPhone,
  formatPhone,
  formatDocument,
} from '@/domain/rules'

export const QueueDashboard: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [preRegistrations, setPreRegistrations] = useState<PreRegistrationEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItineraryFilter, setSelectedItineraryFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState<
    'PORTA' | 'FORA' | 'PROGRAMADOS' | 'PREREG' | 'MATRIZ'
  >('PORTA')

  // QR Code Modal
  const [showQrModal, setShowQrModal] = useState(false)

  // Status Change Dialog
  const [selectedEntry, setSelectedEntry] = useState<QueueEntryEntity | null>(null)
  const [newStatus, setNewStatus] = useState<QueueStatus>('disponivel')
  const [statusReason, setStatusReason] = useState('')
  const [operatorNotes, setOperatorNotes] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const publicQueueUrl = `${window.location.origin}/tms/fila-publica`

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [queueData, preRegData, itinData] = await Promise.all([
        TmsService.getOperationalQueue(),
        TmsService.getPreRegistrations(),
        TmsService.getSapItineraries(),
      ])
      setQueueEntries(queueData)
      setPreRegistrations(preRegData)
      setItineraries(itinData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao sincronizar fila operacional.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicQueueUrl)
    toast({
      title: 'Link Copiado!',
      description: 'O link público para celulares foi copiado para a área de transferência.',
    })
  }

  // Filtered lists
  const portaEntries = useMemo(() => {
    return queueEntries.filter(
      (e) =>
        e.type === 'PORTA' &&
        (selectedItineraryFilter === 'ALL' || e.preferred_itinerary === selectedItineraryFilter) &&
        (searchTerm === '' ||
          (e.driver_name_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.vehicle_plate_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.preferred_itinerary || '').toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [queueEntries, selectedItineraryFilter, searchTerm])

  const foraEntries = useMemo(() => {
    return queueEntries.filter(
      (e) =>
        e.type === 'FORA' &&
        (selectedItineraryFilter === 'ALL' || e.preferred_itinerary === selectedItineraryFilter) &&
        (searchTerm === '' ||
          (e.driver_name_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.vehicle_plate_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.preferred_itinerary || '').toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [queueEntries, selectedItineraryFilter, searchTerm])

  const programadosEntries = useMemo(() => {
    return queueEntries.filter(
      (e) =>
        e.type === 'PROGRAMADO' &&
        (selectedItineraryFilter === 'ALL' || e.preferred_itinerary === selectedItineraryFilter) &&
        (searchTerm === '' ||
          (e.driver_name_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.vehicle_plate_cached || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.preferred_itinerary || '').toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [queueEntries, selectedItineraryFilter, searchTerm])

  const pendingPreRegs = useMemo(() => {
    return preRegistrations.filter(
      (p) =>
        (p.status === 'novo' || p.status === 'em_analise' || p.status === 'pendente') &&
        (selectedItineraryFilter === 'ALL' || p.preferred_itinerary === selectedItineraryFilter) &&
        (searchTerm === '' ||
          (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.plate || '').toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [preRegistrations, selectedItineraryFilter, searchTerm])

  // Matriz Data x Itinerário (Disponibilidade Logística Futura)
  const matrixData = useMemo(() => {
    const datesMap = new Map<
      string,
      Map<string, { porta: number; fora: number; prog: number; totalCapKg: number }>
    >()

    queueEntries.forEach((e) => {
      if (['removido', 'bloqueado'].includes(e.status)) return
      const dateKey =
        e.calculated_logistics_date ||
        e.scheduled_arrival_date ||
        (e.entry_time ? e.entry_time.split('T')[0] : 'Indefinida')
      const itinKey = e.preferred_itinerary || 'Sem Itinerário'

      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, new Map())
      }
      const itinMap = datesMap.get(dateKey)!
      const cur = itinMap.get(itinKey) || { porta: 0, fora: 0, prog: 0, totalCapKg: 0 }

      if (e.type === 'PORTA') cur.porta++
      else if (e.type === 'FORA') cur.fora++
      else if (e.type === 'PROGRAMADO') cur.prog++

      cur.totalCapKg += e.vehicle_capacity_kg_cached || 0
      itinMap.set(itinKey, cur)
    })

    const rows: Array<{
      date: string
      itinerary: string
      porta: number
      fora: number
      programados: number
      vehiclesCount: number
      capacityTons: number
    }> = []

    datesMap.forEach((itinMap, date) => {
      itinMap.forEach((val, itin) => {
        rows.push({
          date,
          itinerary: itin,
          porta: val.porta,
          fora: val.fora,
          programados: val.prog,
          vehiclesCount: val.porta + val.fora + val.prog,
          capacityTons: val.totalCapKg > 0 ? Math.round(val.totalCapKg / 1000) : 0,
        })
      })
    })

    return rows.sort((a, b) => a.date.localeCompare(b.date))
  }, [queueEntries])

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!selectedEntry || !statusReason.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe a justificativa operacional para a alteração.',
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingStatus(true)
    try {
      const ok = await TmsService.updateQueueStatus(
        selectedEntry.id,
        newStatus,
        statusReason,
        user?.email || 'operador@ciafal.logistica',
        user?.name || 'Operador de Logística',
        operatorNotes,
      )

      if (ok) {
        toast({
          title: 'Status Atualizado',
          description: `Disponibilidade alterada para ${newStatus.toUpperCase()}.`,
        })
        setSelectedEntry(null)
        setStatusReason('')
        setOperatorNotes('')
        fetchData()
      } else {
        toast({
          title: 'Falha na Atualização',
          description: 'Não foi possível alterar o status da disponibilidade.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const renderCard = (entry: QueueEntryEntity) => {
    const isSensitiveAllowed = permissions.canViewFullSensitiveData

    return (
      <Card
        key={entry.id}
        className="bg-white border-slate-200 shadow-sm hover:shadow transition-all relative overflow-hidden"
      >
        <div
          className={`h-1.5 w-full ${
            entry.type === 'PORTA'
              ? 'bg-[#005596]'
              : entry.type === 'FORA'
                ? 'bg-emerald-600'
                : 'bg-purple-600'
          }`}
        />
        <CardContent className="p-4 space-y-3 text-xs">
          {/* Header Card */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900">
                  {isSensitiveAllowed
                    ? entry.driver_name_cached || 'Motorista'
                    : (entry.driver_name_cached || 'Motorista')
                        .split(' ')
                        .map((n, i) => (i === 0 ? n : n[0] + '.'))
                        .join(' ')}
                </span>
                <Badge
                  className={
                    entry.type === 'PORTA'
                      ? 'bg-[#005596] text-white font-bold'
                      : entry.type === 'FORA'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-purple-600 text-white font-bold'
                  }
                >
                  {entry.type}
                </Badge>
              </div>

              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                CPF:{' '}
                {isSensitiveAllowed
                  ? formatDocument(entry.driver_doc_cached || '')
                  : maskDocument(entry.driver_doc_cached || '')}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center space-x-1">
              <Badge
                variant="outline"
                className={`font-semibold uppercase text-[10px] ${
                  entry.status === 'disponivel'
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                    : entry.status === 'validacao'
                      ? 'border-amber-500 text-amber-700 bg-amber-50'
                      : entry.status === 'atribuido'
                        ? 'border-blue-500 text-blue-700 bg-blue-50'
                        : 'border-slate-400 text-slate-700'
                }`}
              >
                {entry.status}
              </Badge>

              {permissions.canManageQueueStatus && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuLabel>Ações Operacionais</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedEntry(entry)
                        setNewStatus('disponivel')
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                      Definir como DISPONÍVEL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedEntry(entry)
                        setNewStatus('validacao')
                      }}
                    >
                      <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                      Em Validação / Contato
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedEntry(entry)
                        setNewStatus('indisponivel')
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-2 text-slate-600" />
                      Marcar Indisponível
                    </DropdownMenuItem>
                    {permissions.canRemoveDriver && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedEntry(entry)
                            setNewStatus('removido')
                          }}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                          Remover da Fila
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Vehicle & Itinerary Details */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block font-bold">Placa & Veículo:</span>
              <strong className="text-slate-800 font-mono text-xs">
                {entry.vehicle_plate_cached || 'SEM PLACA'}
              </strong>
              <div className="text-slate-600 truncate">
                {entry.vehicle_type_cached || 'Carreta'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-bold">Itinerário Escolhido:</span>
              <strong className="text-[#005596] font-mono text-xs">
                {entry.preferred_itinerary || 'Não informado'}
              </strong>
              <div className="text-slate-500 text-[10px]">
                {itineraries.find((i) => i.sap_code === entry.preferred_itinerary)?.description ||
                  'Fonte SAP TVROT'}
              </div>
            </div>
          </div>

          {/* Dates & Logistics Details */}
          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Entrada Real:
              </span>
              <span className="font-mono text-slate-700">
                {entry.entry_time
                  ? new Date(entry.entry_time).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : '---'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-sky-50/50 p-1 rounded border border-sky-100">
              <span className="text-[#005596] font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#005596]" /> Data Logística Calculada:
              </span>
              <strong className="text-[#005596] font-mono">
                {entry.calculated_logistics_date
                  ? new Date(entry.calculated_logistics_date + 'T12:00:00').toLocaleDateString(
                      'pt-BR',
                    )
                  : 'Hoje'}
              </strong>
            </div>

            {entry.type === 'PROGRAMADO' && entry.scheduled_arrival_date && (
              <div className="flex items-center justify-between bg-purple-50 p-1 rounded border border-purple-200">
                <span className="text-purple-700 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-700" /> Data Prevista Chegada:
                </span>
                <strong className="text-purple-900 font-mono">
                  {new Date(entry.scheduled_arrival_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </strong>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600" /> Distância / Local:
              </span>
              <span className="font-mono font-bold text-slate-700">
                {entry.distance_km !== undefined && entry.distance_km >= 0
                  ? `${entry.distance_km} km`
                  : 'Validada'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400" /> Capacidade do Veículo:
              </span>
              <span className="font-mono font-bold text-slate-700">
                {entry.vehicle_capacity_kg_cached && entry.vehicle_capacity_kg_cached > 0
                  ? `${(entry.vehicle_capacity_kg_cached / 1000).toFixed(1)} t`
                  : 'Não informada'}
              </span>
            </div>
          </div>

          {/* Communication Channel */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1 text-slate-500">
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>WhatsApp:</span>
              <strong className="text-slate-700 font-mono">
                {isSensitiveAllowed
                  ? formatPhone(entry.driver_whatsapp_cached || '')
                  : maskPhone(entry.driver_whatsapp_cached || '')}
              </strong>
            </div>

            {entry.driver_notes && (
              <Badge
                variant="outline"
                className="text-[9px] text-slate-500 bg-slate-50 max-w-[120px] truncate"
                title={entry.driver_notes}
              >
                Obs: {entry.driver_notes}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Banner: PUBLIC QUEUE LINK & QR CODE */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#005596] text-white border-0 shadow-lg">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-500/30">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Rota Pública Segura Ativa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Link da Fila de Disponibilidade
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              "Acesso do motorista via celular com geolocalização obrigatória." Validação
              server-side, classificação automática em 3 grupos (PORTA, FORA, PROGRAMADO) e escolha
              de itinerário SAP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center">
            <Button
              onClick={copyPublicLink}
              variant="outline"
              className="bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700 text-xs font-bold"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              Copiar Link
            </Button>

            <Button
              onClick={() => setShowQrModal(true)}
              className="bg-[#005596] hover:bg-sky-600 text-white text-xs font-bold border border-sky-400/40"
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5" />
              Ver QR Code
            </Button>

            <Button
              onClick={() => window.open('/tms/fila-publica', '_blank')}
              variant="ghost"
              className="text-white hover:bg-white/10 text-xs font-semibold"
            >
              Abrir
              <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por placa, motorista ou itinerário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Select value={selectedItineraryFilter} onValueChange={setSelectedItineraryFilter}>
            <SelectTrigger className="w-52 text-xs h-9">
              <SelectValue placeholder="Filtrar por Itinerário SAP" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Itinerários SAP</SelectItem>
              {itineraries.map((it) => (
                <SelectItem key={it.sap_code} value={it.sap_code}>
                  {it.sap_code} — {it.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main Tabs (PORTA, FORA, PROGRAMADOS, PRÉ-CADASTROS, MATRIZ FUTURA) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1">
          <TabsTrigger
            value="PORTA"
            className="text-xs font-bold data-[state=active]:bg-[#005596] data-[state=active]:text-white py-2 min-w-0"
          >
            <span className="truncate">🏢 PORTA ({portaEntries.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="FORA"
            className="text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white py-2 min-w-0"
          >
            <span className="truncate">📍 FORA ≤ 60 km ({foraEntries.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="PROGRAMADOS"
            className="text-xs font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white py-2 min-w-0"
          >
            <span className="truncate">📅 PROGRAMADOS ({programadosEntries.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="PREREG"
            className="text-xs font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white py-2 min-w-0"
          >
            <span className="truncate">📝 PRÉ-CADASTROS ({pendingPreRegs.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="MATRIZ"
            className="text-xs font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white py-2 col-span-2 sm:col-span-1 min-w-0"
          >
            <span className="truncate">📊 MATRIZ FUTURA</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB PORTA */}
        <TabsContent value="PORTA" className="space-y-3">
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-[#005596]" />
              <span>
                <strong>GRUPO PORTA:</strong> Presença física confirmada no pátio CIAFAL.
                Disponibilidade para carregamento imediato.
              </span>
            </div>
            <Badge className="bg-[#005596] text-white text-[10px]">Corte: Imediato Hoje</Badge>
          </div>

          {portaEntries.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Nenhum motorista com presença física registrada na portaria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portaEntries.map(renderCard)}
            </div>
          )}
        </TabsContent>

        {/* TAB FORA */}
        <TabsContent value="FORA" className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>GRUPO FORA (≤ 60 km):</strong> Disponibilidade próxima.{' '}
                <strong>Regra temporal:</strong> Check-in até 12h = Disponibilidade hoje; após 12h =
                dia seguinte.
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">Corte: 12:00</Badge>
          </div>

          {foraEntries.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Nenhum motorista no raio operacional de 60 km registrado no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {foraEntries.map(renderCard)}
            </div>
          )}
        </TabsContent>

        {/* TAB PROGRAMADOS */}
        <TabsContent value="PROGRAMADOS" className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>
                <strong>DISPONIBILIDADE PROGRAMADA:</strong> Fora do raio (&gt;60km) com data futura
                declarada. Alimenta o Planejador. Não participa de ofertas imediatas.
              </span>
            </div>
            <Badge className="bg-purple-600 text-white text-[10px]">Capacidade Futura</Badge>
          </div>

          {programadosEntries.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Nenhuma disponibilidade programada para datas futuras.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programadosEntries.map(renderCard)}
            </div>
          )}
        </TabsContent>

        {/* TAB PRÉ-CADASTROS */}
        <TabsContent value="PREREG" className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                <strong>PRÉ-CADASTROS PENDENTES:</strong> "Pré-cadastro não é cadastro". Não recebe
                oferta e não participa do leilão até homologação no SAP.
              </span>
            </div>
            <Button
              onClick={() => (window.location.href = '/tms/pre-cadastros')}
              size="sm"
              variant="outline"
              className="text-[10px] h-7 bg-white"
            >
              Gerenciar Pré-cadastros
            </Button>
          </div>

          {pendingPreRegs.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Nenhum pré-cadastro pendente no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPreRegs.map((pre) => (
                <Card key={pre.id} className="bg-white border-amber-200 shadow-sm text-xs">
                  <div className="h-1.5 bg-amber-500 w-full" />
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="text-slate-900 text-sm block">{pre.name}</strong>
                        <div className="text-slate-500 font-mono text-[11px]">
                          CPF: {maskDocument(pre.document)}
                        </div>
                      </div>
                      <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                        PRÉ-CADASTRO
                      </Badge>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1 text-[11px]">
                      <div>
                        Placa:{' '}
                        <strong className="font-mono text-slate-800">{pre.plate || '---'}</strong>
                      </div>
                      <div>
                        WhatsApp:{' '}
                        <strong className="font-mono text-slate-800">
                          {maskPhone(pre.whatsapp)}
                        </strong>
                      </div>
                      <div>
                        Itinerário de Preferência:{' '}
                        <strong className="text-[#005596]">
                          {pre.preferred_itinerary || 'Não informado'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Recebido em: {new Date(pre.created || Date.now()).toLocaleDateString('pt-BR')}{' '}
                      via Link Público
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB MATRIZ FUTURA */}
        <TabsContent value="MATRIZ" className="space-y-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-[#005596]" />
                <span>Disponibilidade Logística Futura (Matriz Data x Itinerário)</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cruzamento de capacidade de veículos disponíveis por data e itinerário SAP. Valores
                só aparecem se existirem dados reais no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {matrixData.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum registro de disponibilidade ativa para compor a matriz.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">Data Logística</th>
                        <th className="p-2.5">Itinerário SAP</th>
                        <th className="p-2.5 text-center">PORTA</th>
                        <th className="p-2.5 text-center">FORA</th>
                        <th className="p-2.5 text-center">PROGRAMADOS</th>
                        <th className="p-2.5 text-center">Total Veículos</th>
                        <th className="p-2.5 text-right">Capacidade Estimada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {matrixData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5">
                            <strong className="text-[#005596] font-mono">{row.itinerary}</strong>
                            <div className="text-[10px] text-slate-400">
                              {itineraries.find((i) => i.sap_code === row.itinerary)?.description ||
                                ''}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-sky-700">
                            {row.porta || '—'}
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            {row.fora || '—'}
                          </td>
                          <td className="p-2.5 text-center font-bold text-purple-700">
                            {row.programados || '—'}
                          </td>
                          <td className="p-2.5 text-center font-black text-slate-900">
                            {row.vehiclesCount}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {row.capacityTons > 0 ? `${row.capacityTons} t` : 'Não informada'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal Dialog */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">QR Code de Autoatendimento</DialogTitle>
            <DialogDescription className="text-xs">
              Aponte a câmera do celular para abrir o fluxo de disponibilidade.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 bg-slate-100 rounded-xl flex flex-col items-center justify-center space-y-3">
            <div className="w-48 h-48 bg-white p-3 rounded-lg border border-slate-300 shadow flex items-center justify-center">
              <QrCode className="w-36 h-36 text-[#005596]" />
            </div>
            <span className="text-[11px] font-mono text-slate-500 break-all">{publicQueueUrl}</span>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowQrModal(false)}
              size="sm"
              className="bg-[#005596] text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Atualizar Status da Disponibilidade
            </DialogTitle>
            <DialogDescription className="text-xs">
              Alterações geram registro imutável na trilha de auditoria do TMS.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">{selectedEntry.driver_name_cached}</div>
                <div className="text-slate-500 font-mono">
                  Placa: {selectedEntry.vehicle_plate_cached} • Grupo: {selectedEntry.type}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Novo Status:</label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="disponivel">Disponível para Carga</SelectItem>
                    <SelectItem value="validacao">Em Validação Cadastral / Contato</SelectItem>
                    <SelectItem value="indisponivel">Indisponível Temporário</SelectItem>
                    <SelectItem value="atribuido">Carga Atribuída</SelectItem>
                    <SelectItem value="removido">Remover da Fila Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Justificativa Operacional (Obrigatório):
                </label>
                <Input
                  placeholder="Ex: Contato realizado via telefone, aguardando liberação na balança..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Observações Internas (Opcional):
                </label>
                <Textarea
                  placeholder="Notas internas do operador..."
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="text-xs h-16 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedEntry(null)}
              className="text-xs"
              disabled={isUpdatingStatus}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus || !statusReason.trim()}
              className="bg-[#005596] text-white text-xs"
            >
              {isUpdatingStatus ? 'Salvando...' : 'Confirmar e Auditar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
