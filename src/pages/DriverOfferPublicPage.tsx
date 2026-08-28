import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { TmsService, PlateLookupResult } from '@/services/tmsService'
import {
  FreightOfferEntity,
  FreightProposalEntity,
  formatPlate,
  isValidPlate,
} from '@/domain/rules'
import {
  BadgeDollarSign,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building,
  MapPin,
  Scale,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Timer,
  Check,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import ciafalLogo from '@/assets/logo-ciafal-0e4b2.png'

export const DriverOfferPublicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const [offer, setOffer] = useState<FreightOfferEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Driver identification form
  const [plateInput, setPlateInput] = useState('')
  const [driverLookup, setDriverLookup] = useState<PlateLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  // Proposal form
  const [proposedValue, setProposedValue] = useState<string>('')
  const [arrivalTime, setArrivalTime] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean
    message: string
    immediateContract?: boolean
    rejected?: boolean
    reason?: string
  } | null>(null)

  // Timer ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadOffer = useCallback(async () => {
    if (!id) return
    try {
      const data = await TmsService.getFreightOfferById(id)
      setOffer(data)
      if (data && (data.floor_value || data.floor_price)) {
        // Default proposal starts at floor price
        setProposedValue(String(data.floor_value || data.floor_price || ''))
      }
    } catch (err) {
      console.error('Error loading offer:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOffer()
  }, [loadOffer])

  // Lookup Driver and Vehicle by Plate
  const handleLookupPlate = async () => {
    const clean = plateInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!isValidPlate(clean)) {
      setLookupError('Placa inválida. Digite no formato ABC-1234 ou Mercosul ABC1D23.')
      return
    }

    setLookupLoading(true)
    setLookupError('')
    try {
      const result = await TmsService.lookupVehicleAndDriverByPlate(clean)
      if (result.found && result.driver) {
        setDriverLookup(result)
      } else {
        setLookupError(
          'Placa não localizada no cadastro ativo da CIAFAL. Faça check-in na Fila antes de submeter proposta.',
        )
      }
    } catch {
      setLookupError('Falha ao consultar cadastro do motorista.')
    } finally {
      setLookupLoading(false)
    }
  }

  // Submit Proposal
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offer || !driverLookup?.driver?.id) return

    const numVal = parseFloat(proposedValue)
    if (isNaN(numVal) || numVal <= 0) {
      alert('Informe um valor de proposta válido em Reais (R$).')
      return
    }

    setSubmitting(true)
    setSubmissionResult(null)

    try {
      const res = await TmsService.submitProposal({
        driverId: driverLookup.driver.id,
        offerId: offer.id,
        value: numVal,
        arrivalTime: arrivalTime || undefined,
      })

      setSubmissionResult(res)
      if (res.immediateContract || res.success) {
        loadOffer()
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err?.message || 'Erro ao submeter proposta.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Remaining time
  const formatTimeRemaining = () => {
    if (!offer?.window_end) return '00:00'
    const end = new Date(offer.window_end).getTime()
    const diffMs = end - currentTime
    if (diffMs <= 0) return 'Janela Expirada'
    const totalSec = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const isPorta =
    offer?.current_group === 'PORTA' ||
    offer?.status === 'PORTA_OPEN' ||
    offer?.status === 'janela_porta_aberta'
  const isFora =
    offer?.current_group === 'FORA' ||
    offer?.status === 'FORA_OPEN' ||
    offer?.status === 'janela_fora_aberta'
  const isContracted = offer?.status === 'CONTRACTED' || offer?.status === 'atribuido'
  const isClosed = isContracted || offer?.status === 'NO_CONTRACT' || offer?.status === 'CANCELLED'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-sm w-full space-y-3">
          <div className="w-10 h-10 border-4 border-[#005596] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Carregando detalhes da oferta...</p>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-black text-slate-900">Oferta não Encontrada</h2>
            <p className="text-xs text-slate-600">
              O código de oferta informado não foi localizado ou foi encerrado.
            </p>
            <Link to="/tms/fila-publica">
              <Button className="bg-[#005596] text-white text-xs">Acessar Check-in de Fila</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Header Mobile / Public */}
      <header className="bg-slate-900 text-white border-b border-slate-800 py-3.5 px-4 shadow sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={ciafalLogo}
              alt="CIAFAL"
              className="h-8 w-auto object-contain bg-white/10 p-1 rounded"
            />
            <div>
              <span className="font-black text-sm text-white tracking-tight block">
                CIAFAL FRETES
              </span>
              <span className="text-[10px] text-sky-400 font-bold uppercase">
                Oferta Pública de Transporte
              </span>
            </div>
          </div>

          <Badge className="bg-[#005596] text-white text-[10px] font-bold">
            {isPorta ? 'Janela 1 PORTA' : isFora ? 'Janela 2 FORA' : 'Oferta'}
          </Badge>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto p-4 flex-1 w-full space-y-4">
        {/* Banner de Tempo Restante */}
        {!isClosed && (
          <div className="bg-[#005596] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-sky-200 block">
                {isPorta ? 'Janela Exclusiva PORTA (Pátio)' : 'Janela Aberta FORA (até 60km)'}
              </span>
              <div className="text-xl font-black">{offer.cargo_id}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-sky-200 block">
                Tempo Restante
              </span>
              <div className="text-2xl font-mono font-black tracking-wider flex items-center gap-1">
                <Timer className="w-5 h-5 text-amber-300 animate-pulse" />
                {formatTimeRemaining()}
              </div>
            </div>
          </div>
        )}

        {/* Card: Detalhes da Carga & Itinerário */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900">
                {offer.cargo_description || 'Carga Disponível para Transporte'}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold border-slate-300">
                Código: {offer.cargo_id}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3.5 text-xs">
            {/* Origem e Destino */}
            <div className="space-y-2 bg-sky-50/50 p-3 rounded-xl border border-sky-100">
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-[#005596] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Origem
                  </span>
                  <span className="font-bold text-slate-900">
                    {offer.origin || 'Planta CIAFAL (Matriz)'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 border-t border-sky-100">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Destino
                  </span>
                  <span className="font-bold text-slate-900">
                    {offer.destination || 'Consulte o romaneio'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Peso & Veículo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Scale className="w-3.5 h-3.5 text-[#005596]" />
                  <span className="text-[10px] uppercase font-bold">Peso Total</span>
                </div>
                <div className="text-base font-black text-slate-900">
                  {((offer.weight_kg || 0) / 1000).toFixed(1)}{' '}
                  <span className="text-xs font-semibold">toneladas</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Truck className="w-3.5 h-3.5 text-[#005596]" />
                  <span className="text-[10px] uppercase font-bold">Veículo Exigido</span>
                </div>
                <div className="text-sm font-black text-slate-900 truncate">
                  {offer.required_vehicle_type || 'Carreta'}
                </div>
              </div>
            </div>

            {/* Piso Inicial (ANTT) */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-emerald-800 block">
                  Valor Inicial de Piso (ANTT)
                </span>
                <p className="text-[10px] text-emerald-700">
                  Aceite direto atribui a carga na hora
                </p>
              </div>
              <div className="text-xl font-black text-emerald-800">
                R$ {(offer.floor_value || offer.floor_price || 0).toLocaleString('pt-BR')}
              </div>
            </div>

            {/* Nota de Segurança LGPD */}
            <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>
                Ambiente criptografado. Suas propostas são registradas com rastro imutável de
                auditoria.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status se encerrada */}
        {isClosed ? (
          <Card className="border-slate-200 bg-white shadow-sm text-center p-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-black text-slate-900">Oferta Encerrada</h2>
            <p className="text-xs text-slate-600">
              Esta oferta já foi finalizada e atribuída pela logística CIAFAL.
            </p>
            <Link to="/tms/fila-publica">
              <Button className="bg-[#005596] text-white text-xs">
                Verificar Minha Posição na Fila
              </Button>
            </Link>
          </Card>
        ) : (
          /* Formulário de Identificação do Motorista & Submissão */
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-[#005596]" />
                Submeter Proposta de Frete
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Informe sua placa cadastrada para validar sua disponibilidade.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Passo 1: Identificação da Placa */}
              {!driverLookup ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="plate" className="text-xs font-bold text-slate-700">
                      Placa do seu Veículo
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="plate"
                        placeholder="Ex: ABC-1234 ou ABC1D23"
                        value={plateInput}
                        onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="font-mono font-bold text-sm uppercase"
                      />
                      <Button
                        type="button"
                        onClick={handleLookupPlate}
                        disabled={lookupLoading}
                        className="bg-[#005596] hover:bg-[#004275] text-white font-bold px-4"
                      >
                        {lookupLoading ? 'Buscando...' : 'Verificar'}
                      </Button>
                    </div>
                  </div>

                  {lookupError && (
                    <Alert variant="destructive" className="py-2 text-xs">
                      <AlertDescription>{lookupError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                /* Motorista Identificado */
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-sky-800 block">
                        Motorista Identificado
                      </span>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {driverLookup.driver?.nameMasked}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Placa: {driverLookup.vehicle?.plate} • {driverLookup.vehicle?.type}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDriverLookup(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Alterar
                    </Button>
                  </div>

                  {/* Formulário de Proposta */}
                  <form onSubmit={handleSubmitProposal} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="proposalVal" className="text-xs font-bold text-slate-700">
                        Seu Lance / Proposta de Valor (R$)
                      </Label>
                      <Input
                        id="proposalVal"
                        type="number"
                        step="10"
                        min={offer.floor_value || offer.floor_price || 0}
                        value={proposedValue}
                        onChange={(e) => setProposedValue(e.target.value)}
                        required
                        className="text-lg font-bold text-emerald-800"
                        placeholder="Ex: 3800"
                      />
                      <span className="text-[10px] text-slate-500 block">
                        Piso mínimo: R${' '}
                        {(offer.floor_value || offer.floor_price || 0).toLocaleString('pt-BR')}.
                        Lances no piso têm aceite imediato.
                      </span>
                    </div>

                    {isFora && (
                      <div className="space-y-1">
                        <Label htmlFor="arrival" className="text-xs font-bold text-slate-700">
                          Previsão de Chegada à CIAFAL (Grupo FORA)
                        </Label>
                        <Input
                          id="arrival"
                          type="text"
                          placeholder="Ex: 45 min ou 14:30"
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Botão de Envio */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-2.5 rounded-xl shadow-md gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Enviando Proposta...' : 'Submeter Proposta de Frete'}
                    </Button>
                  </form>
                </div>
              )}

              {/* Resultado da Submissão */}
              {submissionResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                    submissionResult.immediateContract
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-semibold'
                      : submissionResult.rejected
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : submissionResult.success
                          ? 'bg-sky-50 border-sky-300 text-sky-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {submissionResult.immediateContract ? (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>CARGA ATRIBUÍDA IMEDIATAMENTE!</span>
                      </>
                    ) : submissionResult.rejected ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Proposta Recusada pelas Regras</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-sky-600" />
                        <span>Proposta Registrada com Sucesso</span>
                      </>
                    )}
                  </div>
                  <p>{submissionResult.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-xl mx-auto px-4">
          <strong>HUB CIAFAL Logística</strong> • Cargas & Transportes Seguros
        </div>
      </footer>
    </div>
  )
}
