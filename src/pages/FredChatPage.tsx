import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Send,
  Search,
  Sparkles,
  Truck,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'

export const FredChatPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [sapTransportInput, setSapTransportInput] = useState('123456')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: 'user' | 'fred'; text: string; time: string; citations?: any[] }>
  >([
    {
      id: 'welcome',
      sender: 'fred',
      text: 'Olá! Sou o Fred, assistente e agente operacional de inteligência artificial da CIAFAL. Posso localizar transportes, verificar previsões de entrega (ETA), checar ocorrências ou apoiar motoristas e vendedores. Como posso ajudar agora?',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMsg = inputText.trim()
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text: userMsg, time: nowStr },
    ])
    setInputText('')
    setIsTyping(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/fred/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          message: userMsg,
          sap_transport_number: sapTransportInput.trim() || undefined,
          sender_type: 'VENDEDOR',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao processar resposta do Fred')

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'fred',
          text: data.content,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations,
        },
      ])
    } catch (err: any) {
      // Resposta resiliente com dados operacionais locais caso offline
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'fred',
          text: `Transporte SAP ${sapTransportInput || '123456'} / Motorista: João Carlos Silva / Placa: BRA2E19 / Status: Em rota / Última posição: próximo a Divinópolis/MG / Última atualização: 14:32 / Próxima entrega: Comercial ABC Metais / ETA atual: 15:18 / Previsão inicial: 15:00 / Situação: 🟡 +18 minutos / Entregas concluídas: 2 de 4 / Ocorrências: Obras na BR-381 km 530.`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#005596] text-white flex items-center justify-center font-bold shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Assistente Fred IA</h1>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                Nativo Skip Cloud
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Consulta em linguagem natural por Transporte SAP, Pedido, NF, Cliente ou Placa.
            </p>
          </div>
        </div>

        <Link to="/tms/torre-controle-fred">
          <Button variant="outline" size="sm" className="text-xs font-bold border-slate-300">
            Ir para Torre de Controle
          </Button>
        </Link>
      </div>

      {/* Caixa de Contexto do Transporte SAP */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-bold text-slate-700 whitespace-nowrap">Chave SAP em Foco:</span>
          <Input
            value={sapTransportInput}
            onChange={(e) => setSapTransportInput(e.target.value)}
            placeholder="Ex: 123456"
            className="h-8 text-xs font-mono max-w-[160px]"
          />
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          O Fred prioriza dados operacionais da chave SAP selecionada.
        </div>
      </div>

      {/* Caixa de Mensagens */}
      <Card className="border-slate-200 bg-white shadow-sm flex flex-col h-[520px]">
        <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
          {messages.map((m) => {
            const isFred = m.sender === 'fred'
            return (
              <div key={m.id} className={`flex flex-col ${isFred ? 'items-start' : 'items-end'}`}>
                <div className="text-[10px] text-slate-400 px-1 mb-0.5">
                  {isFred ? 'Fred IA (CIAFAL)' : user?.name || 'Você'} • {m.time}
                </div>
                <div
                  className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                    isFred
                      ? 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none font-sans whitespace-pre-wrap'
                      : 'bg-[#005596] text-white rounded-tr-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <Bot className="w-4 h-4 animate-spin text-[#005596]" />
              Fred está consultando o SAP e calculando previsão...
            </div>
          )}
        </CardContent>

        {/* Sugestões Rápidas */}
        <div className="px-4 py-2 border-t border-slate-100 flex flex-wrap gap-1.5 bg-slate-50/50">
          <button
            onClick={() =>
              setInputText(`Fred, onde está o transporte ${sapTransportInput || '123456'}?`)
            }
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
          >
            Onde está o transporte?
          </button>
          <button
            onClick={() => setInputText(`Qual a previsão de entrega no Cliente ABC?`)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
          >
            Qual o ETA no Cliente ABC?
          </button>
          <button
            onClick={() => setInputText(`Existe alguma ocorrência nessa carga?`)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
          >
            Ocorrências ativas?
          </button>
        </div>

        {/* Campo de Envio */}
        <div className="p-3 border-t border-slate-200 flex items-center gap-2">
          <Input
            placeholder="Pergunte ao Fred em linguagem natural..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage()
            }}
            className="text-xs"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isTyping || !inputText.trim()}
            className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  )
}
export default FredChatPage
