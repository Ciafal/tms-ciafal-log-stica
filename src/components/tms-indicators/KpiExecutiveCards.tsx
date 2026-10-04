import React from 'react'
import { KpiRowData, KpiFilterParams } from '@/domain/tmsIndicatorsEngine'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Percent,
  RefreshCw,
  Send,
} from 'lucide-react'

interface KpiExecutiveCardsProps {
  rows: KpiRowData[]
  onFilterStatus: (status: KpiFilterParams['status']) => void
  activeStatusFilter?: string
}

export const KpiExecutiveCards: React.FC<KpiExecutiveCardsProps> = ({
  rows,
  onFilterStatus,
  activeStatusFilter,
}) => {
  // Contagens
  const total = rows.length
  const atingidos = rows.filter((r) => r.ytdStatus === 'ATENDIDA').length
  const fora = rows.filter((r) => r.ytdStatus === 'FORA_DA_META').length

  // KPIs específicos de destaque
  const otifExp = rows.find((r) => r.id === 'otif_expedicao')
  const otifEnt = rows.find((r) => r.id === 'otif_entrega_cliente')
  const dwellTime = rows.find((r) => r.id === 'tempo_permanencia_veiculo')
  const freightTon = rows.find((r) => r.id === 'custo_medio_frete_tonelada')
  const freightMargin = rows.find((r) => r.id === 'resultado_financeiro_frete')
  const reprog = rows.find((r) => r.id === 'cargas_reprogramadas')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
      {/* 1. Indicadores Atingidos (Filtro rápido) */}
      <button
        type="button"
        onClick={() => onFilterStatus(activeStatusFilter === 'ATENDIDA' ? 'TODOS' : 'ATENDIDA')}
        className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
          activeStatusFilter === 'ATENDIDA'
            ? 'bg-emerald-500/15 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
            : 'bg-card border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'
        }`}
      >
        <div className="flex items-center justify-between w-full text-emerald-600 dark:text-emerald-400">
          <span className="font-medium text-[11px] truncate">Atingidos</span>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-foreground">{atingidos}</span>
          <span className="text-[10px] text-muted-foreground ml-1">/ {total}</span>
        </div>
      </button>

      {/* 2. Fora da Meta (Filtro rápido) */}
      <button
        type="button"
        onClick={() =>
          onFilterStatus(activeStatusFilter === 'FORA_DA_META' ? 'TODOS' : 'FORA_DA_META')
        }
        className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
          activeStatusFilter === 'FORA_DA_META'
            ? 'bg-rose-500/15 border-rose-500 shadow-sm ring-1 ring-rose-500'
            : 'bg-card border-border hover:border-rose-500/50 hover:bg-rose-500/5'
        }`}
      >
        <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
          <span className="font-medium text-[11px] truncate">Fora da Meta</span>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-foreground">{fora}</span>
          <span className="text-[10px] text-muted-foreground ml-1">desvios</span>
        </div>
      </button>

      {/* 3. OTIF Expedição */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-sky-600 dark:text-sky-400">
          <span className="font-medium text-[11px] truncate">OTIF Expedição</span>
          <Send className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {otifExp?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {otifExp?.formattedYtdTarget || '≥ 95%'}
          </span>
        </div>
      </div>

      {/* 4. OTIF Entrega */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-indigo-600 dark:text-indigo-400">
          <span className="font-medium text-[11px] truncate">OTIF Entrega</span>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {otifEnt?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {otifEnt?.formattedYtdTarget || '≥ 95%'}
          </span>
        </div>
      </div>

      {/* 5. Permanência do Veículo */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-amber-600 dark:text-amber-400">
          <span className="font-medium text-[11px] truncate">Permanência</span>
          <Clock className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {dwellTime?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {dwellTime?.formattedYtdTarget || '≤ 120min'}
          </span>
        </div>
      </div>

      {/* 6. Frete R$/t */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-emerald-600 dark:text-emerald-400">
          <span className="font-medium text-[11px] truncate">Frete R$/t</span>
          <DollarSign className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {freightTon?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {freightTon?.formattedYtdTarget || '≤ R$ 160'}
          </span>
        </div>
      </div>

      {/* 7. Margem Média Frete */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-purple-600 dark:text-purple-400">
          <span className="font-medium text-[11px] truncate">Margem Frete</span>
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {freightMargin?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {freightMargin?.formattedYtdTarget || '≥ 15%'}
          </span>
        </div>
      </div>

      {/* 8. Reprogramadas */}
      <div className="p-2.5 rounded-xl border bg-card border-border flex flex-col justify-between">
        <div className="flex items-center justify-between w-full text-orange-600 dark:text-orange-400">
          <span className="font-medium text-[11px] truncate">Reprogramadas</span>
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">
            {reprog?.formattedYtdReal || '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta {reprog?.formattedYtdTarget || '≤ 5%'}
          </span>
        </div>
      </div>
    </div>
  )
}
