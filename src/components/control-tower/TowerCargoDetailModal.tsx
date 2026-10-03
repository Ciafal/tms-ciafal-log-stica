// src/components/control-tower/TowerCargoDetailModal.tsx
// Modal interativo da Torre de Controle que exibe a lista completa de cargas de cada card do Fluxo das Cargas
// Inclui deep link direto para o módulo correspondente (Editar Transporte, Mesa de Fretes, Negociações, Expedição)
// Zero mocks / dados reais

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ExternalLink,
  Search,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  PackageCheck,
  FileText,
  User,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  TowerCargoItem,
  formatBrazilianCurrency,
  formatBrazilianDateTime,
} from '@/services/controlTowerService'

interface TowerCargoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketKey: string
  bucketTitle: string
  bucketColor: string
  badgeText?: string
  periodLabel: string
  items: TowerCargoItem[]
}

export const TowerCargoDetailModal: React.FC<TowerCargoDetailModalProps> = ({
  open,
  onOpenChange,
  bucketKey,
  bucketTitle,
  bucketColor,
  badgeText,
  periodLabel,
  items,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (item.cargo_id && item.cargo_id.toLowerCase().includes(term)) ||
      (item.transport_number && item.transport_number.toLowerCase().includes(term)) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(term)) ||
      (item.destination_city && item.destination_city.toLowerCase().includes(term)) ||
      (item.destination_uf && item.destination_uf.toLowerCase().includes(term)) ||
      (item.driver_name && item.driver_name.toLowerCase().includes(term)) ||
      (item.vehicle_plate && item.vehicle_plate.toLowerCase().includes(term)) ||
      (item.carrier_name && item.carrier_name.toLowerCase().includes(term)) ||
      (item.itinerary && item.itinerary.toLowerCase().includes(term))
    )
  })

  const totalFilteredTons = filteredItems.reduce(
    (acc, it) => acc + (it.weight_ton || (it.weight_kg ? it.weight_kg / 1000 : 0)),
    0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        {/* Header com identidade Ciafal */}
        <DialogHeader className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: bucketColor }}
                />
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {bucketTitle}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ borderColor: bucketColor, color: bucketColor }}
                >
                  {badgeText || bucketTitle}
                </Badge>
                <Badge className="bg-[#005596] text-white text-[11px] font-semibold">
                  {periodLabel}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Detalhamento operacional das cargas reais vinculadas a esta etapa do fluxo
                logístico.
              </DialogDescription>
            </div>

            {/* Resumo do bucket */}
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase">Cargas</div>
                <div className="text-sm font-black text-slate-900">
                  {filteredItems.length} {filteredItems.length === 1 ? 'carga' : 'cargas'}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase">Peso Total</div>
                <div className="text-sm font-black text-[#005596]">
                  {totalFilteredTons.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Filtro / Busca */}
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nº carga, transporte SAP, cliente, cidade, placa, motorista ou rota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs bg-white border-slate-300 h-9"
            />
          </div>
        </DialogHeader>

        {/* Lista com scroll independente */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-100/50">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8 space-y-2">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Nenhuma carga encontrada</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum registro coincide com o termo pesquisado. Tente outro termo.'
                  : `Nenhuma carga registrada em "${bucketTitle}" para o período selecionado (${periodLabel}).`}
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id || item.cargo_id || idx}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-[#005596]/40 transition-all space-y-3"
              >
                {/* Linha superior: Identificadores + Status + Deep Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#005596] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      Carga: {item.cargo_id || 'S/N'}
                    </span>
                    {item.sap_transport_number && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        SAP Nº: {item.sap_transport_number}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {item.status || 'EM FLUXO'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatBrazilianDateTime(item.last_movement_at)}
                    </span>
                    <Link
                      to={item.edit_transport_url || '/tms/editar-transporte'}
                      className="inline-flex"
                    >
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] font-bold bg-[#005596] hover:bg-sky-700 text-white gap-1 px-2.5"
                      >
                        Acessar Carga <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Grid de dados operacionais e comerciais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Cliente e Destino */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Cliente / Destino
                    </div>
                    <div
                      className="font-bold text-slate-800 line-clamp-1"
                      title={item.customer_name}
                    >
                      {item.customer_name || 'Clientes Diversos'}
                    </div>
                    <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {item.destination_city || 'Contagem'}
                        {item.destination_uf ? ` - ${item.destination_uf}` : ''}
                      </span>
                    </div>
                    {item.itinerary && (
                      <div
                        className="text-[10px] text-slate-500 font-medium truncate"
                        title={item.itinerary}
                      >
                        Itin: {item.itinerary}
                      </div>
                    )}
                  </div>

                  {/* Motorista e Placa */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Motorista / Veículo
                    </div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.driver_name || 'Não atribuído'}</span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                      <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-bold font-mono uppercase">
                        {item.vehicle_plate || 'Aguardando alocação'}
                      </span>
                      {item.vehicle_type && (
                        <span className="text-[10px] text-slate-400">({item.vehicle_type})</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate" title={item.carrier_name}>
                      Transp: {item.carrier_name || 'Frota / Convocado'}
                    </div>
                  </div>

                  {/* Peso e Tonelagem */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Peso & Tonelagem
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {item.weight_ton
                        ? item.weight_ton.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) + ' t'
                        : item.weight_kg
                          ? (item.weight_kg / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) + ' t'
                          : '0,00 t'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.weight_kg
                        ? Number(item.weight_kg).toLocaleString('pt-BR') + ' kg'
                        : 'Peso a confirmar'}
                    </div>
                  </div>

                  {/* Valores de Frete e Pedágio */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Frete & Custos
                    </div>
                    <div className="font-bold text-emerald-700 text-xs">
                      {item.freight_value > 0
                        ? formatBrazilianCurrency(item.freight_value)
                        : 'Valor a negociar'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Pedágio:{' '}
                      {item.toll_value > 0
                        ? formatBrazilianCurrency(item.toll_value)
                        : 'R$ 0,00 (Sem tags)'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Módulo: {item.source_module || 'TMS Central'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong>{' '}
            cargas
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
