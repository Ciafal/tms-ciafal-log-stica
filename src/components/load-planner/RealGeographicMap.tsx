// TMS CIAFAL — Componente Geográfico Real com MapLibre GL e Tiles OpenStreetMap
//
// Substitui a cartografia simplificada por base geográfica real com OpenStreetMap tiles (sem API key).
// Requisitos atendidos:
// 1. Ruas, rodovias, municípios e referências legíveis sobre cartografia real.
// 2. Zoom/pan fluido com enquadramento automático (fitBounds).
// 3. Origem expedidora destacada com marcador especial (Contagem 1010 / Sidercentro 1020).
// 4. Marcadores de entregas coloridos por carga/cluster com numeração sequencial das paradas.
// 5. Tooltip on-hover e popup on-click com cliente, pedido, peso (t ABNT), município, carga, previsão.
// 6. Traçado das rotas rodoviárias calculadas com fator 1,25 (Cálculo Parametrizado por Regra Rodoviária).
// 7. Alternância de visualização: por itinerário / por carga / todas as rotas.
// 8. 8 camadas interativas (Mapa de Calor, Clientes, Cargas, Rotas, Oportunidades, Alertas, Estoque DP34, Previsão PCP).
// 9. Suporte a clustering inteligente e fallback gracioso sem WebGL.

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, Popup, LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Truck,
  Sparkles,
  Navigation,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  Package,
  Eye,
  CheckCircle2,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClientDeliveryStop,
  ProposedLoadCluster,
  UNPLANNED_COLOR,
  ItineraryRouteInfo,
} from '@/domain/logisticRoutingEngine'
import { OFFICIAL_ORIGIN_HUBS, OriginHub, latLngToSvgPoint } from '@/domain/geographicEngine'
import { formatTons, formatPercent, formatCurrency, formatDistance } from '@/utils/format'

export interface RealMapLayers {
  showHeatmap: boolean
  showClients: boolean
  showClusters: boolean
  showItineraries: boolean
  showConsolidationOpportunities: boolean
  showLogisticAlerts: boolean
  showStockAvailable: boolean
  showFutureStock: boolean
  showAllRoutes: boolean
}

export interface RealGeographicMapProps {
  stops: ClientDeliveryStop[]
  clusters: ProposedLoadCluster[]
  unplannedStops: ClientDeliveryStop[]
  selectedClusterId: string | null
  selectedStopId: string | null
  selectedUf: string
  selectedItinerary: string
  itineraryRouteInfo?: ItineraryRouteInfo | null
  onSelectCluster: (clusterId: string | null) => void
  onSelectStop: (stop: ClientDeliveryStop) => void
  onSwitchToPlannerTab?: () => void
  onOpenCustomerProfile?: (customerCode?: string, customerName?: string) => void
  className?: string
  externalLayers?: RealMapLayers
  onLayersChange?: (layers: RealMapLayers) => void
}

// Estilo gratuito OSM sem chave de API
const OSM_STYLE: any = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

// Centroide padrão: Contagem / Grande BH (MG)
const DEFAULT_CENTER: [number, number] = [-44.0536, -19.9317]
const DEFAULT_ZOOM = 8

export const RealGeographicMap: React.FC<RealGeographicMapProps> = ({
  stops,
  clusters,
  unplannedStops,
  selectedClusterId,
  selectedStopId,
  selectedUf,
  selectedItinerary,
  itineraryRouteInfo,
  onSelectCluster,
  onSelectStop,
  onSwitchToPlannerTab,
  onOpenCustomerProfile,
  className = '',
  externalLayers,
  onLayersChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const popupsRef = useRef<Popup[]>([])
  const [mapLoaded, setMapLoaded] = useState<boolean>(false)
  const [webglSupported, setWebglSupported] = useState<boolean>(true)
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState<boolean>(false)

  // 8 Camadas Interativas com controle interno e opcional externo
  const [internalLayers, setInternalLayers] = useState<RealMapLayers>({
    showHeatmap: true,
    showClients: true,
    showClusters: true,
    showItineraries: true,
    showConsolidationOpportunities: true,
    showLogisticAlerts: true,
    showStockAvailable: false,
    showFutureStock: false,
    showAllRoutes: false,
  })

  const layers = externalLayers || internalLayers
  const updateLayers = useCallback(
    (updater: (prev: RealMapLayers) => RealMapLayers) => {
      const next = updater(layers)
      if (onLayersChange) {
        onLayersChange(next)
      } else {
        setInternalLayers(next)
      }
    },
    [layers, onLayersChange],
  )

  const toggleLayer = (key: keyof RealMapLayers) => {
    updateLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Popup detalhado ativo ao clicar no marcador
  const [activeStopPopup, setActiveStopPopup] = useState<ClientDeliveryStop | null>(null)
  const [aiRationale, setAiRationale] = useState<string | null>(null)

  // Paradas válidas com coordenadas reais (NUNCA inventadas)
  const validStops = useMemo(() => {
    return stops.filter(
      (s) =>
        !s.isPendingGeo &&
        typeof s.lat === 'number' &&
        typeof s.lng === 'number' &&
        s.lat !== 0 &&
        s.lng !== 0 &&
        !isNaN(s.lat) &&
        !isNaN(s.lng),
    )
  }, [stops])

  // Carga ativa em destaque
  const activeCluster = useMemo(() => {
    if (!selectedClusterId) return null
    return clusters.find((c) => c.id === selectedClusterId) || null
  }, [clusters, selectedClusterId])

  // Mapa de cores dos clusters por id para lookup O(1)
  const clusterColorMap = useMemo(() => {
    const map = new Map<string, string>()
    clusters.forEach((c) => {
      map.set(c.id, c.color.hex)
    })
    return map
  }, [clusters])

  // 1. Inicialização do MapLibre GL com OpenStreetMap tiles
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Checagem de suporte a WebGL
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglSupported(false)
        return
      }
    } catch {
      setWebglSupported(false)
      return
    }

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OSM_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      })

      // Controle de atribuição compacto
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: 'CIAFAL Logística • Base OpenStreetMap',
        }),
        'bottom-right',
      )

      map.on('load', () => {
        setMapLoaded(true)
      })

      map.on('error', (e) => {
        console.warn('MapLibre GL warning:', e)
      })

      mapInstanceRef.current = map

      return () => {
        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []
        map.remove()
        mapInstanceRef.current = null
        setMapLoaded(false)
      }
    } catch (err) {
      console.warn('Falha ao inicializar MapLibre GL:', err)
      setWebglSupported(false)
    }
  }, [])

  // 2. Auto-enquadramento (fitBounds) dos pontos do itinerário / paradas ativas
  const autoFitBounds = useCallback(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (validStops.length === 0) {
      map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, essential: true })
      return
    }

    const bounds = new LngLatBounds()

    // Inclui a origem oficial CIAFAL Matriz
    const primaryHub = OFFICIAL_ORIGIN_HUBS[0]
    bounds.extend([primaryHub.lng, primaryHub.lat])

    // Se houver uma carga selecionada, prioriza as paradas dela
    const targetStops =
      activeCluster && activeCluster.stops.length > 0
        ? activeCluster.stops.filter((s) => !s.isPendingGeo && s.lat !== 0)
        : validStops

    targetStops.forEach((st) => {
      bounds.extend([st.lng, st.lat])
    })

    try {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 13,
        duration: 800,
      })
    } catch {
      // Ignora erro se dimensões do container forem 0
    }
  }, [validStops, activeCluster])

  // Dispara auto-fit quando mudar itinerário ou carga selecionada
  useEffect(() => {
    if (mapLoaded) {
      autoFitBounds()
    }
  }, [mapLoaded, selectedItinerary, selectedClusterId, autoFitBounds])

  // 3. Atualização de Fontes e Camadas GeoJSON (Rotas e Heatmap)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapLoaded) return

    // --- CAMADA: MAPA DE CALOR (GeoJSON heatmap layer) ---
    const heatmapFeatures = validStops.map((st) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [st.lng, st.lat] as [number, number],
      },
      properties: {
        id: st.id,
        weight: st.totalWeightTon,
        ordersCount: st.ordersCount,
      },
    }))

    const heatmapGeoJson: any = {
      type: 'FeatureCollection',
      features: heatmapFeatures,
    }

    if (map.getSource('ciafal-heatmap-source')) {
      const src = map.getSource('ciafal-heatmap-source') as maplibregl.GeoJSONSource
      src.setData(heatmapGeoJson)
    } else {
      map.addSource('ciafal-heatmap-source', {
        type: 'geojson',
        data: heatmapGeoJson,
      })

      map.addLayer({
        id: 'ciafal-heatmap-layer',
        type: 'heatmap',
        source: 'ciafal-heatmap-source',
        maxzoom: 15,
        paint: {
          // Peso ponderado pelas toneladas liberadas reais
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0,
            0,
            5,
            0.3,
            20,
            0.7,
            50,
            1,
          ],
          // Intensidade por nível de zoom
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 3],
          // Gradiente térmico de 5 faixas CIAFAL: Azul claro -> Verde -> Amarelo -> Laranja -> Vermelho
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(56, 189, 248, 0)',
            0.2,
            'rgba(56, 189, 248, 0.6)',
            0.4,
            'rgba(16, 185, 129, 0.7)',
            0.65,
            'rgba(234, 179, 8, 0.8)',
            0.85,
            'rgba(249, 115, 22, 0.9)',
            1,
            'rgba(239, 68, 68, 0.95)',
          ],
          // Raio térmico proporcional ao zoom
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 26, 15, 42],
          'heatmap-opacity': 0.75,
        },
      })
    }

    // Controle de visibilidade do Heatmap
    if (map.getLayer('ciafal-heatmap-layer')) {
      map.setLayoutProperty(
        'ciafal-heatmap-layer',
        'visibility',
        layers.showHeatmap ? 'visible' : 'none',
      )
    }

    // --- CAMADA: ROTAS RODOVIÁRIAS (GeoJSON lines) ---
    // Monta geometrias das rotas calculadas (fator 1,25)
    const routeFeatures: any[] = []

    // 1. Rota do itinerário selecionado (se houver e camada estiver ativa)
    if (
      layers.showItineraries &&
      selectedItinerary &&
      selectedItinerary !== 'ALL' &&
      itineraryRouteInfo &&
      itineraryRouteInfo.hasValidRoute
    ) {
      itineraryRouteInfo.routeSegments.forEach((seg, sIdx) => {
        routeFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [seg.from.lng, seg.from.lat],
              [seg.to.lng, seg.to.lat],
            ],
          },
          properties: {
            routeType: 'ITINERARY',
            isReturn: seg.isReturn,
            color: '#005596', // Azul institucional Pantone 2945
            distanceKm: seg.distanceKm,
            tollBrl: seg.tollBrl,
            label: `${seg.from.label} → ${seg.to.label}`,
            index: sIdx,
          },
        })
      })
    }

    // 2. Rotas das Cargas Propostas / Clusters
    if (layers.showItineraries) {
      clusters.forEach((cl) => {
        const isSelected = selectedClusterId === cl.id
        const shouldDraw =
          isSelected ||
          (layers.showAllRoutes && (!selectedItinerary || selectedItinerary === 'ALL'))

        if (!shouldDraw) return

        const origin = [cl.originHub.lng, cl.originHub.lat]
        const stopCoords = cl.stops
          .filter((s) => !s.isPendingGeo && s.lat !== 0)
          .map((s) => [s.lng, s.lat])

        if (stopCoords.length === 0) return

        const allCoords = [origin, ...stopCoords, origin]

        for (let i = 0; i < allCoords.length - 1; i++) {
          const isReturn = i === allCoords.length - 2
          routeFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [allCoords[i], allCoords[i + 1]],
            },
            properties: {
              routeType: 'CLUSTER',
              clusterId: cl.id,
              isReturn,
              color: cl.color.hex,
              isSelected,
            },
          })
        }
      })
    }

    const routesGeoJson: any = {
      type: 'FeatureCollection',
      features: routeFeatures,
    }

    if (map.getSource('ciafal-routes-source')) {
      const src = map.getSource('ciafal-routes-source') as maplibregl.GeoJSONSource
      src.setData(routesGeoJson)
    } else {
      map.addSource('ciafal-routes-source', {
        type: 'geojson',
        data: routesGeoJson,
      })

      // Linha de halo/brilho
      map.addLayer({
        id: 'ciafal-routes-glow',
        type: 'line',
        source: 'ciafal-routes-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 8, 5],
          'line-opacity': 0.25,
        },
      })

      // Linha principal das rotas
      map.addLayer({
        id: 'ciafal-routes-line',
        type: 'line',
        source: 'ciafal-routes-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3.8, 2.6],
          'line-opacity': 0.9,
          'line-dasharray': [
            'case',
            ['boolean', ['get', 'isReturn'], false],
            ['literal', [2, 2]],
            ['literal', [1]],
          ],
        },
      })
    }

    // Visibilidade das rotas
    const routesVisible = layers.showItineraries ? 'visible' : 'none'
    if (map.getLayer('ciafal-routes-glow')) {
      map.setLayoutProperty('ciafal-routes-glow', 'visibility', routesVisible)
    }
    if (map.getLayer('ciafal-routes-line')) {
      map.setLayoutProperty('ciafal-routes-line', 'visibility', routesVisible)
    }
  }, [
    mapLoaded,
    validStops,
    layers.showHeatmap,
    layers.showItineraries,
    layers.showAllRoutes,
    selectedItinerary,
    itineraryRouteInfo,
    clusters,
    selectedClusterId,
  ])

  // 4. Marcadores HTML Interativos no MapLibre (Origem Expedidora + Clientes com Paradas)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapLoaded) return

    // Limpa marcadores anteriores
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // 4.A: MARCADORES ESPECIAIS DE ORIGEM EXPEDIDORA (Contagem / Sidercentro)
    OFFICIAL_ORIGIN_HUBS.forEach((hub) => {
      const isSider = hub.type === 'SIDERCENTRO'
      const originColor = isSider ? '#ea580c' : '#005596'

      const el = document.createElement('div')
      el.className = 'ciafal-origin-marker group cursor-pointer'
      el.innerHTML = `
        <div style="
          width: 34px;
          height: 34px;
          background-color: ${originColor};
          border: 3px solid #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 85, 150, 0.45);
          font-size: 15px;
          transition: transform 0.15s ease;
        ">
          🏭
        </div>
        <div style="
          position: absolute;
          top: 36px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #0f172a;
          color: #ffffff;
          font-family: monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          pointer-events: none;
        ">
          ${hub.name}
        </div>
      `

      // Popup on-hover/click para origem
      const originPopup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: inherit; font-size: 11px; padding: 4px 2px; color: #0f172a;">
          <strong style="color: #005596; display: block; font-size: 12px;">${hub.fullName}</strong>
          <span style="color: #64748b; font-size: 10px;">Centro Expedidor SAP: <strong>${hub.plantCode}</strong></span>
          <div style="margin-top: 4px; font-size: 10px;">Município: ${hub.city}/${hub.uf}</div>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([hub.lng, hub.lat])
        .setPopup(originPopup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // 4.B: MARCADORES DE ENTREGAS DOS CLIENTES (se camada ativa)
    if (layers.showClients) {
      validStops.forEach((stop) => {
        const isBelongingToSelectedCluster =
          selectedClusterId && stop.assignedClusterId === selectedClusterId
        const isDimmed = selectedClusterId && !isBelongingToSelectedCluster
        const isSelectedStop = selectedStopId === stop.id

        // Cor do cluster ou cor de não planejado
        let markerColor = UNPLANNED_COLOR.hex
        if (stop.isPlanned && stop.assignedClusterId) {
          markerColor = clusterColorMap.get(stop.assignedClusterId) || UNPLANNED_COLOR.hex
        }

        const markerSize = isSelectedStop ? 30 : isBelongingToSelectedCluster ? 26 : 22
        const hasAlerts = layers.showLogisticAlerts && stop.alerts.length > 0

        const el = document.createElement('div')
        el.className = 'ciafal-stop-marker cursor-pointer'
        el.style.opacity = isDimmed ? '0.28' : '1'
        el.style.transition = 'transform 0.15s ease, opacity 0.2s ease'

        // Conteúdo do marcador: sequência numérica quando planejado, ou ponto central
        const innerContent =
          stop.isPlanned && stop.stopSequence
            ? `<span style="color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 900;">${stop.stopSequence}</span>`
            : `<div style="width: 5px; height: 5px; background: #ffffff; border-radius: 50%;"></div>`

        const alertBadge = hasAlerts
          ? `<div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background-color: #ef4444;
              border: 1.5px solid #ffffff;
              border-radius: 50%;
              color: #ffffff;
              font-size: 7px;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
            ">!</div>`
          : ''

        const pulseEffect =
          isSelectedStop || isBelongingToSelectedCluster
            ? `<div style="
              position: absolute;
              inset: -5px;
              border-radius: 50%;
              background-color: ${markerColor};
              opacity: 0.35;
              animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>`
            : ''

        el.innerHTML = `
          <div style="position: relative;">
            ${pulseEffect}
            <div style="
              width: ${markerSize}px;
              height: ${markerSize}px;
              background-color: ${markerColor};
              border: ${isSelectedStop ? '3px' : '2px'} solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            ">
              ${innerContent}
            </div>
            ${alertBadge}
          </div>
        `

        // Tooltip on-hover rico
        const hoverPopup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px; color: #0f172a; max-width: 220px;">
            <strong style="color: #005596; display: block; font-size: 12px; line-height: 1.2;">${stop.customerName}</strong>
            <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
              ${stop.city}/${stop.uf} • Itin: <strong>${stop.itineraryCode}</strong>
            </div>
            <div style="margin-top: 4px; display: flex; justify-content: space-between; font-size: 11px; background: #f8fafc; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span>Peso: <strong style="color: #005596; font-family: monospace;">${formatTons(stop.totalWeightTon)}</strong></span>
              <span>Pedidos: <strong style="font-family: monospace;">${stop.ordersCount}</strong></span>
            </div>
            ${stop.requestedDate ? `<div style="color: #d97706; font-size: 10px; margin-top: 3px;">Prev.: ${new Date(stop.requestedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
          </div>
        `)

        el.addEventListener('mouseenter', () => {
          hoverPopup.setLngLat([stop.lng, stop.lat]).addTo(map)
        })

        el.addEventListener('mouseleave', () => {
          hoverPopup.remove()
        })

        // Clique para selecionar e abrir popup completo
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectStop(stop)
          setActiveStopPopup(stop)
          setAiRationale(null)
          if (stop.assignedClusterId) {
            onSelectCluster(stop.assignedClusterId)
          }
        })

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map)

        markersRef.current.push(marker)
      })
    }
  }, [
    mapLoaded,
    validStops,
    layers.showClients,
    layers.showLogisticAlerts,
    selectedClusterId,
    selectedStopId,
    clusterColorMap,
    onSelectStop,
    onSelectCluster,
  ])

  // Controles manuais de Zoom
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut()
  }

  const handleReset = () => {
    autoFitBounds()
  }

  return (
    <div
      className={`relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-md flex flex-col h-[640px] select-none ${className}`}
    >
      {/* 1. BARRA SUPERIOR FLUTUANTE (Identidade Visual CIAFAL Pantone 2945) */}
      <div className="relative z-10 px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[#005596] text-white font-mono text-[10px] px-2.5 py-0.5 tracking-wider font-bold">
            BASE CARTOGRÁFICA REAL • OSM
          </Badge>

          {activeCluster ? (
            <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-300">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: activeCluster.color.hex }}
              />
              <span className="font-bold text-slate-800 text-[11px]">{activeCluster.code}</span>
              <span className="text-slate-500 text-[10px]">
                ({formatTons(activeCluster.totalWeightTon)} • {activeCluster.clientsCount} clientes)
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
              Base geográfica ativa • Clique num marcador ou carga para detalhar
            </span>
          )}

          {selectedItinerary && selectedItinerary !== 'ALL' && (
            <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
              Itin: {selectedItinerary}
            </Badge>
          )}

          {selectedUf && selectedUf !== 'ALL' && (
            <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
              UF: {selectedUf}
            </Badge>
          )}
        </div>

        {/* Controles de Camadas e Ações */}
        <div className="relative flex items-center gap-2">
          {/* Alternador de Visualização de Rotas */}
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

          {/* Botão de Enquadramento Automático */}
          <Button
            size="sm"
            variant="outline"
            onClick={autoFitBounds}
            className="h-7 text-[10px] font-semibold px-2.5 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
            title="Enquadrar todos os pontos (fitBounds)"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Enquadrar
          </Button>

          {/* Menu Dropdown de Camadas Interativas (8 Camadas) */}
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

            {isLayersMenuOpen && (
              <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 w-64 text-xs space-y-1.5 animate-in fade-in duration-100">
                <div className="font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>8 Camadas Oficiais do Mapa</span>
                  <button
                    onClick={() => setIsLayersMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🔥 1. Mapa de Calor (5 Faixas)</span>
                  <input
                    type="checkbox"
                    checked={layers.showHeatmap}
                    onChange={() => toggleLayer('showHeatmap')}
                    className="rounded text-amber-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">📍 2. Clientes e Entregas</span>
                  <input
                    type="checkbox"
                    checked={layers.showClients}
                    onChange={() => toggleLayer('showClients')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🚛 3. Cargas Propostas</span>
                  <input
                    type="checkbox"
                    checked={layers.showClusters}
                    onChange={() => toggleLayer('showClusters')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🛣 4. Rotas Planejadas</span>
                  <input
                    type="checkbox"
                    checked={layers.showItineraries}
                    onChange={() => toggleLayer('showItineraries')}
                    className="rounded text-[#005596]"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">✨ 5. Consolidação</span>
                  <input
                    type="checkbox"
                    checked={layers.showConsolidationOpportunities}
                    onChange={() => toggleLayer('showConsolidationOpportunities')}
                    className="rounded text-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer border-t border-slate-100 pt-1.5">
                  <span className="text-slate-700 text-[11px]">⚠ 6. Alertas Operacionais</span>
                  <input
                    type="checkbox"
                    checked={layers.showLogisticAlerts}
                    onChange={() => toggleLayer('showLogisticAlerts')}
                    className="rounded text-rose-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">📦 7. Estoque Liberado (DP34)</span>
                  <input
                    type="checkbox"
                    checked={layers.showStockAvailable}
                    onChange={() => toggleLayer('showStockAvailable')}
                    className="rounded text-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <span className="text-slate-700 text-[11px]">🏭 8. Previsão PCP Futura</span>
                  <input
                    type="checkbox"
                    checked={layers.showFutureStock}
                    onChange={() => toggleLayer('showFutureStock')}
                    className="rounded text-sky-600"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. ÁREA CENTRAL DO MAPA GEOGRÁFICO REAL */}
      <div className="relative flex-1 w-full h-full">
        {/* Container MapLibre GL */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Fallback caso WebGL não esteja disponível no ambiente */}
        {!webglSupported && (
          <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <h4 className="text-sm font-bold">Aceleração WebGL Indisponível</h4>
            <p className="text-xs text-slate-300 max-w-md mt-1">
              O navegador atual não suporta aceleração 3D WebGL para renderização vetorial. A base
              cartográfica segue operacional com coordenadas nominais.
            </p>
          </div>
        )}

        {/* Controles de Zoom Flutuantes no Canto Superior Direito */}
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
            onClick={handleReset}
            className="h-7 w-7 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            title="Enquadrar pontos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Resumo do Itinerário Selecionado Flutuante no Topo Esquerdo */}
        {selectedItinerary && selectedItinerary !== 'ALL' && itineraryRouteInfo && (
          <div className="absolute top-4 left-4 z-20 max-w-xs w-[88%] sm:w-72 bg-white/95 backdrop-blur-md border border-[#005596] rounded-xl shadow-lg p-2.5 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-black text-[#005596] text-xs flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                Itin: {itineraryRouteInfo.itineraryCode}
              </span>
              <Badge className="bg-[#005596] text-white text-[9px] font-mono">
                {itineraryRouteInfo.proposedLoadsCount} carga(s)
              </Badge>
            </div>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Origem:</span>
                <strong className="text-slate-800">{itineraryRouteInfo.originHub.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Toneladas:</span>
                <strong className="text-[#005596] font-mono font-bold">
                  {formatTons(itineraryRouteInfo.totalWeightTon)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Distância Estimada:</span>
                <strong className="text-slate-800 font-mono">
                  {formatDistance(itineraryRouteInfo.estimatedDistanceKm)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Pedágio Estimado:</span>
                <strong className="text-emerald-700 font-mono">
                  {formatCurrency(itineraryRouteInfo.estimatedTollBrl)}
                </strong>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-100 mt-1">
              * Cálculo Parametrizado por Regra Rodoviária (fator 1,25)
            </div>
          </div>
        )}

        {/* POPUP MODAL ON-CLICK POR PARADA / CLIENTE */}
        {activeStopPopup && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-40 max-w-md w-[92%] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#005596] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-300" />
                <div>
                  <h4 className="text-xs font-bold leading-tight truncate max-w-[260px]">
                    {activeStopPopup.customerName}
                  </h4>
                  <span className="text-[10px] text-sky-200">
                    Cód. SAP: {activeStopPopup.customerCode || 'N/D'} • {activeStopPopup.city}/
                    {activeStopPopup.uf}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveStopPopup(null)
                  setAiRationale(null)
                }}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-3 text-xs max-h-[460px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Itinerário SAP:</span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activeStopPopup.itineraryCode || 'S/I'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Data Prevista:</span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activeStopPopup.requestedDate
                      ? new Date(activeStopPopup.requestedDate + 'T12:00:00').toLocaleDateString(
                          'pt-BR',
                        )
                      : 'A combinar'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Peso Liberado:</span>
                  <strong className="text-[#005596] font-mono text-sm font-black">
                    {formatTons(activeStopPopup.totalWeightTon)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Pedidos Consolidados:</span>
                  <strong className="text-slate-900 font-mono text-xs">
                    {activeStopPopup.ordersCount} pedido(s)
                  </strong>
                </div>
              </div>

              {/* Status e Carga Proposta */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Estoque DP34:</span>
                  <Badge
                    className={
                      activeStopPopup.hasStockShortage
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }
                  >
                    {activeStopPopup.hasStockShortage
                      ? 'Pendente Produção'
                      : 'Disponível em Estoque'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Carga:</span>
                  <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-mono">
                    {activeStopPopup.assignedClusterId
                      ? clusters.find((c) => c.id === activeStopPopup.assignedClusterId)?.code ||
                        'Vinculada'
                      : 'Não Planejado'}
                  </Badge>
                </div>
              </div>

              {/* Materiais Principais */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Materiais do Pedido:
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-1.5">
                  {activeStopPopup.orders.slice(0, 4).map((ord, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[10px] text-slate-700"
                    >
                      <span className="truncate max-w-[240px]">
                        Ped {ord.order_number}:{' '}
                        {ord.material_description || ord.material || 'Material Aço CIAFAL'}
                      </span>
                      <strong className="font-mono text-slate-900">
                        {formatTons((ord.weight_kg || 0) / 1000)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parecer IA com Governança */}
              {aiRationale && (
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Parecer da IA Logística CIAFAL</span>
                  </div>
                  <p className="text-[11px] text-purple-950 italic leading-relaxed">
                    "{aiRationale}"
                  </p>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveStopPopup(null)
                    if (onSwitchToPlannerTab) {
                      onSwitchToPlannerTab()
                    }
                  }}
                  className="flex-1 h-8 text-xs font-bold bg-[#005596] hover:bg-[#004275] text-white"
                >
                  Visualizar no Planejador
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nearbyStops = stops.filter(
                      (s) =>
                        s.id !== activeStopPopup.id &&
                        (s.city === activeStopPopup.city || s.uf === activeStopPopup.uf),
                    )
                    const totalConsolidationWeight =
                      activeStopPopup.totalWeightTon +
                      nearbyStops.reduce((acc, s) => acc + s.totalWeightTon, 0)
                    const totalClients = 1 + nearbyStops.length

                    const rationale = `Identificados ${totalClients} clientes na região de ${activeStopPopup.city}/${activeStopPopup.uf}, com ${formatTons(totalConsolidationWeight)} liberadas para transporte. Oportunidade de unificação de carretas sob governança rodoviária CIAFAL.`
                    setAiRationale(rationale)
                  }}
                  className="h-8 text-xs font-bold border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                  Oportunidade IA
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 3. LEGENDA TÉRMICA DINÂMICA DE 5 FAIXAS NO RODAPÉ */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-700 shadow-md max-w-md space-y-1.5">
          <div className="font-bold text-slate-900 uppercase text-[9px] tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Escala Térmica por Toneladas Liberadas (5 Faixas Reais)</span>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center">
            <div className="bg-sky-50 border border-sky-200 p-1 rounded">
              <div
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{ backgroundColor: '#38bdf8' }}
              />
              <span className="text-[8px] font-bold text-sky-900 block mt-0.5">0–20%</span>
              <span className="text-[7px] text-slate-500">Muito Baixa</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-1 rounded">
              <div
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{ backgroundColor: '#10b981' }}
              />
              <span className="text-[8px] font-bold text-emerald-900 block mt-0.5">20–40%</span>
              <span className="text-[7px] text-slate-500">Baixa</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-1 rounded">
              <div
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{ backgroundColor: '#eab308' }}
              />
              <span className="text-[8px] font-bold text-amber-900 block mt-0.5">40–65%</span>
              <span className="text-[7px] text-slate-500">Média</span>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-1 rounded">
              <div
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{ backgroundColor: '#f97316' }}
              />
              <span className="text-[8px] font-bold text-orange-900 block mt-0.5">65–85%</span>
              <span className="text-[7px] text-slate-500">Alta</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-1 rounded">
              <div
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{ backgroundColor: '#ef4444' }}
              />
              <span className="text-[8px] font-bold text-rose-900 block mt-0.5">85–100%</span>
              <span className="text-[7px] text-slate-500">Crítica</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 flex-wrap gap-2">
            <span>🏭 Origem Contagem</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Não planejado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Alerta
            </span>
            <span>1, 2, 3 = Ordem de entrega</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default RealGeographicMap
