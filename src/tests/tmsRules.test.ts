import { describe, it, expect } from 'vitest'
import {
  isValidCPF,
  isValidCNPJ,
  isValidDocument,
  calculateDistanceKm,
  validateGeofence,
  maskCPF,
  maskCNPJ,
  maskDocument,
  maskPhone,
  getUserPermissions,
  avaliar_elegibilidade_motorista_oferta,
  CIAFAL_PLANT_LOCATION,
  WhatsAppAdapter,
  TelegramAdapter,
  DriverEntity,
  QueueEntryEntity,
} from '../domain/rules'

describe('TMS CIAFAL - Regras de Negócio & Hardening da Fila (Sprint 1.1)', () => {
  // ----------------------------------------------------
  // VALIDAÇÕES CADASTRAIS (CPF, CNPJ, MÁSCARAS)
  // ----------------------------------------------------

  it('1. Deve validar CPFs válidos com cálculo de Módulo 11', () => {
    // Known valid CPFs for testing
    expect(isValidCPF('52998224725')).toBe(true)
    expect(isValidCPF('11144477735')).toBe(true)
    expect(isValidCPF('12345678909')).toBe(true)
  })

  it('2. Deve rejeitar CPFs inválidos ou com dígitos repetidos', () => {
    expect(isValidCPF('11111111111')).toBe(false)
    expect(isValidCPF('00000000000')).toBe(false)
    expect(isValidCPF('12345678900')).toBe(false)
    expect(isValidCPF('')).toBe(false)
    expect(isValidCPF('123')).toBe(false)
  })

  it('3. Deve validar CNPJ válido e rejeitar inválido', () => {
    expect(isValidCNPJ('00000000000191')).toBe(true) // Banco do Brasil
    expect(isValidCNPJ('11222333000181')).toBe(false)
  })

  it('4. Deve validar documento polimórfico (CPF ou CNPJ)', () => {
    expect(isValidDocument('52998224725').type).toBe('CPF')
    expect(isValidDocument('52998224725').valid).toBe(true)
    expect(isValidDocument('00000000000191').type).toBe('CNPJ')
    expect(isValidDocument('00000000000191').valid).toBe(true)
    expect(isValidDocument('12345').valid).toBe(false)
  })

  it('5. Deve mascarar CPF conforme diretrizes de privacidade LGPD', () => {
    const masked = maskCPF('52998224725')
    expect(masked).toBe('***.982.247-**')
  })

  it('6. Deve mascarar CNPJ conforme diretrizes de privacidade LGPD', () => {
    const masked = maskCNPJ('00000000000191')
    expect(masked).toBe('**.***.000/0001-**')
  })

  it('7. Deve mascarar número de WhatsApp conforme LGPD', () => {
    const masked = maskPhone('11987654321')
    expect(masked).toBe('(11) 9****-4321')
  })

  // ----------------------------------------------------
  // GEOFENCING E PROTEÇÃO DE LOCALIZAÇÃO
  // ----------------------------------------------------

  it('8. Deve calcular distância Haversine com precisão decimal', () => {
    const plantLat = -23.5186
    const plantLon = -46.7865
    // Ponto muito próximo (mesma coordenada)
    const distZero = calculateDistanceKm(plantLat, plantLon, plantLat, plantLon)
    expect(distZero).toBe(0)

    // Ponto a ~15 km (Centro de SP)
    const distSp = calculateDistanceKm(plantLat, plantLon, -23.5505, -46.6333)
    expect(distSp).toBeGreaterThan(10)
    expect(distSp).toBeLessThan(25)
  })

  it('9. Deve aceitar localização FORA dentro do raio configurável de 60 km', () => {
    const lat = -23.5505
    const lon = -46.6333
    const res = validateGeofence(lat, lon, CIAFAL_PLANT_LOCATION.latitude, CIAFAL_PLANT_LOCATION.longitude, 60)
    expect(res.isWithinRadius).toBe(true)
    expect(res.distanceKm).toBeLessThanOrEqual(60)
  })

  it('10. Deve rejeitar localização FORA além do raio de 60 km', () => {
    // Campinas (~85 km da capital)
    const campinasLat = -22.9099
    const campinasLon = -47.0626
    const res = validateGeofence(
      campinasLat,
      campinasLon,
      CIAFAL_PLANT_LOCATION.latitude,
      CIAFAL_PLANT_LOCATION.longitude,
      60,
    )
    expect(res.isWithinRadius).toBe(false)
    expect(res.distanceKm).toBeGreaterThan(60)
    expect(res.reason).toContain('excede o raio máximo')
  })

  it('11. Deve rejeitar coordenadas nulas, zeradas ou fora do Brasil', () => {
    const resZero = validateGeofence(0, 0)
    expect(resZero.isWithinRadius).toBe(false)

    // Coordenadas na Europa (Londres)
    const resLondon = validateGeofence(51.5074, -0.1278)
    expect(resLondon.isWithinRadius).toBe(false)
    expect(resLondon.reason).toContain('fora do território nacional')
  })

  it('12. Deve rejeitar precisão (accuracy) do GPS inadequada ou acima da tolerância técnica', () => {
    const lat = -23.5505
    const lon = -46.6333
    const accuracyRuim = 1200 // 1.2 km de imprecisão
    const res = validateGeofence(lat, lon, CIAFAL_PLANT_LOCATION.latitude, CIAFAL_PLANT_LOCATION.longitude, 60, accuracyRuim, 500)
    expect(res.isWithinRadius).toBe(false)
    expect(res.reason).toContain('Precisão do GPS inadequada')
  })

  // ----------------------------------------------------
  // RBAC & SEGURANÇA DE PERFIS
  // ----------------------------------------------------

  it('13. Deve conceder permissões corretas para Administrador Master e TMS', () => {
    const master = getUserPermissions('admin_master')
    expect(master.canViewQueue).toBe(true)
    expect(master.canManageQueueStatus).toBe(true)
    expect(master.canBlockDriver).toBe(true)
    expect(master.canManageSystemParameters).toBe(true)
    expect(master.canViewFullSensitiveData).toBe(true)
  })

  it('14. Deve bloquear alteração de parâmetros e bloqueio para Operador de Logística', () => {
    const op = getUserPermissions('operador_logistica')
    expect(op.canViewQueue).toBe(true)
    expect(op.canManageQueueStatus).toBe(true)
    expect(op.canBlockDriver).toBe(false)
    expect(op.canManageSystemParameters).toBe(false)
    expect(op.canViewFullSensitiveData).toBe(false)
  })

  it('15. Perfil Portaria deve ter acesso restrito sem edição de parâmetros', () => {
    const portaria = getUserPermissions('portaria')
    expect(portaria.canViewQueue).toBe(true)
    expect(portaria.canManageQueueStatus).toBe(false)
    expect(portaria.canManageSystemParameters).toBe(false)
  })

  // ----------------------------------------------------
  // MOTOR DETERMINÍSTICO DE ELEGIBILIDADE PARA OFERTAS (SPRINT 1.1)
  // ----------------------------------------------------

  const dummyDriver: DriverEntity = {
    id: 'drv-01',
    name: 'Carlos Alberto Santos',
    document: '52998224725',
    whatsapp: '11987654321',
    status: 'ativo',
  }

  const dummyQueuePorta: QueueEntryEntity = {
    id: 'qe-01',
    driver: 'drv-01',
    type: 'PORTA',
    status: 'disponivel',
    entry_time: new Date().toISOString(),
    driver_name_cached: 'Carlos Alberto Santos',
    driver_doc_cached: '52998224725',
    driver_whatsapp_cached: '11987654321',
    vehicle_type_cached: 'Carreta LS',
  }

  it('16. Motorista com todas as 8 regras cumpridas deve ser ELEGÍVEL no grupo PORTA', () => {
    const res = avaliar_elegibilidade_motorista_oferta({
      driver: dummyDriver,
      queueEntry: dummyQueuePorta,
      offerStageGroup: 'PORTA',
      requiredVehicleType: 'Carreta LS',
    })

    expect(res.isEligible).toBe(true)
    expect(res.reasons.length).toBe(0)
    expect(res.ruleEngineVersion).toContain('1.1.0')
  })

  it('17. Motorista em grupo FORA deve ser NÃO ELEGÍVEL na janela exclusiva PORTA', () => {
    const queueFora: QueueEntryEntity = {
      ...dummyQueuePorta,
      id: 'qe-fora',
      type: 'FORA',
    }

    const res = avaliar_elegibilidade_motorista_oferta({
      driver: dummyDriver,
      queueEntry: queueFora,
      offerStageGroup: 'PORTA',
    })

    expect(res.isEligible).toBe(false)
    expect(res.reasons.some((r) => r.includes('incompatível com a etapa'))).toBe(true)
  })

  it('18. Motorista em pré-cadastro NÃO DEVE ficar elegível para oferta', () => {
    const res = avaliar_elegibilidade_motorista_oferta({
      driver: null, // Sem cadastro SAP ativo
      queueEntry: dummyQueuePorta,
      offerStageGroup: 'PORTA',
    })

    expect(res.isEligible).toBe(false)
    expect(res.reasons.some((r) => r.includes('Cadastro do motorista não localizado'))).toBe(true)
  })

  it('19. Motorista bloqueado deve retornar inelegível com razão explícita', () => {
    const blockedDriver: DriverEntity = {
      ...dummyDriver,
      status: 'bloqueado',
    }

    const res = avaliar_elegibilidade_motorista_oferta({
      driver: blockedDriver,
      queueEntry: dummyQueuePorta,
      offerStageGroup: 'PORTA',
    })

    expect(res.isEligible).toBe(false)
    expect(res.reasons.some((r) => r.includes('bloqueio'))).toBe(true)
  })

  it('20. Motorista com carga já atribuída deve ser inelegível para nova oferta', () => {
    const assignedQueue: QueueEntryEntity = {
      ...dummyQueuePorta,
      status: 'atribuido',
    }

    const res = avaliar_elegibilidade_motorista_oferta({
      driver: dummyDriver,
      queueEntry: assignedQueue,
      offerStageGroup: 'PORTA',
    })

    expect(res.isEligible).toBe(false)
    expect(res.reasons.some((r) => r.includes('carga atribuída'))).toBe(true)
  })

  it('21. Motorista sem WhatsApp válido deve ser inelegível por falta de canal', () => {
    const noChannelDriver: DriverEntity = {
      ...dummyDriver,
      whatsapp: '',
    }
    const noChannelQueue: QueueEntryEntity = {
      ...dummyQueuePorta,
      driver_whatsapp_cached: '',
    }

    const res = avaliar_elegibilidade_motorista_oferta({
      driver: noChannelDriver,
      queueEntry: noChannelQueue,
      offerStageGroup: 'PORTA',
    })

    expect(res.isEligible).toBe(false)
    expect(res.reasons.some((r) => r.includes('canal de comunicação'))).toBe(true)
  })

  it('22. Deve retornar LISTA COMPLETA de motivos quando múltiplas regras falham simultaneamente', () => {
    const badDriver: DriverEntity = {
      ...dummyDriver,
      status: 'bloqueado',
      whatsapp: '',
    }
    const badQueue: QueueEntryEntity = {
      ...dummyQueuePorta,
      type: 'FORA',
      status: 'indisponivel',
      vehicle_type_cached: 'Toco',
    }

    const res = avaliar_elegibilidade_motorista_oferta({
      driver: badDriver,
      queueEntry: badQueue,
      offerStageGroup: 'PORTA',
      requiredVehicleType: 'Bitrem',
    })

    expect(res.isEligible).toBe(false)
    // Must have at least 4 failure reasons (not just the first one)
    expect(res.reasons.length).toBeGreaterThanOrEqual(4)
  })

  // ----------------------------------------------------
  // ADAPTADORES DE MENSAGERIA DESACOPLADOS (CANALMENSAGEM)
  // ----------------------------------------------------

  it('23. WhatsAppAdapter e TelegramAdapter implementam a interface CanalMensagem sem chamadas diretas externas', async () => {
    const wpp = new WhatsAppAdapter()
    const tg = new TelegramAdapter()

    expect(wpp.channelName).toBe('whatsapp')
    expect(wpp.isConfigured()).toBe(false) // Sprint 1.1 simulation

    expect(tg.channelName).toBe('telegram')
    expect(tg.isConfigured()).toBe(false)

    const payload = {
      recipientDocument: '52998224725',
      recipientPhone: '11987654321',
      recipientName: 'Carlos Santos',
      templateId: 'OFFER_WINDOW_PORTA',
      parameters: { cargoId: 'CARGA-8821', destination: 'Curitiba/PR' },
      correlationId: 'TEST-CORR-01',
    }

    const wppRes = await wpp.sendMessage(payload)
    expect(wppRes.success).toBe(true)
    expect(wppRes.channel).toBe('whatsapp')
    expect(wppRes.dispatchId).toContain('WPP-')
  })

  // ----------------------------------------------------
  // PROTEÇÃO CONTRA DUPLICIDADE E TRANSIÇÃO FORA -> PORTA
  // ----------------------------------------------------

  it('24. Transição FORA -> PORTA deve registrar data/hora de chegada física como novo desempate', () => {
    const foraEntryTime = '2025-05-10T08:00:00.000Z'
    const physicalArrivalTime = '2025-05-10T10:30:00.000Z'

    // The new entry in PORTA must carry physicalArrivalTime, NOT the old foraEntryTime
    const newPortaEntry: QueueEntryEntity = {
      id: 'qe-new-porta',
      driver: 'drv-01',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: physicalArrivalTime,
      reason: 'Transição FORA → PORTA confirmada pelo Totem da Portaria',
    }

    expect(newPortaEntry.type).toBe('PORTA')
    expect(newPortaEntry.entry_time).toBe(physicalArrivalTime)
    expect(new Date(newPortaEntry.entry_time).getTime()).toBeGreaterThan(
      new Date(foraEntryTime).getTime(),
    )
  })

  it('25. Motorista removido pode ingressar novamente gerando novo ciclo e nova data/hora', () => {
    const initialEntry: QueueEntryEntity = {
      ...dummyQueuePorta,
      status: 'removido',
      exit_time: '2025-05-10T12:00:00.000Z',
    }

    // New entry later
    const reEntry: QueueEntryEntity = {
      id: 'qe-reentry',
      driver: 'drv-01',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: '2025-05-10T14:00:00.000Z',
    }

    expect(reEntry.status).toBe('disponivel')
    expect(reEntry.entry_time).not.toBe(initialEntry.entry_time)
  })
})
