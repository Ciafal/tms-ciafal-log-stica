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
import { Button } from '@/components/ui/button'
import { SapZsd004Record } from '@/domain/zsd004Engine'
import {
  Truck,
  User,
  Building,
  Layers,
  Scale,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

interface Zsd004DetailModalProps {
  record: SapZsd004Record | null
  isOpen: boolean
  onClose: () => void
  canViewFullSensitiveData: boolean
}

export const Zsd004DetailModal: React.FC<Zsd004DetailModalProps> = ({
  record,
  isOpen,
  onClose,
  canViewFullSensitiveData,
}) => {
  const [showSensitive, setShowSensitive] = React.useState(false)

  if (!record) return null

  const isBlocked = record.status === 'B'
  const isApproved = record.status === 'A'

  // LGPD Masking helpers
  const maskCpf = (cpf?: string) => {
    if (!cpf || cpf === 'Não informado no SAP') return cpf || 'Não informado no SAP'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length !== 11) return cpf
    if (canViewFullSensitiveData && showSensitive) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
    }
    return `***.***.***-${clean.slice(-2)}`
  }

  const maskPhone = (phone?: string) => {
    if (!phone || phone === 'Não informado no SAP') return phone || 'Não informado no SAP'
    const clean = phone.replace(/\D/g, '')
    if (canViewFullSensitiveData && showSensitive) return phone
    if (clean.length >= 8) {
      return `(**) *****-${clean.slice(-4)}`
    }
    return '(**) ****-****'
  }

  const maskAddress = (street?: string, num?: string, district?: string) => {
    if (canViewFullSensitiveData && showSensitive) {
      return `${street || ''}, ${num || 'S/N'} - ${district || ''}`
    }
    return 'Endereço protegido (LGPD - Restrito a operadores autorizados)'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-[#005596] rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Placa: {record.plate}</span>
                  {isBlocked ? (
                    <Badge className="bg-rose-600 text-white hover:bg-rose-700">BLOQUEADO</Badge>
                  ) : isApproved ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                      APROVADO
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                      NÃO INFORMADO
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Centro: <strong>{record.plant}</strong> | Fonte SAP:{' '}
                  <strong>{record.source_mode}</strong> | Chave: {record.technical_key}
                </DialogDescription>
              </div>
            </div>

            {canViewFullSensitiveData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-xs text-slate-600 gap-1.5"
              >
                {showSensitive ? (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                )}
                {showSensitive ? 'Ocultar LGPD' : 'Revelar Dados Pessoais'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de Bloqueio Rígido SAP */}
        {isBlocked && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              Veículo Bloqueado no Cadastro SAP ZSD004
            </div>
            <p className="text-rose-800">
              <strong>Motivo do Bloqueio:</strong>{' '}
              {record.block_reason || 'Motivo não especificado no SAP.'}
            </p>
            <p className="text-[11px] text-rose-600">
              Veículos bloqueados não são elegíveis para o Planejador de Cargas, Mesa de Fretes ou
              despacho operacional.
            </p>
          </div>
        )}

        <Tabs defaultValue="veiculo" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 bg-slate-100 p-1 rounded-lg text-xs">
            <TabsTrigger value="veiculo" className="text-xs">
              <Truck className="w-3.5 h-3.5 mr-1" /> Veículo
            </TabsTrigger>
            <TabsTrigger value="motorista" className="text-xs">
              <User className="w-3.5 h-3.5 mr-1" /> Motorista
            </TabsTrigger>
            <TabsTrigger value="proprietario" className="text-xs">
              <Building className="w-3.5 h-3.5 mr-1" /> Proprietário
            </TabsTrigger>
            <TabsTrigger value="composicao" className="text-xs">
              <Layers className="w-3.5 h-3.5 mr-1" /> Composição
            </TabsTrigger>
            <TabsTrigger value="capacidades" className="text-xs">
              <Scale className="w-3.5 h-3.5 mr-1" /> Capacidades
            </TabsTrigger>
            <TabsTrigger value="situacao" className="text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Situação
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" /> Documentos
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Veículo */}
          <TabsContent value="veiculo" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Placa</span>
                <strong className="text-slate-800 text-sm font-mono">{record.plate}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Marca / Modelo
                </span>
                <span className="text-slate-800 font-semibold">{record.vehicle_brand_model}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Modelo Específico
                </span>
                <span className="text-slate-800">{record.vehicle_model}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cor</span>
                <span className="text-slate-800">{record.vehicle_color}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassi</span>
                <span className="font-mono text-slate-800">{record.vehicle_chassis}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Renavam
                </span>
                <span className="font-mono text-slate-800">{record.vehicle_renavam}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cidade / UF
                </span>
                <span className="text-slate-800">
                  {record.vehicle_city} - {record.vehicle_region}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Ano Fab. / Modelo
                </span>
                <span className="text-slate-800">
                  {record.vehicle_year_fab} / {record.vehicle_year_model}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código ANTT (Veículo)
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.vehicle_antt}</span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 2: Motorista */}
          <TabsContent value="motorista" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Nome do Motorista
                </span>
                <strong className="text-slate-900 text-sm">{record.driver_name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CPF</span>
                <span className="font-mono text-slate-800 font-bold">
                  {maskCpf(record.driver_cpf)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  RG / Documento
                </span>
                <span className="font-mono text-slate-800">
                  {canViewFullSensitiveData && showSensitive
                    ? record.driver_document
                    : '*** protegido ***'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Órgão / UF Emissor
                </span>
                <span className="text-slate-800">
                  {record.driver_issuer_org} / {record.driver_issuer_state}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CNH</span>
                <span className="font-mono text-slate-800 font-bold">{record.driver_cnh}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Telefone Principal
                </span>
                <span className="font-mono text-slate-800">{maskPhone(record.driver_phone)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Celular
                </span>
                <span className="font-mono text-slate-800">{maskPhone(record.driver_mobile)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">E-mail</span>
                <span className="text-slate-800">{record.driver_email}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Endereço Residencial
                </span>
                <span className="text-slate-800">
                  {maskAddress(record.driver_street, record.driver_number, record.driver_district)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CEP</span>
                <span className="font-mono text-slate-800">{record.driver_zipcode}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Data Nascimento / Est. Civil
                </span>
                <span className="text-slate-800">
                  {canViewFullSensitiveData && showSensitive ? record.driver_birth_date : '***'} (
                  {record.driver_marital_status})
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Vencimento CNH
                </span>
                <span className="text-slate-800">{record.driver_cnh_expiration}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  INSS / Categoria Autônomo
                </span>
                <span className="text-slate-800">
                  {record.driver_inss_registry} / {record.driver_autonomous_category}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 3: Proprietário / Transportador */}
          <TabsContent value="proprietario" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Razão Social / Nome Proprietário
                </span>
                <strong className="text-slate-900 text-sm">{record.owner_name}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo Proprietário
                </span>
                <span className="text-slate-800 font-semibold">{record.owner_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  CNPJ / CPF
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.owner_cnpj}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Inscrição Estadual
                </span>
                <span className="font-mono text-slate-800">{record.owner_state_registration}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Inscrição Municipal / CEI
                </span>
                <span className="text-slate-800">
                  {record.owner_municipal_registration} / {record.owner_cei}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Telefone Proprietário
                </span>
                <span className="font-mono text-slate-800">{record.owner_phone}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cidade do Proprietário
                </span>
                <span className="text-slate-800">{record.owner_city}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  CEP Proprietário
                </span>
                <span className="font-mono text-slate-800">{record.owner_zipcode}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Endereço do Proprietário
                </span>
                <span className="text-slate-800">
                  {record.owner_street}, {record.owner_number} - {record.owner_district}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 4: Composição do Veículo */}
          <TabsContent value="composicao" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa da Carreta
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.trailer_plate}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  ANTT da Carreta
                </span>
                <span className="font-mono text-slate-800 font-bold">{record.trailer_antt}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Região / UF Carreta
                </span>
                <span className="text-slate-800">{record.trailer_region}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo de Rodado
                </span>
                <span className="text-slate-800">{record.wheel_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo Carroceria
                </span>
                <span className="text-slate-800 font-semibold">{record.body_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Qtd. Eixos
                </span>
                <span className="text-slate-800 font-bold">
                  {record.axles_count || 'Não informado'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa Auxiliar 1
                </span>
                <span className="font-mono text-slate-800">{record.aux_plate_1}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  ANTT Auxiliar 1
                </span>
                <span className="font-mono text-slate-800">{record.aux_antt_1}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Placa Auxiliar 2 / ANTT 2
                </span>
                <span className="font-mono text-slate-800">
                  {record.aux_plate_2} ({record.aux_antt_2})
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 5: Capacidades */}
          <TabsContent value="capacidades" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="text-[#005596] block text-[10px] uppercase font-bold">
                  Capacidade KG
                </span>
                <strong className="text-xl text-[#005596] font-mono">
                  {record.capacity_kg ? record.capacity_kg.toLocaleString('pt-BR') : '0'} kg
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Capacidade M³
                </span>
                <strong className="text-xl text-slate-800 font-mono">
                  {record.capacity_m3 ? record.capacity_m3.toLocaleString('pt-BR') : '0'} m³
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tara</span>
                <strong className="text-xl text-slate-800 font-mono">
                  {record.tare_kg ? record.tare_kg.toLocaleString('pt-BR') : '0'} kg
                </strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Tipo de Veículo
                </span>
                <span className="text-slate-800 font-semibold">{record.vehicle_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código Fornecedor SAP
                </span>
                <span className="font-mono text-slate-800">{record.supplier_code}</span>
              </div>
            </div>
          </TabsContent>

          {/* Aba 6: Situação Cadastral */}
          <TabsContent value="situacao" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Status SAP
                </span>
                <div className="mt-1">
                  {isBlocked ? (
                    <Badge className="bg-rose-600 text-white">BLOQUEADO (B)</Badge>
                  ) : isApproved ? (
                    <Badge className="bg-emerald-600 text-white">APROVADO (A)</Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white">NÃO INFORMADO</Badge>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Integridade Cadastral
                </span>
                <span className="font-semibold text-slate-800 uppercase">
                  {record.integrity_status}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Data Último Frete
                </span>
                <span className="text-slate-800">{record.last_freight_date}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Motivo do Bloqueio
                </span>
                <span className="text-slate-800">
                  {record.block_reason || 'Nenhum bloqueio registrado.'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Código TOTVS
                </span>
                <span className="font-mono text-slate-800">{record.totvs_code}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cta. Conciliação / Tesouraria
                </span>
                <span className="text-slate-800">
                  {record.reconciliation_account} / {record.treasury_admin_group}
                </span>
              </div>
            </div>

            {record.validation_issues && record.validation_issues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3">
                <span className="text-amber-800 font-bold block mb-1">
                  Pendências / Inconsistências Identificadas:
                </span>
                <ul className="list-disc pl-5 text-amber-900 space-y-0.5">
                  {record.validation_issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* Aba 7: Documentos */}
          <TabsContent value="documentos" className="space-y-3 pt-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">CNH Anexada</strong>
                  <span className="text-[11px] text-slate-500">
                    Comprovante de CNH do motorista
                  </span>
                </div>
                {record.cnh_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Documento Veículo Anexado</strong>
                  <span className="text-[11px] text-slate-500">CRLV / Certificado de Registro</span>
                </div>
                {record.vehicle_doc_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <strong className="block text-slate-800">Contrato Anexado</strong>
                  <span className="text-[11px] text-slate-500">Termo de Prestação de Serviços</span>
                </div>
                {record.contract_attached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
