import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { TmsService } from '@/services/tmsService'
import { isValidDocument } from '@/domain/rules'
import {
  Building2,
  QrCode,
  Truck,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Info,
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

export const TotemEntry: React.FC = () => {
  const { toast } = useToast()

  const [documentNumber, setDocumentNumber] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('Carreta LS 3 Eixos')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    isPreReg?: boolean
    data?: any
  } | null>(null)

  // Auto format and validate CPF / CNPJ digits
  const handleDocChange = (val: string) => {
    // Only numbers
    const digits = val.replace(/\D/g, '')
    setDocumentNumber(digits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    const docValidation = isValidDocument(documentNumber)
    if (!docValidation.valid) {
      toast({
        title: 'Documento Inválido',
        description: 'O CPF ou CNPJ informado não passou na validação dos dígitos verificadores.',
        variant: 'destructive',
      })
      return
    }

    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      toast({
        title: 'WhatsApp Inválido',
        description: 'Informe o DDD e número do WhatsApp (ex: 11987654321, sem +55).',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await TmsService.submitTotemEntry({
        document: documentNumber,
        whatsapp: whatsapp,
        plate: plate.toUpperCase(),
        vehicleType,
        type: 'PORTA',
      })

      setResult(res)
      if (res.success) {
        toast({
          title: res.isPreReg ? 'Pré-cadastro Gerado' : 'Entrada Confirmada!',
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
        message: err?.message || 'Falha na comunicação com o servidor da portaria.',
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
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-8 font-sans antialiased select-none">
      {/* HEADER TOTEM INSTITUCIONAL */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-[#005596] text-white flex items-center justify-center font-black text-2xl shadow-lg border border-sky-400/30">
            CF
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              TOTEM PORTARIA CIAFAL
              <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/30 text-[10px] font-mono uppercase">
                GRUPO PORTA
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Registro de Presença Física no Pátio da Planta Central
            </p>
          </div>
        </div>

        <Link to="/tms/fila">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Voltar ao TMS
          </Button>
        </Link>
      </div>

      {/* MAIN TOUCH SCREEN CONTAINER */}
      <div className="max-w-2xl mx-auto w-full my-6">
        {result ? (
          <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl p-6 sm:p-8 text-center space-y-6">
            <div className="flex justify-center">
              {result.success ? (
                result.isPreReg ? (
                  <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                )
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-10 h-10" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {result.success
                  ? result.isPreReg
                    ? 'Pré-Cadastro Registrado na Portaria'
                    : 'Entrada na Fila Confirmada com Sucesso!'
                  : 'Acesso / Entrada Não Autorizada'}
              </h2>
              <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>

            {result.success && !result.isPreReg && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-left text-xs space-y-1.5 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Grupo de Alocação:</span>
                  <span className="font-bold text-sky-400">PORTA (Na CIAFAL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prioridade Operacional:</span>
                  <span className="font-bold text-emerald-400">Prioridade 1 (Temporal)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Horário Registrado:</span>
                  <span className="font-mono text-slate-200">
                    {new Date().toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleReset}
                size="lg"
                className="w-full sm:w-auto px-8 bg-[#005596] hover:bg-[#004071] text-white font-bold h-12 text-base"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Novo Registro no Totem
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-slate-800/95 border-slate-700 text-white shadow-2xl">
            <CardHeader className="p-6 border-b border-slate-700/80">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                <span>Identificação do Motorista</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Toque nos campos abaixo e informe seus dados para registrar sua entrada no pátio.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* CPF / CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>CPF ou CNPJ (Apenas números)</span>
                    <span className="text-[11px] text-sky-400 lowercase font-normal">
                      Validação automática
                    </span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 12345678909 (11 ou 14 dígitos)"
                      value={documentNumber}
                      onChange={(e) => handleDocChange(e.target.value)}
                      required
                      className="pl-11 h-12 bg-slate-900 border-slate-700 text-white text-base font-mono tracking-wider focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    WhatsApp com DDD (sem +55)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="Ex: 11987654321"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      required
                      className="pl-11 h-12 bg-slate-900 border-slate-700 text-white text-base font-mono focus:border-sky-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Você receberá alertas operacionais e chamados de doca por este número.
                  </p>
                </div>

                {/* Placa e Tipo de Veículo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Placa do Cavalo / Veículo
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Ex: ABC1D23"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        required
                        className="pl-11 h-12 bg-slate-900 border-slate-700 text-white text-base font-mono uppercase focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Tipo de Conjunto
                    </label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger className="h-12 bg-slate-900 border-slate-700 text-white text-sm focus:border-sky-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-slate-700">
                        <SelectItem value="Carreta LS 3 Eixos">Carreta LS (3 Eixos)</SelectItem>
                        <SelectItem value="Bitrem 7 Eixos">Bitrem (7 Eixos)</SelectItem>
                        <SelectItem value="Rodotrem 9 Eixos">Rodotrem (9 Eixos)</SelectItem>
                        <SelectItem value="Truck">Truck (3 Eixos)</SelectItem>
                        <SelectItem value="Toco">Toco (2 Eixos)</SelectItem>
                        <SelectItem value="VUC">VUC / 3/4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Security Policy Badge */}
                <div className="bg-sky-950/40 p-3 rounded-lg border border-sky-800/40 flex items-start space-x-2.5 text-xs text-sky-200">
                  <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-tight">
                    <strong>Segurança Fail-Closed:</strong> O totem só aceita registros originados
                    da rede interna da portaria CIAFAL.
                  </div>
                </div>

                {/* Submit Touch Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-[#005596] hover:bg-[#004071] text-white text-lg font-black tracking-wide shadow-lg cursor-pointer"
                >
                  {isSubmitting ? 'Validando Cadastro...' : 'CONFIRMAR ENTRADA NA FILA'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FOOTER TOTEM */}
      <div className="max-w-3xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-800 pt-4">
        CIAFAL — Sistema de Portaria e Balança • Conforme Norma Corporativa de Acesso
      </div>
    </div>
  )
}
