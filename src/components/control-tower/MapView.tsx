import React from 'react'
import {
  MapPin,
  Truck,
  Navigation,
  Layers,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UnifiedTransportItem } from '@/domain/controlTowerConsolidatedEngine'

interface MapViewProps {
  transports: UnifiedTransportItem[]
  onSelectTransport?: (item: UnifiedTransportItem) => void
}

export const MapView: React.FC<MapViewProps> = ({ transports, onSelectTransport }) => {
  // Transportes que possuem localização ou cidades
  const inTransit = transports.filter(
    (t) => t.stage === 'EM_ROTA' || t.stage === 'EM_DESCARGA' || t.lat,
  )

  return (
    <div className="space-y-4">
      {/* Container do Mapa Simulador */}
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md relative min-h-[460px] flex flex-col justify-between p-6">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#0284c7 1px, #0f172a 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Top Header Floating */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/90 backdrop-blur p-4 rounded-xl border border-slate-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#005596] rounded-lg text-white">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">Mapa Georreferenciado da Frota em Rota</h3>
              <p className="text-[11px] text-slate-400">
                Monitoramento via telemetria GPS e geocodificação Fred IA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1">
              {inTransit.length} veículos em trânsito
            </Badge>
          </div>
        </div>

        {/* Center Grid of Vehicle Nodes */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {inTransit.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700 p-6">
              Nenhum transporte em trânsito no momento para os filtros selecionados.
            </div>
          ) : (
            inTransit.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTransport && onSelectTransport(t)}
                className="bg-slate-800/90 border border-slate-700 hover:border-sky-400 p-4 rounded-xl cursor-pointer transition text-white space-y-2 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sky-400 block text-xs">
                      {t.transportNumber}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">{t.driverName}</span>
                  </div>
                  <Badge
                    className={
                      t.slaStatus === 'NORMAL'
                        ? 'bg-emerald-600 text-white text-[10px]'
                        : t.slaStatus === 'ATENCAO'
                          ? 'bg-amber-600 text-white text-[10px]'
                          : 'bg-rose-600 text-white text-[10px]'
                    }
                  >
                    {t.slaStatus}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Placa:</span>
                    <strong className="text-white font-mono">{t.vehiclePlate}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Destino:</span>
                    <span className="truncate max-w-[140px] text-right font-medium">
                      {t.destinationCity} ({t.destinationUf})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Carga:</span>
                    <strong className="text-emerald-400">
                      {t.weightTon.toLocaleString('pt-BR')} t
                    </strong>
                  </div>
                </div>

                {t.hasIntercurrence && (
                  <div className="p-2 bg-rose-950/60 border border-rose-700 rounded text-rose-300 text-[10px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="truncate">
                      {t.intercurrenceDescription || 'Alerta na rota'}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            <span>
              Integração GPS/Telemetria conectada com OpenStreetMap / Google Routing Core.
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-300">Hub CIAFAL Matriz</span>
        </div>
      </div>
    </div>
  )
}
