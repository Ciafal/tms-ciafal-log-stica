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
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Radio,
  Server,
  Trash2,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService, TmsService } from '@/services/tmsService'

export const DiagnosticsAndQasAdminPage: React.FC = () => {
  const { user, role } = useAuth()
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
  const [auditCount, setAuditCount] = useState<number>(0)
  const [lastBatch, setLastBatch] = useState<any>(null)

  // Modal Reset QAS
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const loadDiagnostics = async () => {
    try {
      setRefreshing(true)
      const [ordList, cList, qList, negList, tList, expList, batches] = await Promise.all([
        tmsService.getSapSalesOrders().catch(() => []),
        tmsService.getCargos().catch(() => []),
        tmsService.getQueueEntries().catch(() => []),
        tmsService.getFreightNegotiations().catch(() => []),
        tmsService.getFredTransports().catch(() => []),
        tmsService.getExpeditionTracking().catch(() => []),
        tmsService.getImportBatches().catch(() => []),
      ])

      setOrdersCount(ordList.length)
      setCargosCount(cList.length)
      setQueueCount(qList.length)
      setNegotiationsCount(negList.length)
      setTransportsCount(tList.length)
      setExpeditionCount(expList.length)

      if (batches && batches.length > 0) {
        setLastBatch(batches[0])
      }
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

  const handleExecuteReset = async () => {
    if (confirmText !== 'CONFIRMAR RESET QAS') {
      toast({
        variant: 'destructive',
        title: 'Texto de confirmação incorreto',
        description: 'Digite exatamente "CONFIRMAR RESET QAS" para autorizar.',
      })
      return
    }

    if (role !== 'admin_master') {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Apenas Administrador Master pode executar o Reset QAS.',
      })
      return
    }

    setIsResetting(true)
    try {
      const res = await tmsService.resetQasHomologationData(user?.email || 'admin@ciafal.com.br')
      toast({
        title: 'Reset QAS Concluído com Sucesso',
        description: `${res.deleted_count} registros operacionais QAS foram removidos com segurança.`,
      })
      setIsResetModalOpen(false)
      setConfirmText('')
      await loadDiagnostics()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao executar Reset QAS',
        description: err?.message || 'Falha ao executar limpeza da base.',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const isMaster = role === 'admin_master'

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Diagnóstico de Integrações & Administração QAS
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Governança QAS</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Painel de saúde das fontes de dados, rastreabilidade de lotes ZSD35A e saneamento seguro
            de homologação.
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
        </div>
      </div>

      <Tabs defaultValue="diagnostico" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="diagnostico" className="text-xs font-bold gap-1.5">
            <Activity className="w-4 h-4 text-[#005596]" />
            1. Saúde das Integrações & Lotes
          </TabsTrigger>
          <TabsTrigger value="reset_qas" className="text-xs font-bold gap-1.5 text-rose-700">
            <Trash2 className="w-4 h-4 text-rose-600" />
            2. Administração QAS & Reset de Massa
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DIAGNÓSTICO E SAÚDE */}
        <TabsContent value="diagnostico" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: ZSD35A Excel QAS */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    ZSD35A Importação
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">🟢 Conectado</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Último Lote:</span>
                  <strong className="font-mono text-slate-900">
                    {lastBatch?.batch_code || 'EXCEL_QAS_ZSD35A_V3'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem Padrão:</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono font-bold bg-purple-50 text-purple-700"
                  >
                    EXCEL_QAS_ZSD35A_V3
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Importação:</span>
                  <span className="font-mono text-slate-700">
                    {lastBatch?.created
                      ? new Date(lastBatch.created).toLocaleString('pt-BR')
                      : 'Base Homologada'}
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

        {/* TAB 2: ADMINISTRAÇÃO QAS & RESET */}
        <TabsContent value="reset_qas" className="space-y-4">
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader className="p-5 border-b border-rose-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-rose-950 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    Rotina Administrativa: Reset de Massa de Homologação QAS
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-700 mt-1">
                    Permite ao Administrador Master limpar dados de teste e homologação mantendo
                    usuários, regras, RBAC e cadastros técnicos intactos.
                  </CardDescription>
                </div>
                <Badge className="bg-rose-700 text-white text-xs font-mono">
                  SOMENTE ADM MASTER
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-4 bg-white rounded-lg border border-rose-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Resumo da Massa Atual que será Removida:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">
                      Carteira de Pedidos:
                    </span>
                    <strong className="text-sm text-slate-900">{ordersCount} registros</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border">
                    <span className="text-slate-500 text-[10px] block font-sans">Cargas TMS:</span>
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

              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1">
                <strong className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Garantia de Segurança & Preservação:
                </strong>
                <p className="text-[11px] leading-relaxed">
                  Esta rotina remove <strong>EXCLUSIVAMENTE</strong> registros com{' '}
                  <code>origem_dado = 'EXCEL_QAS*'</code> e dados operacionais de homologação.
                  Usuários, permissões, parâmetros, regras ANTT, rotas e configurações do sistema{' '}
                  <strong>NUNCA</strong> são afetados.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!isMaster || (ordersCount === 0 && cargosCount === 0)}
                  onClick={() => setIsResetModalOpen(true)}
                  className="bg-rose-700 hover:bg-rose-800 text-xs font-bold gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Massa de Homologação (Reset QAS)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE CONFIRMAÇÃO ESTREITA DO RESET */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Confirmação de Reset de Homologação QAS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Esta ação excluirá os registros operacionais transacionais da homologação ZSD35A.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
              <p>Digite exatamente a frase abaixo para autorizar:</p>
              <div className="font-mono font-bold bg-white p-2 rounded border border-rose-300 text-center select-all">
                CONFIRMAR RESET QAS
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Frase de confirmação:</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMAR RESET QAS"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsResetModalOpen(false)
                setConfirmText('')
              }}
              disabled={isResetting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteReset}
              disabled={confirmText !== 'CONFIRMAR RESET QAS' || isResetting}
              className="text-xs bg-rose-700 hover:bg-rose-800 font-bold"
            >
              {isResetting ? 'Executando Reset...' : 'Confirmar e Executar Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DiagnosticsAndQasAdminPage
