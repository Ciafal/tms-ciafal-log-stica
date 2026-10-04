// Serviço de Negociações & Pipeline SAP do HUB CIAFAL
import pb from '@/lib/pocketbase/client'
import {
  NegociacaoRecord,
  NegotiationKanbanStatus,
  ChatMessageItem,
} from '@/domain/negociacoesEngine'

export const negociacoesService = {
  // Listar todas as negociações enriquecidas com dados da oferta vinculada do Chicão (quando existir)
  async listAll(): Promise<NegociacaoRecord[]> {
    try {
      const records = await pb.collection('negociacoes').getFullList<NegociacaoRecord>({
        sort: '-created',
      })

      // Buscar ofertas do Chicão para sincronizar mensagens/áudios e alçadas quando houver vínculo
      let chicaoOffers: any[] = []
      try {
        chicaoOffers = await pb.collection('chicao_freight_offers').getFullList({
          sort: '-created',
        })
      } catch {
        /* intentionally ignored */
      }

      const chicaoByCodeOrCargo = new Map<string, any>()
      for (const off of chicaoOffers) {
        if (off.offer_code) chicaoByCodeOrCargo.set(off.offer_code, off)
        if (off.cargo_id) chicaoByCodeOrCargo.set(off.cargo_id, off)
      }

      // Enriquecer registros de negociação sem quebrar sua estrutura
      return records.map((neg) => {
        const linkedChicao =
          (neg.offer_code ? chicaoByCodeOrCargo.get(neg.offer_code) : null) ||
          (neg.cargo_id ? chicaoByCodeOrCargo.get(neg.cargo_id) : null)

        if (!linkedChicao) {
          // Se não há oferta vinculada, fornecer defaults com base na timeline existente
          const msgs: ChatMessageItem[] = []
          if (neg.timeline_events_json && Array.isArray(neg.timeline_events_json)) {
            for (const ev of neg.timeline_events_json) {
              const sender = ev.actor.includes('Chicão')
                ? 'CHICAO'
                : ev.actor.includes('Motorista')
                  ? 'MOTORISTA'
                  : 'HUMANO'
              msgs.push({
                id: ev.id,
                timestamp: ev.timestamp,
                sender: sender as any,
                text: ev.message,
              })
            }
          }
          return {
            ...neg,
            messages_history: msgs,
            max_autonomy_value: Math.round((neg.initial_freight_value || 5000) * 1.03),
            minutes_without_reply: neg.status === 'EM_NEGOCIACAO' ? 12 : 0,
          }
        }

        return {
          ...neg,
          chicao_offer_id: linkedChicao.id,
          counter_value_requested: linkedChicao.counter_value_requested,
          max_autonomy_value:
            linkedChicao.max_autonomy_value ||
            Math.round((neg.initial_freight_value || 5000) * 1.03),
          messages_history: linkedChicao.messages_history || [],
          refusal_reason: linkedChicao.refusal_reason,
          refusal_category: linkedChicao.refusal_category,
          minutes_without_reply: 15,
        }
      })
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

  // Atualizar parcialmente uma negociação
  async update(id: string, data: Partial<NegociacaoRecord>): Promise<NegociacaoRecord | null> {
    try {
      const record = await pb.collection('negociacoes').update<NegociacaoRecord>(id, data)
      return record
    } catch (err) {
      console.error('Falha ao atualizar negociação:', err)
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

  // Intervenção Humana (Takeover / Assumir)
  async takeover(
    negotiationId: string,
    operatorName: string,
    reason: string,
    chicaoOfferId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await pb.collection('negociacoes').update(negotiationId, {
        responsible_type: 'HUMANO',
        responsible_user_name: operatorName,
        human_takeover_at: new Date().toISOString(),
        human_takeover_reason: reason,
        human_duration_minutes: 1,
      })

      if (chicaoOfferId) {
        try {
          await pb.send('/backend/v1/tms/chicao/takeover', {
            method: 'POST',
            body: {
              offer_id: chicaoOfferId,
              operator_name: operatorName,
              reason,
            },
          })
        } catch {
          /* intentionally ignored */
        }
      }

      return { success: true, message: 'Negociação assumida pelo operador com sucesso.' }
    } catch (err: any) {
      console.error('Falha no takeover:', err)
      return { success: false, message: err?.message || 'Falha ao assumir negociação.' }
    }
  },

  // Devolver negociação ao Chicão IA
  async handbackToChicao(
    negotiationId: string,
    chicaoOfferId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await pb.collection('negociacoes').update(negotiationId, {
        responsible_type: 'CHICAO_IA',
        responsible_user_name: 'Chicão IA (Skip Native)',
      })

      if (chicaoOfferId) {
        try {
          await pb.collection('chicao_freight_offers').update(chicaoOfferId, {
            current_responsible: 'CHICAO_IA',
            takeover_active: false,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      return { success: true, message: 'Negociação devolvida ao agente Chicão IA.' }
    } catch (err: any) {
      console.error('Falha ao devolver ao Chicão:', err)
      return { success: false, message: err?.message || 'Falha ao devolver negociação.' }
    }
  },

  // Enviar mensagem ou áudio no chat da negociação
  async sendChatMessage(
    negotiationId: string,
    sender: 'HUMANO' | 'CHICAO' | 'MOTORISTA',
    text: string,
    isAudio = false,
    chicaoOfferId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const now = new Date().toISOString()
      const newMsg: ChatMessageItem = {
        id: 'msg-' + Date.now(),
        timestamp: now,
        sender,
        text,
        is_audio: isAudio,
        audio_transcript: isAudio ? text : undefined,
      }

      if (chicaoOfferId && sender === 'MOTORISTA') {
        try {
          await pb.send('/backend/v1/tms/chicao/process-reply', {
            method: 'POST',
            body: {
              offer_id: chicaoOfferId,
              driver_message: text,
              is_audio: isAudio,
            },
          })
        } catch {
          /* intentionally ignored */
        }
      } else if (chicaoOfferId) {
        try {
          const off = await pb.collection('chicao_freight_offers').getOne(chicaoOfferId)
          const currentMsgs = off.messages_history || []
          await pb.collection('chicao_freight_offers').update(chicaoOfferId, {
            messages_history: [...currentMsgs, newMsg],
          })
        } catch {
          /* intentionally ignored */
        }
      }

      const neg = await pb.collection('negociacoes').getOne(negotiationId)
      const currentEvs = neg.timeline_events_json || []
      const actorLabel =
        sender === 'CHICAO'
          ? 'Chicão IA'
          : sender === 'MOTORISTA'
            ? `Motorista (${neg.driver_name || 'Autônomo'})`
            : 'Operador Logístico'

      await pb.collection('negociacoes').update(negotiationId, {
        timeline_events_json: [
          ...currentEvs,
          {
            id: 'ev-' + Date.now(),
            timestamp: now,
            actor: actorLabel,
            message: text,
            type: 'MENSAGEM',
          },
        ],
      })

      return { success: true, message: 'Mensagem enviada com sucesso.' }
    } catch (err: any) {
      console.error('Falha ao enviar mensagem:', err)
      return { success: false, message: err?.message || 'Falha ao registrar mensagem.' }
    }
  },

  // Aprovar alçada extraordinária
  async approveExtraBudget(
    negotiationId: string,
    approvedValue: number,
    justification: string,
    chicaoOfferId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await pb.collection('negociacoes').update(negotiationId, {
        negotiated_freight_value: approvedValue,
        total_contracted_value: approvedValue,
        completion_notes: `Alçada extraordinária aprovada: R$ ${approvedValue.toLocaleString('pt-BR')}. Justificativa: ${justification}`,
      })

      if (chicaoOfferId) {
        try {
          await pb.send('/backend/v1/tms/chicao/approve', {
            method: 'POST',
            body: {
              offer_id: chicaoOfferId,
              approved_value: approvedValue,
              justification,
            },
          })
        } catch {
          /* intentionally ignored */
        }
      }

      return { success: true, message: 'Alçada aprovada com sucesso.' }
    } catch (err: any) {
      console.error('Falha ao aprovar alçada:', err)
      return { success: false, message: err?.message || 'Falha ao aprovar alçada.' }
    }
  },
}
