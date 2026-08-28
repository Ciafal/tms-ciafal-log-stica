migrate(
  (app) => {
    // TMS CIAFAL — Sprint 4.2: Índices Cirúrgicos de Performance para Operação em Alta Escala
    // Revisão de campos críticos: pedido, cliente, itinerário, motorista, placa, data, status, oferta, carga, correlation_id

    // 1. sap_sales_orders: Busca rápida por cliente (customer_code) e data do pedido / entrega
    try {
      const salesCol = app.findCollectionByNameOrId('sap_sales_orders')
      salesCol.addIndex('idx_sales_customer_code', false, 'customer_code', '')
      salesCol.addIndex('idx_sales_dates', false, 'order_date, desired_date', '')
      salesCol.addIndex('idx_sales_assigned_load', false, 'assigned_load_id', '')
      app.save(salesCol)
    } catch (err) {
      console.log('Erro ao adicionar índices em sap_sales_orders:', err)
    }

    // 2. freight_offers: Busca rápida por correlation_id e motorista vencedor
    try {
      const offersCol = app.findCollectionByNameOrId('freight_offers')
      offersCol.addIndex('idx_freight_correlation', false, 'correlation_id', '')
      offersCol.addIndex('idx_freight_winner_driver', false, 'winner_driver', '')
      app.save(offersCol)
    } catch (err) {
      console.log('Erro ao adicionar índices em freight_offers:', err)
    }

    // 3. freight_proposals: Busca rápida por correlation_id e valor da proposta
    try {
      const proposalsCol = app.findCollectionByNameOrId('freight_proposals')
      proposalsCol.addIndex('idx_proposals_correlation', false, 'correlation_id', '')
      proposalsCol.addIndex('idx_proposals_offer_value', false, 'offer_id, value', '')
      app.save(proposalsCol)
    } catch (err) {
      console.log('Erro ao adicionar índices em freight_proposals:', err)
    }

    // 4. load_simulation_scenarios: Busca rápida por status + data planejada
    try {
      const scenCol = app.findCollectionByNameOrId('load_simulation_scenarios')
      scenCol.addIndex('idx_scen_date_status', false, 'planned_date, status', '')
      scenCol.addIndex('idx_scen_generated_load', false, 'generated_load_id', '')
      app.save(scenCol)
    } catch (err) {
      console.log('Erro ao adicionar índices em load_simulation_scenarios:', err)
    }

    // 5. queue_entries: Busca rápida por motorista + status e correlation
    try {
      const qCol = app.findCollectionByNameOrId('queue_entries')
      qCol.addIndex('idx_queue_driver_status', false, 'driver, status', '')
      qCol.addIndex('idx_queue_assigned_cargo', false, 'reason', '')
      app.save(qCol)
    } catch (err) {
      console.log('Erro ao adicionar índices em queue_entries:', err)
    }
  },
  (app) => {
    try {
      const salesCol = app.findCollectionByNameOrId('sap_sales_orders')
      salesCol.removeIndex('idx_sales_customer_code')
      salesCol.removeIndex('idx_sales_dates')
      salesCol.removeIndex('idx_sales_assigned_load')
      app.save(salesCol)
    } catch (_) {}

    try {
      const offersCol = app.findCollectionByNameOrId('freight_offers')
      offersCol.removeIndex('idx_freight_correlation')
      offersCol.removeIndex('idx_freight_winner_driver')
      app.save(offersCol)
    } catch (_) {}

    try {
      const proposalsCol = app.findCollectionByNameOrId('freight_proposals')
      proposalsCol.removeIndex('idx_proposals_correlation')
      proposalsCol.removeIndex('idx_proposals_offer_value')
      app.save(proposalsCol)
    } catch (_) {}

    try {
      const scenCol = app.findCollectionByNameOrId('load_simulation_scenarios')
      scenCol.removeIndex('idx_scen_date_status')
      scenCol.removeIndex('idx_scen_generated_load')
      app.save(scenCol)
    } catch (_) {}

    try {
      const qCol = app.findCollectionByNameOrId('queue_entries')
      qCol.removeIndex('idx_queue_driver_status')
      qCol.removeIndex('idx_queue_assigned_cargo')
      app.save(qCol)
    } catch (_) {}
  },
)
