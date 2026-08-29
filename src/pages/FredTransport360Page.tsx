import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  FredTransportEntity,
  FredDeliveryEntity,
  FredOccurrenceEntity,
  FredEvidenceEntity,
  FredMessageEntity,
  FredTimelineEventEntity,
  formatLocationFreshness,
  calculateEtaClassification,
  analyzeImageEvidence,
} from '@/domain/fredTrackingEngine'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  ShieldCheck,
  Send,
  Camera,
  Mic,
  FileText,
  UserCheck,
  Bot,
  ArrowLeft,
  Calendar,
  AlertOctagon,
  RefreshCw,
  Eye,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  formatCurrency,
  formatWeight,
  formatPercent,
  formatDate,
  formatDateTime,
  formatDurationMinutes,
} from '@/lib/utils'

export const FredTransport360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'visao-geral'

  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [transport, setTransport] = useState<FredTransportEntity | null>(null)
  const [deliveries, setDeliveries] = useState<FredDeliveryEntity[]>([])
  const [occurrences, setOccurrences] = useState<FredOccurrenceEntity[]>([])
  const [evidences, setEvidences] = useState<FredEvidenceEntity[]>([])
  const [messages, setMessages] = useState<FredMessageEntity[]>([])
  const [timelineEvents, setTimelineEvents] = useState<FredTimelineEventEntity[]>([])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [newMessageText, setNewMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Modal Escalonamento Humano
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState(false)
  const [takeoverReason, setTakeoverReason] = useState('')
  const [handbackNotes, setHandbackNotes] = useState('')

  // Modal Nova Ocorrência
  const [newOccurrenceDialogOpen, setNewOccurrenceDialogOpen] = useState(false)
  const [occCategory, setOccCategory] = useState<string>('CONGESTIONAMENTO')
  const [occDescription, setOccDescription] = useState('')
  const [occImpactMinutes, setOccImpactMinutes] = useState('20')

  // Modal Simulação de Upload de Foto/Áudio pelo Motorista
  const [mediaUploadOpen, setMediaUploadOpen] = useState(false)
  const [mediaFileName, setMediaFileName] = useState('foto_canhoto_entrega3.jpg')
  const [mediaDescription, setMediaDescription] = useState(
    'Canhoto assinado e carimbado na portaria',
  )
  const [mediaType, setMediaType] = useState<string>('CANHOTO_ASSINADO')

  // Modal Simulação de Envio de WhatsApp Webhook Oficial (Áudio / Texto / Localização / Contestação)
  const [wppSimDialogOpen, setWppSimDialogOpen] = useState(false)
  const [wppSimType, setWppSimType] = useState<string>('AUDIO')
  const [wppSimAudioText, setWppSimAudioText] = useState(
    'Vou atrasar umas duas horas por causa do trânsito na serra.',
  )
  const [wppSimLat, setWppSimLat] = useState('-23.5505')
  const [wppSimLng, setWppSimLng] = useState('-46.6333')

  // Disparo do Webhook do WhatsApp Business para Homologação
  const handleSimulateWhatsAppWebhook = async () => {
    if (!transport) return
    setIsSending(true)
    try {
      let payload: any = {
        phone: transport.driver_phone || '(11) 98765-4321',
        sender_name: transport.driver_name,
        sender_role: 'MOTORISTA',
        sap_transport_number: transport.sap_transport_number,
        type: wppSimType,
      }

      if (wppSimType === 'AUDIO') {
        payload.audio_url = 'https://storage.usecurling.com/audios/audio_motorista_gravacao.ogg'
        payload.audio_duration = 18
        payload.text = wppSimAudioText
      } else if (wppSimType === 'LOCALIZACAO') {
        payload.latitude = parseFloat(wppSimLat) || -23.5505
        payload.longitude = parseFloat(wppSimLng) || -46.6333
        payload.address = 'Rod. Anhanguera, km 64 - Jundiaí/SP'
        payload.text = 'Localização GPS compartilhada em tempo real via WhatsApp'
      } else {
        payload.text = wppSimAudioText
      }

      const res = await tmsService.sendWhatsAppWebhookEvent(payload)
      toast({
        title: 'Webhook WhatsApp Processado',
        description: `Intenção identificada: ${res.intent} • Resposta: ${res.response_sent}`,
      })
      setWppSimDialogOpen(false)
      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao disparar webhook WhatsApp',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Carregar dados completos do transporte SAP
  const loadTransportDetails = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      // 1. Busca transporte
      const t = await pb
        .collection('fred_transports')
        .getFirstListItem<FredTransportEntity>(`sap_transport_number = "${id}" || id = "${id}"`)
      setTransport(t)

      const sapNumber = t.sap_transport_number

      // 2. Busca entregas, ocorrências, evidências, mensagens e timeline
      const [delivs, occs, evids, msgs, times] = await Promise.all([
        pb.collection('fred_deliveries').getFullList<FredDeliveryEntity>({
          filter: `sap_transport_number = "${sapNumber}"`,
          sort: 'sequence_order',
        }),
        pb.collection('fred_occurrences').getFullList<FredOccurrenceEntity>({
          filter: `sap_transport_number = "${sapNumber}"`,
          sort: '-created',
        }),
        pb.collection('fred_evidences').getFullList<FredEvidenceEntity>({
          filter: `sap_transport_number = "${sapNumber}"`,
          sort: '-created',
        }),
        pb.collection('fred_messages').getFullList<FredMessageEntity>({
          filter: `sap_transport_number = "${sapNumber}"`,
          sort: 'created',
        }),
        pb.collection('fred_timeline_events').getFullList<FredTimelineEventEntity>({
          filter: `sap_transport_number = "${sapNumber}"`,
          sort: 'event_timestamp',
        }),
      ])

      setDeliveries(delivs)
      setOccurrences(occs)
      setEvidences(evids)
      setMessages(msgs)
      setTimelineEvents(times)
    } catch (err: any) {
      console.warn('Erro ao carregar detalhes do transporte:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransportDetails()
  }, [id])

  // Enviar Mensagem no Chat do Transporte (Integrado ao Fred)
  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !transport) return
    setIsSending(true)

    const text = newMessageText.trim()
    setNewMessageText('')

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/fred/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          message: text,
          sap_transport_number: transport.sap_transport_number,
          sender_type: 'OPERADOR_HUMANO',
        }),
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Falha ao conversar com Fred')

      toast({
        title: 'Mensagem enviada com sucesso',
        description: 'Interação registrada no histórico do transporte.',
      })

      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: err.message || 'Falha na comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Assumir Conversa (Humano)
  const handleTakeover = async () => {
    if (!transport) return
    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/fred/supervise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          action: 'takeover',
          sap_transport_number: transport.sap_transport_number,
          reason: takeoverReason || 'Intervenção operacional do operador',
        }),
      })

      if (!res.ok) throw new Error('Falha ao assumir controle')

      toast({
        title: 'Operador humano assumiu a conversa',
        description: 'Fred pausou respostas automáticas para este transporte.',
      })
      setTakeoverDialogOpen(false)
      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao assumir conversa',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Devolver Conversa para Fred IA
  const handleHandback = async () => {
    if (!transport) return
    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/fred/supervise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          action: 'handback',
          sap_transport_number: transport.sap_transport_number,
          notes: handbackNotes || 'Acompanhamento normal restabelecido',
        }),
      })

      if (!res.ok) throw new Error('Falha ao devolver para Fred')

      toast({
        title: 'Conversa devolvida para o Fred IA',
        description: 'Fred reassumiu o monitoramento autônomo.',
      })
      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao devolver conversa',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Registrar Ocorrência
  const handleCreateOccurrence = async () => {
    if (!transport || !occDescription.trim()) return
    try {
      await pb.collection('fred_occurrences').create({
        sap_transport_number: transport.sap_transport_number,
        driver_name: transport.driver_name,
        category: occCategory,
        severity: 'MEDIA',
        description: occDescription,
        estimated_impact_minutes: Number(occImpactMinutes) || 0,
        status: 'ABERTA',
        responsible_handler: user?.name || 'Operador Logística',
        human_confirmed: true,
        human_confirmed_by: user?.email,
      })

      // Registrar na timeline
      await pb.collection('fred_timeline_events').create({
        sap_transport_number: transport.sap_transport_number,
        event_code: 'OCCURRENCE_LOGGED',
        event_title: `Ocorrência: ${occCategory}`,
        event_description: occDescription,
        event_source: 'HUMANO',
        event_severity: 'WARNING',
        event_timestamp: new Date().toISOString(),
      })

      toast({
        title: 'Intercorrência registrada',
        description: 'Impacto de ETA recalculado e vinculado à timeline.',
      })
      setNewOccurrenceDialogOpen(false)
      setOccDescription('')
      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar ocorrência',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Simular Envio de Evidência pelo Motorista com Sugestão IA
  const handleUploadEvidence = async () => {
    if (!transport) return
    const suggestion = analyzeImageEvidence(mediaFileName, mediaDescription)

    try {
      await pb.collection('fred_evidences').create({
        sap_transport_number: transport.sap_transport_number,
        evidence_type: suggestion.suggestedTag,
        sender_role: 'MOTORISTA',
        sender_name: transport.driver_name,
        file_name: mediaFileName,
        ai_vision_description: suggestion.description,
        ai_suggested_tag: suggestion.suggestedTag,
        ai_confidence_pct: suggestion.confidencePct,
        is_human_validated: false,
        validation_notes: `Sugestão IA gerada (${suggestion.confidencePct}% de confiança). Exige confirmação humana.`,
      })

      // Timeline
      await pb.collection('fred_timeline_events').create({
        sap_transport_number: transport.sap_transport_number,
        event_code: 'EVIDENCE_RECEIVED',
        event_title: `Evidência Recebida: ${mediaFileName}`,
        event_description: `Sugestão Fred IA: ${suggestion.suggestedTag} (${suggestion.confidencePct}%).`,
        event_source: 'MOTORISTA',
        event_severity: 'INFO',
        event_timestamp: new Date().toISOString(),
      })

      toast({
        title: 'Evidência enviada com sucesso',
        description: suggestion.questionToDriver,
      })
      setMediaUploadOpen(false)
      loadTransportDetails()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar evidência',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  if (!transport && !isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Transporte SAP não encontrado</h2>
        <p className="text-xs text-slate-500">
          O identificador informado não está cadastrado na base de acompanhamento do Fred.
        </p>
        <Link to="/tms/torre-controle-fred">
          <Button size="sm" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para a Torre de Controle
          </Button>
        </Link>
      </div>
    )
  }

  const freshness = formatLocationFreshness(transport?.last_location_updated_at)

  return (
    <div className="space-y-5">
      {/* Header com Navegação e Resumo Chave */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/tms/torre-controle-fred">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#005596] text-white text-xs font-bold uppercase px-2 py-0.5">
                  TRANSPORTE SAP {transport?.sap_transport_number}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50">
                  {transport?.vehicle_plate}
                </Badge>
                {transport?.active_actor === 'HUMANO' ? (
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                    OPERADOR HUMANO ATIVO ({transport.human_takeover_user})
                  </Badge>
                ) : (
                  <Badge className="bg-sky-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    FRED IA CONDUZINDO
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <span>{transport?.driver_name}</span>
                <span className="text-xs text-slate-500 font-normal">
                  ({transport?.carrier_name || 'Frota Parceira CIAFAL'})
                </span>
              </h1>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex flex-wrap items-center gap-2">
            {transport?.active_actor === 'FRED_IA' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTakeoverDialogOpen(true)}
                className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Assumir Conversa
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleHandback}
                className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Bot className="w-3.5 h-3.5 mr-1.5" />
                Devolver para Fred IA
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewOccurrenceDialogOpen(true)}
              className="text-xs font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />+ Intercorrência
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setMediaUploadOpen(true)}
              className="text-xs font-bold border-slate-300"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Simular Envio de Foto/Áudio
            </Button>
          </div>
        </div>

        {/* Barra de Status 360 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Origem</span>
            <span className="font-bold text-slate-800">
              {transport?.origin_plant || 'CIAFAL Matriz'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Destino</span>
            <span className="font-bold text-slate-800 truncate block">
              {transport?.destination_summary || 'Itinerário MG001A'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Peso Total</span>
            <span className="font-bold text-slate-800">
              {formatWeight(transport?.total_weight_kg || 0)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Entregas</span>
            <span className="font-bold text-emerald-700">
              {transport?.completed_deliveries_count || 0} de{' '}
              {transport?.total_deliveries_count || 0} concluídas
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Próxima Parada
            </span>
            <span className="font-bold text-slate-800 truncate block">
              {transport?.current_next_stop_name || 'Cliente ABC'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              ETA Próxima Parada
            </span>
            <span className="font-bold text-amber-600">
              {transport?.current_next_stop_eta
                ? new Date(transport.current_next_stop_eta).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '15:18'}{' '}
              (🟡 +18m)
            </span>
          </div>
        </div>
      </div>

      {/* Abas da Visão 360 do Transporte */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-xs flex flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="text-xs font-bold">
            Visão Geral & Rota
          </TabsTrigger>
          <TabsTrigger value="entregas" className="text-xs font-bold">
            Entregas ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="ocorrencias" className="text-xs font-bold">
            Intercorrências ({occurrences.length})
          </TabsTrigger>
          <TabsTrigger value="conversa" className="text-xs font-bold">
            Conversa Fred ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="evidencias" className="text-xs font-bold">
            Fotos & Áudios ({evidences.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs font-bold">
            Linha do Tempo ({timelineEvents.length})
          </TabsTrigger>
          <TabsTrigger value="ia-analise" className="text-xs font-bold text-[#005596]">
            ✨ IA & Aprendizado
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Mapa e Posição Atual */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-200 bg-white">
                <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900">
                      Rastreamento Contínuo em Rota
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Traçado oficial CIAFAL com validação de desvios e telemetria
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${freshness.indicatorColor}`}
                  >
                    {freshness.formattedText}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Visualização da Rota de Fundo Claro */}
                  <div className="relative h-72 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex flex-col justify-between p-4 text-slate-900">
                    <div className="flex items-center justify-between z-10">
                      <span className="text-xs font-bold text-[#005596]">
                        📍 Posição: {transport?.last_location_name || 'BR-381 km 530'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Lat: {transport?.last_location_lat || -20.1438} • Lng:{' '}
                        {transport?.last_location_lng || -44.8862}
                      </span>
                    </div>

                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#005596_1.5px,transparent_1.5px)] [background-size:20px_20px]" />

                    {/* Timeline de marcos de trajeto */}
                    <div className="relative z-10 space-y-2 bg-white/95 p-3 rounded-lg border border-slate-200 shadow-xs">
                      <div className="text-[11px] font-bold text-slate-700">
                        Fluxo de Entregas da Carga:
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                          <div className="font-bold">1. Itaúna</div>
                          <div>✅ 10:45</div>
                        </div>
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                          <div className="font-bold">2. Divinópolis</div>
                          <div>✅ 13:25</div>
                        </div>
                        <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-900 animate-pulse font-medium">
                          <div className="font-bold">3. Betim</div>
                          <div>🚚 ETA 15:18</div>
                        </div>
                        <div className="p-2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                          <div className="font-bold">4. BH</div>
                          <div>⏳ ETA 16:55</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo Lateral de Contatos Comerciais e Confirmação de Descarga */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 bg-white">
                <CardHeader className="p-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-black text-slate-900">
                    Contatos & Representantes (CRM 360º)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Canais de acionamento imediato em caso de intercorrência
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-800">
                      Vendedor Responsável (Comercial ABC)
                    </div>
                    <div className="text-slate-600">Marcos Vendas • (11) 97777-2211</div>
                    <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700">
                      CRM 360º Notificado sobre +18m
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-800">Recebimento no Cliente</div>
                    <div className="text-slate-600">Valéria Recebimento • (31) 98822-3344</div>
                    <div className="text-[11px] text-amber-700 font-semibold">
                      Janela até 16:00 (Portaria 2) • Descarga confirmada pelo Fred
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ENTREGAS */}
        <TabsContent value="entregas" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-900">
                Sequência das Entregas Programadas
              </CardTitle>
              <CardDescription className="text-xs">
                Comparativo: Previsto Inicial × Previsão Atual (ETA) × Realizado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {deliveries.map((del) => {
                  const etaResult = calculateEtaClassification({
                    initialPlannedArrival: del.initial_planned_arrival || new Date(),
                    currentEstimatedArrival:
                      del.current_eta || del.initial_planned_arrival || new Date(),
                    isDelivered: del.status === 'ENTREGUE',
                    windowEndTimeStr: del.window_end_time,
                  })

                  return (
                    <div
                      key={del.id || del.customer_code}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#005596] text-white flex items-center justify-center font-bold text-xs">
                            {del.sequence_order}
                          </span>
                          <div>
                            <div className="font-black text-sm text-slate-900">
                              {del.customer_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {del.destination_city}/{del.destination_uf} • {del.street_address}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs font-bold ${etaResult.badgeColor}`}>
                            {etaResult.badgeLabel}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {formatWeight(del.weight_kg || 0)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Janela Permitida</span>
                          <span className="font-semibold text-slate-700">
                            {del.window_start_time} às {del.window_end_time}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Previsto Inicial</span>
                          <span className="font-semibold text-slate-700">
                            {del.initial_planned_arrival
                              ? new Date(del.initial_planned_arrival).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--:--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">ETA Atual / Real</span>
                          <span className="font-bold text-slate-900">
                            {del.status === 'ENTREGUE' && del.actual_arrival_at
                              ? new Date(del.actual_arrival_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : del.current_eta
                                ? new Date(del.current_eta).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--:--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Tempo Descarga Medido
                          </span>
                          <span className="font-semibold text-slate-700">
                            {del.measured_unloading_min
                              ? `${del.measured_unloading_min} min`
                              : `Estimado: ${del.avg_historical_unloading_min || 45} min`}
                          </span>
                        </div>
                      </div>

                      {del.unloading_restriction_notes && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                          <strong>Restrição do Cliente:</strong> {del.unloading_restriction_notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: OCORRÊNCIAS */}
        <TabsContent value="ocorrencias" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900">
                  Intercorrências Estruturadas na Viagem
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro auditável com impacto em ETA, evidências e responsáveis
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setNewOccurrenceDialogOpen(true)}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
              >
                + Nova Intercorrência
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {occurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700 text-white text-xs font-bold">
                          {occ.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-semibold">
                          Impacto: +{occ.estimated_impact_minutes || 0} min
                        </Badge>
                      </div>

                      <Badge
                        className={`text-xs font-bold ${
                          occ.status === 'RESOLVIDA'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {occ.status}
                      </Badge>
                    </div>

                    <div className="text-xs font-bold text-slate-800">{occ.description}</div>
                    <div className="text-[11px] text-slate-500">
                      Local: {occ.location_description || 'Em trânsito'} • Responsável:{' '}
                      {occ.responsible_handler}
                    </div>
                  </div>
                ))}

                {occurrences.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhuma intercorrência registrada nesta viagem.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CONVERSA FRED (HISTÓRICO ÚNICO MULTICANAL) */}
        <TabsContent value="conversa" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#005596]" />
                  Histórico Único de Conversa Multicanal
                </CardTitle>
                <CardDescription className="text-xs">
                  Integração Fred IA ↔ Motorista WhatsApp ↔ CRM 360º ↔ Operação CIAFAL
                </CardDescription>
              </div>

              {transport?.active_actor === 'HUMANO' && (
                <Badge className="bg-amber-600 text-white text-xs font-bold">
                  👤 Operador Humano Ativo
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Balões de Mensagem */}
              <div className="space-y-3 max-h-96 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {messages.map((msg) => {
                  const isAi = msg.sender_type === 'FRED_IA'
                  const isDriver = msg.sender_type === 'MOTORISTA'
                  const isProactive = msg.is_proactive_alert

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isAi ? 'items-start' : isDriver ? 'items-end' : 'items-center'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 px-1 mb-0.5">
                        {msg.sender_name} • {msg.message_channel}
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-md text-xs shadow-xs ${
                          isAi
                            ? isProactive
                              ? 'bg-amber-50 border border-amber-300 text-amber-900 rounded-tl-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                            : isDriver
                              ? 'bg-[#005596] text-white rounded-tr-none'
                              : 'bg-purple-100 border border-purple-300 text-purple-900'
                        }`}
                      >
                        {msg.audio_transcription && (
                          <div className="mb-1 text-[11px] font-semibold text-sky-300">
                            🎙️ Transcrição do Áudio:
                          </div>
                        )}
                        <div>{msg.message_text}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input de Envio de Mensagem */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Escreva uma mensagem para o motorista ou pergunte algo ao Fred..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage()
                  }}
                  className="text-xs"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessageText.trim()}
                  className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: EVIDÊNCIAS & ÁUDIOS */}
        <TabsContent value="evidencias" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900">
                  Evidências Fotográficas, Áudios Transcritos & Webhook WhatsApp
                </CardTitle>
                <CardDescription className="text-xs">
                  Classificação de áudios e comprovantes com auditoria integral e reconhecimento de
                  intenções
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setWppSimDialogOpen(true)}
                  className="bg-[#25D366] hover:bg-[#1ebd5b] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Simular Áudio/WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMediaUploadOpen(true)}
                  className="text-xs font-bold border-slate-300"
                >
                  + Enviar Comprovante
                </Button>
              </div>
            </CardHeader>{' '}
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidences.map((evid) => (
                  <div
                    key={evid.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#005596] text-white text-xs font-bold">
                        {evid.evidence_type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          evid.is_human_validated
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}
                      >
                        {evid.is_human_validated
                          ? '✓ Validado por Humano'
                          : '⏳ Sugestão IA (A Confirmar)'}
                      </Badge>
                    </div>

                    <div className="text-xs font-bold text-slate-800">{evid.file_name}</div>

                    {evid.audio_transcription ? (
                      <div className="p-2.5 rounded bg-sky-50 border border-sky-200 text-sky-900 text-xs">
                        <span className="font-bold block mb-1">
                          🎙️ Áudio Transcrito ({evid.audio_duration_seconds}s):
                        </span>
                        "{evid.audio_transcription}"
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                        {evid.ai_vision_description}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500">
                      Enviado por: {evid.sender_name} ({evid.sender_role})
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-900">
                Linha do Tempo Integrada da Viagem
              </CardTitle>
              <CardDescription className="text-xs">
                Eventos automáticos, SAP, localização, intervenções humanas e ações da IA
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="relative group">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#005596] flex items-center justify-center text-[10px] font-bold">
                      •
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">
                          {event.event_title}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold">
                          {event.event_source}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.event_timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{event.event_description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: IA & APRENDIZADO */}
        <TabsContent value="ia-analise" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#005596]" />
                Análise do Fred IA: Fatos Observados × Hipóteses e Aprendizado
              </CardTitle>
              <CardDescription className="text-xs">
                Princípio de Governança CIAFAL: Separação estrita entre medição real e sugestão
                estatística
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 space-y-2 text-xs">
                <div className="font-bold text-sky-950 flex items-center gap-2">
                  <span>📊 Tempo de Descarga: Comercial ABC Metais Ltda</span>
                  <Badge className="bg-sky-600 text-white text-[9px]">Confiança 92%</Badge>
                </div>

                <div className="space-y-1 text-slate-700">
                  <div>
                    <strong>Fato Observado:</strong> Tempo médio real de descarga nos últimos 90
                    dias = <strong>1h37</strong> (base de 14 entregas).
                  </div>
                  <div>
                    <strong>Hipótese da IA:</strong> Gargalo operacional de conferência manual no
                    cliente supera a estimativa padrão cadastral.
                  </div>
                  <div className="text-amber-800 font-semibold pt-1">
                    Sugestão Fred IA: Revisar parâmetro de roteirização de 45 min para 90 min. O
                    Fred considera 1h37 na projeção de ETA sem alterar silenciosamente o cadastro
                    mestre.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: ASSUMIR CONVERSA */}
      <Dialog open={takeoverDialogOpen} onOpenChange={setTakeoverDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Assumir Conversa do Transporte SAP {transport?.sap_transport_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Ao assumir o atendimento, o Fred IA pausará respostas automáticas para este motorista.
              O histórico de mensagens permanecerá único e auditado.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Motivo da Intervenção:</label>
              <Textarea
                placeholder="Ex.: Motorista com dúvida específica de endereço na entrada da portaria 2..."
                value={takeoverReason}
                onChange={(e) => setTakeoverReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setTakeoverDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleTakeover}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Confirmar e Assumir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NOVA OCORRÊNCIA */}
      <Dialog open={newOccurrenceDialogOpen} onOpenChange={setNewOccurrenceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              Registrar Intercorrência Operacional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Categoria:</label>
              <select
                value={occCategory}
                onChange={(e) => setOccCategory(e.target.value)}
                className="w-full p-2 rounded-md border border-slate-300 text-xs font-semibold"
              >
                <option value="CONGESTIONAMENTO">Congestionamento / Trânsito</option>
                <option value="ACIDENTE">Acidente na Rodovia</option>
                <option value="PANE_MECANICA">Pane Mecânica</option>
                <option value="PNEU">Problema com Pneu</option>
                <option value="CLIENTE_FECHADO">Cliente Fechado / Portaria</option>
                <option value="FILA_ESPERA">Fila de Espera para Descarga</option>
                <option value="DEMORA_DESCARGA">Demora Excessiva na Descarga</option>
                <option value="AVARIA_CARGA">Avaria na Carga</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Impacto Estimado (Minutos):</label>
              <Input
                type="number"
                value={occImpactMinutes}
                onChange={(e) => setOccImpactMinutes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Descrição Detalhada:</label>
              <Textarea
                placeholder="Descreva a ocorrência, local e ações em andamento..."
                value={occDescription}
                onChange={(e) => setOccDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewOccurrenceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOccurrence}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
            >
              Salvar Ocorrência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: SIMULAR ENVIO DE FOTO/ÁUDIO PELO MOTORISTA */}
      <Dialog open={mediaUploadOpen} onOpenChange={setMediaUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#005596]" />
              Simular Envio de Foto/Áudio pelo WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nome do Arquivo:</label>
              <Input
                value={mediaFileName}
                onChange={(e) => setMediaFileName(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Descrição / Legenda:</label>
              <Textarea
                value={mediaDescription}
                onChange={(e) => setMediaDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="p-2.5 rounded bg-sky-50 border border-sky-200 text-sky-900 text-[11px]">
              <strong>Regra de IA:</strong> O Fred analisará a imagem e fará uma pergunta de
              confirmação antes de assumir o status como fato definitivo.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setMediaUploadOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleUploadEvidence}
              className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
            >
              Enviar para o Fred
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SIMULADOR DE WEBHOOK WHATSAPP (ÁUDIO / INTENÇÕES / LOCALIZAÇÃO) */}
      <Dialog open={wppSimDialogOpen} onOpenChange={setWppSimDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#25D366]" />
              Simular Recepção de Áudio / Webhook WhatsApp Business
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Testa o pipeline: Recebe Áudio/Evento → Transcreve por IA → Classifica Intenção →
              Notifica Torre Fred.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tipo de Evento WhatsApp
              </label>
              <select
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                value={wppSimType}
                onChange={(e) => setWppSimType(e.target.value)}
              >
                <option value="AUDIO">Mensagem de Voz / Áudio (OGG)</option>
                <option value="LOCALIZACAO">Compartilhamento de Localização GPS</option>
                <option value="TEXTO">Mensagem de Texto do Motorista</option>
              </select>
            </div>

            {wppSimType === 'AUDIO' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Conteúdo da Fala do Motorista (Simulação de Áudio):
                </label>
                <textarea
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  rows={3}
                  value={wppSimAudioText}
                  onChange={(e) => setWppSimAudioText(e.target.value)}
                  placeholder="Ex: Vou atrasar umas duas horas por causa do trânsito / Estou parado porque furou o pneu / Quero contestar minha avaliação..."
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[9px] hover:bg-slate-100"
                    onClick={() =>
                      setWppSimAudioText(
                        'Vou atrasar umas duas horas por causa do trânsito na serra.',
                      )
                    }
                  >
                    Atraso 2h
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[9px] hover:bg-slate-100"
                    onClick={() =>
                      setWppSimAudioText(
                        'Estou parado no acostamento porque furou o pneu traseiro.',
                      )
                    }
                  >
                    Pneu Furado
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[9px] hover:bg-slate-100"
                    onClick={() =>
                      setWppSimAudioText('Cheguei no cliente e já descarreguei tudo, liberado.')
                    }
                  >
                    Fim Descarga
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-[9px] hover:bg-slate-100"
                    onClick={() =>
                      setWppSimAudioText(
                        'Quero contestar minha avaliação dessa viagem, o atraso foi na fábrica.',
                      )
                    }
                  >
                    Contestar Avaliação
                  </Badge>
                </div>
              </div>
            )}

            {wppSimType === 'LOCALIZACAO' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Latitude</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    value={wppSimLat}
                    onChange={(e) => setWppSimLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Longitude</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    value={wppSimLng}
                    onChange={(e) => setWppSimLng(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWppSimDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSimulateWhatsAppWebhook}
              disabled={isSending}
              className="bg-[#25D366] hover:bg-[#1ebd5b] text-white text-xs font-bold"
            >
              Processar Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default FredTransport360Page
