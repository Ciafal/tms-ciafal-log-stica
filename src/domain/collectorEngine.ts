// TMS CIAFAL Logística — Domínio do Coletor Móvel (Chainway C72 / ZWMT001 / ZWMR001)
// Módulo: TMS > Expedição > Coletor
// Reprodução no HUB CIAFAL da transação SAP ZWMT001 / programa ZWMR001

export interface ShipmentBarcodeResult {
  transportNumber?: string // TKNUM normalizado (10 chars / limpo)
  deliveryNumber?: string // VBELN normalizado (10 chars / limpo)
  deliveryItem?: string // POSNR normalizado (6 chars / limpo)
  rawValue: string
  recognizedFormat: 'TKNUM' | 'VBELN' | 'VBELN_POSNR' | 'COMBINED' | 'UNKNOWN'
  valid: boolean
  validationMessage?: string
}

export interface ProductBarcodeResult {
  rawBarcode: string
  weight: number // Peso em t ou kg conforme conversão
  weightKg: number // Sempre peso em kg
  batch: string // Lote (9 ou 10 caracteres)
  batchNormalized: string // Lote sem '0' inicial quando aplicável para busca alternativa
  material: string // Código do material restante
  valid: boolean
  validationMessage?: string
}

export type CollectorItemStatus = 'PENDENTE' | 'PARCIAL' | 'CONCLUIDO' | 'ERRO'

export interface CollectorDeliveryItem {
  itemNumber: string // POSNR (ex: "000010" ou "10")
  materialCode: string // MATNR
  materialDescription: string // MAKTX
  plannedWeightKg: number // LIPS-NTGEW / BRGEW
  collectedWeightKg: number // Soma dos lotes confirmados
  balanceKg: number // planned - collected
  batchesCount: number // Quantidade de lotes coletados
  status: CollectorItemStatus
  isMainItem: boolean // LIPS-UECHA vazio
  uecha?: string // Sub-item de lote no SAP
  storageLocation: string // LGORT (deve ser DP34)
  percentage: number
}

export interface CollectorDelivery {
  deliveryNumber: string // VBELN
  transportNumber: string // TKNUM
  customerCode: string // KUNAG / KUNNR
  customerName: string // KNA1-NAME1
  plannedWeightKg: number
  collectedWeightKg: number
  percentageLoaded: number
  pickingCompleted: boolean // VBUK-KOSTK === 'C'
  items: CollectorDeliveryItem[]
  status: CollectorItemStatus
}

export interface CollectorTransport {
  transportNumber: string // TKNUM (ex: "100482910")
  capacityKg: number // VTTK-ADD01
  plannedWeightKg: number
  collectedWeightKg: number
  percentageLoaded: number
  deliveriesCount: number
  deliveriesCompleted: number
  tareWeightKg: number // VTTK-DAREG
  isFinished: boolean // VTTK-STLAD
  finishedAt?: string
  startedAt?: string
  operatorName?: string
  operatorMatricula?: string
  deliveries: CollectorDelivery[]
}

export interface ScannedLotReading {
  id: string
  rawBarcode: string
  material: string
  batch: string
  weightKg: number
  status: 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO_SAP' | 'ERRO'
  message: string
  transferOrderNumber?: string // TANUM
  timestamp: string
  deliveryNumber: string
  itemNumber: string
  storageBin?: string
  operatorMatricula?: string
}

export interface ShippingJustificationOption {
  code: string
  label: string
}

export interface DeliveryJustificationItem {
  tknum: string
  vbeln: string
  posnr: string
  materialCode: string
  materialDescription: string
  plannedWeightKg: number
  collectedWeightKg: number
  percentage: number
  belowMinimum: boolean
  justificationCode?: string
  justificationNotes?: string
}

/**
 * Normaliza número do transporte/remessa removendo caracteres não numéricos
 */
export function sanitizeSapNumber(raw: string): string {
  if (!raw) return ''
  return raw.replace(/\D/g, '')
}

/**
 * Formata número SAP para o tamanho canônico com zeros à esquerda
 */
export function padSapNumber(num: string, length = 10): string {
  const clean = sanitizeSapNumber(num)
  if (!clean) return ''
  if (clean.length >= length) return clean
  return clean.padStart(length, '0')
}

/**
 * Parser de código de barras de remessa / transporte
 * Reproduz ZF_PREPARA_NRO_FORNECIMENTO (ABAP)
 * Suporta formatos múltiplos gerados ou lidos pelo Chainway C72:
 * 1. Remessa pura de 8 a 10 dígitos (ex: 80001234, 0080001234)
 * 2. Remessa + Item (ex: 80001234000010 ou 80001234-10)
 * 3. Transporte prefixado TK ou número puro de 6 a 10 dígitos (ex: 100482901)
 * 4. Padrões com separadores (ex: "80001234/10" ou "TK:100482901")
 */
export function parseShipmentBarcode(rawValue: string): ShipmentBarcodeResult {
  if (!rawValue || typeof rawValue !== 'string') {
    return {
      rawValue: rawValue || '',
      recognizedFormat: 'UNKNOWN',
      valid: false,
      validationMessage: 'Código da remessa não reconhecido.',
    }
  }

  const trimmed = rawValue.trim()
  if (trimmed.length < 3) {
    return {
      rawValue: trimmed,
      recognizedFormat: 'UNKNOWN',
      valid: false,
      validationMessage: 'Código da remessa não reconhecido.',
    }
  }

  // Padrão 1: Prefixo TK / TRANSPORTE (ex: TK100482901, TK:100482901, TR-100482901)
  const tkMatch = trimmed.match(/^(?:TK|TR|TRANSP|TKNUM)[:\s\-_]?(\d{3,10})$/i)
  if (tkMatch) {
    const cleanTk = tkMatch[1]
    return {
      transportNumber: cleanTk.padStart(10, '0'),
      rawValue: trimmed,
      recognizedFormat: 'TKNUM',
      valid: true,
    }
  }

  // Padrão 2: Formato combinado Remessa + Separador + Item (ex: 80001234/000010, 80001234-10, 80001234_10)
  const sepMatch = trimmed.match(/^(\d{5,10})[/_-](\d{1,6})$/)
  if (sepMatch) {
    const delivery = sepMatch[1].padStart(10, '0')
    const item = sepMatch[2].padStart(6, '0')
    return {
      deliveryNumber: delivery,
      deliveryItem: item,
      rawValue: trimmed,
      recognizedFormat: 'VBELN_POSNR',
      valid: true,
    }
  }

  // Padrão 3: Formato com concatenação contínua VBELN (10) + POSNR (6) = 16 dígitos
  if (/^\d{16}$/.test(trimmed)) {
    const delivery = trimmed.substring(0, 10)
    const item = trimmed.substring(10, 16)
    return {
      deliveryNumber: delivery,
      deliveryItem: item,
      rawValue: trimmed,
      recognizedFormat: 'COMBINED',
      valid: true,
    }
  }

  // Padrão 4: Formato com concatenação curta (ex: 8 dígitos remessa + 2 a 4 dígitos item = 10 a 14 dígitos)
  // No SAP ECC padrão, remessas externas costumam começar com '8' (ex: 80001234)
  if (/^8\d{7}\d{2,6}$/.test(trimmed)) {
    const delivery = trimmed.substring(0, 8).padStart(10, '0')
    const item = trimmed.substring(8).padStart(6, '0')
    return {
      deliveryNumber: delivery,
      deliveryItem: item,
      rawValue: trimmed,
      recognizedFormat: 'VBELN_POSNR',
      valid: true,
    }
  }

  // Padrão 5: Remessa isolada (ex: 80001234 ou 0080001234 de 7 a 10 dígitos)
  const cleanDigits = trimmed.replace(/\D/g, '')
  if (cleanDigits.length >= 7 && cleanDigits.length <= 10) {
    return {
      deliveryNumber: cleanDigits.padStart(10, '0'),
      rawValue: trimmed,
      recognizedFormat: 'VBELN',
      valid: true,
    }
  }

  // Padrão 6: Transporte isolado digitado ou escaneado (ex: 6 a 10 dígitos)
  if (cleanDigits.length >= 4 && cleanDigits.length <= 6) {
    return {
      transportNumber: cleanDigits.padStart(10, '0'),
      rawValue: trimmed,
      recognizedFormat: 'TKNUM',
      valid: true,
    }
  }

  return {
    rawValue: trimmed,
    recognizedFormat: 'UNKNOWN',
    valid: false,
    validationMessage: 'Código da remessa não reconhecido.',
  }
}

/**
 * Parser de código de barras de produto (etiqueta industrial CIAFAL / WMS)
 * Reproduz ZF_VALIDAR_BARCODE (ABAP)
 * Estrutura canônica de etiqueta de aço CIAFAL: PPPP + LOTE + MATERIAL
 * - PPPP: 4 primeiras posições representam o peso (dividido por 1000 = peso em toneladas/kg)
 * - Lote: 9 OU 10 caracteres alfanuméricos
 * - Material: restante do código de barras
 * - Mínimo de ~25 caracteres (se tiver menos de 25, código é considerado inválido)
 * - Normalização de lote: se lote de 10 posições iniciar em '0', gerar versão alternativa sem o '0' inicial
 */
export function parseProductBarcode(barcode: string): ProductBarcodeResult {
  if (!barcode || typeof barcode !== 'string') {
    return {
      rawBarcode: barcode || '',
      weight: 0,
      weightKg: 0,
      batch: '',
      batchNormalized: '',
      material: '',
      valid: false,
      validationMessage: 'Cod. de barras inválido.',
    }
  }

  const clean = barcode.trim().replace(/[\r\n\t]/g, '')

  // Validação 1: Mínimo de 25 caracteres conforme regra ABAP ZF_VALIDAR_BARCODE
  if (clean.length < 25) {
    return {
      rawBarcode: clean,
      weight: 0,
      weightKg: 0,
      batch: '',
      batchNormalized: '',
      material: '',
      valid: false,
      validationMessage: 'Cod. de barras inválido.',
    }
  }

  // 1. Extração do peso (4 primeiras posições / 1000)
  const weightPrefix = clean.substring(0, 4)
  if (!/^\d{4}$/.test(weightPrefix)) {
    return {
      rawBarcode: clean,
      weight: 0,
      weightKg: 0,
      batch: '',
      batchNormalized: '',
      material: '',
      valid: false,
      validationMessage: 'Cod. de barras inválido.',
    }
  }

  const rawWeightNumber = parseInt(weightPrefix, 10)
  // No SAP o peso gravado no barcode de 4 dígitos pode representar toneladas com 3 decimais (ex: 1250 = 1.250 t = 1250 kg)
  // ou valor nominal em kg. Em ambos os casos na indústria de aço, 4 dígitos PPPP = valor em kg (ex: 1020 kg = 1,020 t).
  const weightKg = rawWeightNumber
  const weightTons = rawWeightNumber / 1000

  // 2. Extração de Lote (9 ou 10 caracteres) e Material (restante)
  // Estratégia de detecção adaptativa ABAP:
  // Tenta primeiramente lote de 10 posições (pos 4 a 14); se material resultante for muito curto (< 10), tenta lote de 9 (pos 4 a 13).
  let batch = ''
  let material = ''

  // Heurística de tamanho: lote padrão SAP tem até 10 chars (CHARG).
  // A etiqueta padrão tem 4 (peso) + 10 (lote) + resto (material).
  const candidateBatch10 = clean.substring(4, 14)
  const candidateMaterial10 = clean.substring(14)

  const candidateBatch9 = clean.substring(4, 13)
  const candidateMaterial9 = clean.substring(13)

  // Seleciona formato compatível com identificadores industriais de materiais CIAFAL
  if (clean.length >= 26) {
    batch = candidateBatch10
    material = candidateMaterial10
  } else {
    // 25 caracteres exatos: pode ser 4 + 9 + 12 ou 4 + 10 + 11
    batch = candidateBatch10
    material = candidateMaterial10
  }

  // Sanitização de lote e material
  batch = batch.trim().toUpperCase()
  material = material.trim().toUpperCase()

  if (!batch || !material) {
    return {
      rawBarcode: clean,
      weight: weightTons,
      weightKg,
      batch,
      batchNormalized: batch,
      material,
      valid: false,
      validationMessage: 'Cod. de barras inválido.',
    }
  }

  // 3. Normalização de lote: se 10 posições começar com '0', versão normalizada remove o primeiro '0'
  let batchNormalized = batch
  if (batch.length === 10 && batch.startsWith('0')) {
    batchNormalized = batch.substring(1)
  }

  return {
    rawBarcode: clean,
    weight: weightTons,
    weightKg,
    batch,
    batchNormalized,
    material,
    valid: true,
  }
}

/**
 * Normaliza código de material SAP (remove zeros à esquerda se numérico ou mantém)
 */
export function normalizeMaterialCode(mat: string): string {
  if (!mat) return ''
  const trimmed = mat.trim().toUpperCase()
  // Se for puramente numérico, remove zeros à esquerda para comparação flexível
  if (/^\d+$/.test(trimmed)) {
    return trimmed.replace(/^0+/, '')
  }
  return trimmed
}

/**
 * Validação de tolerância operacional de peso (~30% acima do previsto)
 */
export function validateWeightTolerance(
  plannedWeightKg: number,
  currentCollectedWeightKg: number,
  newLotWeightKg: number,
  tolerancePct = 30,
): { valid: boolean; message?: string; totalAfterKg: number; maxAllowedKg: number } {
  const totalAfterKg = currentCollectedWeightKg + newLotWeightKg
  const maxAllowedKg = plannedWeightKg * (1 + tolerancePct / 100)

  if (plannedWeightKg > 0 && totalAfterKg > maxAllowedKg) {
    return {
      valid: false,
      message: 'Peso da coleta excede 30% da tolerância.',
      totalAfterKg,
      maxAllowedKg,
    }
  }

  return {
    valid: true,
    totalAfterKg,
    maxAllowedKg,
  }
}

/**
 * Formatação de unidades no padrão brasileiro / ABNT
 * Exemplo: 1.020,000 kg -> 1,020 t; 985 kg; 90,0 %
 */
export function formatWeightPtBr(weightKg: number): string {
  if (isNaN(weightKg) || weightKg === 0) return '0 kg'
  if (Math.abs(weightKg) >= 1000) {
    const tons = weightKg / 1000
    return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} t`
  }
  return `${Math.round(weightKg).toLocaleString('pt-BR')} kg`
}

export function formatPercentPtBr(pct: number): string {
  if (isNaN(pct)) return '0,0 %'
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}
