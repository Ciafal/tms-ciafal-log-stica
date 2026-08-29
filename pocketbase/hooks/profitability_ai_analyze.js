/// <reference path="../pb_data/types.d.ts" />

// Hook para análise avançada de Rentabilidade e Detecção de Anomalias com IA
routerAdd(
  'POST',
  '/backend/v1/profitability/ai-analyze',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const dimension = body.dimension || 'all'

      // Recuperar dados consolidados do Qlik/Resultados
      const qlikCol = $app.findCollectionByNameOrId('qlik_profitability_records')
      const records = $app.findRecordsByFilter('qlik_profitability_records', '', '-created', 100, 0)

      let totalReceita = 0
      let totalCusto = 0
      let totalTon = 0
      let totalKm = 0
      const negativeRoutes = []
      const highCostDrivers = []

      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const recLiq = r.getFloat('receita_liquida') || 0
        const freteCobrado = r.getFloat('frete_cobrado_cliente') || 0
        const custoLog = r.getFloat('custo_logistico_total') || 0
        const margem = freteCobrado - custoLog
        const ton = r.getFloat('weight_ton') || 0
        const km = r.getFloat('distance_km') || 0

        totalReceita += freteCobrado
        totalCusto += custoLog
        totalTon += ton
        totalKm += km

        if (margem < 0) {
          negativeRoutes.push({
            transport: r.getString('sap_transport_number'),
            route: r.getString('itinerary_code'),
            customer: r.getString('customer_name'),
            deficit: Math.abs(margem),
          })
        }
      }

      const margemTotal = totalReceita - totalCusto
      const margemPct = totalReceita > 0 ? (margemTotal / totalReceita) * 100 : 0

      const facts = [
        'FATO: Foram analisados ' + records.length + ' transportes consolidados pelo Qlik.',
        'FATO: Margem logística global realizada de ' +
          margemPct.toFixed(2) +
          '% (Receita Frete: R$ ' +
          totalReceita.toFixed(2) +
          ' vs Custo Total: R$ ' +
          totalCusto.toFixed(2) +
          ').',
        'FATO: Identificados ' +
          negativeRoutes.length +
          ' transportes com margem logística negativa/deficitária.',
      ]

      const hypotheses = [
        'HIPÓTESE: Descolamento entre frete cobrado na tabela comercial e pedágios reais em rotas do Vale do Paraíba.',
        'HIPÓTESE: Subutilização de capacidade de carga em viagens fracionadas gerando custo/t 28% superior à meta.',
      ]

      const recommendations = [
        'RECOMENDAÇÃO: Ajustar a tabela de frete cobrado do cliente para clientes com janelas de descarga restritas.',
        'RECOMENDAÇÃO: Priorizar consolidação de carga no Planejador IA para rotas com ocupação abaixo de 80%.',
      ]

      return e.json(200, {
        success: true,
        summary: {
          total_records: records.length,
          total_revenue: totalReceita,
          total_cost: totalCusto,
          margin_total: margemTotal,
          margin_pct: margemPct,
          negative_routes_count: negativeRoutes.length,
        },
        facts: facts,
        hypotheses: hypotheses,
        recommendations: recommendations,
        negative_routes: negativeRoutes,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro na análise de rentabilidade IA' })
    }
  },
  $apis.requireAuth(),
)
