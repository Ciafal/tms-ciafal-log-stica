import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CustomerLogisticInfoEntity } from '@/domain/customerLogisticInfoEngine'
import {
  Building2,
  Package,
  Layers,
  Truck,
  MapPin,
  Clock,
  Calendar,
  FileText,
  ShieldCheck,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  User,
} from 'lucide-react'

interface CustomerLogisticDetailModalProps {
  customer: CustomerLogisticInfoEntity | null
  open: boolean
  onClose: () => void
}

export const CustomerLogisticDetailModal: React.FC<CustomerLogisticDetailModalProps> = ({
  customer,
  open,
  onClose,
}) => {
  if (!customer) return null

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICA':
        return (
          <Badge variant="destructive" className="bg-red-600 text-white font-medium">
            CRÍTICA
          </Badge>
        )
      case 'RESTRITIVA':
        return <Badge className="bg-amber-600 text-white font-medium">RESTRITIVA</Badge>
      case 'ALERTA':
        return <Badge className="bg-yellow-500 text-slate-900 font-medium">ALERTA</Badge>
      case 'INFORMATIVA':
      default:
        return (
          <Badge variant="outline" className="border-blue-300 text-[#002F6C]">
            INFORMATIVA
          </Badge>
        )
    }
  }

  const mat = customer.material_restrictions_json || {}
  const load = customer.load_formation_restrictions_json || {}
  const veh = customer.vehicle_restrictions_json || {}
  const acc = customer.access_restrictions_json || {}
  const dis = customer.discharge_restrictions_json || {}
  const sch = customer.scheduling_restrictions_json || {}
  const doc = customer.documentation_restrictions_json || {}
  const sft = customer.safety_driver_restrictions_json || {}
  const hist = customer.history_changelog_json || []

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6 bg-slate-50">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-[#002F6C]">
                  SAP: {customer.customer_code}
                </span>
                <span className="text-xs text-muted-foreground">
                  Chave: {customer.technical_key}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
                {customer.customer_name}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 flex items-center gap-2 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Recebedor: <strong>{customer.ship_to_code}</strong> - {customer.ship_to_name} (
                  {customer.delivery_city}/{customer.delivery_uf})
                </span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getLevelBadge(customer.highest_restriction_level)}
              <Badge
                variant={customer.is_active ? 'secondary' : 'outline'}
                className={
                  customer.is_active ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500'
                }
              >
                {customer.is_active ? 'Ativa no HUB' : 'Inativa'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* 10 Abas Corporativas */}
        <Tabs defaultValue="resumo" className="w-full mt-4">
          <TabsList className="grid grid-cols-5 md:grid-cols-10 h-auto p-1 bg-slate-200/70 rounded-lg text-xs gap-1">
            <TabsTrigger value="resumo" className="py-2 text-[11px]">
              Resumo
            </TabsTrigger>
            <TabsTrigger value="formacao" className="py-2 text-[11px]">
              Formação
            </TabsTrigger>
            <TabsTrigger value="materiais" className="py-2 text-[11px]">
              Materiais
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="py-2 text-[11px]">
              Veículos
            </TabsTrigger>
            <TabsTrigger value="acesso" className="py-2 text-[11px]">
              Acesso
            </TabsTrigger>
            <TabsTrigger value="descarga" className="py-2 text-[11px]">
              Descarga
            </TabsTrigger>
            <TabsTrigger value="agendamento" className="py-2 text-[11px]">
              Agendamento
            </TabsTrigger>
            <TabsTrigger value="documentacao" className="py-2 text-[11px]">
              Documentação
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="py-2 text-[11px]">
              Segurança
            </TabsTrigger>
            <TabsTrigger value="historico" className="py-2 text-[11px]">
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Resumo */}
          <TabsContent value="resumo" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Identificação Comercial
                </span>
                <div className="mt-2 text-xs space-y-1 text-slate-700">
                  <p>
                    <strong>CNPJ:</strong> {customer.cnpj || 'Não informado'}
                  </p>
                  <p>
                    <strong>Org. Vendas:</strong> {customer.sales_org || '1000'}
                  </p>
                  <p>
                    <strong>Canal / Setor:</strong> {customer.distribution_channel || '10'} /{' '}
                    {customer.sector || '01'}
                  </p>
                  <p>
                    <strong>Centro (Plant):</strong> {customer.plant_code || '1010'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Endereço de Entrega
                </span>
                <div className="mt-2 text-xs space-y-1 text-slate-700">
                  <p>
                    <strong>Endereço:</strong> {customer.delivery_address || 'Não cadastrado'}
                  </p>
                  <p>
                    <strong>Município/UF:</strong> {customer.delivery_city} - {customer.delivery_uf}
                  </p>
                  <p>
                    <strong>CEP:</strong> {customer.delivery_cep || '-'}
                  </p>
                  <p>
                    <strong>Região Logística:</strong> {customer.logistic_region || 'Padrão'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Origem & Auditoria SAP
                </span>
                <div className="mt-2 text-xs space-y-1 text-slate-700">
                  <p>
                    <strong>Função RFC:</strong> {customer.origin_rfc || 'Z_RFC_TMS_INFO_CLIENTE'}
                  </p>
                  <p>
                    <strong>Tabela SAP:</strong> {customer.origin_table || 'ZTMS_INFO_CLIENTE'}
                  </p>
                  <p>
                    <strong>Usuário SAP:</strong> {customer.sap_user || 'SAP_INTERFACE'}
                  </p>
                  <p>
                    <strong>Validade:</strong>{' '}
                    {customer.valid_from
                      ? new Date(customer.valid_from).toLocaleDateString('pt-BR')
                      : 'Indeterminada'}{' '}
                    até{' '}
                    {customer.valid_to
                      ? new Date(customer.valid_to).toLocaleDateString('pt-BR')
                      : 'Indeterminada'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Observações Gerais de Entrega
              </span>
              <p className="mt-2 text-sm text-slate-800 bg-amber-50 p-3 rounded border border-amber-200">
                {customer.observations ||
                  'Nenhuma observação restritiva cadastrada para este recebedor.'}
              </p>
            </div>
          </TabsContent>

          {/* Aba 2: Formação da Carga */}
          <TabsContent value="formacao" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Regras de Consolidação & Compartilhamento
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Carga Exclusiva Apenas:</span>
                    <strong
                      className={load.exclusiveLoadOnly ? 'text-red-600' : 'text-emerald-700'}
                    >
                      {load.exclusiveLoadOnly
                        ? 'SIM (Proibido agrupar)'
                        : 'NÃO (Permite compartilhado)'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Máximo de Pedidos por Carga:</span>
                    <strong>{load.maxOrdersPerLoad || 'Sem limite'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Máximo de Descargas no Veículo:</span>
                    <strong>{load.maxDischargesPerLoad || 'Sem limite'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Separação Física Obrigatória:</span>
                    <strong>
                      {load.physicalSeparationRequired
                        ? `SIM (${load.separationCriteria || 'Por Pedido'})`
                        : 'NÃO'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Limites de Capacidade & Peso
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Limite Total por Carga:</span>
                    <strong className="text-blue-700 font-bold">
                      {load.maxTotalWeightTons
                        ? `${load.maxTotalWeightTons} t`
                        : 'Conforme PBT do veículo'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Limite Máximo por Descarga:</span>
                    <strong>
                      {load.maxWeightPerDischargeKg
                        ? `${(load.maxWeightPerDischargeKg / 1000).toFixed(1)} t (${load.maxWeightPerDischargeKg} kg)`
                        : 'Conforme veículo'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Ordem Obrigatória de Descarga:</span>
                    <strong>
                      {load.mandatoryUnloadingOrder ? 'SIM (Sequência rígida)' : 'Flexível'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Identificação Individual de Fardos:</span>
                    <strong>
                      {load.individualMaterialTagging
                        ? 'SIM (Etiqueta individual)'
                        : 'Romaneio geral'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            {load.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                <strong>Instruções de Montagem:</strong> {load.notes}
              </div>
            )}
          </TabsContent>

          {/* Aba 3: Produtos e Comprimentos */}
          <TabsContent value="materiais" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Restrições Dimensionais
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Comprimento Mínimo Aceito:</span>
                    <strong>{mat.minLengthM ? `${mat.minLengthM} m` : 'Qualquer'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Comprimento Máximo Aceito:</span>
                    <strong className="text-red-700 font-bold">
                      {mat.maxLengthM ? `${mat.maxLengthM} m` : 'Sem limite estrito'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Comprimentos Expressamente Proibidos:</span>
                    <strong className="text-red-600">
                      {mat.forbiddenLengthsM && mat.forbiddenLengthsM.length > 0
                        ? mat.forbiddenLengthsM.map((l) => `${l}m`).join(', ')
                        : 'Nenhum'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Peso Máximo por Unidade/Fardo:</span>
                    <strong>
                      {mat.maxUnitWeightKg ? `${mat.maxUnitWeightKg} kg` : 'Padrão Usina'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Acondicionamento & Proteção
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Empilhamento Permitido:</span>
                    <strong>
                      {mat.stackingAllowed
                        ? `SIM (Máx. ${mat.maxStackingTiers || 3} fiadas)`
                        : 'NÃO (Proibido empilhar)'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Amarração Reforçada:</span>
                    <strong>{mat.requiresSpecialStrapping ? 'Obrigatória' : 'Padrão ANTT'}</strong>
                  </div>
                  <div className="flex flex-col border-b pb-1">
                    <span className="mb-1">Proteções Obrigatórias:</span>
                    <div className="flex flex-wrap gap-1">
                      {mat.mandatoryProtection && mat.mandatoryProtection.length > 0 ? (
                        mat.mandatoryProtection.map((p, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] border"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Lona convencional</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {mat.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <strong>Observações de Materiais:</strong> {mat.notes}
              </div>
            )}
          </TabsContent>

          {/* Aba 4: Veículos */}
          <TabsContent value="veiculos" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Tipos de Veículo Homologados
                </h4>
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">Tipos Aceitos:</span>
                  <div className="flex flex-wrap gap-1">
                    {veh.allowedVehicleTypes && veh.allowedVehicleTypes.length > 0 ? (
                      veh.allowedVehicleTypes.map((t, idx) => (
                        <Badge key={idx} className="bg-emerald-600 text-white text-xs">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        Qualquer veículo padrão homologado CIAFAL
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <span className="text-xs text-slate-500">Tipos Proibidos:</span>
                  <div className="flex flex-wrap gap-1">
                    {veh.forbiddenVehicleTypes && veh.forbiddenVehicleTypes.length > 0 ? (
                      veh.forbiddenVehicleTypes.map((t, idx) => (
                        <Badge
                          key={idx}
                          variant="destructive"
                          className="bg-red-600 text-white text-xs"
                        >
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Nenhum</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Gabaritos & Limites Físicos
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Comprimento Máximo:</span>
                    <strong>{veh.maxLengthM ? `${veh.maxLengthM} m` : 'Livre'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Altura Máxima do Veículo:</span>
                    <strong>{veh.maxHeightM ? `${veh.maxHeightM} m` : 'Padrão Contran'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>PBT Máximo Aceito:</span>
                    <strong>
                      {veh.maxGrossWeightTons ? `${veh.maxGrossWeightTons} t` : 'Livre'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Veículo Obrigatório Específico:</span>
                    <strong className="text-blue-700">
                      {veh.mandatoryVehicleType || 'Não exigido'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            {veh.notes && (
              <div className="p-3 bg-slate-100 border rounded text-xs text-slate-800">
                <strong>Notas de Veículo:</strong> {veh.notes}
              </div>
            )}
          </TabsContent>

          {/* Aba 5: Acesso */}
          <TabsContent value="acesso" className="space-y-4 pt-4">
            <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Restrições Viárias e de Circulação
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                <div className="space-y-2">
                  <p>
                    <strong>Tipo de Acesso Urbano:</strong> {acc.urbanAccessType || 'Acesso Livre'}
                  </p>
                  <p>
                    <strong>Estrada Não Pavimentada (Terra):</strong>{' '}
                    {acc.unpavedRoad ? 'SIM (Atenção em dias de chuva)' : 'NÃO (Asfaltado)'}
                  </p>
                  <p>
                    <strong>Horário Permitido para Tráfego:</strong>{' '}
                    {acc.allowedTimeStart || '07:00'} às {acc.allowedTimeEnd || '18:00'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong>Autorização Prévia Obrigatória:</strong>{' '}
                    {acc.requiresPriorAuthorization
                      ? `SIM (${acc.authorizationLeadTimeHours || 24}h antes)`
                      : 'NÃO'}
                  </p>
                  <p>
                    <strong>Ponto de Referência:</strong> {acc.referencePoint || 'Não informado'}
                  </p>
                  <p>
                    <strong>Restrição Específica de Rua:</strong>{' '}
                    {acc.hasRestrictedStreet
                      ? acc.restrictedStreetDetails
                      : 'Sem restrição viária municipal'}
                  </p>
                </div>
              </div>
              {acc.accessInstructions && (
                <div className="mt-3 p-3 bg-slate-50 border rounded text-xs text-slate-700">
                  <strong>Instruções de Acesso:</strong> {acc.accessInstructions}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba 6: Descarga */}
          <TabsContent value="descarga" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Equipamentos & Modo de Descarga
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Equipamento Principal:</span>
                    <strong className="text-blue-700 font-bold">
                      {dis.dischargeType || 'Padrão'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Equipamento Secundário:</span>
                    <strong>{dis.secondaryDischargeType || 'Não possui'}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Capacidade do Equipamento:</span>
                    <strong>
                      {dis.equipmentCapacityTons
                        ? `${dis.equipmentCapacityTons} t`
                        : 'Não informada'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Lado de Descarga:</span>
                    <strong>{dis.dischargeSide || 'Superior/Lateral'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">Operação de Descarga</h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Tempo Médio Histórico:</span>
                    <strong>
                      {dis.historicalAvgUnloadingTimeMin
                        ? `${dis.historicalAvgUnloadingTimeMin} minutos`
                        : '45 min'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Retirada Obrigatória de Lona:</span>
                    <strong>
                      {dis.requiresTarpRemoval ? 'SIM (Deslonar na entrada)' : 'Conforme instrução'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Sequência Obrigatória:</span>
                    <strong>
                      {dis.mandatoryDischargeSequence ? 'SIM (Seguir ordem de NF)' : 'Livre'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Pontos de Amarração:</span>
                    <strong>
                      {dis.numberOfTieDownPoints ? `${dis.numberOfTieDownPoints} pontos` : 'Padrão'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            {dis.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                <strong>Observações de Descarga:</strong> {dis.notes}
              </div>
            )}
          </TabsContent>

          {/* Aba 7: Agendamento */}
          <TabsContent value="agendamento" className="space-y-4 pt-4">
            <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Regras de Janela & Agendamento
                </h4>
                <Badge
                  variant={sch.requiresScheduling ? 'default' : 'outline'}
                  className={sch.requiresScheduling ? 'bg-amber-600' : ''}
                >
                  {sch.requiresScheduling ? 'Agendamento Obrigatório' : 'Ordem de Chegada'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                <div className="space-y-2">
                  <p>
                    <strong>Obrigatório Antes da Saída (CIAFAL):</strong>{' '}
                    {sch.mandatoryBeforeDeparture
                      ? 'SIM (Exige protocolo antes da portaria)'
                      : 'NÃO'}
                  </p>
                  <p>
                    <strong>Antecedência Mínima:</strong>{' '}
                    {sch.minAdvanceNoticeHours
                      ? `${sch.minAdvanceNoticeHours} horas`
                      : 'Não exigida'}
                  </p>
                  <p>
                    <strong>Canal de Agendamento:</strong>{' '}
                    {sch.communicationChannel || 'Telefone / WhatsApp'}
                  </p>
                  <p>
                    <strong>Tolerância de Atraso:</strong>{' '}
                    {sch.arrivalToleranceMinutes ? `${sch.arrivalToleranceMinutes} min` : '30 min'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong>Janela de Recebimento:</strong> {sch.receivingWindowStart || '08:00'} às{' '}
                    {sch.receivingWindowEnd || '17:00'}
                  </p>
                  <p>
                    <strong>Intervalo de Almoço:</strong> {sch.lunchBreakStart || '12:00'} às{' '}
                    {sch.lunchBreakEnd || '13:00'}
                  </p>
                  <p>
                    <strong>Recebe Sábado / Domingo:</strong>{' '}
                    {sch.acceptsSaturday ? 'Sábado SIM' : 'Sábado NÃO'} /{' '}
                    {sch.acceptsSunday ? 'Domingo SIM' : 'Domingo NÃO'}
                  </p>
                  <p>
                    <strong>Exige Token de Confirmação:</strong>{' '}
                    {sch.requiresConfirmationToken ? 'SIM' : 'NÃO'}
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 border rounded text-xs space-y-1">
                <span className="font-semibold text-slate-900">Contatos do Recebimento:</span>
                <p>
                  Nome: <strong>{sch.contactName || 'Encarregado de Pátio'}</strong>
                </p>
                <p>
                  Telefone: <strong>{sch.contactPhone || '-'}</strong> | WhatsApp:{' '}
                  <strong>{sch.contactWhatsapp || '-'}</strong>
                </p>
                <p>
                  E-mail: <strong>{sch.contactEmail || '-'}</strong>
                </p>
              </div>
            </div>
            {sch.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <strong>Instruções de Agendamento:</strong> {sch.notes}
              </div>
            )}
          </TabsContent>

          {/* Aba 8: Documentação */}
          <TabsContent value="documentacao" className="space-y-4 pt-4">
            <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Documentos Obrigatórios na Entrega
              </h4>
              <div className="flex flex-wrap gap-2">
                {doc.requiredDocuments && doc.requiredDocuments.length > 0 ? (
                  doc.requiredDocuments.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-blue-50 text-blue-900 px-3 py-1.5 rounded border border-blue-200 text-xs font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      <span>{d}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">DANFE e Romaneio Padrão</span>
                )}
              </div>
              {doc.specialAuthorizationRequired && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-medium">
                  Atenção: Exige Autorização Especial e Laudo Físico carimbado junto à carga.
                </div>
              )}
              {doc.notes && (
                <p className="text-xs text-slate-600 mt-2">
                  <strong>Detalhes de Documentação:</strong> {doc.notes}
                </p>
              )}
            </div>
          </TabsContent>

          {/* Aba 9: Segurança & EPIs */}
          <TabsContent value="seguranca" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  EPIs Obrigatórios do Motorista
                </h4>
                <div className="space-y-1.5">
                  {sft.mandatoryEpiList && sft.mandatoryEpiList.length > 0 ? (
                    sft.mandatoryEpiList.map((epi, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{epi}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      EPIs básicos (Capacete, botina e óculos)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  Exigências Operacionais & Integração
                </h4>
                <div className="text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-1">
                    <span>Exige Integração de Segurança:</span>
                    <strong>
                      {sft.requiresSafetyIntegration ? 'SIM (No local ou prévia)' : 'NÃO'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Cadastro Prévio do Motorista:</span>
                    <strong>
                      {sft.requiresDriverPreRegistration ? 'SIM (Antes da chegada)' : 'NÃO'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Ano Mínimo do Veículo:</span>
                    <strong>
                      {sft.minVehicleYear ? `Ano ${sft.minVehicleYear}` : 'Sem restrição de ano'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            {sft.internalRules && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                <strong>Regras Internas de Pátio:</strong> {sft.internalRules}
              </div>
            )}
          </TabsContent>

          {/* Aba 10: Histórico */}
          <TabsContent value="historico" className="space-y-4 pt-4">
            <div className="p-4 bg-white rounded-lg border shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Trilha de Auditoria & Alterações SAP
              </h4>
              {hist.length > 0 ? (
                <div className="space-y-2">
                  {hist.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border rounded text-xs text-slate-700 space-y-1"
                    >
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>{new Date(item.timestamp).toLocaleString('pt-BR')}</span>
                        <span>
                          Usuário: <strong>{item.user}</strong>
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{item.action}</p>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Nenhuma alteração manual registrada. Sincronizado integralmente via RFC{' '}
                  {customer.origin_rfc || 'Z_RFC_TMS_INFO_CLIENTE'}.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
