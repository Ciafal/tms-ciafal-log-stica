import React, { useState, useEffect } from 'react'
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
  Navigation,
  DollarSign,
  FileCheck,
  RotateCcw,
  Zap,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { IntegrationHealthMetric, IntegrationLogEntry } from '@/domain/integrationsCore'
import { routingServiceManager } from '@/domain/routingAdapters'
import { anttEngine } from '@/domain/anttAndTollEngine'
import { sapGateway } from '@/domain/sapGateway'

export const IntegrationsMonitorPage: React.FC = () => {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<IntegrationHealthMetric[]>([])
  const [logs, setLogs] = useState<IntegrationLogEntry[]>([])
  const [blueprint, setBlueprint] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('hub')
  const [selectedMetric, setSelectedMetric] = useState<IntegrationHealthMetric | null>(null)
  const [activeRoutingProvider, setActiveRoutingProvider] = useState(routingServiceManager.activeId)

  const loadData = async () => {
    try {
      setIsRefreshing(true)
      const [mList, bList, lList] = await Promise.all([
        TmsService.getIntegrationHealthMetrics(),
        TmsService.getSapBlueprintMappings(),
        TmsService.getIntegrationLogs(50),
      ])
      setMetrics(mList)
      setBlueprint(bList)
      setLogs(lList)
      setLastCheck(new Date())
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao sincronizar barramento',
        description: err?.message || 'Não foi possível carregar a saúde das integrações.',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectRoutingProvider = (provId: string) => {
    routingServiceManager.setActiveProvider(provId)
    setActiveRoutingProvider(provId)
    toast({
      title: 'Provedor de Roteirização Atualizado',
      description: `O TMS agora utilizará ${routingServiceManager.getActiveAdapter().name} para cálculo de distâncias.`,
    })
    loadData()
  }

  const handleRetryLog = async (logId: string) => {
    const res = await TmsService.retryIntegrationLog(logId, 'admin@ciafal.logistica')
    if (res.success) {
      toast({
        title: 'Retentativa enfileirada',
        description: res.message,
      })
      loadData()
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao reprocessar',
        description: res.message,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Conectado':
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Conectado</Badge>
      case 'Degradado':
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Degradado</Badge>
      case 'Aguardando configuração':
        return (
          <Badge className="bg-sky-600 text-white hover:bg-sky-700">Aguardando configuração</Badge>
        )
      case 'Erro':
        return <Badge className="bg-rose-600 text-white hover:bg-rose-700">Erro</Badge>
      case 'Desabilitado':
        return <Badge className="bg-slate-500 text-white hover:bg-slate-600">Desabilitado</Badge>
      case 'Simulação':
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700">Simulação</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getBlueprintBadge = (st: string) => {
    switch (st) {
      case 'Confirmado':
      case 'Homologado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
            {st}
          </Badge>
        )
      case 'Em desenvolvimento':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">{st}</Badge>
        )
      case 'A confirmar':
        return <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold">{st}</Badge>
      case 'Será Z':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold">
            {st}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-600">
            {st}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Monitor Central de Integrações & Barramento Operacional
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Sprint 4</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Governança, observabilidade e rastreabilidade transacional: SAP ECC, PCP Robotizado, CRM
            360°, Rotas, Pedágios e ANTT Oficial.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-900 border-amber-300 px-3 py-1 text-xs font-bold"
          >
            Ambiente Conectado: DEV (Homologação Técnica)
          </Badge>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Atualizado: {lastCheck.toLocaleTimeString('pt-BR')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </div>

      {/* Corporate Architecture Strict Notice */}
      <div className="bg-slate-900 text-white rounded-xl p-4 text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 font-bold text-sky-400">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ ARQUITETURAL DE ENGENHARIA CIAFAL — SEM CONEXÕES FICTÍCIAS:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          <strong>System of Record:</strong> SAP ECC 6.0 EHP8 é a única fonte da verdade de
          documentos oficiais (RFC/BAPI/IDoc). <strong>PCP Robotizado:</strong> fonte da programação
          operacional. <strong>CRM 360°:</strong> ação comercial. Interfaces sem homologação de
          credenciais operam estritamente como{' '}
          <span className="text-sky-300 font-bold">"Aguardando configuração"</span> com isolamento
          determinístico e rastreabilidade por Correlation ID.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="hub" className="text-xs font-semibold">
            1. Painel de Barramento
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="text-xs font-semibold">
            2. Blueprint SAP/TMS
          </TabsTrigger>
          <TabsTrigger value="routing" className="text-xs font-semibold">
            3. Provedores de Rotas
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-semibold">
            4. Fila & Logs Rastreáveis
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PAINEL DE BARRAMENTO */}
        <TabsContent value="hub" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((item) => (
              <Card
                key={item.id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono text-slate-500 mb-1"
                      >
                        {item.category}
                      </Badge>
                      <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                        {item.name}
                      </CardTitle>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Protocolo
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {item.protocol}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Contrato
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {item.contractVersion}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Latência Média
                      </span>
                      <span className="font-bold text-slate-900 text-[11px]">
                        {item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Fila / Retries
                      </span>
                      <span className="font-bold text-slate-900 text-[11px]">
                        {item.pendingQueueCount} pend / {item.retriesCount} retry
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Responsabilidade Arquitetural
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Ambiente: <strong className="text-slate-700">{item.environment}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMetric(item)}
                      className="text-xs text-[#005596] hover:bg-sky-50 h-7 px-2"
                    >
                      Ver Detalhes Técnicos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: BLUEPRINT SAP/TMS */}
        <TabsContent value="blueprint" className="space-y-4 mt-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Blueprint de Integração SAP ECC 6.0 ↔ TMS CIAFAL
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Mapeamento técnico oficial de tabelas, transações, RFCs, BAPIs e fluxos
                    idempotentes.
                  </CardDescription>
                </div>
                <Badge className="bg-[#005596] text-white">SAP ECC 6.0 EHP8</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="p-3">Processo</th>
                      <th className="p-3">Origem</th>
                      <th className="p-3">Objeto SAP</th>
                      <th className="p-3">Tipo Integração</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Campo TMS</th>
                      <th className="p-3">Campo SAP</th>
                      <th className="p-3">Diretrizes / Regras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {blueprint.map((b) => (
                      <tr key={b.id || b.process_name} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900 font-sans">{b.process_name}</td>
                        <td className="p-3 text-slate-600">{b.origin_system}</td>
                        <td className="p-3 font-semibold text-[#005596]">{b.sap_object}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {b.integration_type}
                          </Badge>
                        </td>
                        <td className="p-3">{getBlueprintBadge(b.status)}</td>
                        <td className="p-3 text-slate-800 text-[10px]">{b.tms_field}</td>
                        <td className="p-3 text-slate-800 text-[10px]">{b.sap_field}</td>
                        <td className="p-3 text-slate-600 font-sans text-[11px] leading-relaxed max-w-xs">
                          {b.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PROVEDORES DE ROTAS COMPARATIVO */}
        <TabsContent value="routing" className="space-y-4 mt-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Comparativo & Seleção de Provedores de Roteirização e Geocodificação
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    A CIAFAL define qual provedor homologar. O TMS desacopla o domínio via
                    RoutingProviderAdapter.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono">
                  Ativo: {routingServiceManager.getActiveAdapter().name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    id: 'google_maps',
                    name: 'Google Maps Platform',
                    geocoding: 'Excelente (Rooftop BR)',
                    routing: 'Tempo Real + Trânsito',
                    distMatrix: 'Suportado',
                    traffic: 'Em Tempo Real',
                    tollSupport: 'Parcial',
                    cost: 'USD 5.00 / 1k chamadas',
                    sla: '99.9%',
                    status: 'Aguardando API Key',
                  },
                  {
                    id: 'here_maps',
                    name: 'HERE Technologies',
                    geocoding: 'Muito Bom',
                    routing: 'Específico para Caminhões',
                    distMatrix: 'Suportado',
                    traffic: 'Histórico + Tempo Real',
                    tollSupport: 'Nativo (Toll API)',
                    cost: 'EUR 4.50 / 1k chamadas',
                    sla: '99.9%',
                    status: 'Aguardando API Key',
                  },
                  {
                    id: 'mapbox',
                    name: 'Mapbox Directions',
                    geocoding: 'Bom',
                    routing: 'Direções customizadas',
                    distMatrix: 'Suportado',
                    traffic: 'Baseado em telemetria',
                    tollSupport: 'Não nativo',
                    cost: 'USD 4.00 / 1k chamadas',
                    sla: '99.9%',
                    status: 'Aguardando Token',
                  },
                  {
                    id: 'osrm_osm',
                    name: 'OSRM / OpenStreetMap',
                    geocoding: 'Nominatim (Aproximado)',
                    routing: 'Rápido (Self-Hosted)',
                    distMatrix: 'Ilimitado Local',
                    traffic: 'Sem trânsito ao vivo',
                    tollSupport: 'Manual',
                    cost: 'Zero Licença (Infra Própria)',
                    sla: 'Conforme Infra CIAFAL',
                    status: 'Aguardando Servidor',
                  },
                ].map((prov) => {
                  const isSelected = activeRoutingProvider === prov.id
                  return (
                    <Card
                      key={prov.id}
                      className={`border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#005596] bg-sky-50/40 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleSelectRoutingProvider(prov.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-slate-900">
                            {prov.name}
                          </CardTitle>
                          {isSelected ? (
                            <Badge className="bg-[#005596] text-white text-[10px]">
                              Ativo no TMS
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              Disponível
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Geocodificação:</span>
                            <span className="font-semibold text-slate-800">{prov.geocoding}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Roteamento:</span>
                            <span className="font-semibold text-slate-800">{prov.routing}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Suporte Pedágio:</span>
                            <span className="font-semibold text-slate-800">{prov.tollSupport}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Custo Estimado:</span>
                            <span className="font-semibold text-slate-800">{prov.cost}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">SLA:</span>
                            <span className="font-semibold text-slate-800">{prov.sla}</span>
                          </div>
                        </div>

                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={`w-full mt-2 text-xs ${isSelected ? 'bg-[#005596]' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRoutingProvider(prov.id)
                          }}
                        >
                          {isSelected ? 'Provedor Ativo' : 'Selecionar Provider'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: FILA & LOGS RASTREÁVEIS */}
        <TabsContent value="logs" className="space-y-4 mt-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Fila de Mensageria & Logs de Integração com Correlation ID
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Rastreamento ponta a ponta com mascaramento de senhas/tokens e idempotência.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {logs.length} chamadas registradas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum log de erro ou pendência registrado nas últimas transações.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="p-3">Horário</th>
                        <th className="p-3">Integração</th>
                        <th className="p-3">Correlation ID</th>
                        <th className="p-3">Direção / RFC</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Latência</th>
                        <th className="p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 font-sans">
                            {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{log.integrationId}</td>
                          <td className="p-3 text-sky-700">{log.correlationId}</td>
                          <td className="p-3 text-slate-700">
                            {log.direction}: {log.endpointOrRfc}
                          </td>
                          <td className="p-3">
                            {log.status === 'SUCCESS' ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                SUCCESS
                              </Badge>
                            ) : log.status === 'PENDING' ? (
                              <Badge className="bg-amber-500 text-white text-[10px]">PENDING</Badge>
                            ) : (
                              <Badge className="bg-rose-600 text-white text-[10px]">ERROR</Badge>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{log.latencyMs} ms</td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] h-6 px-2 gap-1"
                              onClick={() => handleRetryLog(log.id)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metric Technical Dialog */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>{selectedMetric?.name}</span>
              {selectedMetric && getStatusBadge(selectedMetric.status)}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Contrato de Integração Operacional — {selectedMetric?.category}
            </DialogDescription>
          </DialogHeader>

          {selectedMetric && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Protocolo Permitido
                  </span>
                  <span className="font-semibold text-slate-800">{selectedMetric.protocol}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Versão do Contrato
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedMetric.contractVersion}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Ambiente Ativo
                  </span>
                  <span className="font-semibold text-slate-800">{selectedMetric.environment}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status do Blueprint
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedMetric.blueprintStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">Princípio de Engenharia:</span>
                <p className="text-slate-600 leading-relaxed bg-slate-100 p-2.5 rounded">
                  {selectedMetric.description}
                </p>
              </div>

              <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg space-y-1">
                <span className="font-bold text-sky-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-sky-700" />
                  Garantia de Isolamento:
                </span>
                <p className="text-sky-800 text-[11px] leading-relaxed">
                  O TMS orquestra este fluxo via Circuit Breaker e fila de retentativas idempotentes
                  com correlation_id.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
