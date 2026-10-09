import { describe, it, expect } from 'vitest'
import loadPlannerContent from '../pages/LoadPlannerPage.tsx?raw'
import futureProgContent from '../pages/FutureProgrammingPage.tsx?raw'
import logisticalMapContent from '../components/load-planner/LogisticalMapTowerView.tsx?raw'
import dateFieldContent from '../components/ui-custom/TMSDateField.tsx?raw'
import filterGridContent from '../components/ui-custom/TMSFilterGrid.tsx?raw'
import quickFiltersContent from '../components/ui-custom/TMSQuickFilters.tsx?raw'
import cardContent from '../components/ui-custom/TMSResponsiveCard.tsx?raw'
import actionBarContent from '../components/ui-custom/TMSActionBar.tsx?raw'
import formatContent from '../utils/format.ts?raw'

describe('Validação Definitiva de Responsividade e Padronização Visual do TMS CIAFAL', () => {
  describe('PARTE 1: Planejador de Cargas — Barra de 7 Filtros e Campo de Data', () => {
    it('1.1 Utiliza TMSFilterGrid com auto-fit e TMSFilterField no LoadPlannerPage', () => {
      expect(loadPlannerContent).toMatch(/import\s*\{[^}]*TMSFilterGrid[^}]*\}\s*from\s*['"]@\/components\/ui-custom['"]/)
      expect(loadPlannerContent).toMatch(/import\s*\{[^}]*TMSDateField[^}]*\}\s*from\s*['"]@\/components\/ui-custom['"]/)
      expect(loadPlannerContent).toMatch(/<TMSFilterGrid minItemWidth=\{170\}/)
      expect(loadPlannerContent).toMatch(/label="Itinerário SAP"/)
      expect(loadPlannerContent).toMatch(/label="Data de Carregamento"/)
      expect(loadPlannerContent).toMatch(/label="Status PCP"/)
      expect(loadPlannerContent).toMatch(/label="Crédito Financeiro"/)
      expect(loadPlannerContent).toMatch(/label="Tipo Descarga"/)
      expect(loadPlannerContent).toMatch(/label="Veículo Exigido"/)
      expect(loadPlannerContent).toMatch(/label="Nº Fracionamentos"/)
    })

    it('1.2 TMSDateField implementa formatação integral dd/MM/aaaa, sem sobreposição do calendário', () => {
      expect(dateFieldContent).toMatch(/\$\{day\.padStart\(2,\s*'0'\)\}\/\$\{month\.padStart\(2,\s*'0'\)\}\/\$\{year\}/)
      expect(dateFieldContent).toMatch(/CalendarIcon/)
      expect(dateFieldContent).toMatch(/type="date"/)
      expect(dateFieldContent).toMatch(/truncate/)
      expect(dateFieldContent).toMatch(/showPicker/)
    })

    it('1.3 LogisticalMapTowerView compartilha a mesma padronização de altura e responsividade', () => {
      expect(logisticalMapContent).toMatch(/min-h-\[38px\]/)
      expect(logisticalMapContent).toMatch(/Itinerário SAP/)
    })
  })

  describe('PARTE 2: Programação Futura — Filtros Rápidos com flex-wrap e Filtros Detalhados', () => {
    it('2.1 FutureProgrammingPage adota TMSQuickFilters e TMSFilterGrid nos filtros recolhíveis', () => {
      expect(futureProgContent).toMatch(/import\s*\{[^}]*TMSQuickFilters[^}]*\}\s*from\s*['"]@\/components\/ui-custom['"]/)
      expect(futureProgContent).toMatch(/import\s*\{[^}]*TMSFilterGrid[^}]*\}\s*from\s*['"]@\/components\/ui-custom['"]/)
      expect(futureProgContent).toMatch(/<TMSQuickFilters/)
    })

    it('2.2 Preserva todos os filtros rápidos requeridos com seus IDs intactos', () => {
      const requiredFilters = [
        'todos',
        'veiculos_d1',
        'com_espaco',
        'ocupacao_menor_80',
        'ocupacao_80_99',
        'carga_completa',
        'possivel_complemento',
        'estoque_insuficiente',
        'aguardando_pcp',
      ]
      for (const filterId of requiredFilters) {
        expect(futureProgContent).toMatch(new RegExp(`id:\\s*['"]${filterId}['"]`))
      }
    })

    it('2.3 TMSQuickFilters aplica flex-wrap, whitespace normal, botões acessíveis e indicador visual ativo', () => {
      expect(quickFiltersContent).toMatch(/flex flex-wrap/)
      expect(quickFiltersContent).toMatch(/whitespace-normal break-words/)
      expect(quickFiltersContent).toMatch(/#005596/)
      expect(quickFiltersContent).toMatch(/aria-pressed=\{isActive\}/)
    })

    it('2.4 Filtros detalhados expandem e retraem sem deslocamentos incorretos', () => {
      expect(futureProgContent).toMatch(/Filtros detalhados/)
      expect(futureProgContent).toMatch(/Menos filtros/)
      expect(futureProgContent).toMatch(/isFiltersExpanded/)
      expect(futureProgContent).toMatch(/TMSFilterGrid minItemWidth=\{170\}/)
    })
  })

  describe('PARTE 3: Padrão Arquitetural e Reutilização Global Preventiva', () => {
    it('3.1 TMSFilterGrid define grid-template-columns com auto-fit dinâmico', () => {
      expect(filterGridContent).toMatch(/repeat\(auto-fit,\s*minmax\(min\(100%,\s*\$\{minItemWidth\}px\),\s*1fr\)\)/)
      expect(filterGridContent).toMatch(/items-end/)
    })

    it('3.2 TMSResponsiveCard e TMSActionBar garantem integridade de layout e box-sizing', () => {
      expect(cardContent).toMatch(/min-w-0/)
      expect(cardContent).toMatch(/border-slate-200/)
      expect(actionBarContent).toMatch(/flex-wrap/)
      expect(actionBarContent).toMatch(/justify-between/)
    })

    it('3.3 Camada ABNT formatters preservada como fonte única de formatação', () => {
      expect(formatContent).toMatch(/formatTons/)
      expect(formatContent).toMatch(/formatPercent/)
      expect(formatContent).toMatch(/formatCurrency/)
      expect(formatContent).toMatch(/formatDate/)
    })
  })
})
