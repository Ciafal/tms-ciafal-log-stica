import React, { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  Filter,
  Search,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  RefreshCw,
  Send,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Info,
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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  calculateOrderPriorityScore,
} from '@/domain/rules'

export const SalesWalletPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterCustomerTier, setFilterCustomerTier] = useState('ALL')
  const [filterSalesRep, setFilterSalesRep] = useState('ALL')
  const [filterSegment, setFilterSegment] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterCredit, setFilterCredit] = useState('ALL')
  const [filterProduction, setFilterProduction] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterWalletTime, setFilterWalletTime] = useState('ALL')
  const [filterOverdue, setFilterOverdue] = useState('ALL')

  // Stock & Credit Request Modals
  const [stockModalOrder, setStockModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [stockReason, setStockReason] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [isSubmittingStock, setIsSubmittingStock] = useState(false)

  const [creditModalOrder, setCreditModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [creditReason, setCreditReason] = useState('')
  const [creditRequestedVal, setCreditRequestedVal] = useState<number>(0)
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ords, itins] = await Promise.all([
        TmsService.getSapSalesOrders(),
        TmsService.getSapItineraries(),
      ])
      setOrders(ords)
      setItineraries(itins)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar Carteira SAP',
        description: err?.message || 'Falha ao buscar ZSD35.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Order with computed stats
  const processedOrders = useMemo(() => {
    const today = new Date()
    return orders.map((o) => {
      // 1. Tempo em Carteira (dias desde a entrada do pedido)
      let walletDays = 0
      if (o.order_date) {
        const d = new Date(o.order_date)
        walletDays = Math.max(
          0,
          Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)),
        )
      }

      // 2. Atraso em relação à data desejada pelo cliente
      let overdueDays = 0
      let delayText = 'No prazo'
      let isOverdue = false
      if (o.desired_date) {
        const desired = new Date(o.desired_date)
        const diffDays = Math.floor((today.getTime() - desired.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0) {
          overdueDays = diffDays
          delayText = `${diffDays} dias de atraso`
          isOverdue = true
        } else if (diffDays === 0) {
          delayText = 'Vence hoje'
        } else {
          delayText = `Faltam ${Math.abs(diffDays)} dias`
        }
      }

      const priority = calculateOrderPriorityScore(o)

      return {
        ...o,
        walletDays,
        overdueDays,
        delayText,
        isOverdue,
        priorityScore: priority.totalScore,
        priorityClass: priority.classification,
        priorityExplanation: priority.explanation,
      }
    })
  }, [orders])

  // Filtered List
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.material && o.material.toLowerCase().includes(q)) ||
          (o.sales_rep && o.sales_rep.toLowerCase().includes(q)) ||
          o.destination_city.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterItinerary !== 'ALL' && o.itinerary_code !== filterItinerary) return false
      if (filterCustomerTier !== 'ALL' && o.customer_tier !== filterCustomerTier) return false
      if (filterSalesRep !== 'ALL' && o.sales_rep !== filterSalesRep) return false
      if (filterSegment !== 'ALL' && o.segment !== filterSegment) return false
      if (filterUf !== 'ALL' && o.uf !== filterUf) return false
      if (filterCredit !== 'ALL' && o.credit_status !== filterCredit) return false
      if (filterProduction !== 'ALL' && o.production_status !== filterProduction) return false
      if (filterStatus !== 'ALL' && o.status !== filterStatus) return false

      if (filterWalletTime !== 'ALL') {
        if (filterWalletTime === '0-3' && (o.walletDays < 0 || o.walletDays > 3)) return false
        if (filterWalletTime === '4-7' && (o.walletDays < 4 || o.walletDays > 7)) return false
        if (filterWalletTime === '8-15' && (o.walletDays < 8 || o.walletDays > 15)) return false
        if (filterWalletTime === '>15' && o.walletDays <= 15) return false
      }

      if (filterOverdue !== 'ALL') {
        if (filterOverdue === 'atrasado' && !o.isOverdue) return false
        if (filterOverdue === 'no_prazo' && o.isOverdue) return false
      }

      return true
    })
  }, [
    processedOrders,
    search,
    filterItinerary,
    filterCustomerTier,
    filterSalesRep,
    filterSegment,
    filterUf,
    filterCredit,
    filterProduction,
    filterStatus,
    filterWalletTime,
    filterOverdue,
  ])

  // Indicators
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const totalWeightTons = filteredOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0) / 1000
    const totalValue = filteredOrders.reduce((acc, o) => acc + (o.total_value || 0), 0)
    const overdueCount = filteredOrders.filter((o) => o.isOverdue).length
    const blockedCreditCount = filteredOrders.filter((o) => o.credit_status === 'Bloqueado').length
    const readyPcpCount = filteredOrders.filter((o) => o.production_status === 'Pronto').length

    return {
      totalOrders,
      totalWeightTons: Math.round(totalWeightTons * 10) / 10,
      totalValue,
      overdueCount,
      blockedCreditCount,
      readyPcpCount,
    }
  }, [filteredOrders])

  // Actions
  const handleOpenStockModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestStockConfirmation) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar confirmação de estoque.',
        variant: 'destructive',
      })
      return
    }
    setStockModalOrder(order)
    setStockReason('Confirmação de saldo físico em estoque para carregamento')
    setStockNotes(
      `Pedido ${order.order_number} (${order.material}). Solicitado saldo para liberação de transporte.`,
    )
  }

  const handleSubmitStockRequest = async () => {
    if (!stockModalOrder) return
    setIsSubmittingStock(true)
    try {
      const res = await TmsService.createStockConfirmationRequest(
        {
          order_number: stockModalOrder.order_number,
          item_number: stockModalOrder.item_number || '000010',
          material_code: stockModalOrder.material || 'MAT-GEN',
          material_description: stockModalOrder.material_description || stockModalOrder.material,
          required_quantity: stockModalOrder.weight_kg / 1000,
          stock_informed: stockModalOrder.weight_kg / 1000,
          unit: 'TON',
          reason: stockReason,
          notes: stockNotes,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Solicitação de Confirmação Enviada',
          description: `Workflow iniciado para o pedido ${stockModalOrder.order_number}. Responsável do Pátio/Estoque notificado.`,
        })
        setStockModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar confirmação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingStock(false)
    }
  }

  const handleOpenCreditModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestCreditReassessment) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar reavaliação de crédito.',
        variant: 'destructive',
      })
      return
    }
    setCreditModalOrder(order)
    setCreditRequestedVal(order.total_value || 0)
    setCreditReason('Liberação de crédito para composição e fechamento de carga completa')
  }

  const handleSubmitCreditRequest = async () => {
    if (!creditModalOrder) return
    setIsSubmittingCredit(true)
    try {
      const res = await TmsService.createCreditReassessmentRequest(
        {
          customer_code: creditModalOrder.customer_code,
          customer_name: creditModalOrder.customer_name,
          order_number: creditModalOrder.order_number,
          order_value: creditModalOrder.total_value,
          requested_value: creditRequestedVal,
          logistic_reason: creditReason,
          desired_delivery_date: creditModalOrder.desired_date,
          days_overdue: (creditModalOrder as any).overdueDays || 0,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Reavaliação de Crédito Enviada',
          description: `Solicitação encaminhada ao setor Financeiro/Crédito para o cliente ${creditModalOrder.customer_name}.`,
        })
        setCreditModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar reavaliação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingCredit(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Carteira de Pedidos (SAP ZSD35)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              FONTE OFICIAL SAP ECC
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Espelho oficial da transação ZSD35 / VA05N com indicadores de tempo em carteira, atraso
            e score determinístico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono bg-slate-50">
            Importação Oficial SAP Controlada
          </Badge>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar ZSD35
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pedidos Filtrados
            </span>
            <div className="text-lg font-black font-mono text-slate-900">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Total</span>
            <div className="text-lg font-black font-mono text-sky-700">
              {metrics.totalWeightTons} t
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Valor da Carteira
            </span>
            <div className="text-lg font-black font-mono text-emerald-700">
              R$ {(metrics.totalValue / 1000).toFixed(0)}k
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-rose-500 block">
              Pedidos Atrasados
            </span>
            <div className="text-lg font-black font-mono text-rose-600">{metrics.overdueCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-amber-500 block">
              Crédito Bloqueado
            </span>
            <div className="text-lg font-black font-mono text-amber-600">
              {metrics.blockedCreditCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-500 block">
              Pronto PCP
            </span>
            <div className="text-lg font-black font-mono text-emerald-600">
              {metrics.readyPcpCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por Pedido SAP, Cliente, Vendedor, Material ou Cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
            {/* Itinerário */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Itinerário:</label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Itinerários</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} ({it.uf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tempo em Carteira */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Tempo Carteira:
              </label>
              <Select value={filterWalletTime} onValueChange={setFilterWalletTime}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Faixas</SelectItem>
                  <SelectItem value="0-3">0 a 3 dias (Verde)</SelectItem>
                  <SelectItem value="4-7">4 a 7 dias (Azul)</SelectItem>
                  <SelectItem value="8-15">8 a 15 dias (Amarelo)</SelectItem>
                  <SelectItem value=">15">&gt; 15 dias (Vermelho)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atraso */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Prazo Cliente:
              </label>
              <Select value={filterOverdue} onValueChange={setFilterOverdue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Prazos</SelectItem>
                  <SelectItem value="atrasado">Apenas Atrasados</SelectItem>
                  <SelectItem value="no_prazo">No Prazo / Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Classificação Cliente */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Classif. Cliente:
              </label>
              <Select value={filterCustomerTier} onValueChange={setFilterCustomerTier}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Classif.</SelectItem>
                  <SelectItem value="A (Estratégico)">A (Estratégico)</SelectItem>
                  <SelectItem value="B (Corporativo)">B (Corporativo)</SelectItem>
                  <SelectItem value="C (Varejo)">C (Varejo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Crédito */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Crédito:</label>
              <Select value={filterCredit} onValueChange={setFilterCredit}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Créditos</SelectItem>
                  <SelectItem value="Liberado">Liberado</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Produção */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Produção PCP:</label>
              <Select value={filterProduction} onValueChange={setFilterProduction}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos PCP</SelectItem>
                  <SelectItem value="Pronto">Pronto</SelectItem>
                  <SelectItem value="Em Produção">Em Produção</SelectItem>
                  <SelectItem value="Programado">Programado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UF */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">UF Destino:</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas UF</SelectItem>
                  <SelectItem value="SP">SP</SelectItem>
                  <SelectItem value="MG">MG</SelectItem>
                  <SelectItem value="RJ">RJ</SelectItem>
                  <SelectItem value="PR">PR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Montagem */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Status Carga:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Status</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="em_montagem">Em Montagem</SelectItem>
                  <SelectItem value="carregado">Carregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2.5">Pedido SAP / Item</th>
                <th className="p-2.5">Cliente & Classificação</th>
                <th className="p-2.5">Vendedor / Segmento</th>
                <th className="p-2.5">Material & Descrição</th>
                <th className="p-2.5 text-right">Peso (t) / Valor</th>
                <th className="p-2.5">Itinerário / Destino</th>
                <th className="p-2.5 text-center">Tempo Carteira</th>
                <th className="p-2.5 text-center">Data Desejada / Atraso</th>
                <th className="p-2.5 text-center">Status PCP</th>
                <th className="p-2.5 text-center">Crédito</th>
                <th className="p-2.5 text-center">Score Prioridade</th>
                <th className="p-2.5 text-center">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  // Wallet time badge color
                  let walletBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  if (order.walletDays > 15) {
                    walletBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                  } else if (order.walletDays >= 8) {
                    walletBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
                  } else if (order.walletDays >= 4) {
                    walletBadgeClass = 'bg-sky-100 text-sky-800 border-sky-300'
                  }

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Pedido & Item */}
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-slate-900">
                          {order.order_number}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Item: {order.item_number || '000010'}
                        </div>
                      </td>

                      {/* Cliente & Classificação Oficial */}
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Cód: {order.customer_code}
                        </div>
                        {order.customer_tier ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 mt-0.5 border-slate-300 bg-slate-50"
                          >
                            {order.customer_tier}
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            Sem classificação
                          </span>
                        )}
                      </td>

                      {/* Vendedor & Segmento */}
                      <td className="p-2.5 text-[11px]">
                        <div className="text-slate-800 font-medium">
                          {order.sales_rep || 'Representante Padrão'}
                        </div>
                        <div className="text-[10px] text-slate-500">{order.segment || 'Geral'}</div>
                      </td>

                      {/* Material */}
                      <td className="p-2.5">
                        <div className="font-mono font-semibold text-[#005596] text-xs">
                          {order.material}
                        </div>
                        <div className="text-[10px] text-slate-500 max-w-[180px] truncate">
                          {order.material_description || order.material}
                        </div>
                      </td>

                      {/* Peso & Valor */}
                      <td className="p-2.5 text-right font-mono">
                        <div className="font-bold text-slate-900">
                          {(order.weight_kg / 1000).toFixed(1)} t
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          R$ {order.total_value.toLocaleString('pt-BR')}
                        </div>
                      </td>

                      {/* Itinerário */}
                      <td className="p-2.5">
                        <Badge className="bg-[#005596] text-white text-[10px] font-mono">
                          {order.itinerary_code}
                        </Badge>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          {order.destination_city} / {order.uf}
                        </div>
                      </td>

                      {/* Tempo em Carteira */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${walletBadgeClass}`}
                        >
                          {order.walletDays} dias
                        </Badge>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Entrada:{' '}
                          {order.order_date
                            ? new Date(order.order_date + 'T12:00:00').toLocaleDateString('pt-BR')
                            : '---'}
                        </div>
                      </td>

                      {/* Data Desejada / Atraso */}
                      <td className="p-2.5 text-center">
                        <div className="font-mono text-xs font-semibold">
                          {order.desired_date
                            ? new Date(order.desired_date + 'T12:00:00').toLocaleDateString('pt-BR')
                            : '---'}
                        </div>
                        <Badge
                          className={`text-[9px] font-bold mt-0.5 ${
                            order.isOverdue
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {order.delayText}
                        </Badge>
                      </td>

                      {/* Status PCP */}
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[9px] font-bold ${
                            order.production_status === 'Pronto'
                              ? 'bg-emerald-600 text-white'
                              : order.production_status === 'Em Produção'
                                ? 'bg-sky-600 text-white'
                                : 'bg-amber-500 text-white'
                          }`}
                        >
                          {order.production_status}
                        </Badge>
                      </td>

                      {/* Crédito */}
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[9px] font-bold ${
                            order.credit_status === 'Liberado'
                              ? 'bg-emerald-600 text-white'
                              : order.credit_status === 'Em Análise'
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-600 text-white'
                          }`}
                        >
                          {order.credit_status}
                        </Badge>
                      </td>

                      {/* Score Determinístico */}
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] font-mono font-bold ${
                            order.priorityClass === 'ALTA PRIORIDADE'
                              ? 'bg-rose-700 text-white'
                              : order.priorityClass === 'PRIORIDADE MÉDIA'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-600 text-white'
                          }`}
                          title={order.priorityExplanation}
                        >
                          {order.priorityScore} pts
                        </Badge>
                      </td>

                      {/* Ações */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStockModal(order)}
                            className="h-6 px-1.5 text-[10px] text-sky-700 hover:bg-sky-50"
                            title="Solicitar Confirmação de Estoque ao Pátio"
                          >
                            Estoque
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreditModal(order)}
                            className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50"
                            title="Solicitar Reavaliação de Crédito ao Financeiro"
                          >
                            Crédito
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Stock Confirmation Request Modal */}
      <Dialog open={!!stockModalOrder} onOpenChange={(open) => !open && setStockModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#005596]" />
              Solicitar Confirmação de Estoque
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal para verificação física de saldo de laminados. Não altera o SAP
              diretamente.
            </DialogDescription>
          </DialogHeader>

          {stockModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">Pedido / Item</span>
                  <strong>{stockModalOrder.order_number}</strong> (Item{' '}
                  {stockModalOrder.item_number || '000010'})
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Material</span>
                  <strong className="text-[#005596]">{stockModalOrder.material}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Quantidade Necessária</span>
                  <strong>{(stockModalOrder.weight_kg / 1000).toFixed(1)} TON</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Status PCP Atual</span>
                  <Badge variant="outline">{stockModalOrder.production_status}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Motivo da Solicitação:
                </label>
                <Input
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Observações / Detalhes:
                </label>
                <Textarea
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingStock}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitStockRequest}
              disabled={isSubmittingStock}
              className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold"
            >
              {isSubmittingStock ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Reassessment Request Modal */}
      <Dialog open={!!creditModalOrder} onOpenChange={(open) => !open && setCreditModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Solicitar Reavaliação de Crédito
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal Logística → Financeiro para liberação ou desbloqueio de valor de
              pedido.
            </DialogDescription>
          </DialogHeader>

          {creditModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 grid grid-cols-2 gap-2 text-amber-950">
                <div>
                  <span className="text-amber-700 text-[10px] block">Cliente</span>
                  <strong>{creditModalOrder.customer_name}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Pedido SAP</span>
                  <strong>{creditModalOrder.order_number}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Valor do Pedido</span>
                  <strong>R$ {creditModalOrder.total_value.toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Status Atual</span>
                  <Badge className="bg-amber-600 text-white text-[9px]">
                    {creditModalOrder.credit_status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Valor Solicitado para Desbloqueio (R$):
                </label>
                <Input
                  type="number"
                  value={creditRequestedVal}
                  onChange={(e) => setCreditRequestedVal(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Justificativa Logística:
                </label>
                <Textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingCredit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCreditRequest}
              disabled={isSubmittingCredit}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              {isSubmittingCredit ? 'Enviando...' : 'Encaminhar ao Financeiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default SalesWalletPage
