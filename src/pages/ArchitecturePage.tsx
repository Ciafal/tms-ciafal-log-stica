import React from 'react'
import {
  Network,
  ArrowRight,
  ArrowLeftRight,
  Layers,
  Database,
  Server,
  ShieldCheck,
  Bot,
  Truck,
  Cpu,
  Workflow,
  CheckCircle2,
  CalendarCheck,
  BadgeDollarSign,
  Gavel,
  FileCheck,
  Zap,
  Radio,
  Clock,
  Compass,
  CreditCard,
  Scale,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Network className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Arquitetura TMS CIAFAL Logística
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Visão Macro Ponta a Ponta</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Topologia de fluxos corporativos, barramento de integrações e ciclo de vida operacional
            da carga.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className="bg-[#005596] text-white font-mono text-xs">
            Padrão: SAP System of Record
          </Badge>
        </div>
      </div>

      {/* Core Architectural Principle */}
      <div className="bg-[#005596] text-white p-5 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center space-x-2 font-bold text-sky-200 text-sm">
          <ShieldCheck className="w-5 h-5 text-sky-200" />
          <span>PRINCÍPIO ARQUITETURAL FUNDAMENTAL TMS CIAFAL:</span>
        </div>
        <p className="text-sm leading-relaxed text-white">
          <strong>
            "O agente conversa. O motor de regras decide. O SAP registra o documento corporativo. O
            TMS orquestra a logística."
          </strong>
          <br />
          Nenhuma integração externa possui escrita direta não auditada. O TMS é o hub central
          desacoplado que unifica a Fila, o Planejamento, o Roteirizador e a Mesa de Fretes.
        </p>
      </div>

      {/* Macro System Flow: SAP -> TMS <- PCP, CRM, Providers, ANTT */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-[#005596]" />
            1. Topologia Macro de Sistemas & Barramento de Integrações
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Fluxo bidirecional e unidirecional entre o ERP SAP ECC 6.0, Automação de Fábrica PCP,
            CRM 360°, Provedores e Órgãos Reguladores.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Top Systems Tier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {/* SAP ECC */}
            <div className="p-4 bg-sky-50 text-slate-900 rounded-xl shadow-xs border border-sky-200 space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-bold text-[#005596] text-sm">
                <Database className="w-4 h-4" />
                SAP ECC 6.0 (System of Record)
              </div>
              <p className="text-xs text-slate-600">
                Carteira ZSD35 • Motoristas ZSD004V_V2 • Estoque MB52 • Crédito KNKK • Transporte
                VT01N
              </p>
              <Badge className="bg-[#005596] text-white text-[10px]">Inbound / Outbound RFC</Badge>
            </div>

            {/* Central TMS */}
            <div className="p-4 bg-white border-2 border-[#005596] rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-black text-[#005596] text-base">
                <Cpu className="w-5 h-5 text-[#005596]" />
                TMS CIAFAL (Hub Orquestrador)
              </div>
              <p className="text-xs text-slate-700 font-medium">
                Motor Determinístico de Regras • Fila PORTA/FORA • Planejador • Mesa de Fretes •
                Auditoria
              </p>
              <Badge className="bg-[#005596] text-white text-[10px]">Core Logístico</Badge>
            </div>

            {/* PCP Robotizado */}
            <div className="p-4 bg-emerald-50 text-slate-900 rounded-xl shadow-xs border border-emerald-200 space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-800 text-sm">
                <Server className="w-4 h-4" />
                PCP Robotizado (Fábrica)
              </div>
              <p className="text-xs text-slate-600">
                Programação de Laminação • Previsão D+1/D+2 • Confiança de Produção • mTLS / JSON
              </p>
              <Badge className="bg-emerald-600 text-white text-[10px]">Inbound HTTPS mTLS</Badge>
            </div>
          </div>

          {/* Integration Connectors Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* CRM 360 */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
              <div className="font-bold text-purple-900 flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
                TMS ↔ CRM 360°
              </div>
              <p className="text-[11px] text-purple-800">
                Oportunidades de complemento de carga residual via Webhook HMAC SHA-256 e
                correlation_id.
              </p>
            </div>

            {/* Routing Provider */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-1">
              <div className="font-bold text-sky-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                TMS → Routing Provider
              </div>
              <p className="text-[11px] text-sky-800">
                Geocoding versionado, cálculo de rotas pesadas e matriz de distâncias
                (Multi-Adapter).
              </p>
            </div>

            {/* Toll Provider */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                TMS → Toll Provider
              </div>
              <p className="text-[11px] text-emerald-800">
                Cálculo de tarifas e praças de pedágio desacoplado do roteirizador por número de
                eixos.
              </p>
            </div>

            {/* ANTT Oficial */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                ANTT → TMS
              </div>
              <p className="text-[11px] text-amber-800">
                Tabela de piso mínimo regulatório oficial (Resolução 5.867/19) com validação de hash
                e vigência.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macro Operational Pipeline */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#005596]" />
            2. Ciclo Operacional da Carga (Pipeline Ponta a Ponta)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Da chegada do motorista à confirmação do transporte oficial no ERP SAP ECC.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-center text-xs">
            {[
              {
                step: '1',
                title: 'Fila & Totem',
                desc: 'Geofence PORTA/FORA e antiguidade',
                badge: 'Check-in',
                color: 'bg-slate-800',
              },
              {
                step: '2',
                title: 'Planejamento',
                desc: 'Carteira SAP + Estoque + PCP',
                badge: 'Simulação',
                color: 'bg-[#005596]',
              },
              {
                step: '3',
                title: 'Roteirizador',
                desc: 'Geocoding + Rota + Pedágio',
                badge: 'Multi-Adapter',
                color: 'bg-sky-600',
              },
              {
                step: '4',
                title: 'Carga Aprovada',
                desc: 'Validação pelo Gerente de Carga',
                badge: 'Geração Carga',
                color: 'bg-emerald-700',
              },
              {
                step: '5',
                title: 'Mesa de Fretes',
                desc: 'Piso ANTT + Teto Protegido',
                badge: 'Janelas PORTA/FORA',
                color: 'bg-[#005596]',
              },
              {
                step: '6',
                title: 'Leilão Determ.',
                desc: 'Lances válidos + Menor preço',
                badge: 'Desempate Fila',
                color: 'bg-amber-600',
              },
              {
                step: '7',
                title: 'Atribuição',
                desc: 'Vencedor retira da fila',
                badge: 'Atribuído',
                color: 'bg-purple-700',
              },
              {
                step: '8',
                title: 'SAP Transporte',
                desc: 'VT01N gerado ou pendente',
                badge: 'System of Record',
                color: 'bg-slate-900',
              },
            ].map((p) => (
              <div
                key={p.step}
                className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs hover:border-[#005596] transition"
              >
                <div>
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold mx-auto flex items-center justify-center text-xs mb-1.5">
                    {p.step}
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{p.title}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-1 leading-tight">
                    {p.desc}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge className={`${p.color} text-white text-[8px] font-sans px-1.5 py-0`}>
                    {p.badge}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Future Agents Tier: Chicão & Fred */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-600" />
            3. Camada Futura de Agentes Inteligentes (Chicão & Fred)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Agentes especializados atuam como interlocutores naturais sobre a base sólida do motor
            determinístico. NÃO iniciados na Sprint 4.2.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chicão */}
            <div className="p-4 bg-white border border-amber-200 rounded-xl shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Agente Chicão (Negociação & Leilão)
                  </span>
                </div>
                <Badge className="bg-rose-700 text-white text-[10px]">CHICÃO — NO-GO</Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interage com os motoristas via Telegram/WhatsApp na Mesa de Fretes. Conduz o leilão
                respeitando rigorosamente o piso ANTT e o teto orçamentário.
              </p>
              <div className="bg-amber-50 p-2.5 rounded-lg text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block">Pré-requisitos Obrigatórios de Ativação:</span>
                <div>• Mesa de Fretes e Fila 100% operacionais;</div>
                <div>• Proteção comprovada de teto orçamentário;</div>
                <div>• Telegram funcional com token de produção provisionado;</div>
                <div>• Fonte ANTT oficial homologada e dados reais do SAP;</div>
                <div>• Fallback operacional sem LLM garantido.</div>
              </div>
            </div>

            {/* Fred */}
            <div className="p-4 bg-white border border-purple-200 rounded-xl shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Agente Fred (Suporte & Rastreamento)
                  </span>
                </div>
                <Badge className="bg-rose-700 text-white text-[10px]">FRED — NO-GO</Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Atende clientes e representantes comerciais para consulta de status de entregas,
                previsão de chegada e acompanhamento da carga em trânsito.
              </p>
              <div className="bg-purple-50 p-2.5 rounded-lg text-[11px] text-purple-900 space-y-1">
                <span className="font-bold block">Pré-requisitos Obrigatórios de Ativação:</span>
                <div>• Transporte oficial SAP gerado (VT01N);</div>
                <div>• Módulo de acompanhamento logístico em tempo real;</div>
                <div>• Fonte de localização e telemetria conectada;</div>
                <div>• Autorização estrita por perfil cliente/representante (RBAC / LGPD).</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default ArchitecturePage
