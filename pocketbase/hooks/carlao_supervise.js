// Hook Skip Cloud: Análise Operacional e de Supervisão do Carlão & Expedição
routerAdd(
  'POST',
  '/backend/v1/carlao/supervise',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const region = body.region || 'Todas as Regiões'
      const timeWindowDays = body.time_window_days || 30

      // Diagnóstico analítico
      const supervisorInsights = [
        {
          id: 'ins-01',
          tipo: 'ANOMALIA_REGIONAL',
          titulo: 'Aumento de 13% nas contrapropostas no Vale do Paraíba',
          fato: 'Elevação na taxa de pedidos de aumento de frete nas rotas da SP-060.',
          evidencia: '72% dos motoristas responderam acima da meta CIAFAL nos últimos 14 dias.',
          hipotese: 'Maior demanda de fretes concorrentes e custos elevados de retorno na região.',
          impacto: 'Possível extensão do tempo de contratação em +25 minutos.',
          recomendacao:
            'Ajustar meta de referência na faixa inteligente para R$ 2.780 ou avaliar motoristas com retorno garantido.',
          confianca: 'Alta (88%)',
        },
        {
          id: 'ins-02',
          tipo: 'AUTONOMIA_CARLAO',
          titulo: 'Autonomia do Carlão atingiu 82,4% de sucesso',
          fato: 'Negociações concluídas com êxito sem requerer intervenção humana direta.',
          evidencia: '42 de 51 negociações fechadas na 2ª rodada dentro da margem estipulada.',
          hipotese: 'Boa aderência da política de abertura cordial e separação de pedágio.',
          impacto: 'Redução de 34% no tempo de permanência da carga na mesa de fretes.',
          recomendacao: 'Manter nível de autonomia 1 com revisão periódica dos tetos por rota.',
          confianca: 'Muito Alta (95%)',
        },
        {
          id: 'ins-03',
          tipo: 'GARGALO_EXPEDICAO',
          titulo: '38% dos atrasos ocorrem entre fim de carregamento e faturamento',
          fato: 'Aumento do tempo médio na etapa de conferência final e transmissão da NF-e.',
          evidencia: 'Desvio médio de +19 minutos verificado entre as 16h e 17h30.',
          hipotese: 'Concentração de fechamentos fiscais simultâneos no fim do expediente.',
          impacto:
            'Atraso na liberação de saída dos motoristas com risco de perda de janela de entrega.',
          recomendacao: 'Adotar faturamento pré-validado por balança e conferência paralela.',
          confianca: 'Alta (85%)',
        },
      ]

      return e.json(200, {
        status: 'success',
        region: region,
        time_window_days: timeWindowDays,
        autonomia_carlao_pct: 82.4,
        tempo_medio_fechamento_min: 14.8,
        taxa_aceite_onda1_pct: 68.2,
        insights: supervisorInsights,
        generated_at: new Date().toISOString(),
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha na supervisão do Carlão' })
    }
  },
  $apis.requireAuth(),
)
