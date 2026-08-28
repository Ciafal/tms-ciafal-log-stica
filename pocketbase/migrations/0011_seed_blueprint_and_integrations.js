migrate(
  (app) => {
    const blueprintCol = app.findCollectionByNameOrId('sap_blueprint_mappings')

    const mappings = [
      {
        process_name: 'Carteira de Pedidos',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'ZSD35 / VBAK / VBAP',
        integration_type: 'RFC',
        status: 'Confirmado',
        tms_field: 'order_number, item_number, weight_kg, customer_code, itinerary_code',
        sap_field: 'VBELN, POSNR, BRGEW, KUNNR, ROUTE',
        notes: 'RFC ZSD35_CARTEIRA_GET para extração periódica da carteira aberta.',
      },
      {
        process_name: 'Cadastro de Motoristas e Veículos',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'ZSD004V_V2 / LFA1 / BUT000',
        integration_type: 'RFC',
        status: 'Confirmado',
        tms_field: 'document, name, plate, vehicle_type, whatsapp',
        sap_field: 'STCD1/STCD2, NAME1, TRAID, VTEXT, TELF1',
        notes: 'O DOCUMENTO (CPF/CNPJ) é a chave de identidade no modelo CIAFAL.',
      },
      {
        process_name: 'Itinerários de Distribuição',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'TVROT / TVRO',
        integration_type: 'RFC',
        status: 'Confirmado',
        tms_field: 'sap_code, description, avg_transit_days',
        sap_field: 'ROUTE, BEZEI, TRAZT',
        notes: 'Código SAP imutável pelo TMS. Somente anotações operacionais são editáveis no TMS.',
      },
      {
        process_name: 'Endereço de Entrega (Ship-to)',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'VBPA (Parceiro WE) / KNA1 / ADRC',
        integration_type: 'RFC',
        status: 'Confirmado',
        tms_field: 'street_address, destination_city, uf, postal_code',
        sap_field: 'STRAS, ORT01, REGIO, PSTLZ',
        notes:
          'Hierarquia estrita: Ship-to oficial > endereço estruturado > cadastro > texto livre (inseguro).',
      },
      {
        process_name: 'Observações do Pedido',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'STXH / STXL (READ_TEXT)',
        integration_type: 'RFC',
        status: 'Confirmado',
        tms_field: 'sap_notes',
        sap_field: 'TDLINE (Object VBBK)',
        notes:
          'Texto informativo. Não cria regra impeditiva automática sem confirmação do operador.',
      },
      {
        process_name: 'Estoque Físico e Disponível',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'MB52 / MARD / MCHB (Lote)',
        integration_type: 'BAPI',
        status: 'Confirmado',
        tms_field: 'available_qty, reserved_qty, blocked_qty',
        sap_field: 'LABST, RESB_QTY, SPEME',
        notes:
          'Distingue rigorosamente estoque físico de estoque disponível para venda e expedição.',
      },
      {
        process_name: 'Análise e Limite de Crédito',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'KNKK / S066 / S067',
        integration_type: 'BAPI',
        status: 'Confirmado',
        tms_field: 'credit_status, credit_limit, current_exposure',
        sap_field: 'KLIMK, SKFOR, SSOBL',
        notes: 'Análise por VALOR FINANCEIRO do pedido no Financeiro, não por peso ou volume.',
      },
      {
        process_name: 'Criação de Documento de Transporte',
        origin_system: 'SAP ECC 6.0 EHP8',
        sap_object: 'VT01N / BAPI_SHIPMENT_CREATE',
        integration_type: 'qRFC',
        status: 'Em desenvolvimento',
        tms_field: 'cargo_id, winner_driver, winner_vehicle, contracted_value',
        sap_field: 'TKNUM, SIGNI, EXPVZ, NETWR',
        notes: 'Idempotência via correlation_id. Retorna número oficial TKNUM criado no SAP.',
      },
      {
        process_name: 'Programação de Produção',
        origin_system: 'PCP Robotizado CIAFAL',
        sap_object: 'PCP_ORD_PROD_INTERFACE',
        integration_type: 'RFC',
        status: 'Em desenvolvimento',
        tms_field: 'production_order_number, scheduled_date, sequence, confidence_pct',
        sap_field: 'AUFNR, GSTRS, CY_SEQNR, CONF_PCT',
        notes: 'Alimenta previsão futura de disponibilidade de laminados sem duplicar mestre SAP.',
      },
      {
        process_name: 'Oportunidades de Complemento',
        origin_system: 'CRM 360° CIAFAL',
        sap_object: 'CRM_LOGISTIC_OPPORTUNITY',
        integration_type: 'RFC',
        status: 'Em desenvolvimento',
        tms_field: 'cargo_id, itinerary_code, residual_capacity_kg, candidate_clients',
        sap_field: 'OPP_ID, ROUTE_CODE, RES_KG, CAND_KUNNR',
        notes: 'Disparo da logística para equipe comercial negociar saldo livre com clientes.',
      },
    ]

    mappings.forEach((m) => {
      const rec = new Record(blueprintCol)
      rec.set('process_name', m.process_name)
      rec.set('origin_system', m.origin_system)
      rec.set('sap_object', m.sap_object)
      rec.set('integration_type', m.integration_type)
      rec.set('status', m.status)
      rec.set('tms_field', m.tms_field)
      rec.set('sap_field', m.sap_field)
      rec.set('notes', m.notes)
      app.save(rec)
    })
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sap_blueprint_mappings')
      app.truncateCollection(col)
    } catch (_) {}
  },
)
