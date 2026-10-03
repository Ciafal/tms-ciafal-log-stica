import React, { useRef, useEffect } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Scale,
  PackageOpen,
} from 'lucide-react'
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Garante que ao carregar novos dados o scroll comece sempre alinhado à esquerda
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0
    }
  }, [])

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

  // Define estilo para a primeira coluna fixa (Nº Transporte)
  // Fixamos APENAS a coluna de identificação para nunca haver conflito de sobreposição
  const isColSticky = (col: ColumnDefinition) => col.key === 'transport_number'

  const getStickyCellClass = (col: ColumnDefinition) => {
    if (isColSticky(col)) {
      return 'sticky left-0 z-20 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]'
    }
    return ''
  }

  const getStickyHeaderClass = (col: ColumnDefinition) => {
    if (isColSticky(col)) {
      return 'sticky left-0 z-40 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]'
    }
    return ''
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full max-w-full min-w-0 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Container com scroll horizontal dedicado e isolado da página */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          aria-label="Tabela do Relatório Geral Transporte com 43 colunas canônicas"
          className="w-full max-w-full overflow-x-auto max-h-[640px] relative scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 focus:outline-none focus:ring-1 focus:ring-[#005596]/30"
        >
          <table className="border-collapse text-xs table-auto w-max min-w-full">
            {/* thead fixo verticalmente (sticky top-0) */}
            <thead className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <tr className="border-b border-slate-200">
                {columns.map((col) => {
                  const isSorted = sortField === col.key
                  const minW = col.minWidth ? `${col.minWidth}px` : '130px'
                  const stickyClass = getStickyHeaderClass(col)

                  return (
                    <th
                      key={col.key}
                      style={{
                        minWidth: minW,
                        width: minW,
                      }}
                      className={`h-11 px-3 text-slate-700 font-bold select-none text-[11px] whitespace-nowrap cursor-pointer transition hover:bg-slate-200/80 ${stickyClass} ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      }`}
                      onClick={() => onSort(col.key as string)}
                      title={`Ordenar por ${col.label}`}
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
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              #{col.seq}
                            </span>
                            <span className="font-semibold text-slate-800 tracking-tight">
                              {col.label}
                            </span>
                            <span className="text-[9.5px] text-[#005596] font-mono font-bold bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/60 shrink-0">
                              {col.sapTitle}
                            </span>
                            <span className="text-slate-400 shrink-0 ml-0.5">
                              {isSorted ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-[#005596]" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-[#005596]" />
                                )
                              ) : (
                                <ArrowUpDown className="w-2.5 h-2.5 opacity-35 hover:opacity-100" />
                              )}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-sm p-2.5">
                          <p className="font-bold text-[#005596] mb-0.5">
                            #{col.seq} — {col.label} ({col.sapTitle})
                          </p>
                          <p className="text-[11px] text-slate-200 leading-snug">{col.tooltip}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            Formato: {col.format} • Largura mín.: {minW}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-56 text-center text-slate-500 bg-white">
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                      <div className="w-8 h-8 border-3 border-[#005596] border-t-transparent rounded-full animate-spin" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-700 block">
                          Carregando registros operacionais do SAP ZSD40...
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Sincronizando histórico operacional, pesagens e ordens de transporte.
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                /* Estado sem registros enriquecido e com visual institucional CIAFAL */
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-56 text-center text-slate-500 bg-slate-50/40"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto py-10">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-[#005596] flex items-center justify-center mb-1">
                        <PackageOpen className="w-6 h-6 text-[#005596]" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Nenhum transporte encontrado
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed px-4">
                        Ajuste os filtros ou verifique se existem transportes para o período
                        selecionado. Você pode alterar as datas, número do transporte ou placa do
                        veículo.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                  >
                    {columns.map((col) => {
                      const rawValue = rec[col.key]
                      const formatted = formatReportValue(rawValue, col.format)
                      const minW = col.minWidth ? `${col.minWidth}px` : '130px'
                      const stickyCellClass = getStickyCellClass(col)

                      // 1. Coluna de Transporte: link clicável para detalhe
                      if (col.key === 'transport_number') {
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: minW, width: minW }}
                            className={`font-mono font-bold text-[#005596] whitespace-nowrap px-3 py-2.5 ${stickyCellClass}`}
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
                              <ExternalLink className="w-3 h-3 text-[#005596] opacity-60 group-hover:opacity-100 shrink-0" />
                            </button>
                          </td>
                        )
                      }

                      // 2. Coluna Status do Transporte
                      if (col.key === 'transport_status') {
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: minW, width: minW }}
                            className={`text-center px-3 py-2.5 whitespace-nowrap ${stickyCellClass}`}
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${getStatusBadge(
                                String(rawValue),
                              )}`}
                            >
                              {formatted}
                            </Badge>
                          </td>
                        )
                      }

                      // 3. Coluna ID ext.1 (Placa)
                      if (col.key === 'external_id_1') {
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: minW, width: minW }}
                            className={`font-mono text-center font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap ${stickyCellClass}`}
                          >
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                              {formatted}
                            </span>
                          </td>
                        )
                      }

                      // 4. Motivo Balança com ícone e tooltip
                      if (col.key === 'scale_reason') {
                        const hasDivergence =
                          rec.diff_weight_pct > 1.0 ||
                          String(rawValue).toLowerCase().includes('diverg')
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: minW, width: minW }}
                            className="px-3 py-2.5 whitespace-nowrap text-left"
                          >
                            <div className="flex items-center gap-1.5 max-w-[260px]">
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
                          </td>
                        )
                      }

                      // 5. Diferença de Pesagem com coloração visual preventiva
                      if (col.key === 'diff_weight_ton' || col.key === 'diff_weight_pct') {
                        const num = Number(rawValue) || 0
                        const isHigh = Math.abs(num) > (col.key === 'diff_weight_pct' ? 1.5 : 0.2)
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: minW, width: minW }}
                            className={`px-3 py-2.5 whitespace-nowrap font-mono text-right ${
                              isHigh ? 'text-amber-600 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {formatted}
                          </td>
                        )
                      }

                      // Demais colunas padrão com formatação e alinhamento
                      return (
                        <td
                          key={col.key}
                          style={{ minWidth: minW, width: minW }}
                          className={`px-3 py-2.5 whitespace-nowrap text-xs ${stickyCellClass} ${
                            col.align === 'right'
                              ? 'text-right font-mono'
                              : col.align === 'center'
                                ? 'text-center font-mono'
                                : 'text-left text-slate-700'
                          }`}
                        >
                          <span title={String(rawValue || '')}>{formatted}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  )
}
