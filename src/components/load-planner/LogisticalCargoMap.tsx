// TMS CIAFAL — Central Visual de Roteirização e Clusterização Geográfica de Cargas
//
// Atende integralmente aos requisitos do usuário:
// #1: ORIGEM -> CLIENTES -> AGRUPAMENTOS -> ROTAS -> CARGAS PROPOSTAS (Visual claro e sem poluição)
// #2: 1 marcador = cliente/local de descarga (pedidos consolidados no ponto). Hover rico. Clique para abrir painel.
// #3: Cores semânticas por carga/cluster (Carga 01 azul, Carga 02 verde, 03 laranja, etc.)
// #6: Mapa como protagonista, clean e sem excessos decorativos
// #7: Destaque exclusivo da carga selecionada (demais suavizados/dimmed)
// #8: Rota desenhada com sequência CIAFAL -> Cliente 1 -> 2 -> 3 e NÚMEROS nos pontos (ordem prevista)
// #9: Rotas OFF por padrão. Ao selecionar carga, mostra a rota dela. Opção "Exibir todas as rotas" desativada por padrão.
// #10: Botão de Camadas: Clientes/pedidos, Clusterização de cargas, Itinerários, Mapa de calor, Estoque disponível, Estoque futuro, Alertas.
// #12: Legenda compacta semântica integrada no mapa
// #13: Pedidos não planejados com marcador cinza/neutro
// #14: Marcadores com badges especiais de alerta: estoque, crédito, restrição, data crítica, cadastro geo

import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Truck,
  Sparkles,
  Eye,
  EyeOff,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClientDeliveryStop,
  ProposedLoadCluster,
  UNPLANNED_COLOR,
  ALERT_COLOR,
  CLUSTER_COLOR_PALETTE,
  ItineraryRouteInfo,
  ItineraryWaypoint,
} from '@/domain/logisticRoutingEngine'
import {
  latLngToSvgPoint,
  OFFICIAL_ORIGIN_HUBS,
  OriginHub,
  BRAZIL_UF_CENTROIDS,
} from '@/domain/geographicEngine'

export interface VisualMapLayers {
  showClients: boolean // Clientes e Entregas
  showClusters: boolean // Cargas Propostas
  showItineraries: boolean // Rotas Planejadas
  showHeatmap: boolean // Mapa de Calor
  showConsolidationOpportunities: boolean // Oportunidades de Consolidação
  showStockAvailable: boolean
  showFutureStock: boolean
  showLogisticAlerts: boolean
  showAllRoutes: boolean
}

interface LogisticalCargoMapProps {
  stops: ClientDeliveryStop[]
  clusters: ProposedLoadCluster[]
  unplannedStops: ClientDeliveryStop[]
  selectedClusterId: string | null
  selectedStopId: string | null
  heatmapVariable: 'TONELADAS' | 'PEDIDOS' | 'CLIENTES' | 'VALOR' | 'CARGAS' | 'ITENS'
  selectedUf: string
  selectedItinerary: string
  itineraryRouteInfo?: ItineraryRouteInfo | null
  onSelectCluster: (clusterId: string | null) => void
  onSelectStop: (stop: ClientDeliveryStop) => void
  onSelectUf?: (uf: string) => void
  onSelectItinerary?: (itineraryCode: string) => void
  onSwitchToPlannerTab?: () => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
}

// Contornos e posições aproximadas para renderização SVG nítida dos 26 estados + DF
const BRAZIL_STATE_PATHS: Record<string, string> = {
  // Norte
  RR: 'M 210,40 L 260,35 L 280,75 L 250,110 L 210,95 Z',
  AP: 'M 410,70 L 460,80 L 445,130 L 415,120 Z',
  AM: 'M 90,110 L 210,95 L 250,110 L 240,190 L 190,230 L 110,210 L 80,150 Z',
  PA: 'M 250,110 L 410,70 L 430,135 L 470,165 L 430,260 L 370,250 L 350,190 L 250,170 Z',
  AC: 'M 50,210 L 110,210 L 100,260 L 40,250 Z',
  RO: 'M 160,230 L 240,220 L 220,290 L 160,280 Z',
  TO: 'M 400,220 L 450,220 L 440,330 L 390,320 Z',

  // Nordeste
  MA: 'M 430,135 L 500,140 L 490,230 L 440,230 Z',
  PI: 'M 490,160 L 540,170 L 520,270 L 470,260 Z',
  CE: 'M 540,150 L 600,160 L 580,210 L 530,200 Z',
  RN: 'M 600,165 L 650,175 L 640,200 L 590,195 Z',
  PB: 'M 590,200 L 650,200 L 640,225 L 590,220 Z',
  PE: 'M 540,215 L 650,220 L 630,245 L 520,240 Z',
  AL: 'M 610,245 L 645,250 L 635,270 L 600,265 Z',
  SE: 'M 595,270 L 625,270 L 615,290 L 585,285 Z',
  BA: 'M 470,250 L 580,250 L 610,320 L 570,390 L 470,360 L 460,290 Z',

  // Centro-Oeste
  MT: 'M 240,200 L 350,190 L 380,310 L 320,380 L 240,320 Z',
  GO: 'M 380,310 L 450,300 L 460,400 L 390,410 Z',
  DF: 'M 430,340 L 445,340 L 445,355 L 430,355 Z',
  MS: 'M 290,380 L 380,370 L 370,470 L 290,460 Z',

  // Sudeste (Coração operacional CIAFAL)
  MG: 'M 450,340 L 560,340 L 580,410 L 530,470 L 440,460 L 430,390 Z',
  ES: 'M 570,400 L 610,400 L 600,450 L 565,445 Z',
  RJ: 'M 530,460 L 590,450 L 570,490 L 520,490 Z',
  SP: 'M 380,440 L 480,430 L 520,480 L 470,520 L 390,500 Z',

  // Sul
  PR: 'M 370,490 L 460,485 L 450,540 L 360,530 Z',
  SC: 'M 380,535 L 460,535 L 450,570 L 390,565 Z',
  RS: 'M 350,565 L 440,565 L 430,620 L 340,620 Z',
}

export const LogisticalCargoMap: React.FC<LogisticalCargoMapProps> = ({
  stops,
  clusters,
  unplannedStops,
  selectedClusterId,
  selectedStopId,
  heatmapVariable,
  selectedUf,
  selectedItinerary,
  itineraryRouteInfo,
  onSelectCluster,
  onSelectStop,
  onSelectUf,
  onSelectItinerary,
  onSwitchToPlannerTab,
  onOpenCustomerProfile,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Controle do menu popup de Camadas (#10)
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false)

  // Camadas conforme Requisito #9 e #10:
  // Visualização principal = Clientes + clusters.
  // Rotas OFF por padrão; Mapa de calor OFF por padrão como camada secundária.
  const [layers, setLayers] = useState<VisualMapLayers>({
    showClients: true,
    showClusters: true,
    showItineraries: true,
    showHeatmap: true, // Mapa de Calor ativo como camada combinável do heatmap inteligente
    showConsolidationOpportunities: true,
    showStockAvailable: false,
    showFutureStock: false,
    showLogisticAlerts: true,
    showAllRoutes: false,
  })

  // Modal / Popup Responsivo Detalhado por Parada/Cluster (Passo 3)
  const [activePopupStop, setActivePopupStop] = useState<ClientDeliveryStop | null>(null)
  const [activeRouteModalOpen, setActiveRouteModalOpen] = useState(false)
  const [aiAnalysisRationale, setAiAnalysisRationale] = useState<string | null>(null)

  // Tooltip Hover Rico no Cliente (#2)
  const [hoveredStop, setHoveredStop] = useState<{
    stop: ClientDeliveryStop
    x: number
    y: number
  } | null>(null)

  const [hoveredOrigin, setHoveredOrigin] = useState<{
    origin: OriginHub
    x: number
    y: number
  } | null>(null)

  const toggleLayer = (key: keyof VisualMapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Controles de Zoom
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.3, 5))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.3, 0.8))
  const handleResetZoom = () => {
    autoFitBoundingBox()
  }

  // Arraste (Pan)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }

  const handleMouseUp = () => setIsPanning(false)

  // Hubs de Origem
  const origins = OFFICIAL_ORIGIN_HUBS

  // Mapa de cores dos clusters por id para lookup O(1)
  const clusterColorMap = useMemo(() => {
    const map = new Map<string, string>()
    clusters.forEach((c) => {
      map.set(c.id, c.color.hex)
    })
    return map
  }, [clusters])

  // Carga atualmente selecionada
  const activeCluster = useMemo(() => {
    if (!selectedClusterId) return null
    return clusters.find((c) => c.id === selectedClusterId) || null
  }, [clusters, selectedClusterId])

  // Escala Térmica Dinâmica de 5 Faixas por Toneladas Liberadas (Passo 2)
  // Faixa 1 (0–20%): Azul-claro #38bdf8
  // Faixa 2 (20–40%): Verde #10b981
  // Faixa 3 (40–65%): Amarelo #eab308
  // Faixa 4 (65–85%): Laranja #f97316
  // Faixa 5 (85–100%): Vermelho #ef4444
  const activeStopsWithValidCoords = useMemo(() => {
    return stops.filter((s) => !s.isPendingGeo && (s.lat !== 0 || s.lng !== 0))
  }, [stops])

  const maxHeatWeight = useMemo(() => {
    if (activeStopsWithValidCoords.length === 0) return 10
    const maxVal = Math.max(...activeStopsWithValidCoords.map((s) => s.totalWeightTon))
    return Math.max(maxVal, 5) // mínimo de 5t para não estourar em volumes mínimos
  }, [activeStopsWithValidCoords])

  // Cortes térmicos reais em toneladas para a legenda
  const heatThresholds = useMemo(() => {
    return {
      t1: Math.round(maxHeatWeight * 0.2 * 10) / 10,
      t2: Math.round(maxHeatWeight * 0.4 * 10) / 10,
      t3: Math.round(maxHeatWeight * 0.65 * 10) / 10,
      t4: Math.round(maxHeatWeight * 0.85 * 10) / 10,
      t5: Math.round(maxHeatWeight * 10) / 10,
    }
  }, [maxHeatWeight])

  // Função para mapear peso em faixa térmica, cor e opacidade
  const getThermalProperties = useCallback(
    (weightTon: number) => {
      const ratio = Math.min(1, Math.max(0, weightTon / maxHeatWeight))
      if (ratio <= 0.2) {
        return {
          color: '#38bdf8',
          label: '0–20% (Muito Baixa)',
          band: 1,
          opacity: 0.35,
          radiusMultiplier: 1.0,
        }
      } else if (ratio <= 0.4) {
        return {
          color: '#10b981',
          label: '20–40% (Baixa)',
          band: 2,
          opacity: 0.45,
          radiusMultiplier: 1.3,
        }
      } else if (ratio <= 0.65) {
        return {
          color: '#eab308',
          label: '40–65% (Média)',
          band: 3,
          opacity: 0.55,
          radiusMultiplier: 1.7,
        }
      } else if (ratio <= 0.85) {
        return {
          color: '#f97316',
          label: '65–85% (Alta)',
          band: 4,
          opacity: 0.65,
          radiusMultiplier: 2.1,
        }
      } else {
        return {
          color: '#ef4444',
          label: '85–100% (Crítica/Máxima)',
          band: 5,
          opacity: 0.75,
          radiusMultiplier: 2.6,
        }
      }
    },
    [maxHeatWeight],
  )

  // Auto-enquadramento de Zoom Dinâmico por Bounding Box (Passo 2)
  // Calcula minLat, maxLat, minLng, maxLng das paradas ativas com padding de 40px
  const autoFitBoundingBox = useCallback(() => {
    if (activeStopsWithValidCoords.length === 0) {
      setZoomLevel(1)
      setPanOffset({ x: 0, y: 0 })
      return
    }

    const svgWidth = 800
    const svgHeight = 640
    const padding = 40

    // Converte todas as paradas ativas para pontos SVG não transformados
    const points = activeStopsWithValidCoords.map((st) =>
      latLngToSvgPoint(st.lat, st.lng, svgWidth, svgHeight, 40),
    )

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    points.forEach((p) => {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    })

    const boxWidth = Math.max(maxX - minX, 60)
    const boxHeight = Math.max(maxY - minY, 60)

    const availableWidth = svgWidth - padding * 2
    const availableHeight = svgHeight - padding * 2

    const scaleX = availableWidth / boxWidth
    const scaleY = availableHeight / boxHeight
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 1), 4.5)

    const boxCenterX = (minX + maxX) / 2
    const boxCenterY = (minY + maxY) / 2

    const svgCenterX = svgWidth / 2
    const svgCenterY = svgHeight / 2

    const targetPanX = svgCenterX - boxCenterX * targetZoom
    const targetPanY = svgCenterY - boxCenterY * targetZoom

    setZoomLevel(targetZoom)
    setPanOffset({ x: targetPanX, y: targetPanY })
  }, [activeStopsWithValidCoords])

  // Disparar auto-fit ao trocar de itinerário ou quando lista de paradas com coordenadas mudar
  const prevItineraryRef = useRef<string>(selectedItinerary)
  React.useEffect(() => {
    if (prevItineraryRef.current !== selectedItinerary) {
      prevItineraryRef.current = selectedItinerary
      autoFitBoundingBox()
    }
  }, [selectedItinerary, autoFitBoundingBox])

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md flex flex-col h-[640px] select-none">
      {/* Background Cartográfico Clean (Identidade CIAFAL: fundo claro, grid técnico sutil) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#e2e8f0 1px, #f8fafc 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      />

      {/* Floating Toolbar Superior: Filtros rápidos, Badge de Carga Ativa e Botão Camadas (#10) */}
      <div className="relative z-10 px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[#005596] text-white font-mono text-[10px] px-2.5 py-0.5 tracking-wider font-bold">
            ROTEIRIZAÇÃO & CLUSTERS CIAFAL
          </Badge>

          {activeCluster ? (
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: activeCluster.color.hex }}
              />
              <span className="font-bold text-slate-800 text-[11px]">{activeCluster.code}</span>
              <span className="text-slate-500 text-[10px]">
                ({activeCluster.totalWeightTon.toFixed(1)} t • {activeCluster.clientsCount}{' '}
                descargas)
              </span>
              <button
                onClick={() => onSelectCluster(null)}
                className="text-slate-400 hover:text-slate-700 ml-1 text-xs"
                title="Limpar seleção de carga"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              Nenhuma carga em foco • Clique numa carga ou marcador para detalhar
            </span>
          )}

          {selectedUf && selectedUf !== 'ALL' && (
            <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
              UF: {selectedUf}
            </Badge>
          )}

          {selectedItinerary && selectedItinerary !== 'ALL' && (
            <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
              Itin: {selectedItinerary}
            </Badge>
          )}
        </div>

        {/* Botão de Camadas (#10) com Dropdown flutuante */}
        <div className="relative flex items-center gap-2">
          {/* Toggle de Todas as Rotas (#9) */}
          <Button
            size="sm"
            variant={layers.showAllRoutes ? 'default' : 'outline'}
            onClick={() => toggleLayer('showAllRoutes')}
            className={`h-7 text-[10px] font-semibold px-2.5 rounded-lg ${
              layers.showAllRoutes
                ? 'bg-[#005596] text-white'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Exibir todas as rotas desenhadas simultaneamente"
          >
            <Navigation className="w-3 h-3 mr-1" />
            {layers.showAllRoutes ? 'Todas as Rotas: ON' : 'Rotas Individuais'}
          </Button>

          {/* Botão Camadas Principal (#10) */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
              className="h-7 text-[10px] font-bold px-2.5 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#005596]" />
              <span>Camadas</span>
            </Button>

            {/* Dropdown de Camadas */}
            {isLayersMenuOpen && (
              <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 w-60 text-xs space-y-1.5 animate-in fade-in duration-100">
                <div className="font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Camadas do Mapa</span>
                  <button
                    onClick={() => setIsLayersMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🔥 Mapa de Calor</span>
                  <input
                    type="checkbox"
                    checked={layers.showHeatmap}
                    onChange={() => toggleLayer('showHeatmap')}
                    className="rounded text-amber-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">📍 Clientes e Entregas</span>
                  <input
                    type="checkbox"
                    checked={layers.showClients}
                    onChange={() => toggleLayer('showClients')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🚛 Cargas Propostas</span>
                  <input
                    type="checkbox"
                    checked={layers.showClusters}
                    onChange={() => toggleLayer('showClusters')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🛣 Rotas Planejadas</span>
                  <input
                    type="checkbox"
                    checked={layers.showItineraries}
                    onChange={() => toggleLayer('showItineraries')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">
                    ✨ Oportunidades de Consolidação
                  </span>
                  <input
                    type="checkbox"
                    checked={layers.showConsolidationOpportunities}
                    onChange={() => toggleLayer('showConsolidationOpportunities')}
                    className="rounded text-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer border-t border-slate-100 pt-1.5">
                  <span className="text-slate-700 text-[11px]">⚠ Alertas Operacionais</span>
                  <input
                    type="checkbox"
                    checked={layers.showLogisticAlerts}
                    onChange={() => toggleLayer('showLogisticAlerts')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">📦 Estoque Liberado (DP34)</span>
                  <input
                    type="checkbox"
                    checked={layers.showStockAvailable}
                    onChange={() => toggleLayer('showStockAvailable')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🏭 Previsão PCP Futura</span>
                  <input
                    type="checkbox"
                    checked={layers.showFutureStock}
                    onChange={() => toggleLayer('showFutureStock')}
                    className="rounded text-[#005596]"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas Interativo */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-slate-50">
        <svg
          ref={svgRef}
          viewBox="0 0 800 640"
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Gradiente sutil para heatmap secundário (#10) */}
            <radialGradient id="heatSubtle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </radialGradient>

            {/* Sombra para nós e marcadores de alta visibilidade */}
            <filter id="markerShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.25" />
            </filter>

            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Sombra e brilho forte para a Rota do Itinerário selecionado (Azul Institucional CIAFAL) */}
            <filter id="itineraryGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor="#005596"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/* Grupo com Pan e Zoom */}
          <g
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
            style={{
              transformOrigin: '0px 0px',
              transition: isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* 1. Limites dos Estados Brasileiros (Fundo Cartográfico Clean) */}
            <g className="states-layer">
              {Object.entries(BRAZIL_STATE_PATHS).map(([uf, pathD]) => {
                const isSelected = selectedUf === uf
                const hasDemandInUf = stops.some((s) => s.uf === uf)

                return (
                  <path
                    key={uf}
                    d={pathD}
                    onClick={() => onSelectUf && onSelectUf(isSelected ? 'ALL' : uf)}
                    className="cursor-pointer transition-colors duration-150"
                    fill={isSelected ? '#e0f2fe' : hasDemandInUf ? '#f1f5f9' : '#f8fafc'}
                    stroke={isSelected ? '#0284c7' : '#cbd5e1'}
                    strokeWidth={isSelected ? 2 : 1}
                  >
                    <title>{`${uf} ${hasDemandInUf ? '— Possui pedidos' : '— Sem pedidos'}`}</title>
                  </path>
                )
              })}
            </g>

            {/* Siglas dos Estados */}
            <g className="state-labels pointer-events-none opacity-40">
              {Object.entries(BRAZIL_UF_CENTROIDS).map(([uf, item]) => {
                const pt = latLngToSvgPoint(item.lat, item.lng, 800, 640)
                return (
                  <text
                    key={`label-${uf}`}
                    x={pt.x}
                    y={pt.y}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {uf}
                  </text>
                )
              })}
            </g>

            {/* 2. Mapa de Calor por Toneladas Liberadas (Passo 2: 5 Faixas Térmicas Dinâmicas) */}
            {/* NUNCA inventar coordenadas: renderiza SOMENTE paradas ativas com coordenadas válidas (!isPendingGeo && lat!=0) */}
            {layers.showHeatmap && (
              <g className="heatmap-layer pointer-events-none">
                {activeStopsWithValidCoords.map((st) => {
                  const pt = latLngToSvgPoint(st.lat, st.lng, 800, 640)
                  const thermal = getThermalProperties(st.totalWeightTon)
                  // Intensidade e raio ditados pelo peso consolidado (totalWeightTon)
                  // Garante que 3 pedidos/65 t sejam mais intensos que 12 pedidos/18 t
                  const baseRadius = 14
                  const heatRadius = baseRadius * thermal.radiusMultiplier

                  return (
                    <g key={`heat-group-${st.id}`}>
                      {/* Halo difuso externo */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={heatRadius * 1.5}
                        fill={thermal.color}
                        opacity={thermal.opacity * 0.4}
                      />
                      {/* Núcleo térmico concentrado */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={heatRadius}
                        fill={thermal.color}
                        opacity={thermal.opacity}
                      />
                    </g>
                  )
                })}
              </g>
            )}

            {/* Oportunidades de Consolidação (Camada combinável) */}
            {layers.showConsolidationOpportunities && (
              <g className="consolidation-layer pointer-events-none opacity-40">
                {clusters.map((cl) => {
                  if (cl.stops.length < 2) return null
                  const originPt = latLngToSvgPoint(cl.originHub.lat, cl.originHub.lng, 800, 640)
                  const firstStop = latLngToSvgPoint(cl.stops[0].lat, cl.stops[0].lng, 800, 640)
                  return (
                    <line
                      key={`consolidation-hint-${cl.id}`}
                      x1={originPt.x}
                      y1={originPt.y}
                      x2={firstStop.x}
                      y2={firstStop.y}
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      strokeDasharray="3,3"
                    />
                  )
                })}
              </g>
            )}

            {/* 3. Rotas Desenhadas (#8 e #9) e Traçado Oficial do Itinerário Selecionado (#1) */}
            <g className="routes-layer">
              {/* 3.A: Traçado em Destaque do Itinerário Selecionado (Azul Institucional CIAFAL Pantone 2945 #005596) */}
              {layers.showItineraries &&
                selectedItinerary &&
                selectedItinerary !== 'ALL' &&
                itineraryRouteInfo &&
                itineraryRouteInfo.hasValidRoute && (
                  <g
                    key={`itin-highlight-${selectedItinerary}`}
                    className="itinerary-highlight-layer"
                  >
                    {itineraryRouteInfo.routeSegments.map((seg, sIdx) => {
                      const p1 = latLngToSvgPoint(seg.from.lat, seg.from.lng, 800, 640)
                      const p2 = latLngToSvgPoint(seg.to.lat, seg.to.lng, 800, 640)

                      return (
                        <g key={`itin-seg-${sIdx}`}>
                          {/* Halo azul translúcido de fundo para máximo contraste */}
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="#005596"
                            strokeWidth={7}
                            opacity={0.2}
                            strokeLinecap="round"
                          />
                          {/* Linha principal destacada */}
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="#005596"
                            strokeWidth={3.8}
                            strokeDasharray={seg.isReturn ? '6,4' : 'none'}
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#003d6d] transition-all"
                            onClick={() => setActiveRouteModalOpen(true)}
                          >
                            <title>
                              {seg.isReturn
                                ? `Retorno à Expedição (${itineraryRouteInfo.originHub.name}): ${seg.distanceKm} km • Pedágio: R$ ${seg.tollBrl.toFixed(2)}`
                                : `Trecho ${sIdx + 1}: ${seg.from.label} → ${seg.to.label} (${seg.distanceKm} km • Pedágio: R$ ${seg.tollBrl.toFixed(2)})`}
                            </title>
                          </line>

                          {/* Marcador direcional no meio do trecho */}
                          {!seg.isReturn && (
                            <circle
                              cx={(p1.x + p2.x) / 2}
                              cy={(p1.y + p2.y) / 2}
                              r={3.5}
                              fill="#005596"
                              stroke="#ffffff"
                              strokeWidth={1.5}
                            />
                          )}
                        </g>
                      )
                    })}
                  </g>
                )}

              {/* 3.B: Rotas das Cargas Propostas / Clusters individuais */}
              {layers.showItineraries &&
                clusters.map((cluster) => {
                  // Se já desenhamos o itinerário selecionado acima, suaviza rotas de cluster conflitantes
                  const isSelected = selectedClusterId === cluster.id
                  const shouldDraw =
                    isSelected ||
                    (layers.showAllRoutes && (!selectedItinerary || selectedItinerary === 'ALL'))
                  if (!shouldDraw) return null

                  const originPt = latLngToSvgPoint(
                    cluster.originHub.lat,
                    cluster.originHub.lng,
                    800,
                    640,
                  )
                  const stopsPts = cluster.stops.map((s) =>
                    latLngToSvgPoint(s.lat, s.lng, 800, 640),
                  )

                  // Trajeto sequencial: Origem -> Parada 1 -> Parada 2 -> ... -> Parada N -> Origem
                  const allPoints = [originPt, ...stopsPts, originPt]

                  return (
                    <g key={`route-${cluster.id}`} className="transition-opacity duration-200">
                      {/* Linhas conectando os pontos */}
                      {allPoints.slice(0, -1).map((p1, idx) => {
                        const p2 = allPoints[idx + 1]
                        const isReturnToBase = idx === allPoints.length - 2
                        // Se a carga possui rota adicionada ativa: diferencia o trecho adicionado com traçado tracejado em tom distinto
                        const hasAddition = !!cluster.hasRouteAddition
                        const isAdditionSegment =
                          hasAddition && idx >= Math.max(1, Math.floor(allPoints.length / 2))

                        const strokeColor = isAdditionSegment ? '#f59e0b' : cluster.color.hex
                        const strokeDash = isAdditionSegment
                          ? '6,3'
                          : isReturnToBase
                            ? '5,4'
                            : 'none'
                        const strokeW = isAdditionSegment
                          ? isSelected
                            ? 3.5
                            : 2.4
                          : isSelected
                            ? 3
                            : 1.8

                        return (
                          <line
                            key={`seg-${cluster.id}-${idx}`}
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={strokeColor}
                            strokeWidth={strokeW}
                            strokeDasharray={strokeDash}
                            opacity={isSelected ? 0.95 : 0.65}
                            filter={isSelected ? 'url(#routeGlow)' : undefined}
                            className="cursor-pointer"
                            onClick={() => onSelectCluster(cluster.id)}
                          >
                            <title>
                              {isAdditionSegment
                                ? `Trecho da Rota Adicionada (+${cluster.routeAdditionData?.complementary_itinerary_code || 'Adicional'})`
                                : isReturnToBase
                                  ? 'Retorno à Origem'
                                  : `Rota Original (${cluster.code})`}
                            </title>
                          </line>
                        )
                      })}
                    </g>
                  )
                })}
            </g>

            {/* 4. Origem Canônica CIAFAL / Sidercentro (#8: Ícone industrial clean 🏭) */}
            <g className="origin-hubs-layer">
              {origins.map((hub) => {
                const pt = latLngToSvgPoint(hub.lat, hub.lng, 800, 640)
                const isSider = hub.type === 'SIDERCENTRO'

                return (
                  <g
                    key={hub.id}
                    className="cursor-pointer group"
                    onClick={() => {}}
                    onMouseEnter={(e) =>
                      setHoveredOrigin({
                        origin: hub,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHoveredOrigin(null)}
                  >
                    {/* Halo de destaque da Origem */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={16}
                      fill={isSider ? '#ea580c' : '#005596'}
                      opacity={0.15}
                      className="group-hover:opacity-30 transition"
                    />

                    {/* Base quadrada arredondada de Planta Industrial */}
                    <rect
                      x={pt.x - 11}
                      y={pt.y - 11}
                      width={22}
                      height={22}
                      rx={6}
                      fill={isSider ? '#ea580c' : '#005596'}
                      stroke="#ffffff"
                      strokeWidth={2}
                      filter="url(#markerShadow)"
                    />

                    {/* Ícone de fábrica clean no centro */}
                    <text
                      x={pt.x}
                      y={pt.y + 4}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      🏭
                    </text>

                    {/* Rótulo da Origem */}
                    <text
                      x={pt.x}
                      y={pt.y + 20}
                      fill="#0f172a"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow-xs font-mono"
                    >
                      {hub.name}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* 5. Marcadores de Clientes / Locais de Descarga (#2, #3, #7, #8, #13, #14) */}
            {layers.showClients && (
              <g className="client-stops-layer">
                {activeStopsWithValidCoords.map((stop) => {
                  const pt = latLngToSvgPoint(stop.lat, stop.lng, 800, 640)

                  // Verificação de seleção e Dimmed (#7)
                  const isBelongingToSelectedCluster =
                    selectedClusterId && stop.assignedClusterId === selectedClusterId
                  const isDimmed = selectedClusterId && !isBelongingToSelectedCluster
                  const isSelectedStop = selectedStopId === stop.id

                  // Cor semântica (#3)
                  let markerColor = UNPLANNED_COLOR.hex
                  if (stop.isPlanned && stop.assignedClusterId) {
                    markerColor = clusterColorMap.get(stop.assignedClusterId) || UNPLANNED_COLOR.hex
                  }

                  // Raio compacto do marcador (#1, #2)
                  const markerRadius = isSelectedStop ? 11 : isBelongingToSelectedCluster ? 9 : 7

                  return (
                    <g
                      key={stop.id}
                      className={`cursor-pointer group transition-opacity duration-200 ${
                        isDimmed ? 'opacity-25 hover:opacity-80' : 'opacity-100'
                      }`}
                      onClick={() => {
                        onSelectStop(stop)
                        setActivePopupStop(stop)
                        setAiAnalysisRationale(null)
                        if (stop.assignedClusterId) {
                          onSelectCluster(stop.assignedClusterId)
                        }
                      }}
                      onMouseEnter={(e) =>
                        setHoveredStop({
                          stop,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseLeave={() => setHoveredStop(null)}
                    >
                      {/* Halo de foco quando selecionado */}
                      {(isSelectedStop || isBelongingToSelectedCluster) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={markerRadius + 5}
                          fill={markerColor}
                          opacity={0.25}
                          className="animate-pulse"
                        />
                      )}

                      {/* Círculo Principal do Marcador */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={markerRadius}
                        fill={markerColor}
                        stroke="#ffffff"
                        strokeWidth={isSelectedStop ? 2.5 : 1.5}
                        filter="url(#markerShadow)"
                      />

                      {/* NÚMERO DA SEQUÊNCIA DE DESCARGA (#8: 1, 2, 3...) quando em carga */}
                      {stop.isPlanned && stop.stopSequence && (
                        <text
                          x={pt.x}
                          y={pt.y + 3.5}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="900"
                          textAnchor="middle"
                          className="pointer-events-none select-none font-mono"
                        >
                          {stop.stopSequence}
                        </text>
                      )}

                      {/* Marcador de não planejado (círculo vazio no centro) */}
                      {!stop.isPlanned && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={3}
                          fill="#ffffff"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Badge de Alerta Especial sobreposto (#14) */}
                      {layers.showLogisticAlerts && stop.alerts.length > 0 && (
                        <g transform={`translate(${pt.x + 4}, ${pt.y - 9})`}>
                          <circle
                            cx="0"
                            cy="0"
                            r="4.5"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="2.5"
                            fill="#ffffff"
                            fontSize="6"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            !
                          </text>
                        </g>
                      )}

                      {/* Rótulo compacto do Cliente se estiver com zoom ou em destaque */}
                      {(zoomLevel > 1.4 || isBelongingToSelectedCluster || isSelectedStop) && (
                        <text
                          x={pt.x}
                          y={pt.y - markerRadius - 3}
                          fill="#0f172a"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none drop-shadow-xs truncate"
                        >
                          {stop.customerName.slice(0, 14)} ({stop.totalWeightTon.toFixed(1)}t)
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )}
          </g>
        </svg>

        {/* Tooltip Hover Flutuante Rico (#2: Cliente, Cidade, Pedidos, Peso (t), Itinerário, Data solicitada) */}
        {hoveredStop && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: hoveredStop.x,
              top: hoveredStop.y,
            }}
          >
            <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 w-72 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
              {/* Cabeçalho do Cliente */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-1.5">
                <div>
                  <strong className="text-white font-bold block text-sm leading-tight">
                    {hoveredStop.stop.customerName}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Cód. SAP: {hoveredStop.stop.customerCode} • {hoveredStop.stop.city}/
                    {hoveredStop.stop.uf}
                  </span>
                </div>

                {hoveredStop.stop.isPlanned ? (
                  <Badge
                    className="text-[9px] px-1.5 py-0 font-bold"
                    style={{
                      backgroundColor:
                        clusterColorMap.get(hoveredStop.stop.assignedClusterId || '') || '#0284c7',
                      color: '#ffffff',
                    }}
                  >
                    Parada {hoveredStop.stop.stopSequence}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-400">
                    Não planejado
                  </Badge>
                )}
              </div>

              {/* Grid de Informações Chave (#2) */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-slate-800/80 p-1.5 rounded">
                  <span className="text-slate-400 text-[10px] block">Peso Consolidado:</span>
                  <strong className="text-sky-300 font-mono text-xs">
                    {hoveredStop.stop.totalWeightTon.toFixed(1)} t
                  </strong>
                </div>

                <div className="bg-slate-800/80 p-1.5 rounded">
                  <span className="text-slate-400 text-[10px] block">Qtd. Pedidos:</span>
                  <strong className="text-white font-mono text-xs">
                    {hoveredStop.stop.ordersCount} pedido(s)
                  </strong>
                </div>

                <div className="col-span-2 bg-slate-800/50 p-1.5 rounded space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Itinerário SAP:</span>
                    <strong className="text-white font-mono">
                      {hoveredStop.stop.itineraryCode}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Solicitada:</span>
                    <strong className="text-amber-300 font-mono">
                      {hoveredStop.stop.requestedDate
                        ? new Date(hoveredStop.stop.requestedDate + 'T12:00:00').toLocaleDateString(
                            'pt-BR',
                          )
                        : 'A combinar'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Alertas Ativos (#14) */}
              {hoveredStop.stop.alerts.length > 0 && (
                <div className="space-y-1 border-t border-slate-800 pt-1.5">
                  <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alertas Operacionais:
                  </div>
                  {hoveredStop.stop.alerts.map((al, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] text-rose-300 bg-rose-950/40 p-1 rounded border border-rose-800/50 flex items-center gap-1"
                    >
                      <span>⚠</span>
                      <span>{al.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[9px] text-sky-400 text-center pt-1 font-semibold border-t border-slate-800">
                Clique no ponto para abrir detalhamento e simular
              </div>
            </div>
          </div>
        )}

        {/* Tooltip de Origem */}
        {hoveredOrigin && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: hoveredOrigin.x,
              top: hoveredOrigin.y,
            }}
          >
            <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs w-60 backdrop-blur-md">
              <strong className="text-sky-400 block font-bold">
                {hoveredOrigin.origin.fullName}
              </strong>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Centro Expedidor: <strong>{hoveredOrigin.origin.plantCode}</strong> (
                {hoveredOrigin.origin.city}/{hoveredOrigin.origin.uf})
              </div>
            </div>
          </div>
        )}

        {/* Controles de Zoom Flutuantes */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-white/95 p-1 rounded-xl border border-slate-200 shadow-md backdrop-blur-md">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            className="h-7 w-7 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            title="Aproximar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            className="h-7 w-7 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            title="Afastar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetZoom}
            className="h-7 w-7 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            title="Redefinir visualização"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* POPUP / MODAL RESPONSIVO POR PARADA / CLUSTER (Passo 3) */}
        {activePopupStop && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-40 max-w-md w-[92%] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Topo do Popup com Identificação */}
            <div className="p-3 bg-[#005596] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-300" />
                <div>
                  <h4 className="text-xs font-bold leading-tight truncate max-w-[260px]">
                    {activePopupStop.customerName}
                  </h4>
                  <span className="text-[10px] text-sky-200">
                    Cód. SAP: {activePopupStop.customerCode || 'N/D'} • {activePopupStop.city}/
                    {activePopupStop.uf}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActivePopupStop(null)
                  setAiAnalysisRationale(null)
                }}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-3 text-xs max-h-[460px] overflow-y-auto">
              {/* Informações da Entrega */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Itinerário SAP:</span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activePopupStop.itineraryCode || 'S/I'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    Data Solicitada / Prevista:
                  </span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activePopupStop.requestedDate
                      ? new Date(activePopupStop.requestedDate + 'T12:00:00').toLocaleDateString(
                          'pt-BR',
                        )
                      : 'A combinar'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Toneladas Liberadas:</span>
                  <strong className="text-[#005596] font-mono text-sm font-black">
                    {activePopupStop.totalWeightTon.toFixed(2)} t
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Qtd. Pedidos / Itens:</span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activePopupStop.ordersCount} pedidos ({activePopupStop.orders.length} itens)
                  </strong>
                </div>
              </div>

              {/* Status de Estoque DP34 + Carga Proposta */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Estoque DP34:</span>
                  <Badge
                    className={
                      activePopupStop.hasStockShortage
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }
                  >
                    {activePopupStop.hasStockShortage
                      ? 'Pendente Produção'
                      : 'Disponível em Estoque'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Carga Proposta:</span>
                  <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-mono">
                    {activePopupStop.assignedClusterId
                      ? clusters.find((c) => c.id === activePopupStop.assignedClusterId)?.code ||
                        'Vinculada'
                      : 'Não Alocado'}
                  </Badge>
                </div>
              </div>

              {/* Lista dos Produtos / Materiais */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Produtos / Materiais Principais:
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-1.5">
                  {activePopupStop.orders.slice(0, 4).map((ord, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[10px] text-slate-700"
                    >
                      <span className="truncate max-w-[240px]">
                        Ped {ord.order_number}:{' '}
                        {ord.material_description || ord.material || 'Material Aço CIAFAL'}
                      </span>
                      <strong className="font-mono text-slate-900">
                        {((ord.weight_kg || 0) / 1000).toFixed(1)} t
                      </strong>
                    </div>
                  ))}
                  {activePopupStop.orders.length > 4 && (
                    <div className="text-[9px] text-slate-400 text-center italic">
                      +{activePopupStop.orders.length - 4} outros materiais
                    </div>
                  )}
                </div>
              </div>

              {/* Justificativa Explicável da IA (Passo 3) */}
              {aiAnalysisRationale && (
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Parecer da IA Logística CIAFAL</span>
                  </div>
                  <p className="text-[11px] text-purple-950 italic leading-relaxed">
                    "{aiAnalysisRationale}"
                  </p>
                  <span className="text-[9px] text-purple-600 block">
                    * A IA recomenda oportunidades operacionais e não altera transportes confirmados
                    sem autorização do operador.
                  </span>
                </div>
              )}

              {/* Ações: "Visualizar pedidos" e "Analisar consolidação" */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => {
                    setActivePopupStop(null)
                    if (onSwitchToPlannerTab) {
                      onSwitchToPlannerTab()
                    }
                  }}
                  className="flex-1 h-8 text-xs font-bold bg-[#005596] hover:bg-[#004275] text-white"
                >
                  Visualizar pedidos
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Motor de IA com justificativa explicável
                    const nearbyStops = stops.filter(
                      (s) =>
                        s.id !== activePopupStop.id &&
                        (s.city === activePopupStop.city || s.uf === activePopupStop.uf),
                    )
                    const totalConsolidationWeight =
                      activePopupStop.totalWeightTon +
                      nearbyStops.reduce((acc, s) => acc + s.totalWeightTon, 0)
                    const totalClients = 1 + nearbyStops.length

                    const rationale = `Identificados ${totalClients} clientes na região de ${activePopupStop.city}/${activePopupStop.uf}, com ${totalConsolidationWeight.toFixed(1)} t liberadas para transporte. Existe oportunidade de consolidação em uma carga, sujeita à validação da capacidade e das restrições de entrega.`
                    setAiAnalysisRationale(rationale)
                  }}
                  className="h-8 text-xs font-bold border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                  Analisar consolidação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CARD RESUMO EXECUTIVO DO ITINERÁRIO SELECIONADO (Requisito #6 & #2) */}
        {selectedItinerary && selectedItinerary !== 'ALL' && itineraryRouteInfo && (
          <div className="absolute top-14 left-4 z-20 max-w-sm w-[90%] sm:w-80 bg-white/95 backdrop-blur-md border-2 border-[#005596] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2.5 bg-[#005596] text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <Navigation className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide truncate">
                  Itinerário: {itineraryRouteInfo.itineraryCode}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveRouteModalOpen(true)}
                className="h-5 px-1.5 text-[10px] text-white hover:bg-white/20 font-semibold"
                title="Ver detalhes completos do itinerário e sequência"
              >
                Detalhar rota
              </Button>
            </div>

            <div className="p-2.5 text-xs space-y-2">
              {/* Alerta de Exceção se não puder traçar rota (#11) */}
              {!itineraryRouteInfo.hasValidRoute ? (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] leading-snug">
                  {itineraryRouteInfo.failureReason ||
                    'Não foi possível desenhar a rota deste itinerário por ausência de coordenadas válidas em um ou mais destinos.'}
                </div>
              ) : (
                <>
                  {/* Grid de Métricas Principais (ABNT: km com ponto de milhar, R$ com vírgula) */}
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Origem:</span>
                      <strong className="text-slate-900 font-semibold truncate block">
                        {itineraryRouteInfo.originHub.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Clientes / Pedidos:</span>
                      <strong className="text-slate-900 font-mono">
                        {itineraryRouteInfo.totalClientsCount} clientes •{' '}
                        {itineraryRouteInfo.totalOrdersCount} ped.
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Toneladas Liberadas:</span>
                      <strong className="text-[#005596] font-mono font-bold text-xs">
                        {itineraryRouteInfo.totalWeightTon.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Cargas Propostas:</span>
                      <strong className="text-purple-700 font-mono font-bold">
                        {itineraryRouteInfo.proposedLoadsCount} carga(s)
                      </strong>
                    </div>
                  </div>

                  {/* Destaque Consolidado: Distância Total + Pedágios Estimados (Requisitos 2 e 3) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <div className="p-2 bg-sky-50 rounded-lg border border-sky-200 text-center">
                      <span className="text-[9px] font-bold text-sky-800 uppercase block">
                        Distância Total
                      </span>
                      <strong className="text-xs font-black font-mono text-sky-950">
                        {itineraryRouteInfo.estimatedDistanceKm.toLocaleString('pt-BR')} km
                      </strong>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                        Pedágios Estimados
                      </span>
                      <strong className="text-xs font-black font-mono text-emerald-950">
                        R${' '}
                        {itineraryRouteInfo.estimatedTollBrl.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* Alerta de Inconsistência Cadastral (#11) se houver paradas com geocoding pendente */}
                  {itineraryRouteInfo.warningMessage && (
                    <div className="text-[10px] text-amber-800 bg-amber-50/80 p-1.5 rounded border border-amber-300">
                      ⚠ {itineraryRouteInfo.warningMessage}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* MODAL DETALHADO DO ITINERÁRIO E SEQUÊNCIA DE DESCARGAS (Requisitos 1, 2, 3, 8) */}
        {activeRouteModalOpen && itineraryRouteInfo && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-3.5 bg-[#005596] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-300" />
                  <div>
                    <h4 className="text-xs font-bold leading-tight">
                      Detalhamento do Itinerário: {itineraryRouteInfo.itineraryCode}
                    </h4>
                    <span className="text-[10px] text-sky-100">
                      {itineraryRouteInfo.description} • Expedição:{' '}
                      {itineraryRouteInfo.originHub.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveRouteModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto text-xs">
                {/* 4 Cards de Resumo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Distância Total
                    </span>
                    <strong className="text-xs font-black font-mono text-[#005596]">
                      {itineraryRouteInfo.estimatedDistanceKm.toLocaleString('pt-BR')} km
                    </strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Pedágios Estimados
                    </span>
                    <strong className="text-xs font-black font-mono text-emerald-800">
                      R${' '}
                      {itineraryRouteInfo.estimatedTollBrl.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Toneladas
                    </span>
                    <strong className="text-xs font-black font-mono text-slate-900">
                      {itineraryRouteInfo.totalWeightTon.toFixed(1)} t
                    </strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Destinos / Paradas
                    </span>
                    <strong className="text-xs font-black font-mono text-purple-800">
                      {itineraryRouteInfo.waypoints.length - 2 > 0
                        ? itineraryRouteInfo.waypoints.length - 2
                        : 0}{' '}
                      clientes
                    </strong>
                  </div>
                </div>

                {/* Nota Técnica sobre Pedágio e Rota Rodoviária (#3) */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1 text-[11px] text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-[#005596]" />
                    <span>Metodologia do Cálculo Rodoviário & Pedágios:</span>
                  </div>
                  <p>
                    {itineraryRouteInfo.tollFormulaDescription} (Fator sinuosidade rodoviária{' '}
                    <strong>{itineraryRouteInfo.sinuosityFactor}×</strong> sobre a distância em
                    linha reta, conforme padrão DNIT/ABNT).
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    * Natureza do valor: <strong>Cálculo Parametrizado por Regra Rodoviária</strong>{' '}
                    (suporta integração de provedor homologado em tempo real quando habilitado na
                    Central de Parâmetros).
                  </p>
                </div>

                {/* Lista Sequencial de Waypoints (#1 e #8) */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] uppercase block">
                    Sequência Prevista do Percurso:
                  </span>
                  <div className="space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white max-h-48 overflow-y-auto">
                    {itineraryRouteInfo.waypoints.map((wp) => (
                      <div
                        key={wp.index}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0 ${
                              wp.type === 'ORIGIN'
                                ? 'bg-emerald-600'
                                : wp.type === 'RETURN'
                                  ? 'bg-slate-600'
                                  : 'bg-[#005596]'
                            }`}
                          >
                            {wp.type === 'ORIGIN' ? 'O' : wp.type === 'RETURN' ? 'R' : wp.index}
                          </span>
                          <div>
                            <strong className="text-slate-900 block truncate max-w-[240px]">
                              {wp.title}
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              {wp.city}/{wp.uf}{' '}
                              {wp.weightTon > 0 ? `• ${wp.weightTon.toFixed(1)} t` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[10px] font-mono shrink-0">
                          <span className="text-slate-700 font-bold block">
                            +{wp.legDistanceKm} km ({wp.cumulativeDistanceKm} km)
                          </span>
                          <span className="text-slate-500">
                            Pedágio: R$ {wp.estimatedTollBrl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setActiveRouteModalOpen(false)}
                  className="h-7 text-xs font-bold bg-[#005596] text-white px-4"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* LEGENDA TÉRMICA DINÂMICA SEMPRE VISÍVEL NO RODAPÉ + LEGENDA DE CLUSTERS (Passo 2) */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-700 shadow-md max-w-md space-y-2">
          {/* 1. Legenda Térmica Dinâmica de 5 Faixas por Toneladas Reais */}
          <div>
            <div className="font-bold text-slate-900 uppercase text-[9px] tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Escala Térmica por Toneladas Liberadas (Cortes Reais)</span>
              </span>
              <span className="font-mono text-slate-500 text-[9px]">
                Máx: {maxHeatWeight.toFixed(1)} t
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 pt-1.5 text-center">
              <div className="bg-sky-50 border border-sky-200 p-1 rounded">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: '#38bdf8' }}
                />
                <span className="text-[8px] font-bold text-sky-900 block mt-0.5">
                  0 – {heatThresholds.t1} t
                </span>
                <span className="text-[7px] text-slate-500">0–20%</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-1 rounded">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: '#10b981' }}
                />
                <span className="text-[8px] font-bold text-emerald-900 block mt-0.5">
                  {heatThresholds.t1} – {heatThresholds.t2} t
                </span>
                <span className="text-[7px] text-slate-500">20–40%</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-1 rounded">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: '#eab308' }}
                />
                <span className="text-[8px] font-bold text-amber-900 block mt-0.5">
                  {heatThresholds.t2} – {heatThresholds.t3} t
                </span>
                <span className="text-[7px] text-slate-500">40–65%</span>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-1 rounded">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: '#f97316' }}
                />
                <span className="text-[8px] font-bold text-orange-900 block mt-0.5">
                  {heatThresholds.t3} – {heatThresholds.t4} t
                </span>
                <span className="text-[7px] text-slate-500">65–85%</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-1 rounded">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: '#ef4444' }}
                />
                <span className="text-[8px] font-bold text-rose-900 block mt-0.5">
                  {heatThresholds.t4} – {heatThresholds.t5} t
                </span>
                <span className="text-[7px] text-slate-500">85–100%</span>
              </div>
            </div>
          </div>

          {/* 2. Legenda de Clusters e Rotas */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 flex-wrap gap-2">
            <span>🏭 Origem Contagem</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Não planejado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Alerta
            </span>
            <span>1, 2, 3 = Ordem de descarga</span>
          </div>
        </div>
      </div>
    </div>
  )
}
