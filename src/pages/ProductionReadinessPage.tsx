import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Server,
  Zap,
  RotateCcw,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ReadinessChecklistItem {
  id: string
  integration: string
  category: 'SAP' | 'PCP' | 'CRM' | 'ROTAS' | 'PEDAGIO' | 'ANTT' | 'TELEGRAM'
  title: string
  description: string
  isCritical: boolean // Se for crítico e não atendido, bloqueia Go-Live
  weight: number // Peso para cálculo do Score de Readiness
  status: 'HOMOLOGADO' | 'PENDENTE' | 'BLOQUEADO'
  technicalOwner: string
  blockerReason?: string
}

export const ProductionReadinessPage: React.FC = () => {
  const { toast } = useToast()

  const checklist: ReadinessChecklistItem[] = [
    // SAP ITEMS
    {
      id: 'READ-SAP-01',
      integration: 'SAP ECC 6.0',
      category: 'SAP',
      title: 'Conexão DEV / QAS Estabelecida',
      description: 'Host, system number, client e usuário técnico validados em DEV/QAS.',
      isCritical: true,
      weight: 15,
      status: 'HOMOLOGADO',
      technicalOwner: 'Consultoria SAP & TI CIAFAL',
    },
    {
      id: 'READ-SAP-02',
      integration: 'SAP ECC 6.0',
      category: 'SAP',
      title: 'Homologação Leitura da Carteira (ZSD35)',
      description: 'RFC/Interface ZSD35 confirmada e espelho funcional conferido.',
      isCritical: true,
      weight: 20,
      status: 'PENDENTE',
      technicalOwner: 'Consultoria SAP',
      blockerReason: 'Aguardando definição do objeto técnico RFC com a consultoria ABAP.',
    },
    {
      id: 'READ-SAP-03',
      integration: 'SAP ECC 6.0',
      category: 'SAP',
      title: 'Homologação Motoristas e Veículos (ZSD004V_V2)',
      description: 'Carga cadastral e sincronização incremental idempotente.',
      isCritical: true,
      weight: 15,
      status: 'PENDENTE',
      technicalOwner: 'Consultoria SAP',
      blockerReason: 'View confirmada funcionalmente, RFC a confirmar.',
    },
    {
      id: 'READ-SAP-04',
      integration: 'SAP ECC 6.0',
      category: 'SAP',
      title: 'Itinerários (TVROT) e Validação de Crédito Financeiro (KNKK)',
      description: 'Análise de crédito por valor financeiro e rotas padrão.',
      isCritical: true,
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'Controladoria & SAP',
    },

    // PCP ROBOTIZADO
    {
      id: 'READ-PCP-01',
      integration: 'PCP Robotizado',
      category: 'PCP',
      title: 'Contrato PCP, Schema JSON e Health Check',
      description: 'Endpoint HTTPS com mTLS, schema JSON estrito e detecção de incompatibilidade.',
      isCritical: false,
      weight: 8,
      status: 'HOMOLOGADO',
      technicalOwner: 'Automação Industrial',
    },

    // CRM 360
    {
      id: 'READ-CRM-01',
      integration: 'CRM 360°',
      category: 'CRM',
      title: 'Webhook Seguro e Idempotência de Oportunidades',
      description: 'Assinatura HMAC SHA-256, rate limiting e correlation_id.',
      isCritical: false,
      weight: 7,
      status: 'HOMOLOGADO',
      technicalOwner: 'Equipe CRM',
    },

    // ROTAS
    {
      id: 'READ-ROTAS-01',
      integration: 'Provedor de Rotas',
      category: 'ROTAS',
      title: 'Homologação de Provedor Rodoviário para Caminhões Pesados',
      description: 'Provedor homologado com suporte a caminhões e conformidade LGPD.',
      isCritical: true,
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'Arquitetura Logística',
    },

    // PEDAGIO
    {
      id: 'READ-PEDAGIO-01',
      integration: 'Provedor de Pedágio',
      category: 'PEDAGIO',
      title: 'Desacoplamento de Tarifação e Cobertura Nacional',
      description: 'Tarifador por número de eixos e praças oficiais.',
      isCritical: false,
      weight: 5,
      status: 'HOMOLOGADO',
      technicalOwner: 'Controladoria de Fretes',
    },

    // ANTT
    {
      id: 'READ-ANTT-01',
      integration: 'ANTT Oficial',
      category: 'ANTT',
      title: 'Tabela de Piso Mínimo com Vigência e Hash Criptográfico',
      description: 'Resolução ANTT nº 5.867/2019 com auditoria de integridade.',
      isCritical: true,
      weight: 5,
      status: 'HOMOLOGADO',
      technicalOwner: 'Jurídico & Compliance',
    },

    // TELEGRAM
    {
      id: 'READ-TG-01',
      integration: 'Telegram Bot',
      category: 'TELEGRAM',
      title: 'Canal de Mensageria Operacional Preparado',
      description: 'Webhook e modelo seguro de vinculação por ID de usuário.',
      isCritical: false,
      weight: 5,
      status: 'HOMOLOGADO',
      technicalOwner: 'TI & Operações',
    },
  ]

  // Cálculo determinístico do Score de Produção
  const totalWeight = checklist.reduce((acc, i) => acc + i.weight, 0)
  const homologatedWeight = checklist
    .filter((i) => i.status === 'HOMOLOGADO')
    .reduce((acc, i) => acc + i.weight, 0)
  const readinessScore = Math.round((homologatedWeight / totalWeight) * 100)

  // Identificação de bloqueadores críticos
  const criticalBlockers = checklist.filter((i) => i.isCritical && i.status !== 'HOMOLOGADO')

  // Status GO / NO-GO
  const goLiveDecision: 'GO' | 'GO COM RESTRIÇÕES' | 'NO-GO' =
    criticalBlockers.length > 0
      ? 'NO-GO'
      : checklist.some((i) => i.status !== 'HOMOLOGADO')
        ? 'GO COM RESTRIÇÕES'
        : 'GO'

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Readiness de Produção & Matriz GO / NO-GO
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Auditoria de Go-Live</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Avaliação formal de prontidão técnica, dependências sistêmicas e bloqueadores de
            produção.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            className={`text-sm px-3 py-1 font-bold ${
              goLiveDecision === 'GO'
                ? 'bg-emerald-600 text-white'
                : goLiveDecision === 'GO COM RESTRIÇÕES'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-600 text-white'
            }`}
          >
            Decisão Go-Live: {goLiveDecision}
          </Badge>
        </div>
      </div>

      {/* Score and Decision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Score Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">
              Score de Readiness Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-slate-900">{readinessScore}%</span>
              <span className="text-xs text-slate-500 font-semibold">de prontidão ponderada</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  readinessScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${readinessScore}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 block">
              Calculado com base no peso estrito de cada contrato de integração.
            </span>
          </CardContent>
        </Card>

        {/* Go/No-Go Decision Card */}
        <Card
          className={`border-2 shadow-sm ${
            goLiveDecision === 'NO-GO'
              ? 'border-rose-300 bg-rose-50/40'
              : goLiveDecision === 'GO COM RESTRIÇÕES'
                ? 'border-amber-300 bg-amber-50/40'
                : 'border-emerald-300 bg-emerald-50/40'
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-700">
              Diagnóstico de Liberação Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-xs">
            <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
              {goLiveDecision === 'NO-GO' ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {goLiveDecision}
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              {goLiveDecision === 'NO-GO'
                ? `Existem ${criticalBlockers.length} bloqueadores críticos na esteira SAP (Carteira ZSD35 e Motoristas ZSD004V_V2). O sistema opera em modo de HOMOLOGAÇÃO com escrita bloqueada no ERP.`
                : 'Todos os critérios obrigatórios foram homologados com sucesso.'}
            </p>
          </CardContent>
        </Card>

        {/* Critical Blockers Count Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">
              Bloqueadores Críticos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="text-3xl font-black text-rose-600">
              {criticalBlockers.length} itens críticos
            </div>
            <div className="text-[11px] text-slate-600 space-y-1">
              {criticalBlockers.map((b) => (
                <div key={b.id} className="font-semibold text-rose-900 truncate">
                  • {b.title}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dependency Matrix Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Matriz de Dependências Sistêmicas (TMS CIAFAL)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Relação direta entre cada canal de integração e o módulo funcional do TMS impactado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-medium">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                SAP Carteira (ZSD35)
              </span>
              <span className="text-slate-800 font-bold block mt-1">→ Planejador de Cargas</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Leitura em cache com data
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                SAP Motoristas (ZSD004V_V2)
              </span>
              <span className="text-slate-800 font-bold block mt-1">→ Fila & Disponibilidade</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Base local idempotente
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                PCP Robotizado
              </span>
              <span className="text-slate-800 font-bold block mt-1">→ Programação Futura</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Não considerar produção futura
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Provedor de Rotas
              </span>
              <span className="text-slate-800 font-bold block mt-1">
                → Roteirizador & Simulador
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Não inventar distâncias
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Provedor de Pedágio
              </span>
              <span className="text-slate-800 font-bold block mt-1">→ Tarifador de Custo</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Sinalizar indisponível
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                ANTT Oficial
              </span>
              <span className="text-slate-800 font-bold block mt-1">→ Mesa de Fretes</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Não calcular piso oficial
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">CRM 360°</span>
              <span className="text-slate-800 font-bold block mt-1">→ Complemento de Carga</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Enfileirar retry
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Telegram</span>
              <span className="text-slate-800 font-bold block mt-1">→ Notificação de Frete</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Fallback: Fila de reenvio assíncrono
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Checklist Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Checklist Completo de Homologação de Contratos
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Critérios ponderados com identificação de impacto e responsáveis técnicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Integração</th>
                  <th className="p-3">Critério de Homologação</th>
                  <th className="p-3">Criticidade</th>
                  <th className="p-3">Peso</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Bloqueador / Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {checklist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-700">{item.id}</td>
                    <td className="p-3 font-bold text-slate-900">{item.integration}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-slate-500 text-[10px]">{item.description}</div>
                    </td>
                    <td className="p-3">
                      {item.isCritical ? (
                        <Badge variant="destructive" className="text-[10px]">
                          CRÍTICO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          DESEJÁVEL
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">{item.weight}%</td>
                    <td className="p-3 text-slate-700">{item.technicalOwner}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          item.status === 'HOMOLOGADO'
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : 'bg-amber-500 text-white text-[10px]'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-rose-700 text-[10px] font-semibold">
                      {item.blockerReason || 'Conforme especificação.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
