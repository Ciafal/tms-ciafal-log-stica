import { describe, it, expect } from 'vitest'
import {
  normalizeZsd004Record,
  evaluateZsd004VehicleEligibility,
  computeZsd004TechnicalKey,
  normalizePlate,
} from '@/domain/zsd004Engine'
import {
  parseSapHtmlTable,
  extractHtmlTableFromMhtml,
} from '@/domain/zsd004MhtmlParser'

describe('Suíte de Testes Obrigatórios SAP ZSD004 (Centro WSTL)', () => {
  // Caso 1: Cadastro aprovado completo
  it('1. Deve normalizar corretamente um registro aprovado e completo', () => {
    const raw = {
      Centro: 'WSTL',
      Placa: 'ABC1D23',
      'Marca/modelo': 'VOLVO FH 540',
      Modelo: 'FH 540 6X4',
      Chassi: '9BWZZZ377VT004251',
      Renavam: '12345678901',
      'Código ANTT': 'ANTT123456',
      'Nome do Motorista': 'Carlos Silva',
      CPF: '123.456.789-00',
      'Doc_Identidade_Motorista': 'MG-12.345.678',
      'Telefone': '31988887777',
      'Tipo Proprietário PJ/PF': 'PJ',
      'Nome do Proprietário': 'Transportadora Ciafal LTDA',
      'CNPJ': '12.345.678/0001-99',
      'Status': 'A',
      'Tipo veículo': 'Carreta LS',
      'Capacidade KG': '32000',
      'Placa da Carreta': 'XYZ9A88',
      'Código ANTT da carreta': 'ANTT998877',
    }

    const norm = normalizeZsd004Record(raw)
    expect(norm.status).toBe('A')
    expect(norm.plate).toBe('ABC1D23')
    expect(norm.driver_cpf).toBe('12345678900')
    expect(norm.owner_cnpj).toBe('12345678000199')
    expect(norm.capacity_kg).toBe(32000)
    expect(norm.integrity_status).toBe('integro')
    expect(norm.validation_issues).toHaveLength(0)

    const eligibility = evaluateZsd004VehicleEligibility(norm)
    expect(eligibility.isEligible).toBe(true)
    expect(eligibility.status).toBe('A')
  })

  // Caso 2: Bloqueado
  it('2. Deve marcar e restringir veículo com status B (bloqueado)', () => {
    const raw = {
      Placa: 'BRA2E19',
      Status: 'B',
      'Tipo veículo': 'Truck',
      'Capacidade KG': '14000',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.status).toBe('B')

    const eligibility = evaluateZsd004VehicleEligibility(norm)
    expect(eligibility.isEligible).toBe(false)
    expect(eligibility.reason).toContain('Veículo bloqueado no cadastro SAP ZSD004')
  })

  // Caso 3: Bloqueado com motivo
  it('3. Deve exibir e considerar o motivo do bloqueio para veículo bloqueado', () => {
    const raw = {
      Placa: 'BLK9988',
      Status: 'B',
      'Motivo do bloqueio': 'Restrição jurídica ANTT suspensa por liminar',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.status).toBe('B')
    expect(norm.block_reason).toBe('Restrição jurídica ANTT suspensa por liminar')

    const eligibility = evaluateZsd004VehicleEligibility(norm)
    expect(eligibility.isEligible).toBe(false)
    expect(eligibility.reason).toContain('Restrição jurídica ANTT')
  })

  // Caso 4: Motorista com telefone incompleto
  it('4. Deve identificar motorista com telefone incompleto sem rejeitar o registro', () => {
    const raw = {
      Placa: 'TEL1234',
      Telefone: '9988', // incompleto (< 10 dígitos)
      Status: 'A',
      'Capacidade KG': '10000',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.integrity_status).toBe('inconsistente')
    expect(norm.validation_issues.some((i) => i.includes('Telefone/celular'))).toBe(true)
  })

  // Caso 5: Veículo sem ANTT
  it('5. Deve classificar veículo sem código ANTT como incompleto sem inventar dados', () => {
    const raw = {
      Placa: 'SNA1234',
      Status: 'A',
      'Tipo veículo': 'Carreta',
      'Capacidade KG': '27000',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.vehicle_antt).toBe('Não informado no SAP')
    expect(norm.validation_issues.some((i) => i.includes('ANTT do veículo ausente'))).toBe(true)
    expect(norm.integrity_status).toBe('incompleto')
  })

  // Caso 6: Veículo com carreta
  it('6. Deve separar corretamente chaves de ANTT e região do veículo e da carreta', () => {
    const raw = {
      Placa: 'CAV1111',
      'Código ANTT': 'ANTT_CAVALO',
      'Região': 'MG',
      'Placa da Carreta': 'CAR2222',
      'Código ANTT da carreta': 'ANTT_CARRETA',
      'Região da Carreta': 'SP',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.plate).toBe('CAV1111')
    expect(norm.vehicle_antt).toBe('ANTT_CAVALO')
    expect(norm.vehicle_region).toBe('MG')

    expect(norm.trailer_plate).toBe('CAR2222')
    expect(norm.trailer_antt).toBe('ANTT_CARRETA')
    expect(norm.trailer_region).toBe('SP')
  })

  // Caso 7: Sem carreta (toco/truck)
  it('7. Deve tratar veículo sem carreta com valor "Não informado no SAP"', () => {
    const raw = {
      Placa: 'TRU5000',
      'Tipo veículo': 'Truck 6x2',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.trailer_plate).toBe('Não informado no SAP')
    expect(norm.trailer_antt).toBe('Não informado no SAP')
  })

  // Caso 8: Proprietário PJ
  it('8. Deve mapear dados de proprietário PJ e CNPJ sem misturar com motorista', () => {
    const raw = {
      Placa: 'PJ00100',
      'Tipo Proprietário PJ/PF': 'PJ',
      'Nome do Proprietário': 'LOGISTICA & TRANSPORTES WSTL LTDA',
      CNPJ: '04.123.456/0001-88',
      'Inscrição Estadual': '109.876.543.210',
      'Nome do Motorista': 'João da Silva',
      CPF: '001.002.003-04',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.owner_type).toBe('PJ')
    expect(norm.owner_name).toBe('LOGISTICA & TRANSPORTES WSTL LTDA')
    expect(norm.owner_cnpj).toBe('04123456000188')
    expect(norm.driver_name).toBe('João da Silva')
    expect(norm.driver_cpf).toBe('00100200304')
  })

  // Caso 9: Cadastro incompleto (Renavam ausente e capacidade zero)
  it('9. Deve sinalizar pendências de Renavam e capacidade sem quebrar o processamento', () => {
    const raw = {
      Placa: 'INC0001',
      Status: 'A',
      'Capacidade KG': '0',
    }
    const norm = normalizeZsd004Record(raw)
    expect(norm.vehicle_renavam).toBe('Não informado no SAP')
    expect(norm.capacity_kg).toBe(0)
    expect(norm.integrity_status).toBe('incompleto')
    expect(norm.validation_issues.some((i) => i.includes('Renavam ausente'))).toBe(true)
    expect(norm.validation_issues.some((i) => i.includes('Capacidade operacional em KG zerada'))).toBe(true)
  })

  // Caso 10: Campo inconsistente (placa inválida)
  it('10. Deve marcar como inconsistente placa com formato incompatível', () => {
    const raw = {
      Placa: 'PLACA_INVALIDA_123',
    }
    const { isValid } = normalizePlate(raw.Placa)
    expect(isValid).toBe(false)

    const norm = normalizeZsd004Record(raw)
    expect(norm.integrity_status).toBe('inconsistente')
    expect(norm.validation_issues.some((i) => i.includes('formato incompatível'))).toBe(true)
  })

  // Caso 11: Sincronizar 2× sem duplicidades (Idempotência da chave técnica)
  it('11. Deve gerar a mesma chave técnica de identidade para o mesmo veículo em re-sincronizações', () => {
    const raw1 = { Placa: 'IDEM123', Chassi: '9BW112233', Renavam: '887766' }
    const raw2 = { Placa: 'idem-123', Chassi: '9BW112233', Renavam: '887766' }

    const key1 = computeZsd004TechnicalKey(normalizeZsd004Record(raw1))
    const key2 = computeZsd004TechnicalKey(normalizeZsd004Record(raw2))

    expect(key1).toBe('V_IDEM123')
    expect(key2).toBe('V_IDEM123')
    expect(key1).toBe(key2)
  })

  // Caso 12: Extração e Parser HTML/MHTML resiliente
  it('12. Deve extrair tabela HTML de exportação MHTML sem quebrar', () => {
    const fakeMhtml = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="----=_NextPart_01D"\r\n\r\n------=_NextPart_01D\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<html><body><table><tr><th>Centro</th><th>Placa</th><th>Status</th><th>Capacidade KG</th></tr><tr><td>WSTL</td><td>ABC1D23</td><td>A</td><td>30000</td></tr></table></body></html>\r\n------=_NextPart_01D--`

    const html = extractHtmlTableFromMhtml(fakeMhtml)
    expect(html).toContain('<table')

    const parseResult = parseSapHtmlTable(html, 'ZSD004.xlxs.MHTML')
    expect(parseResult.success).toBe(true)
    expect(parseResult.records).toHaveLength(1)
    expect(parseResult.records[0].plant).toBe('WSTL')
    expect(parseResult.records[0].plate).toBe('ABC1D23')
    expect(parseResult.records[0].status).toBe('A')
    expect(parseResult.records[0].capacity_kg).toBe(30000)
  })
})
