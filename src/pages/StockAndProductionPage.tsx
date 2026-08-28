import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  Factory,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Send,
  Calendar,
  ShieldCheck,
  Building2,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapStockCurrentEntity,
  PcpProductionOrderEntity,
  StockConfirmationRequestEntity,
} from '@/domain/rules'

export const StockAndProductionPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [stocks, setStocks] = useState<SapStockCurrentEntity[]>([])
  const [pcpOrders, setPcpOrders] = useState<PcpProductionOrderEntity[]>([])
  const [stockRequests, setStockRequests] = useState<StockConfirmationRequestEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterPlant, setFilterPlant] = useState('ALL')
  const [filterPcpStatus, setFilterPcpStatus] = useState('ALL')

  // Stock Confirmation Request Modal (Create)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<SapStockCurrentEntity | null>(null)
  const [reqOrderNumber, setReqOrderNumber] = useState('')
  const [reqMaterial, setReqMaterial] = useState('')
  const [reqQty, setReqQty] = useState<number>(10)
  const [reqReason, setReqReason] = useState('')
  const [reqNotes, setReqNotes] = useState('')
  const [isSubmittingReq, setIsSubmittingReq] = useState(false)

  // Respond Request Modal
  const [respondTarget, setRespondTarget] = useState<StockConfirmationRequestEntity | null>(null)
  const [respondStatus, setRespondStatus] = useState<
    'Confirmada' | 'Confirmada parcialmente' | 'Negada'
  >('Confirmada')
  const [respondConfirmedQty, setRespondConfirmedQty] = useState<number>(0)
  const [respondNotes, setRespondNotes] = useState('')
  const [isSubmittingRespond, setIsSubmittingRespond] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [stk, pcp, reqs] = await Promise.all([
        TmsService.getStockCurrent(),
        TmsService.getPcpProductionOrders(),
        TmsService.getStockRequests(),
      ])
      setStocks(stk)
      setPcpOrders(pcp)
      setStockRequests(reqs)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados de Estoque & PCP',
        description: err?.message || 'Falha ao conectar com base SAP/PCP.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalCurrentStockTons = stocks.reduce((acc, s) => acc + (s.available_qty || 0), 0)
    const totalPcpTons = pcpOrders.reduce((acc, p) => acc + (p.quantity_planned || 0), 0)
    const activeRequestsCount = stockRequests.filter(
      (r) => r.status === 'Solicitada' || r.status === 'Em análise',
    ).length
    const readyItemsCount = stocks.filter((s) => (s.available_qty || 0) > 0).length

    return {
      totalCurrentStockTons: Math.round(totalCurrentStockTons * 10) / 10,
      totalPcpTons: Math.round(totalPcpTons * 10) / 10,
      activeRequestsCount,
      readyItemsCount,
    }
  }, [stocks, pcpOrders, stockRequests])

  // Filtered Stock
  const filteredStock = useMemo(() => {
    return stocks.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          s.material_code.toLowerCase().includes(q) ||
          s.material_description.toLowerCase().includes(q) ||
          (s.batch && s.batch.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterPlant !== 'ALL' && s.plant !== filterPlant) return false
      return true
    })
  }, [stocks, search, filterPlant])

  // Filtered PCP
  const filteredPcp = useMemo(() => {
    return pcpOrders.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          p.production_order_number.toLowerCase().includes(q) ||
          p.material_code.toLowerCase().includes(q) ||
          p.material_description.toLowerCase().includes(q) ||
          p.line.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterPcpStatus !== 'ALL' && p.status !== filterPcpStatus) return false
      return true
    })
  }, [pcpOrders, search, filterPcpStatus])

  // Handlers
  const handleOpenNewRequestFromStock = (stk: SapStockCurrentEntity) => {
    setSelectedStock(stk)
    setReqMaterial(stk.material_code)
    setReqQty(stk.available_qty > 0 ? stk.available_qty : 10)
    setReqReason('Confirmação de saldo físico em pátio de estocagem')
    setReqOrderNumber('4500012890')
    setIsRequestModalOpen(true)
  }

  const handleCreateStockRequest = async () => {
    if (!reqMaterial || !reqOrderNumber) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setIsSubmittingReq(true)
    try {
      const res = await TmsService.createStockConfirmationRequest(
        {
          order_number: reqOrderNumber,
          material_code: reqMaterial,
          material_description: selectedStock?.material_description || 'Material Siderúrgico',
          required_quantity: reqQty,
          stock_informed: selectedStock?.available_qty || 0,
          unit: 'TON',
          reason: reqReason,
          notes: reqNotes,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Solicitação Criada com Sucesso',
          description: `Ordem ${reqOrderNumber} registrada no workflow de verificação de estoque.`,
        })
        setIsRequestModalOpen(false)
        fetchData()
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' })
    } finally {
      setIsSubmittingReq(false)
    }
  }

  const handleOpenRespondModal = (req: StockConfirmationRequestEntity) => {
    setRespondTarget(req)
    setRespondStatus('Confirmada')
    setRespondConfirmedQty(req.required_quantity)
    setRespondNotes(
      'Material verificado fisicamente no lote correspondente. Saldo liberado para expedição.',
    )
  }

  const handleRespondRequest = async () => {
    if (!respondTarget) return
    setIsSubmittingRespond(true)
    try {
      const ok = await TmsService.respondStockConfirmationRequest(
        respondTarget.id,
        respondStatus,
        respondConfirmedQty,
        respondNotes,
        user?.email || 'operador.patio@ciafal.logistica',
        user?.name || 'Operador de Pátio',
      )

      if (ok) {
        toast({
          title: 'Solicitação Respondida',
          description: `Status atualizado para ${respondStatus}. Histórico de auditoria registrado.`,
        })
        setRespondTarget(null)
        fetchData()
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' })
    } finally {
      setIsSubmittingRespond(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Estoque & Produção (SAP MB52 + PCP Robotizado)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              ESTOQUE REAL vs. ESTOQUE FUTURO
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Visão consolidada de saldo físico imediato (SAP MB52) cruzado com ordens de produção
            programadas (PCP Robotizado).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedStock(null)
              setReqMaterial('')
              setReqOrderNumber('')
              setReqQty(10)
              setIsRequestModalOpen(true)
            }}
            size="sm"
            className="bg-[#005596] hover:bg-sky-700 text-white text-xs h-8 font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Nova Solicitação de Estoque
          </Button>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-emerald-50/50 border-emerald-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-800">
                Estoque Disponível Agora (MB52)
              </span>
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-950 mt-1">
              {metrics.totalCurrentStockTons} t
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              Saldo físico pronto para expedição
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sky-50/50 border-sky-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-sky-800">
                Estoque Futuro / PCP Robotizado
              </span>
              <Factory className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-black font-mono text-sky-950 mt-1">
              {metrics.totalPcpTons} t
            </div>
            <div className="text-[10px] text-sky-700 mt-0.5">Programação confirmada D+1 / D+2</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-800">
                Solicitações Pendentes
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-amber-950 mt-1">
              {metrics.activeRequestsCount}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              Aguardando conferência física de pátio
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-600">
                Itens Ativos em Estoque
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900 mt-1">
              {metrics.readyItemsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Materiais com saldo positivo</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="current_stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1">
          <TabsTrigger value="current_stock" className="text-xs font-bold">
            <Boxes className="w-3.5 h-3.5 mr-1.5" />
            1. Estoque Disponível Agora (SAP MB52)
          </TabsTrigger>
          <TabsTrigger value="future_pcp" className="text-xs font-bold">
            <Factory className="w-3.5 h-3.5 mr-1.5" />
            2. Estoque Previsto / PCP Robotizado
          </TabsTrigger>
          <TabsTrigger value="requests_workflow" className="text-xs font-bold">
            <FileCheck className="w-3.5 h-3.5 mr-1.5" />
            3. Solicitações de Confirmação ({stockRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ESTOQUE ATUAL */}
        <TabsContent value="current_stock" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Posição Física de Estoque (SAP RFC_READ_TABLE)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Materiais disponíveis imediatamente para faturamento e carregamento sem
                    dependência de produção.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filtrar material, descrição, lote..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs w-64"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5">Código Material</th>
                    <th className="p-2.5">Descrição do Material</th>
                    <th className="p-2.5">Centro / Depósito</th>
                    <th className="p-2.5">Lote SAP</th>
                    <th className="p-2.5 text-right">Disponível Agora</th>
                    <th className="p-2.5 text-right">Reservado</th>
                    <th className="p-2.5 text-right">Bloqueado</th>
                    <th className="p-2.5 text-center">Status / Previsão</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStock.map((stk) => {
                    const isAvailable = (stk.available_qty || 0) > 0
                    return (
                      <tr key={stk.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-[#005596]">
                          {stk.material_code}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">
                          {stk.material_description}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {stk.plant} / {stk.storage_location}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {stk.batch || 'LOTE-PADRÃO'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {stk.available_qty.toFixed(1)} {stk.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-700">
                          {(stk.reserved_qty || 0).toFixed(1)} {stk.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-700">
                          {(stk.blocked_qty || 0).toFixed(1)} {stk.unit}
                        </td>
                        <td className="p-2.5 text-center">
                          {isAvailable ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Disponível Agora
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500 text-white text-[10px]">
                              Sem Saldo Imediato
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenNewRequestFromStock(stk)}
                            className="h-6 px-2 text-[10px] text-[#005596] hover:bg-sky-50 font-semibold"
                          >
                            Solicitar Confirmação
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ESTOQUE FUTURO PCP */}
        <TabsContent value="future_pcp" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                    Programação PCP Robotizado (Estoque Futuro / D+1 a D+7)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ordens de fabricação programadas que alimentarão o estoque. Simulações usando
                    estes itens são classificadas como SIMULAÇÃO FUTURA.
                  </CardDescription>
                </div>

                <Select value={filterPcpStatus} onValueChange={setFilterPcpStatus}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">Todos os Status PCP</SelectItem>
                    <SelectItem value="Programada">Programada</SelectItem>
                    <SelectItem value="Em Produção">Em Produção</SelectItem>
                    <SelectItem value="Reprogramada">Reprogramada</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5">Ordem Fabricação</th>
                    <th className="p-2.5">Material & Descrição</th>
                    <th className="p-2.5">Linha de Produção</th>
                    <th className="p-2.5 text-right">Qtd. Prevista</th>
                    <th className="p-2.5 text-center">Data Programada / Turno</th>
                    <th className="p-2.5 text-center">Status PCP</th>
                    <th className="p-2.5 text-center">Confiança</th>
                    <th className="p-2.5">Pedido Relacionado</th>
                    <th className="p-2.5">Observações PCP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPcp.map((pcp) => {
                    const schedDate = new Date(pcp.scheduled_date + 'T12:00:00').toLocaleDateString(
                      'pt-BR',
                    )
                    return (
                      <tr key={pcp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {pcp.production_order_number}
                        </td>
                        <td className="p-2.5">
                          <div className="font-mono font-bold text-[#005596]">
                            {pcp.material_code}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {pcp.material_description}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-800 font-medium">{pcp.line}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-sky-800">
                          {pcp.quantity_planned.toFixed(1)} {pcp.unit}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-sky-300 bg-sky-50 text-sky-900"
                          >
                            Previsto: {schedDate}
                          </Badge>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {pcp.shift || 'Turno Geral'}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold ${
                              pcp.status === 'Em Produção'
                                ? 'bg-emerald-600 text-white'
                                : pcp.status === 'Programada'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-amber-500 text-white'
                            }`}
                          >
                            {pcp.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                          {pcp.confidence_pct ? `${pcp.confidence_pct}%` : '---'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {pcp.related_sales_order
                            ? `Ped. ${pcp.related_sales_order}`
                            : 'Estoque Livre'}
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-500 max-w-[200px]">
                          {pcp.notes || '---'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: WORKFLOW DE CONFIRMAÇÃO DE ESTOQUE */}
        <TabsContent value="requests_workflow" className="space-y-3 mt-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#005596]" />
                Workflow de Confirmação de Estoque (Pátio / Expedição)
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoria e controle de solicitações logísticas de validação física sem alteração
                direta no SAP.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5">Pedido / Material</th>
                    <th className="p-2.5 text-right">Qtd. Solicitada</th>
                    <th className="p-2.5">Solicitante</th>
                    <th className="p-2.5">Motivo / Observações</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Responsável / Resposta</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stockRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhuma solicitação de confirmação registrada.
                      </td>
                    </tr>
                  ) : (
                    stockRequests.map((req) => {
                      const isPending = req.status === 'Solicitada' || req.status === 'Em análise'
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5">
                            <div className="font-mono font-bold text-slate-900">
                              Pedido {req.order_number}
                            </div>
                            <div className="font-mono text-[10px] text-[#005596] font-semibold">
                              {req.material_code}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                            {req.required_quantity} {req.unit || 'TON'}
                          </td>
                          <td className="p-2.5">
                            <div className="text-slate-800 font-medium">
                              {req.requester_name || req.requested_by}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {req.created ? new Date(req.created).toLocaleString('pt-BR') : ''}
                            </div>
                          </td>
                          <td className="p-2.5 text-[11px] max-w-[220px]">
                            <div className="font-semibold text-slate-800">{req.reason}</div>
                            {req.notes && (
                              <div className="text-[10px] text-slate-500">{req.notes}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              className={`text-[9px] font-bold ${
                                req.status === 'Confirmada'
                                  ? 'bg-emerald-600 text-white'
                                  : req.status === 'Confirmada parcialmente'
                                    ? 'bg-sky-600 text-white'
                                    : req.status === 'Negada'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-500 text-white'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-[11px] max-w-[220px]">
                            {req.assigned_to ? (
                              <>
                                <div className="text-slate-800 font-semibold">
                                  {req.assigned_to}
                                </div>
                                <div className="text-[10px] text-slate-600">
                                  {req.response_notes}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">Aguardando análise</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {isPending && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenRespondModal(req)}
                                className="h-6 px-2 text-[10px] bg-slate-800 hover:bg-slate-900 text-white font-bold"
                              >
                                Responder
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: CRIAR SOLICITAÇÃO DE ESTOQUE */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#005596]" />
              Nova Solicitação de Confirmação de Estoque
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro formal para equipe de pátio/expedição conferir lote e saldo físico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Nº do Pedido SAP:</label>
                <Input
                  value={reqOrderNumber}
                  onChange={(e) => setReqOrderNumber(e.target.value)}
                  placeholder="Ex: 4500012890"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Código Material:</label>
                <Input
                  value={reqMaterial}
                  onChange={(e) => setReqMaterial(e.target.value)}
                  placeholder="Ex: MAT-CHAPA-1020-01"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-[11px]">
                Quantidade Necessária (TON):
              </label>
              <Input
                type="number"
                value={reqQty}
                onChange={(e) => setReqQty(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-[11px]">Motivo da Solicitação:</label>
              <Input
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Ex: Saldo divergente / Validação antes do leilão"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-[11px]">
                Observações Adicionais:
              </label>
              <Textarea
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                rows={2}
                placeholder="Detalhes para o operador de pátio..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRequestModalOpen(false)}
              className="text-xs"
              disabled={isSubmittingReq}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStockRequest}
              disabled={isSubmittingReq}
              className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold"
            >
              {isSubmittingReq ? 'Enviando...' : 'Criar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESPONDER SOLICITAÇÃO DE ESTOQUE */}
      <Dialog open={!!respondTarget} onOpenChange={(open) => !open && setRespondTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Responder Solicitação de Confirmação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Validação operacional do pátio para o pedido {respondTarget?.order_number}.
            </DialogDescription>
          </DialogHeader>

          {respondTarget && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="font-mono font-bold text-slate-900">
                  Pedido {respondTarget.order_number} ({respondTarget.material_code})
                </div>
                <div className="text-slate-600 mt-0.5">
                  Qtd. Requerida: <strong>{respondTarget.required_quantity} TON</strong> • Motivo:{' '}
                  {respondTarget.reason}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Decisão Operacional:</label>
                <Select value={respondStatus} onValueChange={(val: any) => setRespondStatus(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Confirmada">Confirmada (Saldo 100% disponível)</SelectItem>
                    <SelectItem value="Confirmada parcialmente">Confirmada Parcialmente</SelectItem>
                    <SelectItem value="Negada">Negada (Saldo físico insuficiente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Quantidade Confirmada (TON):
                </label>
                <Input
                  type="number"
                  value={respondConfirmedQty}
                  onChange={(e) => setRespondConfirmedQty(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Observações do Pátio:
                </label>
                <Textarea
                  value={respondNotes}
                  onChange={(e) => setRespondNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRespondTarget(null)}
              className="text-xs"
              disabled={isSubmittingRespond}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRespondRequest}
              disabled={isSubmittingRespond}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {isSubmittingRespond ? 'Gravando...' : 'Salvar Resposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default StockAndProductionPage
