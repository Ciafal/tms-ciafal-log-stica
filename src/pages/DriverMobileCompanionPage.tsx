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
} from 'lucide-react'

export const DriverMobileCompanionPage: React.FC = () => {
  const { sapNumber = '123456' } = useParams<{ sapNumber: string }>()
  const { toast } = useToast()

  const [geoAuthorized, setGeoAuthorized] = useState(true)
  const [currentStep, setCurrentStep] = useState<string>('EM_ROTA')
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Fred IA (CIAFAL)',
      text: 'Olá, João! Sou o Fred, assistente de transporte da CIAFAL. Vou acompanhar sua viagem e ajudar durante as entregas.',
      time: '07:32',
    },
    {
      sender: 'Você (Motorista)',
      text: 'Opa Fred! Saí da matriz agora.',
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

    setMessages((prev) => [
      ...prev,
      { sender: 'Você (Motorista)', text, time },
      {
        sender: 'Fred IA (CIAFAL)',
        text: `Entendido! Mensagem recebida e vinculada ao Transporte SAP ${sapNumber}.`,
        time,
      },
    ])
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
    </div>
  )
}
export default DriverMobileCompanionPage
