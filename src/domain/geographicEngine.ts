// TMS CIAFAL — Base Geográfica Oficial e Resolução de Coordenadas de Cidades e Centros Emissores
// Prioridade: 1) Coordenadas cadastradas no registro; 2) Geocache / CEP; 3) Município + UF; 4) Pendente de geolocalização

export interface GeoPoint {
  lat: number
  lng: number
  name: string
  uf: string
  isPlant?: boolean
  plantCode?: string
  notes?: string
}

export interface OriginHub {
  id: string
  name: string
  fullName: string
  plantCode: string
  companyCode: string
  city: string
  uf: string
  lat: number
  lng: number
  type: 'MATRIZ_CIAFAL' | 'SIDERCENTRO' | 'FILIAL' | 'OUTRO'
}

/**
 * Centros emissores canônicos CIAFAL / Sidercentro / Unidades futuras
 * Obtidos de centros SAP (1010, WSTL, Sidercentro, etc.)
 */
export const OFFICIAL_ORIGIN_HUBS: OriginHub[] = [
  {
    id: 'CIAFAL_CONTAGEM',
    name: 'CIAFAL Matriz',
    fullName: 'CIAFAL Indústria e Comércio - Matriz Contagem / Betim',
    plantCode: '1010',
    companyCode: '1000',
    city: 'CONTAGEM',
    uf: 'MG',
    lat: -19.9317,
    lng: -44.0536,
    type: 'MATRIZ_CIAFAL',
  },
  {
    id: 'SIDERCENTRO_LAMINADOS',
    name: 'Sidercentro',
    fullName: 'Sidercentro Laminados e Trefilados S.A.',
    plantCode: '1020',
    companyCode: '1000',
    city: 'CONTAGEM',
    uf: 'MG',
    lat: -19.9248,
    lng: -44.0412,
    type: 'SIDERCENTRO',
  },
  {
    id: 'CIAFAL_SP',
    name: 'Filial São Paulo (CD)',
    fullName: 'CIAFAL Distribuição Sudeste - São Paulo',
    plantCode: '2010',
    companyCode: '1000',
    city: 'SAO PAULO',
    uf: 'SP',
    lat: -23.5505,
    lng: -46.6333,
    type: 'FILIAL',
  },
  {
    id: 'CIAFAL_SUL',
    name: 'Unidade Sul (Curitiba)',
    fullName: 'CIAFAL Polo Sul Paraná',
    plantCode: '3010',
    companyCode: '1000',
    city: 'CURITIBA',
    uf: 'PR',
    lat: -25.4284,
    lng: -49.2733,
    type: 'FILIAL',
  },
]

/**
 * Tabela de coordenadas oficiais das cidades brasileiras que compõem a carteira SAP
 * ZSD35 e destinos logísticos CIAFAL.
 */
export const BRAZIL_CITY_COORDINATES: Record<
  string,
  { lat: number; lng: number; uf: string; region: string }
> = {
  // Minas Gerais
  'BELO HORIZONTE': { lat: -19.9167, lng: -43.9345, uf: 'MG', region: 'Sudeste' },
  CONTAGEM: { lat: -19.9317, lng: -44.0536, uf: 'MG', region: 'Sudeste' },
  BETIM: { lat: -19.9678, lng: -44.1983, uf: 'MG', region: 'Sudeste' },
  'SANTA LUZIA': { lat: -19.7694, lng: -43.8519, uf: 'MG', region: 'Sudeste' },
  DIVINOPOLIS: { lat: -20.1439, lng: -44.8872, uf: 'MG', region: 'Sudeste' },
  DIVINÓPOLIS: { lat: -20.1439, lng: -44.8872, uf: 'MG', region: 'Sudeste' },
  UBERLANDIA: { lat: -18.9186, lng: -48.2772, uf: 'MG', region: 'Sudeste' },
  UBERLÂNDIA: { lat: -18.9186, lng: -48.2772, uf: 'MG', region: 'Sudeste' },
  UBERABA: { lat: -19.7478, lng: -47.9392, uf: 'MG', region: 'Sudeste' },
  'JUIZ DE FORA': { lat: -21.7587, lng: -43.3496, uf: 'MG', region: 'Sudeste' },
  IPATINGA: { lat: -19.4683, lng: -42.5367, uf: 'MG', region: 'Sudeste' },
  'GOVERNADOR VALADARES': { lat: -18.8511, lng: -41.9494, uf: 'MG', region: 'Sudeste' },
  'POUSO ALEGRE': { lat: -22.23, lng: -45.9367, uf: 'MG', region: 'Sudeste' },
  VARGINHA: { lat: -21.5514, lng: -45.4303, uf: 'MG', region: 'Sudeste' },
  'SETE LAGOAS': { lat: -19.4608, lng: -44.2467, uf: 'MG', region: 'Sudeste' },
  'MONTES CLAROS': { lat: -16.7281, lng: -43.8617, uf: 'MG', region: 'Sudeste' },
  ITABIRA: { lat: -19.6186, lng: -43.2269, uf: 'MG', region: 'Sudeste' },
  ARAGUARI: { lat: -18.6469, lng: -48.1883, uf: 'MG', region: 'Sudeste' },
  'PATOS DE MINAS': { lat: -18.5789, lng: -46.5181, uf: 'MG', region: 'Sudeste' },

  // São Paulo
  'SAO PAULO': { lat: -23.5505, lng: -46.6333, uf: 'SP', region: 'Sudeste' },
  'SÃO PAULO': { lat: -23.5505, lng: -46.6333, uf: 'SP', region: 'Sudeste' },
  GUARULHOS: { lat: -23.4542, lng: -46.5333, uf: 'SP', region: 'Sudeste' },
  CAMPINAS: { lat: -22.9056, lng: -47.0608, uf: 'SP', region: 'Sudeste' },
  SUMARE: { lat: -22.8208, lng: -47.2669, uf: 'SP', region: 'Sudeste' },
  SUMARÉ: { lat: -22.8208, lng: -47.2669, uf: 'SP', region: 'Sudeste' },
  SOROCABA: { lat: -23.5015, lng: -47.4521, uf: 'SP', region: 'Sudeste' },
  'RIBEIRAO PRETO': { lat: -21.1767, lng: -47.8108, uf: 'SP', region: 'Sudeste' },
  'RIBEIRÃO PRETO': { lat: -21.1767, lng: -47.8108, uf: 'SP', region: 'Sudeste' },
  PINDAMONHANGABA: { lat: -22.9247, lng: -45.4614, uf: 'SP', region: 'Sudeste' },
  'SAO BERNARDO DO CAMPO': { lat: -23.6914, lng: -46.5647, uf: 'SP', region: 'Sudeste' },
  'SANTO ANDRE': { lat: -23.6639, lng: -46.5383, uf: 'SP', region: 'Sudeste' },
  OSASCO: { lat: -23.5325, lng: -46.7917, uf: 'SP', region: 'Sudeste' },
  SANTOS: { lat: -23.9608, lng: -46.3339, uf: 'SP', region: 'Sudeste' },
  'SAO JOSE DOS CAMPOS': { lat: -23.1896, lng: -45.8841, uf: 'SP', region: 'Sudeste' },
  PIRACICABA: { lat: -22.7253, lng: -47.6492, uf: 'SP', region: 'Sudeste' },
  BAURU: { lat: -22.3147, lng: -49.0606, uf: 'SP', region: 'Sudeste' },
  JUNDIAI: { lat: -23.1856, lng: -46.8978, uf: 'SP', region: 'Sudeste' },

  // Rio de Janeiro
  'RIO DE JANEIRO': { lat: -22.9068, lng: -43.1729, uf: 'RJ', region: 'Sudeste' },
  'DUQUE DE CAXIAS': { lat: -22.7856, lng: -43.3061, uf: 'RJ', region: 'Sudeste' },
  NITEROI: { lat: -22.8833, lng: -43.1036, uf: 'RJ', region: 'Sudeste' },
  'NOVA IGUACU': { lat: -22.7556, lng: -43.4603, uf: 'RJ', region: 'Sudeste' },
  'VOLTA REDONDA': { lat: -22.5231, lng: -44.1042, uf: 'RJ', region: 'Sudeste' },
  'CAMPOS DOS GOYTACAZES': { lat: -21.7622, lng: -41.3244, uf: 'RJ', region: 'Sudeste' },

  // Espírito Santo
  VITORIA: { lat: -20.3155, lng: -40.3128, uf: 'ES', region: 'Sudeste' },
  VITÓRIA: { lat: -20.3155, lng: -40.3128, uf: 'ES', region: 'Sudeste' },
  'VILA VELHA': { lat: -20.3297, lng: -40.2925, uf: 'ES', region: 'Sudeste' },
  SERRA: { lat: -20.1286, lng: -40.3078, uf: 'ES', region: 'Sudeste' },
  CARIACICA: { lat: -20.2639, lng: -40.42, uf: 'ES', region: 'Sudeste' },
  LINHARES: { lat: -19.3911, lng: -40.0722, uf: 'ES', region: 'Sudeste' },
  'CACHOEIRO DE ITAPEMIRIM': { lat: -20.8489, lng: -41.1128, uf: 'ES', region: 'Sudeste' },

  // Centro-Oeste
  GOIANIA: { lat: -16.6869, lng: -49.2648, uf: 'GO', region: 'Centro-Oeste' },
  GOIÂNIA: { lat: -16.6869, lng: -49.2648, uf: 'GO', region: 'Centro-Oeste' },
  ANAPOLIS: { lat: -16.3267, lng: -48.9533, uf: 'GO', region: 'Centro-Oeste' },
  ANÁPOLIS: { lat: -16.3267, lng: -48.9533, uf: 'GO', region: 'Centro-Oeste' },
  'APARECIDA DE GOIANIA': { lat: -16.8225, lng: -49.2475, uf: 'GO', region: 'Centro-Oeste' },
  'RIO VERDE': { lat: -17.7919, lng: -50.9192, uf: 'GO', region: 'Centro-Oeste' },
  BRASILIA: { lat: -15.7939, lng: -47.8828, uf: 'DF', region: 'Centro-Oeste' },
  BRASÍLIA: { lat: -15.7939, lng: -47.8828, uf: 'DF', region: 'Centro-Oeste' },
  CUIABA: { lat: -15.6014, lng: -56.0979, uf: 'MT', region: 'Centro-Oeste' },
  CUIABÁ: { lat: -15.6014, lng: -56.0979, uf: 'MT', region: 'Centro-Oeste' },
  'VARZEA GRANDE': { lat: -15.6467, lng: -56.1325, uf: 'MT', region: 'Centro-Oeste' },
  RONDONOPOLIS: { lat: -16.4678, lng: -54.6372, uf: 'MT', region: 'Centro-Oeste' },
  'CAMPO GRANDE': { lat: -20.4697, lng: -54.6201, uf: 'MS', region: 'Centro-Oeste' },
  DOURADOS: { lat: -22.2231, lng: -54.8119, uf: 'MS', region: 'Centro-Oeste' },
  'TRES LAGOAS': { lat: -20.7847, lng: -51.7006, uf: 'MS', region: 'Centro-Oeste' },

  // Nordeste
  SALVADOR: { lat: -12.9777, lng: -38.5016, uf: 'BA', region: 'Nordeste' },
  'FEIRA DE SANTANA': { lat: -12.2664, lng: -38.9664, uf: 'BA', region: 'Nordeste' },
  CAMACARI: { lat: -12.6975, lng: -38.3242, uf: 'BA', region: 'Nordeste' },
  MUCURI: { lat: -18.0558, lng: -39.5508, uf: 'BA', region: 'Nordeste' },
  'TEIXEIRA DE FREITAS': { lat: -17.5367, lng: -39.7422, uf: 'BA', region: 'Nordeste' },
  ILHEUS: { lat: -14.7889, lng: -39.0494, uf: 'BA', region: 'Nordeste' },
  'VITORIA DA CONQUISTA': { lat: -14.8661, lng: -40.8394, uf: 'BA', region: 'Nordeste' },
  RECIFE: { lat: -8.0476, lng: -34.877, uf: 'PE', region: 'Nordeste' },
  'JABOATAO DOS GUARARAPES': { lat: -8.1131, lng: -35.0153, uf: 'PE', region: 'Nordeste' },
  CARUARU: { lat: -8.2833, lng: -35.9667, uf: 'PE', region: 'Nordeste' },
  PETROLINA: { lat: -9.3892, lng: -40.5028, uf: 'PE', region: 'Nordeste' },
  FORTALEZA: { lat: -3.7319, lng: -38.5267, uf: 'CE', region: 'Nordeste' },
  CAUCAIA: { lat: -3.7361, lng: -38.6531, uf: 'CE', region: 'Nordeste' },
  'JUAZEIRO DO NORTE': { lat: -7.2025, lng: -39.315, uf: 'CE', region: 'Nordeste' },
  SOBRAL: { lat: -3.6894, lng: -40.3481, uf: 'CE', region: 'Nordeste' },
  MACEIO: { lat: -9.6658, lng: -35.7353, uf: 'AL', region: 'Nordeste' },
  MACEIÓ: { lat: -9.6658, lng: -35.7353, uf: 'AL', region: 'Nordeste' },
  ARACAJU: { lat: -10.9472, lng: -37.0731, uf: 'SE', region: 'Nordeste' },
  NATAL: { lat: -5.7945, lng: -35.211, uf: 'RN', region: 'Nordeste' },
  MOSSORO: { lat: -5.1883, lng: -37.3442, uf: 'RN', region: 'Nordeste' },
  'JOAO PESSOA': { lat: -7.115, lng: -34.8631, uf: 'PB', region: 'Nordeste' },
  'CAMPINA GRANDE': { lat: -7.2247, lng: -35.8811, uf: 'PB', region: 'Nordeste' },
  TERESINA: { lat: -5.0919, lng: -42.8034, uf: 'PI', region: 'Nordeste' },
  'SAO LUIS': { lat: -2.5307, lng: -44.3068, uf: 'MA', region: 'Nordeste' },
  IMPERATRIZ: { lat: -5.5264, lng: -47.4789, uf: 'MA', region: 'Nordeste' },

  // Sul
  CURITIBA: { lat: -25.4284, lng: -49.2733, uf: 'PR', region: 'Sul' },
  'SAO JOSE DOS PINHAIS': { lat: -25.5347, lng: -49.2064, uf: 'PR', region: 'Sul' },
  LONDRINA: { lat: -23.3103, lng: -51.1628, uf: 'PR', region: 'Sul' },
  MARINGA: { lat: -23.421, lng: -51.9331, uf: 'PR', region: 'Sul' },
  CASCAVEL: { lat: -24.9578, lng: -53.4594, uf: 'PR', region: 'Sul' },
  'PONTA GROSSA': { lat: -25.095, lng: -50.1619, uf: 'PR', region: 'Sul' },
  'FOZ DO IGUACU': { lat: -25.5161, lng: -54.5853, uf: 'PR', region: 'Sul' },
  JOINVILLE: { lat: -26.3045, lng: -48.8487, uf: 'SC', region: 'Sul' },
  FLORIANOPOLIS: { lat: -27.5954, lng: -48.548, uf: 'SC', region: 'Sul' },
  BLUMENAU: { lat: -26.9196, lng: -49.0659, uf: 'SC', region: 'Sul' },
  ITAJAI: { lat: -26.9114, lng: -48.6678, uf: 'SC', region: 'Sul' },
  CHAPECO: { lat: -27.1006, lng: -52.6153, uf: 'SC', region: 'Sul' },
  'PORTO ALEGRE': { lat: -30.0346, lng: -51.2177, uf: 'RS', region: 'Sul' },
  'CAXIAS DO SUL': { lat: -29.1681, lng: -51.1794, uf: 'RS', region: 'Sul' },
  CANOAS: { lat: -29.9178, lng: -51.1836, uf: 'RS', region: 'Sul' },
  'PASSO FUNDO': { lat: -28.2628, lng: -52.4067, uf: 'RS', region: 'Sul' },
  PELOTAS: { lat: -31.7654, lng: -52.3376, uf: 'RS', region: 'Sul' },

  // Norte
  MANAUS: { lat: -3.119, lng: -60.0217, uf: 'AM', region: 'Norte' },
  BELEM: { lat: -1.4558, lng: -48.5039, uf: 'PA', region: 'Norte' },
  ANANINDEUA: { lat: -1.3656, lng: -48.3722, uf: 'PA', region: 'Norte' },
  MARABA: { lat: -5.3686, lng: -49.1178, uf: 'PA', region: 'Norte' },
  'PORTO VELHO': { lat: -8.7619, lng: -63.9039, uf: 'RO', region: 'Norte' },
  PALMAS: { lat: -10.2491, lng: -48.3242, uf: 'TO', region: 'Norte' },
  ARAGUAINA: { lat: -7.1906, lng: -48.2072, uf: 'TO', region: 'Norte' },
  MACAPA: { lat: 0.0389, lng: -51.0664, uf: 'AP', region: 'Norte' },
  'BOA VISTA': { lat: 2.8235, lng: -60.6758, uf: 'RR', region: 'Norte' },
  'RIO BRANCO': { lat: -9.9747, lng: -67.81, uf: 'AC', region: 'Norte' },
}

/**
 * Centros geográficos médios de cada UF brasileira (fallback para quando cidade não constar na lista)
 */
export const BRAZIL_UF_CENTROIDS: Record<
  string,
  { lat: number; lng: number; region: string; name: string }
> = {
  AC: { lat: -9.0238, lng: -70.812, region: 'Norte', name: 'Acre' },
  AL: { lat: -9.5713, lng: -36.782, region: 'Nordeste', name: 'Alagoas' },
  AP: { lat: 1.41, lng: -51.9, region: 'Norte', name: 'Amapá' },
  AM: { lat: -3.4168, lng: -65.8561, region: 'Norte', name: 'Amazonas' },
  BA: { lat: -12.5797, lng: -41.7007, region: 'Nordeste', name: 'Bahia' },
  CE: { lat: -5.4984, lng: -39.3206, region: 'Nordeste', name: 'Ceará' },
  DF: { lat: -15.7939, lng: -47.8828, region: 'Centro-Oeste', name: 'Distrito Federal' },
  ES: { lat: -19.1834, lng: -40.3089, region: 'Sudeste', name: 'Espírito Santo' },
  GO: { lat: -15.827, lng: -49.8362, region: 'Centro-Oeste', name: 'Goiás' },
  MA: { lat: -5.42, lng: -45.44, region: 'Nordeste', name: 'Maranhão' },
  MT: { lat: -12.6819, lng: -55.626, region: 'Centro-Oeste', name: 'Mato Grosso' },
  MS: { lat: -20.7722, lng: -54.7852, region: 'Centro-Oeste', name: 'Mato Grosso do Sul' },
  MG: { lat: -18.5122, lng: -44.555, region: 'Sudeste', name: 'Minas Gerais' },
  PA: { lat: -3.4168, lng: -52.28, region: 'Norte', name: 'Pará' },
  PB: { lat: -7.24, lng: -36.78, region: 'Nordeste', name: 'Paraíba' },
  PR: { lat: -24.89, lng: -51.55, region: 'Sul', name: 'Paraná' },
  PE: { lat: -8.8137, lng: -36.9541, region: 'Nordeste', name: 'Pernambuco' },
  PI: { lat: -7.7183, lng: -42.7289, region: 'Nordeste', name: 'Piauí' },
  RJ: { lat: -22.9068, lng: -43.1729, region: 'Sudeste', name: 'Rio de Janeiro' },
  RN: { lat: -5.7945, lng: -36.5, region: 'Nordeste', name: 'Rio Grande do Norte' },
  RS: { lat: -30.0346, lng: -53.2, region: 'Sul', name: 'Rio Grande do Sul' },
  RO: { lat: -11.5057, lng: -63.5806, region: 'Norte', name: 'Rondônia' },
  RR: { lat: 2.7376, lng: -62.0751, region: 'Norte', name: 'Roraima' },
  SC: { lat: -27.2423, lng: -50.2189, region: 'Sul', name: 'Santa Catarina' },
  SP: { lat: -22.1396, lng: -48.7478, region: 'Sudeste', name: 'São Paulo' },
  SE: { lat: -10.5741, lng: -37.3857, region: 'Nordeste', name: 'Sergipe' },
  TO: { lat: -10.1753, lng: -48.2982, region: 'Norte', name: 'Tocantins' },
}

export type GeocodeResolutionStatus =
  | 'EXACT_COORDINATE'
  | 'CITY_DATABASE'
  | 'UF_CENTROID'
  | 'PENDING_GEOCODING'

export interface ResolvedLocation {
  lat: number
  lng: number
  status: GeocodeResolutionStatus
  confidencePct: number
  city: string
  uf: string
  region: string
  isPending: boolean
  warningMessage?: string
}

/**
 * Normaliza nome de cidade (remove acentuações e espaços extras)
 */
export function normalizeCityName(city: string): string {
  if (!city) return ''
  return city
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolve a localização geográfica de um pedido da carteira SAP obedecendo
 * estritamente à regra de negócio #24 de qualidade e prioridade cadastral:
 * 1) dest_latitude/dest_longitude do SAP se válidas;
 * 2) base oficial de cidades do Brasil pelo município + UF;
 * 3) centroide da UF como fallback geográfico;
 * 4) se nada bater, marca como "Localização pendente" sem travar o Planejador.
 */
export function resolveOrderLocation(order: {
  destination_city?: string
  uf?: string
  dest_latitude?: number
  dest_longitude?: number
  postal_code?: string
}): ResolvedLocation {
  const cityRaw = order.destination_city || ''
  const ufRaw = (order.uf || '').trim().toUpperCase()
  const cityNorm = normalizeCityName(cityRaw)

  // 1) Coordenadas cadastradas no registro SAP
  if (
    typeof order.dest_latitude === 'number' &&
    typeof order.dest_longitude === 'number' &&
    order.dest_latitude !== 0 &&
    order.dest_longitude !== 0 &&
    order.dest_latitude >= -35 &&
    order.dest_latitude <= 6 &&
    order.dest_longitude >= -75 &&
    order.dest_longitude <= -30
  ) {
    const ufData = BRAZIL_UF_CENTROIDS[ufRaw]
    return {
      lat: order.dest_latitude,
      lng: order.dest_longitude,
      status: 'EXACT_COORDINATE',
      confidencePct: 98,
      city: cityRaw,
      uf: ufRaw,
      region: ufData?.region || 'Sudeste',
      isPending: false,
    }
  }

  // 2) Base oficial de cidades do Brasil
  if (cityNorm && BRAZIL_CITY_COORDINATES[cityNorm]) {
    const coord = BRAZIL_CITY_COORDINATES[cityNorm]
    return {
      lat: coord.lat,
      lng: coord.lng,
      status: 'CITY_DATABASE',
      confidencePct: 92,
      city: cityRaw || cityNorm,
      uf: ufRaw || coord.uf,
      region: coord.region,
      isPending: false,
    }
  }

  // Busca aproximada caso haja pequena variação
  if (cityNorm) {
    const cityKey = Object.keys(BRAZIL_CITY_COORDINATES).find((k) => {
      const normK = normalizeCityName(k)
      return (
        normK === cityNorm ||
        (cityNorm.length > 4 && normK.includes(cityNorm)) ||
        (normK.length > 4 && cityNorm.includes(normK))
      )
    })
    if (cityKey) {
      const coord = BRAZIL_CITY_COORDINATES[cityKey]
      return {
        lat: coord.lat,
        lng: coord.lng,
        status: 'CITY_DATABASE',
        confidencePct: 88,
        city: cityRaw || cityKey,
        uf: ufRaw || coord.uf,
        region: coord.region,
        isPending: false,
      }
    }
  }

  // 3) Centroide do Estado (UF)
  if (ufRaw && BRAZIL_UF_CENTROIDS[ufRaw]) {
    const ufData = BRAZIL_UF_CENTROIDS[ufRaw]
    return {
      lat: ufData.lat,
      lng: ufData.lng,
      status: 'UF_CENTROID',
      confidencePct: 65,
      city: cityRaw || ufData.name,
      uf: ufRaw,
      region: ufData.region,
      isPending: false,
      warningMessage: `Localização aproximada no centro de ${ufData.name} (${ufRaw}) — município não mapeado diretamente.`,
    }
  }

  // 4) Localização Pendente (Fallback seguro)
  return {
    lat: -19.9317,
    lng: -44.0536,
    status: 'PENDING_GEOCODING',
    confidencePct: 10,
    city: cityRaw || 'Desconhecida',
    uf: ufRaw || 'N/A',
    region: 'Indefinida',
    isPending: true,
    warningMessage:
      'Localização pendente: cliente sem endereço válido ou município não identificado.',
  }
}

/**
 * Converte coordenadas (lat, lng) para projeção 2D SVG normalizada
 * Cobertura do Brasil:
 * Longitude: -74° (Oeste) a -34° (Leste) -> Largura ~40°
 * Latitude: +5.5° (Norte) a -34° (Sul) -> Altura ~39.5°
 */
export function latLngToSvgPoint(
  lat: number,
  lng: number,
  viewWidth = 800,
  viewHeight = 600,
  padding = 40,
): { x: number; y: number } {
  const minLng = -74.0
  const maxLng = -34.0
  const maxLat = 5.5
  const minLat = -34.0

  const drawWidth = viewWidth - padding * 2
  const drawHeight = viewHeight - padding * 2

  const x = padding + ((lng - minLng) / (maxLng - minLng)) * drawWidth
  const y = padding + ((maxLat - lat) / (maxLat - minLat)) * drawHeight

  return { x, y }
}

/**
 * Inverte a projeção SVG para (lat, lng) aproximado
 */
export function svgPointToLatLng(
  x: number,
  y: number,
  viewWidth = 800,
  viewHeight = 600,
  padding = 40,
): { lat: number; lng: number } {
  const minLng = -74.0
  const maxLng = -34.0
  const maxLat = 5.5
  const minLat = -34.0

  const drawWidth = viewWidth - padding * 2
  const drawHeight = viewHeight - padding * 2

  const lng = minLng + ((x - padding) / drawWidth) * (maxLng - minLng)
  const lat = maxLat - ((y - padding) / drawHeight) * (maxLat - minLat)

  return { lat, lng }
}

/**
 * Determina a origem primária para uma rota ou carga
 * Se o pedido for do centro 1020 / is_sidercentro, usa Sidercentro; caso contrário, Matriz CIAFAL.
 */
export function getOriginForOrders(
  orders: Array<{ is_sidercentro?: boolean; plant_code?: string }>,
): OriginHub {
  const hasSidercentro = orders.some((o) => o.is_sidercentro || o.plant_code === '1020')
  if (hasSidercentro) {
    return OFFICIAL_ORIGIN_HUBS[1] // Sidercentro
  }
  return OFFICIAL_ORIGIN_HUBS[0] // CIAFAL Matriz Contagem
}
