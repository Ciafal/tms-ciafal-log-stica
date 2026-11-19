import { beforeEach, describe, expect, it, vi } from 'vitest'
const calls = vi.hoisted(() => ({ getList: vi.fn(), filter: vi.fn(() => 'plate ~ "ABC"') }))
vi.mock('@/lib/pocketbase/client', () => ({ default: { collection: () => ({ getList: calls.getList }), filter: calls.filter } }))
import { normalizeQueuePlate, queueSapFields, searchQueueSapVehicles } from '../services/queue-sap-vehicle'

describe('Cadastro SAP da inclusão manual na fila', () => {
  beforeEach(() => { vi.clearAllMocks(); calls.getList.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 }) })
  it('usa o CPF específico e completa celular local com o DDD', () => {
    expect(queueSapFields({ id: '1', plate: 'ABC1234', driver_cpf: '123.456.789-09', driver_document: 'RG123', driver_mobile: '99999-8888', driver_ddd_phone: '037', vehicle_type: '0' })).toEqual({ document: '12345678909', whatsapp: '37999998888', vehicleType: '0' })
  })
  it('aceita CPF legado em DOCMT e usa DDD + TELF1 quando CELULAR estiver vazio', () => {
    expect(queueSapFields({ id: '1', plate: 'ABC1234', driver_cpf: null, driver_document: '123.456.789-09', driver_ddd_phone: '31', driver_phone: '98765-4321', vehicle_type: null })).toEqual({ document: '12345678909', whatsapp: '31987654321', vehicleType: '' })
  })
  it('não transforma RG em CPF, não inventa telefone nem tipo e não duplica DDD já informado', () => {
    expect(queueSapFields({ id: '1', plate: 'ABC1234', driver_document: 'MG1234' })).toEqual({ document: '', whatsapp: '', vehicleType: '' })
    expect(queueSapFields({ id: '1', plate: 'ABC1234', driver_mobile: '31987654321', driver_ddd_phone: '31' }).whatsapp).toBe('31987654321')
  })
  it('consulta por placa e pagina repetidamente sem nenhuma gravação', async () => {
    expect(normalizeQueuePlate('abc-1d23')).toBe('ABC1D23')
    for (let i = 0; i < 2; i++) await searchQueueSapVehicles('abc', 2)
    expect(calls.getList).toHaveBeenCalledTimes(2)
    expect(calls.getList).toHaveBeenLastCalledWith(2, 50, expect.objectContaining({ sort: 'plate,plant', requestKey: null }))
    expect(calls.filter).toHaveBeenLastCalledWith('plate ~ {:plate}', { plate: 'ABC' })
  })
})
