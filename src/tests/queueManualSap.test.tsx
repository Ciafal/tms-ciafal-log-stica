// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
const api = vi.hoisted(() => ({
  queue: vi.fn(async () => []), pre: vi.fn(async () => []),
  itineraries: vi.fn(async () => [{ id: 'it1', sap_code: 'MG001A', description: 'Itinerário - MG - Grande BH', is_active: true }]),
  lookup: vi.fn(), submit: vi.fn(), toast: vi.fn(),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'portaria', email: 'portaria@example.test' }, permissions: { canManageQueueStatus: true, canViewFullSensitiveData: true } }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: api.toast }) }))
vi.mock('@/services/tmsService', () => ({ TmsService: { getOperationalQueue: api.queue, getPreRegistrations: api.pre, getSapItineraries: api.itineraries, submitDriverAvailability: api.submit } }))
vi.mock('@/services/queue-sap-vehicle', async importOriginal => ({ ...await importOriginal<object>(), searchQueueSapVehicles: api.lookup }))
import { QueueDashboard } from '../pages/QueueDashboard'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const vehicle = { id: 'v1', plate: 'ABC1D23', plant: 'WSTL', driver_cpf: '12345678909', driver_ddd_phone: '31', driver_phone: '987654321', vehicle_type: '0', status: 'A' }
async function openEmptyForm() {
  api.lookup.mockResolvedValue({ items: [vehicle], totalItems: 1, totalPages: 1 })
  render(<MemoryRouter><QueueDashboard /></MemoryRouter>)
  await waitFor(() => expect(api.itineraries).toHaveBeenCalled())
  fireEvent.click(screen.getAllByRole('button', { name: 'Inclusão Manual Portaria' })[0])
}
async function openForm() {
  await openEmptyForm()
  fireEvent.change(screen.getByRole('combobox', { name: 'Placa do Veículo' }), { target: { value: 'abc-1d23' } })
  await waitFor(() => expect((screen.getByLabelText('CPF / CNPJ:') as HTMLInputElement).value).toBe('12345678909'))
  expect(screen.queryByRole('listbox', { name: 'Placas SAP' })).toBeNull()
}
describe('Janela manual com dados da placa SAP', () => {
  it('abre o formulário e recebe foco sem consultar nem exibir uma lista de placas', async () => {
    await openEmptyForm()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Placa do Veículo' }))
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(api.lookup).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox', { name: 'Placas SAP' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Próxima' })).toBeNull()
  })
  it('abre a pesquisa somente pela lupa e recolhe os resultados após selecionar', async () => {
    await openEmptyForm()
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar placa no SAP' }))
    expect(await screen.findByRole('textbox', { name: 'Buscar placa no SAP' })).toBeTruthy()
    const option = await screen.findByRole('option', { name: /ABC1D23/ })
    fireEvent.click(option)
    await waitFor(() => expect(screen.queryByRole('listbox', { name: 'Placas SAP' })).toBeNull())
    expect((screen.getByLabelText('CPF / CNPJ:') as HTMLInputElement).value).toBe('12345678909')
    expect(api.submit).not.toHaveBeenCalled()
  })
  it('recusa uma placa completa não localizada sem abrir resultados na janela', async () => {
    await openEmptyForm()
    api.lookup.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Placa do Veículo' }), { target: { value: 'ZZZ9999' } })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Placa não localizada no SAP.')
    expect(screen.queryByRole('listbox', { name: 'Placas SAP' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Registrar na Fila e Auditar' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('preenche e trava os três campos; trocar a placa limpa o cadastro anterior', async () => {
    await openForm()
    const doc = screen.getByLabelText('CPF / CNPJ:') as HTMLInputElement
    const phone = screen.getByLabelText('WhatsApp:') as HTMLInputElement
    const type = screen.getByLabelText('Tipo de Veículo:') as HTMLInputElement
    expect([doc.value, phone.value, type.value]).toEqual(['12345678909', '31987654321', '0'])
    expect([doc.readOnly, phone.readOnly, type.readOnly]).toEqual([true, true, true])
    api.lookup.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Placa do Veículo' }), { target: { value: 'ZZZ9999' } })
    expect([doc.value, phone.value, type.value]).toEqual(['', '', ''])
    expect((screen.getByRole('button', { name: 'Registrar na Fila e Auditar' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.submit).not.toHaveBeenCalled()
  })
  it('oferece código + descrição SAP e impede dois envios simultâneos', async () => {
    await openForm()
    fireEvent.click(screen.getAllByRole('combobox').find(el => el.textContent?.includes('Sem preferência'))!)
    expect(await screen.findByText('MG001A')).toBeTruthy()
    expect(screen.getByText('Itinerário - MG - Grande BH')).toBeTruthy()
    let finish!: (value: object) => void
    api.submit.mockReturnValue(new Promise(resolve => { finish = resolve }))
    const button = screen.getByRole('button', { name: 'Registrar na Fila e Auditar' })
    const form = button.closest('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(api.submit).toHaveBeenCalledTimes(1)
    expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({ plate: 'ABC1D23', sapVehicleId: 'v1', document: '12345678909', whatsapp: '31987654321', vehicleType: '0' }))
    finish({ success: true, message: 'Entrada registrada' })
    await waitFor(() => expect(screen.queryByLabelText('CPF / CNPJ:')).toBeNull())
  })
})
