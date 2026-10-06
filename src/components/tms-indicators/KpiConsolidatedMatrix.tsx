import React from 'react'
import { KpiRowData, KpiMonthCell, KpiCategory, KpiRule } from '@/domain/tmsIndicatorsEngine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Eye,
  Settings2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'

interface KpiConsolidatedMatrixProps {
  rows: KpiRowData[]
  onOpenDrillDown: (kpi: KpiRowData, monthCell?: KpiMonthCell) => void
  onOpenTargetConfig: (kpi: KpiRowData) => void
  onOpenGraphicAnalysis?: (kpi: KpiRowData, monthCell?: KpiMonthCell) => void
  onOpenTreatmentWorkflow?: (kpi: KpiRowData, monthCell?: KpiMonthCell) => void
}

export const KpiConsolidatedMatrix: React.FC<KpiConsolidatedMatrixProps> = ({
  rows,
  onOpenDrillDown,
  onOpenTargetConfig,
  onOpenGraphicAnalysis,
  onOpenTreatmentWorkflow,
}) => {
  const MONTHS = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  const getRuleSymbol = (rule: KpiRule): string => {
    switch (rule) {
      case 'GTE':
        return '≥'
      case 'LTE':
        return '≤'
      case 'EQ':
        return '='
      case 'BETWEEN':
        return '↔'
      default:
        return '≥'
    }
  }

  const getCategoryBadge = (category: KpiCategory) => {
    switch (category) {
      case 'EXPEDICAO':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            Expedição
          </span>
        )
      case 'LOGISTICA':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Logística
          </span>
        )
      case 'TRANSPORTE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
            Transporte
          </span>
        )
    }
  }

  const renderStatusCell = (kpi: KpiRowData, cell: KpiMonthCell) => {
    // Cores suaves (verde claro, vermelho claro, cinza/neutro) conforme especificado
    let bgClass = 'bg-muted/10 text-muted-foreground'
    let textClass = 'text-muted-foreground'
    let ringClass = ''

    if (cell.status === 'ATENDIDA') {
      bgClass = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
      textClass = 'font-semibold text-emerald-900 dark:text-emerald-100'
      ringClass = 'border-emerald-200 dark:border-emerald-800/40'
    } else if (cell.status === 'FORA_DA_META') {
      bgClass = 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
      textClass = 'font-semibold text-rose-900 dark:text-rose-100'
      ringClass = 'border-rose-200 dark:border-rose-800/40'
    }

    return (
      <TooltipProvider key={cell.month} delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onOpenDrillDown(kpi, cell)}
              className={`w-full h-11 px-1.5 py-1 text-[11px] border text-center transition-all flex flex-col items-center justify-center rounded-md hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-primary ${bgClass} ${ringClass}`}
            >
              <span className={`truncate w-full leading-tight ${textClass}`}>
                {cell.hasData ? cell.formattedValue : '—'}
              </span>
              {cell.hasData && (
                <span className="text-[9px] opacity-70 tracking-tight">
                  {cell.recordsCount} {cell.recordsCount === 1 ? 'reg' : 'regs'}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs p-2.5">
            <div className="font-semibold text-foreground border-b border-border/50 pb-1 mb-1 flex items-center justify-between">
              <span>
                {kpi.name} • {cell.monthLabel}/{cell.year}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] h-4 ${
                  cell.status === 'ATENDIDA'
                    ? 'border-emerald-500 text-emerald-600'
                    : cell.status === 'FORA_DA_META'
                      ? 'border-rose-500 text-rose-600'
                      : 'border-muted text-muted-foreground'
                }`}
              >
                {cell.status === 'ATENDIDA'
                  ? 'Atingida'
                  : cell.status === 'FORA_DA_META'
                    ? 'Fora da Meta'
                    : 'Pendente'}
              </Badge>
            </div>
            <div className="space-y-0.5 text-muted-foreground text-[11px]">
              <div className="flex justify-between">
                <span>Realizado:</span>
                <span className="font-medium text-foreground">
                  {cell.hasData ? cell.formattedValue : 'Sem dados'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Meta ({getRuleSymbol(kpi.rule)}):</span>
                <span className="font-medium text-foreground">{cell.formattedTarget}</span>
              </div>
              <div className="flex justify-between">
                <span>Registros analisados:</span>
                <span className="font-medium text-foreground">{cell.recordsCount}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-sky-600 dark:text-sky-400 flex items-center gap-1 font-medium">
              <Eye className="w-3 h-3" /> Clique para abrir detalhamento e IA
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden transition-all">
      {/* Título de Cabeçalho da Matriz */}
      <div className="p-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
            Matriz Consolidada Anual (Real x Meta)
          </span>
          <span className="text-[11px] text-muted-foreground">
            • {rows.length} indicadores cadastrados
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-400 dark:bg-emerald-950/80" />
            <span>Meta Atingida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-400 dark:bg-rose-950/80" />
            <span>Fora da Meta (Desvio)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted/60 border border-border" />
            <span>Sem dados / Pendente</span>
          </div>
        </div>
      </div>

      {/* Tabela com Primeira Coluna Fixa e Rolagem Horizontal */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground sticky top-0 z-20">
              {/* Coluna 1 Fixa: Indicador */}
              <th className="py-2.5 px-3 sticky left-0 z-30 bg-muted/95 backdrop-blur-sm min-w-[240px] max-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Indicador TMS
              </th>
              <th className="py-2.5 px-2.5 min-w-[100px]">Categoria</th>
              <th className="py-2.5 px-2.5 min-w-[75px] text-center">Meta</th>
              <th className="py-2.5 px-2 text-center min-w-[50px]">Regra</th>
              {MONTHS.map((m) => (
                <th key={m} className="py-2.5 px-1.5 text-center min-w-[80px]">
                  {m}
                </th>
              ))}
              <th className="py-2.5 px-2 text-center min-w-[70px]">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-8 text-center text-muted-foreground text-xs">
                  Nenhum indicador encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              rows.map((kpi) => (
                <tr key={kpi.id} className="hover:bg-muted/15 transition-colors group">
                  {/* Coluna Fixa à Esquerda: Nome do Indicador */}
                  <td className="py-2 px-3 sticky left-0 z-10 bg-card group-hover:bg-muted/20 backdrop-blur-sm min-w-[240px] max-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-xs leading-tight">
                          {kpi.seq}. {kpi.name}
                        </span>
                        {kpi.trend === 'UP' && (
                          <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                        {kpi.trend === 'DOWN' && (
                          <TrendingDown className="w-3 h-3 text-rose-500 shrink-0" />
                        )}
                        {kpi.trend === 'STABLE' && (
                          <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <span
                        className="text-[10px] text-muted-foreground line-clamp-1"
                        title={kpi.description}
                      >
                        {kpi.description}
                      </span>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="py-2 px-2.5">{getCategoryBadge(kpi.category)}</td>

                  {/* Meta */}
                  <td className="py-2 px-2.5 text-center font-medium text-foreground text-[11px]">
                    {kpi.formattedYtdTarget}
                  </td>

                  {/* Regra */}
                  <td className="py-2 px-2 text-center">
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted/60 text-foreground border border-border/60">
                      {getRuleSymbol(kpi.rule)}
                    </span>
                  </td>

                  {/* Meses Jan..Dez */}
                  {kpi.months.map((cell) => (
                    <td key={cell.month} className="py-1.5 px-1 min-w-[80px]">
                      {renderStatusCell(kpi, cell)}
                    </td>
                  ))}

                  {/* Coluna Ação com Ações Principais: Análise Gráfica Individual e Tratar Desvio */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onOpenGraphicAnalysis && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenGraphicAnalysis(kpi)}
                                className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              📊 Análise Gráfica Individual
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {onOpenTreatmentWorkflow && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenTreatmentWorkflow(kpi)}
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              🛡️ Tratar Desvio / Analisar Causa (8 Etapas)
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenDrillDown(kpi)}
                              className="h-7 w-7 p-0 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Drill-Down e IA Diagnóstica
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenTargetConfig(kpi)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Parametrizar Meta
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
