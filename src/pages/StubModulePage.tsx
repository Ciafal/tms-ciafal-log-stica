import React from 'react'
import {
  Bot,
  Sparkles,
  Database,
  Send,
  MessageSquare,
  Activity,
  CalendarCheck,
  Package,
  BadgeDollarSign,
  MapPin,
  Construction,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StubModuleProps {
  title: string
  moduleName: string
  icon:
    | 'chicao'
    | 'fred'
    | 'sap'
    | 'telegram'
    | 'whatsapp'
    | 'bi'
    | 'planejamento'
    | 'cargas'
    | 'ofertas'
    | 'acompanhamento'
  description: string
  technicalDetails?: string[]
}

export const StubModulePage: React.FC<StubModuleProps> = ({
  title,
  moduleName,
  icon,
  description,
  technicalDetails,
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'chicao':
        return <Bot className="w-12 h-12 text-amber-500" />
      case 'fred':
        return <Sparkles className="w-12 h-12 text-purple-500" />
      case 'sap':
        return <Database className="w-12 h-12 text-[#005596]" />
      case 'telegram':
        return <Send className="w-12 h-12 text-sky-500" />
      case 'whatsapp':
        return <MessageSquare className="w-12 h-12 text-emerald-500" />
      case 'bi':
        return <Activity className="w-12 h-12 text-cyan-500" />
      case 'planejamento':
        return <CalendarCheck className="w-12 h-12 text-blue-600" />
      case 'cargas':
        return <Package className="w-12 h-12 text-orange-500" />
      case 'ofertas':
        return <BadgeDollarSign className="w-12 h-12 text-emerald-600" />
      case 'acompanhamento':
        return <MapPin className="w-12 h-12 text-indigo-500" />
      default:
        return <Construction className="w-12 h-12 text-slate-400" />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">{getIcon()}</div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] uppercase">
                  Em Desenvolvimento
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">{moduleName} • TMS CIAFAL</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6 text-sm">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-950 space-y-2">
            <h3 className="font-bold flex items-center gap-1.5 text-sm text-[#005596]">
              <ShieldAlert className="w-4 h-4" />
              Diretriz Arquitetural CIAFAL:
            </h3>
            <p className="text-xs text-slate-700 italic">
              "O agente conversa. O motor de regras decide. O SAP registra o documento corporativo.
              O TMS orquestra a logística."
            </p>
            <p className="text-xs text-slate-600">
              O modelo de IA nunca decide preço, frete, elegibilidade ou alçadas. A entrega atual
              foca exclusivamente no Gerenciamento Operacional da Fila de Motoristas.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Escopo Funcional Previsto:</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
          </div>

          {technicalDetails && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Especificações Técnicas:</h3>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
                {technicalDetails.map((det, idx) => (
                  <li key={idx}>
                    <span className="font-mono text-slate-800">{det}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
            Módulo planejado para a Sprint 2 de homologação. Todas as estruturas de dados e agentes
            nativos Skip Cloud já estão preparadas.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
