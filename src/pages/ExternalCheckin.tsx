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
  Search,
  ArrowRight,
  Route,
  Calendar,
  Layers,
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  isValidDocument,
  isValidPlate,
  calculateDistanceKm,
  CIAFAL_PLANT_LOCATION,
  SapItineraryEntity,
  QueueGroup,
} from '@/domain/rules'

export const ExternalCheckin: React.FC = () => {
  const { toast } = useToast()

  // Stepper: 1-GEO -> 2-PLACA -> 3-VALIDACAO/PRE-CADASTRO -> 4-CLASSIFICACAO & ITINERARIO -> 5-CONFIRMACAO
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Geolocation State
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<
    'idle' | 'requesting' | 'acquired' | 'denied' | 'unsupported' | 'error'
  >('idle')
  const [distanceCalculated, setDistanceCalculated] = useState<number | null>(null)
  const [assignedGroup, setAssignedGroup] = useState<QueueGroup>('FORA')

  // Plate & Driver Lookup State
  const [plateInput, setPlateInput] = useState('')
  const [isSearchingPlate, setIsSearchingPlate] = useState(false)
  const [plateLookupData, setPlateLookupData] = useState<{
    found: boolean
    driver?: {
      id: string
      nameMasked: string
      documentMasked: string
      phoneMasked: string
      status: string
    }
    vehicle?: {
      id: string
      plate: string
      type: string
      capacityKg?: number
    }
    rateLimited?: boolean
  } | null>(null)

  // Pre-registration & Form Fields
  const [driverName, setDriverName] = useState('')
  const [document, setDocument] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [vehicleType, setVehicleType] = useState('Carreta LS')
  const [declaredCapacityKg, setDeclaredCapacityKg] = useState<number>(28000)

  // Itinerary and Future Scheduling
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [selectedItinerary, setSelectedItinerary] = useState('')
  const [scheduledArrivalDate, setScheduledArrivalDate] = useState('')
  const [driverNotes, setDriverNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean
    message: string
    isPreReg?: boolean
    group?: QueueGroup
    calculatedLogisticsDate?: string
  } | null>(null)

  // Load SAP Itineraries on mount
  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const itins = await TmsService.getSapItineraries(true)
        setItineraries(itins)
        if (itins.length > 0) {
          setSelectedItinerary(itins[0].sap_code)
        }
      } catch (err) {
        console.error('Error fetching itineraries:', err)
      }
    }
    fetchItineraries()
  }, [])

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

        const dist = calculateDistanceKm(
          lat,
          lon,
          CIAFAL_PLANT_LOCATION.latitude,
          CIAFAL_PLANT_LOCATION.longitude,
        )
        setDistanceCalculated(dist)

        // Classify preliminary
        if (dist <= 0.5) {
          setAssignedGroup('PORTA')
        } else if (dist <= 60) {
          setAssignedGroup('FORA')
        } else {
          setAssignedGroup('PROGRAMADO')
        }
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
    requestLocation()
  }, [])

  // Step 2: Handle Plate Search
  const handleSearchPlate = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = plateInput
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .trim()

    if (!isValidPlate(clean)) {
      toast({
        title: 'Placa Inválida',
        description: 'Informe uma placa válida no formato padrão (ABC-1234) ou Mercosul (ABC1D23).',
        variant: 'destructive',
      })
      return
    }

    setIsSearchingPlate(true)
    try {
      const res = await TmsService.lookupVehicleAndDriverByPlate(clean)
      setPlateLookupData(res)

      if (res.rateLimited) {
        toast({
          title: 'Limite de Consultas Excedido',
          description: 'Muitas consultas em sequência. Aguarde 1 minuto para tentar novamente.',
          variant: 'destructive',
        })
        return
      }

      if (res.found && res.vehicle) {
        setVehicleType(res.vehicle.type || 'Carreta LS')
        if (res.vehicle.capacityKg) {
          setDeclaredCapacityKg(res.vehicle.capacityKg)
        }
      }

      // Advance to validation / pre-registration step
      setCurrentStep(3)
    } catch (err: any) {
      toast({
        title: 'Erro na Consulta',
        description: err?.message || 'Falha ao validar placa no sistema.',
        variant: 'destructive',
      })
    } finally {
      setIsSearchingPlate(false)
    }
  }

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!coords) {
      toast({
        title: 'Localização Obrigatória',
        description: 'É necessário autorizar o GPS para validar a disponibilidade.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedItinerary) {
      toast({
        title: 'Itinerário Obrigatório',
        description: 'Selecione seu itinerário de preferência na lista oficial SAP.',
        variant: 'destructive',
      })
      return
    }

    if (assignedGroup === 'PROGRAMADO' && !scheduledArrivalDate) {
      toast({
        title: 'Data Prevista Obrigatória',
        description: 'Para disponibilidade PROGRAMADA, informe a data prevista de chegada.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const res = await TmsService.submitDriverAvailability({
        plate: plateInput,
        document,
        whatsapp,
        vehicleType,
        carrierName,
        declaredCapacityKg,
        preferredItinerary: selectedItinerary,
        scheduledArrivalDate,
        driverNotes,
        latitude: coords.lat,
        longitude: coords.lon,
        accuracy: coords.accuracy,
      })

      setSubmissionResult(res)
      if (res.success) {
        setCurrentStep(5)
        toast({
          title: res.isPreReg ? 'Pré-Cadastro Registrado' : 'Disponibilidade Confirmada!',
          description: res.message,
        })
      } else {
        toast({
          title: 'Não foi possível concluir',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de Processamento',
        description: err?.message || 'Erro ao registrar disponibilidade.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-3 sm:p-6">
      <div className="max-w-lg w-full mx-auto space-y-4 pt-2">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full text-xs text-[#005596] font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-[#005596]" />
            <span>Link Público de Disponibilidade • TMS CIAFAL</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Disponibilidade de Carga
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acesso via celular para motoristas e transportadores parceiros CIAFAL.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs text-center text-[10px] font-bold uppercase">
          <div
            className={`py-1.5 rounded ${
              currentStep >= 1 ? 'bg-[#005596] text-white' : 'text-slate-400 bg-slate-50'
            }`}
          >
            1. GPS
          </div>
          <div
            className={`py-1.5 rounded ${
              currentStep >= 2 ? 'bg-[#005596] text-white' : 'text-slate-400 bg-slate-50'
            }`}
          >
            2. Placa
          </div>
          <div
            className={`py-1.5 rounded ${
              currentStep >= 3 ? 'bg-[#005596] text-white' : 'text-slate-400 bg-slate-50'
            }`}
          >
            3. Cadastro
          </div>
          <div
            className={`py-1.5 rounded ${
              currentStep >= 4 ? 'bg-[#005596] text-white' : 'text-slate-400 bg-slate-50'
            }`}
          >
            4. Rota & Fim
          </div>
        </div>

        {/* Aviso de Privacidade e LGPD */}
        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1 leading-relaxed">
          <div className="flex items-center space-x-1.5 text-[#005596] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>TERMO DE PRIVACIDADE & LGPD:</span>
          </div>
          <p>
            "Sua localização será utilizada exclusivamente para classificação de disponibilidade
            logística em relação à CIAFAL (PORTA, FORA ou PROGRAMADO)."
          </p>
        </div>

        {/* STEP 1: GEOLOCATION VALIDATION */}
        {currentStep === 1 && (
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Etapa 1: Validação de Geolocalização</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Obrigatório autorizar o GPS para verificação da distância em relação à CIAFAL.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    Status do Sensor GPS
                  </span>
                  {geoStatus === 'acquired' && distanceCalculated !== null && (
                    <Badge className="bg-emerald-600 text-white font-mono">
                      {distanceCalculated.toLocaleString('pt-BR')} km da Matriz
                    </Badge>
                  )}
                </div>

                {geoStatus === 'requesting' && (
                  <div className="text-slate-600 flex items-center space-x-2 py-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Obtendo coordenadas do satélite / celular...</span>
                  </div>
                )}

                {geoStatus === 'acquired' && coords && (
                  <div className="space-y-2 text-slate-700">
                    <div className="text-emerald-700 font-semibold">
                      ✓ Localização capturada com precisão de ±{Math.round(coords.accuracy)} m.
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="text-slate-500 text-[10px] uppercase font-bold">
                        Classificação Preliminar do Sistema:
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={
                            assignedGroup === 'PORTA'
                              ? 'bg-sky-600 text-white font-bold'
                              : assignedGroup === 'FORA'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-purple-600 text-white font-bold'
                          }
                        >
                          GRUPO: {assignedGroup}
                        </Badge>
                        <span className="text-[11px] text-slate-600">
                          {assignedGroup === 'PORTA'
                            ? 'Dentro do pátio da CIAFAL (Presença física)'
                            : assignedGroup === 'FORA'
                              ? 'Na região operacional (≤ 60 km)'
                              : 'Além de 60 km (Disponibilidade Futura)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {(geoStatus === 'denied' || geoStatus === 'error') && (
                  <div className="space-y-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      GPS Negado ou Indisponível
                    </div>
                    <p className="text-[11px]">
                      A geolocalização é obrigatória pela regra de negócios. Habilite o GPS no seu
                      navegador.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={requestLocation}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={geoStatus !== 'acquired' || !coords}
                className="w-full bg-[#005596] hover:bg-[#004275] text-white font-bold text-sm h-11 shadow-sm"
              >
                Prosseguir para Identificação da Placa
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: PLATE ENTRY & LOOKUP */}
        {currentStep === 2 && (
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
                <Truck className="w-4 h-4 text-[#005596]" />
                <span>Etapa 2: Placa do Veículo (Chave Inicial)</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                A placa consulta a base sincronizada SAP ZSD004V_V2.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSearchPlate} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Informe a Placa do Veículo / Cavalo:
                  </label>
                  <Input
                    placeholder="Ex: ABC-1234 ou ABC1D23"
                    value={plateInput}
                    onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-base font-bold tracking-wider h-11 uppercase"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Se a placa existir no SAP, seus dados mascarados serão carregados. Caso
                    contrário, você será direcionado para pré-cadastro.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-11"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSearchingPlate || !plateInput.trim()}
                    className="flex-1 bg-[#005596] hover:bg-[#004275] text-white font-bold text-sm h-11 shadow-sm"
                  >
                    {isSearchingPlate ? 'Consultando SAP...' : 'Verificar Placa'}
                    <Search className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: CONFIRMATION (FOUND) OR PRE-REGISTRATION (NOT FOUND) */}
        {currentStep === 3 && (
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {plateLookupData?.found
                    ? 'Etapa 3: Confirmação Cadastral'
                    : 'Etapa 3: Pré-Cadastro de Motorista & Veículo'}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {plateLookupData?.found
                  ? 'Placa localizada na base ativa. Confirme seus dados para prosseguir.'
                  : 'Placa não encontrada. Preencha os dados para análise da logística CIAFAL.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {plateLookupData?.found && plateLookupData.driver ? (
                // CADASTRO ENCONTRADO - APRESENTAR DADOS MASCARADOS
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Cadastro Ativo Localizado no SAP!</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                      <div>
                        <span className="text-slate-500 block font-bold">Motorista:</span>
                        <strong className="text-slate-900">
                          {plateLookupData.driver.nameMasked}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Documento:</span>
                        <strong className="text-slate-900 font-mono">
                          {plateLookupData.driver.documentMasked}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">WhatsApp Cadastrado:</span>
                        <strong className="text-slate-900 font-mono">
                          {plateLookupData.driver.phoneMasked}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Tipo do Veículo:</span>
                        <strong className="text-slate-900">
                          {plateLookupData.vehicle?.type || vehicleType}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px]">
                    Os dados acima conferem com seu veículo e condutor?
                  </p>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-10"
                    >
                      Alterar Placa
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-sm"
                    >
                      Confirmar Dados e Escolher Itinerário
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                // NÃO ENCONTRADO - FORMULÁRIO DE PRÉ-CADASTRO (PRÉ-CADASTRO NÃO É CADASTRO)
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1.5 text-amber-900">
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Placa {plateInput} não localizada no SAP</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      "PRÉ-CADASTRO NÃO É CADASTRO ATIVO". Você não receberá cargas imediatas até a
                      validação documental pela equipe da CIAFAL.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">
                        Nome Completo do Motorista:
                      </label>
                      <Input
                        placeholder="Nome completo"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="bg-white border-slate-300 text-slate-900 text-xs h-9"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">CPF ou CNPJ:</label>
                        <Input
                          placeholder="000.000.000-00"
                          value={document}
                          onChange={(e) => setDocument(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900 font-mono text-xs h-9"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">WhatsApp com DDD:</label>
                        <Input
                          placeholder="(11) 98765-4321"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900 font-mono text-xs h-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Transportadora (se houver):
                        </label>
                        <Input
                          placeholder="Autônomo ou Nome da Empresa"
                          value={carrierName}
                          onChange={(e) => setCarrierName(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900 text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">Tipo do Conjunto:</label>
                        <Select value={vehicleType} onValueChange={setVehicleType}>
                          <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-slate-900 border-slate-200">
                            <SelectItem value="Carreta LS">Carreta LS (28-32 t)</SelectItem>
                            <SelectItem value="Carreta Grade Baixa">Carreta Grade Baixa</SelectItem>
                            <SelectItem value="Bitrem">Bitrem (38 t)</SelectItem>
                            <SelectItem value="Rodotrem">Rodotrem (50 t)</SelectItem>
                            <SelectItem value="Truck">Truck (14 t)</SelectItem>
                            <SelectItem value="Toco">Toco (6 t)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">
                        Capacidade Informada (kg):
                      </label>
                      <Input
                        type="number"
                        placeholder="Ex: 28000"
                        value={declaredCapacityKg}
                        onChange={(e) => setDeclaredCapacityKg(Number(e.target.value))}
                        className="bg-white border-slate-300 text-slate-900 font-mono text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-10"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      disabled={!driverName || !document || !whatsapp}
                      className="flex-1 bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs h-10 shadow-sm"
                    >
                      Prosseguir para Escolha do Itinerário
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 4: ITINERARY SELECTION & FUTURE DATE (PROGRAMADO) */}
        {currentStep === 4 && (
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-slate-900">
                <Route className="w-4 h-4 text-[#005596]" />
                <span>Etapa 4: Itinerário de Preferência & Disponibilidade</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Selecione o itinerário oficial SAP cadastrado (lista controlada).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Itinerário Dropdown */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Itinerário de Preferência (Fonte TVROT SAP):
                </label>
                <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-10">
                    <SelectValue placeholder="Selecione o itinerário SAP" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200 max-h-60">
                    {itineraries.map((it) => (
                      <SelectItem key={it.sap_code} value={it.sap_code}>
                        <strong>{it.sap_code}</strong> — {it.description} ({it.uf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  A escolha do itinerário alimenta o Planejador de Cargas e a Matriz de
                  Disponibilidade da CIAFAL.
                </p>
              </div>

              {/* Se for PROGRAMADO ou desejar informar data futura */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#005596]" />
                    Previsão de Chegada na CIAFAL
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-[#005596] border-sky-300 bg-sky-50"
                  >
                    {assignedGroup === 'PROGRAMADO'
                      ? 'Obrigatório (> 60 km)'
                      : 'Opcional para data futura'}
                  </Badge>
                </div>

                {assignedGroup === 'PROGRAMADO' && (
                  <p className="text-[11px] text-amber-800">
                    "Informe sua previsão de disponibilidade para carregamento na CIAFAL." Como você
                    está a mais de 60 km, sua disponibilidade é classificada como PROGRAMADA
                    (capacidade futura).
                  </p>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block text-[11px]">
                    Data Prevista de Chegada:
                  </label>
                  <Input
                    type="date"
                    value={scheduledArrivalDate}
                    onChange={(e) => setScheduledArrivalDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-white border-slate-300 text-slate-900 text-xs h-9"
                  />
                </div>
              </div>

              {/* Observações Operacionais */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Observações do Motorista (Opcional):
                </label>
                <Textarea
                  placeholder="Ex: Disponível para carregar a partir das 07h, carroceria com lona nova..."
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs h-16 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-11"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 shadow-sm"
                >
                  {isSubmitting ? 'Registrando na Fila...' : 'Confirmar Disponibilidade na CIAFAL'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: FINAL CONFIRMATION RESULT */}
        {currentStep === 5 && submissionResult && (
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm animate-fade-in">
            <CardHeader className="pb-3 border-b border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900">
                {submissionResult.isPreReg
                  ? 'Pré-Cadastro Recebido pela Logística'
                  : 'Disponibilidade Registrada com Sucesso!'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Placa: <strong className="text-slate-900 font-mono">{plateInput}</strong> • Grupo:{' '}
                <strong className="text-emerald-700">{submissionResult.group}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-slate-700 font-medium">{submissionResult.message}</div>
                {submissionResult.calculatedLogisticsDate && (
                  <div className="text-[#005596] font-bold">
                    Data Logística Calculada:{' '}
                    {new Date(
                      submissionResult.calculatedLogisticsDate + 'T12:00:00',
                    ).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Próximos Passos:</div>
                <p>
                  • Acompanhe as mensagens pelo seu WhatsApp cadastrado.
                  <br />• Caso esteja classificado como PROGRAMADO, ao chegar próximo ou na portaria
                  será necessária nova validação de GPS para migração de grupo.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setCurrentStep(1)
                  setPlateInput('')
                  setSubmissionResult(null)
                  setPlateLookupData(null)
                }}
                className="w-full bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs h-10 shadow-sm"
              >
                Realizar Novo Check-in / Consulta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 py-3">
        TMS CIAFAL Logística • HUB Integrado • Versão 1.2
      </div>
    </div>
  )
}
