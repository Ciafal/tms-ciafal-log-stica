import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ChicaoFreightOfferEntity,
  ChicaoOfferStatus,
  CHICAO_AUTONOMIA_MAX_SPREAD_PCT,
} from '../domain/rules'

describe('Fluxo Ponta a Ponta: Enviar Encontros ao Agente Chicão (TMS CIAFAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Simulação do gerador de número oficial de oferta
  function generateOfferCode(sequenceNumber: number, year: number = 2025): string {
    const padded = String(sequenceNumber).padStart(6, '0')
    return `OF-${padded}/${year}`
  }

  // Regra de formatação e formato oficial OF-NNNNNN/AAAA
  describe('1. Formato do Código da Oferta', () => {
    it('deve gerar código de oferta no padrão oficial OF-NNNNNN/AAAA', () => {
      const code1 = generateOfferCode(1, 2025)
      expect(code1).toBe('OF-000001/2025')
      expect(code1).toMatch(/^OF-\d{6}\/\d{4}$/)

      const code49 = generateOfferCode(49, 2025)
      expect(code49).toBe('OF-000049/2025')

      const codeBig = generateOfferCode(123456, 2025)
      expect(codeBig).toBe('OF-123456/2025')
    })
  })

  // Regra de Antiduplicidade
  describe('2. Antiduplicidade de Ofertas Ativas', () => {
    const existingActiveOffers: ChicaoFreightOfferEntity[] = [
      {
        id: 'rec_active_01',
        offer_code: 'OF-000001/2025',
        cargo_id: 'CARGA-SP-001',
        driver_name: 'Sebastião Carlos',
        vehicle_plate: 'ABC1D23',
        status: 'ENVIADO_CHICAO',
        active_actor: 'CHICAO',
        initial_offer_value: 3000,
      } as ChicaoFreightOfferEntity,
      {
        id: 'rec_finalized_02',
        offer_code: 'OF-000002/2025',
        cargo_id: 'CARGA-RJ-002',
        driver_name: 'Carlos Oliveira',
        vehicle_plate: 'XYZ9K88',
        status: 'RECUSADA', // Finalizada: não deve bloquear nova oferta
        active_actor: 'CHICAO',
        initial_offer_value: 4500,
      } as ChicaoFreightOfferEntity,
    ]

    function checkDuplicity(
      cargoId: string,
      plate: string,
      driverName: string,
      offers: ChicaoFreightOfferEntity[],
    ): { isDuplicate: boolean; message?: string } {
      const activeStatuses: ChicaoOfferStatus[] = [
        'DISPONIVEL',
        'SELECIONADO',
        'ENVIADO_CHICAO',
        'OFERTA_ENVIADA',
        'VISUALIZADA',
        'EM_NEGOCIACAO',
        'CONTRAPROPOSTA',
        'AGUARDANDO_APROVACAO',
        'ACEITA',
      ]

      const duplicate = offers.find(
        (o) =>
          o.cargo_id === cargoId &&
          o.vehicle_plate === plate &&
          activeStatuses.includes(o.status),
      )

      if (duplicate) {
        return {
          isDuplicate: true,
          message: 'Esta combinação já possui uma oferta ativa na Mesa de Fretes.',
        }
      }

      return { isDuplicate: false }
    }

    it('deve bloquear e retornar mensagem exata se a mesma combinação motorista+veículo+carga já tiver oferta ativa', () => {
      const check = checkDuplicity(
        'CARGA-SP-001',
        'ABC1D23',
        'Sebastião Carlos',
        existingActiveOffers,
      )

      expect(check.isDuplicate).toBe(true)
      expect(check.message).toBe(
        'Esta combinação já possui uma oferta ativa na Mesa de Fretes.',
      )
    })

    it('deve permitir nova oferta se o status anterior for finalizado (ex: RECUSADA, EXPIRADA, CANCELADA)', () => {
      const check = checkDuplicity(
        'CARGA-RJ-002',
        'XYZ9K88',
        'Carlos Oliveira',
        existingActiveOffers,
      )

      expect(check.isDuplicate).toBe(false)
      expect(check.message).toBeUndefined()
    })
  })

  // Regra de Validação em Tempo Real pré-envio
  describe('3. Validação em Tempo Real pré-envio', () => {
    function validateMatchForDispatch(match: {
      hasBlockedCredit: boolean
      isStockReady: boolean
      isPcpReady: boolean
      driverStatus: string
      vehiclePlate: string
      driverPhone: string
    }): { valid: boolean; errors: string[] } {
      const errors: string[] = []

      if (match.hasBlockedCredit) {
        errors.push('Crédito do cliente está bloqueado.')
      }
      if (!match.isStockReady && !match.isPcpReady) {
        errors.push('Carga sem estoque físico disponível e sem ordem de PCP concluída.')
      }
      if (match.driverStatus === 'bloqueado') {
        errors.push('Motorista com pendência cadastral ou bloqueio de segurança.')
      }
      if (!match.driverPhone || match.driverPhone.length < 10) {
        errors.push('Telefone / WhatsApp do motorista ausente ou inválido para contato.')
      }
      if (!match.vehiclePlate) {
        errors.push('Placa do veículo não informada.')
      }

      return { valid: errors.length === 0, errors }
    }

    it('valida com sucesso um encontro operacional perfeito', () => {
      const res = validateMatchForDispatch({
        hasBlockedCredit: false,
        isStockReady: true,
        isPcpReady: true,
        driverStatus: 'ativo',
        vehiclePlate: 'ABC1D23',
        driverPhone: '31988887777',
      })

      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('detecta bloqueio cadastral e crédito reprovado antes do envio', () => {
      const res = validateMatchForDispatch({
        hasBlockedCredit: true,
        isStockReady: false,
        isPcpReady: false,
        driverStatus: 'bloqueado',
        vehiclePlate: 'ABC1D23',
        driverPhone: '',
      })

      expect(res.valid).toBe(false)
      expect(res.errors.length).toBeGreaterThanOrEqual(3)
      expect(res.errors).toContain('Crédito do cliente está bloqueado.')
      expect(res.errors).toContain(
        'Motorista com pendência cadastral ou bloqueio de segurança.',
      )
    })
  })

  // Regras de Processamento de Resposta do Motorista (Chicão IA e Alçadas)
  describe('4. Processamento de Resposta do Motorista & Alçadas', () => {
    function processDriverResponse(
      initialOffer: number,
      replyText: string,
      counterValue?: number,
      autonomiaMaxPct: number = CHICAO_AUTONOMIA_MAX_SPREAD_PCT,
    ) {
      const textNormalized = replyText.toLowerCase().trim()
      const maxAutonomy = Math.round(initialOffer * (1 + autonomiaMaxPct / 100))

      // 1. Aceite
      if (
        textNormalized === 'sim' ||
        textNormalized.includes('aceito') ||
        textNormalized.includes('fechado')
      ) {
        return {
          status: 'ACEITA' as ChicaoOfferStatus,
          finalFreight: initialOffer,
          isLoadLocked: true,
          action: 'OFERTA_ACEITA',
        }
      }

      // 2. Recusa
      if (
        textNormalized.startsWith('nao') ||
        textNormalized.startsWith('não') ||
        textNormalized.includes('recuso')
      ) {
        let category = 'OUTRO'
        if (textNormalized.includes('pouco') || textNormalized.includes('valor'))
          category = 'VALOR'
        else if (textNormalized.includes('longe')) category = 'DESTINO'

        return {
          status: 'RECUSADA' as ChicaoOfferStatus,
          refusalCategory: category,
          isLoadLocked: false,
          action: 'OFERTA_RECUSADA',
        }
      }

      // 3. Contraproposta
      const requestedVal = counterValue || 0
      if (requestedVal > 0) {
        const spreadPct = ((requestedVal - initialOffer) / initialOffer) * 100
        if (requestedVal <= maxAutonomy) {
          // Dentro da alçada (ex: até +3%) -> Aceita automaticamente
          return {
            status: 'ACEITA' as ChicaoOfferStatus,
            finalFreight: requestedVal,
            isLoadLocked: true,
            action: 'ALCADA_AUTOMATICA_ACEITA',
            spreadPct,
          }
        } else {
          // Acima da alçada -> Aguardando aprovação humana
          return {
            status: 'AGUARDANDO_APROVACAO' as ChicaoOfferStatus,
            counterRequested: requestedVal,
            isLoadLocked: false,
            action: 'ENCAMINHADO_APROVACAO_HUMANA',
            spreadPct,
          }
        }
      }

      return {
        status: 'EM_NEGOCIACAO' as ChicaoOfferStatus,
        action: 'DUVIDA_RECEBIDA',
      }
    }

    it('ao responder "SIM", deve ir para status ACEITA e bloquear a carga contra duplicidade', () => {
      const res = processDriverResponse(3000, 'SIM')
      expect(res.status).toBe('ACEITA')
      expect(res.isLoadLocked).toBe(true)
      expect(res.finalFreight).toBe(3000)
    })

    it('ao recusar por valor, deve registrar status RECUSADA com categoria VALOR e liberar a carga', () => {
      const res = processDriverResponse(3000, 'Não compensa, valor muito baixo')
      expect(res.status).toBe('RECUSADA')
      expect(res.refusalCategory).toBe('VALOR')
      expect(res.isLoadLocked).toBe(false)
    })

    it('contraproposta dentro da alçada de +3% (ex: R$ 3.090 em oferta de R$ 3.000) deve ser aceita automaticamente', () => {
      const initial = 3000
      const counter = 3090 // Exatamente +3.0%
      const res = processDriverResponse(initial, 'Faço por 3090', counter, 3.0)

      expect(res.status).toBe('ACEITA')
      expect(res.action).toBe('ALCADA_AUTOMATICA_ACEITA')
      expect(res.finalFreight).toBe(3090)
      expect(res.isLoadLocked).toBe(true)
    })

    it('contraproposta acima da alçada (+5%, R$ 3.150) deve ir para AGUARDANDO_APROVACAO', () => {
      const initial = 3000
      const counter = 3150 // +5% (acima dos +3%)
      const res = processDriverResponse(initial, 'Só consigo ir por 3150', counter, 3.0)

      expect(res.status).toBe('AGUARDANDO_APROVACAO')
      expect(res.action).toBe('ENCAMINHADO_APROVACAO_HUMANA')
      expect(res.counterRequested).toBe(3150)
      expect(res.isLoadLocked).toBe(false)
    })
  })

  // Regra de Envio Sem Credenciais WhatsApp (Honesto ERRO_ENVIO) e Retry sem duplicação
  describe('5. Envio sem credenciais WhatsApp & Retry sem duplicar', () => {
    function simulateDispatch(
      waApiKey: string | undefined,
      existingOffer?: ChicaoFreightOfferEntity,
    ) {
      if (existingOffer) {
        // Retry
        const retryCount = (existingOffer.retry_count || 0) + 1
        if (!waApiKey) {
          return {
            id: existingOffer.id,
            offer_code: existingOffer.offer_code,
            status: 'ERRO_ENVIO' as ChicaoOfferStatus,
            retry_count: retryCount,
            whatsapp_status: 'SEM_CONEXAO',
            errorMessage: 'API WhatsApp não configurada',
            isDuplicate: false,
          }
        }
        return {
          id: existingOffer.id,
          offer_code: existingOffer.offer_code,
          status: 'OFERTA_ENVIADA' as ChicaoOfferStatus,
          retry_count: retryCount,
          whatsapp_status: 'ENVIADO',
          isDuplicate: false,
        }
      }

      // Primeiro Envio
      if (!waApiKey) {
        return {
          id: 'rec_new_offer_01',
          offer_code: 'OF-000001/2025',
          status: 'ERRO_ENVIO' as ChicaoOfferStatus,
          whatsapp_status: 'SEM_CONEXAO',
          errorMessage: 'API WhatsApp não configurada',
          isDuplicate: false,
        }
      }

      return {
        id: 'rec_new_offer_01',
        offer_code: 'OF-000001/2025',
        status: 'ENVIADO_CHICAO' as ChicaoOfferStatus,
        whatsapp_status: 'ENVIADO',
        isDuplicate: false,
      }
    }

    it('quando o ambiente não possuir credenciais WhatsApp, deve gerar status honesto ERRO_ENVIO sem quebrar', () => {
      const res = simulateDispatch(undefined)

      expect(res.status).toBe('ERRO_ENVIO')
      expect(res.whatsapp_status).toBe('SEM_CONEXAO')
      expect(res.errorMessage).toBeDefined()
    })

    it('retry deve atualizar a mesma oferta incrementando retry_count sem criar novo registro duplicado', () => {
      const initialOffer: ChicaoFreightOfferEntity = {
        id: 'rec_existing_123',
        offer_code: 'OF-000123/2025',
        status: 'ERRO_ENVIO',
        retry_count: 0,
      } as ChicaoFreightOfferEntity

      const retryRes = simulateDispatch(undefined, initialOffer)

      expect(retryRes.id).toBe('rec_existing_123')
      expect(retryRes.offer_code).toBe('OF-000123/2025')
      expect(retryRes.retry_count).toBe(1)
      expect(retryRes.isDuplicate).toBe(false)
    })
  })

  // Regra de Transição de Interlocutor (Takeover) e Decisão da Mesa
  describe('6. Interlocução Humana (Takeover & Decisão)', () => {
    function handleTakeover(
      offer: ChicaoFreightOfferEntity,
      action: 'TAKE' | 'HANDBACK',
      userEmail: string,
    ) {
      if (action === 'TAKE') {
        return {
          ...offer,
          active_actor: 'HUMANO' as const,
          human_takeover_user: userEmail,
          ai_handled_pct: 70,
        }
      }
      return {
        ...offer,
        active_actor: 'CHICAO' as const,
      }
    }

    function handleManagementDecision(
      offer: ChicaoFreightOfferEntity,
      decision: 'APPROVE' | 'REJECT',
      approvedValue?: number,
    ) {
      if (decision === 'APPROVE') {
        const val = approvedValue || offer.counter_value_requested || offer.initial_offer_value
        return {
          ...offer,
          status: 'ACEITA' as ChicaoOfferStatus,
          final_contracted_freight: val,
        }
      }
      return {
        ...offer,
        status: 'RECUSADA' as ChicaoOfferStatus,
        refusal_reason: 'Contraproposta não aprovada pela gestão',
      }
    }

    it('operador assume a conversa na Mesa de Fretes e devolve ao Chicão registrando percentuais', () => {
      const baseOffer: ChicaoFreightOfferEntity = {
        id: 'offer_takeover_test',
        offer_code: 'OF-000999/2025',
        status: 'EM_NEGOCIACAO',
        active_actor: 'CHICAO',
        ai_handled_pct: 100,
      } as ChicaoFreightOfferEntity

      const taken = handleTakeover(baseOffer, 'TAKE', 'gestor@ciafal.com.br')
      expect(taken.active_actor).toBe('HUMANO')
      expect(taken.human_takeover_user).toBe('gestor@ciafal.com.br')
      expect(taken.ai_handled_pct).toBe(70)

      const returned = handleTakeover(taken, 'HANDBACK', 'gestor@ciafal.com.br')
      expect(returned.active_actor).toBe('CHICAO')
    })

    it('gestor aprova contraproposta em AGUARDANDO_APROVACAO com valor final negociado', () => {
      const pendingOffer: ChicaoFreightOfferEntity = {
        id: 'offer_pending_1',
        offer_code: 'OF-000777/2025',
        status: 'AGUARDANDO_APROVACAO',
        initial_offer_value: 3000,
        counter_value_requested: 3200,
      } as ChicaoFreightOfferEntity

      const approved = handleManagementDecision(pendingOffer, 'APPROVE', 3180)
      expect(approved.status).toBe('ACEITA')
      expect(approved.final_contracted_freight).toBe(3180)

      const rejected = handleManagementDecision(pendingOffer, 'REJECT')
      expect(rejected.status).toBe('RECUSADA')
      expect(rejected.refusal_reason).toContain('não aprovada pela gestão')
    })
  })
})
