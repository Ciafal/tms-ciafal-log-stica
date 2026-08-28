import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
  Phone,
  Radio,
  FileText,
  UserCheck,
  Info,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { isValidDocument, calculateDistanceKm, CIAFAL_PLANT_LOCATION } from '@/domain/rules'

export const ExternalCheckin: React.FC = () => {
  const { toast } = useToast()

  const [document, setDocument] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('Carreta LS')

  // Geolocation State
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<
    'idle' | 'requesting' | 'acquired' | 'denied' | 'unsupported' | 'error'
  >('idle')
  const [distanceCalculated, setDistanceCalculated] = useState<number | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    isPreReg?: boolean
  } | null>(null)

  // Request browser geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('unsupported')
      return
    }

    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        const acc = position.coords.accuracy || 0

        setCoords({ lat, lon, accuracy: acc })
        setGeoStatus('acquired')

        // Pre-calculate distance for UI feedback (backend always recalculates)
        const dist = calculateDistanceKm(
          lat,
          lon,
          CIAFAL_PLANT_LOCATION.latitude,
          CIAFAL_PLANT_LOCATION.longitude,
        )
        setDistanceCalculated(dist)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied')
        } else {
          setGeoStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  }

  useEffect(() => {
    // Auto-request location on mount
    requestLocation()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanDoc = document.replace(/\D/g, '')
    const docCheck = isValidDocument(cleanDoc)

    if (!docCheck.valid) {
      toast({
        title: 'Documento Inválido',
        description: 'Informe um CPF ou CNPJ válido com dígitos verificadores corretos.',
        variant: 'destructive',
      })
      return
    }

    if (!coords) {
      toast({
        title: 'Localização Obrigatória',
        description:
          'Para registrar disponibilidade na Fila FORA, autorize o acesso ao GPS do seu dispositivo.',
        variant: 'destructive',
      })
      requestLocation()
      return
    }

    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await TmsService.submitExternalCheckin({
        document: cleanDoc,
        whatsapp,
        plate,
        vehicleType,
        type: 'FORA',
        latitude: coords.lat,
        longitude: coords.lon,
        accuracy: coords.accuracy,
      })

      setResult(response)
      if (response.success) {
        toast({
          title: response.isPreReg ? 'Pré-Cadastro Recebido' : 'Disponibilidade Registrada!',
          description: response.message,
        })
      } else {
        toast({
          title: 'Não foi possível registrar',
          description: response.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de comunicação',
        description: err?.message || 'Falha ao conectar com os servidores CIAFAL.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-md w-full mx-auto space-y-4 pt-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs text-emerald-300">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Check-in Externo • Fila FORA</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            CIAFAL Logística
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Informe sua disponibilidade de frete na região (raio de até 60 km da CIAFAL).
          </p>
        </div>

        {/* Informação Clara de Privacidade e LGPD */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>AVISO DE PRIVACIDADE & LGPD (TRANSPARÊNCIA):</span>
          </div>
          <p>
            Sua localização geográfica é coletada exclusivamente para{' '}
            <strong>verificar a elegibilidade da Fila FORA (raio máximo de 60 km)</strong> e
            calcular a distância da planta. Não é utilizada para rastreamento contínuo nem
            compartilhada com terceiros nesta fase.
          </p>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`p-4 rounded-xl border animate-fade-in text-xs ${
              result.success
                ? result.isPreReg
                  ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              {result.success ? (
                result.isPreReg ? (
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                )
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <div className="space-y-1">
                <strong className="font-bold block text-sm">
                  {result.success
                    ? result.isPreReg
                      ? 'Pré-Cadastro Enviado para Análise'
                      : 'Disponibilidade Confirmada!'
                    : 'Atenção / Incompatibilidade'}
                </strong>
                <p>{result.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Check-in Form */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl text-white">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-base font-bold text-white flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Dados do Motorista & Veículo</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Preencha os dados do condutor para validar o cadastro
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Geolocation Status Widget */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" />
                    Validação Geográfica (GPS)
                  </span>

                  {geoStatus === 'acquired' && distanceCalculated !== null && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                      {distanceCalculated} km da CIAFAL
                    </Badge>
                  )}
                </div>

                {geoStatus === 'requesting' && (
                  <div className="text-slate-400 text-xs flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Obtendo coordenadas do seu celular...</span>
                  </div>
                )}

                {geoStatus === 'acquired' && coords && (
                  <div className="text-[11px] text-emerald-400 space-y-0.5">
                    <div>
                      ✓ Coordenadas capturadas com precisão de ±{Math.round(coords.accuracy)}m.
                    </div>
                    {distanceCalculated !== null && distanceCalculated <= 60 ? (
                      <div className="text-emerald-300 font-semibold">
                        ✓ Você está dentro do raio permitido de 60 km.
                      </div>
                    ) : (
                      <div className="text-rose-400 font-semibold">
                        ⚠ Distância calculada ({distanceCalculated} km) excede o raio máximo de 60
                        km.
                      </div>
                    )}
                  </div>
                )}

                {(geoStatus === 'denied' || geoStatus === 'error') && (
                  <div className="space-y-1.5">
                    <div className="text-rose-400 text-[11px]">
                      ⚠ Acesso ao GPS negado ou indisponível.
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={requestLocation}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-white h-7"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>

              {/* Document Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">CPF ou CNPJ do Motorista:</label>
                <Input
                  placeholder="000.000.000-00"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-9"
                />
              </div>

              {/* WhatsApp Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">
                  WhatsApp com DDD (Canal de Notificação):
                </label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-9"
                />
              </div>

              {/* Vehicle Plate Input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Placa do Veículo:</label>
                  <Input
                    placeholder="ABC1D23"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-9 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Tipo do Conjunto:</label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      <SelectItem value="Carreta LS">Carreta LS</SelectItem>
                      <SelectItem value="Carreta Grade Baixa">Carreta Grade Baixa</SelectItem>
                      <SelectItem value="Bitrem">Bitrem</SelectItem>
                      <SelectItem value="Rodotrem">Rodotrem</SelectItem>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Toco">Toco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || geoStatus === 'requesting'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm h-11 mt-2 shadow-lg"
              >
                {isSubmitting ? 'Verificando Cadastro...' : 'Confirmar Disponibilidade FORA'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-500 py-4">
        TMS CIAFAL Logística • HUB Integrado • Versão 1.1 Homologação
      </div>
    </div>
  )
}
