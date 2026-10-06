import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Building,
  Package,
  Calendar,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react'
import type { OrderStockCreditClassification } from '@/domain/operacaoHojeWalletEngine'
import type { SapSalesOrderEntity } from '@/domain/rules'
import { TmsService } from '@/services/tmsService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

interface CarteiraEstoqueSemCreditoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: OrderStockCreditClassification[]
}

export const CarteiraEstoqueSemCreditoModal: React.FC<CarteiraEstoqueSemCreditoModalProps> = ({
  open,
  onOpenChange,
  items,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItinerary, setSelectedItinerary] = useState<string>('ALL')

  // Estado para pedido em reavaliação de crédito
  const [reassessmentOrder, setReassessmentOrder] = useState<SapSalesOrderEntity | null>(null)
  const [reassessmentReason, setReassessmentReason] = useState('')
  const [reassessmentValue, setReassessmentValue] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Itinerários únicos para filtro
  const itineraries = useMemo(() => {
    const set = new Set(items.map((i) => i.order.itinerary_code).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ord = item.order
      if (selectedItinerary !== 'ALL' && ord.itinerary_code !== selectedItinerary) {
        return false
      }
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        ord.order_number.toLowerCase().includes(q) ||
        ord.customer_name.toLowerCase().includes(q) ||
        ord.customer_code.toLowerCase().includes(q) ||
        (ord.material && ord.material.toLowerCase().includes(q)) ||
        (ord.material_description && ord.material_description.toLowerCase().includes(q)) ||
        (ord.sales_rep && ord.sales_rep.toLowerCase().includes(q)) ||
        (ord.destination_city && ord.destination_city.toLowerCase().includes(q))
      )
    })
  }, [items, searchTerm, selectedItinerary])

  // Totais filtrados
  const totals = useMemo(() => {
    const ordersCount = new Set(filteredItems.map((i) => i.order.order_number)).size
    const totalTons = filteredItems.reduce((acc, i) => acc + i.pendingWeightTon, 0)
    const totalStockTons = filteredItems.reduce((acc, i) => acc + i.effectiveStockTon, 0)
    const totalValue = filteredItems.reduce(
      (acc, i) => acc + (i.order.total_value || i.order.order_value || 0),
      0,
    )
    return {
      ordersCount,
      itemsCount: filteredItems.length,
      totalTons,
      totalStockTons,
      totalValue,
    }
  }, [filteredItems])

  const handleOpenReassessment = (order: SapSalesOrderEntity) => {
    setReassessmentOrder(order)
    setReassessmentValue(order.total_value || order.order_value || 0)
    setReassessmentReason(
      `Liberação emergencial de crédito para pedido com estoque físico já disponível (${(order.weight_kg / 1000).toFixed(2)} t).`,
    )
  }

  const handleSubmitReassessment = async () => {
    if (!reassessmentOrder) return
    setIsSubmitting(true)
    try {
      await TmsService.createCreditReassessmentRequest(
        {
          customer_code: reassessmentOrder.customer_code,
          customer_name: reassessmentOrder.customer_name,
          order_number: reassessmentOrder.order_number,
          order_value: reassessmentOrder.total_value || reassessmentOrder.order_value || 0,
          requested_value: reassessmentValue,
          logistic_reason: reassessmentReason,
          desired_delivery_date: reassessmentOrder.desired_date,
          days_overdue: (reassessmentOrder as any).delay_days || 0,
        },
        user?.email || 'operador.tms@ciafal.com.br',
        user?.name || 'Operador Logística',
      )

      // Registrar auditoria
      await TmsService.logAudit({
        user_name: user?.name || 'Operador Logística',
        user_email: user?.email || 'operador.tms@ciafal.com.br',
        action: 'SOLICITAR_REAVALIACAO_CREDITO',
        resource: 'sap_sales_orders',
        resource_id: reassessmentOrder.order_number,
        payload: {
          order_number: reassessmentOrder.order_number,
          customer_code: reassessmentOrder.customer_code,
          requested_value: reassessmentValue,
          reason: reassessmentReason,
        },
      })

      toast({
        title: 'Reavaliação de Crédito Solicitada',
        description: `Workflow iniciado para o pedido ${reassessmentOrder.order_number} junto ao setor financeiro.`,
      })
      setReassessmentOrder(null)
    } catch (err: any) {
      toast({
        title: 'Erro na solicitação',
        description: err?.message || 'Não foi possível solicitar reavaliação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-amber-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Carteira com Estoque s/ Crédito
                  </DialogTitle>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                    Material Disponível · Crédito Bloqueado
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-600">
                  Pedidos da carteira SAP que possuem material disponível fisicamente, mas estão
                  bloqueados por restrição de crédito do cliente.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/tms/analises/carteira-vendas">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Abrir Carteira Completa
                  </Button>
                </Link>
              </div>
            </div>

            {/* Badges de Totais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2 bg-white rounded-lg border border-amber-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Pedidos Bloqueados
                </span>
                <span className="text-base font-extrabold text-amber-900 font-mono">
                  {totals.ordersCount} pedidos ({totals.itemsCount} itens)
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-amber-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Tonelagem Retida
                </span>
                <span className="text-base font-extrabold text-amber-900 font-mono">
                  {totals.totalTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-amber-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Estoque Físico Disponível
                </span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {totals.totalStockTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-amber-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Valor Retido em Carteira
                </span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  {totals.totalValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Filtros rápidos */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Filtrar por nº pedido, cliente, código, material, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>
            <select
              aria-label="Filtrar por itinerário SAP"
              value={selectedItinerary}
              onChange={(e) => setSelectedItinerary(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Todos os Itinerários ({itineraries.length})</option>
              {itineraries.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela de Detalhamento com todas as colunas solicitadas */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10 text-[11px]">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Nº Pedido SAP</TableHead>
                  <TableHead className="font-bold text-slate-700">Cliente (Cód)</TableHead>
                  <TableHead className="font-bold text-slate-700">Material & Descrição</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Qtde Pendente
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Peso (t)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Estoque Disp.
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">Centro / Depósito</TableHead>
                  <TableHead className="font-bold text-slate-700">Status Crédito</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Valor Pedido
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">Vendedor</TableHead>
                  <TableHead className="font-bold text-slate-700">Data Prevista</TableHead>
                  <TableHead className="font-bold text-slate-700">Itinerário</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                      Nenhum pedido com estoque e bloqueio de crédito encontrado para os filtros
                      atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const ord = item.order
                    return (
                      <TableRow key={ord.id} className="hover:bg-amber-50/40">
                        <TableCell className="font-mono font-bold text-[#005596]">
                          {ord.order_number}
                          {ord.item_number && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({ord.item_number})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div
                            className="font-semibold text-slate-800 line-clamp-1"
                            title={ord.customer_name}
                          >
                            {ord.customer_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Cód: {ord.customer_code} · {ord.destination_city}/{ord.uf}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-[11px] text-slate-700 font-semibold truncate max-w-[180px]">
                            {ord.material}
                          </div>
                          <div
                            className="text-[10px] text-slate-500 truncate max-w-[200px]"
                            title={ord.material_description}
                          >
                            {ord.material_description || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.pendingQty.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-amber-900">
                          {item.pendingWeightTon.toFixed(2)} t
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700">
                          {item.effectiveStockTon.toFixed(2)} t
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600">
                          {ord.plant_code || ord.supplying_plant || '1010'} /{' '}
                          {ord.storage_location || '0001'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold"
                            title={item.creditReason}
                          >
                            {item.creditStatus}
                          </Badge>
                          <div
                            className="text-[9px] text-slate-500 truncate max-w-[120px] mt-0.5"
                            title={item.creditReason}
                          >
                            {item.creditReason}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-700">
                          {(ord.total_value || ord.order_value || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-slate-600 text-[11px] truncate max-w-[110px]">
                          {ord.sales_rep || 'Comercial CIAFAL'}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600">
                          {ord.desired_date
                            ? new Date(ord.desired_date).toLocaleDateString('pt-BR')
                            : ord.delivery_week || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] border-slate-300"
                          >
                            {ord.itinerary_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReassessment(ord)}
                            className="text-[10px] h-7 px-2 border-amber-300 text-amber-900 hover:bg-amber-100 font-bold"
                            title="Solicitar Reavaliação de Crédito ao Financeiro"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Tratar Crédito
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">
              Mostrando {filteredItems.length} de {items.length} pedidos com estoque disponível
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitação de Reavaliação de Crédito */}
      {reassessmentOrder && (
        <Dialog
          open={!!reassessmentOrder}
          onOpenChange={(open) => !open && setReassessmentOrder(null)}
        >
          <DialogContent className="max-w-md p-5 bg-white">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                  <CreditCard className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Tratamento de Crédito — Pedido {reassessmentOrder.order_number}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                Encaminhar solicitação de liberação/reavaliação de crédito para o setor financeiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div>
                  <strong className="text-slate-800">Cliente:</strong>{' '}
                  {reassessmentOrder.customer_name} ({reassessmentOrder.customer_code})
                </div>
                <div>
                  <strong className="text-slate-800">Material:</strong> {reassessmentOrder.material}
                </div>
                <div>
                  <strong className="text-slate-800">Peso:</strong>{' '}
                  {(reassessmentOrder.weight_kg / 1000).toFixed(2)} t
                </div>
                <div>
                  <strong className="text-slate-800">Valor do Pedido:</strong>{' '}
                  {(
                    reassessmentOrder.total_value ||
                    reassessmentOrder.order_value ||
                    0
                  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div>
                  <strong className="text-slate-800">Status Atual:</strong>{' '}
                  <span className="text-amber-800 font-semibold">
                    {reassessmentOrder.credit_status}
                  </span>
                  {reassessmentOrder.credit_reason && (
                    <span className="text-slate-500 block text-[11px]">
                      Motivo: {reassessmentOrder.credit_reason}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Valor Solicitado para Liberação (R$)
                </label>
                <Input
                  type="number"
                  value={reassessmentValue}
                  onChange={(e) => setReassessmentValue(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Justificativa Logística / Operacional
                </label>
                <textarea
                  value={reassessmentReason}
                  onChange={(e) => setReassessmentReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReassessmentOrder(null)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReassessment}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-bold"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Envio ao Financeiro'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
