// TMS CIAFAL — Popup Modal "Fracionamento da Carga"
// Conforme especificação: Tabela Nº | Cliente | Cidade/UF | Pedidos | Peso | Nº Itens | Remessa ("A gerar" ou nº SAP real)
// Formatação pt-BR / ABNT

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  calculateCargoFractionation,
  type CargoFractionationResult,
} from '@/domain/cargoFractionationEngine'
import type { SapSalesOrderEntity } from '@/domain/rules'
import { Users, Package, FileText, Download } from 'lucide-react'

interface CargoFractionationModalProps {
  isOpen: boolean
  onClose: () => void
  orders: SapSalesOrderEntity[]
  loadTitle?: string
  itineraryCode?: string
}

export const CargoFractionationModal: React.FC<CargoFractionationModalProps> = ({
  isOpen,
  onClose,
  orders,
  loadTitle,
  itineraryCode,
}) => {
  const fractionation: CargoFractionationResult = React.useMemo(() => {
    return calculateCargoFractionation(orders)
  }, [orders])

  const totalWeightTon = (fractionation.totalWeightKg / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const exportToCsv = () => {
    const headers = [
      'Nº',
      'Código SAP',
      'Cliente',
      'Cidade',
      'UF',
      'Qtd Pedidos',
      'Peso (kg)',
      'Peso (t)',
      'Qtd Itens',
      'Remessa SAP',
      'Números dos Pedidos',
    ]

    const rows = fractionation.customers.map((c, idx) => [
      idx + 1,
      `"${c.customerCode}"`,
      `"${c.customerName.replace(/"/g, '""')}"`,
      `"${c.city.replace(/"/g, '""')}"`,
      `"${c.uf}"`,
      c.ordersCount,
      c.totalWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      (c.totalWeightKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 }),
      c.itemsCount,
      `"${c.sapDeliveryNumber}"`,
      `"${c.orderNumbers.join(', ')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `fracionamento_${loadTitle || 'carga'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#005596]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Fracionamento da Carga — {loadTitle || 'Proposta'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {itineraryCode ? `Itinerário: ${itineraryCode} • ` : ''}
                  Relação de clientes distintos, pedidos consolidados e remessas SAP previstas
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              className="text-xs flex items-center gap-1.5 border-slate-300 text-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </Button>
          </div>

          {/* Cards de Resumo Compacto pt-BR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Clientes Distintos
              </span>
              <span className="text-base font-extrabold text-[#005596] font-mono">
                {fractionation.distinctCustomersCount}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Fracionamentos
              </span>
              <span className="text-base font-extrabold text-amber-700 font-mono">
                {fractionation.fracionamentos}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Remessas Previstas
              </span>
              <span className="text-base font-extrabold text-blue-800 font-mono">
                {fractionation.remessasPrevistas}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Peso Total da Carga
              </span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {totalWeightTon} t
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Tabela Formatada ABNT / pt-BR */}
        <div className="flex-1 overflow-auto my-2 border rounded-md border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Nº</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Cidade / UF</th>
                <th className="py-2.5 px-3 text-center">Pedidos</th>
                <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                <th className="py-2.5 px-3 text-center">Nº Itens</th>
                <th className="py-2.5 px-3 text-center">Remessa SAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fractionation.customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum pedido associado a esta carga.
                  </td>
                </tr>
              ) : (
                fractionation.customers.map((c, idx) => (
                  <tr key={c.customerCode || idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                      {idx + 1}º
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{c.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Cód: {c.customerCode}
                        {c.orderNumbers.length > 0 && ` • Pedidos: ${c.orderNumbers.join(', ')}`}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {c.city} / <span className="font-semibold">{c.uf}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                      {c.ordersCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.totalWeightKg.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      kg
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {c.itemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.sapDeliveryNumber === 'A gerar' ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[11px] font-medium"
                        >
                          A gerar
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[11px] font-bold"
                        >
                          {c.sapDeliveryNumber}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {fractionation.customers.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right text-slate-600">
                    Total Consolidado ({fractionation.distinctCustomersCount} clientes):
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {fractionation.totalOrdersCount}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-800 whitespace-nowrap">
                    {fractionation.totalWeightKg.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    kg
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {fractionation.totalItemsCount}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-xs text-blue-700">
                    {fractionation.remessasPrevistas} remessa(s)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Regra CIAFAL: Cada cliente distinto demanda 1 remessa SAP individualizada e 1
              parada/fracionamento.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
