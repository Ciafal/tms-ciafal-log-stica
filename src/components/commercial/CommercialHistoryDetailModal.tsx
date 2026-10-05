/**
 * CommercialHistoryDetailModal.tsx
 *
 * Popup "Consultar detalhes" do Histórico Comercial do Cliente
 * Exibe dados reais e rastreáveis conforme Requisito 5:
 * - Cliente (código SAP, razão social, cidade/UF, representante, itinerário SAP)
 * - Última compra (data, material, descrição, quantidade, preço se autorizado, documento)
 * - Último contato (data/hora, canal, vendedor/representante, assunto/resumo, origem da informação)
 * - Último pedido do material sugerido (pedido SAP, item, código material, descrição, quantidade, data, situação)
 * - Histórico do material (nº de pedidos, frequência média, volume médio, última compra, maior compra, média de toneladas)
 *
 * Zero dados fictícios: onde não houver valor rastreado, exibe "Não localizado".
 */

import React from 'react'
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
import {
  Building2,
  Calendar,
  PhoneCall,
  Package,
  TrendingUp,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { CustomerCommercialHistorySummary } from '@/domain/commercialComplementEngine'
import { formatCurrency, formatWeight } from '@/lib/utils'

interface CommercialHistoryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  historyData: CustomerCommercialHistorySummary | null
  opportunityCode?: string
}

export const CommercialHistoryDetailModal: React.FC<CommercialHistoryDetailModalProps> = ({
  isOpen,
  onClose,
  historyData,
  opportunityCode,
}) => {
  if (!historyData) return null

  const {
    customerSapCode,
    customerName,
    cityUf,
    salesRep,
    itinerarySap,
    lastPurchaseDetail,
    lastContactDetail,
    lastOrderItemDetail,
    materialStats,
  } = historyData

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-[#005596] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#005596]" />
              Histórico Comercial do Cliente
            </DialogTitle>
            {opportunityCode && (
              <Badge
                variant="outline"
                className="font-mono text-[11px] text-[#005596] border-[#005596]/40"
              >
                {opportunityCode}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Dados auditados via integrações SAP ECC (ZSD35 / RFC) e CRM 360° CIAFAL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* SEÇÃO 1: DADOS GERAIS DO CLIENTE */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Building2 className="w-4 h-4 text-[#005596]" />
                Identificação do Cliente
              </span>
              <Badge className="bg-[#005596] text-white text-[10px] font-mono">
                Cód. SAP: {customerSapCode || 'Não localizado'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-slate-500 block text-[10px]">Razão Social:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-[11px]">
                  {customerName || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cidade / UF:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-[11px]">
                  {cityUf || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Representante Comercial:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-[11px]">
                  {salesRep || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Itinerário SAP Homologado:</span>
                <strong className="text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                  {itinerarySap || 'Não localizado'}
                </strong>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ÚLTIMA COMPRA */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs mb-2 pb-1 border-b">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Última Compra Registrada no SAP
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-slate-500 block text-[10px]">Data da Compra:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastPurchaseDetail.date
                    ? new Date(lastPurchaseDetail.date).toLocaleDateString('pt-BR')
                    : 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Documento / Pedido:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {lastPurchaseDetail.documentNumber || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Volume Faturado:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                  {lastPurchaseDetail.quantityKg !== null
                    ? formatWeight(lastPurchaseDetail.quantityKg, { unit: 'kg' })
                    : 'Não localizado'}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[10px]">Material Comprado:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastPurchaseDetail.materialDescription ||
                    lastPurchaseDetail.materialCode ||
                    'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Preço Unitário Faturado:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {lastPurchaseDetail.priceAuthorized && lastPurchaseDetail.unitPriceBrl
                    ? `${formatCurrency(lastPurchaseDetail.unitPriceBrl)} / t`
                    : 'Sob autorização'}
                </strong>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: ÚLTIMO CONTATO / CRM 360° */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs mb-2 pb-1 border-b">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              Último Contato Comercial (CRM 360°)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-slate-500 block text-[10px]">Data e Hora do Contato:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastContactDetail.dateTime
                    ? new Date(lastContactDetail.dateTime).toLocaleString('pt-BR')
                    : 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Canal de Atendimento:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastContactDetail.channel || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Vendedor / Representante:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastContactDetail.salesRep || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Origem da Informação:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastContactDetail.source || 'Não localizado'}
                </strong>
              </div>
              <div className="sm:col-span-2 pt-1 border-t">
                <span className="text-slate-500 block text-[10px]">Resumo do Contato:</span>
                <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                  {lastContactDetail.summary || 'Não localizado'}
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: ÚLTIMO PEDIDO DO MATERIAL SUGERIDO */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs mb-2 pb-1 border-b">
              <Package className="w-4 h-4 text-amber-600" />
              Último Pedido do Material Sugerido
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-slate-500 block text-[10px]">Pedido SAP:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {lastOrderItemDetail.sapOrderNumber || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Item do Pedido:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {lastOrderItemDetail.itemNumber || 'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Data do Pedido:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastOrderItemDetail.orderDate
                    ? new Date(lastOrderItemDetail.orderDate).toLocaleDateString('pt-BR')
                    : 'Não localizado'}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[10px]">Material:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-[11px]">
                  {lastOrderItemDetail.materialDescription ||
                    lastOrderItemDetail.materialCode ||
                    'Não localizado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Quantidade do Pedido:</span>
                <strong className="text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                  {lastOrderItemDetail.quantityKg !== null
                    ? formatWeight(lastOrderItemDetail.quantityKg, { unit: 'kg' })
                    : 'Não localizado'}
                </strong>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: HISTÓRICO DO MATERIAL / ESTATÍSTICAS REAIS */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <span className="font-bold text-[#005596] flex items-center gap-1.5 text-xs mb-2 pb-1 border-b border-blue-200 dark:border-blue-900">
              <TrendingUp className="w-4 h-4 text-[#005596]" />
              Histórico & Comportamento de Compra do Material
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                <span className="text-slate-500 block text-[10px]">Nº de Pedidos</span>
                <strong className="text-[#005596] text-sm font-mono">
                  {materialStats.totalOrdersCount > 0
                    ? materialStats.totalOrdersCount
                    : 'Não localizado'}
                </strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                <span className="text-slate-500 block text-[10px]">Frequência Média</span>
                <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">
                  {materialStats.averageFrequencyDays !== null
                    ? `${materialStats.averageFrequencyDays} dias`
                    : 'Não localizado'}
                </strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                <span className="text-slate-500 block text-[10px]">Média t / Pedido</span>
                <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">
                  {materialStats.averageTonsPerOrder !== null
                    ? `${materialStats.averageTonsPerOrder.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
                    : 'Não localizado'}
                </strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                <span className="text-slate-500 block text-[10px]">Maior Compra</span>
                <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-mono">
                  {materialStats.maxOrderTons !== null
                    ? `${materialStats.maxOrderTons.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
                    : 'Não localizado'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
