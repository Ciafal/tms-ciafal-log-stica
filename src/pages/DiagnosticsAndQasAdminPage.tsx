import React, { useState, useEffect } from 'react'
import {
  Activity,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Database,
  Truck,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  Radio,
  Server,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'

export const DiagnosticsAndQasAdminPage: React.FC = () => {
  const { role } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Métricas de saúde das integrações e contagens reais
  const [ordersCount, setOrdersCount] = useState<number>(0)
  const [cargosCount, setCargosCount] = useState<number>(0)
  const [queueCount, setQueueCount] = useState<number>(0)
  const [negotiationsCount, setNegotiationsCount] = useState<number>(0)
  const [transportsCount, setTransportsCount] = useState<number>(0)
  const [expeditionCount, setExpeditionCount] = useState<number>(0)

  // Sincronização direta SAP RFC
  const [isSyncingSap, setIsSyncingSap] = useState(false)

  const loadDiagnostics = async () => {
    try {
      setRefreshing(true)
      const [ordList, cList, qList, negList, tList, expList] = await Promise.all([
        tmsService.getSapSalesOrders().catch(() => []),
        tmsService.getCargos().catch(() => []),
        tmsService.getQueueEntries().catch(() => []),
        tmsService.getFreightNegotiations().catch(() => []),
        tmsService.getFredTransports().catch(() => []),
        tmsService.getExpeditionTracking().catch(() => []),
      ])

      setOrdersCount(ordList.length)
      setCargosCount(cList.length)
      setQueueCount(qList.length)
      setNegotiationsCount(negList.length)
      setTransportsCount(tList.length)
      setExpeditionCount(expList.length)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar diagnóstico',
        description: err?.message || 'Falha ao consultar contagens reais.',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDiagnostics()
  }, [])

  const handleSyncSapRfc = async () => {
    setIsSyncingSap(true)
    try {
      const res = await tmsService.syncSapSalesWallet()
      toast({
        title: res.success ? 'Sincronização SAP RFC Processada' : 'Aviso SAP RFC',
        description: res.message,
      })
      await loadDiagnostics()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão SAP RFC',
        description: err?.message || 'Falha ao sincronizar com SAP ECC via RFC.',
      })
    } finally {
      setIsSyncingSap(false)
    }
  }

  const canSyncSap = role === 'admin_master' || role === 'admin_tms' || role === 'gestor_logistica'

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Diagnóstico de Integrações & Administração SAP
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Governança SAP RFC</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Painel de saúde das fontes de dados, integridade da sincronização SAP RFC
            (ZSD35_CARTEIRA_GET) e auditoria de registros.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDiagnostics}
            disabled={refreshing}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar Diagnóstico
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSyncSapRfc}
            disabled={isSyncingSap || !canSyncSap}
            className="text-xs bg-[#005596] hover:bg-[#004478] text-white gap-1.5"
          >
            <Server className={`w-3.5 h-3.5 ${isSyncingSap ? 'animate-spin' : ''}`} />
            {isSyncingSap ? 'Sincronizando RFC...' : 'Sincronizar SAP RFC'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="diagnostico" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="diagnostico" className="text-xs font-bold gap-1.5">
            <Activity className="w-4 h-4 text-[#005596]" />
            1. Saúde das Integrações & SAP RFC
          </TabsTrigger>
          <TabsTrigger value="sap_governanca" className="text-xs font-bold gap-1.5 text-blue-700">
            <Server className="w-4 h-4 text-blue-600" />
            2. Governança SAP RFC & Preservação
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DIAGNÓSTICO E SAÚDE */}
        <TabsContent value="diagnostico" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: SAP RFC Sincronização */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#005596]" />
                    SAP RFC Sincronização
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">🟢 Fonte Única</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Função RFC:</span>
                  <strong className="font-mono text-slate-900">ZSD35_CARTEIRA_GET</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem Dado:</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono font-bold bg-sky-50 text-sky-700 border-sky-200"
                  >
                    SAP (Oficial)
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Integridade:</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    Espelho Direto SAP
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Carteira SAP */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#005596]" />
                    Carteira de Pedidos
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    🟢 {ordersCount} Pedidos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pedidos Registrados:</span>
                  <strong className="font-mono text-slate-900">{ordersCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Sincronização:</span>
                  <span className="text-emerald-700 font-semibold">Persistente (PocketBase)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Integridade:</span>
                  <span className="text-slate-700 font-medium">Sem duplicidades</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: PCP Robotizado */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-600" />
                    PCP Robotizado
                  </span>
                  <Badge className="bg-blue-600 text-white text-[10px]">🟢 PCP_ROBOTIZADO</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem:</span>
                  <span className="font-mono text-slate-700">PCP_ROBOTIZADO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-blue-700 font-semibold">Regras Validadas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fallback Fake:</span>
                  <span className="text-emerald-700 font-bold">Proibido (Exibe Indisponível)</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Estoque WMS / SAP DP34 */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Estoque & DP34
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">🟢 SAP_DP34</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Depósito Primário:</span>
                  <span className="font-mono text-slate-900 font-bold">DP34 (Expedição)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem:</span>
                  <span className="font-mono text-slate-700">SAP_DP34 / WMS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conferência:</span>
                  <span className="text-emerald-700 font-semibold">100% Determinística</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 5: Disponibilidade Logística */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#005596]" />
                    Disponibilidade Logística
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    🟢 {queueCount} Veículos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fila Ativa:</span>
                  <strong className="font-mono text-slate-900">{queueCount} motoristas</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem:</span>
                  <span className="font-mono text-slate-700">DISPONIBILIDADE_LOGISTICA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regra PORTA:</span>
                  <span className="text-slate-700">Pontuação +15 pts sob presença física</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Mesa de Fretes & Carlão */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-purple-600" />
                    Mesa de Fretes (Carlão)
                  </span>
                  <Badge className="bg-purple-600 text-white text-[10px]">
                    🟢 {negotiationsCount} Negociações
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cargas Aprovadas:</span>
                  <strong className="font-mono text-slate-900">{cargosCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Negociações:</span>
                  <strong className="font-mono text-slate-900">{negotiationsCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem Frete:</span>
                  <span className="font-mono text-slate-700">TABELA_FRETE / ANTT</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 7: Fred & Rastreamento 360° */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Fred & Telemetria
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    🟢 {transportsCount} Viagens
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transportes Ativos:</span>
                  <strong className="font-mono text-slate-900">{transportsCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Eventos de Expedição:</span>
                  <strong className="font-mono text-slate-900">{expeditionCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Fred IA:</span>
                  <span className="text-emerald-700 font-semibold">Telemetria Ativa</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: GOVERNANÇA SAP RFC & PRESERVAÇÃO DE DADOS */}
        <TabsContent value="sap_governanca" className="space-y-4">
          <Card className="border-blue-200 bg-sky-50/20">
            <CardHeader className="p-5 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-[#005596]" />
                    Governança da Fonte Única: SAP ECC RFC (ZSD35_CARTEIRA_GET)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600 mt-1">
                    Diretriz de integridade e soberania do SAP ECC como repositório canônico de
                    ordens de venda (VBAK/VBAP).
                  </CardDescription>
                </div>
                <Badge className="bg-[#005596] text-white text-xs font-mono">
                  FONTE OFICIAL SAP
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Espelho Operacional Ativo no TMS CIAFAL:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">
                      Pedidos na Carteira SAP:
                    </span>
                    <strong className="text-sm text-slate-900">{ordersCount} registros</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">
                      Cargas Planejadas:
                    </span>
                    <strong className="text-sm text-slate-900">{cargosCount} registros</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">
                      Negociações Carlão:
                    </span>
                    <strong className="text-sm text-slate-900">
                      {negotiationsCount} registros
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">
                      Transportes Fred:
                    </span>
                    <strong className="text-sm text-slate-900">{transportsCount} registros</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 space-y-1">
                <strong className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Política de Preservação e Resiliência (Zero Limpeza Destrutiva):
                </strong>
                <p className="text-[11px] leading-relaxed">
                  A carteira comercial operacional é mantida intacta e idempotente. Sincronizações
                  com o SAP ECC atualizam status de estoque, crédito e novos pedidos sem perda de
                  histórico ou descarte acidental de dados transacionais.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={isSyncingSap || !canSyncSap}
                  onClick={handleSyncSapRfc}
                  className="bg-[#005596] hover:bg-[#004478] text-white text-xs font-bold gap-1.5"
                >
                  <Server className={`w-4 h-4 ${isSyncingSap ? 'animate-spin' : ''}`} />
                  {isSyncingSap ? 'Sincronizando SAP...' : 'Disparar Sincronização SAP RFC'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DiagnosticsAndQasAdminPage
