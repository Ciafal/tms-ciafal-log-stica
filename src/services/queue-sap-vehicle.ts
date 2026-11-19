import pb from '@/lib/pocketbase/client'

export interface QueueSapVehicle {
  id: string
  plate: string
  plant?: string
  driver_cpf?: string | null
  driver_document?: string | null
  driver_mobile?: string | null
  driver_ddd_phone?: string | null
  driver_phone?: string | null
  vehicle_type?: string | null
  status?: string
  block_reason?: string | null
}

export const normalizeQueuePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '')

export function queueSapFields(vehicle: QueueSapVehicle) {
  // DOCMT contém o CPF na base legada; CPF, quando preenchido, é o campo específico.
  const cpf = digits(vehicle.driver_cpf)
  const legacyCpf = digits(vehicle.driver_document)
  const document = cpf.length === 11 ? cpf : legacyCpf.length === 11 ? legacyCpf : ''
  const mobile = digits(vehicle.driver_mobile)
  const phone = mobile || digits(vehicle.driver_phone)
  const ddd = digits(vehicle.driver_ddd_phone).replace(/^0+/, '')
  const whatsapp = phone.length >= 8 && phone.length <= 9 && ddd ? `${ddd}${phone}` : phone
  return { document, whatsapp, vehicleType: String(vehicle.vehicle_type ?? '').trim() }
}

export async function searchQueueSapVehicles(term: string, page = 1) {
  const plate = normalizeQueuePlate(term)
  return pb.collection('sap_zsd004_vehicles_drivers').getList<QueueSapVehicle>(page, 50, {
    filter: plate ? pb.filter('plate ~ {:plate}', { plate }) : '',
    sort: 'plate,plant',
    fields: 'id,plate,plant,driver_cpf,driver_document,driver_mobile,driver_ddd_phone,driver_phone,vehicle_type,status,block_reason',
    requestKey: null,
  })
}
