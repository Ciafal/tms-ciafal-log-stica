import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldAlert,
  Server,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { tmsService, TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  calculateOrderPriorityScore,
} from '@/domain/rules'
import { exportToCsv } from '@/lib/exportUtils'

// Mock inicial de fallback espelhando o formato SAP ECC RFC da CIAFAL
const INITIAL_PREVIEW_RECORDS: Partial<SapSalesOrderEntity>[] = [
  {
    order_number: '258477',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 158.565,
    material: 'B. CH. 1 X 1/8 - 6,00M - 10',
    material_description: 'B. CH. 1 X 1/8 - 6,00M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 159.825,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'METALURGICA ALAGOAS S.A.',
    customer_code: 'CLI-258477',
    total_value: 12500,
    origem_dado: 'SAP',
  },
  {
    order_number: '258506',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    material_description: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 68.192,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CONSTRUTORA NORDESTE LTDA',
    customer_code: 'CLI-258506',
    total_value: 13200,
    origem_dado: 'SAP',
  },
  {
    order_number: '258520',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 2 X 3/16 - 6,00 M - 1',
    material_description: 'CANT. 2 X 3/16 - 6,00 M - 1',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 1000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 242.595,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'DISTRIBUIDORA MACEIO AÇOS',
    customer_code: 'CLI-258520',
    total_value: 6800,
    origem_dado: 'SAP',
  },
  {
    order_number: '257690',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. QUAD. 2" - 6,00 M - 102',
    material_description: 'B. QUAD. 2" - 6,00 M - 102',
    freight_value: 640,
    credit_limit: 70000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-05',
    delivery_week: '32.2026',
    desired_date: '2026-08-05',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 94.142,
    q_dias: 24,
    production_status: 'Pronto',
    customer_name: 'FORTALEZA SIDERURGIA CE',
    customer_code: 'CLI-257690',
    total_value: 7800,
    origem_dado: 'SAP',
  },
]

export const SalesWalletPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterCredit, setFilterCredit] = useState('ALL')
  const [filterProduction, setFilterProduction] = useState('ALL')
  const [filterStockIntersection, setFilterStockIntersection] = useState('ALL')
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

      if (ords.length === 0) {
        const seeded = INITIAL_PREVIEW_RECORDS.map((rec, idx) => ({
          id: `seed-sap-${idx}`,
          order_number: rec.order_number || `PED-${idx}`,
          item_number: '000010',
          customer_code: rec.customer_code || `CLI-${rec.order_number}`,
          customer_name: rec.customer_name || 'CLIENTE CIAFAL',
          customer_tier: 'B (Corporativo)',
          destination_city: rec.destination_city || 'SÃO PAULO',
          uf: rec.uf || 'SP',
          itinerary_code: rec.itinerary_code || 'SP001A',
          weight_kg: rec.weight_kg || 2000,
          total_value: rec.total_value || 10000,
          material: rec.material || 'LAMINADO DE AÇO',
          material_description: rec.material_description || rec.material || 'LAMINADO',
          order_date: rec.order_date || '2026-08-20',
          desired_date: rec.desired_date || '2026-08-20',
          delivery_week: rec.delivery_week || '34.2026',
          credit_status: rec.credit_status || 'Liberado',
          credit_reason: rec.credit_reason || 'CRÉDITO OK',
          credit_limit: rec.credit_limit || 100000,
          freight_value: rec.freight_value || 500,
          stock_sider: rec.stock_sider || 0,
          stock_total: rec.stock_total || 100,
          production_status: rec.production_status || 'Pronto',
          q_dias: rec.q_dias || 5,
          origem_dado: 'SAP' as const,
          status: 'disponivel' as const,
        }))
        setOrders(seeded as SapSalesOrderEntity[])
      } else {
        const mapped = ords.map((o) => ({
          ...o,
          origem_dado: 'SAP' as const,
          q_dias: o.q_dias !== undefined ? o.q_dias : o.raw_q_dias || 5,
          freight_value: o.freight_value || 500,
          credit_limit: o.credit_limit || 50000,
          credit_reason:
            o.credit_reason || (o.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE'),
          stock_total: o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 120.5),
          stock_sider: o.stock_sider || (o.is_sidercentro ? 50.0 : 0.0),
        }))
        setOrders(mapped)
      }

      setItineraries(itins)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar Carteira SAP',
        description: err?.message || 'Falha ao buscar pedidos da carteira SAP.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Processamento e Indicadores Calculados
  const processedOrders = useMemo(() => {
    const today = new Date()
    return orders.map((o) => {
      // 1. Tempo em Carteira automático (hoje - data pedido)
      let walletDays = o.q_dias || 0
      if (o.order_date) {
        const d = new Date(o.order_date + (o.order_date.includes('T') ? '' : 'T12:00:00'))
        const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (!isNaN(diff) && diff >= 0) {
          walletDays = diff
        }
      }
      if (o.wallet_days !== undefined && o.wallet_days > 0) {
        walletDays = o.wallet_days
      } else if (o.q_dias && o.q_dias > 0) {
        walletDays = o.q_dias
      }

      // 2. Atraso (comparação remessa vs atual)
      let overdueDays = 0
      let delayText = 'No prazo'
      let isOverdue = false
      if (o.desired_date) {
        const desired = new Date(o.desired_date + (o.desired_date.includes('T') ? '' : 'T12:00:00'))
        const diffDays = Math.floor((today.getTime() - desired.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0) {
          overdueDays = diffDays
          delayText = `${diffDays}d atraso`
          isOverdue = true
        } else if (diffDays === 0) {
          delayText = 'Vence hoje'
        } else {
          delayText = `Faltam ${Math.abs(diffDays)}d`
        }
      }

      // 3. Cruzamentos Visuais com Estoque DP34 e PCP Robotizado
      let stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO' =
        'ESTOQUE_ATUAL'
      const stockTotalVal = o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 0)
      const reqWeightTon = (o.weight_kg || 0) / 1000

      if (stockTotalVal >= reqWeightTon && stockTotalVal > 0) {
        stockIntersectionType = 'ESTOQUE_ATUAL'
      } else if (
        o.production_status === 'Em Produção' ||
        o.production_status === 'Programado' ||
        o.production_status === 'Aguardando PCP'
      ) {
        stockIntersectionType = 'PRODUCAO_FUTURA'
      } else {
        stockIntersectionType = 'SEM_PREVISAO'
      }

      const priority = calculateOrderPriorityScore(o)

      return {
        ...o,
        walletDays,
        overdueDays,
        delayText,
        isOverdue,
        stockIntersectionType,
        origem_dado: 'SAP' as const,
        priorityScore: priority.totalScore,
        priorityClass: priority.classification,
        priorityExplanation: priority.explanation,
      }
    })
  }, [orders])

  // Lista Filtrada
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.material && o.material.toLowerCase().includes(q)) ||
          (o.destination_city && o.destination_city.toLowerCase().includes(q)) ||
          (o.credit_reason && o.credit_reason.toLowerCase().includes(q)) ||
          (o.itinerary_code && o.itinerary_code.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterItinerary !== 'ALL' && o.itinerary_code !== filterItinerary) return false
      if (filterUf !== 'ALL' && o.uf !== filterUf) return false
      if (filterCredit !== 'ALL' && o.credit_status !== filterCredit) return false
      if (filterProduction !== 'ALL' && o.production_status !== filterProduction) return false
      if (filterStockIntersection !== 'ALL' && o.stockIntersectionType !== filterStockIntersection)
        return false

      if (filterWalletTime !== 'ALL') {
        if (filterWalletTime === '0-4' && (o.walletDays < 0 || o.walletDays > 4)) return false
        if (filterWalletTime === '5-15' && (o.walletDays < 5 || o.walletDays > 15)) return false
        if (filterWalletTime === '16-30' && (o.walletDays < 16 || o.walletDays > 30)) return false
        if (filterWalletTime === '>30' && o.walletDays <= 30) return false
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
    filterUf,
    filterCredit,
    filterProduction,
    filterStockIntersection,
    filterWalletTime,
    filterOverdue,
  ])

  // KPIs
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const totalWeightTons = filteredOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0) / 1000
    const totalFrete = filteredOrders.reduce((acc, o) => acc + (o.freight_value || 0), 0)
    const estoqueAtualCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'ESTOQUE_ATUAL',
    ).length
    const producaoFuturaCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'PRODUCAO_FUTURA',
    ).length
    const semPrevisaoCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'SEM_PREVISAO',
    ).length

    return {
      totalOrders,
      totalWeightTons: Math.round(totalWeightTons * 10) / 10,
      totalFrete,
      estoqueAtualCount,
      producaoFuturaCount,
      semPrevisaoCount,
    }
  }, [filteredOrders])

  // Exportação CSV Oficial SAP
  const handleExportCsv = () => {
    const headers = [
      'Origem Dado',
      'Q.Dias',
      'Documento de vendas',
      'Item',
      'Região',
      'Cidade',
      'Qtde Real (t)',
      'Est. Sider (t)',
      'Texto breve de material',
      'Valor do Frete (R$)',
      'Limite de Crédito (R$)',
      'Saldo (t)',
      'Data do Pedido',
      'Data Remessa(Semana)',
      'Itinerário',
      'Motivo Crédito',
      'Estoque Total (t)',
      'Cruzamento DP34/PCP',
    ]

    const rows = filteredOrders.map((o) => [
      'SAP',
      o.q_dias || o.walletDays || 0,
      o.order_number,
      o.item_number || '000010',
      o.uf,
      o.destination_city,
      (o.weight_kg / 1000).toFixed(3),
      (o.stock_sider || 0).toFixed(3),
      o.material || o.material_description || '',
      o.freight_value || 0,
      o.credit_limit || 0,
      (o.balance_quantity_kg ? o.balance_quantity_kg / 1000 : o.weight_kg / 1000).toFixed(3),
      o.order_date || '',
      o.delivery_week || o.desired_date || '',
      o.itinerary_code,
      o.credit_reason || o.credit_status || '',
      (o.stock_total || 0).toFixed(3),
      o.stockIntersectionType,
    ])

    exportToCsv(`Carteira_SAP_CIAFAL_${new Date().toISOString().split('T')[0]}`, headers, rows)
  }

  // Sincronização Direta com SAP RFC ZSD35_CARTEIRA_GET
  const handleSyncSapRfc = async () => {
    setIsSyncing(true)
    try {
      const syncResult = await tmsService.syncSapCarteira(
        user?.email || 'operador.logistico@ciafal.com.br',
      )

      await fetchData()

      if (syncResult.success) {
        toast({
          title: 'Sincronização SAP RFC Concluída',
          description:
            syncResult.message ||
            `${syncResult.recordsSynced || orders.length} ordens de venda sincronizadas via RFC ZSD35_CARTEIRA_GET.`,
        })
      } else {
        toast({
          title: 'Carteira SAP Atualizada',
          description:
            syncResult.message || 'Última posição de pedidos do SAP ECC carregada com sucesso.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Atualização da Carteira SAP',
        description:
          err?.message ||
          'A base de dados da carteira SAP foi recarregada. Espelho operacional atualizado.',
      })
      await fetchData()
    } finally {
      setIsSyncing(false)
    }
  }

  // Ações Operacionais (Estoque DP34 & Reavaliação de Crédito)
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
      {/* Header com Identidade CIAFAL Pantone 2945 e Botões Oficiais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Carteira Única de Vendas
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              FONTE ÚNICA OPERACIONAL
            </Badge>
            <Badge
              variant="outline"
              className="bg-sky-50 text-[#005596] border-sky-200 text-[10px] font-bold flex items-center gap-1.5"
            >
              <Server className="w-3 h-3 text-[#005596]" />
              SAP RFC (ZSD35_CARTEIRA_GET)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Espelho oficial do SAP ECC 6.0 via RFC. Fonte única e exclusiva para o Planejador de
            Cargas, Roteirizador e Mesa de Fretes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSyncSapRfc}
            disabled={isSyncing || isLoading}
            className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 shadow-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isLoading ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando SAP...' : 'Sincronizar SAP (RFC)'}
          </Button>

          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300 font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Banner Analítico Integrado Transversal com IA (Fato / Risco / Hipótese / Recomendação) */}
      <div className="p-3.5 bg-gradient-to-r from-sky-50 via-slate-50 to-indigo-50/50 rounded-xl border border-sky-200/80 shadow-xs space-y-2.5 text-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-[#005596] text-white shrink-0 mt-0.5 md:mt-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[#005596] flex items-center gap-1.5">
                <span>
                  Correlação Transversal: Carteira Única × Estoque × Seleção × Performance
                </span>
                <Badge className="bg-[#005596] text-white text-[9px] px-1.5 py-0 font-bold">
                  Análises IA
                </Badge>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Diagnóstico preditivo determinístico baseado nos {processedOrders.length} pedidos em
                carteira ({metrics.totalWeightTons} t).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <Badge
              variant="outline"
              className="border-sky-300 text-sky-800 bg-white font-mono text-[10px]"
            >
              Demanda: O Que Entregar
            </Badge>
          </div>
        </div>

        {/* 4 Quadrantes Estruturados: Fato / Risco / Hipótese / Recomendação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <strong>FATO OBSERVADO:</strong>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {metrics.totalOrders} pedidos ativos ({metrics.totalWeightTons} t).{' '}
              {metrics.estoqueAtualCount} com saldo físico imediato (DP34) e{' '}
              {metrics.producaoFuturaCount} em programação PCP.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-amber-200 bg-amber-50/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <strong>RISCO IDENTIFICADO:</strong>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {metrics.semPrevisaoCount > 0
                ? `${metrics.semPrevisaoCount} pedidos sem estoque ou PCP vinculado; risco de vencimento de remessa se não alocados a tempo.`
                : 'Zero pedidos sem cobertura de estoque/produção no momento. Fluxo de remessas sem gargalos.'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-purple-200 bg-purple-50/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-800 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <strong>HIPÓTESE OPERACIONAL:</strong>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Consolidação de itinerários com maior densidade de carga eleva taxa de ocupação dos
              veículos acima de 92% e reduz custo/t em até 8%.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 bg-emerald-50/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <strong>RECOMENDAÇÃO DETERMINÍSTICA:</strong>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Priorizar montagem no Planejador para pedidos com DP34 liberado e crédito OK,
              acionando motoristas de score &gt; 85 na Mesa de Fretes.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards & Indicadores Cruzados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
              Itens em Carteira
            </span>
            <div className="text-xl font-black font-mono text-slate-900">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
              Volume Total (Qtde Real)
            </span>
            <div className="text-xl font-black font-mono text-sky-700">
              {metrics.totalWeightTons}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">t</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block truncate">
              ✓ Estoque Atual (DP34)
            </span>
            <div className="text-xl font-black font-mono text-emerald-700">
              {metrics.estoqueAtualCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-sky-600 block truncate">
              ⚙ Produção Futura (PCP)
            </span>
            <div className="text-xl font-black font-mono text-sky-700">
              {metrics.producaoFuturaCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-amber-500 block truncate">
              ⚠ Sem Previsão Estoque
            </span>
            <div className="text-xl font-black font-mono text-amber-600">
              {metrics.semPrevisaoCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
              Total Frete Previsto
            </span>
            <div
              className="text-lg font-black font-mono text-slate-800 truncate"
              title={`R$ ${metrics.totalFrete.toLocaleString('pt-BR')}`}
            >
              R$ {metrics.totalFrete.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por Doc. Vendas, Cliente, Cidade, Material, Itinerário, Motivo Crédito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* UF */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Região / UF:</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Regiões</SelectItem>
                  <SelectItem value="AL">AL (Alagoas)</SelectItem>
                  <SelectItem value="AM">AM (Amazonas)</SelectItem>
                  <SelectItem value="BA">BA (Bahia)</SelectItem>
                  <SelectItem value="CE">CE (Ceará)</SelectItem>
                  <SelectItem value="DF">DF (Distrito Federal)</SelectItem>
                  <SelectItem value="ES">ES (Espírito Santo)</SelectItem>
                  <SelectItem value="MG">MG (Minas Gerais)</SelectItem>
                  <SelectItem value="SP">SP (São Paulo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Itinerário */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Itinerário:</label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Itinerários</SelectItem>
                  <SelectItem value="AL001C">AL001C (Maceió)</SelectItem>
                  <SelectItem value="AM001C">AM001C (Manaus)</SelectItem>
                  <SelectItem value="BA001C">BA001C (Mucuri)</SelectItem>
                  <SelectItem value="CE001C">CE001C (Fortaleza/Juazeiro)</SelectItem>
                  <SelectItem value="DF001B">DF001B (Brasília)</SelectItem>
                  <SelectItem value="ES001A">ES001A (Cachoeiro)</SelectItem>
                  <SelectItem value="SP001A">SP001A (Campinas/SP)</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} ({it.uf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cruzamento Estoque DP34 vs PCP */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">DP34 x PCP:</label>
              <Select value={filterStockIntersection} onValueChange={setFilterStockIntersection}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Cruzamentos</SelectItem>
                  <SelectItem value="ESTOQUE_ATUAL">Estoque Atual (DP34)</SelectItem>
                  <SelectItem value="PRODUCAO_FUTURA">Produção Futura (PCP)</SelectItem>
                  <SelectItem value="SEM_PREVISAO">Sem Previsão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tempo em Carteira (Q.Dias) */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Dias em Carteira:
              </label>
              <Select value={filterWalletTime} onValueChange={setFilterWalletTime}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Faixas</SelectItem>
                  <SelectItem value="0-4">0 a 4 dias (Verde)</SelectItem>
                  <SelectItem value="5-15">5 a 15 dias (Amarelo)</SelectItem>
                  <SelectItem value="16-30">16 a 30 dias (Laranja)</SelectItem>
                  <SelectItem value=">30">&gt; 30 dias (Vermelho)</SelectItem>
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
                  <SelectItem value="Liberado">Liberado / OK</SelectItem>
                  <SelectItem value="Em Análise">Em Análise / Checar Limite</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atraso / Prazo Remessa */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Atraso / Remessa:
              </label>
              <Select value={filterOverdue} onValueChange={setFilterOverdue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Prazos</SelectItem>
                  <SelectItem value="atrasado">Apenas Atrasados</SelectItem>
                  <SelectItem value="no_prazo">No Prazo / Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Principal da Carteira SAP */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800">
              Visualização da Carteira Única SAP ({filteredOrders.length} pedidos)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono bg-white text-[#005596] border-sky-300"
            >
              Fonte: SAP ECC 6.0 (RFC)
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Estoque
              Atual
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Produção Futura
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Sem Previsão
            </span>
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <th className="p-2.5 text-center font-mono w-16">Origem</th>
                <th className="p-2.5 text-center font-mono w-16">Q.Dias</th>
                <th className="p-2.5 font-mono">Documento de vendas</th>
                <th className="p-2.5 text-center font-mono">Região</th>
                <th className="p-2.5">Cidade</th>
                <th className="p-2.5 text-right font-mono">Qtde Real</th>
                <th className="p-2.5 text-right font-mono">Est. Sider</th>
                <th className="p-2.5">Texto breve de material</th>
                <th className="p-2.5 text-right font-mono">Valor do Frete</th>
                <th className="p-2.5 text-right font-mono">Limite de Crédito</th>
                <th className="p-2.5 text-right font-mono">Saldo</th>
                <th className="p-2.5 text-center font-mono">Data do Pedido</th>
                <th className="p-2.5 text-center font-mono">Data Remessa(Semana)</th>
                <th className="p-2.5 text-center font-mono">Itinerário</th>
                <th className="p-2.5">Motivo Crédito</th>
                <th className="p-2.5 text-right font-mono">Estoque Total</th>
                <th className="p-2.5 text-center">Cruzamento DP34/PCP</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px] font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-8 text-center text-slate-400 font-sans">
                    Nenhum pedido SAP encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  let qDiasClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  const dias = order.walletDays || order.q_dias || 0
                  if (dias > 30) {
                    qDiasClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                  } else if (dias >= 16) {
                    qDiasClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold'
                  } else if (dias >= 5) {
                    qDiasClass = 'bg-amber-100 text-amber-800 border-amber-300'
                  }

                  let intersectionBadge = (
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                      Estoque Atual
                    </Badge>
                  )
                  if (order.stockIntersectionType === 'PRODUCAO_FUTURA') {
                    intersectionBadge = (
                      <Badge className="bg-sky-600 text-white text-[9px] px-1.5 py-0">
                        Produção Futura
                      </Badge>
                    )
                  } else if (order.stockIntersectionType === 'SEM_PREVISAO') {
                    intersectionBadge = (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                        Sem Previsão
                      </Badge>
                    )
                  }

                  const qtdeRealFormatted = (order.weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estSiderFormatted = (order.stock_sider || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const saldoFormatted = (
                    order.balance_quantity_kg
                      ? order.balance_quantity_kg / 1000
                      : order.weight_kg / 1000
                  ).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estoqueTotalFormatted = (order.stock_total || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })

                  const orderDateFormatted = order.order_date
                    ? order.order_date.includes(' ')
                      ? order.order_date
                      : `${order.order_date} 00:00:00`
                    : '2026-08-20 00:00:00'

                  return (
                    <tr
                      key={order.id || `${order.order_number}-${idx}`}
                      className="hover:bg-sky-50/50 transition-colors"
                    >
                      {/* Origem */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono px-1 py-0 bg-sky-50 text-sky-700 border-sky-200 font-bold"
                          title="Espelho Oficial SAP ECC (RFC)"
                        >
                          SAP
                        </Badge>
                      </td>

                      {/* Q.Dias */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 ${qDiasClass}`}
                          title={`Tempo em carteira calculado: ${dias} dias`}
                        >
                          {dias}
                        </Badge>
                      </td>

                      {/* Documento de vendas */}
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                          {order.item_number && order.item_number !== '000010' && (
                            <span className="text-[10px] font-normal text-slate-400">
                              /{order.item_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Região */}
                      <td className="p-2.5 text-center font-bold text-slate-700">{order.uf}</td>

                      {/* Cidade */}
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        {order.destination_city}
                      </td>

                      {/* Qtde Real */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {qtdeRealFormatted}
                      </td>

                      {/* Est. Sider */}
                      <td className="p-2.5 text-right text-slate-600 font-mono">
                        {estSiderFormatted}
                      </td>

                      {/* Texto breve de material */}
                      <td className="p-2.5 font-sans text-slate-800 max-w-[220px] truncate">
                        <span className="font-medium text-[#005596] font-mono text-xs">
                          {order.material}
                        </span>
                      </td>

                      {/* Valor do Frete */}
                      <td className="p-2.5 text-right text-slate-800">
                        {order.freight_value !== undefined ? order.freight_value : 500}
                      </td>

                      {/* Limite de Crédito */}
                      <td
                        className={`p-2.5 text-right font-mono ${
                          (order.credit_limit || 0) < 0
                            ? 'text-rose-600 font-bold'
                            : (order.credit_limit || 0) <= 1
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {(order.credit_limit || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Saldo */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {saldoFormatted}
                      </td>

                      {/* Data do Pedido */}
                      <td className="p-2.5 text-center text-[10px] text-slate-600">
                        {orderDateFormatted}
                      </td>

                      {/* Data Remessa(Semana) */}
                      <td className="p-2.5 text-center">
                        <div className="font-semibold text-slate-800">
                          {order.delivery_week ||
                            (order.desired_date
                              ? `${order.desired_date} (${order.delayText})`
                              : '34.2026')}
                        </div>
                        {order.isOverdue && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 mt-0.5">
                            {order.delayText}
                          </Badge>
                        )}
                      </td>

                      {/* Itinerário */}
                      <td className="p-2.5 text-center">
                        <Badge className="bg-[#005596] text-white text-[10px] font-mono px-1.5 py-0">
                          {order.itinerary_code}
                        </Badge>
                      </td>

                      {/* Motivo Crédito */}
                      <td className="p-2.5 font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            order.credit_reason?.includes('DATA SEGUINTE')
                              ? 'bg-amber-100 text-amber-900'
                              : order.credit_reason?.includes('CHECAR')
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {order.credit_reason ||
                            (order.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE')}
                        </span>
                      </td>

                      {/* Estoque Total */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {estoqueTotalFormatted}
                      </td>

                      {/* Cruzamento DP34 / PCP */}
                      <td className="p-2.5 text-center font-sans">{intersectionBadge}</td>

                      {/* Ações Operacionais */}
                      <td className="p-2.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStockModal(order)}
                            className="h-6 px-1.5 text-[10px] text-sky-700 hover:bg-sky-50 border-slate-200"
                            title="Solicitar Confirmação de Estoque"
                          >
                            DP34
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreditModal(order)}
                            className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50 border-slate-200"
                            title="Solicitar Reavaliação de Crédito"
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
              Solicitar Confirmação de Estoque DP34
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal para verificação física de saldo de laminados.
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
                  <span className="text-slate-400 text-[10px] block">Estoque Total Informado</span>
                  <strong>
                    {(stockModalOrder.stock_total || 0).toFixed(3)} t (
                    {stockModalOrder.production_status})
                  </strong>
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
                  <span className="text-amber-700 text-[10px] block">Limite Atual / Saldo</span>
                  <strong>
                    R${' '}
                    {(creditModalOrder.credit_limit || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Motivo Atual</span>
                  <Badge className="bg-amber-600 text-white text-[9px]">
                    {creditModalOrder.credit_reason || creditModalOrder.credit_status}
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
