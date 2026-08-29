import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  MapPin,
  Clock,
  Camera,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Send,
  Bot,
  Layers,
  Award,
  Star,
  TrendingUp,
  MessageSquare,
  FileQuestion,
  ThumbsUp,
} from 'lucide-react'
import {
  generateDriverPersonalFeedback,
  DriverPersonalFeedbackData,
} from '@/domain/driverPerformanceEngine'
import { tmsService } from '@/services/tmsService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export const DriverMobileCompanionPage: React.FC = () => {
  const { sapNumber = '123456' } = useParams<{ sapNumber: string }>()
  const { toast } = useToast()

  const [geoAuthorized, setGeoAuthorized] = useState(true)
  const [currentStep, setCurrentStep] = useState<string>('EM_ROTA')
  const [messageText, setMessageText] = useState('')
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [showAppealModal, setShowAppealModal] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [appealType, setAppealType] = useState('OCORRENCIA_ATRIBUIDA')
  const [appealSubmitting, setAppealSubmitting] = useState(false)

  // Feedback do motorista gerado pelo Fred IA (Parte 3)
  const [feedbackData, setFeedbackData] = useState<DriverPersonalFeedbackData>(() =>
    generateDriverPersonalFeedback({
      driver_id: 'drv_joao_silva',
      driver_name: 'João Carlos Silva',
      score_consolidated: 93,
      score_punctuality: 96,
      score_fred_collaboration: 94,
      score_communication: 92,
      trips_evaluated_count: 28,
    }),
  )

  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Fred IA (CIAFAL)',
      text: 'João, considerando seus últimos 28 transportes com a CIAFAL: Score atual 93/100, Classificação Excelente, Pontualidade 96%, Entregas sem ocorrência atribuída 96%, Colaboração comigo 94%, Tendência estável. Seu principal ponto positivo é a pontualidade. Existe uma oportunidade de melhoria na comunicação antecipada de ocorrências.',
      time: '07:32',
    },
    {
      sender: 'Você (Motorista)',
      text: 'Opa Fred! Obrigado pelo retorno. Saí da matriz agora e vou manter você atualizado.',
      time: '07:35',
    },
  ])

  // Ações Rápidas de Motorista
  const handleInformArrival = () => {
    setCurrentStep('CHEGOU_CLIENTE')
    toast({
      title: 'Chegada registrada',
      description: 'Fred notificou a portaria e o vendedor responsável.',
    })
  }

  const handleStartUnloading = () => {
    setCurrentStep('EM_DESCARGA')
    toast({
      title: 'Início de descarga registrado',
      description: 'Cronômetro operacional iniciado.',
    })
  }

  const handleFinishUnloading = () => {
    setCurrentStep('DESCARGA_CONCLUIDA')
    toast({
      title: 'Descarga concluída',
      description: 'Por favor, envie a foto do canhoto assinado.',
    })
  }

  const handleSendMessage = () => {
    if (!messageText.trim()) return
    const text = messageText.trim()
    setMessageText('')
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    let reply = `Entendido! Mensagem recebida e vinculada ao Transporte SAP ${sapNumber}.`
    if (
      text.toLowerCase().includes('score') ||
      text.toLowerCase().includes('desempenho') ||
      text.toLowerCase().includes('nota')
    ) {
      reply = feedbackData.fredConversationalText
    }

    setMessages((prev) => [
      ...prev,
      { sender: 'Você (Motorista)', text, time },
      {
        sender: 'Fred IA (CIAFAL)',
        text: reply,
        time,
      },
    ])
  }

  // Submissão do Direito de Contestação do Motorista
  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      toast({
        title: 'Informe a justificativa',
        description: 'Descreva o motivo da solicitação de revisão.',
        variant: 'destructive',
      })
      return
    }

    setAppealSubmitting(true)
    try {
      await tmsService.submitDriverPerformanceAppeal({
        driver_id: feedbackData.driverId,
        driver_name: feedbackData.driverName,
        sap_transport_number: sapNumber,
        appeal_type: appealType,
        reason_text: appealReason,
        status: 'SOLICITADA',
        ai_pre_summary: `Motorista solicita revisão da ocorrência no SAP ${sapNumber}. Justificativa: "${appealReason.slice(0, 80)}..."`,
      })

      toast({
        title: 'Solicitação de Revisão Enviada!',
        description:
          'Sua contestação foi encaminhada para a revisão humana da gestão logística CIAFAL.',
        className: 'bg-emerald-600 text-white',
      })
      setAppealReason('')
      setShowAppealModal(false)

      setMessages((prev) => [
        ...prev,
        {
          sender: 'Fred IA (CIAFAL)',
          text: `Recebi sua solicitação de revisão para o transporte SAP ${sapNumber}. Nossa equipe humana de gestão logística foi acionada para analisar as evidências com prioridade.`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar contestação',
        description: err?.message || 'Falha ao registrar pedido.',
        variant: 'destructive',
      })
    } finally {
      setAppealSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4 p-2 pb-10">
      {/* Header Compacto Mobile */}
      <div className="bg-[#005596] text-white p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <Badge className="bg-white/20 text-white text-[10px] font-bold">CIAFAL MOTORISTA</Badge>
          <span className="text-xs font-mono">SAP {sapNumber}</span>
        </div>

        <div>
          <h1 className="text-lg font-black tracking-tight">João Carlos Silva</h1>
          <p className="text-xs text-sky-200">Placa: BRA2E19 • Carreta LS</p>
        </div>

        {/* Status de GPS & LGPD */}
        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Localização Ativa</span>
          </div>
          <span className="text-[10px] text-sky-200">LGPD Autorizado</span>
        </div>
      </div>

      {/* NOVO: CARD "MEU DESEMPENHO — FRED" (PARTE 3) */}
      <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#005596]" />
            <span className="text-xs font-black uppercase text-slate-800">
              Meu Desempenho CIAFAL
            </span>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
            {feedbackData.classification}
          </Badge>
        </div>

        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-[#005596]">
                {feedbackData.scoreConsolidated}
              </span>
              <span className="text-xs text-slate-400 font-bold">/100</span>
              <span className="text-amber-500 text-sm ml-1">★★★★★</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Baseado em {feedbackData.tripsEvaluatedCount} transportes
            </span>
          </div>

          <div className="text-right space-y-0.5 text-[11px]">
            <div className="text-emerald-700 font-bold">
              Pontualidade: {feedbackData.punctualityPct}%
            </div>
            <div className="text-slate-600">Sem Ocorrência: {feedbackData.cleanDeliveriesPct}%</div>
            <div className="text-sky-700 font-semibold">
              Colaboração Fred: {feedbackData.fredCollaborationPct}%
            </div>
          </div>
        </div>

        {/* Botões Grandes Mobile-First */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => setShowPerformanceModal(true)}
            className="w-full bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold py-2.5 h-auto shadow-sm"
          >
            Ver Detalhes & Pontos Fortes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAppealModal(true)}
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold py-2.5 h-auto"
          >
            Discorda? Pedir Revisão
          </Button>
        </div>
      </Card>

      {/* Próxima Parada em Destaque */}
      <Card className="border-slate-200 bg-white shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Próxima Entrega</span>
          <Badge className="bg-amber-500 text-white text-[10px] font-bold">ETA 15:18</Badge>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-900">Comercial ABC Metais Ltda</h2>
          <p className="text-xs text-slate-500">Av. das Indústrias, 1020 - Portaria 2 (Betim/MG)</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">
            ⚠️ Entrada permitida até 16:00 exclusivamente pela Portaria 2.
          </p>
        </div>

        {/* Botões de Ação Operacional em 1 Clique */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            onClick={handleInformArrival}
            className="text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white h-auto py-2"
          >
            Cheguei
          </Button>

          <Button
            size="sm"
            onClick={handleStartUnloading}
            className="text-[10px] font-bold bg-[#005596] hover:bg-[#004275] text-white h-auto py-2"
          >
            Iniciei Descarga
          </Button>

          <Button
            size="sm"
            onClick={handleFinishUnloading}
            className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-auto py-2"
          >
            Concluí
          </Button>
        </div>
      </Card>

      {/* Chat Fred Direto para o Motorista */}
      <Card className="border-slate-200 bg-white shadow-xs flex flex-col h-80">
        <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-[#005596]" />
            Conversa com Fred IA
          </CardTitle>
          <span className="text-[10px] text-slate-400">WhatsApp Integrado</span>
        </CardHeader>

        <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                m.sender.includes('Você')
                  ? 'ml-auto bg-[#005596] text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="text-[9px] opacity-70 mb-0.5">
                {m.sender} • {m.time}
              </div>
              <div>{m.text}</div>
            </div>
          ))}
        </CardContent>

        <div className="p-2 border-t border-slate-200 flex items-center gap-1.5 bg-slate-50">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500">
            <Camera className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500">
            <Mic className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Mensagem para Fred..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="h-8 text-xs bg-white"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            className="h-8 px-2.5 bg-[#005596] text-white"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
      {/* MODAL DETALHES DE PERFORMANCE (MEU DESEMPENHO) */}
      <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#005596]" />
              Painel de Desempenho do Motorista
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {feedbackData.driverName} • {feedbackData.tripsEvaluatedCount} viagens concluídas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Mensagem Conversacional do Fred */}
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-slate-800 space-y-1">
              <span className="font-bold text-[#005596] flex items-center gap-1.5">
                <Bot className="w-4 h-4" /> Mensagem do Fred:
              </span>
              <p className="text-xs leading-relaxed text-slate-700">
                "{feedbackData.fredConversationalText}"
              </p>
            </div>

            {/* Seus Pontos Fortes (máx 3) */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <ThumbsUp className="w-4 h-4 text-emerald-600" /> Seus Pontos Fortes:
              </span>
              <div className="space-y-1.5">
                {feedbackData.topStrengths.map((str, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200"
                  >
                    <strong className="text-emerald-950 block">{str.title}</strong>
                    <span className="text-[11px] text-slate-700">{str.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Oportunidades de Melhoria (Tom Não Punitivo) */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-amber-600" /> Oportunidade de Desenvolvimento:
              </span>
              <div className="space-y-1.5">
                {feedbackData.growthOpportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200"
                  >
                    <strong className="text-amber-950 block">{opp.title}</strong>
                    <span className="text-[11px] text-slate-700">{opp.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reconhecimentos e Conquistas */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Award className="w-4 h-4 text-[#005596]" /> Reconhecimentos CIAFAL:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {feedbackData.recognitions.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1"
                  >
                    <span className="text-xl block">{rec.icon}</span>
                    <strong className="text-[11px] text-slate-900 block">{rec.title}</strong>
                    <span className="text-[9px] text-slate-500 block">{rec.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evolução dos Últimos Meses */}
            <div className="space-y-1.5 pt-2 border-t">
              <span className="font-bold text-slate-700 text-[11px]">
                Evolução do Score (Últimos Meses):
              </span>
              <div className="grid grid-cols-5 gap-1 text-center">
                {feedbackData.monthlyHistory.map((m, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">{m.month}</span>
                    <strong className="text-xs text-[#005596]">{m.score}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setShowPerformanceModal(false)}
              className="w-full bg-[#005596] text-white font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DIREITO DE CONTESTAÇÃO / SOLICITAR REVISÃO */}
      <Dialog open={showAppealModal} onOpenChange={setShowAppealModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-amber-600" />
              Solicitar Revisão Humana
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Transporte SAP {sapNumber} • Sua solicitação será analisada pela gestão logística.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tipo de Contestação:</label>
              <select
                value={appealType}
                onChange={(e) => setAppealType(e.target.value)}
                className="w-full p-2 border rounded-md text-xs bg-white"
              >
                <option value="OCORRENCIA_ATRIBUIDA">Ocorrência atribuída indevidamente</option>
                <option value="AVALIACAO_NOTA">Nota ou avaliação de carregamento/descarga</option>
                <option value="ATRASO_IMPUTADO">Atraso gerado por fila do cliente / rodovia</option>
                <option value="OUTRO">Outro motivo operacional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Descreva sua justificativa:</label>
              <Textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explique o ocorrido detalhadamente (ex: cliente fechou portaria antes do horário combinado)..."
                className="text-xs h-24"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              ℹ️ A IA do Fred registrará o resumo, mas a decisão final é 100% realizada por um
              gestor humano da CIAFAL.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowAppealModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitAppeal}
              disabled={appealSubmitting}
              className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
            >
              {appealSubmitting ? 'Enviando...' : 'Enviar Contestação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default DriverMobileCompanionPage
