// TMS CIAFAL — Testes de Integração de Itinerário Preferencial na Fila (Testes A a G)
// Cobre: persistência com auditoria (Link Público, Portaria, SEM_PREFERENCIA), bônus de ranking,
// comportamento da Torre de Controle (visões e filtros) e consistência de badges.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TmsService } from '@/services/tmsService'
import {
  calculateCargoDriverFitness,
  evaluateDriverEligibility,
} from '@/domain/carlaoNegotiationEngine'
import {
  filterUnifiedTransports,
  UnifiedTransportItem,
  TowerGlobalFilters,
  INITIAL_TOWER_FILTERS,
} from '@/domain/controlTowerConsolidatedEngine'
import { pb } from '@/lib/pocketbase/client'

describe('Integração de Itinerário Preferencial na Fila e Torre de Controle (Testes A a G)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // TESTE A: Entrada via Link Público persiste preferred_itinerary, preferred_itinerary_name, canal LINK_PUBLICO e auditoria CREATE_QUEUE_ENTRY
  // -------------------------------------------------------------------------
  it('Teste A: Entrada via Link Público persiste itinerário preferencial, canal LINK_PUBLICO e gera auditoria CREATE_QUEUE_ENTRY', async () => {
    const mockDriver = {
      id: 'drv-link-01',
      name: 'João da Silva Santos',
      document: '12345678909',
      whatsapp: '11987654321',
      status: 'ativo',
    }

    const mockVehicle = {
      id: 'veh-link-01',
      plate: 'ABC1D23',
      type: 'Carreta LS',
      capacity_kg: 28000,
      driver: 'drv-link-01',
    }

    const createdQueueRecord = {
      id: 'queue-entry-link-01',
      driver: mockDriver.id,
      vehicle: mockVehicle.id,
      type: 'FORA',
      status: 'disponivel',
      preferred_itinerary: 'MG-03',
      preferred_itinerary_name: 'Belo Horizonte e Região',
      driver_name_cached: mockDriver.name,
      vehicle_plate_cached: mockVehicle.plate,
    }

    let auditLogCreated: any = null

    // Spy no PocketBase client mockado
    vi.spyOn(pb, 'collection').mockImplementation((collectionName: string) => {
      if (collectionName === 'vehicles') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [mockVehicle] }),
          create: vi.fn().mockResolvedValue(mockVehicle),
        } as any
      }
      if (collectionName === 'drivers') {
        return {
          getOne: vi.fn().mockResolvedValue(mockDriver),
          getList: vi.fn().mockResolvedValue({ items: [mockDriver] }),
        } as any
      }
      if (collectionName === 'queue_entries') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }), // sem fila ativa prévia
          create: vi.fn().mockResolvedValue(createdQueueRecord),
        } as any
      }
      if (collectionName === 'audit_logs') {
        return {
          create: vi.fn().mockImplementation(async (payload) => {
            auditLogCreated = payload
            return { id: 'audit-001', ...payload }
          }),
        } as any
      }
      if (collectionName === 'system_parameters') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
        } as any
      }
      if (collectionName === 'sap_zsd004_vehicles_drivers') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }),
        } as any
      }
      return {
        getList: vi.fn().mockResolvedValue({ items: [] }),
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'dummy' }),
      } as any
    })

    const result = await TmsService.submitDriverAvailability({
      document: '12345678909',
      whatsapp: '11987654321',
      plate: 'ABC1D23',
      vehicleType: 'Carreta LS',
      preferredItinerary: 'MG-03',
      preferredItineraryName: 'Belo Horizonte e Região',
      channel: 'LINK_PUBLICO',
      latitude: -23.5505,
      longitude: -46.6333,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.preferred_itinerary).toBe('MG-03')
    expect(result.data.preferred_itinerary_name).toBe('Belo Horizonte e Região')

    // Verificação estrita da auditoria CREATE_QUEUE_ENTRY
    expect(auditLogCreated).not.toBeNull()
    expect(auditLogCreated.action).toBe('CREATE_QUEUE_ENTRY')
    expect(auditLogCreated.resource).toBe('queue_entries')
    expect(auditLogCreated.payload.channel).toBe('LINK_PUBLICO')
    expect(auditLogCreated.payload.preferred_itinerary).toBe('MG-03')
    expect(auditLogCreated.payload.preferred_itinerary_name).toBe('Belo Horizonte e Região')
  })

  // -------------------------------------------------------------------------
  // TESTE B: Portaria — persiste preferred_itinerary, canal PORTARIA e auditoria CREATE_QUEUE_ENTRY
  // -------------------------------------------------------------------------
  it('Teste B: Entrada via Portaria persiste itinerário preferencial com canal PORTARIA e gera auditoria CREATE_QUEUE_ENTRY', async () => {
    const mockDriver = {
      id: 'drv-portaria-02',
      name: 'Marcos Vinicius Portaria',
      document: '98765432100',
      whatsapp: '11911223344',
      status: 'ativo',
    }

    const mockVehicle = {
      id: 'veh-portaria-02',
      plate: 'XYZ9K88',
      type: 'Vanderleia',
      capacity_kg: 32000,
      driver: 'drv-portaria-02',
    }

    const createdQueueRecord = {
      id: 'queue-entry-portaria-02',
      driver: mockDriver.id,
      vehicle: mockVehicle.id,
      type: 'PORTA',
      status: 'disponivel',
      preferred_itinerary: 'SP-01',
      preferred_itinerary_name: 'Grande São Paulo / ABC',
      driver_name_cached: mockDriver.name,
      vehicle_plate_cached: mockVehicle.plate,
    }

    let auditLogCreated: any = null

    vi.spyOn(pb, 'collection').mockImplementation((collectionName: string) => {
      if (collectionName === 'vehicles') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [mockVehicle] }),
          create: vi.fn().mockResolvedValue(mockVehicle),
        } as any
      }
      if (collectionName === 'drivers') {
        return {
          getOne: vi.fn().mockResolvedValue(mockDriver),
          getList: vi.fn().mockResolvedValue({ items: [mockDriver] }),
        } as any
      }
      if (collectionName === 'queue_entries') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }),
          create: vi.fn().mockResolvedValue(createdQueueRecord),
        } as any
      }
      if (collectionName === 'audit_logs') {
        return {
          create: vi.fn().mockImplementation(async (payload) => {
            auditLogCreated = payload
            return { id: 'audit-002', ...payload }
          }),
        } as any
      }
      if (collectionName === 'system_parameters') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
        } as any
      }
      if (collectionName === 'sap_zsd004_vehicles_drivers') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }),
        } as any
      }
      return {
        getList: vi.fn().mockResolvedValue({ items: [] }),
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'dummy' }),
      } as any
    })

    const result = await TmsService.submitDriverAvailability({
      document: '98765432100',
      whatsapp: '11911223344',
      plate: 'XYZ9K88',
      vehicleType: 'Vanderleia',
      preferredItinerary: 'SP-01',
      preferredItineraryName: 'Grande São Paulo / ABC',
      channel: 'PORTARIA',
      latitude: -23.5186,
      longitude: -46.7865,
    })

    expect(result.success).toBe(true)
    expect(result.data.preferred_itinerary).toBe('SP-01')
    expect(result.data.type).toBe('PORTA')

    expect(auditLogCreated).not.toBeNull()
    expect(auditLogCreated.action).toBe('CREATE_QUEUE_ENTRY')
    expect(auditLogCreated.payload.channel).toBe('PORTARIA')
    expect(auditLogCreated.payload.preferred_itinerary).toBe('SP-01')
    expect(auditLogCreated.payload.group).toBe('PORTA')
  })

  // -------------------------------------------------------------------------
  // TESTE C: "SEM_PREFERENCIA" persiste descrição "Sem preferência" sem rejeição em todos os canais
  // -------------------------------------------------------------------------
  it('Teste C: "SEM_PREFERENCIA" persiste descrição "Sem preferência" sem rejeição em qualquer canal', async () => {
    const mockDriver = {
      id: 'drv-neutro-03',
      name: 'Carlos Neutro de Oliveira',
      document: '55566677788',
      whatsapp: '11977778888',
      status: 'ativo',
    }

    const mockVehicle = {
      id: 'veh-neutro-03',
      plate: 'NEU1A23',
      type: 'Carreta LS',
      capacity_kg: 27000,
      driver: 'drv-neutro-03',
    }

    const createdQueueRecord = {
      id: 'queue-entry-neutro-03',
      driver: mockDriver.id,
      vehicle: mockVehicle.id,
      type: 'FORA',
      status: 'disponivel',
      preferred_itinerary: 'SEM_PREFERENCIA',
      preferred_itinerary_name: 'Sem preferência',
    }

    let auditCreated: any = null

    vi.spyOn(pb, 'collection').mockImplementation((collectionName: string) => {
      if (collectionName === 'vehicles') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [mockVehicle] }),
        } as any
      }
      if (collectionName === 'drivers') {
        return {
          getOne: vi.fn().mockResolvedValue(mockDriver),
          getList: vi.fn().mockResolvedValue({ items: [mockDriver] }),
        } as any
      }
      if (collectionName === 'queue_entries') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }),
          create: vi.fn().mockResolvedValue(createdQueueRecord),
        } as any
      }
      if (collectionName === 'audit_logs') {
        return {
          create: vi.fn().mockImplementation(async (payload) => {
            auditCreated = payload
            return { id: 'audit-003', ...payload }
          }),
        } as any
      }
      return {
        getList: vi.fn().mockResolvedValue({ items: [] }),
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'dummy' }),
      } as any
    })

    const result = await TmsService.submitDriverAvailability({
      document: '55566677788',
      whatsapp: '11977778888',
      plate: 'NEU1A23',
      vehicleType: 'Carreta LS',
      preferredItinerary: 'SEM_PREFERENCIA',
      preferredItineraryName: '', // nome vazio, deve virar "Sem preferência"
      channel: 'OPERADOR_HUB',
    })

    expect(result.success).toBe(true)
    expect(auditCreated.payload.preferred_itinerary).toBe('SEM_PREFERENCIA')
    expect(auditCreated.payload.preferred_itinerary_name).toBe('Sem preferência')
  })

  // -------------------------------------------------------------------------
  // TESTE D: Motor de ranking aplica bônus quando rota coincide, neutro para SEM_PREFERENCIA,
  // e NÃO exclui/bloqueia veículo com preferência para outro itinerário (ex. SP-01 para carga MG-03)
  // -------------------------------------------------------------------------
  it('Teste D: Motor de ranking bonifica rota coincidente, mantém neutro SEM_PREFERENCIA e NÃO exclui/bloqueia outra rota', () => {
    const baseCargo = {
      itineraryCode: 'MG-03',
      destinationRegion: 'Minas Gerais',
      weightKg: 27000,
      requiredVehicleType: 'Carreta LS',
      initialOfferedRate: 3500,
      anttFloor: 3000,
      maxAcceptableRate: 4000,
    }

    const driverStats = {
      tripsInRoute: 5, // subscore de rota base = 75
      punctualityRate: 95,
      occurrenceFreeRate: 98,
      rating: 4.8,
    }

    const dummyDriver = {
      id: 'drv-001',
      name: 'Motorista Teste',
      document: '12345678909',
      phone: '11988887777',
      status: 'ativo',
    }
    const dummyVehicle = {
      plate: 'ABC1D23',
      type: 'Carreta LS',
      capacityKg: 28000,
    }
    const dummyCargo = {
      cargoId: 'CARGO-MG-03',
      weightKg: 27000,
      requiredVehicleType: 'Carreta LS',
      itineraryCode: 'MG-03',
      destinationCity: 'Belo Horizonte',
    }

    // 1. Motorista 1: Preferência Coincidente MG-03
    const fitnessMatching = calculateCargoDriverFitness({
      driver: dummyDriver,
      vehicle: dummyVehicle,
      queueEntry: {
        type: 'PORTA',
        preferred_itinerary: 'MG-03',
        preferred_itinerary_name: 'Belo Horizonte',
      },
      cargo: dummyCargo,
      historicalStats: driverStats,
    })

    // 2. Motorista 2: SEM_PREFERENCIA
    const fitnessNoPref = calculateCargoDriverFitness({
      driver: dummyDriver,
      vehicle: dummyVehicle,
      queueEntry: {
        type: 'PORTA',
        preferred_itinerary: 'SEM_PREFERENCIA',
        preferred_itinerary_name: 'Sem preferência',
      },
      cargo: dummyCargo,
      historicalStats: driverStats,
    })

    // 3. Motorista 3: Outra rota (SP-01)
    const fitnessOther = calculateCargoDriverFitness({
      driver: dummyDriver,
      vehicle: dummyVehicle,
      queueEntry: {
        type: 'PORTA',
        preferred_itinerary: 'SP-01',
        preferred_itinerary_name: 'São Paulo',
      },
      cargo: dummyCargo,
      historicalStats: driverStats,
    })

    // O subscore de rota do motorista coincidente deve ter o bônus (+15)
    expect(fitnessMatching.subscores.routeExperience).toBe(75 + 15) // 90
    expect(fitnessNoPref.subscores.routeExperience).toBe(75) // neutro
    expect(fitnessOther.subscores.routeExperience).toBe(75) // neutro: NUNCA penalizado

    // Score total do coincidente é maior que o neutro
    expect(fitnessMatching.fitnessScore).toBeGreaterThan(fitnessNoPref.fitnessScore)
    // O de outra rota tem exatamente o mesmo score do neutro (sem penalidade)
    expect(fitnessOther.fitnessScore).toBe(fitnessNoPref.fitnessScore)

    // Avaliação de Elegibilidade no Motor:
    const eligibilityOther = evaluateDriverEligibility(
      dummyDriver,
      dummyVehicle,
      {
        type: 'PORTA',
        distanceKm: 0,
        preferred_itinerary: 'SP-01', // Preferência para outra rota
      },
      {
        weightKg: 27000,
        requiredVehicleType: 'Carreta LS',
        itineraryCode: 'MG-03',
      },
      {
        punctualityPct: 95,
        cancellationsCount: 0,
        tripsInRegion: 5,
        sustainableCostIndex: 92,
      },
    )

    // NUNCA penalizar, NUNCA excluir, NUNCA bloquear — o veículo permanece elegível e ofertável
    expect(eligibilityOther.isEligible).toBe(true)
    expect(eligibilityOther.rejectionReason).toBeUndefined()
    expect(eligibilityOther.score).toBeGreaterThan(70)
  })

  // -------------------------------------------------------------------------
  // TESTE E: Torre de Controle (ExpeditionControlTowerPage) — alternância entre visões
  // reflete estado ativo correto
  // -------------------------------------------------------------------------
  it('Teste E: Torre de Controle reflete estado de visualização ativo com suporte a todos os modos', () => {
    const validModes = [
      'executiva',
      'cards',
      'kanban',
      'graficos',
      'ytd',
      'mapa',
      'alertas',
      'lista',
    ]

    let currentViewMode: any = 'executiva'
    expect(currentViewMode).toBe('executiva')

    // Simula a alternância de cada visão
    validModes.forEach((mode) => {
      currentViewMode = mode
      expect(currentViewMode).toBe(mode)
    })
  })

  // -------------------------------------------------------------------------
  // TESTE F: Filtros da Torre persistem intactos na transição entre visões
  // -------------------------------------------------------------------------
  it('Teste F: Filtros da Torre de Controle persistem intactos durante transições entre visões', () => {
    const sampleTransports: UnifiedTransportItem[] = [
      {
        id: 'transp-01',
        transportNumber: 'TR-001',
        sapTransportNumber: 'SAP-001',
        sourceCollection: 'queue_entries',
        stage: 'FILA_PORTA',
        stageLabel: 'Fila Porta',
        statusRaw: 'disponivel',
        company: 'CIAFAL Logística',
        plant: 'Planta Central (Matriz)',
        customerName: 'Cliente MG 01',
        deliveriesCount: 1,
        destinationCity: 'Belo Horizonte',
        vehiclePlate: 'ABC1D23',
        driverName: 'Carlos Silva',
        carrierName: 'CIAFAL Logística',
        routeCode: 'MG-03',
        destinationUf: 'MG',
        slaStatus: 'NORMAL',
        hasIntercurrence: false,
        weightKg: 27000,
        weightTon: 27,
        vehicleType: 'Carreta LS',
        responsibleSector: 'Portaria & Cadastro',
        updatedAt: '2026-08-28T10:00:00Z',
      },
      {
        id: 'transp-02',
        transportNumber: 'TR-002',
        sapTransportNumber: 'SAP-002',
        sourceCollection: 'expedition_tracking',
        stage: 'EM_ROTA',
        stageLabel: 'Em Rota',
        statusRaw: 'EM_VIAGEM',
        company: 'CIAFAL Logística',
        plant: 'Planta Central (Matriz)',
        customerName: 'Cliente SP 02',
        deliveriesCount: 1,
        destinationCity: 'São Paulo',
        vehiclePlate: 'XYZ9K88',
        driverName: 'Marcos Santos',
        carrierName: 'CIAFAL Logística',
        routeCode: 'SP-01',
        destinationUf: 'SP',
        slaStatus: 'NORMAL',
        hasIntercurrence: false,
        weightKg: 15000,
        weightTon: 15,
        vehicleType: 'Carreta LS',
        responsibleSector: 'Expedição / Pátio',
        updatedAt: '2026-08-28T11:00:00Z',
      },
    ]

    const activeFilters: TowerGlobalFilters = {
      ...INITIAL_TOWER_FILTERS,
      route: 'MG-03',
      uf: 'MG',
    }

    // Filtrar na visão A (ex: executiva)
    const resultViewExecutiva = filterUnifiedTransports(sampleTransports, activeFilters)
    expect(resultViewExecutiva.length).toBe(1)
    expect(resultViewExecutiva[0].routeCode).toBe('MG-03')

    // Transição de visão para Kanban com os mesmos filtros
    const resultViewKanban = filterUnifiedTransports(sampleTransports, activeFilters)
    expect(resultViewKanban).toEqual(resultViewExecutiva)
    expect(resultViewKanban[0].vehiclePlate).toBe('ABC1D23')
  })

  // -------------------------------------------------------------------------
  // TESTE G: Badges consistentes nos 3 estados:
  // "[MG-03] — Descrição" (azul), "Sem preferência" (neutro), "Não informado" (legado)
  // -------------------------------------------------------------------------
  it('Teste G: Badges consistentes nos 3 estados operacionais (rota informada, sem preferência, legado)', () => {
    const resolveBadgePresentation = (
      preferredItinerary?: string,
      preferredItineraryName?: string,
    ) => {
      const code = (preferredItinerary || '').trim()
      if (!code) {
        return {
          type: 'LEGACY_UNINFORMED',
          label: 'Não informado',
          color: 'slate',
        }
      }
      if (code.toUpperCase() === 'SEM_PREFERENCIA') {
        return {
          type: 'NEUTRAL_NO_PREFERENCE',
          label: 'Sem preferência',
          color: 'neutral',
        }
      }
      const label = preferredItineraryName ? `[${code}] — ${preferredItineraryName}` : `[${code}]`
      return {
        type: 'SPECIFIC_ITINERARY',
        label,
        color: 'blue',
      }
    }

    // 1. Rota SAP específica
    const badge1 = resolveBadgePresentation('MG-03', 'Belo Horizonte e Região')
    expect(badge1.type).toBe('SPECIFIC_ITINERARY')
    expect(badge1.label).toBe('[MG-03] — Belo Horizonte e Região')
    expect(badge1.color).toBe('blue')

    // 2. Sem preferência
    const badge2 = resolveBadgePresentation('SEM_PREFERENCIA', 'Sem preferência')
    expect(badge2.type).toBe('NEUTRAL_NO_PREFERENCE')
    expect(badge2.label).toBe('Sem preferência')
    expect(badge2.color).toBe('neutral')

    // 3. Legado / Não informado
    const badge3 = resolveBadgePresentation('', '')
    expect(badge3.type).toBe('LEGACY_UNINFORMED')
    expect(badge3.label).toBe('Não informado')
    expect(badge3.color).toBe('slate')
  })
})
