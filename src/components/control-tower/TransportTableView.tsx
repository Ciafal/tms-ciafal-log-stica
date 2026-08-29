import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Printer,
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Clock,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UnifiedTransportItem } from '@/domain/controlTowerConsolidatedEngine'
import { exportToCsv, exportToXlsxXml, triggerPrintPdf } from '@/lib/exportUtils'

interface TransportTableViewProps {
  transports: UnifiedTransportItem[]
  onSelectTransport?: (item: UnifiedTransportItem) => void
}

type SortField =
  | 'transportNumber'
  | 'customerName'
  | 'routeCode'
  | 'driverName'
  | 'vehiclePlate'
  | 'weightTon'
  | 'stage'
  | 'slaStatus'
  | 'updatedAt'

export const TransportTableView: React.FC<TransportTableViewProps> = ({
  transports,
  onSelectTransport,
}) => {
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const filteredAndSortedTransports = useMemo(() => {
    let list = [...transports]

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.transportNumber.toLowerCase().includes(q) ||
          t.sapTransportNumber.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.vehiclePlate.toLowerCase().includes(q) ||
          t.carrierName.toLowerCase().includes(q) ||
          t.destinationCity.toLowerCase().includes(q),
      )
    }

    list.sort((a, b) => {
      let aVal: any = a[sortField] ?? ''
      let bVal: any = b[sortField] ?? ''

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortAsc ? aVal - bVal : bVal - aVal
    })

    return list
  }, [transports, sortField, sortAsc, tableSearch])

  // Exportações
  const handleExportCsv = () => {
    const headers = [
      'Status',
      'Transporte',
      'SAP',
      'Cliente Principal',
      'Rota',
      'Destino / UF',
      'Motorista',
      'Placa',
      'Transportadora',
      'Peso (t)',
      'Descargas',
      'Entrada',
      'Saída',
      'Previsão Entrega',
      'Situação SLA',
      'Intercorrência',
      'Responsável',
      'Última Atualização',
    ]

    const rows = filteredAndSortedTransports.map((t) => [
      t.stageLabel,
      t.transportNumber,
      t.sapTransportNumber || '-',
      t.customerName,
      t.routeCode,
      `${t.destinationCity} / ${t.destinationUf}`,
      t.driverName,
      t.vehiclePlate,
      t.carrierName,
      t.weightTon.toLocaleString('pt-BR'),
      t.deliveriesCount,
      t.entryTime ? new Date(t.entryTime).toLocaleString('pt-BR') : '-',
      t.exitTime ? new Date(t.exitTime).toLocaleString('pt-BR') : '-',
      t.etaDelivery ? new Date(t.etaDelivery).toLocaleString('pt-BR') : '-',
      t.slaStatus,
      t.hasIntercurrence ? t.intercurrenceDescription || 'Sim' : 'Não',
      t.responsibleSector,
      new Date(t.updatedAt).toLocaleString('pt-BR'),
    ])

    exportToCsv(`Torre_Controle_CIAFAL_${new Date().toISOString().split('T')[0]}`, headers, rows)
  }

  const handleExportExcel = () => {
    const headers = [
      'Status / Etapa',
      'Transporte',
      'SAP Transporte',
      'Cliente Principal',
      'Rota',
      'Cidade / UF',
      'Motorista',
      'Placa',
      'Transportadora',
      'Peso (t)',
      'Descargas',
      'Entrada',
      'Saída',
      'Previsão Entrega',
      'Situação SLA',
      'Ocorrência',
      'Responsável',
      'Última Atualização',
    ]

    const rows = filteredAndSortedTransports.map((t) => [
      t.stageLabel,
      t.transportNumber,
      t.sapTransportNumber || '-',
      t.customerName,
      t.routeCode,
      `${t.destinationCity} / ${t.destinationUf}`,
      t.driverName,
      t.vehiclePlate,
      t.carrierName,
      t.weightTon,
      t.deliveriesCount,
      t.entryTime ? new Date(t.entryTime).toLocaleString('pt-BR') : '-',
      t.exitTime ? new Date(t.exitTime).toLocaleString('pt-BR') : '-',
      t.etaDelivery ? new Date(t.etaDelivery).toLocaleString('pt-BR') : '-',
      t.slaStatus,
      t.hasIntercurrence ? t.intercurrenceDescription || 'Sim' : 'Não',
      t.responsibleSector,
      new Date(t.updatedAt).toLocaleString('pt-BR'),
    ])

    exportToXlsxXml(
      `Torre_Controle_CIAFAL_${new Date().toISOString().split('T')[0]}`,
      'Torre de Controle',
      headers,
      rows,
    )
  }

  const handlePrintPdf = () => {
    triggerPrintPdf(`Torre de Controle CIAFAL - ${new Date().toLocaleDateString('pt-BR')}`)
  }

  const getSlaBadge = (status: string) => {
    switch (status) {
      case 'ATRASADO':
        return (
          <Badge className="bg-rose-700 text-white font-bold text-[10px] gap-1">
            <AlertOctagon className="w-3 h-3" />
            Atrasado
          </Badge>
        )
      case 'CRITICO':
        return (
          <Badge className="bg-rose-600 text-white font-bold text-[10px] gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            Crítico
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1">
            <AlertTriangle className="w-3 h-3" />
            Atenção
          </Badge>
        )
      case 'NORMAL':
      default:
        return (
          <Badge className="bg-emerald-700 text-white font-bold text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Normal
          </Badge>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
      {/* Barra de Ações da Tabela */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Filtrar tabela..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#005596]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Exibindo <strong>{filteredAndSortedTransports.length}</strong> de {transports.length}{' '}
            transportes
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#005596]" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPdf}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Tabela Responsiva com Scroll */}
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('stage')}
              >
                <div className="flex items-center gap-1">
                  Status <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('transportNumber')}
              >
                <div className="flex items-center gap-1">
                  Transporte <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap min-w-[180px]"
                onClick={() => handleSort('customerName')}
              >
                <div className="flex items-center gap-1">
                  Cliente <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('routeCode')}
              >
                <div className="flex items-center gap-1">
                  Rota <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('driverName')}
              >
                <div className="flex items-center gap-1">
                  Motorista <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('vehiclePlate')}
              >
                <div className="flex items-center gap-1">
                  Placa <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                Transportadora
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 text-right whitespace-nowrap"
                onClick={() => handleSort('weightTon')}
              >
                <div className="flex items-center justify-end gap-1">
                  Peso (t) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-center whitespace-nowrap">
                Descargas
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">Entrada</TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">Saída</TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                Prev. Entrega
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('slaStatus')}
              >
                <div className="flex items-center gap-1">
                  Situação SLA <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                Ocorrência
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                Responsável
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-slate-700 whitespace-nowrap"
                onClick={() => handleSort('updatedAt')}
              >
                <div className="flex items-center gap-1">
                  Última Atualização <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTransports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="text-center py-10 text-slate-500">
                  Nenhum transporte encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTransports.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectTransport && onSelectTransport(item)}
                >
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold bg-slate-100 text-slate-800"
                    >
                      {item.stageLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 whitespace-nowrap">
                    <div>
                      <span>{item.transportNumber}</span>
                      {item.sapTransportNumber && (
                        <div className="text-[10px] font-mono text-slate-500">
                          SAP: {item.sapTransportNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <div
                      className="font-semibold text-slate-900 truncate"
                      title={item.customerName}
                    >
                      {item.customerName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.destinationCity} ({item.destinationUf})
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[#005596] font-bold whitespace-nowrap">
                    {item.routeCode}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium text-slate-800">{item.driverName}</div>
                    {item.driverPhone && (
                      <div className="text-[10px] text-slate-400">{item.driverPhone}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-slate-800 whitespace-nowrap">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.vehiclePlate}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 truncate max-w-[140px] whitespace-nowrap">
                    {item.carrierName}
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900 whitespace-nowrap">
                    {item.weightTon > 0 ? `${item.weightTon.toLocaleString('pt-BR')} t` : '—'}
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-700 whitespace-nowrap">
                    {item.deliveriesCount}
                  </TableCell>
                  <TableCell className="text-slate-600 text-[11px] whitespace-nowrap">
                    {item.entryTime
                      ? new Date(item.entryTime).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-[11px] whitespace-nowrap">
                    {item.exitTime
                      ? new Date(item.exitTime).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-[11px] whitespace-nowrap">
                    {item.etaDelivery
                      ? new Date(item.etaDelivery).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{getSlaBadge(item.slaStatus)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.hasIntercurrence ? (
                      <span
                        className="text-rose-600 font-bold text-[11px] flex items-center gap-1"
                        title={item.intercurrenceDescription}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sim
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-[11px] whitespace-nowrap">
                    {item.responsibleSector}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-[10px] whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleTimeString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
