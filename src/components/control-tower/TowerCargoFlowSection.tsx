// src/components/control-tower/TowerCargoFlowSection.tsx
// Seção "FLUXO DAS CARGAS" da Torre de Controle TMS HUB CIAFAL
// Contém 5 cards:
// 1. CARGAS EM NEGOCIAÇÃO (Azul Ciafal)
// 2. CARGAS COM CONTRAPROPOSTA (Laranja / Âmbar)
// 3. CARGAS RECUSADAS (Vermelho - cargas únicas)
// 4. CARGAS EM EXPEDIÇÃO (Azul / Ciano)
// 5. CARGAS FATURADAS (Verde)
// Exibe DUAS métricas por card: Principal: Nº de cargas (ex.: "18 cargas"), Secundária: peso total (ex.: "486,75 t").
// Padrão numérico brasileiro rigoroso. Zero mocks.
// Todos os 5 cards clicáveis abrindo o modal de detalhamento com deep link.

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui-custom'
import {
  GitPullRequest,
  ArrowRightLeft,
  XCircle,
  Truck,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  TowerBucketSummary,
  TowerCargoItem,
  formatBrazilianLoads,
  formatBrazilianTons,
} from '@/services/controlTowerService'
import { TowerCargoDetailModal } from './TowerCargoDetailModal'

interface TowerCargoFlowSectionProps {
  periodLabel: string
  fluxo: {
    em_negociacao: TowerBucketSummary
    com_contraproposta: TowerBucketSummary
    recusadas: TowerBucketSummary
    em_expedicao: TowerBucketSummary
    faturadas: TowerBucketSummary
  }
}

interface SelectedModalState {
  open: boolean
  bucketKey: string
  bucketTitle: string
  bucketColor: string
  badgeText: string
  items: TowerCargoItem[]
}

export const TowerCargoFlowSection: React.FC<TowerCargoFlowSectionProps> = ({
  periodLabel,
  fluxo,
}) => {
  const [modalState, setModalState] = useState<SelectedModalState>({
    open: false,
    bucketKey: '',
    bucketTitle: '',
    bucketColor: '',
    badgeText: '',
    items: [],
  })

  const openBucketModal = (
    bucketKey: string,
    bucketTitle: string,
    bucketColor: string,
    badgeText: string,
    items: TowerCargoItem[],
  ) => {
    setModalState({
      open: true,
      bucketKey,
      bucketTitle,
      bucketColor,
      badgeText,
      items,
    })
  }

  // Cards de configuração
  const cards = [
    {
      key: 'em_negociacao',
      title: 'CARGAS EM NEGOCIAÇÃO',
      subtitle: 'Mesa de Fretes em negociação ativa',
      badge: 'Mesa Ativa',
      accentColor: '#005596', // Azul Ciafal Pantone 2945
      lightBg: 'bg-sky-50/70',
      borderHover: 'hover:border-[#005596]',
      ringColor: 'ring-[#005596]/30',
      icon: GitPullRequest,
      iconColor: 'text-[#005596]',
      data: fluxo.em_negociacao,
    },
    {
      key: 'com_contraproposta',
      title: 'CARGAS C/ CONTRAPROPOSTA',
      subtitle: 'Contraproposta recebida e pendente',
      badge: 'Em Análise',
      accentColor: '#d97706', // Laranja / Amarelo
      lightBg: 'bg-amber-50/70',
      borderHover: 'hover:border-amber-500',
      ringColor: 'ring-amber-500/30',
      icon: ArrowRightLeft,
      iconColor: 'text-amber-600',
      data: fluxo.com_contraproposta,
    },
    {
      key: 'recusadas',
      title: 'CARGAS RECUSADAS',
      subtitle: 'Cargas com recusas no período (únicas)',
      badge: 'Cargas Únicas',
      accentColor: '#dc2626', // Vermelho
      lightBg: 'bg-rose-50/70',
      borderHover: 'hover:border-rose-500',
      ringColor: 'ring-rose-500/30',
      icon: XCircle,
      iconColor: 'text-rose-600',
      data: fluxo.recusadas,
    },
    {
      key: 'em_expedicao',
      title: 'CARGAS EM EXPEDIÇÃO',
      subtitle: 'Transporte alocado até faturamento',
      badge: 'Operação',
      accentColor: '#0284c7', // Ciano / Azul Claro
      lightBg: 'bg-cyan-50/70',
      borderHover: 'hover:border-sky-500',
      ringColor: 'ring-sky-500/30',
      icon: Truck,
      iconColor: 'text-cyan-600',
      data: fluxo.em_expedicao,
    },
    {
      key: 'faturadas',
      title: 'CARGAS FATURADAS',
      subtitle: 'Faturadas no período (SAP/TMS)',
      badge: 'Concluídas',
      accentColor: '#16a34a', // Verde
      lightBg: 'bg-emerald-50/70',
      borderHover: 'hover:border-emerald-500',
      ringColor: 'ring-emerald-500/30',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      data: fluxo.faturadas,
    },
  ]

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Fluxo das Cargas (Mesa de Fretes → Expedição → Faturamento)"
        icon={GitPullRequest}
        iconColor="text-[#005596]"
        badge={periodLabel}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          const loadsCount = c.data?.loads || 0
          const tonsVal = c.data?.tons || 0
          const loadsFormatted = c.data?.loads_formatted || formatBrazilianLoads(loadsCount)
          const tonsFormatted = c.data?.tons_formatted || formatBrazilianTons(tonsVal)
          const items = c.data?.items || []

          return (
            <Card
              key={c.key}
              onClick={() => openBucketModal(c.key, c.title, c.accentColor, c.badge, items)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openBucketModal(c.key, c.title, c.accentColor, c.badge, items)
                }
              }}
              className={`relative overflow-hidden cursor-pointer transition-all duration-200 border border-slate-200/90 hover:shadow-md ${c.borderHover} group focus:outline-none focus:ring-2 ${c.ringColor}`}
            >
              {/* Barra superior de destaque de cor */}
              <div
                className="h-1.5 w-full transition-all"
                style={{ backgroundColor: c.accentColor }}
              />

              <CardContent className="p-4 flex flex-col justify-between h-[155px]">
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate block">
                      {c.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate" title={c.subtitle}>
                      {c.subtitle}
                    </span>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-lg ${c.lightBg} flex items-center justify-center shrink-0 border border-slate-200/50`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
                  </div>
                </div>

                {/* Métricas: Hierarquia rigorosa — Número grande em destaque, tonelagem logo abaixo */}
                <div className="my-auto py-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {loadsCount}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {loadsCount === 1 ? 'carga' : 'cargas'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-extrabold text-[#005596] tracking-tight">
                      {tonsFormatted}
                    </span>
                  </div>
                </div>

                {/* Rodapé do Card com indicação interativa de clique */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-[#005596] transition-colors">
                  <span className="truncate">Ver detalhamento</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Detalhamento com Lista de Cargas e Deep Links */}
      <TowerCargoDetailModal
        open={modalState.open}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, open }))}
        bucketKey={modalState.bucketKey}
        bucketTitle={modalState.bucketTitle}
        bucketColor={modalState.bucketColor}
        badgeText={modalState.badgeText}
        periodLabel={periodLabel}
        items={modalState.items}
      />
    </div>
  )
}
