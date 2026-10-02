import React, { useState } from 'react'
import {
  Building,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Phone,
  Radio,
  FileText,
  UserCheck,
  Info,
  ShieldAlert,
  Route,
  Compass,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { isValidDocument } from '@/domain/rules'
import { ItinerarySearchSelect } from '@/components/common/ItinerarySearchSelect'

export const TotemEntry: React.FC = () => {
  const { toast } = useToast()

  const [document, setDocument] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('Carreta LS')
  const [preferredItinerary, setPreferredItinerary] = useState<string>('SEM_PREFERENCIA')
  const [preferredItineraryName, setPreferredItineraryName] = useState<string>('Sem preferência')
  const [isItineraryModalOpen, setIsItineraryModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    isPreReg?: boolean
    transitionedFromFora?: boolean
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanDoc = document.replace(/\D/g, '')
    const docCheck = isValidDocument(cleanDoc)

    if (!docCheck.valid) {
      toast({
        title: 'Documento Inválido',
        description: 'Informe um CPF ou CNPJ válido.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await TmsService.submitTotemEntry({
        document: cleanDoc,
        whatsapp,
        plate,
        vehicleType,
        type: 'PORTA',
        preferredItinerary,
        preferredItineraryName,
        channel: 'TOTEM',
      })

      setResult(response)
      if (response.success) {
        toast({
          title: response.transitionedFromFora
            ? 'Transição FORA → PORTA Confirmada'
            : response.isPreReg
              ? 'Pré-Cadastro Gerado'
              : 'Entrada Registrada!',
          description: response.message,
        })
      } else {
        toast({
          title: 'Não foi possível entrar',
          description: response.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err?.message || 'Falha ao registrar presença no Totem.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Header */}
      <div className="max-w-lg w-full mx-auto space-y-4 pt-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-sky-50 border border-sky-200 px-4 py-1.5 rounded-full text-xs text-[#005596] font-semibold">
            <Building className="w-4 h-4 text-[#005596]" />
            <span>Totem de Autoatendimento • Portaria CIAFAL</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Pátio CIAFAL Matriz
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Confirme sua chegada física à portaria para registrar sua prioridade na Fila PORTA.
          </p>
        </div>

        {/* Informação sobre Transição FORA -> PORTA */}
        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-[#005596]">
            <ShieldCheck className="w-4 h-4 text-[#005596]" />
            <span>TRANSIÇÃO CONTROLADA FORA → PORTA:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Se você já informou disponibilidade na Fila FORA, o sistema localizará seu cadastro
            automaticamente e o promoverá para a <strong>Fila PORTA</strong> com o novo horário de
            chegada física para desempate.
          </p>
        </div>

        {/* Result Feedback Banner */}
        {result && (
          <div
            className={`p-4 rounded-xl border animate-fade-in text-xs ${
              result.success
                ? result.transitionedFromFora
                  ? 'bg-sky-50 border-sky-300 text-sky-900'
                  : result.isPreReg
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-start space-x-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
              )}
              <div className="space-y-1">
                <strong className="font-bold block text-sm">
                  {result.success
                    ? result.transitionedFromFora
                      ? 'Transição FORA → PORTA Efetivada!'
                      : result.isPreReg
                        ? 'Pré-Cadastro Recebido'
                        : 'Entrada PORTA Confirmada!'
                    : 'Atenção Operacional'}
                </strong>
                <p>{result.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Check-in Form Card */}
        <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-[#005596]" />
              <span>Identificação do Motorista</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Digite seu documento e placa para liberação da entrada
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Document */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">CPF ou CNPJ:</label>
                <Input
                  placeholder="000.000.000-00"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900 font-mono text-sm h-11"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Telefone / WhatsApp (DDD + Número):
                </label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900 font-mono text-sm h-11"
                />
              </div>

              {/* Plate and Vehicle Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Placa do Cavalo:</label>
                  <Input
                    placeholder="ABC1D23"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-sm h-11 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Tipo do Conjunto:</label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200">
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

              {/* SELETOR DE ITINERÁRIO TOUCH (ALTO CONTRASTE) */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 uppercase flex items-center gap-1.5 text-xs">
                    <Route className="w-4 h-4 text-[#005596]" />
                    Itinerário de Preferência
                  </span>
                  <Badge
                    className={
                      preferredItinerary === 'SEM_PREFERENCIA'
                        ? 'bg-slate-200 text-slate-800 text-[11px] font-semibold'
                        : 'bg-[#005596] text-white text-[11px] font-mono'
                    }
                  >
                    {preferredItinerary === 'SEM_PREFERENCIA'
                      ? 'Sem Preferência'
                      : preferredItinerary}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-600 font-medium truncate">
                  Rota: <strong className="text-slate-800">{preferredItineraryName}</strong>
                </div>

                {/* Botões Touch Grandes: Atalho Sem Preferência + Modal de Busca */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => {
                      setPreferredItinerary('SEM_PREFERENCIA')
                      setPreferredItineraryName('Sem preferência')
                    }}
                    className={`h-11 text-xs font-bold border-2 transition-all ${
                      preferredItinerary === 'SEM_PREFERENCIA'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Sem Preferência
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setIsItineraryModalOpen(true)}
                    className={`h-11 text-xs font-bold border-2 transition-all ${
                      preferredItinerary !== 'SEM_PREFERENCIA'
                        ? 'bg-[#005596] text-white border-[#003d6d] shadow-sm'
                        : 'bg-white text-[#005596] border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    <Compass className="w-4 h-4 mr-1" />
                    {preferredItinerary !== 'SEM_PREFERENCIA' ? 'Trocar Rota' : 'Buscar Rota SAP'}
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#005596] hover:bg-[#004275] text-white font-bold text-base h-12 mt-2 shadow-sm"
              >
                {isSubmitting ? 'Validando Entrada...' : 'Registrar Entrada no Pátio (PORTA)'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modal Touch para Seleção de Itinerário SAP */}
      <Dialog open={isItineraryModalOpen} onOpenChange={setIsItineraryModalOpen}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Route className="w-5 h-5 text-[#005596]" />
              Itinerário de Preferência (TVROT SAP)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o trajeto oficial desejado ou mantenha sem preferência.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <ItinerarySearchSelect
              value={preferredItinerary}
              onSelect={(code, desc) => {
                setPreferredItinerary(code)
                setPreferredItineraryName(desc)
              }}
              placeholder="Buscar rota SAP por código, cidade ou UF..."
              className="w-full text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPreferredItinerary('SEM_PREFERENCIA')
                setPreferredItineraryName('Sem preferência')
                setIsItineraryModalOpen(false)
              }}
              className="text-xs font-semibold text-slate-700"
            >
              Sem Preferência
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsItineraryModalOpen(false)}
              className="text-xs font-bold bg-[#005596] text-white"
            >
              Confirmar Escolha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 py-4">
        Totem de Portaria • Conectado à Rede Restrita CIAFAL (Fail-Closed) • TMS HUB CIAFAL
      </div>
    </div>
  )
}
