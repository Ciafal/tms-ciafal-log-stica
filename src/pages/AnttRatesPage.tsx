import React, { useState, useEffect } from 'react'
import {
  Scale,
  Calendar,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Layers,
  Info,
  Sliders,
  TrendingUp,
  Save,
  Truck,
  ArrowRight,
  History,
  Building2,
  DollarSign,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { TmsService } from '@/services/tmsService'
import { AnttRateTableEntity, FreightRuleParameterEntity, anttService } from '@/domain/rules'
import {
  anttEngine,
  calculateTripOperationalAnalysis,
  TripOperationalAnalysisResult,
  tollEngine,
} from '@/domain/anttAndTollEngine'

export const AnttRatesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [tables, setTables] = useState<AnttRateTableEntity[]>([])
  const [freightRules, setFreightRules] = useState<FreightRuleParameterEntity[]>([])
  const [activeRule, setActiveRule] = useState<FreightRuleParameterEntity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingRule, setIsSavingRule] = useState(false)
  const [isSendingToMesa, setIsSendingToMesa] = useState(false)
  const [isSavingSimulation, setIsSavingSimulation] = useState(false)

  // Interactive Calculator State (Ordem preferencial: 1. Distância, 2. Peso, 3. Eixos, 4. Tipo Carga, 5. Descargas)
  const [calcDistance, setCalcDistance] = useState<number>(380)
  const [calcWeightTon, setCalcWeightTon] = useState<string>('28,50')
  const [calcAxles, setCalcAxles] = useState<number>(5)
  const [calcCargoType, setCalcCargoType] = useState<
    'Geral' | 'Granel Sólido' | 'Granel Líquido' | 'Frigorificada' | 'Perigosa'
  >('Geral')
  const [calcDischarges, setCalcDischarges] = useState<number>(1)

  // Comparação Econômica Opcional (Frete Cobrado do Cliente)
  const [clientFreightInput, setClientFreightInput] = useState<string>('4200,00')
  const [includeClientComparison, setIncludeClientComparison] = useState<boolean>(true)

  // Parametrização Modal State
  const [isParamDialogOpen, setIsParamDialogOpen] = useState(false)
  const [editAdditionalDischarge, setEditAdditionalDischarge] = useState<number>(250)
  const [editAppliesFrom, setEditAppliesFrom] = useState<number>(2)
  const [editValueType, setEditValueType] = useState<'FIXO' | 'VARIAVEL_PERCENTUAL'>('FIXO')
  const [editRegionScope, setEditRegionScope] = useState<string>('TODAS')
  const [editCustomerScope, setEditCustomerScope] = useState<string>('TODOS')
  const [editVehicleScope, setEditVehicleScope] = useState<string>('TODOS')
  const [editRuleNotes, setEditRuleNotes] = useState<string>('')

  // Parsing e Validações
  const parsedWeight = parseFloat(calcWeightTon.replace(/\./g, '').replace(',', '.')) || 0
  const parsedClientFreight =
    parseFloat(clientFreightInput.replace(/\./g, '').replace(',', '.')) || 0

  // Validação estrita dos campos obrigatórios
  const isDistanceValid = calcDistance > 0
  const isWeightValid = parsedWeight > 0
  const isDischargesValid = Number.isInteger(calcDischarges) && calcDischarges >= 1
  const isAxlesValid = calcAxles >= 2
  const isFormValid = isDistanceValid && isWeightValid && isDischargesValid && isAxlesValid

  const getValidationErrorMessage = (): string | null => {
    if (!isDistanceValid) return 'Informe uma Distância Rodoviária válida maior que 0 km.'
    if (!isWeightValid)
      return 'Informe o peso da carga em toneladas para continuar (não permitir valor zero ou negativo).'
    if (!isDischargesValid) return 'Informe o número de descargas (mínimo de 1 descarga).'
    if (!isAxlesValid) return 'Selecione a configuração de eixos do veículo.'
    return null
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [anttData, rulesData] = await Promise.all([
        TmsService.getAnttRateTables(),
        TmsService.getFreightRuleParameters(),
      ])
      setTables(anttData)
      setFreightRules(rulesData)

      const active = rulesData.find((r) => r.is_active) || rulesData[0]
      if (active) {
        setActiveRule(active)
        setEditAdditionalDischarge(active.additional_discharge_value ?? 250)
        setEditAppliesFrom(active.applies_from_discharge_num ?? 2)
        setEditValueType(active.value_type || 'FIXO')
        setEditRegionScope(active.region_scope || 'TODAS')
        setEditCustomerScope(active.customer_scope || 'TODOS')
        setEditVehicleScope(active.vehicle_type_scope || 'TODOS')
        setEditRuleNotes(active.notes || '')
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao buscar Tabelas ANTT e Regras',
        description: err?.message || 'Falha ao carregar dados oficiais.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 1. Cálculo Oficial ANTT Regulatório (Inalterado, puro e isolado)
  const calcResult = anttService.calculateFloorPrice({
    distanceKm: Math.max(1, calcDistance),
    vehicleType: `${calcAxles} Eixos`,
    axlesCount: calcAxles,
    cargoType: calcCargoType,
  })

  // Pedágio estimado para a rota
  const tollEstimate = tollEngine.calculateTolls(calcDistance, `${calcAxles} Eixos`, calcAxles)

  // 2. Análise Operacional e Econômica da Viagem (CIAFAL)
  const operationalAnalysis: TripOperationalAnalysisResult = calculateTripOperationalAnalysis({
    distanceKm: calcDistance,
    weightTon: parsedWeight,
    axlesCount: calcAxles,
    cargoType: calcCargoType,
    dischargesCount: calcDischarges,
    anttFloorValue: calcResult.floorValue,
    tollCost: tollEstimate.totalTollCost,
    operationalAdditionals: 0,
    additionalPerDischarge: activeRule?.additional_discharge_value ?? 250,
    appliesFromDischargeNum: activeRule?.applies_from_discharge_num ?? 2,
    clientFreightCharged: includeClientComparison ? parsedClientFreight : undefined,
    driverOfferedFreight: Math.round(calcResult.floorValue * 1.05),
    carlaoNegotiatedFreight: Math.round(calcResult.floorValue * 1.03),
  })

  // Formatador brasileiro de números
  const formatPtBrNumber = (val: number, minDec = 2, maxDec = 2) => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    })
  }

  // Tratamento da digitação do peso em formato PT-BR
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Permitir dígitos e vírgula/ponto
    const cleaned = raw.replace(/[^\d.,]/g, '')
    setCalcWeightTon(cleaned)
  }

  // Tratamento de envio e auditoria da simulação
  const handleSaveSimulation = async () => {
    const validationError = getValidationErrorMessage()
    if (validationError) {
      toast({
        title: 'Validação Operacional',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    setIsSavingSimulation(true)
    try {
      const res = await TmsService.saveOfficialAnttSimulationAudit({
        distanceKm: calcDistance,
        weightTon: parsedWeight,
        axlesCount: calcAxles,
        cargoType: calcCargoType,
        dischargesCount: calcDischarges,
        tableVersion: calcResult.tableVersion,
        resolutionNumber: calcResult.resolutionNumber,
        anttFloorValue: calcResult.floorValue,
        ccd: calcResult.ccd,
        cc: calcResult.cc,
        costPerTon: operationalAnalysis.costPerTon,
        costPerKm: operationalAnalysis.costPerKm,
        costPerTonKm: operationalAnalysis.costPerTonKm,
        totalDischargesAdditionalCost: operationalAnalysis.totalDischargesAdditionalCost,
        ciafalEconomicReferenceTotal: operationalAnalysis.ciafalEconomicReferenceTotal,
        userEmail: user?.email || 'operador@ciafal.logistica',
        userName: user?.name || 'Operador Logístico',
        notes: `Simulação com ${calcDischarges} descarga(s), peso ${calcWeightTon} t, rota ${calcDistance} km`,
      })

      if (res.success) {
        toast({
          title: 'Simulação Registrada no Ledger de Auditoria',
          description: `ID: ${res.simulationId} — Versão ANTT ${calcResult.tableVersion} gravada com rastreabilidade completa.`,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao Registrar Simulação',
        description: err?.message || 'Falha na gravação dos logs de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingSimulation(false)
    }
  }

  // Enviar para a Mesa de Fretes e Carlão IA
  const handleSendToMesaFretes = async () => {
    const validationError = getValidationErrorMessage()
    if (validationError) {
      toast({
        title: 'Validação Operacional',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    setIsSendingToMesa(true)
    try {
      const cargoId = `CARGA-ANTT-${Date.now().toString().slice(-4)}`
      const loadScenario = await TmsService.saveSimulationScenario(
        {
          title: `Carga Simulada ANTT (${calcDistance} km · ${parsedWeight.toFixed(2)} t · ${calcDischarges} descargas)`,
          description: `Operação de ${calcCargoType} com ${calcAxles} eixos, ${calcDischarges} ponto(s) de descarga e piso regulatório de R$ ${calcResult.floorValue.toFixed(2)}.`,
          scenario_type: 'custom',
          classification: 'VIÁVEL',
          reasons: [
            `Piso ANTT Oficial: R$ ${calcResult.floorValue.toFixed(2)} (Resolução 5.867 / ${calcResult.tableVersion})`,
            `Peso total: ${parsedWeight.toFixed(2)} t | ${calcDischarges} descargas | ${calcDistance} km`,
            `Adicional de múltiplas descargas: R$ ${operationalAnalysis.totalDischargesAdditionalCost.toFixed(2)}`,
            `Referência Econômica CIAFAL: R$ ${operationalAnalysis.ciafalEconomicReferenceTotal.toFixed(2)}`,
          ],
          itinerary_code: 'ITIN-ROTA-ANTT',
          planned_date: new Date().toISOString().split('T')[0],
          vehicle_type: `${calcAxles} Eixos`,
          total_weight_kg: Math.round(parsedWeight * 1000),
          vehicle_capacity_kg: Math.round(Math.max(parsedWeight * 1000, 27000)),
          occupancy_pct: 95,
          orders_count: Math.max(1, calcDischarges * 2),
          customers_count: calcDischarges,
          distance_km: calcDistance,
          tolls_count: tollEstimate.totalTollsCount,
          tolls_value: tollEstimate.totalTollCost,
          antt_floor_value: calcResult.floorValue,
          antt_version: calcResult.tableVersion,
          estimated_freight_cost: operationalAnalysis.ciafalEconomicReferenceTotal,
          cost_per_ton: operationalAnalysis.costPerTon,
          status: 'simulado',
          created_by: user?.email || 'operador@ciafal.logistica',
        },
        user?.email || 'operador@ciafal.logistica',
        user?.name || 'Operador Logístico',
      )

      if (loadScenario) {
        toast({
          title: 'Parâmetros Enviados para a Mesa de Fretes',
          description: `Carga preparada com ${parsedWeight.toFixed(2)} t e ${calcDischarges} descarga(s). Redirecionando para negociação com Carlão IA...`,
        })
        navigate('/tms/mesa-fretes')
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao Enviar para Mesa de Fretes',
        description: err?.message || 'Falha ao integrar cenário com a Mesa de Fretes.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingToMesa(false)
    }
  }

  // Salvar Regra Parametrizada de Múltiplas Descargas
  const handleSaveFreightRule = async () => {
    setIsSavingRule(true)
    try {
      const updated = await TmsService.saveFreightRuleParameter(
        {
          id: activeRule?.id,
          rule_name: activeRule?.rule_name || 'Adicional por Descargas Extras CIAFAL',
          rule_code: activeRule?.rule_code || 'ADICIONAL_DESCARGA_PADRAO',
          additional_discharge_value: editAdditionalDischarge,
          value_type: editValueType,
          applies_from_discharge_num: editAppliesFrom,
          region_scope: editRegionScope,
          customer_scope: editCustomerScope,
          vehicle_type_scope: editVehicleScope,
          effective_date_start: new Date().toISOString(),
          is_active: true,
          responsible_user: user?.name || 'Gestor de Fretes CIAFAL',
          notes:
            editRuleNotes ||
            `Adicional de R$ ${editAdditionalDischarge} a partir da ${editAppliesFrom}ª descarga.`,
        },
        user?.email || 'admin@ciafal.logistica',
        user?.name || 'Gestor de Fretes CIAFAL',
      )

      if (updated) {
        setActiveRule(updated)
        toast({
          title: 'Regra de Frete Salva com Sucesso',
          description: `Novo adicional de R$ ${editAdditionalDischarge.toFixed(2)} por descarga extra aplicado e auditado.`,
        })
        setIsParamDialogOpen(false)
        fetchData()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Regra de Frete',
        description: err?.message || 'Falha ao persistir parâmetros.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingRule(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Header Institucional CIAFAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[#005596]" />
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Tabela Oficial de Frete Mínimo (ANTT)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              RESOLUÇÃO Nº 5.867 / SUROC 12/2024
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Piso mínimo regulatório calculado de forma determinística e auditável para siderurgia e
            carga geral CIAFAL.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs font-mono bg-emerald-50 text-emerald-800 border-emerald-300"
          >
            Vigência Ativa Oficial
          </Badge>

          {/* Botão de Parametrização Administrativa das Regras de Frete */}
          <Dialog open={isParamDialogOpen} onOpenChange={setIsParamDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-[#005596]/30 text-[#005596] hover:bg-sky-50 gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configurar Regras de Frete & Descargas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl text-xs">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#005596]" />
                  Parametrização de Regras de Frete: Custo por Descargas Adicionais
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Definição administrativa e auditável dos adicionais operacionais por pontos
                  múltiplos de descarga. Não altera a fórmula regulatória ANTT.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 text-sky-950 text-[11px] space-y-1">
                  <strong>Conceito Operacional CIAFAL:</strong> A 1ª descarga está sempre inclusa na
                  operação padrão. Da 2ª descarga em diante, aplica-se o adicional parametrizado
                  abaixo.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">
                      Valor Adicional por Descarga Extra (R$):
                    </label>
                    <Input
                      type="number"
                      value={editAdditionalDischarge}
                      onChange={(e) =>
                        setEditAdditionalDischarge(Math.max(0, Number(e.target.value)))
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">
                      Aplicar a partir da Descarga nº:
                    </label>
                    <Input
                      type="number"
                      value={editAppliesFrom}
                      onChange={(e) => setEditAppliesFrom(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Tipo de Valor:</label>
                    <Select
                      value={editValueType}
                      onValueChange={(val: any) => setEditValueType(val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="FIXO">Fixo por Parada (R$)</SelectItem>
                        <SelectItem value="VARIAVEL_PERCENTUAL">Percentual sobre Frete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">
                      Faixa por Região:
                    </label>
                    <Input
                      value={editRegionScope}
                      onChange={(e) => setEditRegionScope(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="TODAS ou SP / MG / RJ"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">
                      Faixa por Veículo:
                    </label>
                    <Input
                      value={editVehicleScope}
                      onChange={(e) => setEditVehicleScope(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="TODOS ou Carreta LS"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">
                    Justificativa / Histórico da Alteração:
                  </label>
                  <Input
                    value={editRuleNotes}
                    onChange={(e) => setEditRuleNotes(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Ex: Atualização do adicional para cobrir tempo médio de doca estendido"
                  />
                </div>

                {activeRule?.changelog_json && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-1 max-h-28 overflow-y-auto">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <History className="w-3 h-3 text-slate-500" />
                      Trilha de Auditoria e Histórico da Regra:
                    </span>
                    <div className="font-mono text-slate-600 space-y-0.5">
                      {typeof activeRule.changelog_json === 'string'
                        ? activeRule.changelog_json
                        : JSON.stringify(activeRule.changelog_json, null, 2)}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsParamDialogOpen(false)}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFreightRule}
                  disabled={isSavingRule}
                  className="bg-[#005596] hover:bg-[#004071] text-white text-xs h-8 gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Parâmetros & Auditar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Corporate Guidance Banner: Separação Estrita dos Três Blocos */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 text-xs text-sky-950 flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-4 h-4 text-[#005596] mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <strong className="font-bold text-sky-950 block">
            ARQUITETURA DE CÁLCULO SEPARADA EM 3 BLOCOS INDEPENDENTES:
          </strong>
          <span className="text-sky-900 leading-relaxed block">
            <strong>Bloco A:</strong> Piso Regulatório ANTT Oficial (Resolução 5.867 — cálculo puro
            e inalterado) • <strong>Bloco B:</strong> Parâmetros Operacionais CIAFAL (toneladas,
            múltiplas descargas, veículo) • <strong>Bloco C:</strong> Análise Econômica da Viagem
            (R$/t, R$/km, R$/t·km, margem e adicionais de descarga). Nenhuma regra interna altera a
            fórmula oficial da ANTT.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Col (7 cols): Tabelas Vigentes & Coeficientes Regulatórios */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Tabelas Oficiais */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-[#005596]" />
                Tabelas Oficiais Cadastradas e Vigentes
              </CardTitle>
              <CardDescription className="text-xs">
                Histórico com versionamento e resoluções aplicadas automaticamente no fechamento de
                ofertas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3">Versão / Resolução</th>
                    <th className="p-3">Tipo de Carga</th>
                    <th className="p-3">Vigência Início</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Cadastrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tables.map((tbl) => (
                    <tr key={tbl.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900">
                          {tbl.table_version}
                        </div>
                        <div className="text-[10px] text-slate-500">{tbl.resolution_number}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {tbl.cargo_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">
                        {new Date(tbl.effective_date_start + 'T12:00:00').toLocaleDateString(
                          'pt-BR',
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {tbl.is_active ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Ativa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">
                            Histórico
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 font-mono">
                        {tbl.registered_by || 'auditor@ciafal.logistica'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Card 2: Coeficientes Vigentes */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Coeficientes Regulatórios por Configuração de Eixos (Carga Geral)</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  CCD (R$/km) + CC (R$)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded border transition-colors ${
                    calcAxles === 2
                      ? 'bg-sky-50 border-[#005596] ring-1 ring-[#005596]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800">2 Eixos (Toco / 3/4)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 2,85 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 1,45</div>
                </div>
                <div
                  className={`p-2.5 rounded border transition-colors ${
                    calcAxles === 3
                      ? 'bg-sky-50 border-[#005596] ring-1 ring-[#005596]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800">3 Eixos (Truck)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 3,65 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 1,95</div>
                </div>
                <div
                  className={`p-2.5 rounded border transition-colors ${
                    calcAxles === 5
                      ? 'bg-sky-50 border-[#005596] ring-1 ring-[#005596]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800">5 Eixos (Carreta LS)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 5,15 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 2,90</div>
                </div>
                <div
                  className={`p-2.5 rounded border transition-colors ${
                    calcAxles === 7
                      ? 'bg-sky-50 border-[#005596] ring-1 ring-[#005596]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-800">7 Eixos (Bitrem)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 6,70 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 3,90</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD ANÁLISE OPERACIONAL DA VIAGEM (TÍTULO EXATO CONFORME ITEM 4) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 bg-gradient-to-r from-sky-50 to-white border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-[#005596]" />
                  Análise Operacional da Viagem
                </CardTitle>
                <Badge className="bg-[#005596] text-white text-[10px]">
                  Cálculo Gerencial CIAFAL
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Indicadores técnicos por tonelada, quilômetro e tonelada-quilômetro derivados do
                Piso ANTT e dos parâmetros operacionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Grid Principal de Indicadores Operacionais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Peso da Carga
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {formatPtBrNumber(operationalAnalysis.weightTon)} t
                  </div>
                  <span className="text-[10px] text-slate-500">
                    ({formatPtBrNumber(operationalAnalysis.weightTon * 1000, 0, 0)} kg)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Número de Descargas
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {operationalAnalysis.dischargesCount} ponto(s)
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {operationalAnalysis.extraDischargesCount > 0
                      ? `${operationalAnalysis.extraDischargesCount} adicional(is)`
                      : 'Padrão (1ª inclusa)'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Distância Total
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {operationalAnalysis.distanceKm} km
                  </div>
                  <span className="text-[10px] text-slate-500">Itinerário rodoviário</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Configuração de Eixos
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {operationalAnalysis.axlesCount} Eixos
                  </div>
                  <span className="text-[10px] text-slate-500">{calcCargoType}</span>
                </div>

                <div className="p-3 rounded-lg bg-sky-50 border border-[#005596]/30">
                  <span className="text-[10px] uppercase font-bold text-[#005596] block">
                    Piso ANTT Oficial
                  </span>
                  <div className="text-base font-black font-mono text-[#005596] mt-0.5">
                    R$ {formatPtBrNumber(operationalAnalysis.anttFloorValue)}
                  </div>
                  <span className="text-[10px] text-sky-800">Resolução 5.867</span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Piso ANTT por Tonelada
                  </span>
                  <div className="text-base font-black font-mono text-emerald-900 mt-0.5">
                    R$ {formatPtBrNumber(operationalAnalysis.costPerTon)}/t
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono">Piso / Toneladas</span>
                </div>

                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-800 block">
                    Piso ANTT por Km
                  </span>
                  <div className="text-base font-black font-mono text-purple-900 mt-0.5">
                    R$ {formatPtBrNumber(operationalAnalysis.costPerKm)}/km
                  </div>
                  <span className="text-[10px] text-purple-700 font-mono">Piso / Distância</span>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 col-span-2 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">
                    Piso ANTT por Tonelada-Quilômetro
                  </span>
                  <div className="text-base font-black font-mono text-amber-950 mt-0.5">
                    R$ {formatPtBrNumber(operationalAnalysis.costPerTonKm, 4, 4)}/t·km
                  </div>
                  <span className="text-[10px] text-amber-800 font-mono">
                    Fórmula: Piso ANTT / (Toneladas × Distância)
                  </span>
                </div>
              </div>

              {/* Bloco de Composição do Valor & Descargas Adicionais */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#005596]" />
                    Composição da Referência Econômica CIAFAL
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Transparência de Custos
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[9px] uppercase font-sans font-bold text-slate-400 block">
                      1. Piso ANTT Oficial
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      R$ {formatPtBrNumber(operationalAnalysis.anttFloorValue)}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[9px] uppercase font-sans font-bold text-slate-400 block">
                      2. Pedágio Estimado
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      R$ {formatPtBrNumber(tollEstimate.totalTollCost)}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[9px] uppercase font-sans font-bold text-slate-400 block">
                      3. Adic. Descargas ({operationalAnalysis.extraDischargesCount}x)
                    </span>
                    <span className="font-bold text-[#005596] text-xs">
                      + R$ {formatPtBrNumber(operationalAnalysis.totalDischargesAdditionalCost)}
                    </span>
                  </div>

                  <div className="p-2 bg-[#005596]/10 rounded border border-[#005596]/30">
                    <span className="text-[9px] uppercase font-sans font-bold text-[#005596] block">
                      Referência Total CIAFAL
                    </span>
                    <span className="font-black text-[#005596] text-xs">
                      R$ {formatPtBrNumber(operationalAnalysis.ciafalEconomicReferenceTotal)}
                    </span>
                  </div>
                </div>

                {/* Comparativo Econômico com Frete do Cliente & Margem */}
                {includeClientComparison && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-bold text-slate-700">
                        Comparação Econômica: Receita do Cliente vs Custo Motorista
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[9px]">
                        Margem Estimada:{' '}
                        {formatPtBrNumber(operationalAnalysis.marginFreightPct || 0)}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="p-1.5 bg-emerald-50/60 rounded border border-emerald-200">
                        <span className="text-[9px] text-emerald-800 uppercase font-sans block">
                          Frete Cobrado Cliente:
                        </span>
                        <span className="font-bold text-emerald-950">
                          R$ {formatPtBrNumber(parsedClientFreight)}
                        </span>
                        <span className="text-[9px] text-emerald-700 block">
                          (R$ {formatPtBrNumber(operationalAnalysis.chargedPerTon || 0)}/t)
                        </span>
                      </div>

                      <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase font-sans block">
                          Custo Motorista (Ofertado):
                        </span>
                        <span className="font-bold text-slate-800">
                          R$ {formatPtBrNumber(operationalAnalysis.driverOfferedFreight || 0)}
                        </span>
                      </div>

                      <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase font-sans block">
                          Margem Bruta Frete:
                        </span>
                        <span className="font-bold text-emerald-700">
                          R$ {formatPtBrNumber(operationalAnalysis.marginFreightValue || 0)}
                        </span>
                      </div>

                      <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                        <span className="text-[9px] text-slate-500 uppercase font-sans block">
                          Resultado por Descarga:
                        </span>
                        <span className="font-bold text-slate-900">
                          R$ {formatPtBrNumber(operationalAnalysis.resultPerDischarge || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col (5 cols): Simulador Oficial Interativo Reorganizado */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[#005596]/5 border-[#005596]/20 shadow-sm sticky top-20">
            <CardHeader className="p-4 pb-2 bg-white/60 border-b border-[#005596]/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-[#005596] flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  Simulador Oficial de Piso ANTT
                </CardTitle>
                <Badge className="bg-[#005596] text-white text-[9px] font-bold">CIAFAL HUB</Badge>
              </div>
              <CardDescription className="text-xs">
                Grade compacta com validações estritas para alimentação da Mesa de Fretes e Carlão
                IA.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              {/* ALERTA DE VALIDAÇÃO (SE HOUVER) */}
              {!isFormValid && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <span>{getValidationErrorMessage()}</span>
                </div>
              )}

              {/* FORMULÁRIO NA ORDEM PREFERENCIAL (Itens 1 e 2 do Prompt) */}
              {/* Linha 1: Distância Rodoviária (km) + Peso da Carga (t) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] flex items-center justify-between">
                    <span>1. Distância (km) *</span>
                    <span className="text-[10px] text-slate-400 font-normal">km</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={calcDistance}
                    onChange={(e) => setCalcDistance(Math.max(0, Number(e.target.value)))}
                    className="h-8 text-xs font-mono bg-white"
                    placeholder="Ex: 380"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] flex items-center justify-between">
                    <span>2. Peso da Carga (t) *</span>
                    <span className="text-[10px] text-slate-400 font-normal">t</span>
                  </label>
                  <Input
                    type="text"
                    value={calcWeightTon}
                    onChange={handleWeightChange}
                    className={`h-8 text-xs font-mono bg-white ${
                      !isWeightValid ? 'border-rose-400 ring-1 ring-rose-300' : ''
                    }`}
                    placeholder="Ex: 28,50"
                  />
                </div>
              </div>

              {/* Linha 2: Número de Eixos + Número de Descargas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">3. Nº de Eixos *</label>
                  <Select
                    value={String(calcAxles)}
                    onValueChange={(val) => setCalcAxles(Number(val))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="2">2 Eixos (Toco / 3/4)</SelectItem>
                      <SelectItem value="3">3 Eixos (Truck)</SelectItem>
                      <SelectItem value="4">4 Eixos (Bi-Truck)</SelectItem>
                      <SelectItem value="5">5 Eixos (Carreta LS)</SelectItem>
                      <SelectItem value="6">6 Eixos (Vanderléia)</SelectItem>
                      <SelectItem value="7">7 Eixos (Bitrem)</SelectItem>
                      <SelectItem value="9">9 Eixos (Rodotrem)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] flex items-center justify-between">
                    <span>5. Nº Descargas *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Mín. 1</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={calcDischarges}
                    onChange={(e) =>
                      setCalcDischarges(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className={`h-8 text-xs font-mono bg-white ${
                      !isDischargesValid ? 'border-rose-400 ring-1 ring-rose-300' : ''
                    }`}
                    placeholder="Ex: 1, 2, 3"
                  />
                </div>
              </div>

              {/* Linha 3: Tipo de Carga (Largura maior) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">4. Tipo de Carga *</label>
                <Select value={calcCargoType} onValueChange={(val: any) => setCalcCargoType(val)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Geral">Carga Geral (Siderurgia / Tubos / Perfis)</SelectItem>
                    <SelectItem value="Granel Sólido">Granel Sólido (Minério / Sucata)</SelectItem>
                    <SelectItem value="Perigosa">Carga Perigosa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frete do Cliente Opcional */}
              <div className="pt-1 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Frete Cobrado do Cliente (Opcional - R$):
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncludeClientComparison(!includeClientComparison)}
                    className="text-[10px] text-[#005596] hover:underline font-semibold"
                  >
                    {includeClientComparison ? 'Ocultar margem' : 'Exibir margem'}
                  </button>
                </div>
                {includeClientComparison && (
                  <Input
                    type="text"
                    value={clientFreightInput}
                    onChange={(e) => setClientFreightInput(e.target.value.replace(/[^\d.,]/g, ''))}
                    className="h-8 text-xs font-mono bg-white"
                    placeholder="Ex: 4200,00"
                  />
                )}
              </div>

              {/* BLOCO A: PISO MÍNIMO REGULATÓRIO CALCULADO (ISOLADO E PURO) */}
              <div className="p-3.5 bg-white rounded-xl border border-[#005596]/30 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                    Piso Mínimo Regulatório Calculado
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[9px]">Oficial ANTT</Badge>
                </div>

                <div className="text-2xl font-black font-mono text-[#005596]">
                  R$ {formatPtBrNumber(calcResult.floorValue)}
                </div>

                <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-bold text-slate-700">Detalhamento da Fórmula Oficial:</div>
                  {calcResult.formulaDetails}
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Versão: {calcResult.tableVersion}</span>
                  <span className="font-mono text-emerald-700 font-bold">100% Determinístico</span>
                </div>
              </div>

              {/* AÇÕES DE INTEGRAÇÃO COM MESA DE FRETES, CARLÃO E AUDITORIA */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleSendToMesaFretes}
                  disabled={!isFormValid || isSendingToMesa}
                  className="w-full bg-[#005596] hover:bg-[#004071] text-white font-bold text-xs h-9 shadow-sm gap-2"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingToMesa ? 'animate-spin' : ''}`} />
                  Enviar Dados para Mesa de Fretes & Carlão IA
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleSaveSimulation}
                    disabled={!isFormValid || isSavingSimulation}
                    variant="outline"
                    className="text-xs h-8 text-slate-700 border-slate-300 gap-1.5"
                  >
                    <Save className="w-3 h-3 text-[#005596]" />
                    Salvar Auditoria
                  </Button>

                  <Button
                    onClick={() => navigate('/tms/mesa-fretes')}
                    variant="outline"
                    className="text-xs h-8 text-slate-700 border-slate-300 gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[#005596]" />
                    Ir p/ Mesa de Fretes
                  </Button>
                </div>
              </div>

              {/* Informativo sobre Carlão */}
              <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200 text-sky-900 text-[10px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Truck className="w-3 h-3 text-[#005596]" />
                  Inteligência de Negociação do Carlão IA:
                </div>
                <p className="leading-tight text-sky-800">
                  O Carlão recebe os parâmetros operacionais ({parsedWeight.toFixed(2)} t e{' '}
                  {calcDischarges} descargas) para ponderar a complexidade operacional da viagem,
                  respeitando integralmente o piso mínimo como teto regulatório inegociável.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AnttRatesPage
