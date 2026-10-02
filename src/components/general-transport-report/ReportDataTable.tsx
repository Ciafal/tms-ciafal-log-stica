import React from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Scale,
  Clock,
  Truck,
  Hash,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  GeneralTransportRecord,
  ColumnDefinition,
  formatReportValue,
} from '@/domain/generalTransportReportEngine'

interface ReportDataTableProps {
  records: GeneralTransportRecord[]
  columns: ColumnDefinition[]
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  onSort: (field: string) => void
  onSelectTransport: (transportNumber: string, record: GeneralTransportRecord) => void
  isLoading: boolean
}

export const ReportDataTable: React.FC<ReportDataTableProps> = ({
  records,
  columns,
  sortField,
  sortOrder,
  onSort,
  onSelectTransport,
  isLoading,
}) => {
  // Cores de status padrão CIAFAL
  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s.includes('CONCLU') || s.includes('FINALIZ')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (s.includes('VIAGEM') || s.includes('TRANSIT')) {
      return 'bg-sky-100 text-sky-800 border-sky-300'
    }
    if (s.includes('EXPED') || s.includes('CARREG')) {
      return 'bg-amber-100 text-amber-800 border-amber-300'
    }
    if (s.includes('OCORR') || s.includes('CANC') || s.includes('BLOQ')) {
      return 'bg-rose-100 text-rose-800 border-rose-300'
    }
    return 'bg-slate-100 text-slate-800 border-slate-300'
  }

  // Define posições sticky horizontais
  // Colunas sticky: Transporte (esquerda 0), Stts.Trnsp (esquerda 130px), ID ext.1/Placa (esquerda 270px)
  const getStickyStyle = (col: ColumnDefinition, index: number) => {
    if (!col.sticky) return undefined

    if (col.key === 'transport_number') {
      return {
        position: 'sticky' as const,
        left: 0,
        zIndex: 20,
        backgroundColor: '#ffffff',
        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
      }
    }
    if (col.key === 'transport_status') {
      return {
        position: 'sticky' as const,
        left: 130,
        zIndex: 19,
        backgroundColor: '#ffffff',
        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
      }
    }
    if (col.key === 'external_id_1') {
      return {
        position: 'sticky' as const,
        left: 270,
        zIndex: 18,
        backgroundColor: '#ffffff',
        boxShadow: '4px 0 6px -2px rgba(0,0,0,0.12)',
      }
    }
    return undefined
  }

  const getStickyHeaderStyle = (col: ColumnDefinition) => {
    if (!col.sticky) return undefined

    if (col.key === 'transport_number') {
      return {
        position: 'sticky' as const,
        left: 0,
        zIndex: 35,
        backgroundColor: '#f1f5f9',
        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
      }
    }
    if (col.key === 'transport_status') {
      return {
        position: 'sticky' as const,
        left: 130,
        zIndex: 34,
        backgroundColor: '#f1f5f9',
        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
      }
    }
    if (col.key === 'external_id_1') {
      return {
        position: 'sticky' as const,
        left: 270,
        zIndex: 33,
        backgroundColor: '#f1f5f9',
        boxShadow: '4px 0 6px -2px rgba(0,0,0,0.12)',
      }
    }
    return undefined
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Container com scroll horizontal e cabeçalho sticky */}
        <div className="overflow-x-auto max-h-[640px] relative scrollbar-thin scrollbar-thumb-slate-300">
          <Table className="w-full border-collapse text-xs">
            <TableHeader className="sticky top-0 z-30 bg-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <TableRow className="border-b border-slate-200 hover:bg-slate-100">
                {columns.map((col, idx) => {
                  const isSorted = sortField === col.key
                  const stickyStyle = getStickyHeaderStyle(col)

                  return (
                    <TableHead
                      key={col.key}
                      style={{
                        minWidth: col.minWidth ? `${col.minWidth}px` : '110px',
                        ...stickyStyle,
                      }}
                      className={`h-11 px-3 text-slate-700 font-bold select-none text-[11px] whitespace-nowrap cursor-pointer transition hover:bg-slate-200/80 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      }`}
                      onClick={() => onSort(col.key as string)}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex items-center gap-1.5 ${
                              col.align === 'right'
                                ? 'justify-end'
                                : col.align === 'center'
                                  ? 'justify-center'
                                  : 'justify-start'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 font-mono">#{col.seq}</span>
                            <span className="font-semibold">{col.label}</span>
                            <span className="text-[10px] text-[#005596] font-mono bg-blue-50 px-1 rounded border border-blue-200">
                              {col.sapTitle}
                            </span>
                            <span className="text-slate-400">
                              {isSorted ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="w-3 h-3 text-[#005596]" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 text-[#005596]" />
                                )
                              ) : (
                                <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          <p className="font-bold text-[#005596]">{col.label}</p>
                          <p className="text-[11px] text-slate-200">{col.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-44 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#005596] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-slate-600">
                        Carregando registros operacionais do SAP ZSD40...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-44 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Info className="w-6 h-6 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700">
                        Nenhum transporte encontrado para os filtros selecionados
                      </p>
                      <p className="text-xs text-slate-400">
                        Ajuste o número do transporte, o intervalo de datas ou a placa para refazer
                        a consulta.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((rec) => (
                  <TableRow
                    key={rec.id}
                    className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                  >
                    {columns.map((col, idx) => {
                      const rawValue = rec[col.key]
                      const formatted = formatReportValue(rawValue, col.format)
                      const stickyStyle = getStickyStyle(col, idx)

                      // 1. Coluna de Transporte: link clicável para detalhe
                      if (col.key === 'transport_number') {
                        return (
                          <TableCell
                            key={col.key}
                            style={stickyStyle}
                            className="font-mono font-bold text-[#005596] whitespace-nowrap px-3 py-2.5"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onSelectTransport(
                                  rec.sap_transport_number || rec.transport_number,
                                  rec,
                                )
                              }
                              className="inline-flex items-center gap-1.5 hover:underline text-left group cursor-pointer"
                              title="Clique para abrir o detalhamento operacional completo"
                            >
                              <span>{formatted}</span>
                              <ExternalLink className="w-3 h-3 text-[#005596] opacity-60 group-hover:opacity-100" />
                            </button>
                          </TableCell>
                        )
                      }

                      // 2. Coluna Status
                      if (col.key === 'transport_status') {
                        return (
                          <TableCell
                            key={col.key}
                            style={stickyStyle}
                            className="text-center px-3 py-2.5 whitespace-nowrap"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${getStatusBadge(
                                String(rawValue),
                              )}`}
                            >
                              {formatted}
                            </Badge>
                          </TableCell>
                        )
                      }

                      // 3. Coluna ID ext.1 (Placa)
                      if (col.key === 'external_id_1') {
                        return (
                          <TableCell
                            key={col.key}
                            style={stickyStyle}
                            className="font-mono text-center font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap"
                          >
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                              {formatted}
                            </span>
                          </TableCell>
                        )
                      }

                      // 4. Motivo Balança com ícone de alerta caso haja divergência
                      if (col.key === 'scale_reason') {
                        const hasDivergence =
                          rec.diff_weight_pct > 1.0 ||
                          String(rawValue).toLowerCase().includes('diverg')
                        return (
                          <TableCell
                            key={col.key}
                            className="px-3 py-2.5 whitespace-nowrap text-left"
                          >
                            <div className="flex items-center gap-1.5 max-w-[240px]">
                              <Scale
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  hasDivergence ? 'text-amber-500' : 'text-slate-400'
                                }`}
                              />
                              <span
                                className={`truncate text-xs ${
                                  hasDivergence ? 'text-amber-700 font-semibold' : 'text-slate-700'
                                }`}
                                title={String(rawValue)}
                              >
                                {formatted}
                              </span>
                            </div>
                          </TableCell>
                        )
                      }

                      // 5. Diferença de Pesagem com coloração visual preventiva
                      if (col.key === 'diff_weight_ton' || col.key === 'diff_weight_pct') {
                        const num = Number(rawValue) || 0
                        const isHigh = Math.abs(num) > (col.key === 'diff_weight_pct' ? 1.5 : 0.2)
                        return (
                          <TableCell
                            key={col.key}
                            className={`px-3 py-2.5 whitespace-nowrap font-mono text-right ${
                              isHigh ? 'text-amber-600 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {formatted}
                          </TableCell>
                        )
                      }

                      // Demais colunas padrão com formatação e alinhamento
                      return (
                        <TableCell
                          key={col.key}
                          style={stickyStyle}
                          className={`px-3 py-2.5 whitespace-nowrap text-xs ${
                            col.align === 'right'
                              ? 'text-right font-mono'
                              : col.align === 'center'
                                ? 'text-center font-mono'
                                : 'text-left text-slate-700'
                          }`}
                        >
                          <span title={String(rawValue || '')}>{formatted}</span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}
