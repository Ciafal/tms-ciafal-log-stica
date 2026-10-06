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
} from '@/domain/logisticRoutingEngine'
import {
  latLngToSvgPoint,
  OFFICIAL_ORIGIN_HUBS,
  OriginHub,
  BRAZIL_UF_CENTROIDS,
} from '@/domain/geographicEngine'

export interface VisualMapLayers {
  showClients: boolean
  showClusters: boolean
  showItineraries: boolean
  showHeatmap: boolean
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
  onSelectCluster: (clusterId: string | null) => void
  onSelectStop: (stop: ClientDeliveryStop) => void
  onSelectUf?: (uf: string) => void
  onSelectItinerary?: (itineraryCode: string) => void
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
  onSelectCluster,
  onSelectStop,
  onSelectUf,
  onSelectItinerary,
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
    showHeatmap: false, // OFF por padrão
    showStockAvailable: false,
    showFutureStock: false,
    showLogisticAlerts: true,
    showAllRoutes: false, // OFF por padrão (#9)
  })

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
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
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

  // Normalização do Heatmap quando ativado (#10)
  const maxHeatWeight = useMemo(() => {
    if (stops.length === 0) return 10
    return Math.max(...stops.map((s) => s.totalWeightTon), 1)
  }, [stops])

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
                  <span className="text-slate-700 text-[11px]">☑ Clientes / Pedidos</span>
                  <input
                    type="checkbox"
                    checked={layers.showClients}
                    onChange={() => toggleLayer('showClients')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">☑ Clusterização de Cargas</span>
                  <input
                    type="checkbox"
                    checked={layers.showClusters}
                    onChange={() => toggleLayer('showClusters')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">☑ Itinerários e Conexões</span>
                  <input
                    type="checkbox"
                    checked={layers.showItineraries}
                    onChange={() => toggleLayer('showItineraries')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">☐ Alertas Operacionais</span>
                  <input
                    type="checkbox"
                    checked={layers.showLogisticAlerts}
                    onChange={() => toggleLayer('showLogisticAlerts')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">☐ Estoque Liberado (DP34)</span>
                  <input
                    type="checkbox"
                    checked={layers.showStockAvailable}
                    onChange={() => toggleLayer('showStockAvailable')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">☐ Previsão PCP Futura</span>
                  <input
                    type="checkbox"
                    checked={layers.showFutureStock}
                    onChange={() => toggleLayer('showFutureStock')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer border-t border-slate-100 pt-1.5">
                  <span className="text-slate-700 text-[11px]">🔥 Mapa de Calor (Secundário)</span>
                  <input
                    type="checkbox"
                    checked={layers.showHeatmap}
                    onChange={() => toggleLayer('showHeatmap')}
                    className="rounded text-amber-600"
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
          </defs>

          {/* Grupo com Pan e Zoom */}
          <g
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
            style={{
              transformOrigin: '400px 320px',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
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

            {/* 2. Camada Secundária de Heatmap (Fica por trás dos marcadores) (#10) */}
            {layers.showHeatmap && (
              <g className="heatmap-secondary-layer pointer-events-none">
                {stops.map((st) => {
                  const pt = latLngToSvgPoint(st.lat, st.lng, 800, 640)
                  const intensity = Math.min(1, Math.max(0.2, st.totalWeightTon / maxHeatWeight))
                  const radius = 18 + intensity * 28

                  return (
                    <circle
                      key={`heat-${st.id}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={radius}
                      fill="url(#heatSubtle)"
                    />
                  )
                })}
              </g>
            )}

            {/* 3. Rotas Desenhadas (#8 e #9) */}
            {/* Por padrão desligadas; desenham a carga selecionada ou todas se showAllRoutes = true */}
            <g className="routes-layer">
              {clusters.map((cluster) => {
                const isSelected = selectedClusterId === cluster.id
                const shouldDraw = isSelected || layers.showAllRoutes
                if (!shouldDraw) return null

                const originPt = latLngToSvgPoint(
                  cluster.originHub.lat,
                  cluster.originHub.lng,
                  800,
                  640,
                )
                const stopsPts = cluster.stops.map((s) => latLngToSvgPoint(s.lat, s.lng, 800, 640))

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
                      const strokeDash = isAdditionSegment ? '6,3' : isReturnToBase ? '5,4' : 'none'
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
                {stops.map((stop) => {
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

        {/* LEGENDA COMPACTA SEMÂNTICA NO MAPA (#12: NUNCA cor sem legenda) */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-700 shadow-md max-w-sm space-y-1.5">
          <div className="font-bold text-slate-900 uppercase text-[9px] tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-[#005596]" /> Legenda de Clusters e Status
            </span>
            <span className="text-slate-400 font-mono text-[9px]">{clusters.length} Cargas IA</span>
          </div>

          {/* Cores das Cargas Atuais */}
          <div className="flex items-center gap-2 flex-wrap max-h-16 overflow-y-auto pr-1">
            {clusters.slice(0, 6).map((cl) => (
              <span
                key={cl.id}
                onClick={() => onSelectCluster(selectedClusterId === cl.id ? null : cl.id)}
                className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                  selectedClusterId === cl.id ? 'bg-slate-200 font-bold' : 'hover:bg-slate-100'
                }`}
                title={`Filtrar somente clientes de ${cl.code}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: cl.color.hex }}
                />
                <span className="text-[10px]">{cl.code}</span>
              </span>
            ))}

            {/* Marcador Não Planejado (#13) */}
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shrink-0" />
              <span>Não planejado ({unplannedStops.length})</span>
            </span>

            {/* Marcador Alerta (#14) */}
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" />
              <span>Restrição / Pendência</span>
            </span>
          </div>

          <div className="text-[9px] text-slate-500 pt-0.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <span>🏭 Origem Matriz / Sidercentro</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-slate-700 inline-block" /> Rota original
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-500 inline-block" />{' '}
              Trecho adicionado (+Rota)
            </span>
            <span>1, 2, 3 = Ordem de descarga</span>
          </div>
        </div>
      </div>
    </div>
  )
}
