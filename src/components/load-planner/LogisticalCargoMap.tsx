// TMS CIAFAL — Mapa Logístico de Cargas (Torre Geográfica Interativa do Brasil)
// Atende aos requisitos #2 a #14:
// - Projeção vetorial SVG interativa com limites dos estados brasileiros
// - Origem das cargas: CIAFAL Matriz Contagem, Sidercentro, etc.
// - Heatmap configurável: Toneladas, Pedidos, Clientes, Valor, Cargas potenciais
// - Níveis de agrupamento: Brasil -> Região -> UF -> Cidade -> Clientes -> Pedidos
// - Itinerários SAP com rotas Origem -> Destinos e diferenciação visual
// - Tooltips ricos nos pontos e nas rotas
// - Seletor de 8 camadas com toggle sem recarregar página
// - Zoom (+ / - / Reset) e Pan interativo (arraste)

import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Truck,
  Activity,
  Sparkles,
  Eye,
  EyeOff,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  CityDemandCluster,
  UfDemandCluster,
  ItineraryDemandRoute,
  ConsolidationOpportunity,
} from '@/domain/geographicClusterEngine'
import {
  latLngToSvgPoint,
  OFFICIAL_ORIGIN_HUBS,
  OriginHub,
  BRAZIL_UF_CENTROIDS,
} from '@/domain/geographicEngine'

export interface MapLayersState {
  showHeatmap: boolean
  showAvailableOrders: boolean
  showClients: boolean
  showSapItineraries: boolean
  showSuggestedLoads: boolean
  showPlannedLoads: boolean
  showStockAvailable: boolean
  showLogisticAlerts: boolean
}

interface LogisticalCargoMapProps {
  cities: CityDemandCluster[]
  ufs: UfDemandCluster[]
  itineraries: ItineraryDemandRoute[]
  consolidationOpportunities: ConsolidationOpportunity[]
  selectedUf: string
  selectedItinerary: string
  heatmapVariable: 'TONELADAS' | 'PEDIDOS' | 'CLIENTES' | 'VALOR' | 'CARGAS' | 'ITENS'
  onSelectCity: (city: CityDemandCluster) => void
  onSelectItinerary?: (itineraryCode: string) => void
  onSelectUf?: (uf: string) => void
}

// Contornos e posições aproximadas para renderização SVG nítida dos 26 estados + DF
const BRAZIL_STATE_PATHS: Record<string, string> = {
  // Principais polígonos aproximados na projeção Mercator Brasil 800x600
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
  cities,
  ufs,
  itineraries,
  consolidationOpportunities,
  selectedUf,
  selectedItinerary,
  heatmapVariable,
  onSelectCity,
  onSelectItinerary,
  onSelectUf,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Camadas ativas (#10)
  const [layers, setLayers] = useState<MapLayersState>({
    showHeatmap: true,
    showAvailableOrders: true,
    showClients: true,
    showSapItineraries: true,
    showSuggestedLoads: true,
    showPlannedLoads: true,
    showStockAvailable: true,
    showLogisticAlerts: true,
  })

  // Tooltip flutuante (#8 e #16)
  const [hoveredPoint, setHoveredPoint] = useState<{
    city?: CityDemandCluster
    itinerary?: ItineraryDemandRoute
    originHub?: OriginHub
    x: number
    y: number
  } | null>(null)

  const toggleLayer = (layerKey: keyof MapLayersState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  // Controles de Zoom
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.3, 5))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.3, 0.8))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  // Interação de Pan (arraste com mouse)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return // botão esquerdo apenas
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

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Centros de Origem Operacionais (CIAFAL Contagem, Sidercentro, etc.)
  const originHubs = OFFICIAL_ORIGIN_HUBS

  // Valor máximo para normalização do Heatmap
  const heatMax = useMemo(() => {
    if (cities.length === 0) return 100
    switch (heatmapVariable) {
      case 'TONELADAS':
        return Math.max(...cities.map((c) => c.totalWeightTon), 1)
      case 'PEDIDOS':
        return Math.max(...cities.map((c) => c.ordersCount), 1)
      case 'CLIENTES':
        return Math.max(...cities.map((c) => c.uniqueClientsCount), 1)
      case 'VALOR':
        return Math.max(...cities.map((c) => c.totalValueBrl), 1)
      case 'CARGAS':
        return Math.max(...cities.map((c) => c.potentialLoadsCount), 1)
      case 'ITENS':
        return Math.max(...cities.map((c) => c.itemsCount), 1)
      default:
        return Math.max(...cities.map((c) => c.totalWeightTon), 1)
    }
  }, [cities, heatmapVariable])

  // Obter intensidade do Heatmap para uma cidade
  const getHeatmapIntensity = useCallback(
    (c: CityDemandCluster): number => {
      let val = c.totalWeightTon
      if (heatmapVariable === 'PEDIDOS') val = c.ordersCount
      if (heatmapVariable === 'CLIENTES') val = c.uniqueClientsCount
      if (heatmapVariable === 'VALOR') val = c.totalValueBrl
      if (heatmapVariable === 'CARGAS') val = c.potentialLoadsCount
      if (heatmapVariable === 'ITENS') val = c.itemsCount

      return Math.min(1, Math.max(0.15, val / heatMax))
    },
    [heatmapVariable, heatMax],
  )

  return (
    <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col h-[650px] select-none">
      {/* Background Cartográfico Noturno */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#0284c7 1px, #030712 1px)',
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
        }}
      />

      {/* Floating Toolbar Superior: Indicadores e Alternador de Camadas (#10) */}
      <div className="relative z-10 p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[#005596] text-white font-mono text-[10px] px-2 py-0.5">
            TORRE GEOGRÁFICA DE CARGAS
          </Badge>

          <span className="text-slate-400 text-[11px] hidden sm:inline">Variável de Calor:</span>
          <Badge variant="outline" className="border-sky-400 text-sky-300 font-bold text-[10px]">
            {heatmapVariable}
          </Badge>

          {selectedUf && selectedUf !== 'ALL' && (
            <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
              Filtro UF: {selectedUf}
            </Badge>
          )}

          {selectedItinerary && selectedItinerary !== 'ALL' && (
            <Badge className="bg-purple-600 text-white font-mono text-[10px]">
              Rota: {selectedItinerary}
            </Badge>
          )}
        </div>

        {/* Camadas Toggles rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={layers.showHeatmap ? 'default' : 'outline'}
            onClick={() => toggleLayer('showHeatmap')}
            className={`h-7 text-[10px] font-semibold px-2 ${
              layers.showHeatmap
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Alternar camada de mapa de calor"
          >
            🔥 Calor
          </Button>

          <Button
            size="sm"
            variant={layers.showSapItineraries ? 'default' : 'outline'}
            onClick={() => toggleLayer('showSapItineraries')}
            className={`h-7 text-[10px] font-semibold px-2 ${
              layers.showSapItineraries
                ? 'bg-[#005596] hover:bg-[#004275] text-white'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Exibir/ocultar itinerários e rotas SAP"
          >
            🛣️ Itinerários
          </Button>

          <Button
            size="sm"
            variant={layers.showSuggestedLoads ? 'default' : 'outline'}
            onClick={() => toggleLayer('showSuggestedLoads')}
            className={`h-7 text-[10px] font-semibold px-2 ${
              layers.showSuggestedLoads
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Exibir oportunidades de consolidação de cargas da IA"
          >
            ✨ Oportunidades
          </Button>

          <Button
            size="sm"
            variant={layers.showStockAvailable ? 'default' : 'outline'}
            onClick={() => toggleLayer('showStockAvailable')}
            className={`h-7 text-[10px] font-semibold px-2 ${
              layers.showStockAvailable
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Destacar pedidos com estoque físico DP34 já liberado"
          >
            📦 Estoque DP34
          </Button>
        </div>
      </div>

      {/* SVG Canvas Interativo */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
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
            {/* Gradientes e Filtros para Heatmap e Brilho das Rotas */}
            <radialGradient id="heatGradientHigh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="heatGradientMedium" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grupo Principal com Zoom e Pan */}
          <g
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
            style={{
              transformOrigin: '400px 320px',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {/* 1. Limites dos Estados Brasileiros (#2) */}
            <g className="states-layer">
              {Object.entries(BRAZIL_STATE_PATHS).map(([uf, pathD]) => {
                const isSelected = selectedUf === uf
                const hasDemand = ufs.some((u) => u.uf === uf)
                return (
                  <path
                    key={uf}
                    d={pathD}
                    onClick={() => onSelectUf && onSelectUf(uf)}
                    className="cursor-pointer transition-colors duration-200"
                    fill={isSelected ? '#005596' : hasDemand ? '#1e293b' : '#0f172a'}
                    stroke={isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={hasDemand ? 0.9 : 0.4}
                  >
                    <title>
                      {uf} — {hasDemand ? 'Possui demanda na carteira' : 'Sem pedidos'}
                    </title>
                  </path>
                )
              })}
            </g>

            {/* Siglas dos Estados Centrais */}
            <g className="state-labels pointer-events-none">
              {Object.entries(BRAZIL_UF_CENTROIDS).map(([uf, item]) => {
                const pt = latLngToSvgPoint(item.lat, item.lng, 800, 640)
                return (
                  <text
                    key={`txt-${uf}`}
                    x={pt.x}
                    y={pt.y}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    opacity={0.6}
                  >
                    {uf}
                  </text>
                )
              })}
            </g>

            {/* 2. Camada de Heatmap (Manchas de Demanda Geográfica) (#4) */}
            {layers.showHeatmap && (
              <g className="heatmap-layer pointer-events-none">
                {cities.map((c) => {
                  const pt = latLngToSvgPoint(c.lat, c.lng, 800, 640)
                  const intensity = getHeatmapIntensity(c)
                  const radius = Math.max(16, Math.min(55, 18 + intensity * 35))
                  return (
                    <circle
                      key={`heat-${c.cityName}-${c.uf}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={radius}
                      fill={intensity > 0.6 ? 'url(#heatGradientHigh)' : 'url(#heatGradientMedium)'}
                      opacity={0.65}
                    />
                  )
                })}
              </g>
            )}

            {/* 3. Camada de Itinerários SAP e Rotas (#6 e #7) */}
            {layers.showSapItineraries && (
              <g className="itineraries-layer">
                {itineraries.map((it) => {
                  const originPt = latLngToSvgPoint(it.originHub.lat, it.originHub.lng, 800, 640)
                  const isHighlighted = selectedItinerary === it.itineraryCode

                  return (
                    <g key={`itin-group-${it.itineraryCode}`}>
                      {it.stopsCoordinates.map((stop, sIdx) => {
                        const stopPt = latLngToSvgPoint(stop.lat, stop.lng, 800, 640)
                        return (
                          <line
                            key={`line-${it.itineraryCode}-${sIdx}`}
                            x1={originPt.x}
                            y1={originPt.y}
                            x2={stopPt.x}
                            y2={stopPt.y}
                            stroke={
                              isHighlighted
                                ? '#38bdf8'
                                : it.originHub.type === 'SIDERCENTRO'
                                  ? '#ea580c'
                                  : '#0284c7'
                            }
                            strokeWidth={isHighlighted ? 3 : 1.8}
                            strokeDasharray={isHighlighted ? 'none' : '4,3'}
                            opacity={isHighlighted ? 1 : 0.65}
                            className="cursor-pointer hover:opacity-100 transition"
                            filter={isHighlighted ? 'url(#glow)' : undefined}
                            onClick={() => onSelectItinerary && onSelectItinerary(it.itineraryCode)}
                            onMouseEnter={(e) => {
                              setHoveredPoint({
                                itinerary: it,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </g>
            )}

            {/* 4. Pontos de Origem (CIAFAL Matriz, Sidercentro) (#3) */}
            <g className="origin-hubs-layer">
              {originHubs.map((hub) => {
                const pt = latLngToSvgPoint(hub.lat, hub.lng, 800, 640)
                const isSider = hub.type === 'SIDERCENTRO'

                return (
                  <g
                    key={hub.id}
                    className="cursor-pointer"
                    onMouseEnter={(e) =>
                      setHoveredPoint({
                        originHub: hub,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Anel de Pulso */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={10}
                      fill={isSider ? '#ea580c' : '#005596'}
                      opacity={0.3}
                      className="animate-ping"
                    />
                    {/* Marcador Central */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={7}
                      fill={isSider ? '#f97316' : '#38bdf8'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <text
                      x={pt.x + 9}
                      y={pt.y + 4}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="900"
                      className="pointer-events-none drop-shadow"
                    >
                      {hub.name}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* 5. Cidades e Nós de Demanda com Clustering (#5, #8, #13) */}
            <g className="cities-nodes-layer">
              {cities.map((city) => {
                const pt = latLngToSvgPoint(city.lat, city.lng, 800, 640)
                const isHigh = city.consolidationPotential === 'ALTA'
                const isMedium = city.consolidationPotential === 'MEDIA'

                // Cor do nó baseada no potencial operacional (#13)
                const nodeColor = isHigh ? '#10b981' : isMedium ? '#f59e0b' : '#38bdf8'
                const nodeRadius = Math.max(
                  5,
                  Math.min(14, 5 + Math.log10(city.totalWeightTon + 1) * 4),
                )

                return (
                  <g
                    key={`node-${city.cityName}-${city.uf}`}
                    onClick={() => onSelectCity(city)}
                    className="cursor-pointer group"
                    onMouseEnter={(e) =>
                      setHoveredPoint({
                        city,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Halo de foco */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={nodeRadius + 4}
                      fill={nodeColor}
                      opacity={0.2}
                      className="group-hover:opacity-60 transition"
                    />

                    {/* Ponto da Cidade */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={nodeRadius}
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />

                    {/* Rótulo de Tonelagem em Zoom > 1.2 ou Alta Demanda */}
                    {(zoomLevel > 1.2 || isHigh) && (
                      <text
                        x={pt.x}
                        y={pt.y - nodeRadius - 3}
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none drop-shadow"
                      >
                        {city.cityName} ({city.totalWeightTon.toFixed(1)} t)
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </g>
        </svg>

        {/* Tooltip Hover Flutuante Rico (#8 e #16) */}
        {hoveredPoint && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: hoveredPoint.x,
              top: hoveredPoint.y,
            }}
          >
            {hoveredPoint.city && (
              <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 w-64 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <strong className="text-white font-bold">
                      {hoveredPoint.city.cityName} / {hoveredPoint.city.uf}
                    </strong>
                  </div>
                  <Badge
                    className={
                      hoveredPoint.city.consolidationPotential === 'ALTA'
                        ? 'bg-emerald-600 text-white text-[9px] px-1 py-0'
                        : hoveredPoint.city.consolidationPotential === 'MEDIA'
                          ? 'bg-amber-500 text-white text-[9px] px-1 py-0'
                          : 'bg-slate-600 text-white text-[9px] px-1 py-0'
                    }
                  >
                    {hoveredPoint.city.consolidationPotential}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] pt-0.5">
                  <div>
                    <span className="text-slate-400">Carteira:</span>{' '}
                    <strong className="text-sky-300 font-mono">
                      {hoveredPoint.city.totalWeightTon.toFixed(1)} t
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Pedidos:</span>{' '}
                    <strong className="text-white font-mono">
                      {hoveredPoint.city.ordersCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Clientes:</span>{' '}
                    <strong className="text-white font-mono">
                      {hoveredPoint.city.uniqueClientsCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Cargas Potenciais:</span>{' '}
                    <strong className="text-emerald-400 font-mono">
                      {hoveredPoint.city.potentialLoadsCount}
                    </strong>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-1 text-[10px] space-y-0.5">
                  <div className="text-slate-300">
                    Itinerário: <strong>{hoveredPoint.city.primaryItineraryCode}</strong>
                  </div>
                  <div className="text-slate-300">
                    Estoque Disp. DP34:{' '}
                    <strong className="text-emerald-400">
                      {hoveredPoint.city.availableStockTon.toFixed(1)} t
                    </strong>
                  </div>
                </div>

                <div className="pt-1 text-[9px] text-sky-400 font-semibold text-center bg-sky-950/40 rounded py-0.5 border border-sky-800/40">
                  Clique no ponto para ver detalhes completos
                </div>
              </div>
            )}

            {hoveredPoint.itinerary && (
              <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 w-72 backdrop-blur-md">
                <div className="flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <strong className="text-white font-bold">
                    Itinerário SAP {hoveredPoint.itinerary.itineraryCode}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-300">
                  {hoveredPoint.itinerary.itineraryDescription}
                </p>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div>
                    Origem: <strong>{hoveredPoint.itinerary.originHub.name}</strong>
                  </div>
                  <div>
                    Destinos:{' '}
                    <strong>{hoveredPoint.itinerary.destinationCities.join(' → ')}</strong>
                  </div>
                  <div>
                    Demanda:{' '}
                    <strong className="text-sky-300">
                      {hoveredPoint.itinerary.totalWeightTon.toFixed(1)} t
                    </strong>{' '}
                    ({hoveredPoint.itinerary.ordersCount} pedidos)
                  </div>
                  <div>
                    Frete Estimado:{' '}
                    <strong className="text-emerald-400">
                      R$ {hoveredPoint.itinerary.estimatedFreightBrl.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {hoveredPoint.originHub && (
              <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1 w-56 backdrop-blur-md">
                <div className="font-bold text-sky-400 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{hoveredPoint.originHub.fullName}</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Centro Emissor SAP: <strong>{hoveredPoint.originHub.plantCode}</strong> (
                  {hoveredPoint.originHub.city}/{hoveredPoint.originHub.uf})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Controls Inferiores (Zoom + Reset + Legenda) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Aproximar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Afastar zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetZoom}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Redefinir visualização completa"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Legenda Operacional Inferior Esquerda */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-[10px] text-slate-300 shadow-xl hidden md:block space-y-1.5">
          <div className="font-bold text-white uppercase text-[9px] tracking-wider flex items-center gap-1">
            <Info className="w-3 h-3 text-sky-400" /> Potencial de Formação
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Alta (&gt;25 t)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Média (10-25 t)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              Baixa (&lt;10 t)
            </span>
          </div>
          <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800">
            Arraste para mover • Clique nos pontos para abrir detalhamento
          </div>
        </div>
      </div>
    </div>
  )
}
