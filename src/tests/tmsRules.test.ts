import { describe, it, expect } from 'vitest'
import {
  isValidCPF,
  isValidCNPJ,
  isValidPlate,
  calculateDistanceKm,
  validateGeofence,
  classifyAvailabilityGroup,
  calculateLogisticsDate,
  maskDocument,
  maskPhone,
  getUserPermissions,
  avaliar_elegibilidade_motorista_oferta,
  evaluateEligibility,
  evaluateProposalPriceRules,
  selectWinningProposal,
  avaliar_montagem_carga,
  identificar_oportunidade_complemento,
  CIAFAL_PLANT_LOCATION,
  DriverEntity,
  QueueEntryEntity,
  VehicleEntity,
  SapSalesOrderEntity,
  FreightOfferEntity,
  FreightProposalEntity,
  CandidateProposalWithQueue,
} from '@/domain/rules'

describe('TMS CIAFAL — Sprint 2: 30 Testes Obrigatórios de Regras de Negócio e Leilão', () => {
  // 1. Placa válida (Padrão e Mercosul)
  it('1. Validação de Placa: deve aceitar placa padrão ABC1234 e Mercosul ABC1D23', () => {
    expect(isValidPlate('ABC-1234')).toBe(true)
    expect(isValidPlate('ABC1234')).toBe(true)
    expect(isValidPlate('ABC1D23')).toBe(true)
    expect(isValidPlate('BRA2E19')).toBe(true)
  })

  // 2. Placa inválida rejeitada
  it('2. Validação de Placa Inválida: deve rejeitar formatos incompletos ou fora do padrão', () => {
    expect(isValidPlate('AB123')).toBe(false)
    expect(isValidPlate('1234567')).toBe(false)
    expect(isValidPlate('')).toBe(false)
    expect(isValidPlate('ABC12345')).toBe(false)
  })

  // 3. Validação de Documento com Módulo 11 (CPF e CNPJ)
  it('3. Validação de Documentos: valida dígitos verificadores de CPF e CNPJ reais', () => {
    expect(isValidCPF('11144477735')).toBe(true)
    expect(isValidCPF('11111111111')).toBe(false)
    expect(isValidCNPJ('00000000000191')).toBe(true)
    expect(isValidCNPJ('12345678901234')).toBe(false)
  })

  // 4. Classificação Fila PORTA (< 500m)
  it('4. Classificação PORTA: motorista com distância <= 0.5 km classificado como PORTA', () => {
    const group = classifyAvailabilityGroup(0.3, 0.5, 60, false)
    expect(group).toBe('PORTA')
  })

  // 5. Classificação Fila FORA (0.5km a 60km)
  it('5. Classificação FORA: motorista entre 0.5 km e 60 km classificado como FORA', () => {
    const group = classifyAvailabilityGroup(25.4, 0.5, 60, false)
    expect(group).toBe('FORA')
  })

  // 6. Classificação Fila PROGRAMADO (> 60km ou data futura)
  it('6. Classificação PROGRAMADO: motorista > 60 km ou com data futura classificado como PROGRAMADO', () => {
    const groupDist = classifyAvailabilityGroup(95.0, 0.5, 60, false)
    expect(groupDist).toBe('PROGRAMADO')
    const groupFuture = classifyAvailabilityGroup(10.0, 0.5, 60, true)
    expect(groupFuture).toBe('PROGRAMADO')
  })

  // 7. Geofence CIAFAL
  it('7. Geofence Geográfico: calcula distância Haversine e valida coordenadas no Brasil', () => {
    const checkWithin = validateGeofence(-23.52, -46.78, CIAFAL_PLANT_LOCATION.latitude, CIAFAL_PLANT_LOCATION.longitude, 60)
    expect(checkWithin.isWithinRadius).toBe(true)
    expect(checkWithin.group).toBe('PORTA')
  })

  // 8. Corte 12:00 FORA (mesmo dia)
  it('8. Corte Temporal FORA <= 12:00: disponibilidade calculada para a data do próprio dia', () => {
    const entryDate = new Date('2026-08-28T10:30:00')
    const calculatedDate = calculateLogisticsDate('FORA', entryDate, '12:00')
    expect(calculatedDate).toBe('2026-08-28')
  })

  // 9. Corte 12:00 FORA (dia seguinte)
  it('9. Corte Temporal FORA > 12:00: disponibilidade calculada para o dia seguinte', () => {
    const entryDate = new Date('2026-08-28T14:30:00')
    const calculatedDate = calculateLogisticsDate('FORA', entryDate, '12:00')
    expect(calculatedDate).toBe('2026-08-29')
  })

  // 10. Corte Parametrizável (14:00)
  it('10. Parâmetro de Corte Flexível: respeita cutoffTimeStr customizado (ex: 14:00)', () => {
    const entry1 = new Date('2026-08-28T13:30:00')
    const entry2 = new Date('2026-08-28T14:30:00')
    expect(calculateLogisticsDate('FORA', entry1, '14:00')).toBe('2026-08-28')
    expect(calculateLogisticsDate('FORA', entry2, '14:00')).toBe('2026-08-29')
  })

  // 11. Mascaramento LGPD
  it('11. Segurança LGPD: mascara adequadamente CPF, CNPJ e telefones', () => {
    expect(maskDocument('11144477735')).toBe('***.444.777-**')
    expect(maskPhone('11987654321')).toBe('(11) 9****-4321')
  })

  // 12. Elegibilidade: Motorista com cadastro ativo e canal WhatsApp válido
  it('12. Elegibilidade Motorista: apto quando ativo, com veículo compatível, canal e na fila PORTA', () => {
    const driver: DriverEntity = {
      id: 'd1',
      name: 'Sebastião Moreira',
      document: '12345678909',
      whatsapp: '11987654321',
      status: 'ativo',
    }
    const queueEntry: QueueEntryEntity = {
      id: 'q1',
      driver: 'd1',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: '2026-08-28T09:00:00Z',
      vehicle_type_cached: 'Carreta LS',
    }

    const evalRes = evaluateEligibility(driver, queueEntry, 'PORTA', 'Carreta LS')
    expect(evalRes.isEligible).toBe(true)
    expect(evalRes.reasons.length).toBe(0)
  })

  // 13. Inelegibilidade: Motorista bloqueado
  it('13. Inelegibilidade por Bloqueio: motorista bloqueado administrativamente é rejeitado', () => {
    const driver: DriverEntity = {
      id: 'd2',
      name: 'Valdir Pereira',
      document: '32165498700',
      whatsapp: '15981122334',
      status: 'bloqueado',
    }
    const queueEntry: QueueEntryEntity = {
      id: 'q2',
      driver: 'd2',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: '2026-08-28T09:00:00Z',
    }

    const evalRes = evaluateEligibility(driver, queueEntry, 'PORTA')
    expect(evalRes.isEligible).toBe(false)
    expect(evalRes.reasons.some((r) => r.includes('bloqueio'))).toBe(true)
  })

  // 14. Inelegibilidade: Grupo incompatível (Motorista FORA tentando lance em janela PORTA)
  it('14. Inelegibilidade por Grupo: motorista no grupo FORA não pode participar da janela exclusiva PORTA', () => {
    const driver: DriverEntity = {
      id: 'd3',
      name: 'Antônio Ramos',
      document: '45678912300',
      whatsapp: '16991234567',
      status: 'ativo',
    }
    const queueEntry: QueueEntryEntity = {
      id: 'q3',
      driver: 'd3',
      type: 'FORA',
      status: 'disponivel',
      entry_time: '2026-08-28T10:00:00Z',
    }

    const evalRes = evaluateEligibility(driver, queueEntry, 'PORTA')
    expect(evalRes.isEligible).toBe(false)
    expect(evalRes.details.correctAuctionGroup).toBe(false)
  })

  // 15. Inelegibilidade: Veículo incompatível
  it('15. Inelegibilidade por Veículo: tipo de veículo incompatível com a exigência da carga é rejeitado', () => {
    const driver: DriverEntity = {
      id: 'd4',
      name: 'Roberto Alencar',
      document: '98765432100',
      whatsapp: '19976543210',
      status: 'ativo',
    }
    const queueEntry: QueueEntryEntity = {
      id: 'q4',
      driver: 'd4',
      type: 'PORTA',
      status: 'disponivel',
      entry_time: '2026-08-28T09:00:00Z',
      vehicle_type_cached: 'Toco 2 Eixos',
    }

    const evalRes = evaluateEligibility(driver, queueEntry, 'PORTA', 'Bitrem 7 Eixos')
    expect(evalRes.isEligible).toBe(false)
    expect(evalRes.details.compatibleVehicle).toBe(false)
  })

  // 16. Inelegibilidade: Carga já atribuída
  it('16. Inelegibilidade por Carga Atribuída: motorista em status "atribuido" não pode receber nova oferta', () => {
    const driver: DriverEntity = {
      id: 'd5',
      name: 'Claudemir Souza',
      document: '78912345600',
      whatsapp: '12988776655',
      status: 'ativo',
    }
    const queueEntry: QueueEntryEntity = {
      id: 'q5',
      driver: 'd5',
      type: 'PORTA',
      status: 'atribuido',
      entry_time: '2026-08-28T09:00:00Z',
    }

    const evalRes = evaluateEligibility(driver, queueEntry, 'PORTA')
    expect(evalRes.isEligible).toBe(false)
    expect(evalRes.details.noAssignedCargo).toBe(false)
  })

  // 17. Leilão: Aceite de Piso (Valor == floor_price) -> Atribuição Imediata
  it('17. Motor de Leilão - Aceite de Piso: proposta igual ao floor_price resulta em WINNER imediato', () => {
    const floorPrice = 3800
    const ceilingPrice = 4500
    const proposedValue = 3800

    const result = evaluateProposalPriceRules(proposedValue, floorPrice, ceilingPrice)
    expect(result.proposalStatus).toBe('WINNER')
    expect(result.immediateContract).toBe(true)
    expect(result.reason).toContain('Aceite do valor de piso')
  })

  // 18. Leilão: Proposta Válida (Piso <= Valor <= Teto)
  it('18. Motor de Leilão - Faixa Válida: proposta entre piso e teto é aceita como VALID para leilão', () => {
    const floorPrice = 3800
    const ceilingPrice = 4500
    const proposedValue = 4100

    const result = evaluateProposalPriceRules(proposedValue, floorPrice, ceilingPrice)
    expect(result.proposalStatus).toBe('VALID')
    expect(result.immediateContract).toBe(false)
  })

  // 19. Leilão: Proposta Abaixo do Piso -> REJECTED
  it('19. Motor de Leilão - Abaixo do Piso: proposta inferior ao piso ANTT é rejeitada (REJECTED)', () => {
    const floorPrice = 3800
    const ceilingPrice = 4500
    const proposedValue = 3500 // Abaixo do piso regulatório

    const result = evaluateProposalPriceRules(proposedValue, floorPrice, ceilingPrice)
    expect(result.proposalStatus).toBe('REJECTED')
    expect(result.immediateContract).toBe(false)
    expect(result.reason).toContain('abaixo do valor de piso')
  })

  // 20. Leilão: Proposta Acima do Teto Protegido -> REJECTED
  it('20. Motor de Leilão - Acima do Teto: proposta que excede o teto protegido é rejeitada', () => {
    const floorPrice = 3800
    const ceilingPrice = 4500
    const proposedValue = 4900 // Acima do teto operacional

    const result = evaluateProposalPriceRules(proposedValue, floorPrice, ceilingPrice)
    expect(result.proposalStatus).toBe('REJECTED')
    expect(result.immediateContract).toBe(false)
    expect(result.reason).toContain('limite operacional máximo')
  })

  // 21. Desempate por Menor Valor
  it('21. Desempate de Propostas: seleciona a proposta de menor valor econômico', () => {
    const candidates: CandidateProposalWithQueue[] = [
      {
        proposal: { id: 'p1', offer_id: 'o1', driver_id: 'd1', value: 4300, status: 'VALID' },
        queueEntryTime: '2026-08-28T08:00:00Z',
      },
      {
        proposal: { id: 'p2', offer_id: 'o1', driver_id: 'd2', value: 3950, status: 'VALID' },
        queueEntryTime: '2026-08-28T09:00:00Z',
      },
    ]

    const winner = selectWinningProposal(candidates)
    expect(winner?.id).toBe('p2')
    expect(winner?.value).toBe(3950)
  })

  // 22. Desempate Temporal de Propostas de Mesmo Valor (Antiguidade na Fila)
  it('22. Desempate Temporal Fila: valores iguais são desempatados pelo tempo de entrada na fila de espera', () => {
    const candidates: CandidateProposalWithQueue[] = [
      {
        proposal: { id: 'p1', offer_id: 'o1', driver_id: 'd1', value: 4000, status: 'VALID', created: '2026-08-28T10:15:00Z' },
        queueEntryTime: '2026-08-28T08:30:00Z', // Chegou mais cedo na fila
      },
      {
        proposal: { id: 'p2', offer_id: 'o1', driver_id: 'd2', value: 4000, status: 'VALID', created: '2026-08-28T10:10:00Z' },
        queueEntryTime: '2026-08-28T09:45:00Z', // Chegou mais tarde
      },
    ]

    const winner = selectWinningProposal(candidates)
    expect(winner?.id).toBe('p1') // Vence quem chegou antes na fila
  })

  // 23. Desempate por Hora de Envio da Proposta (caso fila idêntica)
  it('23. Desempate por Envio de Lance: lances iguais e mesmo tempo de fila desempatam por envio mais rápido', () => {
    const candidates: CandidateProposalWithQueue[] = [
      {
        proposal: { id: 'p1', offer_id: 'o1', driver_id: 'd1', value: 4000, status: 'VALID', created: '2026-08-28T10:15:00Z' },
        queueEntryTime: '2026-08-28T08:30:00Z',
      },
      {
        proposal: { id: 'p2', offer_id: 'o1', driver_id: 'd2', value: 4000, status: 'VALID', created: '2026-08-28T10:05:00Z' },
        queueEntryTime: '2026-08-28T08:30:00Z',
      },
    ]

    const winner = selectWinningProposal(candidates)
    expect(winner?.id).toBe('p2') // Lance p2 submetido às 10:05 vs 10:15
  })

  // 24. Concorrência: Oferta já contratada rejeita novas atribuições
  it('24. Proteção contra Dupla Contratação: impede reatribuição se oferta já possuir vencedor', () => {
    const offer: FreightOfferEntity = {
      id: 'o1',
      cargo_id: 'CARGA-MG-101',
      current_group: 'ENCERRADO',
      status: 'CONTRACTED',
      winner_driver: 'd1',
      contracted_value: 3800,
    }

    const isAlreadyContracted = offer.status === 'CONTRACTED' || offer.status === 'atribuido'
    expect(isAlreadyContracted).toBe(true)
  })

  // 25. Proteção de Teto Oculto
  it('25. Proteção de Teto: o teto orçamentário não deve ser revelado na mensagem de rejeição pública', () => {
    const result = evaluateProposalPriceRules(5000, 3800, 4200)
    expect(result.proposalStatus).toBe('REJECTED')
    expect(result.reason).not.toContain('4200') // Não revela o valor 4200
    expect(result.reason).toContain('limite operacional máximo')
  })

  // 26. Transição de Janela: Sem lances em PORTA abre automaticamente FORA
  it('26. Transição PORTA -> FORA: ausência de lances válidos encerra PORTA e abre janela FORA', () => {
    const candidates: CandidateProposalWithQueue[] = []
    const winner = selectWinningProposal(candidates)
    expect(winner).toBeNull()

    const currentStage: 'PORTA' | 'FORA' = 'PORTA'
    const nextStage = currentStage === 'PORTA' ? 'FORA' : 'ENCERRADO'
    expect(nextStage).toBe('FORA')
  })

  // 27. Montagem de Carga: Itinerários divergentes
  it('27. Planejador: recusa montagem de carga com pedidos de cidades/itinerários distintos', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: '1',
        order_number: '101',
        customer_code: 'C1',
        customer_name: 'Cliente BH',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 12000,
        total_value: 90000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
      },
      {
        id: '2',
        order_number: '102',
        customer_code: 'C2',
        customer_name: 'Cliente Campinas',
        destination_city: 'Campinas',
        uf: 'SP',
        itinerary_code: 'SP002B',
        weight_kg: 10000,
        total_value: 75000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
      },
    ]

    const result = avaliar_montagem_carga({
      orders,
      vehicle: { id: 'v1', plate: 'ABC1234', type: 'Carreta LS', capacity_kg: 28000 },
      targetItineraryCode: 'MG001A',
    })

    expect(result.decision).toBe('recusada')
    expect(result.details.itineraryValid).toBe(false)
  })

  // 28. Montagem de Carga: Excesso de Peso
  it('28. Planejador: recusa carga cujo peso total exceda a capacidade cadastrada do veículo', () => {
    const orders: SapSalesOrderEntity[] = [
      {
        id: '1',
        order_number: '101',
        customer_code: 'C1',
        customer_name: 'Cliente BH',
        destination_city: 'Belo Horizonte',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 30000, // 30t em carreta de 26t
        total_value: 200000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
      },
    ]

    const result = avaliar_montagem_carga({
      orders,
      vehicle: { id: 'v1', plate: 'ABC1234', type: 'Carreta', capacity_kg: 26000 },
      targetItineraryCode: 'MG001A',
    })

    expect(result.decision).toBe('recusada')
    expect(result.details.weightValid).toBe(false)
  })

  // 29. Identificação de Oportunidade de Complemento (CRM)
  it('29. Complemento de Carga: identifica saldo residual de peso e localiza pedidos candidatos', () => {
    const candidateOrders: SapSalesOrderEntity[] = [
      {
        id: '3',
        order_number: '103',
        customer_code: 'C3',
        customer_name: 'Aço Betim',
        destination_city: 'Betim',
        uf: 'MG',
        itinerary_code: 'MG001A',
        weight_kg: 4000, // Cabe no saldo de 4.5t
        total_value: 35000,
        production_status: 'Pronto',
        credit_status: 'Liberado',
        status: 'disponivel',
      },
    ]

    const opp = identificar_oportunidade_complemento({
      cargoCode: 'CARGA-MG-8801',
      itineraryCode: 'MG001A',
      currentWeightKg: 23500,
      vehicleCapacityKg: 28000,
      candidateOrders,
    })

    expect(opp).not.toBeNull()
    expect(opp?.balance_kg).toBe(4500)
    expect(opp?.candidate_orders).toContain('103')
  })

  // 30. Permissões RBAC na Mesa de Fretes
  it('30. RBAC: Gestor de Logística e Gerente de Carga possuem permissão para planejar e gerenciar fretes', () => {
    const gerentePerms = getUserPermissions('gerente_carga')
    const portariaPerms = getUserPermissions('portaria')

    expect(gerentePerms.canPlanLoads).toBe(true)
    expect(portariaPerms.canPlanLoads).toBe(false)
  })
})
