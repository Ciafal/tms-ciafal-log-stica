// TMS CIAFAL — Painel Lateral de Detalhamento da Cidade e Pedidos da Carteira SAP (#9)
// Abre sem sair do mapa, com:
// - Resumo: tonelagem total, disponível, pedidos, clientes, cargas estimadas, valor, data mais antiga
// - Tabela: Seleção Múltipla | Clientes | Pedido | Material | Peso (t) | Data | Estoque | Status
// - Ação primária: "Simular Carga" -> Injeta os pedidos selecionados no montador do Planejador de Cargas

import React, { useState, useMemo } from 'react'
import {
  X,
  MapPin,
  Package,
  Users,
  Truck,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SapSalesOrderEntity } from '@/domain/rules'
import { CityDemandCluster } from '@/domain/geographicClusterEngine'

interface CityDetailDrawerProps {
  city: CityDemandCluster | null
  open: boolean
  onClose: () => void
  onSimulateLoad: (selectedOrders: SapSalesOrderEntity[], destinationLabel: string) => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
}

export const CityDetailDrawer: React.FC<CityDetailDrawerProps> = ({
  city,
  open,
  onClose,
  onSimulateLoad,
  onOpenCustomerProfile,
}) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  // Ao trocar de cidade, redefinir seleção com todos os pedidos
  React.useEffect(() => {
    if (city) {
      setSelectedOrderIds(city.orders.map((o) => o.id))
    } else {
      setSelectedOrderIds([])
    }
  }, [city])

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    if (!city) return
    if (selectedOrderIds.length === city.orders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(city.orders.map((o) => o.id))
    }
  }

  const selectedOrders = useMemo(() => {
    if (!city) return []
    return city.orders.filter((o) => selectedOrderIds.includes(o.id))
  }, [city, selectedOrderIds])

  const selectedWeightTon = useMemo(() => {
    const totalKg = selectedOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0)
    return Math.round((totalKg / 1000) * 10) / 10
  }, [selectedOrders])

  const selectedValueBrl = useMemo(() => {
    return selectedOrders.reduce((acc, o) => acc + (o.total_value || o.order_value || 0), 0)
  }, [selectedOrders])

  if (!open || !city) return null

  const handleTriggerSimulation = () => {
    if (selectedOrders.length === 0) return
    onSimulateLoad(selectedOrders, `${city.cityName} / ${city.uf}`)
  }

  return (
    <aside
      aria-label={`Detalhamento de ${city.cityName} / ${city.uf}`}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] md:w-[620px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header do Drawer */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#005596] flex items-center justify-center text-white shrink-0 shadow-xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white">
                {city.cityName} / {city.uf}
              </h2>
              <Badge
                className={
                  city.consolidationPotential === 'ALTA'
                    ? 'bg-emerald-600 text-white text-[10px] font-bold'
                    : city.consolidationPotential === 'MEDIA'
                      ? 'bg-amber-500 text-white text-[10px] font-bold'
                      : 'bg-slate-600 text-white text-[10px]'
                }
              >
                Potencial {city.consolidationPotential}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              Região: {city.region} • Itinerário SAP: {city.primaryItineraryCode} (
              {city.primaryItineraryDesc})
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Alerta WMS/RFID ou Geolocalização se houver */}
      {city.isPendingGeo && (
        <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Localização Pendente:</strong> Coordenadas baseadas no centroide aproximado.
            Recomenda-se validar dados de endereço SAP.
          </span>
        </div>
      )}

      {city.hasWmsRfidAlert && (
        <div className="bg-blue-50 border-b border-blue-200 p-2.5 px-4 text-xs text-blue-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Alerta WMS:</strong> Itens com separação RFID sugerida na saída do estoque
            Sidercentro.
          </span>
        </div>
      )}

      {/* Resumo da Demanda (#9 e #18) */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Package className="w-3 h-3 text-[#005596]" /> Carteira Total
          </span>
          <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
            {city.totalWeightTon.toFixed(1)} t
          </div>
          <span className="text-[10px] text-slate-500">
            Disp: <strong>{city.availableWeightTon.toFixed(1)} t</strong>
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-600" /> Pedidos / Clientes
          </span>
          <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
            {city.ordersCount} ped / {city.uniqueClientsCount} cli
          </div>
          <span className="text-[10px] text-slate-500">{city.itemsCount} itens totais</span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Truck className="w-3 h-3 text-purple-600" /> Cargas Estimadas
          </span>
          <div className="text-sm font-black font-mono text-purple-700 mt-0.5">
            ~{city.potentialLoadsCount} cargas
          </div>
          <span className="text-[10px] text-slate-500">Base carreta 28 t</span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600" /> Valor Carteira
          </span>
          <div className="text-xs font-black font-mono text-slate-900 mt-0.5 truncate">
            R$ {city.totalValueBrl.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500">
            Desde:{' '}
            {city.oldestOrderDate
              ? new Date(city.oldestOrderDate).toLocaleDateString('pt-BR')
              : '—'}
          </span>
        </div>
      </div>

      {/* Barra de Seleção Múltipla de Pedidos */}
      <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSelectAll}
            className="h-7 text-xs font-semibold text-slate-700 hover:text-slate-900 p-1"
          >
            {selectedOrderIds.length === city.orders.length ? (
              <CheckSquare className="w-4 h-4 text-[#005596] mr-1.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 mr-1.5" />
            )}
            <span>
              {selectedOrderIds.length === city.orders.length
                ? 'Desmarcar todos'
                : 'Selecionar todos'}
            </span>
          </Button>

          <span className="text-slate-500">|</span>

          <span className="text-slate-700 font-medium">
            Selecionados:{' '}
            <strong className="text-[#005596] font-mono">
              {selectedOrders.length} de {city.orders.length}
            </strong>
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-600">
            Peso Selecionado:{' '}
            <strong className="text-slate-900 font-mono text-xs">
              {selectedWeightTon.toFixed(1)} t
            </strong>
          </span>
        </div>
      </div>

      {/* Tabela de Pedidos da Cidade com Seleção Múltipla (#9) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {city.orders.map((order) => {
          const isSelected = selectedOrderIds.includes(order.id)
          const isReady =
            order.production_status === 'Pronto' ||
            (order.stock_available && order.stock_available > 0) ||
            (order.stock_dp34 && order.stock_dp34 > 0)

          return (
            <div
              key={order.id}
              onClick={() => toggleSelectOrder(order.id)}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                isSelected
                  ? 'border-[#005596] bg-sky-50/40 shadow-xs ring-1 ring-[#005596]/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-[#005596]">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#005596]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900 font-mono text-xs">
                        {order.order_number}
                      </strong>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Item {order.item_number || '000010'}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[8px] font-mono px-1 py-0 bg-slate-50 text-slate-600"
                      >
                        {order.itinerary_code || 'S/I'}
                      </Badge>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onOpenCustomerProfile) {
                          onOpenCustomerProfile(order.customer_code, order.customer_name)
                        }
                      }}
                      className="font-bold text-slate-800 text-[11px] hover:text-[#005596] hover:underline cursor-pointer"
                      title="Clique para ver ficha logística do cliente"
                    >
                      {order.customer_name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-black text-slate-900 block">
                    {((order.weight_kg || 0) / 1000).toFixed(1)} t
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    R$ {(order.total_value || order.order_value || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Linha de Detalhes do Pedido */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Material</span>
                  <span className="text-slate-700 truncate font-mono block" title={order.material}>
                    {order.material || 'Material Padrão'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Data Desejada</span>
                  <span className="text-slate-700 font-mono">
                    {order.desired_date
                      ? new Date(order.desired_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Descarga</span>
                  <span className="text-slate-700 truncate block">
                    {order.discharge_type || 'Padrão'}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center justify-between text-[10px] pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={
                      isReady
                        ? 'border-emerald-400 text-emerald-800 bg-emerald-50 text-[9px] font-semibold'
                        : 'border-amber-400 text-amber-800 bg-amber-50 text-[9px]'
                    }
                  >
                    Estoque: {isReady ? 'Disponível (DP34)' : order.production_status || 'PCP'}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={
                      order.credit_status === 'Liberado'
                        ? 'border-blue-300 text-blue-700 bg-blue-50 text-[9px]'
                        : 'border-rose-300 text-rose-700 bg-rose-50 text-[9px]'
                    }
                  >
                    Crédito: {order.credit_status || 'Em Análise'}
                  </Badge>

                  {order.is_sidercentro && (
                    <Badge className="bg-orange-600 text-white text-[8px] px-1 py-0 font-bold">
                      Sidercentro
                    </Badge>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  {order.delay_days && order.delay_days > 0 ? (
                    <span className="text-rose-600 font-bold">+{order.delay_days}d atraso</span>
                  ) : (
                    'No prazo'
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer com Ação Principal: "Simular Carga" (#15) */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div>
          <span className="text-xs text-slate-400 block">Total da Carga a Simular:</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black font-mono text-sky-400">
              {selectedWeightTon.toFixed(1)} t
            </span>
            <span className="text-xs text-slate-300">
              ({selectedOrders.length} pedidos • R$ {selectedValueBrl.toLocaleString('pt-BR')})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs h-9 font-semibold"
          >
            Fechar
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerSimulation}
            disabled={selectedOrders.length === 0}
            className="bg-[#005596] hover:bg-[#004275] text-white text-xs h-9 font-bold px-4 flex items-center gap-1.5 shadow-md flex-1 sm:flex-initial"
            title="Injetar pedidos selecionados no montador de cargas do Planejador"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Simular Carga ({selectedOrders.length})</span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
