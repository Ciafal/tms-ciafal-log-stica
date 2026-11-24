import pb from '@/lib/pocketbase/client'
import type { VeiculoDePlanejamento } from '@/domain/planejamentoDeCargas'

export const consultarVeiculosDePlanejamento = async () => {
  const resposta = await pb.send<{ veiculos: VeiculoDePlanejamento[] }>('/backend/v1/tms/planejamento/elegibilidade', {
    method: 'GET', requestKey: null,
  })
  return resposta.veiculos
}
