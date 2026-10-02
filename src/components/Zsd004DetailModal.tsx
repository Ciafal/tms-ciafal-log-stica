import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SapZsd004Record } from '@/domain/zsd004Engine'
import { TmsService } from '@/services/tmsService'
import {
  Truck,
  User,
  Building,
  Layers,
  Scale,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Navigation,
  Clock,
  History,
} from 'lucide-react'

interface Zsd004DetailModalProps {
  record: SapZsd004Record | null
  isOpen: boolean
  onClose: () => void
  canViewFullSensitiveData: boolean
}

export const Zsd004DetailModal: React.FC<Zsd004DetailModalProps> = ({
  record,
  isOpen,
  onClose,
  canViewFullSensitiveData,
}) => {
  const [showSensitive, setShowSensitive] = React.useState(false)
  const [activeQueueEntry, setActiveQueueEntry] = React.useState<any | null>(null)
  const [isLoadingQueue, setIsLoadingQueue] = React.useState(false)
  const [itineraryHistory, setItineraryHistory] = React.useState<
    Array<{
      id: string
      date: string
      channel: string
      preferredItinerary: string
      preferredItineraryName: string
      justification?: string
      source: 'Fila Operacional' | 'Pré-Cadastro'
    }>
  >([])

  React.useEffect(() => {
    if (!isOpen || !record) return

    let isMounted = true
    setIsLoadingQueue(true)

    const cleanPlaca = (record.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const cleanDoc = (record.driver_cpf || record.driver_document || '').replace(/\D/g, '')

    Promise.all([
      TmsService.getOperationalQueue().catch(() => []),
      TmsService.getPreRegistrations().catch(() => []),
    ])
      .then(([queueEntries, preRegs]) => {
        if (!isMounted) return

        // 1. Disponibilidade Atual na fila (status disponível ou em validação)
        const currentEntry = queueEntries.find((q: any) => {
          const qPlate = (q.vehicle_plate_cached || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
          const qDoc = (q.driver_doc_cached || '').replace(/\D/g, '')
          const matchesPlate = Boolean(cleanPlaca && qPlate && qPlate === cleanPlaca)
          const matchesDoc = Boolean(cleanDoc && qDoc && qDoc === cleanDoc)
          const isActive = !['removido', 'bloqueado', 'atribuido'].includes(q.status)
          return (matchesPlate || matchesDoc) && isActive
        })
        setActiveQueueEntry(currentEntry || null)

        // 2. Histórico de itinerários informados (queue_entries + pre_registrations)
        const historyList: Array<{
          id: string
          date: string
          channel: string
          preferredItinerary: string
          preferredItineraryName: string
          justification?: string
          source: 'Fila Operacional' | 'Pré-Cadastro'
        }> = []

        // De queue_entries
        queueEntries.forEach((q: any) => {
          const qPlate = (q.vehicle_plate_cached || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
          const qDoc = (q.driver_doc_cached || '').replace(/\D/g, '')
          const matchesPlate = Boolean(cleanPlaca && qPlate && qPlate === cleanPlaca)
          const matchesDoc = Boolean(cleanDoc && qDoc && qDoc === cleanDoc)
          if (matchesPlate || matchesDoc) {
            const itin = q.preferred_itinerary || 'SEM_PREFERENCIA'
            const itinName =
              q.preferred_itinerary_name || (itin === 'SEM_PREFERENCIA' ? 'Sem preferência' : '')
            let channel = q.last_operator?.includes('Totem') ? 'Totem' : 'Link Público'
            if (q.type === 'PORTA') channel = 'Totem'
            if (q.last_operator?.includes('@')) channel = 'Operador HUB'
            if (q.last_operator?.toLowerCase().includes('portaria')) channel = 'Portaria'

            historyList.push({
              id: `q-${q.id}`,
              date: q.entry_time || q.created || '',
              channel,
              preferredItinerary: itin,
              preferredItineraryName: itinName,
              justification:
                q.reason || (q.last_event?.includes('alterado') ? q.last_event : undefined),
              source: 'Fila Operacional',
            })
          }
        })

        // De pre_registrations
        preRegs.forEach((pr: any) => {
          const prPlate = (pr.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
          const prDoc = (pr.document || '').replace(/\D/g, '')
          const matchesPlate = Boolean(cleanPlaca && prPlate && prPlate === cleanPlaca)
          const matchesDoc = Boolean(cleanDoc && prDoc && prDoc === cleanDoc)
          if (matchesPlate || matchesDoc) {
            const itin = pr.preferred_itinerary || 'SEM_PREFERENCIA'
            const itinName =
              pr.preferred_itinerary_name || (itin === 'SEM_PREFERENCIA' ? 'Sem preferência' : '')
            const channel = pr.origin === 'PORTA' ? 'Totem' : 'Link Público'

            historyList.push({
              id: `pr-${pr.id}`,
              date: pr.created || '',
              channel,
              preferredItinerary: itin,
              preferredItineraryName: itinName,
              justification: pr.driver_notes || pr.reviewer_notes || undefined,
              source: 'Pré-Cadastro',
            })
          }
        })

        // Ordenar por data decrescente (mais recente primeiro)
        historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setItineraryHistory(historyList)
        setIsLoadingQueue(false)
      })
      .catch(() => {
        if (isMounted) setIsLoadingQueue(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, record])

  if (!record) return null

  const isBlocked = record.status === 'B'
  const isApproved = record.status === 'A'

  // LGPD Masking helpers
  const maskCpf = (cpf?: string) => {
    if (!cpf || cpf === 'Não informado no SAP') return cpf || 'Não informado no SAP'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length !== 11) return cpf
    if (canViewFullSensitiveData && showSensitive) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
    }
    return `***.***.***-${clean.slice(-2)}`
  }

  const maskPhone = (phone?: string) => {
    if (!phone || phone === 'Não informado no SAP') return phone || 'Não informado no SAP'
    const clean = phone.replace(/\D/g, '')
    if (canViewFullSensitiveData && showSensitive) return phone
    if (clean.length >= 8) {
      return `(**) *****-${clean.slice(-4)}`
    }
    return '(**) ****-****'
  }

  const maskAddress = (street?: string, num?: string, district?: string) => {
    if (canViewFullSensitiveData && showSensitive) {
      return `${street || ''}, ${num || 'S/N'} - ${district || ''}`
    }
    return 'Endereço protegido (LGPD - Restrito a operadores autorizados)'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-[#005596] rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Placa: {record.plate}</span>
                  {isBlocked ? (
                    <Badge className="bg-rose-600 text-white hover:bg-rose-700">BLOQUEADO</Badge>
                  ) : isApproved ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                      APROVADO
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                      NÃO INFORMADO
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Centro: <strong>{record.plant}</strong> | Fonte SAP:{' '}
                  <strong>{record.source_mode}</strong> | Chave: {record.technical_key}
                </DialogDescription>
              </div>
            </div>

            {canViewFullSensitiveData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-xs text-slate-600 gap-1.5"
              >
                {showSensitive ? (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                )}
                {showSensitive ? 'Ocultar LGPD' : 'Revelar Dados Pessoais'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de Bloqueio Rígido SAP */}
        {isBlocked && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              Veículo Bloqueado no Cadastro SAP ZSD004
            </div>
            <p className="text-rose-800">
              <strong>Motivo do Bloqueio:</strong>{' '}
              {record.block_reason || 'Motivo não especificado no SAP.'}
            </p>
            <p className="text-[11px] text-rose-600">
              Veículos bloqueados não são elegíveis para o Planejador de Cargas, Mesa de Fretes ou
              despacho operacional.
            </p>
          </div>
        )}

        {/* Bloco Aditivo: Disponibilidade Atual na Fila */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#005596]" />
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Disponibilidade Atual (Fila Operacional)
              </span>
            </div>
            {isLoadingQueue && (
              <span className="text-[10px] text-slate-400">Consultando fila...</span>
            )}
          </div>

          {activeQueueEntry ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Situação na Fila
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    className={
                      activeQueueEntry.type === 'PORTA'
                        ? 'bg-blue-600 text-white'
                        : activeQueueEntry.type === 'FORA'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 text-white'
                    }
                  >
                    {activeQueueEntry.type || 'PORTA'}
                  </Badge>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {activeQueueEntry.status || 'Disponível'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Data/Hora Entrada
                </span>
                <span className="text-slate-800 font-mono text-xs flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {activeQueueEntry.entry_time
                    ? new Date(activeQueueEntry.entry_time).toLocaleString('pt-BR')
                    : 'Não informada'}
                </span>
              </div>

              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Localização / Distância
                </span>
                <span className="text-slate-800 font-medium text-xs mt-1 block">
                  {activeQueueEntry.distance_km != null
                    ? `${activeQueueEntry.distance_km} km da base`
                    : activeQueueEntry.location_city
                      ? `${activeQueueEntry.location_city} (${activeQueueEntry.location_state || 'UF'})`
                      : 'Na Portaria Hub'}
                </span>
              </div>

              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Itinerário Preferencial
                </span>
                <div className="mt-1">
                  {(() => {
                    const pref = (activeQueueEntry.preferred_itinerary || '').trim()
                    if (!pref) {
                      return (
                        <Badge
                          variant="outline"
                          className="text-slate-500 bg-slate-50 border-slate-200 text-[10px]"
                        >
                          Não informado
                        </Badge>
                      )
                    }
                    if (pref.toUpperCase() === 'SEM_PREFERENCIA') {
                      return (
                        <Badge
                          variant="outline"
                          className="text-slate-600 bg-slate-100 border-slate-300 text-[10px]"
                        >
                          Sem preferência
                        </Badge>
                      )
                    }
                    return (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px]">
                        [{pref}]
                        {activeQueueEntry.preferred_itinerary_name
                          ? ` — ${activeQueueEntry.preferred_itinerary_name}`
                          : ''}
                      </Badge>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3 rounded border border-dashed border-slate-200 text-center text-xs text-slate-500">
              Não está na fila atualmente
            </div>
          )}
        </div>

        {/* Bloco Aditivo: Últimos Itinerários Informados */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-700" />
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Últimos Itinerários Informados (Fila & Pré-Cadastros)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Somente leitura • {itineraryHistory.length} registro(s)
            </span>
          </div>

          {itineraryHistory.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400 italic bg-slate-50 rounded">
              Nenhum registro anterior de itinerário encontrado para este documento/placa.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-48 border border-slate-100 rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-2">Data Entrada</th>
                    <th className="p-2">Canal</th>
                    <th className="p-2">Origem</th>
                    <th className="p-2">Itinerário Informado</th>
                    <th className="p-2">Justificativa / Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itineraryHistory.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="p-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            item.channel === 'Totem'
                              ? 'border-indigo-300 text-indigo-700 bg-indigo-50 text-[10px]'
                              : item.channel === 'Portaria'
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]'
                                : item.channel === 'Operador HUB'
                                  ? 'border-amber-300 text-amber-700 bg-amber-50 text-[10px]'
                                  : 'border-blue-300 text-blue-700 bg-blue-50 text-[10px]'
                          }
                        >
                          {item.channel}
                        </Badge>
                      </td>
                      <td className="p-2 text-slate-500 text-[11px] whitespace-nowrap">
                        {item.source}
                      </td>
                      <td className="p-2">
                        {(() => {
                          const pref = (item.preferredItinerary || '').trim()
                          if (!pref) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-400 bg-slate-50 border-slate-200 text-[9px]"
                              >
                                Não informado
                              </Badge>
                            )
                          }
                          if (pref.toUpperCase() === 'SEM_PREFERENCIA') {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-600 bg-slate-100 border-slate-300 text-[9px]"
                              >
                                Sem preferência
                              </Badge>
                            )
                          }
                          return (
                            <Badge className="bg-blue-600 text-white text-[9px]">
                              [{pref}]
                              {item.preferredItineraryName
                                ? ` — ${item.preferredItineraryName}`
                                : ''}
                            </Badge>
                          )
                        })()}
                      </td>
                      <td
                        className="p-2 text-slate-600 text-[11px] max-w-xs truncate"
                        title={item.justification}
                      >
                        {item.justification || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Tabs defaultValue="veiculo" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 bg-slate-100 p-1 rounded-lg text-xs">
            <TabsTrigger value="veiculo" className="text-xs">
              <Truck className="w-3.5 h-3.5 mr-1" /> Veículo
            </TabsTrigger>
            <TabsTrigger value="motorista" className="text-xs">
              <User className="w-3.5 h-3.5 mr-1" /> Motorista
            </TabsTrigger>
            <TabsTrigger value="proprietario" className="text-xs">
              <Building className="w-3.5 h-3.5 mr-1" /> Proprietário
            </TabsTrigger>
            <TabsTrigger value="composicao" className="text-xs">
              <Layers className="w-3.5 h-3.5 mr-1" /> Composição
            </TabsTrigger>
            <TabsTrigger value="capacidades" className="text-xs">
              <Scale className="w-3.5 h-3.5 mr-1" /> Capacidades
            </TabsTrigger>
            <TabsTrigger value="situacao" className="text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Situação
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" /> Documentos
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Veículo */}
          <TabsContent value="veiculo" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Placa</span>
                <strong className="text-slate-800 text-sm font-mono">{record.plate}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Marca / Modelo
                </span>
                <span className="text-slate-800 font-semibold">{record.vehicle_brand_model}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Modelo Específico
                </span>
                <span className="text-slate-800">{record.vehicle_model}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cor</span>
                <span className="text-slate-800">{record.vehicle_color}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassi</span>
                <span className="font-mono text-slate-800">{record.vehicle_chassis}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Renavam
                </span>
                <span className="font-mono text-slate-800">{record.vehicle_renavam}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cidade / UF
                </span>
                <span className="text-slate-800">
                  {record.vehicle_city} - {record.vehicle_region}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Ano Fab. / Modelo
                </span>
                <span className="text-slate-800">
                  {record.vehicle_year_fab} / {record.vehicle_year_model}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código ANTT (Veículo)
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.vehicle_antt}</span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 2: Motorista */}
          <TabsContent value="motorista" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Nome do Motorista
                </span>
                <strong className="text-slate-900 text-sm">{record.driver_name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CPF</span>
                <span className="font-mono text-slate-800 font-bold">
                  {maskCpf(record.driver_cpf)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  RG / Documento
                </span>
                <span className="font-mono text-slate-800">
                  {canViewFullSensitiveData && showSensitive
                    ? record.driver_document
                    : '*** protegido ***'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Órgão / UF Emissor
                </span>
                <span className="text-slate-800">
                  {record.driver_issuer_org} / {record.driver_issuer_state}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CNH</span>
                <span className="font-mono text-slate-800 font-bold">{record.driver_cnh}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Telefone Principal
                </span>
                <span className="font-mono text-slate-800">{maskPhone(record.driver_phone)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Celular
                </span>
                <span className="font-mono text-slate-800">{maskPhone(record.driver_mobile)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">E-mail</span>
                <span className="text-slate-800">{record.driver_email}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Endereço Residencial
                </span>
                <span className="text-slate-800">
                  {maskAddress(record.driver_street, record.driver_number, record.driver_district)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CEP</span>
                <span className="font-mono text-slate-800">{record.driver_zipcode}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Data Nascimento / Est. Civil
                </span>
                <span className="text-slate-800">
                  {canViewFullSensitiveData && showSensitive ? record.driver_birth_date : '***'} (
                  {record.driver_marital_status})
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Vencimento CNH
                </span>
                <span className="text-slate-800">{record.driver_cnh_expiration}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  INSS / Categoria Autônomo
                </span>
                <span className="text-slate-800">
                  {record.driver_inss_registry} / {record.driver_autonomous_category}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 3: Proprietário / Transportador */}
          <TabsContent value="proprietario" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Razão Social / Nome Proprietário
                </span>
                <strong className="text-slate-900 text-sm">{record.owner_name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo Proprietário
                </span>
                <span className="text-slate-800 font-semibold">{record.owner_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  CNPJ / CPF
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.owner_cnpj}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Inscrição Estadual
                </span>
                <span className="font-mono text-slate-800">{record.owner_state_registration}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Inscrição Municipal / CEI
                </span>
                <span className="text-slate-800">
                  {record.owner_municipal_registration} / {record.owner_cei}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Telefone Proprietário
                </span>
                <span className="font-mono text-slate-800">{record.owner_phone}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cidade do Proprietário
                </span>
                <span className="text-slate-800">{record.owner_city}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  CEP Proprietário
                </span>
                <span className="font-mono text-slate-800">{record.owner_zipcode}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Endereço do Proprietário
                </span>
                <span className="text-slate-800">
                  {record.owner_street}, {record.owner_number} - {record.owner_district}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 4: Composição do Veículo */}
          <TabsContent value="composicao" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa da Carreta
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.trailer_plate}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  ANTT da Carreta
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.trailer_antt}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Região / UF Carreta
                </span>
                <span className="text-slate-800">{record.trailer_region}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo de Rodado
                </span>
                <span className="text-slate-800">{record.wheel_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo Carroceria
                </span>
                <span className="text-slate-800 font-semibold">{record.body_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Qtd. Eixos
                </span>
                <span className="text-slate-800 font-bold">
                  {record.axles_count || 'Não informado'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa Auxiliar 1
                </span>
                <span className="font-mono text-slate-800">{record.aux_plate_1}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  ANTT Auxiliar 1
                </span>
                <span className="font-mono text-slate-800">{record.aux_antt_1}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa Auxiliar 2 / ANTT 2
                </span>
                <span className="font-mono text-slate-800">
                  {record.aux_plate_2} ({record.aux_antt_2})
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 5: Capacidades */}
          <TabsContent value="capacidades" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="text-[#005596] block text-[10px] uppercase font-bold">
                  Capacidade KG
                </span>
                <strong className="text-xl text-[#005596] font-mono">
                  {record.capacity_kg ? record.capacity_kg.toLocaleString('pt-BR') : '0'} kg
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Capacidade M³
                </span>
                <strong className="text-xl text-slate-800 font-mono">
                  {record.capacity_m3 ? record.capacity_m3.toLocaleString('pt-BR') : '0'} m³
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tara</span>
                <strong className="text-xl text-slate-800 font-mono">
                  {record.tare_kg ? record.tare_kg.toLocaleString('pt-BR') : '0'} kg
                </strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo de Veículo
                </span>
                <span className="text-slate-800 font-semibold">{record.vehicle_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código Fornecedor SAP
                </span>
                <span className="font-mono text-slate-800">{record.supplier_code}</span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 6: Situação Cadastral */}
          <TabsContent value="situacao" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Status SAP
                </span>
                <div className="mt-1">
                  {isBlocked ? (
                    <Badge className="bg-rose-600 text-white">BLOQUEADO (B)</Badge>
                  ) : isApproved ? (
                    <Badge className="bg-emerald-600 text-white">APROVADO (A)</Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white">NÃO INFORMADO</Badge>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Integridade Cadastral
                </span>
                <span className="font-semibold text-slate-800 uppercase">
                  {record.integrity_status}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Data Último Frete
                </span>
                <span className="text-slate-800">{record.last_freight_date}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Motivo do Bloqueio
                </span>
                <span className="text-slate-800">
                  {record.block_reason || 'Nenhum bloqueio registrado.'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código TOTVS
                </span>
                <span className="font-mono text-slate-800">{record.totvs_code}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cta. Conciliação / Tesouraria
                </span>
                <span className="text-slate-800">
                  {record.reconciliation_account} / {record.treasury_admin_group}
                </span>
              </div>
            </div>

            {record.validation_issues && record.validation_issues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3">
                <span className="text-amber-800 font-bold block mb-1">
                  Pendências / Inconsistências Identificadas:
                </span>
                <ul className="list-disc pl-5 text-amber-900 space-y-0.5">
                  {record.validation_issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* Aba 7: Documentos */}
          <TabsContent value="documentos" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">CNH Anexada</strong>
                  <span className="text-[11px] text-slate-500">
                    Comprovante de CNH do motorista
                  </span>
                </div>
                {record.cnh_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Documento Veículo Anexado</strong>
                  <span className="text-[11px] text-slate-500">CRLV / Certificado de Registro</span>
                </div>
                {record.vehicle_doc_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Contrato Anexado</strong>
                  <span className="text-[11px] text-slate-500">Termo de Prestação de Serviços</span>
                </div>
                {record.contract_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
