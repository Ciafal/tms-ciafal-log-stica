import React, { useState } from 'react'
import {
  FileText,
  Calendar,
  Clock,
  Truck,
  Scale,
  Route,
  User,
  ShieldCheck,
  Building,
  DollarSign,
  Package,
  Layers,
  Radio,
  ExternalLink,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralTransportRecord, formatReportValue } from '@/domain/generalTransportReportEngine'
import { useNavigate } from 'react-router-dom'

interface ReportDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: GeneralTransportRecord | null
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  open,
  onOpenChange,
  record,
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('geral')

  if (!record) return null

  const handleOpenFred360 = () => {
    onOpenChange(false)
    navigate(`/tms/fred/transporte/${record.sap_transport_number || record.transport_number}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header Institucional CIAFAL */}
        <DialogHeader className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#005596] text-white text-xs font-mono">
                  {record.center_code}
                </Badge>
                <DialogTitle className="text-lg font-bold text-slate-900 font-mono">
                  Transporte {record.transport_number}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold bg-white">
                  {record.transport_status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {record.center_description} • Rota: {record.itinerary_description} (
                {record.itinerary_code})
              </DialogDescription>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenFred360}
              className="gap-1.5 text-xs text-[#005596] border-[#005596]/30 hover:bg-[#005596]/5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver no Fred 360º
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo com Tabs Operacionais */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4 bg-slate-100 p-1">
              <TabsTrigger value="geral" className="text-xs">
                Dados Gerais & Centro
              </TabsTrigger>
              <TabsTrigger value="balanca" className="text-xs">
                Balança & Pesagens
              </TabsTrigger>
              <TabsTrigger value="tempos" className="text-xs">
                Marcos & Tempos (1 e 2)
              </TabsTrigger>
              <TabsTrigger value="veiculo" className="text-xs">
                Veículo & Capacidade
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Dados Gerais */}
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Centro / Empresa (Pos 1 e 2)
                  </span>
                  <div className="font-semibold text-slate-800 text-sm mt-1">
                    {record.center_code} — {record.center_description}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Organização: {record.sales_organization}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Usuário & Operador SAP (Pos 5)
                  </span>
                  <div className="font-semibold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#005596]" />
                    {record.user_name}
                  </div>
                  <span className="text-[11px] text-slate-400">Responsável pela liberação</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Financeiro do Frete (Pos 10 e 11)
                  </span>
                  <div className="font-semibold text-emerald-700 text-sm mt-1">
                    Frete: {formatReportValue(record.freight_cost, 'currency')}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Pedágio: {formatReportValue(record.toll_cost, 'currency')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Itinerário & Transporte (Pos 18 a 23)
                  </span>
                  <div className="mt-1 space-y-1 text-xs">
                    <div>
                      <strong>Itinerário:</strong> {record.itinerary_code} -{' '}
                      {record.itinerary_description}
                    </div>
                    <div>
                      <strong>Tipo Expedição:</strong> {record.expedition_type}
                    </div>
                    <div>
                      <strong>Tipo Transporte:</strong> {record.transport_type}
                    </div>
                    <div>
                      <strong>Tipo Frete:</strong> {record.freight_type}
                    </div>
                    <div>
                      <strong>Distância estimada:</strong>{' '}
                      {formatReportValue(record.distance_km, 'distance')}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Motorista & Destino Operacional
                  </span>
                  <div className="mt-1 space-y-1 text-xs">
                    <div>
                      <strong>Motorista:</strong> {record.driver_name || 'Não informado'}
                    </div>
                    <div>
                      <strong>Documento:</strong> {record.driver_document || 'Não disponível'}
                    </div>
                    <div>
                      <strong>Transportadora:</strong> {record.carrier_name || 'Frota / Próprio'}
                    </div>
                    <div>
                      <strong>Destino:</strong> {record.destination_city || '—'} /{' '}
                      {record.destination_uf || '—'}
                    </div>
                    <div>
                      <strong>Data Faturamento:</strong>{' '}
                      {formatReportValue(record.invoicing_date, 'date')}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Balança & Pesagens */}
            <TabsContent value="balanca" className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-[#005596]" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Auditoria de Pesagem & Balança
                  </h4>
                  <Badge className={record.has_scale_log ? 'bg-emerald-600' : 'bg-amber-600'}>
                    {record.has_scale_log ? 'Com Registro de Balança' : 'Sem Registro de Balança'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Motivo Balança (Pos 8):</strong> {record.scale_reason}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    PESO BRUTO (Pos 12)
                  </span>
                  <span className="text-base font-bold text-slate-800 font-mono block mt-1">
                    {formatReportValue(record.gross_weight_ton, 'weight')}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] font-bold text-slate-400 block">TARA (Pos 13)</span>
                  <span className="text-base font-bold text-slate-800 font-mono block mt-1">
                    {formatReportValue(record.tare_weight_ton, 'weight')}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    PESO LÍQUIDO (Pos 14)
                  </span>
                  <span className="text-base font-bold text-[#005596] font-mono block mt-1">
                    {formatReportValue(record.net_weight_ton, 'weight')}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    PESO NF (Pos 15)
                  </span>
                  <span className="text-base font-bold text-slate-800 font-mono block mt-1">
                    {formatReportValue(record.nf_weight_ton, 'weight')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">
                    Diferença de Balança vs NF (Pos 16 e 17):
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Tolerância operacional padrão CIAFAL: até 1,5%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-slate-800 block">
                    {formatReportValue(record.diff_weight_ton, 'weight')}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-600">
                    {formatReportValue(record.diff_weight_pct, 'percent')}
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Marcos & Tempos */}
            <TabsContent value="tempos" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Par 1: Encerramento Carregamento */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h5 className="font-bold text-xs text-[#005596] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Marco 1: Carregamento & Coleta
                  </h5>
                  <div className="text-xs space-y-1">
                    <div>
                      <strong>Data Início:</strong> {formatReportValue(record.initial_date, 'date')}{' '}
                      {record.initial_time}
                    </div>
                    <div>
                      <strong>Data Fim (1):</strong> {formatReportValue(record.end_date_1, 'date')}{' '}
                      {record.end_time_1}
                    </div>
                    <div>
                      <strong>Tempo Coleta (Tempo Col - Pos 32):</strong>{' '}
                      {formatReportValue(record.collection_time_min, 'duration')}
                    </div>
                  </div>
                </div>

                {/* Par 2: Encerramento Liberação Fiscal */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h5 className="font-bold text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Marco 2: Liberação & Saída Fiscal
                  </h5>
                  <div className="text-xs space-y-1">
                    <div>
                      <strong>Data Tara:</strong> {formatReportValue(record.tare_date, 'date')}{' '}
                      {record.tare_time}
                    </div>
                    <div>
                      <strong>Data Fim (2):</strong> {formatReportValue(record.end_date_2, 'date')}{' '}
                      {record.end_time_2}
                    </div>
                    <div>
                      <strong>Tempo Total Pátio (Tempo Tot - Pos 35):</strong>{' '}
                      {formatReportValue(record.total_time_min, 'duration')}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Veículo & RFID */}
            <TabsContent value="veiculo" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    ID EXT.1 / PLACA (Pos 9)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {record.external_id_1}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    CAPACIDADE (Pos 36)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {formatReportValue(record.vehicle_capacity_ton, 'weight')}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    OCUPAÇÃO (Pos 41)
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-sm block mt-1">
                    {formatReportValue(record.occupancy_pct, 'percent')}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    FRAÇÕES (Pos 42)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {record.fractions_count} entrega(s)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1 text-xs">
                  <div>
                    <strong>Tipo de Veículo (Pos 37):</strong> {record.vehicle_type}
                  </div>
                  <div>
                    <strong>Tipo de Rodado (Pos 38):</strong> {record.wheel_type}
                  </div>
                  <div>
                    <strong>Tipo de Carroceria (Pos 39):</strong> {record.body_type}
                  </div>
                  <div>
                    <strong>Quantidade de Eixos (Pos 40):</strong> {record.axles_count} eixos
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Radio className="w-4 h-4 text-[#005596]" />
                    Tag RFID / Rastreamento WMS (Pos 43)
                  </div>
                  <div className="font-mono text-slate-700 bg-slate-100 p-1.5 rounded text-[11px]">
                    {record.rfid_code}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Leitura automatizada nos portais de doca
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
