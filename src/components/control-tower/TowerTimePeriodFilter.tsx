// src/components/control-tower/TowerTimePeriodFilter.tsx
// Seletor temporal horizontal principal da Torre de Controle:
// [ HOJE ] [ ONTEM ] [ SEMANA ] [ MÊS ] [ ANO ]
// Destaca visualmente o filtro selecionado no padrão visual Ciafal (Pantone 2945). Default: HOJE.
// Exibe a referência temporal correspondente (ex: "03/10/2026" ou "01/10/2026 a 03/10/2026").

import React from 'react'
import { Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TowerTimePeriod } from '@/services/controlTowerService'

interface TowerTimePeriodFilterProps {
  selectedPeriod: TowerTimePeriod
  onSelectPeriod: (period: TowerTimePeriod) => void
  periodLabel: string
  isRefreshing?: boolean
  onRefresh?: () => void
}

const PERIOD_OPTIONS: { id: TowerTimePeriod; label: string; tooltip: string }[] = [
  { id: 'today', label: 'HOJE', tooltip: 'Dados e eventos do dia atual' },
  { id: 'yesterday', label: 'ONTEM', tooltip: 'Dados e eventos do dia anterior' },
  { id: 'week', label: 'SEMANA', tooltip: 'Dados acumulados da semana corrente' },
  { id: 'month', label: 'MÊS', tooltip: 'Dados acumulados do mês corrente' },
  { id: 'year', label: 'ANO', tooltip: 'Dados consolidados do ano corrente' },
]

export const TowerTimePeriodFilter: React.FC<TowerTimePeriodFilterProps> = ({
  selectedPeriod,
  onSelectPeriod,
  periodLabel,
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Botões do Seletor Horizontal */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mr-1 shrink-0">
          Período:
        </span>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200/80 gap-1">
          {PERIOD_OPTIONS.map((opt) => {
            const isSelected = selectedPeriod === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectPeriod(opt.id)}
                title={opt.tooltip}
                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                  isSelected
                    ? 'bg-[#005596] text-white shadow-sm ring-1 ring-[#005596]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Referência Temporal e Botão de Atualização em Tempo Real */}
      <div className="flex items-center gap-2.5 self-end md:self-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-xs font-bold text-[#005596]">
          <Calendar className="w-3.5 h-3.5 text-[#005596] shrink-0" />
          <span>Referência:</span>
          <span className="font-extrabold font-mono text-slate-800">{periodLabel || 'Hoje'}</span>
        </div>

        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 text-xs text-slate-600 hover:text-[#005596] border-slate-300 hover:border-[#005596]"
            title="Recalcular indicadores com dados reais mais recentes"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin text-[#005596]' : ''}`}
            />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        )}
      </div>
    </div>
  )
}
