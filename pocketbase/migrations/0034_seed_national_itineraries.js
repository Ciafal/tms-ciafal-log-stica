migrate(
  (app) => {
    const itinCol = app.findCollectionByNameOrId('sap_itineraries')

    const nationalItineraries = [
      // AL - Alagoas
      {
        sap_code: 'AL001C',
        description: 'Maceió e Região Metropolitana AL',
        uf: 'AL',
        region: 'Alagoas / Maceió',
        avg_transit_days: 4,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // CE - Ceará
      {
        sap_code: 'CE001C',
        description: 'Fortaleza e Região Metropolitana CE',
        uf: 'CE',
        region: 'Ceará / Fortaleza',
        avg_transit_days: 5,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'CE002B',
        description: 'Interior Ceará (Juazeiro do Norte / Sobral)',
        uf: 'CE',
        region: 'Ceará / Interior',
        avg_transit_days: 5,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // BA - Bahia
      {
        sap_code: 'BA001C',
        description: 'Sul da Bahia (Mucuri / Teixeira de Freitas / Ilhéus)',
        uf: 'BA',
        region: 'Bahia / Sul',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'BA002B',
        description: 'Salvador e Polo Camaçari / Feira de Santana',
        uf: 'BA',
        region: 'Bahia / Metropolitana',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // AM - Amazonas
      {
        sap_code: 'AM001C',
        description: 'Manaus e Polo Industrial AM (Cabotagem/Rodo)',
        uf: 'AM',
        region: 'Norte / Amazonas',
        avg_transit_days: 10,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // PE - Pernambuco
      {
        sap_code: 'PE001C',
        description: 'Recife e Região Metropolitana / Suape PE',
        uf: 'PE',
        region: 'Pernambuco / Recife',
        avg_transit_days: 4,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // PR - Paraná
      {
        sap_code: 'PR001A',
        description: 'Curitiba e Região Metropolitana PR',
        uf: 'PR',
        region: 'Paraná / Curitiba',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      {
        sap_code: 'PR002B',
        description: 'Interior PR (Londrina / Maringá / Cascavel)',
        uf: 'PR',
        region: 'Paraná / Interior',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // SC - Santa Catarina
      {
        sap_code: 'SC001A',
        description: 'Joinville / Blumenau / Itajaí / Florianópolis',
        uf: 'SC',
        region: 'Santa Catarina',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // RS - Rio Grande do Sul
      {
        sap_code: 'RS001A',
        description: 'Porto Alegre / Caxias do Sul / Vale dos Sinos',
        uf: 'RS',
        region: 'Rio Grande do Sul',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // MT - Mato Grosso
      {
        sap_code: 'MT001A',
        description: 'Cuiabá / Várzea Grande / Rondonópolis',
        uf: 'MT',
        region: 'Centro-Oeste / MT',
        avg_transit_days: 3,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // MS - Mato Grosso do Sul
      {
        sap_code: 'MS001A',
        description: 'Campo Grande / Dourados / Três Lagoas',
        uf: 'MS',
        region: 'Centro-Oeste / MS',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // PA - Pará
      {
        sap_code: 'PA001A',
        description: 'Belém / Ananindeua / Marabá PA',
        uf: 'PA',
        region: 'Norte / Pará',
        avg_transit_days: 6,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // SE - Sergipe
      {
        sap_code: 'SE001A',
        description: 'Aracaju e Região Metropolitana SE',
        uf: 'SE',
        region: 'Nordeste / Sergipe',
        avg_transit_days: 4,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // RN - Rio Grande do Norte
      {
        sap_code: 'RN001A',
        description: 'Natal e Região Metropolitana / Mossoró RN',
        uf: 'RN',
        region: 'Nordeste / RN',
        avg_transit_days: 5,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // PB - Paraíba
      {
        sap_code: 'PB001A',
        description: 'João Pessoa / Campina Grande PB',
        uf: 'PB',
        region: 'Nordeste / Paraíba',
        avg_transit_days: 4,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // MA - Maranhão
      {
        sap_code: 'MA001A',
        description: 'São Luís / Imperatriz MA',
        uf: 'MA',
        region: 'Nordeste / Maranhão',
        avg_transit_days: 6,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // PI - Piauí
      {
        sap_code: 'PI001A',
        description: 'Teresina / Parnaíba PI',
        uf: 'PI',
        region: 'Nordeste / Piauí',
        avg_transit_days: 5,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // TO - Tocantins
      {
        sap_code: 'TO001A',
        description: 'Palmas / Araguaína / Gurupi TO',
        uf: 'TO',
        region: 'Norte / Tocantins',
        avg_transit_days: 4,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // DF - Distrito Federal
      {
        sap_code: 'DF001A',
        description: 'Brasília / Taguatinga / Ceilândia DF',
        uf: 'DF',
        region: 'Distrito Federal',
        avg_transit_days: 2,
        is_active: true,
        origin: 'SAP_TVROT',
      },
      // RO - Rondônia
      {
        sap_code: 'RO001A',
        description: 'Porto Velho / Ji-Paraná RO',
        uf: 'RO',
        region: 'Norte / Rondônia',
        avg_transit_days: 6,
        is_active: true,
        origin: 'SAP_TVROT',
      },
    ]

    for (const it of nationalItineraries) {
      try {
        app.findFirstRecordByData('sap_itineraries', 'sap_code', it.sap_code)
      } catch (_) {
        const rec = new Record(itinCol)
        rec.set('sap_code', it.sap_code)
        rec.set('description', it.description)
        rec.set('uf', it.uf)
        rec.set('region', it.region)
        rec.set('avg_transit_days', it.avg_transit_days)
        rec.set('is_active', it.is_active)
        rec.set('origin', it.origin)
        rec.set('last_sync_date', new Date().toISOString())
        app.save(rec)
      }
    }
  },
  (app) => {
    // down logic
  },
)
