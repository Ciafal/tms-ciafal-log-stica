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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { AnttRateTableEntity, anttService } from '@/domain/rules'

export const AnttRatesPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [tables, setTables] = useState<AnttRateTableEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Interactive Calculator
  const [calcDistance, setCalcDistance] = useState<number>(380)
  const [calcAxles, setCalcAxles] = useState<number>(5)
  const [calcCargoType, setCalcCargoType] = useState<
    'Geral' | 'Granel Sólido' | 'Granel Líquido' | 'Frigorificada' | 'Perigosa'
  >('Geral')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getAnttRateTables()
      setTables(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao buscar Tabelas ANTT',
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

  // Live calculation
  const calcResult = anttService.calculateFloorPrice({
    distanceKm: calcDistance,
    vehicleType: `${calcAxles} Eixos`,
    axlesCount: calcAxles,
    cargoType: calcCargoType,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Tabela Oficial de Frete Mínimo (ANTT)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              RESOLUÇÃO Nº 5.867 / SUROC 12/2024
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Piso mínimo regulatório calculado de forma determinística e auditável para siderurgia e
            carga geral CIAFAL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-mono bg-emerald-50 text-emerald-800 border-emerald-300"
          >
            Vigência Ativa Oficial
          </Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Rate Table & Audit */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Coeficientes Vigentes */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Coeficientes Regulatórios por Configuração de Eixos (Carga Geral)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">2 Eixos (Toco / 3/4)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 2,85 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 1,45</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">3 Eixos (Truck)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 3,65 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 1,95</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">5 Eixos (Carreta LS)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 5,15 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 2,90</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">7 Eixos (Bitrem)</div>
                  <div className="text-slate-600 font-mono text-[11px] mt-1">CCD: R$ 6,70 / km</div>
                  <div className="text-slate-600 font-mono text-[11px]">CC: R$ 3,90</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Interactive Simulator */}
        <div className="space-y-4">
          <Card className="bg-[#005596]/5 border-[#005596]/20 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-[#005596] flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                Simulador Oficial de Piso ANTT
              </CardTitle>
              <CardDescription className="text-xs">
                Testador em tempo real dos parâmetros oficiais que alimentam a Mesa de Fretes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Distância Rodoviária (km):
                </label>
                <Input
                  type="number"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(Math.max(1, Number(e.target.value)))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Número de Eixos:</label>
                <Select
                  value={String(calcAxles)}
                  onValueChange={(val) => setCalcAxles(Number(val))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="2">2 Eixos (Toco / Veículo Leve)</SelectItem>
                    <SelectItem value="3">3 Eixos (Truck Médio)</SelectItem>
                    <SelectItem value="4">4 Eixos (Bi-Truck)</SelectItem>
                    <SelectItem value="5">5 Eixos (Carreta LS Standard)</SelectItem>
                    <SelectItem value="6">6 Eixos (Vanderléia)</SelectItem>
                    <SelectItem value="7">7 Eixos (Bitrem Articulado)</SelectItem>
                    <SelectItem value="9">9 Eixos (Rodotrem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Tipo de Carga:</label>
                <Select value={calcCargoType} onValueChange={(val: any) => setCalcCargoType(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Geral">Carga Geral (Siderurgia / Tubos / Perfis)</SelectItem>
                    <SelectItem value="Granel Sólido">Granel Sólido (Minério / Sucata)</SelectItem>
                    <SelectItem value="Perigosa">Carga Perigosa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#005596]/20 shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Piso Mínimo Regulatório Calculado
                </span>
                <div className="text-2xl font-black font-mono text-[#005596]">
                  R$ {calcResult.floorValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded">
                  {calcResult.formulaDetails}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default AnttRatesPage
