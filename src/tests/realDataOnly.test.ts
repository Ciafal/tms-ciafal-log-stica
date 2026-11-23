// @vitest-environment happy-dom
import {describe,it,expect,vi} from 'vitest'
const calls=vi.hoisted(()=>({create:vi.fn(),getFullList:vi.fn(async()=>[])}))
vi.mock('@/lib/pocketbase/client',()=>{const pb={authStore:{model:null,token:''},collection:()=>({create:calls.create,getFullList:calls.getFullList})};return {default:pb,pb}})
import {materialLabel} from '@/utils/material'
import {formatCurrency} from '@/utils/format'
import {runGlobalCiafalOptimizer} from '@/domain/optimizerEngine'
import {DefaultANTTProvider,DefaultTollProvider,DefaultRoutingProvider,type SapSalesOrderEntity} from '@/domain/rules'
import {SapGateway} from '@/domain/sapGateway'
import {calculateCandidateLogistics} from '@/domain/lexicographicOptimizationEngine'
import {hasRealLogistics} from '@/domain/realLogistics'
import {sapCollectorService} from '@/services/sapCollectorService'
import {tmsService} from '@/services/tmsService'
import {tmsIndicatorsService} from '@/services/tmsIndicatorsService'
import {CrmService} from '@/domain/crmIntegration'

const order={id:'SAP:1/10',order_number:'1',item_number:'10',customer_code:'C1',customer_name:'Cliente SAP',destination_city:'Cidade SAP',uf:'MG',itinerary_code:'MG01',material:'SR88510100000',material_description:'B. REDONDA 220 mm - SA - 1010',weight_kg:1234,total_value:5678,production_status:'Pronto',credit_status:'Liberado',desired_date:'2026-11-19'} as SapSalesOrderEntity
describe('TMS somente dados reais',()=>{
 it('consome os valores fornecidos pela fonte logística, sem substituir por constantes',()=>{
   // Fixture exclusiva do teste; não representa cotação ou tabela oficial publicada.
   const quote={sourceReference:'fixture:test-only',vehiclePlate:'ABC1D23',distanceKm:123,durationMinutes:456,tollsValue:78,antt:{floorValue:2345,tableVersion:'TEST-ONLY',resolutionNumber:'TEST-ONLY',effectiveDate:'2026-11-20',distanceKm:123,axlesCount:5,cargoType:'TEST-ONLY',ccd:0,cc:0,fixedBase:0,formulaDetails:'TEST-ONLY',calculatedAt:'2026-11-20',isOfficialSourceConnected:true,statusText:'TEST-ONLY'}}
   const result=calculateCandidateLogistics([order],'Carreta',28000,undefined,quote)
   expect(result).toMatchObject({distanceKm:123,durationMinutes:456,tollsValue:78,anttFloorValue:2345,estimatedCost:2423})
   expect(hasRealLogistics({...quote,sourceReference:''})).toBe(false)
   expect(hasRealLogistics({...quote,vehiclePlate:'FROTA-CIAFAL'})).toBe(false)
   expect(hasRealLogistics({...quote,antt:{...quote.antt,isOfficialSourceConnected:false}})).toBe(false)
 })
 it('mantém contrato pendente e proteções SAP sem simular conectividade nem número de transporte',async()=>{
   const gateway=new SapGateway('HOMOLOGACAO')
   expect(await gateway.testSapConnection()).toMatchObject({success:false,client:'',technicalUser:''})
   expect(await gateway.callRfc('TEST_ONLY',{})).toMatchObject({isConfigured:false,status:'Aguardando configuração',items:[]})
   const request={cargoId:'test-only',itineraryCode:'MG01',vehiclePlate:'ABC1D23',driverDocument:'',orders:[],totalWeightKg:0,totalValue:0,correlationId:'test-only',idempotencyKey:'test-only'}
   for(let i=0;i<2;i++){
     const result=await gateway.createTransportDoc(request)
     expect(result.success).toBe(false);expect(result.sapTransportNumber).toBeUndefined()
     expect(result.errorMessage).toContain('READ-ONLY')
   }
 })
 it('preserva todos os pedidos e não inventa propostas, custos ou programação futura sem fontes reais',()=>{
   const input={plannedDate:'2026-11-19',orders:[order],stocks:[],pcpOrders:[],queueEntries:[],vehicleCapacityKg:28000,vehicleType:'Carreta'}
   const a=runGlobalCiafalOptimizer(input),b=runGlobalCiafalOptimizer(input)
   expect(a).toEqual(b);expect(a.allProposedCargos).toEqual([]);expect(a.futureProgrammingCargos).toEqual([])
   expect(a.reconciliation.totalWalletOrders).toBe(1);expect(a.reconciliation.totalWalletWeightKg).toBe(1234)
   expect(a.reconciliation.items[0]).toMatchObject({orderId:order.id,orderNumber:'1',status:'RESTRICAO_LOGISTICA'})
   expect(a.reconciliation.reconciliationDiff).toBe(0)
 })
 it('código acompanha descrição e ausência de descrição não vira outro material',()=>{
   expect(materialLabel(order.material,order.material_description)).toBe('SR88510100000 · B. REDONDA 220 mm - SA - 1010')
   expect(materialLabel('MAT1')).toBe('MAT1 · Descrição SAP não disponível')
   expect(formatCurrency(undefined)).toBe('—');expect(formatCurrency(0)).toBe('R$\u00a00,00')
 })
 it('não declara tabela ANTT, pedágios ou endereço validados sem integração',async()=>{
   const antt=new DefaultANTTProvider();expect(antt.isConfigured()).toBe(false)
   expect(()=>antt.calculateFloorPrice({distanceKm:380,vehicleType:'Carreta'})).toThrow('Fonte oficial ANTT não integrada')
   await expect(new DefaultTollProvider().calculateTolls(380,'Carreta',5,'MG01')).rejects.toThrow('Pedágios não integrados')
   expect(await new DefaultRoutingProvider().validateAddress('','DIVINOPOLIS','MG')).toMatchObject({isValidated:false})
   expect(hasRealLogistics(undefined)).toBe(false)
 })
 it('não gera remessa ou transporte SAP, mesmo no reenvio',async()=>{
   for(let i=0;i<2;i++){
     await expect(sapCollectorService.getTransport('12345')).rejects.toThrow('Integração SAP pendente')
     expect(await tmsService.retrySapTransportReprocessing('x')).toMatchObject({success:false})
   }
   expect(calls.create).not.toHaveBeenCalled()
 })
 it('lista de responsáveis vazia não retorna usuários demonstrativos',async()=>{
   expect(await tmsIndicatorsService.fetchActiveUsers()).toEqual([])
 })
 it('não grava uma execução ou propostas sem proveniência logística',async()=>{
   for(let i=0;i<2;i++)await expect(tmsService.saveLoadOptimizationRun({itineraryCode:'MG01',plannedDate:'2026-11-19',vehicleType:'Carreta',minOccupancyPct:70,maxOccupancyPct:95,totalOrdersConsidered:1,totalProposalsCreated:0,totalWeightKg:0,avgOccupancyPct:0,proposals:[],operatorEmail:'operador@example.test',operatorName:'Operação'})).rejects.toThrow('fonte logística real')
   expect(calls.create).not.toHaveBeenCalled()
 })
})

describe('CRM sem confirmação fictícia',()=>{
 it('não confirma conexão ou envio nem no reenvio',async()=>{
   const crm=new CrmService()
   for(let i=0;i<2;i++){
     expect(crm.isConfigured()).toBe(false)
     await expect(crm.testCrmConnection()).rejects.toThrow('não configurada')
     await expect(crm.syncOpportunityStatus('test-only')).rejects.toThrow('não disponível')
   }
   expect(calls.create).not.toHaveBeenCalled()
 })
})