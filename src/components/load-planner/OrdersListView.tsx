// TMS CIAFAL — Visão em Lista Tabular da Carteira SAP (ZSD35)
// Exibe a carteira única completa de pedidos/itens para conferência operacional detalhada,
// filtros de busca rápida e seleção direta para a montagem de carga.

import React, { useState, useMemo } from 'react'
import {
  Package,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Play,
  FileSpreadsheet,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { SapSalesOrderEntity } from '@/domain/rules'

interface OrdersListViewProps {
  orders: SapSalesOrderEntity[]
  onSelectOrdersForAssembly: (selected: SapSalesOrderEntity[]) => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  orders,
  onSelectOrdersForAssembly,
  onOpenCustomerProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<'weight' | 'date' | 'value'>('weight')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      return (
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.destination_city || '').toLowerCase().includes(q) ||
        (o.uf || '').toLowerCase().includes(q) ||
        (o.itinerary_code || '').toLowerCase().includes(q) ||
        (o.material || '').toLowerCase().includes(q)
      )
    })
  }, [orders, searchTerm])

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders]
    list.sort((a, b) => {
      if (sortField === 'weight') {
        const wa = a.weight_kg || 0
        const wb = b.weight_kg || 0
        return sortAsc ? wa - wb : wb - wa
      }
      if (sortField === 'value') {
        const va = a.total_value || a.order_value || 0
        const vb = b.total_value || b.order_value || 0
        return sortAsc ? va - vb : vb - va
      }
      const da = new Date(a.order_date || a.desired_date || '2000-01-01').getTime()
      const db = new Date(b.order_date || b.desired_date || '2000-01-01').getTime()
      return sortAsc ? da - db : db - da
    })
    return list
  }, [filteredOrders, sortField, sortAsc])

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedOrders.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(sortedOrders.map((o) => o.id))
    }
  }

  const selectedOrders = useMemo(() => {
    return orders.filter((o) => selectedIds.includes(o.id))
  }, [orders, selectedIds])

  const totalSelectedTon = useMemo(() => {
    return (
      Math.round(selectedOrders.reduce((acc, o) => acc + (o.weight_kg || 0) / 1000, 0) * 10) / 10
    )
  }, [selectedOrders])

  return (
    <div className="space-y-3">
      {/* Barra de Ações e Filtros da Lista */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filtrar por número da ordem, cliente, cidade, itinerário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSortField('weight')
                    setSortAsc(!sortAsc)
                  }}
                  className={`h-8 text-xs ${sortField === 'weight' ? 'bg-sky-50 text-[#005596] font-bold border-[#005596]' : ''}`}
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Peso
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSortField('date')
                    setSortAsc(!sortAsc)
                  }}
                  className={`h-8 text-xs ${sortField === 'date' ? 'bg-sky-50 text-[#005596] font-bold border-[#005596]' : ''}`}
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Data
                </Button>
              </div>
            </div>

            {/* Ação de Injeção dos Selecionados no Planejador */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">
                Selecionados:{' '}
                <strong className="text-slate-900 font-mono">
                  {selectedOrders.length} ({totalSelectedTon.toFixed(1)} t)
                </strong>
              </span>

              <Button
                size="sm"
                onClick={() => onSelectOrdersForAssembly(selectedOrders)}
                disabled={selectedOrders.length === 0}
                className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-8 font-bold px-3 shadow-xs"
              >
                <Play className="w-3 h-3 mr-1 fill-white" />
                <span>Montar Carga com Selecionados</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Responsiva */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[10px] sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-white hover:text-sky-300">
                    {selectedIds.length === sortedOrders.length && sortedOrders.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-2.5">Ordem SAP</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Destino</th>
                <th className="p-2.5">Itinerário</th>
                <th className="p-2.5">Material</th>
                <th className="p-2.5 text-right">Peso (t)</th>
                <th className="p-2.5 text-right">Valor (R$)</th>
                <th className="p-2.5">Estoque</th>
                <th className="p-2.5">Crédito</th>
                <th className="p-2.5">Data Desejada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    Nenhum pedido encontrado para o filtro informado.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((ord) => {
                  const isSelected = selectedIds.includes(ord.id)
                  const isReady =
                    ord.production_status === 'Pronto' ||
                    (ord.stock_available && ord.stock_available > 0) ||
                    (ord.stock_dp34 && ord.stock_dp34 > 0)

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => toggleSelectOrder(ord.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-sky-50 font-semibold text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelectOrder(ord.id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#005596]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {ord.order_number}
                      </td>
                      <td className="p-2.5">
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onOpenCustomerProfile) {
                              onOpenCustomerProfile(ord.customer_code, ord.customer_name)
                            }
                          }}
                          className="font-bold hover:text-[#005596] hover:underline"
                        >
                          {ord.customer_name}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {ord.destination_city}/{ord.uf}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">
                        {ord.itinerary_code || 'S/I'}
                      </td>
                      <td className="p-2.5 text-slate-600 truncate max-w-[140px]">
                        {ord.material}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-right text-slate-900">
                        {((ord.weight_kg || 0) / 1000).toFixed(1)} t
                      </td>
                      <td className="p-2.5 font-mono text-right text-slate-700">
                        R$ {(ord.total_value || ord.order_value || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={
                            isReady
                              ? 'border-emerald-400 text-emerald-800 bg-emerald-50 text-[9px]'
                              : 'border-amber-400 text-amber-800 bg-amber-50 text-[9px]'
                          }
                        >
                          {isReady ? 'Disponível' : ord.production_status || 'PCP'}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={
                            ord.credit_status === 'Liberado'
                              ? 'border-blue-300 text-blue-700 bg-blue-50 text-[9px]'
                              : 'border-rose-300 text-rose-700 bg-rose-50 text-[9px]'
                          }
                        >
                          {ord.credit_status || 'Pendente'}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {ord.desired_date
                          ? new Date(ord.desired_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
