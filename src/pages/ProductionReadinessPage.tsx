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
  Bot,
  Truck,
  FileCode,
  Network,
  Cpu,
  Lock,
  Compass,
  CreditCard,
  Scale,
  Send,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export type ReadinessCriticality = 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA'
export type ReadinessSectionType =
  | 'SOFTWARE'
  | 'SAP'
  | 'PCP'
  | 'CRM'
  | 'ROTAS'
  | 'PEDÁGIOS'
  | 'ANTT'
  | 'TELEGRAM'

export interface GeneralReadinessItem {
  id: string
  section: ReadinessSectionType
  title: string
  description: string
  criticality: ReadinessCriticality
  weight: number
  status: 'HOMOLOGADO' | 'AGUARDANDO CONFIGURAÇÃO' | 'A CONFIRMAR' | 'PENDENTE'
  technicalOwner: string
  blockerReason?: string
  fallbackStrategy: string
}

export interface AgentReadinessItem {
  id: string
  title: string
  description: string
  isMandatory: boolean
  isReady: boolean
  verificationDetails: string
}

export const ProductionReadinessPage: React.FC = () => {
  const { toast } = useToast()

  // 1. READINESS GERAL POR SEÇÕES ESTRUTURADAS COM CRITICIDADE
  const generalChecklist: GeneralReadinessItem[] = [
    // SOFTWARE (Testes, Regressão, Segurança)
    {
      id: 'SEC-SOFT-01',
      section: 'SOFTWARE',
      title: 'Suíte Completa de Testes Automatizados (100+ Testes)',
      description:
        'Testes de regras de negócio, integrações, contratos e concorrência executados sem skips.',
      criticality: 'CRÍTICA',
      weight: 15,
      status: 'HOMOLOGADO',
      technicalOwner: 'Engenharia de Software TMS',
      fallbackStrategy: 'Pipeline de CI/CD bloqueante.',
    },
    {
      id: 'SEC-SOFT-02',
      section: 'SOFTWARE',
      title: 'Segurança, RBAC Estrito e Conformidade LGPD',
      description: 'Mascaramento estrito de CPF/CNPJ/Telefones e sanitização de logs de auditoria.',
      criticality: 'CRÍTICA',
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'Segurança & Compliance',
      fallbackStrategy: 'Controle de acesso por permissões estritas no AuthContext.',
    },
    {
      id: 'SEC-SOFT-03',
      section: 'SOFTWARE',
      title: 'Proteção Inegociável de Teto Orçamentário',
      description:
        'Regra de teto protegida no motor de leilão, sem vazamento do valor nas recusas.',
      criticality: 'CRÍTICA',
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'Engenharia de Custos',
      fallbackStrategy: 'Rejeição determinística no domain/rules.ts.',
    },

    // SAP (Blueprint, RFCs, DEV, QAS)
    {
      id: 'SEC-SAP-01',
      section: 'SAP',
      title: 'Isolamento de Ambientes DEV / QAS / PRD',
      description:
        'Bloqueio estrito de escrita em PRD a partir de DEV; verificação de ambiente ativa.',
      criticality: 'CRÍTICA',
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'TI Infra & SAP Basis',
      fallbackStrategy: 'SapGateway bloqueia chamadas não autorizadas.',
    },
    {
      id: 'SEC-SAP-02',
      section: 'SAP',
      title: 'Blueprint Técnico SAP (12 Interfaces Mapeadas)',
      description:
        'Mapeamento formal de tabelas e RFCs (ZSD35, ZSD004V_V2, TVROT, KNKK, MB52, VT01N).',
      criticality: 'ALTA',
      weight: 8,
      status: 'HOMOLOGADO',
      technicalOwner: 'Consultoria ABAP & Negócios',
      fallbackStrategy: 'Checklist com 42 perguntas pronto para consultoria.',
    },
    {
      id: 'SEC-SAP-03',
      section: 'SAP',
      title: 'RFC Leitura da Carteira de Pedidos (ZSD35)',
      description: 'Contrato da RFC customizada para extração da carteira de vendas.',
      criticality: 'CRÍTICA',
      weight: 15,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'Consultoria ABAP',
      blockerReason: 'Aguardando definição técnica da RFC com a consultoria ABAP contratada.',
      fallbackStrategy: 'Modo contingência com importação de dados e espelho funcional.',
    },
    {
      id: 'SEC-SAP-04',
      section: 'SAP',
      title: 'RFC Motoristas e Veículos (ZSD004V_V2)',
      description: 'Sincronização cadastral incremental idempotente de motoristas/caminhões.',
      criticality: 'CRÍTICA',
      weight: 12,
      status: 'A CONFIRMAR',
      technicalOwner: 'Consultoria ABAP',
      blockerReason: 'View confirmada funcionalmente, RFC a confirmar com a consultoria.',
      fallbackStrategy: 'Base local idempotente com validação estrita de CPF/Placa.',
    },
    {
      id: 'SEC-SAP-05',
      section: 'SAP',
      title: 'Criação de Transporte Oficial (VT01N / BAPI)',
      description: 'Geração do documento oficial de transporte no SAP após homologação do leilão.',
      criticality: 'CRÍTICA',
      weight: 15,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'Consultoria ABAP & Logística',
      blockerReason: 'Escrita desabilitada por segurança (SAP_WRITE_ENABLED = false).',
      fallbackStrategy: 'Status TRANSPORTE_SAP_PENDENTE com correlation_id e auditoria.',
    },

    // PCP (Endpoint)
    {
      id: 'SEC-PCP-01',
      section: 'PCP',
      title: 'Contrato de Integração PCP Robotizado (mTLS / JSON)',
      description:
        'Especificação do endpoint, schema JSON, cálculo de staleness e detecção de incompatibilidade.',
      criticality: 'ALTA',
      weight: 8,
      status: 'HOMOLOGADO',
      technicalOwner: 'Automação Industrial',
      fallbackStrategy: 'Planejador opera com estoque MB52 confirmado se PCP offline.',
    },
    {
      id: 'SEC-PCP-02',
      section: 'PCP',
      title: 'Conexão ao Endpoint Real de Produção PCP',
      description: 'Credenciais de certificado mTLS e endpoint de produção da planta.',
      criticality: 'ALTA',
      weight: 7,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'TI Automação CIAFAL',
      blockerReason: 'Aguardando provisionamento do endpoint mTLS em rede interna.',
      fallbackStrategy:
        'Aguardando configuração — dados do PCP mantidos em cache com flag staleness.',
    },

    // CRM (Endpoint / Webhook)
    {
      id: 'SEC-CRM-01',
      section: 'CRM',
      title: 'Webhook Seguro HMAC SHA-256 e Rate Limiting',
      description: 'Contrato de mensageria para envio de oportunidades de complemento de carga.',
      criticality: 'MÉDIA',
      weight: 6,
      status: 'HOMOLOGADO',
      technicalOwner: 'Equipe CRM 360°',
      fallbackStrategy: 'Enfileiramento de retry com circuit breaker.',
    },
    {
      id: 'SEC-CRM-02',
      section: 'CRM',
      title: 'Endpoint Produtivo do CRM 360°',
      description: 'URL de webhook comercial e chave secreta compartilhada em produção.',
      criticality: 'MÉDIA',
      weight: 5,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'Gestor Comercial CRM',
      blockerReason: 'Aguardando homologação de API comercial pelo time de vendas.',
      fallbackStrategy: 'Oportunidades salvas no TMS com status OPORTUNIDADE_ENVIADA_CRM.',
    },

    // ROTAS (Provider homologado)
    {
      id: 'SEC-ROTAS-01',
      section: 'ROTAS',
      title: 'POC Comparativo e Multi-Adapter de Roteirização',
      description:
        'Adapters Google Maps, HERE, Mapbox e OSRM com cache versionado e tolerância a falhas.',
      criticality: 'ALTA',
      weight: 8,
      status: 'HOMOLOGADO',
      technicalOwner: 'Arquitetura Logística',
      fallbackStrategy: 'Fallback determinístico geocodificado com flag ENDERECO_REQUER_VALIDACAO.',
    },
    {
      id: 'SEC-ROTAS-02',
      section: 'ROTAS',
      title: 'Decisão Humana e Homologação Final de Provider de Rotas',
      description: 'Homologação corporativa formal de provider com suporte a caminhões pesados.',
      criticality: 'ALTA',
      weight: 8,
      status: 'A CONFIRMAR',
      technicalOwner: 'Diretoria de Logística CIAFAL',
      blockerReason: 'Decisão humana pendente entre Google Maps e HERE Truck Routing.',
      fallbackStrategy: 'Google Maps mantido como adapter de referência com chave configurável.',
    },

    // PEDÁGIOS (Provider homologado)
    {
      id: 'SEC-PED-01',
      section: 'PEDÁGIOS',
      title: 'Desacoplamento de TollProvider e Tarifação por Eixos',
      description:
        'Motor de cálculo paramétrico independente por itinerário e categoria de eixos (TollEngine v1).',
      criticality: 'ALTA',
      weight: 7,
      status: 'HOMOLOGADO',
      technicalOwner: 'Controladoria de Fretes',
      fallbackStrategy: 'TollEngine paramétrico interno com desvio < 5% em rotas conhecidas.',
    },
    {
      id: 'SEC-PED-02',
      section: 'PEDÁGIOS',
      title: 'Homologação de Provider Online de Pedágios (Sem Parar / Concessionárias)',
      description:
        'Contrato corporativo e credenciais de API online de praças de pedágio em tempo real.',
      criticality: 'MÉDIA',
      weight: 5,
      status: 'A CONFIRMAR',
      technicalOwner: 'Suprimentos & TI',
      blockerReason: 'Aguardando proposta comercial e decisão executiva.',
      fallbackStrategy: 'TollEngine interno com cálculo de praças por quilometragem.',
    },

    // ANTT (Fonte homologada)
    {
      id: 'SEC-ANTT-01',
      section: 'ANTT',
      title: 'Workflow de Homologação em 7 Etapas (Schema, Vigência, Hash)',
      description:
        'Motor de cálculo desacoplado da fonte oficial com identificação mandatória de SIMULAÇÃO.',
      criticality: 'CRÍTICA',
      weight: 10,
      status: 'HOMOLOGADO',
      technicalOwner: 'Jurídico & Compliance',
      fallbackStrategy:
        'Tabela de referência identificada expressamente como "NÃO OFICIAL / SIMULAÇÃO".',
    },
    {
      id: 'SEC-ANTT-02',
      section: 'ANTT',
      title: 'Fornecimento e Homologação da Fonte Oficial ANTT para Produção',
      description: 'Disponibilização da API/Base oficial do Ministério dos Transportes/ANTT.',
      criticality: 'CRÍTICA',
      weight: 12,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'Ministério / ANTT / CIAFAL',
      blockerReason:
        'A fonte oficial continua pendente de definição técnica externa. Não inventada.',
      fallbackStrategy: 'Mesa de fretes opera com simulação de piso mínimo regulatório auditada.',
    },

    // TELEGRAM (Bot / Token)
    {
      id: 'SEC-TG-01',
      section: 'TELEGRAM',
      title: 'Contrato de Mensageria e Webhook Seguro Telegram Bot',
      description: 'Vinculação de motoristas por ID e número de telefone com HMAC e rate limiting.',
      criticality: 'MÉDIA',
      weight: 5,
      status: 'HOMOLOGADO',
      technicalOwner: 'TI & Operações',
      fallbackStrategy: 'Painel da Mesa de Fretes e Totem PORTA como canais diretos.',
    },
    {
      id: 'SEC-TG-02',
      section: 'TELEGRAM',
      title: 'Token Produtivo do Bot Telegram (@CiafalFretesBot)',
      description: 'Token de bot oficial provisionado no Skip Cloud Secrets (TELEGRAM_BOT_TOKEN).',
      criticality: 'BAIXA',
      weight: 4,
      status: 'AGUARDANDO CONFIGURAÇÃO',
      technicalOwner: 'Operações Logísticas',
      blockerReason: 'Aguardando provisionamento do bot oficial de produção.',
      fallbackStrategy: 'Mensagens enfileiradas no log com correlation_id.',
    },
  ]

  // 2. CHECKLIST READINESS CHICÃO (IA DE NEGOCIAÇÃO)
  const chicaoChecklist: AgentReadinessItem[] = [
    {
      id: 'CHK-CHI-01',
      title: 'Mesa de Fretes Pronta e Operacional',
      description: 'Painel com gestão de janelas PORTA/FORA e recepção de lances.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Página MesaFretesPage funcional com regras de negócio completas.',
    },
    {
      id: 'CHK-CHI-02',
      title: 'Motor de Leilão Pronto e Determinístico',
      description:
        'Funções evaluateProposalPriceRules e selectWinningProposal com desempate por fila.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Validado em 30 testes de negócio e 43 testes de integração.',
    },
    {
      id: 'CHK-CHI-03',
      title: 'Teto Orçamentário Protegido (Sem Vazamento)',
      description: 'Valor máximo nunca exposto ao motorista ou nos logs de recusa.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Regra estrita no domain/rules.ts com verificação automatizada.',
    },
    {
      id: 'CHK-CHI-04',
      title: 'Fila e Disponibilidade Pronta (PORTA/FORA)',
      description:
        'Classificação por geofence, ordenação por antiguidade e vínculo com placa/documento.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'QueueDashboard e TotemEntry ativos com cálculo de tempo.',
    },
    {
      id: 'CHK-CHI-05',
      title: 'Canal de Mensageria Telegram Funcional',
      description: 'Disparo de alertas de oferta e recepção de confirmações.',
      isMandatory: true,
      isReady: false,
      verificationDetails:
        'Contrato homologado, pendente provisionamento de token do bot produtivo.',
    },
    {
      id: 'CHK-CHI-06',
      title: 'Fonte ANTT Oficial ou Política de Frete Aprovada',
      description: 'Piso regulatório oficial validado ou diretriz corporativa expressa.',
      isMandatory: true,
      isReady: false,
      verificationDetails: 'Aguardando fonte oficial da ANTT; operando em modo SIMULAÇÃO.',
    },
    {
      id: 'CHK-CHI-07',
      title: 'Dados Mínimos Reais SAP (Carteira e Veículos)',
      description: 'Extração homologada de ZSD35 e ZSD004V_V2 em DEV/QAS.',
      isMandatory: true,
      isReady: false,
      verificationDetails: 'Blueprint pronto, aguardando consultoria ABAP para liberação de RFCs.',
    },
    {
      id: 'CHK-CHI-08',
      title: 'Trilha de Auditoria Imutável Ativa',
      description: 'Gravação de audit_logs com correlation_id e sanitização de dados sensíveis.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'AuditLogsPage e publishEvent ativos no domínio.',
    },
    {
      id: 'CHK-CHI-09',
      title: 'Fallback Operacional sem LLM',
      description: 'Operação manual garantida pelo operador na Mesa de Fretes mesmo sem IA.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Todas as ações de abertura, lance e fechamento funcionam manualmente.',
    },
  ]

  // 3. CHECKLIST READINESS FRED (IA DE SUPORTE E RASTREAMENTO)
  const fredChecklist: AgentReadinessItem[] = [
    {
      id: 'CHK-FRE-01',
      title: 'Transporte Oficial SAP Gerado (VT01N)',
      description: 'Número oficial de transporte corporativo registrado no ERP.',
      isMandatory: true,
      isReady: false,
      verificationDetails: 'Aguardando habilitação de escrita SAP (SAP_WRITE_ENABLED = false).',
    },
    {
      id: 'CHK-FRE-02',
      title: 'Status Logístico Estruturado no Domínio',
      description: 'Estados padronizados: gerada, atribuido, em_transito, entregue, cancelado.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Definido no schema e nos fluxos do TMS.',
    },
    {
      id: 'CHK-FRE-03',
      title: 'Módulo de Rastreamento e Acompanhamento',
      description: 'Interface de monitoramento de status da carga e posições.',
      isMandatory: true,
      isReady: false,
      verificationDetails: 'Tela de acompanhamento em desenvolvimento (Sprint posterior).',
    },
    {
      id: 'CHK-FRE-04',
      title: 'Controle de Autorização e Perfil de Acesso',
      description: 'Garantia de que cliente/representante só acessa pedidos próprios.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'RBAC configurado com perfil cliente e representante.',
    },
    {
      id: 'CHK-FRE-05',
      title: 'Fonte de Localização / Status Homologada',
      description: 'Telemetria ou check-ins de motorista conectados.',
      isMandatory: true,
      isReady: false,
      verificationDetails: 'Aguardando homologação de provedor de rastreamento/telemetria.',
    },
    {
      id: 'CHK-FRE-06',
      title: 'Segurança de Dados e Isolamento LGPD',
      description: 'Ausência de exposição de dados de concorrentes ou valores confidenciais.',
      isMandatory: true,
      isReady: true,
      verificationDetails: 'Sanitização de logs e mascaramento de documentos ativos.',
    },
  ]

  // CÁLCULOS DETERMINÍSTICOS DE READINESS
  const totalWeight = generalChecklist.reduce((acc, i) => acc + i.weight, 0)
  const homologatedWeight = generalChecklist
    .filter((i) => i.status === 'HOMOLOGADO')
    .reduce((acc, i) => acc + i.weight, 0)
  const generalScore = Math.round((homologatedWeight / totalWeight) * 100)

  // Bloqueadores críticos do TMS Geral
  const criticalPendingItems = generalChecklist.filter(
    (i) => i.criticality === 'CRÍTICA' && i.status !== 'HOMOLOGADO',
  )

  // Decisão TMS Geral
  const tmsDecision: 'GO' | 'GO COM RESTRIÇÕES' | 'NO-GO' =
    criticalPendingItems.length > 0
      ? 'NO-GO'
      : generalChecklist.some((i) => i.status !== 'HOMOLOGADO')
        ? 'GO COM RESTRIÇÕES'
        : 'GO'

  // Decisão Chicão
  const chicaoMissingMandatory = chicaoChecklist.filter((i) => i.isMandatory && !i.isReady)
  const chicaoDecision: 'GO' | 'CHICÃO — NO-GO' =
    chicaoMissingMandatory.length === 0 ? 'GO' : 'CHICÃO — NO-GO'

  // Decisão Fred
  const fredMissingMandatory = fredChecklist.filter((i) => i.isMandatory && !i.isReady)
  const fredDecision: 'GO' | 'FRED — NO-GO' =
    fredMissingMandatory.length === 0 ? 'GO' : 'FRED — NO-GO'

  const getCriticalityBadge = (crit: ReadinessCriticality) => {
    switch (crit) {
      case 'CRÍTICA':
        return (
          <Badge variant="destructive" className="text-[10px] font-bold">
            CRÍTICA
          </Badge>
        )
      case 'ALTA':
        return <Badge className="bg-amber-600 text-white text-[10px] font-bold">ALTA</Badge>
      case 'MÉDIA':
        return <Badge className="bg-blue-600 text-white text-[10px]">MÉDIA</Badge>
      case 'BAIXA':
        return (
          <Badge variant="outline" className="text-slate-600 text-[10px]">
            BAIXA
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: GeneralReadinessItem['status']) => {
    switch (status) {
      case 'HOMOLOGADO':
        return <Badge className="bg-emerald-600 text-white text-[10px]">HOMOLOGADO</Badge>
      case 'AGUARDANDO CONFIGURAÇÃO':
        return (
          <Badge className="bg-amber-500 text-white text-[10px]">AGUARDANDO CONFIGURAÇÃO</Badge>
        )
      case 'A CONFIRMAR':
        return <Badge className="bg-sky-600 text-white text-[10px]">A CONFIRMAR</Badge>
      case 'PENDENTE':
        return <Badge className="bg-rose-600 text-white text-[10px]">PENDENTE</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Readiness de Produção & Matriz de Liberação (GO / NO-GO)
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Sprint 4.2 Conclusão</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auditoria formal de prontidão técnica com seções estruturadas, classificação de
            criticidade e checklists dos Agentes Chicão e Fred.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={`text-xs px-3 py-1 font-bold ${
              tmsDecision === 'GO'
                ? 'bg-emerald-600 text-white'
                : tmsDecision === 'GO COM RESTRIÇÕES'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-600 text-white'
            }`}
          >
            TMS: {tmsDecision}
          </Badge>
          <Badge
            className={`text-xs px-3 py-1 font-bold ${
              chicaoDecision === 'GO' ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'
            }`}
          >
            {chicaoDecision}
          </Badge>
          <Badge
            className={`text-xs px-3 py-1 font-bold ${
              fredDecision === 'GO' ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'
            }`}
          >
            {fredDecision}
          </Badge>
        </div>
      </div>

      {/* Top 3 Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Score Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">
              Score de Readiness Técnico Ponderado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-slate-900">{generalScore}%</span>
              <span className="text-xs text-slate-500 font-semibold">de prontidão homologada</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  generalScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${generalScore}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 block">
              Calculado sobre {generalChecklist.length} critérios em 8 seções técnicas com pesos
              ponderados.
            </span>
          </CardContent>
        </Card>

        {/* Chicão Readiness Card */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
              <span>Readiness Agente Chicão</span>
              <Bot className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base">{chicaoDecision}</span>
              <Badge className="bg-amber-600 text-white text-[10px]">
                {chicaoChecklist.filter((c) => c.isReady).length}/{chicaoChecklist.length} prontos
              </Badge>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {chicaoMissingMandatory.length > 0
                ? `Bloqueado por ${chicaoMissingMandatory.length} itens: ${chicaoMissingMandatory.map((m) => m.title).join('; ')}.`
                : 'Todos os pré-requisitos do Chicão foram homologados.'}
            </p>
          </CardContent>
        </Card>

        {/* Fred Readiness Card */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
              <span>Readiness Agente Fred</span>
              <Truck className="w-4 h-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base">{fredDecision}</span>
              <Badge className="bg-purple-600 text-white text-[10px]">
                {fredChecklist.filter((c) => c.isReady).length}/{fredChecklist.length} prontos
              </Badge>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {fredMissingMandatory.length > 0
                ? `Bloqueado por ${fredMissingMandatory.length} itens: ${fredMissingMandatory.map((m) => m.title).join('; ')}.`
                : 'Todos os pré-requisitos do Fred foram homologados.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="geral" className="text-xs font-semibold">
            1. Readiness Geral do Sistema ({generalChecklist.length} Critérios / 8 Seções)
          </TabsTrigger>
          <TabsTrigger value="chicao" className="text-xs font-semibold">
            2. Checklist Readiness Chicão (IA Negociação)
          </TabsTrigger>
          <TabsTrigger value="fred" className="text-xs font-semibold">
            3. Checklist Readiness Fred (IA Suporte/Rastreamento)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: READINESS GERAL */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Matriz de Prontidão Técnica Operacional (TMS CIAFAL)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Critérios classificados por Criticidade (CRÍTICA / ALTA / MÉDIA / BAIXA) e Seção
                Técnica. Sem simulações ou afirmações de homologação fictícia.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <th className="p-3">Seção</th>
                      <th className="p-3">ID / Critério</th>
                      <th className="p-3">Criticidade</th>
                      <th className="p-3">Peso</th>
                      <th className="p-3">Status Atual</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3">Bloqueador Real / Estratégia de Fallback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {generalChecklist.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] font-bold bg-white"
                          >
                            {item.section}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            {item.description}
                          </div>
                        </td>
                        <td className="p-3">{getCriticalityBadge(item.criticality)}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{item.weight}%</td>
                        <td className="p-3">{getStatusBadge(item.status)}</td>
                        <td className="p-3 text-slate-700 font-medium">{item.technicalOwner}</td>
                        <td className="p-3">
                          {item.blockerReason && (
                            <div className="text-rose-700 font-semibold text-[10px] mb-1">
                              ⚠️ {item.blockerReason}
                            </div>
                          )}
                          <div className="text-slate-500 text-[10px]">
                            <strong>Fallback:</strong> {item.fallbackStrategy}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CHECKLIST CHICÃO */}
        <TabsContent value="chicao" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-amber-600" />
                    Checklist de Pré-Requisitos para Inicialização do Agente Chicão
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    O Chicão NÃO é iniciado na Sprint 4.2. Se faltar qualquer item crítico, o status
                    é estritamente "CHICÃO — NO-GO".
                  </CardDescription>
                </div>
                <Badge className="bg-rose-700 text-white font-mono text-xs px-3 py-1">
                  Status Atual: CHICÃO — NO-GO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {chicaoChecklist.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.isReady ? 'bg-white' : 'bg-rose-50/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {item.id}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        {item.isMandatory && (
                          <Badge variant="destructive" className="text-[9px]">
                            OBRIGATÓRIO
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{item.description}</p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Verificação Técnica:</strong> {item.verificationDetails}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.isReady ? (
                        <Badge className="bg-emerald-600 text-white text-xs gap-1 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PRONTO
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 text-white text-xs gap-1 py-1">
                          <XCircle className="w-3.5 h-3.5" />
                          BLOQUEANTE
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CHECKLIST FRED */}
        <TabsContent value="fred" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-purple-600" />
                    Checklist de Pré-Requisitos para Inicialização do Agente Fred
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    O Fred NÃO é iniciado na Sprint 4.2. Se faltar transporte oficial SAP ou
                    rastreamento, o status é estritamente "FRED — NO-GO".
                  </CardDescription>
                </div>
                <Badge className="bg-rose-700 text-white font-mono text-xs px-3 py-1">
                  Status Atual: FRED — NO-GO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {fredChecklist.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.isReady ? 'bg-white' : 'bg-purple-50/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {item.id}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        {item.isMandatory && (
                          <Badge variant="destructive" className="text-[9px]">
                            OBRIGATÓRIO
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{item.description}</p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Verificação Técnica:</strong> {item.verificationDetails}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.isReady ? (
                        <Badge className="bg-emerald-600 text-white text-xs gap-1 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PRONTO
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 text-white text-xs gap-1 py-1">
                          <XCircle className="w-3.5 h-3.5" />
                          BLOQUEANTE
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default ProductionReadinessPage
