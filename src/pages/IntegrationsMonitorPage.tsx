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
  Lock,
  EyeOff,
  Download,
  CheckSquare,
  ArrowRightLeft,
  XCircle,
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
import {
  IntegrationHealthMetric,
  IntegrationLogEntry,
  HomologationStatus,
} from '@/domain/integrationsCore'
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
  const [isTestingSap, setIsTestingSap] = useState(false)
  const [sapTestResult, setSapTestResult] = useState<any>(null)
  const [selectedEnvForTest, setSelectedEnvForTest] = useState<'DEV' | 'HOMOLOGACAO' | 'PRODUCAO'>(
    'DEV',
  )
  const [walletSource, setWalletSource] = useState<'EXCEL_ZSD35A' | 'SAP_ECC'>('EXCEL_ZSD35A')
  const [isUpdatingWalletSource, setIsUpdatingWalletSource] = useState(false)

  const loadData = async () => {
    try {
      setIsRefreshing(true)
      const [mList, bList, lList, walletCfg] = await Promise.all([
        TmsService.getIntegrationHealthMetrics(),
        TmsService.getSapBlueprintMappings(),
        TmsService.getIntegrationLogs(50),
        TmsService.getWalletSourceConfig(),
      ])
      setMetrics(mList)
      setBlueprint(bList)
      setLogs(lList)
      setWalletSource(walletCfg.source)
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

  const handleSaveWalletSource = async (newSource: 'EXCEL_ZSD35A' | 'SAP_ECC') => {
    setIsUpdatingWalletSource(true)
    try {
      const ok = await TmsService.setWalletSourceConfig(
        newSource,
        'admin@ciafal.logistica',
        'Administrador Master CIAFAL',
      )
      if (ok) {
        setWalletSource(newSource)
        toast({
          title: 'Fonte da Carteira Atualizada',
          description: `Fonte ativa alterada para ${newSource === 'SAP_ECC' ? 'SAP ECC 6.0 (RFC/BAPI)' : 'Excel ZSD35A — QAS'} e persistida com sucesso.`,
        })
      } else {
        throw new Error('Falha ao gravar parâmetro no backend.')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar fonte da carteira',
        description: err?.message || 'Não foi possível atualizar o parâmetro no backend.',
      })
    } finally {
      setIsUpdatingWalletSource(false)
    }
  }

  const handleTestSapConnection = async () => {
    setIsTestingSap(true)
    try {
      const result = await sapGateway.testSapConnection(selectedEnvForTest)
      setSapTestResult(result)
      toast({
        title: result.success ? 'Conexão SAP Validada' : 'Aviso Conexão SAP',
        description: result.message,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no teste de conexão SAP',
        description: err?.message || 'Erro ao comunicar com o servidor SAP ECC.',
      })
    } finally {
      setIsTestingSap(false)
    }
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

  const handleExportBlueprint = (format: 'CSV' | 'XLSX' | 'PDF') => {
    if (format === 'PDF') {
      window.print()
      return
    }

    const headers = [
      'ID',
      'Processo TMS',
      'Fonte SAP',
      'Tipo',
      'Objeto SAP',
      'Campo SAP',
      'Campo TMS',
      'Obrigatorio',
      'Transformacao',
      'Direcao',
      'Frequencia',
      'Status',
    ]

    const rows = blueprint.map((b) => [
      b.id,
      `"${(b.process_name || '').replace(/"/g, '""')}"`,
      `"${(b.origin_system || '').replace(/"/g, '""')}"`,
      `"${(b.object_type || b.integration_type || '').replace(/"/g, '""')}"`,
      `"${(b.sap_object || '').replace(/"/g, '""')}"`,
      `"${(b.sap_field || '').replace(/"/g, '""')}"`,
      `"${(b.tms_field || '').replace(/"/g, '""')}"`,
      b.is_mandatory ? 'SIM' : 'NAO',
      `"${(b.transformation || '').replace(/"/g, '""')}"`,
      b.direction || 'SAP->TMS',
      `"${(b.frequency || '').replace(/"/g, '""')}"`,
      `"${(b.status || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `CIAFAL_SAP_TMS_Blueprint_${format}_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Blueprint Exportado',
      description: `O arquivo completo do Blueprint SAP/TMS (${format}) foi gerado com sucesso.`,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Conectado':
      case 'Online':
        return <Badge className="bg-emerald-600 text-white">Online / Conectado</Badge>
      case 'Degradado':
      case 'Atenção':
        return <Badge className="bg-amber-500 text-white">Atenção</Badge>
      case 'Aguardando configuração':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300">
            Aguardando Credenciais
          </Badge>
        )
      case 'Erro':
      case 'Offline':
        return <Badge className="bg-rose-600 text-white">Offline</Badge>
      case 'Desabilitado':
        return <Badge className="bg-slate-500 text-white">Desabilitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getHomologationBadge = (st: HomologationStatus) => {
    switch (st) {
      case 'Produção':
      case 'Homologada':
        return <Badge className="bg-emerald-600 text-white">{st}</Badge>
      case 'Em homologação':
        return <Badge className="bg-blue-600 text-white">{st}</Badge>
      case 'Pronta para teste':
        return <Badge className="bg-amber-500 text-white">{st}</Badge>
      case 'Configuração pendente':
        return <Badge className="bg-sky-600 text-white">{st}</Badge>
      case 'Bloqueada':
        return <Badge className="bg-rose-600 text-white">{st}</Badge>
      case 'Não iniciada':
      default:
        return (
          <Badge variant="outline" className="text-slate-500">
            {st || 'Não iniciada'}
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
              Central de Homologação & Monitor de Integrações
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Sprint 4.1</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Governança, contratos de integração, testes de conectividade sem efeito colateral e
            prontidão técnica para Go-Live.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-900 border-amber-300 px-3 py-1 text-xs font-bold"
          >
            Modo: Homologação Técnica (Read-Only)
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Central
          </Button>
        </div>
      </div>

      {/* Corporate Engineering Notice */}
      <div className="bg-sky-50/70 text-slate-800 rounded-xl p-4 text-xs space-y-2 border border-sky-200 shadow-none">
        <div className="flex items-center space-x-2 font-bold text-[#005596]">
          <ShieldCheck className="w-4 h-4 text-[#005596]" />
          <span>DIRETRIZES DE HOMOLOGAÇÃO REAL — SEM INTEGRAÇÕES FICTÍCIAS:</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          1) <strong>SAP ECC 6.0:</strong> System of Record oficial. Permite RFC/BAPI/IDoc/qRFC
          (proibido REST direto no SAP). O sistema opera em modo <strong>READ-ONLY</strong> (
          <code>SAP_WRITE_ENABLED = false</code>) até homologação formal.
          <br />
          2) <strong>Segurança de Credenciais:</strong> Senhas e tokens nunca são expostos —
          visualização estrita de <em>"Configurada"</em> ou <em>"Não configurada"</em>.<br />
          3) <strong>Crédito Financeiro:</strong> Avaliação realizada estritamente por{' '}
          <strong>VALOR FINANCEIRO (R$)</strong> do pedido, nunca por toneladas.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl bg-slate-100 p-1 rounded-lg h-auto gap-1">
          <TabsTrigger value="hub" className="text-xs font-semibold">
            Sistemas ({metrics.length})
          </TabsTrigger>
          <TabsTrigger value="sap-env" className="text-xs font-semibold">
            SAP ECC 6.0
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="text-xs font-semibold">
            Blueprint ({blueprint.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-semibold">
            Logs & Filas
          </TabsTrigger>
        </TabsList>
        {/* TAB 1: CENTRAL DE HOMOLOGAÇÃO */}
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
                  {/* Homologation Status Row */}
                  <div className="flex items-center justify-between bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] uppercase font-bold text-sky-800">
                      Status de Homologação:
                    </span>
                    {getHomologationBadge(item.homologationStatus)}
                  </div>

                  {/* Technical Matrix */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Destino / Endpoint
                      </span>
                      <span className="font-mono text-slate-700 text-[11px] truncate block">
                        {item.maskedEndpointOrDest || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Credencial
                      </span>
                      <span
                        className={`font-bold text-[11px] ${item.isCredentialConfigured ? 'text-emerald-700' : 'text-amber-700'}`}
                      >
                        {item.isCredentialConfigured ? 'Configurada' : 'Não configurada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Conexão Testada
                      </span>
                      <span
                        className={`font-bold text-[11px] ${item.isConnectionTested ? 'text-emerald-700' : 'text-slate-500'}`}
                      >
                        {item.isConnectionTested ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Latência Real
                      </span>
                      <span className="font-bold text-slate-900 text-[11px]">
                        {item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Versão Contrato
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {item.contractVersion}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Responsável Técnico
                      </span>
                      <span className="font-semibold text-slate-700 text-[10px] truncate block">
                        {item.technicalOwner || 'TI CIAFAL'}
                      </span>
                    </div>
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

        {/* TAB 2: AMBIENTES & TESTE SAP */}
        <TabsContent value="sap-env" className="space-y-4 mt-6">
          {/* Card de Configuração de Fonte Ativa da Carteira (Persistido no Backend) */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="bg-sky-50/60 border-b border-sky-100 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Fonte Ativa da Carteira de Pedidos
                    </CardTitle>
                    <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                      REPOSITÓRIO ÚNICO
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-600">
                    Define qual origem alimenta o <strong>Planejador de Cargas</strong>,
                    Roteirizador e Mesa de Fretes. Persistida no backend (
                    <code>system_parameters</code>).
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      walletSource === 'EXCEL_ZSD35A'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-xs px-2.5 py-1'
                        : 'bg-sky-50 text-sky-700 border-sky-300 font-bold text-xs px-2.5 py-1'
                    }
                  >
                    Ativo: {walletSource === 'EXCEL_ZSD35A' ? 'Excel ZSD35A — QAS' : 'SAP ECC 6.0'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => handleSaveWalletSource('EXCEL_ZSD35A')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    walletSource === 'EXCEL_ZSD35A'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            walletSource === 'EXCEL_ZSD35A' ? 'text-emerald-600' : 'text-slate-300'
                          }`}
                        />
                        <span>Excel ZSD35A — QAS (Padrão Homologação)</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                        Utiliza a última carga válida da planilha{' '}
                        <code>ZSD35 Carga TMS v3.xlsx</code> como entrada oficial do SAP. Não
                        realiza chamadas externas ao SAP ECC no Planejador.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleSaveWalletSource('SAP_ECC')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    walletSource === 'SAP_ECC'
                      ? 'border-[#005596] bg-sky-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            walletSource === 'SAP_ECC' ? 'text-[#005596]' : 'text-slate-300'
                          }`}
                        />
                        <span>SAP ECC (RFC/BAPI ZSD35_CARTEIRA_GET)</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                        Conexão online direta via RFC SAP para extração periódica da carteira aberta
                        da transação standard ZSD35 / VT01N.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>
                  Chave no Backend: <code>ACTIVE_SALES_WALLET_SOURCE</code> ={' '}
                  <strong>{walletSource}</strong>
                </span>
                {isUpdatingWalletSource && (
                  <span className="text-[#005596] font-semibold animate-pulse">
                    Gravando configuração no backend...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Ambientes SAP ECC 6.0 EHP8 & Teste de Conectividade Seguro
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Isolamento estrito entre DEV, QAS e PRD. Teste de conectividade sem alteração de
                    dados.
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800"
                    value={selectedEnvForTest}
                    onChange={(e) => setSelectedEnvForTest(e.target.value as any)}
                  >
                    <option value="DEV">DEV (Mandante 100)</option>
                    <option value="HOMOLOGACAO">QAS / Homologação (Mandante 200)</option>
                    <option value="PRODUCAO">PRD / Produção (Mandante 400)</option>
                  </select>

                  <Button
                    size="sm"
                    onClick={handleTestSapConnection}
                    disabled={isTestingSap}
                    className="text-xs bg-[#005596] hover:bg-[#004070] gap-1.5"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTestingSap ? 'animate-spin' : ''}`} />
                    Testar Conexão SAP
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Test Result Alert if executed */}
              {sapTestResult && (
                <div
                  className={`border rounded-xl p-4 text-xs space-y-2 ${
                    sapTestResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {sapTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      Resultado do Teste SAP (Correlation ID: {sapTestResult.correlationId})
                    </span>
                    <span className="font-mono text-[11px]">
                      Latência: {sapTestResult.latencyMs} ms | Mandante: {sapTestResult.client}
                    </span>
                  </div>
                  <p className="leading-relaxed">{sapTestResult.message}</p>
                </div>
              )}

              {/* SAP Environment Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(sapGateway.getAllEnvironmentConfigs()).map(([envKey, cfg]) => (
                  <Card key={envKey} className="border-slate-200">
                    <CardHeader className="p-3 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Ambiente {envKey}</span>
                      <Badge
                        variant="outline"
                        className={
                          envKey === 'PRODUCAO'
                            ? 'text-rose-700 bg-rose-50 border-rose-300 font-bold'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold'
                        }
                      >
                        {cfg.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Host SAP:</span>
                          <span className="font-mono font-bold text-slate-800">{cfg.host}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">System Number:</span>
                          <span className="font-mono text-slate-800">{cfg.systemNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mandante (Client):</span>
                          <span className="font-mono font-bold text-slate-800">{cfg.client}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Usuário Técnico:</span>
                          <span className="font-mono text-slate-800">{cfg.technicalUser}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Versão Contrato:</span>
                          <span className="text-slate-800">{cfg.contractVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Escrita Habilitada:</span>
                          <span className="font-bold text-rose-600">Não (Read-Only)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Critical Security Rule */}
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-900 text-xs space-y-1">
                <span className="font-bold block flex items-center gap-1.5 text-rose-950">
                  <Lock className="w-4 h-4 text-rose-700" />
                  BLOQUEIO CRÍTICO DE SEGURANÇA CROSS-ENVIRONMENT (DEV → PRD):
                </span>
                <p className="leading-relaxed">
                  O ambiente DEV do TMS está{' '}
                  <strong>
                    estritamente proibido de realizar qualquer chamada de escrita no ambiente SAP
                    PRD
                  </strong>
                  , mesmo que credenciais sejam configuradas incorretamente. A validação de ambiente
                  no código do gateway bloqueia e rejeita a operação com log de auditoria.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BLUEPRINT SAP/TMS (12 COLUNAS) */}
        <TabsContent value="blueprint" className="space-y-4 mt-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Blueprint Oficial SAP ECC ↔ TMS CIAFAL (12 Colunas)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Mapeamento técnico campo a campo para envio e validação pela consultoria SAP.
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportBlueprint('CSV')}
                    className="text-xs gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportBlueprint('XLSX')}
                    className="text-xs gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Exportar XLSX
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExportBlueprint('PDF')}
                    className="text-xs bg-[#005596] hover:bg-[#004070] gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar PDF / Imprimir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Processo TMS</th>
                      <th className="p-2.5">Fonte SAP</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Objeto SAP</th>
                      <th className="p-2.5">Campo SAP</th>
                      <th className="p-2.5">Campo TMS</th>
                      <th className="p-2.5">Obrig.</th>
                      <th className="p-2.5">Transformação</th>
                      <th className="p-2.5">Direção</th>
                      <th className="p-2.5">Frequência</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {blueprint.map((b) => (
                      <tr key={b.id || b.process_name} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold text-slate-900">{b.id}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-800">
                          {b.process_name}
                        </td>
                        <td className="p-2.5 font-sans text-slate-600">{b.origin_system}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {b.object_type || b.integration_type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-semibold text-[#005596]">{b.sap_object}</td>
                        <td className="p-2.5 text-slate-800 text-[10px]">{b.sap_field}</td>
                        <td className="p-2.5 text-slate-800 text-[10px]">{b.tms_field}</td>
                        <td className="p-2.5 font-sans">
                          {b.is_mandatory ? (
                            <Badge className="bg-rose-600 text-white text-[10px]">SIM</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-[10px]">
                              NÃO
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-sans text-[11px] text-slate-600 max-w-xs">
                          {b.transformation || 'Mapeamento direto'}
                        </td>
                        <td className="p-2.5 font-sans">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 font-bold">
                            {b.direction || 'SAP→TMS'}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-sans text-[10px] text-slate-600">
                          {b.frequency}
                        </td>
                        <td className="p-2.5 font-sans">
                          <Badge
                            className={
                              b.status === 'Standard SAP' || b.status === 'Homologado'
                                ? 'bg-emerald-600 text-white text-[10px]'
                                : b.status === 'Confirmado funcionalmente' ||
                                    b.status === 'Confirmado tecnicamente'
                                  ? 'bg-blue-600 text-white text-[10px]'
                                  : 'bg-amber-500 text-white text-[10px]'
                            }
                          >
                            {b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              Contrato de Homologação — {selectedMetric?.category}
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
                    Endpoint Mascarado
                  </span>
                  <span className="font-mono text-slate-800 text-[11px] truncate block">
                    {selectedMetric.maskedEndpointOrDest || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status Homologação
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedMetric.homologationStatus}
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
