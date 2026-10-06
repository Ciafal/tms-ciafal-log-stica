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
  AlertOctagon,
  ExternalLink,
  Layers,
  Calendar,
  Clock,
  ArrowRight,
  TrendingDown,
} from 'lucide-react'
import type { OrderStockCreditClassification } from '@/domain/operacaoHojeWalletEngine'
import { Link } from 'react-router-dom'

interface CarteiraSemEstoqueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: OrderStockCreditClassification[]
}

export const CarteiraSemEstoqueModal: React.FC<CarteiraSemEstoqueModalProps> = ({
  open,
  onOpenChange,
  items,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'SEM_ESTOQUE' | 'PARCIAL'>('ALL')
  const [selectedItinerary, setSelectedItinerary] = useState<string>('ALL')

  const itineraries = useMemo(() => {
    const set = new Set(items.map((i) => i.order.itinerary_code).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  // Filtragem dos registros
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ord = item.order
      if (filterType === 'SEM_ESTOQUE' && item.stockClassification !== 'SEM_ESTOQUE') {
        return false
      }
      if (filterType === 'PARCIAL' && item.stockClassification !== 'PARCIAL') {
        return false
      }
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
        (ord.destination_city && ord.destination_city.toLowerCase().includes(q)) ||
        (ord.production_status && ord.production_status.toLowerCase().includes(q))
      )
    })
  }, [items, searchTerm, filterType, selectedItinerary])

  // Totais calculados
  const totals = useMemo(() => {
    const ordersCount = new Set(filteredItems.map((i) => i.order.order_number)).size
    const missingTons = filteredItems.reduce((acc, i) => acc + i.deficitTon, 0)
    const pendingTons = filteredItems.reduce((acc, i) => acc + i.pendingWeightTon, 0)
    const stockTons = filteredItems.reduce((acc, i) => acc + i.effectiveStockTon, 0)
    const semEstoqueCount = filteredItems.filter(
      (i) => i.stockClassification === 'SEM_ESTOQUE',
    ).length
    const parcialCount = filteredItems.filter((i) => i.stockClassification === 'PARCIAL').length

    return {
      ordersCount,
      itemsCount: filteredItems.length,
      missingTons,
      pendingTons,
      stockTons,
      semEstoqueCount,
      parcialCount,
    }
  }, [filteredItems])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-red-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-600 text-white">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Carteira s/ Estoque (Aguardando Disponibilidade)
                </DialogTitle>
                <Badge className="bg-red-100 text-red-900 border-red-300 font-bold text-[10px]">
                  Déficit Físico · PCP / Produção
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                Pedidos comercialmente aptos mas impossibilitados de montagem de carga imediata por
                ausência ou insuficiência de estoque físico.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/tms/pcp-contrato">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-red-300 text-red-900 hover:bg-red-100 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver Linhas PCP
                </Button>
              </Link>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-2 bg-white rounded-lg border border-red-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Pedidos com Déficit
              </span>
              <span className="text-base font-extrabold text-red-900 font-mono">
                {totals.ordersCount} pedidos ({totals.itemsCount} itens)
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-red-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Tonelagem Faltante (Déficit)
              </span>
              <span className="text-base font-extrabold text-red-900 font-mono">
                {totals.missingTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-red-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Sem Estoque Total vs Parcial
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-red-100 text-red-800 text-[10px] font-bold">
                  Zero: {totals.semEstoqueCount}
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Parcial: {totals.parcialCount}
                </Badge>
              </div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-red-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Peso Total Carteira Pendente
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {totals.pendingTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Filtros */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por pedido, cliente, código, material, PCP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              aria-label="Filtrar por disponibilidade de estoque"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">Todos os Tipos de Déficit</option>
              <option value="SEM_ESTOQUE">Sem Estoque (Estoque = 0)</option>
              <option value="PARCIAL">Estoque Parcial (Estoque &gt; 0)</option>
            </select>

            <select
              aria-label="Filtrar por itinerário SAP"
              value={selectedItinerary}
              onChange={(e) => setSelectedItinerary(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">Todos os Itinerários ({itineraries.length})</option>
              {itineraries.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela com todas as colunas solicitadas */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10 text-[11px]">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Pedido SAP</TableHead>
                <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                <TableHead className="font-bold text-slate-700">Material & Descrição</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">
                  Qtde Solicitada
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Qtde Pendente</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Estoque Disp.</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Déficit (t)</TableHead>
                <TableHead className="font-bold text-slate-700">Situação Estoque</TableHead>
                <TableHead className="font-bold text-slate-700">Centro / Dep.</TableHead>
                <TableHead className="font-bold text-slate-700">Situação PCP</TableHead>
                <TableHead className="font-bold text-slate-700">Previsão Prod.</TableHead>
                <TableHead className="font-bold text-slate-700">Data Solicitada</TableHead>
                <TableHead className="font-bold text-slate-700">Itinerário</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-slate-500">
                    Nenhum pedido sem estoque encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const ord = item.order
                  const isZero = item.stockClassification === 'SEM_ESTOQUE'
                  return (
                    <TableRow key={ord.id} className="hover:bg-red-50/40">
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
                      <TableCell className="text-right font-mono text-slate-600">
                        {item.quantityRequested.toLocaleString('pt-BR', {
                          maximumFractionDigits: 1,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {item.pendingQty.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {item.effectiveStockTon === 0 ? (
                          <span className="text-red-600">0,00 t</span>
                        ) : (
                          <span className="text-amber-700">
                            {item.effectiveStockTon.toFixed(2)} t
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-700">
                        {item.deficitTon.toFixed(2)} t
                      </TableCell>
                      <TableCell>
                        {isZero ? (
                          <Badge className="bg-red-600 text-white text-[10px] font-bold">
                            Sem Estoque
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                            Estoque Parcial
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {ord.plant_code || ord.supplying_plant || '1010'} /{' '}
                        {ord.storage_location || '0001'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${
                            ord.production_status === 'Em Produção'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : ord.production_status === 'Programado'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ord.production_status || 'Aguardando PCP'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {ord.pcp_forecast_date
                          ? new Date(ord.pcp_forecast_date).toLocaleDateString('pt-BR')
                          : ord.production_forecast_date
                            ? new Date(ord.production_forecast_date).toLocaleDateString('pt-BR')
                            : ord.delivery_week || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {ord.desired_date
                          ? new Date(ord.desired_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] border-slate-300">
                          {ord.itinerary_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[10px] font-bold ${
                            ord.priority_level === 'CRITICA' || ord.priority_level === 'ALTA'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {ord.priority_level || 'NORMAL'}
                        </Badge>
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
            Mostrando {filteredItems.length} de {items.length} pedidos sem estoque ou com saldo
            parcial
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
  )
}
