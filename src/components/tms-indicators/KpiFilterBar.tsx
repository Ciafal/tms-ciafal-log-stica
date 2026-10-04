import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterOptionsData } from '@/services/tmsIndicatorsService'
import { KpiFilterParams, KpiCategory } from '@/domain/tmsIndicatorsEngine'
import { Filter, RotateCcw, Search } from 'lucide-react'

interface KpiFilterBarProps {
  filters: KpiFilterParams
  filterOptions: FilterOptionsData
  onChange: (updated: Partial<KpiFilterParams>) => void
  onReset: () => void
}

export const KpiFilterBar: React.FC<KpiFilterBarProps> = ({
  filters,
  filterOptions,
  onChange,
  onReset,
}) => {
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-3 mb-6 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Filtros Avançados de Análise
            </h3>
            <p className="text-xs text-muted-foreground">
              Segmentação multidimensional combinável de operações e fretes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Ano / Período */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Ano de Referência
          </label>
          <Select
            value={String(filters.year)}
            onValueChange={(val) => onChange({ year: Number(val) })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  Ano {y} {y === currentYear && '(Atual)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Categoria do Indicador
          </label>
          <Select
            value={filters.category || 'TODOS'}
            onValueChange={(val) => onChange({ category: val as 'TODOS' | KpiCategory })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todas as Categorias (22)
              </SelectItem>
              <SelectItem value="EXPEDICAO" className="text-xs">
                Expedição (8 KPIs)
              </SelectItem>
              <SelectItem value="LOGISTICA" className="text-xs">
                Logística (6 KPIs)
              </SelectItem>
              <SelectItem value="TRANSPORTE" className="text-xs">
                Transporte (8 KPIs)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empresa */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">Empresa</label>
          <Select
            value={filters.company || 'TODOS'}
            onValueChange={(val) => onChange({ company: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todas as Empresas
              </SelectItem>
              {filterOptions.companies.map((comp) => (
                <SelectItem key={comp} value={comp} className="text-xs">
                  {comp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Centro / Unidade */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Centro / Unidade
          </label>
          <Select
            value={filters.center || 'TODOS'}
            onValueChange={(val) => onChange({ center: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todos os Centros
              </SelectItem>
              {filterOptions.centers.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Região / UF */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Região / UF
          </label>
          <Select
            value={filters.regionUf || 'TODOS'}
            onValueChange={(val) => onChange({ regionUf: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todas as Regiões / UF
              </SelectItem>
              {filterOptions.regionsUf.map((uf) => (
                <SelectItem key={uf} value={uf} className="text-xs">
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Meta */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Status da Meta
          </label>
          <Select
            value={filters.status || 'TODOS'}
            onValueChange={(val) =>
              onChange({ status: val as 'TODOS' | 'ATENDIDA' | 'FORA_DA_META' | 'SEM_DADOS' })
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todos os Status
              </SelectItem>
              <SelectItem
                value="ATENDIDA"
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
              >
                Atingida (Conforme)
              </SelectItem>
              <SelectItem
                value="FORA_DA_META"
                className="text-rose-600 dark:text-rose-400 font-medium"
              >
                Fora da Meta (Desvio)
              </SelectItem>
              <SelectItem value="SEM_DADOS" className="text-muted-foreground text-xs">
                Meta Pendente / Sem dados
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 2 de Filtros: Itinerário, Transportadora, Motorista e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        {/* Itinerário */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Itinerário / Rota
          </label>
          <Select
            value={filters.itinerary || 'TODOS'}
            onValueChange={(val) => onChange({ itinerary: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Itinerário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todos os Itinerários
              </SelectItem>
              {filterOptions.itineraries.map((it) => (
                <SelectItem key={it} value={it} className="text-xs">
                  {it}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transportadora */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Transportadora
          </label>
          <Select
            value={filters.carrier || 'TODOS'}
            onValueChange={(val) => onChange({ carrier: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Transportadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todas as Transportadoras
              </SelectItem>
              {filterOptions.carriers.map((car) => (
                <SelectItem key={car} value={car} className="text-xs truncate max-w-[280px]">
                  {car}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Motorista */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Motorista
          </label>
          <Select
            value={filters.driver || 'TODOS'}
            onValueChange={(val) => onChange({ driver: val })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Todos os Motoristas
              </SelectItem>
              {filterOptions.drivers.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Busca Textual */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase">
            Buscar Indicador
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.searchQuery || ''}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              placeholder="Nome ou descrição..."
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
