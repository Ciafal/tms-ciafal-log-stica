import React from 'react'
import {
  Sparkles,
  Bot,
  Activity,
  Layers,
  Send,
  Building,
  Info,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const StubModulePage: React.FC<{
  title: string
  subtitle: string
  moduleKey: string
  statusText?: string
  statusColor?: string
}> = ({
  title,
  subtitle,
  moduleKey,
  statusText = 'Em desenvolvimento',
  statusColor = 'bg-amber-500',
}) => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h1>
            <Badge className={`${statusColor} text-white text-xs font-bold`}>{statusText}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Special Blueprint Architecture for PCP Robotizado */}
      {moduleKey === 'pcp' && (
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
            <div className="flex items-center space-x-2 text-blue-900 font-bold text-sm">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>PCP ROBOTIZADO — Integração Preparada</span>
            </div>
            <CardDescription className="text-xs">
              Interface conceitual e arquitetura de dados para conexão com a automação industrial
              CIAFAL.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-2">
              <div className="text-sky-400 font-bold uppercase text-[11px]">
                Fluxo de Integração Estabelecido:
              </div>
              <div className="flex items-center space-x-2 text-slate-200">
                <span>PCP ROBOTIZADO</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                <span>DATA PROGRAMADA DE PRODUÇÃO</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                <span>MATERIAL DISPONÍVEL</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                <span>TMS CIAFAL (PLANEJADOR DE CARGA)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <strong className="block text-slate-900">Campos Previstos no Contrato:</strong>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                  <li>Linha de Laminação / Perfilação</li>
                  <li>Código do Material (SAP MARA/MAKT)</li>
                  <li>Família do Produto (Vigas, Tubos, Chapas)</li>
                  <li>Quantidade Programada / Produzida (kg)</li>
                  <li>Data e Turno Previsto de Liberação</li>
                  <li>Status de Inspeção de Qualidade</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <strong className="block text-slate-900">Campos a Confirmar:</strong>
                <div className="text-[11px] text-slate-600 italic bg-amber-50 p-2 rounded border border-amber-200">
                  "A confirmar no Blueprint PCP/TMS durante a fase de implantação da esteira
                  robotizada."
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Enquanto a esteira não estiver ativa, os dados de produção são consultados na
                  carteira SAP ZSD35.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Blueprint Architecture for CRM 360 */}
      {moduleKey === 'crm' && (
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardHeader className="bg-purple-50/50 border-b border-purple-100 pb-3">
            <div className="flex items-center space-x-2 text-purple-900 font-bold text-sm">
              <Send className="w-4 h-4 text-purple-600" />
              <span>CRM 360° — Integração Preparada</span>
            </div>
            <CardDescription className="text-xs">
              Mecanismo de despacho de oportunidades logísticas para vendas e representantes
              comerciais.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-2">
              <div className="text-purple-400 font-bold uppercase text-[11px]">
                Fluxo de Oportunidades Comerciais:
              </div>
              <div className="flex items-center space-x-2 text-slate-200">
                <span>TMS (COMPLEMENTO)</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                <span>OPORTUNIDADE LOGÍSTICA</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                <span>CRM 360°</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                <span>VENDEDOR</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                <span>SAP (NOVO PEDIDO)</span>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-[11px] text-purple-900 space-y-1">
              <strong>Regra de Governança Estrita:</strong>
              <p>
                "O CRM 360° NÃO altera o planejamento oficial nem insere pedidos automaticamente na
                carga. O fluxo de complemento opera com indicação clara de oportunidade e aprovação
                obrigatória do Gerente de Carga."
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default In Development Architecture Card */}
      {moduleKey !== 'pcp' && moduleKey !== 'crm' && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Módulo em Desenvolvimento / Roadmap Oficial</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Estrutura e contratos definidos na arquitetura do TMS CIAFAL. Nenhuma simulação
              inexistente será apresentada.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Este módulo faz parte do escopo da plataforma integrada de transportes e será
              habilitado conforme as etapas de homologação avançarem.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
