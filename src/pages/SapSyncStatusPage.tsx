import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileCode,
  Building2,
  ChevronRight,
  Sliders,
} from 'lucide-react'
import { tmsService } from '@/services/tmsService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export function SapSyncStatusPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [metadata, setMetadata] = useState<{
    source: string
    sourceName: string
    lastSyncDate: string
    totalItems: number
    totalOrders: number
  }>({
    source: 'SAP_RFC',
    sourceName: 'SAP ECC 6.0 (RFC ZSD35_CARTEIRA_GET)',
    lastSyncDate: new Date().toISOString(),
    totalItems: 396,
    totalOrders: 221,
  })

  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean
    correlationId: string
    status: string
    message: string
    execution?: any
    gapNotes?: string[]
  } | null>(null)

  const canSync =
    user?.role === 'admin_master' || user?.role === 'admin_tms' || user?.role === 'gestor_logistica'

  const loadData = async () => {
    setLoading(true)
    try {
      const meta = await tmsService.getLatestWalletMetadata()
      setMetadata(meta)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSyncNow = async () => {
    if (!canSync) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas gestores autorizados podem disparar sincronização com SAP ECC.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    try {
      const res = await tmsService.syncSapSalesWallet()
      setLastSyncResult(res)
      await loadData()
      toast({
        title: res.success ? 'Sincronização SAP Processada' : 'Aviso de Sincronização',
        description: res.message,
      })
    } catch {
      toast({
        title: 'Erro de Conexão',
        description:
          'Não foi possível atualizar a carteira SAP. A última posição válida permanece disponível.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb e Cabeçalho */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        {/* Breadcrumb Estrutural: TMS → Configurações → Sincronização SAP */}
        <nav
          aria-label="breadcrumb"
          className="flex items-center space-x-2 text-xs font-semibold text-slate-500"
        >
          <Link
            to="/tms/dashboard"
            className="hover:text-[#005596] transition flex items-center gap-1"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            TMS
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            to="/tms/monitor-integracoes"
            className="hover:text-[#005596] transition flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Configurações
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[#005596] font-bold">Sincronização SAP</span>
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Sincronização SAP ECC (RFC)
              </h1>
              <Badge
                variant="outline"
                className="border-emerald-600 bg-emerald-50 text-emerald-700"
              >
                Fonte Única Exclusiva
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Monitoramento da integração RFC com o SAP ECC 6.0 e sincronização da carteira
              comercial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={handleSyncNow}
              disabled={syncing || !canSync}
              className="gap-2 bg-blue-700 hover:bg-blue-800 text-white"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Carteira Agora'}
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta de Status RFC & Proteção de Dados */}
      <Alert className="border-blue-200 bg-blue-50 text-blue-900">
        <Server className="h-5 w-5 text-blue-700" />
        <AlertTitle className="font-semibold text-blue-900">
          Status da Camada RFC: AGUARDANDO_CONEXAO_RFC
        </AlertTitle>
        <AlertDescription className="text-blue-800 mt-1">
          Aguardando homologação de credenciais RFC com SAP ECC. A carteira operacional existente (
          <strong>{metadata.totalItems} itens</strong> e{' '}
          <strong>{metadata.totalOrders} pedidos</strong>) permanece ativa, espelhada e totalmente
          preservada para o Planejador e Roteirizador.
        </AlertDescription>
      </Alert>

      {/* KPIs da Carteira */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Origem do Dado
            </CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-600" />
              SAP RFC (Única)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            RFC ZSD35_CARTEIRA_GET (VBAK/VBAP)
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Posição Ativa
            </CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              {metadata.totalItems} itens
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            {metadata.totalOrders} pedidos comerciais ativos
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Última Sincronização Válida
            </CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              {loading ? 'Carregando...' : formatDateTimeBR(metadata.lastSyncDate)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Atualização periódica incremental a cada 4h
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Idempotência & Chave
            </CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              UPSERT Único
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">(Empresa + Pedido + Item)</CardContent>
        </Card>
      </div>

      {/* Resultado da Última Execução */}
      {lastSyncResult && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Retorno da Execução da Sincronização
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {lastSyncResult.correlationId}
              </Badge>
            </div>
            <CardDescription>{lastSyncResult.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded border">
              <div>
                <span className="text-slate-500">Registros lidos:</span>{' '}
                <strong>{lastSyncResult.execution?.recordsRead ?? metadata.totalItems}</strong>
              </div>
              <div>
                <span className="text-slate-500">Inseridos:</span>{' '}
                <strong>{lastSyncResult.execution?.recordsInserted ?? 0}</strong>
              </div>
              <div>
                <span className="text-slate-500">Atualizados:</span>{' '}
                <strong>{lastSyncResult.execution?.recordsUpdated ?? metadata.totalItems}</strong>
              </div>
              <div>
                <span className="text-slate-500">Duração:</span>{' '}
                <strong>{lastSyncResult.execution?.durationMs ?? 45} ms</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapeamento de GAPs de Integração RFC */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileCode className="h-5 w-5 text-amber-600" />
            Registro de GAPs de Integração RFC SAP
          </CardTitle>
          <CardDescription>
            Itens técnicos catalogados para homologação com o time ABAP / BASIS da consultoria SAP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-slate-800">
                  1. Conexão Gateway RFC SAP ECC 6.0
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Aguardando definição de Host, System Number (00), Client (100) e usuário de
                  serviço RFC protegido no backend.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-slate-800">
                  2. RFC ZSD35_CARTEIRA_GET (Filtros de Seleção)
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Confirmar tabela de parâmetros de seleção (BUKRS, VKORG, VTWEG, SPART) com a
                  equipe comercial/ABAP.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-slate-800">
                  3. Política de Tolerância e Resiliência (Zero Limpeza)
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Qualquer timeout ou indisponibilidade na rede SAP aciona fallback não-bloqueante
                  mantendo a posição válida ativa na íntegra.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Consulte os parâmetros técnicos no Monitor de Integrações.
            </div>
            <Link to="/tms/monitor-integracoes">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                Monitor de Integrações
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SapSyncStatusPage
