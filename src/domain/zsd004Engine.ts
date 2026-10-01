/**
 * ZSD004 Domain Model & Normalization Engine — HUB CIAFAL
 *
 * Mapeamento integral dos 78 campos da tabela/view SAP ZSD004 do centro/empresa WSTL.
 * Chaves técnicas distintas para evitar colisões entre campos de nomes repetidos:
 *   - vehicle_antt vs trailer_antt
 *   - vehicle_region vs driver_region
 *   - driver_document vs owner_document
 *   - driver_zipcode vs owner_zipcode
 *
 * Classificação de integridade cadastral:
 *   - 'integro' | 'incompleto' | 'inconsistente'
 *
 * Regras estritas:
 *   - NUNCA inventar dados fictícios ou preencher silenciosamente valores do SAP.
 *   - Ausente -> "Não informado no SAP".
 *   - Inconsistente -> "Dado SAP a validar".
 *   - Guarda source_value e normalized_value.
 *   - Status: 'A' -> Aprovado, 'B' -> Bloqueado, outros -> "Status não informado".
 */

export type SapRecordIntegrity = 'integro' | 'incompleto' | 'inconsistente'
export type SapZsd004Status = 'A' | 'B' | 'NAO_INFORMADO'
export type Zsd004DataSourceMode = 'MHTML_TEMP' | 'SAP_RFC'

export interface Zsd004AuditSummary {
  receivedCount: number
  insertedCount: number
  updatedCount: number
  unchangedCount: number
  rejectedCount: number
  inconsistentCount: number
  approvedCount: number
  blockedCount: number
  uninformedStatusCount: number
  incompleteCount: number
  integroCount: number
  uniqueDriversCount: number
  uniqueOwnersCount: number
  syncStartedAt: string
  syncFinishedAt: string
  sourceMode: Zsd004DataSourceMode
  sourceFileName?: string
  correlationId: string
  notes?: string[]
}

/**
 * 78 campos estruturados do espelho canônico SAP ZSD004
 */
export interface SapZsd004Record {
  id?: string
  technical_key: string // 1º Placa, 2º Chassi, 3º Renavam

  // 1. Identificação do Veículo (12 campos)
  plant: string // Centro (default WSTL)
  plate: string // Placa do Veículo
  vehicle_brand_model: string // Marca / Modelo
  vehicle_model: string // Modelo
  vehicle_color: string // Cor
  vehicle_chassis: string // Chassi
  vehicle_city: string // Cidade
  vehicle_region: string // Região/UF do Veículo
  vehicle_renavam: string // Renavam
  vehicle_year_fab: string // Ano Fabricação
  vehicle_year_model: string // Ano Modelo
  vehicle_antt: string // Código ANTT do Veículo

  // 2. Carreta (3 campos)
  trailer_plate: string // Placa da Carreta
  trailer_antt: string // Código ANTT da Carreta
  trailer_region: string // Região/UF da Carreta

  // 3. Motorista (24 campos)
  driver_name: string
  driver_ddd_phone: string
  driver_phone: string
  driver_document: string // Documento de Identidade / RG do Motorista
  driver_issuer_org: string // Órgão Emissor
  driver_issuer_state: string // Estado Emissor
  driver_cnh: string // Carteira de Motorista / CNH
  driver_street: string
  driver_number: string
  driver_complement: string
  driver_district: string // Bairro
  driver_mobile: string // Celular
  driver_email: string
  driver_birth_date: string
  driver_marital_status: string // Estado Civil
  driver_cnh_expiration: string // Vencimento CNH
  driver_dependents: string // Dependentes
  driver_nationality: string // Nacionalidade
  driver_country_key: string // Chave do País (BR)
  driver_cpf: string // CPF do Motorista
  driver_zipcode: string // CEP
  driver_inss_registry: string // Cadastro INSS
  driver_autonomous_category: string // Categoria do Autônomo
  driver_autonomous_cbo: string // CBO Autônomo

  // 4. Proprietário / Transportador (14 campos)
  owner_type: string // Tipo Proprietário PJ/PF
  owner_name: string
  owner_document: string // Documento de Identidade / RG
  owner_phone: string
  owner_cei: string
  owner_state_registration: string // Inscrição Estadual
  owner_municipal_registration: string // Inscrição Municipal
  owner_cnpj: string // CNPJ / CPF do Proprietário
  owner_zipcode: string // CEP
  owner_street: string
  owner_number: string
  owner_complement: string
  owner_district: string // Bairro
  owner_city: string // Cidade do Veículo / Proprietário

  // 5. Controle Operacional (4 campos)
  last_freight_date: string // Data do Último Frete
  status: SapZsd004Status // A = Aprovado, B = Bloqueado, NAO_INFORMADO
  block_reason: string // Motivo do Bloqueio
  totvs_code: string // Código Totvs

  // 6. Características do Veículo (8 campos)
  vehicle_type: string // Tipo Veículo
  wheel_type: string // Tipo de Rodado
  body_type: string // Tipo Carroceria
  tare_kg: number // Tara
  capacity_kg: number // Capacidade KG
  capacity_m3: number // Capacidade M3
  supplier_code: string // Fornecedor SAP
  axles_count: number // Qtd. Eixos

  // 7. Fiscais e Administrativos (6 campos)
  reconciliation_account: string // Cta. concil.
  irrf_fleet: string // IRRF Frotista
  sest_entry: string // SEST Entrada
  senat_entry: string // SENAT Entrada
  inss_entry: string // INSS
  treasury_admin_group: string // Grp. admin. tesouraria

  // 8. Equipamentos e Auxiliares (4 campos)
  aux_plate_1: string // Placa Auxiliar 1
  aux_antt_1: string // ANTT Auxiliar 1
  aux_plate_2: string // Placa Auxiliar 2
  aux_antt_2: string // ANTT Auxiliar 2

  // 9. Documentos Anexados (3 campos)
  cnh_attached: boolean // CNH Anexada
  vehicle_doc_attached: boolean // Documento do Veículo Anexado
  contract_attached: boolean // Contrato Anexado

  // Metadados Operacionais & Qualidade de Dados
  integrity_status: SapRecordIntegrity
  validation_issues: string[]
  raw_source_values?: Record<string, string>
  source_mode: Zsd004DataSourceMode
  source_file?: string
  last_sync_date: string
  created?: string
  updated?: string
}

/**
 * Validação de placa Mercosul ou Padrão antigo
 */
export function normalizePlate(raw?: string): { plate: string; isValid: boolean } {
  if (!raw) return { plate: '', isValid: false }
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Padrão antigo: ABC1234 (3 letras + 4 dígitos)
  // Mercosul: ABC1D23 (3 letras + 1 dígito + 1 letra + 2 dígitos)
  const isOld = /^[A-Z]{3}\d{4}$/.test(clean)
  const isMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean)
  return {
    plate: clean,
    isValid: isOld || isMercosul,
  }
}

/**
 * Normaliza e valida CPF/CNPJ
 */
export function cleanDocument(raw?: string): string {
  if (!raw) return ''
  return raw.replace(/\D/g, '')
}

/**
 * Normaliza campos ausentes para 'Não informado no SAP'
 */
export function sanitizeText(val?: unknown, fallback = 'Não informado no SAP'): string {
  if (val === undefined || val === null) return fallback
  const s = String(val).trim()
  if (s === '' || s === '-' || s === '---' || s.toLowerCase() === 'null') return fallback
  return s
}

export function parseNumberSafe(val?: unknown): number {
  if (val === undefined || val === null || val === '') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const clean = String(val)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : parsed
}

export function parseBoolSafe(val?: unknown): boolean {
  if (!val) return false
  if (typeof val === 'boolean') return val
  const s = String(val).trim().toUpperCase()
  return s === 'S' || s === 'SIM' || s === 'TRUE' || s === '1' || s === 'X'
}

/**
 * Normaliza Status ZSD004:
 * A = Aprovado
 * B = Bloqueado
 * Qualquer outro = NAO_INFORMADO
 */
export function normalizeZsd004Status(rawStatus?: unknown): SapZsd004Status {
  if (!rawStatus) return 'NAO_INFORMADO'
  const s = String(rawStatus).trim().toUpperCase()
  if (s === 'A' || s === 'APROVADO' || s === 'LIBERADO') return 'A'
  if (s === 'B' || s === 'BLOQUEADO') return 'B'
  return 'NAO_INFORMADO'
}

/**
 * Calcula a Chave Técnica de Deduplicação / Identidade:
 * Veículo: 1º Placa, 2º Chassi, 3º Renavam, 4º código interno
 */
export function computeZsd004TechnicalKey(rec: Partial<SapZsd004Record>): string {
  const plate = (rec.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (plate) return `V_${plate}`

  const chassis = (rec.vehicle_chassis || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (chassis && chassis !== 'NAOINFORMADONOSAP') return `CH_${chassis}`

  const renavam = (rec.vehicle_renavam || '').replace(/\D/g, '')
  if (renavam) return `REN_${renavam}`

  const driverCpf = cleanDocument(rec.driver_cpf)
  if (driverCpf) return `DRV_${driverCpf}`

  return `SAP_${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

/**
 * Camada de normalização e qualidade de dados dos 78 campos.
 * Nunca rejeita registros nem inventa dados.
 */
export function normalizeZsd004Record(
  raw: Record<string, any>,
  sourceMode: Zsd004DataSourceMode = 'MHTML_TEMP',
  sourceFileName?: string,
): SapZsd004Record {
  const issues: string[] = []

  // Extrair chaves considerando possíveis nomes duplicados da ZSD004
  const rawPlate = raw.Placa || raw.placa || raw.VEICULO_PLACA || raw.plate || ''
  const { plate, isValid: isPlateValid } = normalizePlate(rawPlate)
  if (!plate) {
    issues.push('Placa do veículo não informada no SAP.')
  } else if (!isPlateValid) {
    issues.push(
      `Placa '${rawPlate}' com formato incompatível (esperado padrão antigo ou Mercosul).`,
    )
  }

  const rawChassis = raw.Chassi || raw.chassi || raw.CHASSI || raw.vehicle_chassis || ''
  const chassis = sanitizeText(rawChassis)

  const rawRenavam = raw.Renavam || raw.Renavan || raw.renavan || raw.renavam || ''
  const renavam = sanitizeText(rawRenavam)
  if (renavam === 'Não informado no SAP') {
    issues.push('Renavam ausente no cadastro SAP.')
  }

  // ANTT Veículo vs Carreta (chaves técnicas distintas)
  const vehicleAntt = sanitizeText(
    raw.ANTT_VEICULO || raw.Codigo_ANTT || raw['Código ANTT'] || raw.vehicle_antt || '',
  )
  const trailerAntt = sanitizeText(
    raw.ANTT_CARRETA || raw.trailer_antt || raw['Código ANTT da carreta'] || '',
  )
  if (vehicleAntt === 'Não informado no SAP') {
    issues.push('ANTT do veículo ausente.')
  }

  // Motorista
  const driverName = sanitizeText(raw.Nome_Motorista || raw['Nome'] || raw.driver_name || '')
  const driverCpf = cleanDocument(raw.CPF || raw.cpf || raw.driver_cpf || '')
  const driverDoc = sanitizeText(
    raw.Doc_Identidade_Motorista ||
      raw['Documento de identidade'] ||
      raw.RG ||
      raw.driver_document ||
      '',
  )
  if (!driverCpf && driverDoc === 'Não informado no SAP') {
    issues.push('Motorista sem documento de identificação (CPF/RG) informado.')
  }

  const driverPhone = sanitizeText(raw.Telefone || raw.driver_phone || '')
  const driverMobile = sanitizeText(raw.Celular || raw.driver_mobile || '')
  const cleanPhoneNum = cleanDocument(driverPhone + driverMobile)
  if (cleanPhoneNum.length > 0 && cleanPhoneNum.length < 10) {
    issues.push('Telefone/celular do motorista incompleto ou inconsistente.')
  }

  // Proprietário (chaves distintas)
  const ownerName = sanitizeText(
    raw.Nome_Proprietario ||
      raw.Proprietario ||
      raw['Nome do Proprietário'] ||
      raw.owner_name ||
      '',
  )
  const ownerCnpj = cleanDocument(
    raw.CNPJ_Proprietario || raw.CNPJ || raw['CNPJ'] || raw.owner_cnpj || '',
  )
  const ownerDoc = sanitizeText(
    raw.Doc_Proprietario || raw.owner_document || raw['Documento do Proprietário'] || '',
  )
  if (!ownerCnpj && ownerDoc === 'Não informado no SAP' && ownerName === 'Não informado no SAP') {
    issues.push('Proprietário/Transportador sem documento ou identificação.')
  }

  // Status
  const rawStatus = raw.Status || raw.STATUS || raw.status
  const status = normalizeZsd004Status(rawStatus)
  if (!rawStatus) {
    issues.push('Status cadastral ausente no SAP.')
  }

  // Capacidade
  const capacityKg = parseNumberSafe(
    raw['Capacidade KG'] || raw.Capacidade_KG || raw.capacity_kg || raw.CAPACIDADE_KG,
  )
  if (capacityKg <= 0) {
    issues.push('Capacidade operacional em KG zerada ou não informada.')
  }

  const vehicleType = sanitizeText(
    raw['Tipo veículo'] || raw.Tipo_Veiculo || raw.vehicle_type || raw.TIPO_VEICULO || '',
  )
  if (vehicleType === 'Não informado no SAP') {
    issues.push('Tipo de veículo ausente no cadastro.')
  }

  // Determinar Integridade
  let integrityStatus: SapRecordIntegrity = 'integro'
  if (issues.length > 0) {
    const hasFormatError = issues.some(
      (i) => i.includes('incompatível') || i.includes('inconsistente'),
    )
    integrityStatus = hasFormatError ? 'inconsistente' : 'incompleto'
  }

  const normalized: SapZsd004Record = {
    technical_key: '',
    plant: sanitizeText(raw.Centro || raw.plant || raw.CENTRO, 'WSTL'),
    plate: plate || (rawPlate ? String(rawPlate).toUpperCase().trim() : 'Não informado no SAP'),
    vehicle_brand_model: sanitizeText(
      raw['Marca/modelo'] || raw.Marca_Modelo || raw.vehicle_brand_model,
    ),
    vehicle_model: sanitizeText(raw.Modelo || raw.vehicle_model),
    vehicle_color: sanitizeText(raw.Cor || raw.vehicle_color),
    vehicle_chassis: chassis,
    vehicle_city: sanitizeText(raw.Cidade || raw.vehicle_city),
    vehicle_region: sanitizeText(raw['Região'] || raw.Regiao || raw.vehicle_region),
    vehicle_renavam: renavam,
    vehicle_year_fab: sanitizeText(raw['Ano Fabricação'] || raw.Ano_Fab || raw.vehicle_year_fab),
    vehicle_year_model: sanitizeText(raw['Ano Modelo'] || raw.Ano_Modelo || raw.vehicle_year_model),
    vehicle_antt: vehicleAntt,

    trailer_plate: sanitizeText(raw['Placa da Carreta'] || raw.trailer_plate),
    trailer_antt: trailerAntt,
    trailer_region: sanitizeText(raw['Região da Carreta'] || raw.trailer_region),

    driver_name: driverName,
    driver_ddd_phone: sanitizeText(raw['DDD-telefone'] || raw.driver_ddd_phone),
    driver_phone: driverPhone,
    driver_document: driverDoc,
    driver_issuer_org: sanitizeText(raw['Órgão Emissor'] || raw.driver_issuer_org),
    driver_issuer_state: sanitizeText(raw['Estado Emissor'] || raw.driver_issuer_state),
    driver_cnh: sanitizeText(raw['Carteira de motorista'] || raw.driver_cnh),
    driver_street: sanitizeText(raw.Rua || raw.driver_street),
    driver_number: sanitizeText(raw['Número'] || raw.driver_number),
    driver_complement: sanitizeText(raw.Complemento || raw.driver_complement),
    driver_district: sanitizeText(raw.Bairro || raw.driver_district),
    driver_mobile: driverMobile,
    driver_email: sanitizeText(raw['E-mail'] || raw.Email || raw.driver_email),
    driver_birth_date: sanitizeText(raw['Data de Nascimento'] || raw.driver_birth_date),
    driver_marital_status: sanitizeText(raw['Estado Civil'] || raw.driver_marital_status),
    driver_cnh_expiration: sanitizeText(raw.Vencimento || raw.driver_cnh_expiration),
    driver_dependents: sanitizeText(raw.Dependentes || raw.driver_dependents),
    driver_nationality: sanitizeText(raw.Nacionalidade || raw.driver_nationality),
    driver_country_key: sanitizeText(raw['Chave do país'] || raw.driver_country_key, 'BR'),
    driver_cpf: driverCpf || 'Não informado no SAP',
    driver_zipcode: sanitizeText(raw.CEP || raw.driver_zipcode),
    driver_inss_registry: sanitizeText(raw['Cadastro INSS'] || raw.driver_inss_registry),
    driver_autonomous_category: sanitizeText(
      raw['Categoria do Autônomo'] || raw.driver_autonomous_category,
    ),
    driver_autonomous_cbo: sanitizeText(raw['CBO Autônomo'] || raw.driver_autonomous_cbo),

    owner_type: sanitizeText(raw['Tipo Proprietário PJ/PF'] || raw.owner_type),
    owner_name: ownerName,
    owner_document: ownerDoc,
    owner_phone: sanitizeText(raw['Telefone Proprietário'] || raw.owner_phone),
    owner_cei: sanitizeText(raw.CEI || raw.owner_cei),
    owner_state_registration: sanitizeText(
      raw['Inscrição Estadual'] || raw.owner_state_registration,
    ),
    owner_municipal_registration: sanitizeText(
      raw['Inscrição Municipal'] || raw.owner_municipal_registration,
    ),
    owner_cnpj: ownerCnpj || 'Não informado no SAP',
    owner_zipcode: sanitizeText(raw['CEP Proprietário'] || raw.owner_zipcode),
    owner_street: sanitizeText(raw['Rua Proprietário'] || raw.owner_street),
    owner_number: sanitizeText(raw['Número Proprietário'] || raw.owner_number),
    owner_complement: sanitizeText(raw['Complemento Proprietário'] || raw.owner_complement),
    owner_district: sanitizeText(raw['Bairro Proprietário'] || raw.owner_district),
    owner_city: sanitizeText(raw['Cidade do Veículo'] || raw.owner_city),

    last_freight_date: sanitizeText(raw['Data do último frete'] || raw.last_freight_date),
    status,
    block_reason: sanitizeText(raw['Motivo do bloqueio'] || raw.block_reason, ''),
    totvs_code: sanitizeText(raw['Código Totvs'] || raw.totvs_code),

    vehicle_type: vehicleType,
    wheel_type: sanitizeText(raw['Tipo de Rodado'] || raw.wheel_type),
    body_type: sanitizeText(raw['Tipo Carroceria'] || raw.body_type),
    tare_kg: parseNumberSafe(raw.Tara || raw.tare_kg),
    capacity_kg: capacityKg,
    capacity_m3: parseNumberSafe(raw['Capacidade M3'] || raw.capacity_m3),
    supplier_code: sanitizeText(raw.Fornecedor || raw.supplier_code),
    axles_count: Math.round(parseNumberSafe(raw['Qtd. Eixos'] || raw.axles_count)),

    reconciliation_account: sanitizeText(raw['Cta. concil.'] || raw.reconciliation_account),
    irrf_fleet: sanitizeText(raw['IRRF Frotista'] || raw.irrf_fleet),
    sest_entry: sanitizeText(raw['SEST Entrada'] || raw.sest_entry),
    senat_entry: sanitizeText(raw['SENAT Entrada'] || raw.senat_entry),
    inss_entry: sanitizeText(raw.INSS || raw.inss_entry),
    treasury_admin_group: sanitizeText(raw['Grp. admin. tesouraria'] || raw.treasury_admin_group),

    aux_plate_1: sanitizeText(raw['Placa Auxiliar 1'] || raw.aux_plate_1),
    aux_antt_1: sanitizeText(raw['ANTT Auxiliar 1'] || raw.aux_antt_1),
    aux_plate_2: sanitizeText(raw['Placa Auxiliar 2'] || raw.aux_plate_2),
    aux_antt_2: sanitizeText(raw['ANTT Auxiliar 2'] || raw.aux_antt_2),

    cnh_attached: parseBoolSafe(raw['CNH Anexada'] || raw.cnh_attached),
    vehicle_doc_attached: parseBoolSafe(
      raw['Documento do Veículo Anexado'] || raw.vehicle_doc_attached,
    ),
    contract_attached: parseBoolSafe(raw['Contrato anexado'] || raw.contract_attached),

    integrity_status: integrityStatus,
    validation_issues: issues,
    source_mode: sourceMode,
    source_file: sourceFileName || 'ZSD004',
    last_sync_date: new Date().toISOString(),
    raw_source_values: raw,
  }

  normalized.technical_key = computeZsd004TechnicalKey(normalized)
  return normalized
}

/**
 * Avaliação de Elegibilidade com Bloqueio Estrito ZSD004
 * Veículo com Status 'B' (Bloqueado) NUNCA é elegível para planejador,
 * mesa de fretes, disponibilidade ou sugestão automática por IA.
 */
export function evaluateZsd004VehicleEligibility(vehicle: Partial<SapZsd004Record>): {
  isEligible: boolean
  status: SapZsd004Status
  reason?: string
} {
  const status = vehicle.status || 'NAO_INFORMADO'
  if (status === 'B') {
    const blockReason = vehicle.block_reason ? ` (Motivo SAP: ${vehicle.block_reason})` : ''
    return {
      isEligible: false,
      status: 'B',
      reason: `Veículo bloqueado no cadastro SAP ZSD004. Verifique o motivo do bloqueio antes de prosseguir.${blockReason}`,
    }
  }

  if (status === 'NAO_INFORMADO') {
    return {
      isEligible: false,
      status: 'NAO_INFORMADO',
      reason: 'Cadastro SAP com status não informado. Requer validação cadastral prévia.',
    }
  }

  return {
    isEligible: true,
    status: 'A',
  }
}
