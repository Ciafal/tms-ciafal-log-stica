routerAdd(
  'POST',
  '/backend/v1/selection/calculate-fitness',
  (e) => {
    const reqData = e.requestInfo().body || {}
    const cargoId = reqData.cargo_id || 'CARGA_PADRAO'
    const templateCode = reqData.template_code || 'TPL_CARGA_PADRAO'
    const driverId = reqData.driver_id || 'drv_default'
    const driverName = reqData.driver_name || 'Motorista Parceiro'

    // Busca template de pesos se existir
    let w = {
      operationalCompatibilityPct: 20,
      historicalPerformancePct: 15,
      routeExperiencePct: 10,
      customerExperiencePct: 10,
      locationAvailabilityPct: 10,
      expectedCostPct: 20,
      punctualityPct: 5,
      occurrencesPct: 5,
      fredCollaborationPct: 5,
    }

    try {
      const tpl = $app.findFirstRecordByData(
        'selection_criteria_templates',
        'template_code',
        templateCode,
      )
      if (tpl) {
        w.operationalCompatibilityPct = tpl.getInt('weight_operational_compatibility_pct') || 20
        w.historicalPerformancePct = tpl.getInt('weight_historical_performance_pct') || 15
        w.routeExperiencePct = tpl.getInt('weight_route_experience_pct') || 10
        w.customerExperiencePct = tpl.getInt('weight_customer_experience_pct') || 10
        w.locationAvailabilityPct = tpl.getInt('weight_location_availability_pct') || 10
        w.expectedCostPct = tpl.getInt('weight_expected_cost_pct') || 20
        w.punctualityPct = tpl.getInt('weight_punctuality_pct') || 5
        w.occurrencesPct = tpl.getInt('weight_occurrences_pct') || 5
        w.fredCollaborationPct = tpl.getInt('weight_fred_collaboration_pct') || 5
      }
    } catch (_) {}

    const subCompat = reqData.subscore_compat !== undefined ? Number(reqData.subscore_compat) : 95
    const subPerf = reqData.subscore_perf !== undefined ? Number(reqData.subscore_perf) : 92
    const subRoute = reqData.subscore_route !== undefined ? Number(reqData.subscore_route) : 85
    const subCust = reqData.subscore_customer !== undefined ? Number(reqData.subscore_customer) : 90
    const subLoc = reqData.subscore_loc !== undefined ? Number(reqData.subscore_loc) : 80
    const subCost = reqData.subscore_cost !== undefined ? Number(reqData.subscore_cost) : 88
    const subPunct = reqData.subscore_punct !== undefined ? Number(reqData.subscore_punct) : 96
    const subOcc = reqData.subscore_occ !== undefined ? Number(reqData.subscore_occ) : 100
    const subFred = reqData.subscore_fred !== undefined ? Number(reqData.subscore_fred) : 92

    const ptCompat = (subCompat * w.operationalCompatibilityPct) / 100
    const ptPerf = (subPerf * w.historicalPerformancePct) / 100
    const ptRoute = (subRoute * w.routeExperiencePct) / 100
    const ptCust = (subCust * w.customerExperiencePct) / 100
    const ptLoc = (subLoc * w.locationAvailabilityPct) / 100
    const ptCost = (subCost * w.expectedCostPct) / 100
    const ptPunct = (subPunct * w.punctualityPct) / 100
    const ptOcc = (subOcc * w.occurrencesPct) / 100
    const ptFred = (subFred * w.fredCollaborationPct) / 100

    const totalSum =
      ptCompat + ptPerf + ptRoute + ptCust + ptLoc + ptCost + ptPunct + ptOcc + ptFred
    const fitnessScore = Math.min(100, Math.max(0, Math.round(totalSum)))

    const isEligible = subCompat >= 40
    const isRecommended = isEligible && fitnessScore >= 75

    const nominalFreight = reqData.nominal_freight || 3200
    const pedagio = 428.4
    const occurrenceExpectedRiskCost = reqData.occurrences_risk_cost || 120
    const totalExpectedCost = Math.round(nominalFreight + pedagio + occurrenceExpectedRiskCost)

    const responsePayload = {
      cargo_id: cargoId,
      driver_id: driverId,
      driver_name: driverName,
      template_code: templateCode,
      fitness_score: fitnessScore,
      is_eligible: isEligible,
      is_recommended: isRecommended,
      subscores: {
        operationalCompatibility: subCompat,
        historicalPerformance: subPerf,
        routeExperience: subRoute,
        customerExperience: subCust,
        locationAvailability: subLoc,
        expectedCost: subCost,
        punctuality: subPunct,
        occurrences: subOcc,
        fredCollaboration: subFred,
      },
      points_breakdown: {
        operationalCompatibility: Math.round(ptCompat * 10) / 10,
        historicalPerformance: Math.round(ptPerf * 10) / 10,
        routeExperience: Math.round(ptRoute * 10) / 10,
        customerExperience: Math.round(ptCust * 10) / 10,
        locationAvailability: Math.round(ptLoc * 10) / 10,
        expectedCost: Math.round(ptCost * 10) / 10,
        punctuality: Math.round(ptPunct * 10) / 10,
        occurrences: Math.round(ptOcc * 10) / 10,
        fredCollaboration: Math.round(ptFred * 10) / 10,
        totalSum: Math.round(totalSum * 10) / 10,
      },
      expected_cost_details: {
        nominalFreight,
        pedagio,
        occurrenceExpectedRiskCost,
        totalExpectedCost,
        confidenceLevel: 'ALTA',
        costRangeMin: Math.round(totalExpectedCost * 0.96),
        costRangeMax: Math.round(totalExpectedCost * 1.04),
      },
      ai_recommendation_justification: `Score de Adequação ${fitnessScore}/100 gerado com base no template ${templateCode}. Pontos fortes: compatibilidade (${ptCompat.toFixed(1)} pts) e performance histórica (${ptPerf.toFixed(1)} pts).`,
    }

    return e.json(200, responsePayload)
  },
  $apis.requireAuth(),
)
