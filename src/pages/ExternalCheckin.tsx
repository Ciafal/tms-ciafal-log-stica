import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TmsService } from '@/services/tmsService'
import { isValidDocument, validateGeofence, CIAFAL_PLANT_LOCATION } from '@/domain/rules'
import {
  Smartphone,
  MapPin,
  Truck,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  RotateCcw,
  AlertOctagon,
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

export const ExternalCheckin: React.FC = () => {
  const { toast } = useToast()

  const [documentNumber, setDocumentNumber] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('Carreta LS 3 Eixos')

  // Geolocation State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    isPreReg?: boolean
    data?: any
  } | null>(null)

  // Request browser geolocation
  const requestLocation = () => {
    setIsGettingLocation(true)
    setGeoError(null)

    if (!navigator.geolocation) {
      setGeoError('Seu navegador não suporta geolocalização. Utilize o Google Chrome ou Safari.')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setCoords({ latitude: lat, longitude: lon })

        const check = validateGeofence(lat, lon)
        setCalculatedDistance(check.distanceKm)
        setIsGettingLocation(false)

        if (!check.isWithinRadius) {
          setGeoError(
            `Você está a ${check.distanceKm} km da CIAFAL. O limite máximo de atendimento é de 60 km.`,
          )
        }
      },
      (err) => {
        setIsGettingLocation(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Permissão de GPS negada. Por favor, autorize a localização nas configurações do seu navegador para continuar.',
          )
        } else {
          setGeoError('Não foi possível obter sua localização exata. Tente novamente.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    // Prompt location when opening page
    requestLocation()
  }, [])

  const handleDocChange = (val: string) => {
    setDocumentNumber(val.replace(/\D/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    const docValidation = isValidDocument(documentNumber)
    if (!docValidation.valid) {
      toast({
        title: 'Documento Inválido',
        description: 'Verifique os dígitos do CPF ou CNPJ informado.',
        variant: 'destructive',
      })
      return
    }

    if (!coords) {
      toast({
        title: 'Localização Obrigatória',
        description:
          'Você precisa autorizar o GPS do seu aparelho para validar a distância de até 60 km.',
        variant: 'destructive',
      })
      requestLocation()
      return
    }

    if (calculatedDistance !== null && calculatedDistance > 60) {
      toast({
        title: 'Fora do Raio Permitido',
        description: `Distância atual: ${calculatedDistance} km da CIAFAL (Máximo permitido: 60 km).`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await TmsService.submitExternalCheckin({
        document: documentNumber,
        whatsapp: whatsapp,
        plate: plate.toUpperCase(),
        vehicleType,
        type: 'FORA',
        latitude: coords.latitude,
        longitude: coords.longitude,
      })

      setResult(res)
      if (res.success) {
        toast({
          title: res.isPreReg ? 'Pré-cadastro Enviado' : 'Disponibilidade Confirmada!',
          description: res.message,
        })
      } else {
        toast({
          title: 'Não foi possível registrar',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Falha ao processar solicitação de disponibilidade.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setDocumentNumber('')
    setWhatsapp('')
    setPlate('')
    setResult(null)
    requestLocation()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans antialiased">
      {/* HEADER MOBILE EXTERNO */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            CF
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              CIAFAL Logística
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] uppercase">
                GRUPO FORA
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-400">Disponibilidade Externa • Raio de 60 km</p>
          </div>
        </div>

        <Link to="/tms/fila">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-8">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            TMS
          </Button>
        </Link>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="max-w-md mx-auto w-full my-4">
        {result ? (
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl p-5 text-center space-y-4">
            <div className="flex justify-center">
              {result.success ? (
                result.isPreReg ? (
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold">
                {result.success
                  ? result.isPreReg
                    ? 'Pré-Cadastro Recebido'
                    : 'Você Está na Fila do Grupo FORA!'
                  : 'Não Foi Possível Entrar na Fila'}
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed">{result.message}</p>
            </div>

            {result.success && !result.isPreReg && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Grupo:</span>
                  <span className="font-bold text-emerald-400">FORA (Na Região)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distância Validada:</span>
                  <span className="font-bold text-slate-200">
                    {calculatedDistance} km da Planta
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Canal de Oferta:</span>
                  <span className="font-bold text-sky-400">WhatsApp Oficial CIAFAL</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleReset}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Novo Check-in
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Informar Disponibilidade de Frete</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Seu veículo ficará visível para ofertas de frete da CIAFAL se você estiver a até 60
                km da fábrica.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* GPS Status Indicator */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  coords && (calculatedDistance === null || calculatedDistance <= 60)
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : geoError || (calculatedDistance !== null && calculatedDistance > 60)
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <div>
                    {isGettingLocation ? (
                      <span>Obtendo coordenadas do GPS...</span>
                    ) : coords ? (
                      <span>
                        GPS OK • <strong>{calculatedDistance} km</strong> da CIAFAL (≤ 60 km)
                      </span>
                    ) : (
                      <span>Localização não autorizada</span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={requestLocation}
                  disabled={isGettingLocation}
                  className="text-xs h-7 px-2 text-white hover:bg-slate-800"
                >
                  <Navigation
                    className={`w-3.5 h-3.5 ${isGettingLocation ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>

              {geoError && (
                <div className="p-2.5 bg-rose-900/30 border border-rose-700 rounded-md text-[11px] text-rose-200 leading-tight">
                  {geoError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* CPF / CNPJ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    CPF ou CNPJ (somente números)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 12345678909"
                      value={documentNumber}
                      onChange={(e) => handleDocChange(e.target.value)}
                      required
                      className="pl-9 h-10 bg-slate-950 border-slate-800 text-white text-sm font-mono"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    WhatsApp com DDD (sem +55)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="Ex: 11987654321"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      required
                      className="pl-9 h-10 bg-slate-950 border-slate-800 text-white text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Placa e Tipo */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Placa Cavalo</label>
                    <div className="relative">
                      <Truck className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="ABC1D23"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        required
                        className="pl-8 h-10 bg-slate-950 border-slate-800 text-white text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Conjunto</label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 text-white border-slate-800">
                        <SelectItem value="Carreta LS 3 Eixos">Carreta LS</SelectItem>
                        <SelectItem value="Bitrem 7 Eixos">Bitrem</SelectItem>
                        <SelectItem value="Rodotrem 9 Eixos">Rodotrem</SelectItem>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Toco">Toco</SelectItem>
                        <SelectItem value="VUC">VUC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !coords}
                  className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide shadow-md mt-2"
                >
                  {isSubmitting ? 'Verificando...' : 'CONFIRMAR DISPONIBILIDADE (FORA)'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FOOTER MOBILE */}
      <div className="max-w-md mx-auto w-full text-center text-[10px] text-slate-500">
        CIAFAL Logística • Dados protegidos e retidos conforme LGPD.
      </div>
    </div>
  )
}
