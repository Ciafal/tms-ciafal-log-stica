import React, { useState } from 'react'
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Users,
  Lock,
  MessageSquare,
  Bot,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export const TelegramIntegrationPage: React.FC = () => {
  const { toast } = useToast()
  const [isBotConfigured, setIsBotConfigured] = useState(false)
  const [isTokenConfigured, setIsTokenConfigured] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Send className="w-6 h-6 text-sky-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Telegram — Canal de Mensageria & Abertura de Janelas
            </h1>
            <Badge className="bg-sky-500 text-white text-xs">Canal Notificação</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Notificação instantânea de cargas, envio de links individuais de leilão e vinculação
            segura de motoristas.
          </p>
        </div>

        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-900 border-amber-300 font-bold px-3 py-1"
        >
          Status: Aguardando Configuração de Bot / Token
        </Badge>
      </div>

      {/* Critical Strict Notice - Agente Chicão não iniciado */}
      <div className="bg-sky-50/70 text-slate-800 p-4 rounded-xl text-xs space-y-2 border border-sky-200 shadow-none">
        <div className="flex items-center space-x-2 text-[#005596] font-bold">
          <ShieldCheck className="w-4 h-4 text-[#005596]" />
          <span>DIRETRIZES DE CANAL DE MENSAGERIA & VINCULAÇÃO SEGURA:</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          1) <strong>Canal Operacional Controlado:</strong> O canal de mensageria opera com envio
          rastreável de links, ofertas e notificações.
          <br />
          2) <strong>Segurança de Credenciais:</strong> O token do Bot{' '}
          <strong>NUNCA É EXPOSTO</strong> na interface web nem em logs — exibindo unicamente{' '}
          <em>"Configurado"</em> ou <em>"Não configurado"</em>.<br />
          3) <strong>Vinculação Segura:</strong> Motoristas são identificados exclusivamente via ID
          numérico unívoco (<code>chat_id</code> / <code>user_id</code>) associado ao CPF
          cadastrado, <strong>NUNCA por nome livre</strong>.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Status do Bot & Parâmetros de Comunicação
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configurações de infraestrutura do Telegram Bot API.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Bot Criado
                </span>
                <span className="font-bold text-slate-700 text-[11px]">
                  @CiafalFretesBot (Aguardando Registro)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Token do Bot
                </span>
                <span className="font-mono font-bold text-amber-700 text-[11px]">
                  Não configurado (Mascarado)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Modo de Operação
                </span>
                <span className="font-bold text-slate-800 text-[11px]">Webhook Seguro (HTTPS)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Ambiente
                </span>
                <span className="font-bold text-slate-800 text-[11px]">
                  DEV / Homologação Técnica
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Motoristas Vinculados
                </span>
                <span className="font-bold text-slate-800 text-[11px]">0 motoristas</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Mensagens Enviadas
                </span>
                <span className="font-bold text-slate-800 text-[11px]">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card for Future Driver Access */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              QR Code de Acesso & Vinculação de Motorista
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Para uso na portaria / totem para o motorista iniciar a conversa segura com o Bot.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-3 bg-slate-50">
              <QrCode className="w-16 h-16 text-slate-400" />
              <span className="text-[10px] text-slate-500 mt-2 font-bold">
                QR Code de Vinculação
              </span>
            </div>
            <div className="text-xs text-slate-600 max-w-sm">
              Ao escanear este QR Code no totem ou portaria, o motorista abre o canal e realiza o
              opt-in de recebimento das ofertas de carga com vinculação do <code>chat_id</code>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
