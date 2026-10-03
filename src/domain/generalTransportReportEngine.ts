/**
 * TMS CIAFAL Logística — Motor de Domínio do Relatório Geral Transporte
 *
 * Estrutura oficial de 43 colunas canônicas (SAP ZSD40 / Bases TMS integradas).
 * Nomenclatura amigável no front-end com subtítulo/tooltip do campo técnico SAP original.
 * Suporta segregação independente para campos duplicados:
 *  - pos 30/31 (Data Fim 1 / Hora Fim 1)
 *  - pos 33/34 (Data Fim 2 / Hora Fim 2)
 */

export interface GeneralTransportRecord {
  id: string
  // 1. Cen.
  center_code: string
  // 2. Descrição Centro
  center_description: string
  // 3. Stts.Trnsp
  transport_status: string
  // 4. Transporte
  transport_number: string
  sap_transport_number: string
  // 5. Usuário
  user_name: string
  // 6. Data
  transport_date: string
  // 7. Hora
  transport_time: string
  // 8. Motivo Balança
  scale_reason: string
  has_scale_log: boolean
  // 9. ID ext.1 (Placa confirmada / ID externo)
  external_id_1: string
  // 10. Frete
  freight_cost: number
  // 11. Pedágio
  toll_cost: number
  // 12. Peso Br(t)
  gross_weight_ton: number
  // 13. Tara
  tare_weight_ton: number
  // 14. Peso Líq.
  net_weight_ton: number
  // 15. Peso NF(t)
  nf_weight_ton: number
  // 16. Dif. (t)
  diff_weight_ton: number
  // 17. Dif. (%)
  diff_weight_pct: number
  // 18. Itin.
  itinerary_code: string
  // 19. Descrição itinerário
  itinerary_description: string
  // 20. Tp Expediç
  expedition_type: string
  // 21. Tp transp.
  transport_type: string
  // 22. Distância (km)
  distance_km: number
  // 23. Tp Frete
  freight_type: string
  // 24. Organ.
  sales_organization: string
  // 25. Hr Início
  start_time: string
  // 26. Data Tara
  tare_date: string
  // 27. Hora Tara
  tare_time: string
  // 28. Data Iní.
  initial_date: string
  // 29. Hora Iní.
  initial_time: string
  // 30. Data Fim (Par 1)
  end_date_1: string
  // 31. Hora Fim (Par 1)
  end_time_1: string
  // 32. Tempo Col (minutos)
  collection_time_min: number
  // 33. Data Fim (Par 2)
  end_date_2: string
  // 34. Hora Fim (Par 2)
  end_time_2: string
  // 35. Tempo Tot (minutos)
  total_time_min: number
  // 36. Capac Veíc (t)
  vehicle_capacity_ton: number
  // 37. Tp Veículo
  vehicle_type: string
  // 38. Tp Rodado
  wheel_type: string
  // 39. Tp Carroce
  body_type: string
  // 40. Eixos
  axles_count: number
  // 41. Ocup. (%)
  occupancy_pct: number
  // 42. Frac. (nº)
  fractions_count: number
  // 43. RFID
  rfid_code: string

  // Metadados adicionais de rastreamento / relacionamento
  driver_name?: string
  driver_document?: string
  carrier_name?: string
  destination_city?: string
  destination_uf?: string
  invoicing_date?: string
  source_collection?: string
}

export interface GeneralTransportFilterParams {
  transport?: string // Um ou vários números (ex: 800101, 800102 ou parcial)
  startDate?: string // Data início do transporte
  endDate?: string // Data fim do transporte
  startInvoicingDate?: string // Data início do faturamento
  endInvoicingDate?: string // Data fim do faturamento
  statuses?: string[] // Seleção múltipla de status
  scaleLogFilter?: 'ALL' | 'WITH_LOG' | 'WITHOUT_LOG' // Com ou sem balança
  scaleReasons?: string[] // Classificações/motivos de balança
  plate?: string // Placa (relacionada ao ID ext.1)
  page?: number
  perPage?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ColumnDefinition {
  key: keyof GeneralTransportRecord
  seq: number
  sapTitle: string
  label: string
  tooltip: string
  align: 'left' | 'center' | 'right'
  format:
    | 'text'
    | 'currency'
    | 'weight'
    | 'percent'
    | 'distance'
    | 'date'
    | 'time'
    | 'duration'
    | 'integer'
  sticky?: 'left' | 'right'
  minWidth?: number
  defaultVisible?: boolean
}

/**
 * Presets de visualização rápida de colunas no Relatório Geral
 */
export const SUGGESTED_DEFAULT_COLUMN_KEYS: string[] = [
  'transport_number', // Nº Transporte (140px, sticky)
  'transport_status', // Status Transporte / Stts.Trnsp (150px)
  'center_description', // Centro / Unidade (Origem) (180px)
  'external_id_1', // Placa / ID ext.1 (130px)
  'user_name', // Usuário SAP (140px)
  'transport_date', // Data Transporte (145px)
  'freight_cost', // Valor Frete (130px)
  'gross_weight_ton', // Peso Bruto (140px)
  'net_weight_ton', // Peso Líquido (140px)
  'itinerary_description', // Itinerário / Destino (220px)
  'expedition_type', // Tipo Expedição (150px)
  'initial_date', // Data Início Carregamento (145px)
  'end_date_1', // Data Fim Carregamento (145px)
]

/**
 * Catálogo canônico ordenado dos 43 campos da especificação
 * Larguras mínimas calibradas para impedir sobreposição em qualquer resolução (incluindo 1366x768).
 */
export const GENERAL_TRANSPORT_COLUMNS: ColumnDefinition[] = [
  {
    key: 'center_code',
    seq: 1,
    sapTitle: 'Cen.',
    label: 'Centro / Empresa',
    tooltip: 'Cen. — Código do Centro Expedidor SAP (ex: WSTL, 1010)',
    align: 'center',
    format: 'text',
    minWidth: 130,
    defaultVisible: true,
  },
  {
    key: 'center_description',
    seq: 2,
    sapTitle: 'Descrição Centro',
    label: 'Descrição do Centro',
    tooltip: 'Descrição Centro — Origem: nome corporativo da unidade produtiva/filial expedidora',
    align: 'left',
    format: 'text',
    minWidth: 200,
    defaultVisible: true,
  },
  {
    key: 'transport_status',
    seq: 3,
    sapTitle: 'Stts.Trnsp',
    label: 'Status do Transporte',
    tooltip: 'Stts.Trnsp — Status oficial de faturamento e execução operacional no SAP',
    align: 'center',
    format: 'text',
    minWidth: 150,
    defaultVisible: true,
  },
  {
    key: 'transport_number',
    seq: 4,
    sapTitle: 'Transporte',
    label: 'Nº Transporte',
    tooltip:
      'Transporte — Número oficial da Ordem de Transporte / TKNUM SAP (chave primária operacional)',
    align: 'left',
    format: 'text',
    sticky: 'left',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'user_name',
    seq: 5,
    sapTitle: 'Usuário',
    label: 'Usuário SAP',
    tooltip: 'Usuário — Usuário responsável pelo registro e liberação física no SAP',
    align: 'left',
    format: 'text',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'transport_date',
    seq: 6,
    sapTitle: 'Data',
    label: 'Data Transporte',
    tooltip: 'Data — Data de programação e criação do transporte no sistema',
    align: 'center',
    format: 'date',
    minWidth: 145,
    defaultVisible: true,
  },
  {
    key: 'transport_time',
    seq: 7,
    sapTitle: 'Hora',
    label: 'Hora Transporte',
    tooltip: 'Hora — Horário do registro do transporte (HH:mm:ss)',
    align: 'center',
    format: 'time',
    minWidth: 120,
    defaultVisible: true,
  },
  {
    key: 'scale_reason',
    seq: 8,
    sapTitle: 'Motivo Balança',
    label: 'Motivo Balança',
    tooltip: 'Motivo Balança — Justificativa / log de pesagem ou liberação de pesagem na balança',
    align: 'left',
    format: 'text',
    minWidth: 220,
    defaultVisible: true,
  },
  {
    key: 'external_id_1',
    seq: 9,
    sapTitle: 'ID ext.1',
    label: 'Placa (ID ext.1)',
    tooltip: 'ID ext.1 — Identificador externo 1 na estrutura SAP (Placa confirmada do veículo)',
    align: 'center',
    format: 'text',
    minWidth: 130,
    defaultVisible: true,
  },
  {
    key: 'freight_cost',
    seq: 10,
    sapTitle: 'Frete',
    label: 'Valor do Frete',
    tooltip: 'Frete — Custo/valor total contratado de frete do transporte (R$)',
    align: 'right',
    format: 'currency',
    minWidth: 130,
    defaultVisible: true,
  },
  {
    key: 'toll_cost',
    seq: 11,
    sapTitle: 'Pedágio',
    label: 'Valor Pedágio',
    tooltip: 'Pedágio — Custo/previsão de vale-pedágio obrigatório (R$)',
    align: 'right',
    format: 'currency',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'gross_weight_ton',
    seq: 12,
    sapTitle: 'Peso Br(t)',
    label: 'Peso Bruto (t)',
    tooltip: 'Peso Br(t) — Peso bruto aferido na balança ou calculado (em toneladas)',
    align: 'right',
    format: 'weight',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'tare_weight_ton',
    seq: 13,
    sapTitle: 'Tara',
    label: 'Tara do Veículo (t)',
    tooltip: 'Tara — Peso do veículo vazio registrado na balança de entrada (em toneladas)',
    align: 'right',
    format: 'weight',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'net_weight_ton',
    seq: 14,
    sapTitle: 'Peso Líq.',
    label: 'Peso Líquido (t)',
    tooltip: 'Peso Líq. — Peso líquido real carregado (Bruto - Tara) em toneladas',
    align: 'right',
    format: 'weight',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'nf_weight_ton',
    seq: 15,
    sapTitle: 'Peso NF(t)',
    label: 'Peso NF (t)',
    tooltip: 'Peso NF(t) — Soma do peso faturado nas notas fiscais do transporte (em toneladas)',
    align: 'right',
    format: 'weight',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'diff_weight_ton',
    seq: 16,
    sapTitle: 'Dif. (t)',
    label: 'Diferença (t)',
    tooltip: 'Dif. (t) — Divergência em toneladas entre peso aferido e peso faturado NF',
    align: 'right',
    format: 'weight',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'diff_weight_pct',
    seq: 17,
    sapTitle: 'Dif. (%)',
    label: 'Diferença (%)',
    tooltip: 'Dif. (%) — Percentual de divergência de pesagem na balança',
    align: 'right',
    format: 'percent',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'itinerary_code',
    seq: 18,
    sapTitle: 'Itin.',
    label: 'Cód. Itinerário',
    tooltip: 'Itin. — Código oficial SAP da rota/itinerário (TVROT)',
    align: 'center',
    format: 'text',
    minWidth: 130,
    defaultVisible: true,
  },
  {
    key: 'itinerary_description',
    seq: 19,
    sapTitle: 'Descrição itinerário',
    label: 'Descrição Itinerário',
    tooltip: 'Descrição itinerário — Origem, trajeto comercial e praça de destino da carga',
    align: 'left',
    format: 'text',
    minWidth: 230,
    defaultVisible: true,
  },
  {
    key: 'expedition_type',
    seq: 20,
    sapTitle: 'Tp Expediç',
    label: 'Tipo Expedição',
    tooltip: 'Tp Expediç — Classificação da expedição (ex: Lotação, Fracionada)',
    align: 'left',
    format: 'text',
    minWidth: 150,
    defaultVisible: true,
  },
  {
    key: 'transport_type',
    seq: 21,
    sapTitle: 'Tp transp.',
    label: 'Tipo Transporte',
    tooltip: 'Tp transp. — Modal e perfil operacional do transporte rodoviário',
    align: 'left',
    format: 'text',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'distance_km',
    seq: 22,
    sapTitle: 'Distância',
    label: 'Distância (km)',
    tooltip: 'Distância — Quilometragem estimada ou apurada da viagem (km)',
    align: 'right',
    format: 'distance',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'freight_type',
    seq: 23,
    sapTitle: 'Tp Frete',
    label: 'Tipo de Frete',
    tooltip: 'Tp Frete — Incoterm e modalidade de contratação do frete (CIF / FOB / Terceiro)',
    align: 'center',
    format: 'text',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'sales_organization',
    seq: 24,
    sapTitle: 'Organ.',
    label: 'Organização Vendas',
    tooltip: 'Organ. — Organização de vendas / empresa faturadora no SAP',
    align: 'left',
    format: 'text',
    minWidth: 160,
    defaultVisible: true,
  },
  {
    key: 'start_time',
    seq: 25,
    sapTitle: 'Hr Início',
    label: 'Hora Início Operação',
    tooltip: 'Hr Início — Horário de início do processo operacional geral',
    align: 'center',
    format: 'time',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'tare_date',
    seq: 26,
    sapTitle: 'Data Tara',
    label: 'Data Tara',
    tooltip: 'Data Tara — Data da primeira pesagem na balança de entrada',
    align: 'center',
    format: 'date',
    minWidth: 145,
    defaultVisible: true,
  },
  {
    key: 'tare_time',
    seq: 27,
    sapTitle: 'Hora Tara',
    label: 'Hora Tara',
    tooltip: 'Hora Tara — Horário da primeira pesagem do veículo vazio',
    align: 'center',
    format: 'time',
    minWidth: 120,
    defaultVisible: true,
  },
  {
    key: 'initial_date',
    seq: 28,
    sapTitle: 'Data Iní.',
    label: 'Data Início Carregamento',
    tooltip: 'Data Iní. — Data de início do carregamento físico na doca',
    align: 'center',
    format: 'date',
    minWidth: 145,
    defaultVisible: true,
  },
  {
    key: 'initial_time',
    seq: 29,
    sapTitle: 'Hora Iní.',
    label: 'Hora Início Carregamento',
    tooltip: 'Hora Iní. — Horário de posicionamento e início de carga na doca',
    align: 'center',
    format: 'time',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'end_date_1',
    seq: 30,
    sapTitle: 'Data Fim (1)',
    label: 'Data Fim Carregamento (1)',
    tooltip: 'Data Fim (1) — Primeiro marco de encerramento da etapa física de carga',
    align: 'center',
    format: 'date',
    minWidth: 145,
    defaultVisible: true,
  },
  {
    key: 'end_time_1',
    seq: 31,
    sapTitle: 'Hora Fim (1)',
    label: 'Hora Fim Carregamento (1)',
    tooltip: 'Hora Fim (1) — Horário de término do carregamento físico',
    align: 'center',
    format: 'time',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'collection_time_min',
    seq: 32,
    sapTitle: 'Tempo Col',
    label: 'Tempo Carregamento (min)',
    tooltip: 'Tempo Col — Duração em minutos da coleta e carregamento interno na doca',
    align: 'right',
    format: 'duration',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'end_date_2',
    seq: 33,
    sapTitle: 'Data Fim (2)',
    label: 'Data Fim Liberação (2)',
    tooltip: 'Data Fim (2) — Segundo marco SAP de conclusão e faturamento fiscal final',
    align: 'center',
    format: 'date',
    minWidth: 145,
    defaultVisible: true,
  },
  {
    key: 'end_time_2',
    seq: 34,
    sapTitle: 'Hora Fim (2)',
    label: 'Hora Fim Liberação (2)',
    tooltip: 'Hora Fim (2) — Horário de encerramento fiscal e emissão documental final',
    align: 'center',
    format: 'time',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'total_time_min',
    seq: 35,
    sapTitle: 'Tempo Tot',
    label: 'Tempo Total Pátio (min)',
    tooltip: 'Tempo Tot — Duração total de permanência interna no pátio (minutos)',
    align: 'right',
    format: 'duration',
    minWidth: 135,
    defaultVisible: true,
  },
  {
    key: 'vehicle_capacity_ton',
    seq: 36,
    sapTitle: 'Capac Veíc',
    label: 'Capacidade do Veículo (t)',
    tooltip: 'Capac Veíc — Capacidade nominal de carga útil do veículo (toneladas)',
    align: 'right',
    format: 'weight',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'vehicle_type',
    seq: 37,
    sapTitle: 'Tp Veículo',
    label: 'Tipo de Veículo',
    tooltip: 'Tp Veículo — Classificação do conjunto veicular (Bitrem, Carreta LS, Truck)',
    align: 'left',
    format: 'text',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'wheel_type',
    seq: 38,
    sapTitle: 'Tp Rodado',
    label: 'Tipo de Rodado',
    tooltip: 'Tp Rodado — Configuração dos rodados do conjunto (Rodado Duplo, Simples)',
    align: 'left',
    format: 'text',
    minWidth: 130,
    defaultVisible: true,
  },
  {
    key: 'body_type',
    seq: 39,
    sapTitle: 'Tp Carroce',
    label: 'Tipo de Carroceria',
    tooltip: 'Tp Carroce — Grade Baixa, Sider, Graneleiro, Prancha',
    align: 'left',
    format: 'text',
    minWidth: 140,
    defaultVisible: true,
  },
  {
    key: 'axles_count',
    seq: 40,
    sapTitle: 'Eixos',
    label: 'Nº de Eixos',
    tooltip: 'Eixos — Quantidade física de eixos rodoviários do conjunto',
    align: 'center',
    format: 'integer',
    minWidth: 110,
    defaultVisible: true,
  },
  {
    key: 'occupancy_pct',
    seq: 41,
    sapTitle: 'Ocup. (%)',
    label: 'Ocupação (%)',
    tooltip: 'Ocup. (%) — Taxa de ocupação de peso em relação à capacidade máxima do veículo',
    align: 'right',
    format: 'percent',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'fractions_count',
    seq: 42,
    sapTitle: 'Frac. (nº)',
    label: 'Nº de Frações',
    tooltip: 'Frac. (nº) — Quantidade de frações e descargas programadas para a viagem',
    align: 'center',
    format: 'integer',
    minWidth: 125,
    defaultVisible: true,
  },
  {
    key: 'rfid_code',
    seq: 43,
    sapTitle: 'RFID',
    label: 'Tag / Código RFID',
    tooltip: 'RFID — Identificador da tag de radiofrequência / WMS de rastreamento do veículo',
    align: 'center',
    format: 'text',
    minWidth: 140,
    defaultVisible: true,
  },
]

/**
 * Formata um valor de acordo com as regras ABNT/CIAFAL pt-BR
 */
export function formatReportValue(value: any, format: ColumnDefinition['format']): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  switch (format) {
    case 'currency': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    }
    case 'weight': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return `${num.toLocaleString('pt-BR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} t`
    }
    case 'percent': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return `${num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`
    }
    case 'distance': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return `${num.toLocaleString('pt-BR')} km`
    }
    case 'integer': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return num.toLocaleString('pt-BR')
    }
    case 'duration': {
      const num = Number(value)
      if (isNaN(num)) return '—'
      return `${num.toLocaleString('pt-BR')} min`
    }
    case 'date': {
      try {
        const d = new Date(value)
        if (isNaN(d.getTime())) {
          return String(value)
        }
        return d.toLocaleDateString('pt-BR', {
          timeZone: 'UTC',
        })
      } catch (_) {
        return String(value)
      }
    }
    case 'time': {
      return String(value)
    }
    case 'text':
    default:
      return String(value)
  }
}
