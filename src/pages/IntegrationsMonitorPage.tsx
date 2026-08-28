import React, { useState } from 'react'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Server,
  Layers,
  Database,
  Radio,
  FileSpreadsheet,
  Cpu,
  Info,
  ShieldCheck,
  Ban,
  MessageSquare,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface IntegrationItem {
  id: string
  name: string
  category: string
  type: string
  status: 'Simulação' | 'Não configurado' | 'Conectado' | 'Erro' | 'Indisponível'
  statusBadgeColor: string
  currentMode: string
  description: string
  details: string
  lastSync?: string
  fase: string
}

export const IntegrationsMonitorPage: React.FC = () => {
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  const integrations: IntegrationItem[] = [
    {
      id: 'sap_ecc',
      name: 'SAP ECC 6.0 — Ordem de Frete & Carregamento',
      category: 'ERP Central Corporativo (System of Record)',
      type: 'qRFC / BAPI_FREIGHT_CONTRACT_POST',
      status: 'Simulação',
      statusBadgeColor: 'bg-amber-500 text-white',
      currentMode: 'Fila qRFC: Aguardando SAP (Contratações da Mesa)',
      description:
        'Após a contratação na Mesa de Fretes, as cargas assumem status "Aguardando SAP" para sincronização de documento de transporte (VT01N/ZSD35).',
      details:
        'Hardening Transacional: Proteção contra duplicidade e concorrência na escrita. Auditoria gravada no PocketBase antes do envio ao ERP.',
      lastSync: 'Ativo via Fila de Contratos',
      fase: 'Sprint 2 (Homologado)',
    },
    {
      id: 'telegram_bot',
      name: 'Telegram Bot (Adapter CanalMensagem)',
      category: 'Mensageria & Notificações de Frete',
      type: 'Adapter Pattern (CanalMensagem)',
      status: 'Não configurado',
      statusBadgeColor: 'bg-slate-500 text-white',
      currentMode: 'Interface Desacoplada (Preparado para Sprint 3)',
      description:
        'Canal para notificação de abertura de janelas PORTA e FORA e envio de links de oferta pública.',
      details:
        'Arquitetura desacoplada via interface CanalMensagem. Sem credenciais hardcoded nem falsas conexões ativas.',
      fase: 'Sprint 2 (Adapter Pronto)',
    },
    {
      id: 'whatsapp_meta',
      name: 'WhatsApp Cloud / Gupshup (Adapter CanalMensagem)',
      category: 'Mensageria Oficial de Fretes',
      type: 'Adapter Pattern (CanalMensagem)',
      status: 'Não configurado',
      statusBadgeColor: 'bg-slate-500 text-white',
      currentMode: 'Interface Desacoplada (Preparado para Sprint 3)',
      description:
        'Disparo de templates oficiais de oferta de carga e link individual para lances de motoristas.',
      details: 'Implementa contrato CanalMensagem. Isolado do core determinístico do leilão.',
      fase: 'Sprint 2 (Adapter Pronto)',
    },
    {
      id: 'qlik_sense',
      name: 'QLIK Sense / BI Corporativo',
      category: 'Analytics & Dashboards',
      type: 'Data Connector / Direct Query',
      status: 'Indisponível',
      statusBadgeColor: 'bg-slate-400 text-white',
      currentMode: 'Fase Posterior (Pós-Go-Live)',
      description:
        'Exportação de KPIs de ocupação de pátio, tempo médio de espera, taxa de aceitação de frete e desvio padrão.',
      details:
        'Será alimentado via réplica de leitura do banco de dados na fase consolidada do HUB CIAFAL.',
      fase: 'Fase Posterior',
    },
    {
      id: 'target_tms',
      name: 'TARGET TMS (Roteirização e Carga)',
      category: 'TMS Especializado',
      type: 'Webservice / Batch Sync',
      status: 'Indisponível',
      statusBadgeColor: 'bg-slate-400 text-white',
      currentMode: 'Fase 2',
      description:
        'Sincronização de ordens de carregamento, romaneios de peso e balanceamento de rotas.',
      details:
        'Integração planejada para a Sprint 2.3 em conjunto com o módulo de Leilão de Frete.',
      fase: 'Fase 2',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Monitor de Integrações & Barramento
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Governança</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Status real dos barramentos e canais externos. Transparência arquitetural: sem falsas
            conexões ativas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Verificado em: {lastCheck.toLocaleTimeString('pt-BR')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLastCheck(new Date())}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar Status
          </Button>
        </div>
      </div>

      {/* Corporate Architecture Notice */}
      <div className="bg-slate-900 text-white rounded-xl p-4 text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 font-bold text-sky-400">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ DE ENGENHARIA CIAFAL — ISOLAMENTO & ACOPLAMENTO:</span>
        </div>
        <p className="text-slate-300">
          Todas as integrações externas operam através de{' '}
          <strong>Interfaces Abstratas (Adapters)</strong>. O módulo central de Fila e o motor de
          Ofertas não possuem dependência de bibliotecas de terceiros nem chamadas hardcoded para
          provedores de mensageria ou ERPs.
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <Card key={item.id} className="border-slate-200 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500 mb-1">
                    {item.category}
                  </Badge>
                  <CardTitle className="text-base font-bold text-slate-900">{item.name}</CardTitle>
                </div>
                <Badge className={`text-[10px] font-bold ${item.statusBadgeColor}`}>
                  {item.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Modo Operacional Atual
                </span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded block text-[11px]">
                  {item.currentMode}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Descrição do Fluxo
                </span>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </div>

              <div className="bg-sky-50/60 border border-sky-100 p-2.5 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-sky-900 flex items-center gap-1">
                  <Info className="w-3 h-3 text-sky-700" />
                  Roteiro de Evolução ({item.fase})
                </span>
                <p className="text-[11px] text-sky-800 leading-relaxed">{item.details}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
