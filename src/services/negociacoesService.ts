// Serviço de Negociações & Pipeline SAP do HUB CIAFAL
import pb from '@/lib/pocketbase/client'
import { NegociacaoRecord, NegotiationKanbanStatus } from '@/domain/negociacoesEngine'

export const negociacoesService = {
  // Listar todas as negociações
  async listAll(): Promise<NegociacaoRecord[]> {
    try {
      const records = await pb.collection('negociacoes').getFullList<NegociacaoRecord>({
        sort: '-created',
      })
      return records
    } catch (err) {
      console.error('Falha ao listar negociações:', err)
      return []
    }
  },

  // Obter detalhes por ID
  async getById(id: string): Promise<NegociacaoRecord | null> {
    try {
      const record = await pb.collection('negociacoes').getOne<NegociacaoRecord>(id)
      return record
    } catch (err) {
      console.error('Falha ao buscar negociação por ID:', err)
      return null
    }
  },

  // Alterar status simples respeitando regras de fluxo
  async changeStatus(
    negotiationId: string,
    targetStatus: NegotiationKanbanStatus,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await pb.send('/backend/v1/tms/negociacoes/mudar-status', {
        method: 'POST',
        body: {
          negotiation_id: negotiationId,
          target_status: targetStatus,
          reason: reason || '',
        },
      })
      return { success: true }
    } catch (err: any) {
      const msg = err?.response?.error || err?.message || 'Falha ao alterar status.'
      return { success: false, error: msg }
    }
  },

  // Concluir com validação estrita de requisitos
  async conclude(
    negotiationId: string,
    acceptedBy: string,
    acceptanceAt: string,
    completionNotes?: string,
  ): Promise<{
    success: boolean
    error?: string
    pendingFields?: string[]
  }> {
    try {
      const resp = await pb.send('/backend/v1/tms/negociacoes/concluir', {
        method: 'POST',
        body: {
          negotiation_id: negotiationId,
          accepted_by: acceptedBy,
          acceptance_at: acceptanceAt,
          completion_notes: completionNotes || '',
        },
      })
      return { success: true }
    } catch (err: any) {
      const data = err?.response || {}
      return {
        success: false,
        error: data.error || err?.message || 'Falha ao concluir negociação.',
        pendingFields: data.pending_fields || [],
      }
    }
  },

  // Disparar ou reprocessar o pipeline SAP RFC
  async triggerSapPipeline(
    negotiationId: string,
    retryFromStep?: string,
  ): Promise<{
    success: boolean
    mode?: string
    message?: string
    error?: string
    pipeline?: any
  }> {
    try {
      const resp = await pb.send('/backend/v1/tms/negociacoes/pipeline-sap', {
        method: 'POST',
        body: {
          negotiation_id: negotiationId,
          retry_from_step: retryFromStep,
        },
      })
      return {
        success: true,
        mode: resp.mode,
        message: resp.message,
        pipeline: resp.pipeline,
      }
    } catch (err: any) {
      const data = err?.response || {}
      return {
        success: false,
        error: data.error || err?.message || 'Falha ao processar pipeline SAP.',
      }
    }
  },

  // Criar nova negociação
  async create(data: Partial<NegociacaoRecord>): Promise<NegociacaoRecord> {
    const record = await pb.collection('negociacoes').create<NegociacaoRecord>(data)
    return record
  },
}
