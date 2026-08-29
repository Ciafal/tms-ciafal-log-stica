import React, { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Layers,
  ShieldAlert,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Download,
  Filter,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  calculateOrderPriorityScore,
} from '@/domain/rules'
import { exportToCsv } from '@/lib/exportUtils'

// Mock inicial enriquecido espelhando com precisão os 25 registros do PNG de prévia ZSD35
const INITIAL_PREVIEW_RECORDS: Partial<SapSalesOrderEntity>[] = [
  {
    order_number: '258477',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 158.565,
    material: 'B. CH. 1 X 1/8 - 6,00M - 10',
    material_description: 'B. CH. 1 X 1/8 - 6,00M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 159.825,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'METALURGICA ALAGOAS S.A.',
    customer_code: 'CLI-258477',
    total_value: 12500,
  },
  {
    order_number: '258506',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    material_description: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 68.192,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CONSTRUTORA NORDESTE LTDA',
    customer_code: 'CLI-258506',
    total_value: 13200,
  },
  {
    order_number: '258520',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 2 X 3/16 - 6,00 M - 1',
    material_description: 'CANT. 2 X 3/16 - 6,00 M - 1',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 1000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 242.595,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'DISTRIBUIDORA MACEIO AÇOS',
    customer_code: 'CLI-258520',
    total_value: 6800,
  },
  {
    order_number: '258520',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 2 X 1/8 - 6,00 M - 10',
    material_description: 'CANT. 2 X 1/8 - 6,00 M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 1000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 211.17,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'DISTRIBUIDORA MACEIO AÇOS',
    customer_code: 'CLI-258520',
    total_value: 6900,
  },
  {
    order_number: '258679',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. CH. 1 X 1/4 - 6,00 M - 10',
    material_description: 'B. CH. 1 X 1/4 - 6,00 M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 1000,
    order_date: '2026-08-25',
    delivery_week: '35.2026',
    desired_date: '2026-08-25',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 39.568,
    q_dias: 4,
    production_status: 'Pronto',
    customer_name: 'ESTRUTURAS JARAGUA LTDA',
    customer_code: 'CLI-258679',
    total_value: 7100,
  },
  {
    order_number: '258679',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'CANT. 1.1/4 X 1/8 - 6,00 M',
    material_description: 'CANT. 1.1/4 X 1/8 - 6,00 M',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-25',
    delivery_week: '35.2026',
    desired_date: '2026-08-25',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 263.609,
    q_dias: 4,
    production_status: 'Pronto',
    customer_name: 'ESTRUTURAS JARAGUA LTDA',
    customer_code: 'CLI-258679',
    total_value: 13500,
  },
  {
    order_number: '257591',
    uf: 'AM',
    destination_city: 'MANAUS',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'B.RED.107,95MM-NBR1129',
    material_description: 'B.RED.107,95MM-NBR1129',
    freight_value: 330,
    credit_limit: 242580.24,
    balance_quantity_kg: 2000,
    order_date: '2026-08-04',
    delivery_week: '32.2026',
    desired_date: '2026-08-04',
    itinerary_code: 'AM001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 1.825,
    q_dias: 25,
    production_status: 'Pronto',
    customer_name: 'AMAZONAS METALURGICA POLO',
    customer_code: 'CLI-257591',
    total_value: 16800,
  },
  {
    order_number: '256473',
    uf: 'BA',
    destination_city: 'MUCURI',
    weight_kg: 747,
    stock_sider: 0.0,
    material: 'B. RED. 3/4 - 6,00 M - 1020',
    material_description: 'B. RED. 3/4 - 6,00 M - 1020',
    freight_value: 500,
    credit_limit: -5636.0,
    balance_quantity_kg: 747,
    order_date: '2026-07-10',
    delivery_week: '28.2026',
    desired_date: '2026-07-10',
    itinerary_code: 'BA001C',
    credit_reason: 'CRÉDITO OK',
    credit_status: 'Liberado',
    stock_total: 278.341,
    q_dias: 50,
    production_status: 'Pronto',
    customer_name: 'CELULOSE BAHIA S.A.',
    customer_code: 'CLI-256473',
    total_value: 4900,
  },
  {
    order_number: '256473',
    uf: 'BA',
    destination_city: 'MUCURI',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 1 X 1/8 - 6,00 M - 10',
    material_description: 'CANT. 1 X 1/8 - 6,00 M - 10',
    freight_value: 500,
    credit_limit: -5636.0,
    balance_quantity_kg: 1000,
    order_date: '2026-07-10',
    delivery_week: '28.2026',
    desired_date: '2026-07-10',
    itinerary_code: 'BA001C',
    credit_reason: 'CRÉDITO OK',
    credit_status: 'Liberado',
    stock_total: 328.232,
    q_dias: 50,
    production_status: 'Pronto',
    customer_name: 'CELULOSE BAHIA S.A.',
    customer_code: 'CLI-256473',
    total_value: 6700,
  },
  {
    order_number: '257690',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. QUAD. 2" - 6,00 M - 102',
    material_description: 'B. QUAD. 2" - 6,00 M - 102',
    freight_value: 640,
    credit_limit: 70000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-05',
    delivery_week: '32.2026',
    desired_date: '2026-08-05',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 94.142,
    q_dias: 24,
    production_status: 'Pronto',
    customer_name: 'FORTALEZA SIDERURGIA CE',
    customer_code: 'CLI-257690',
    total_value: 7800,
  },
  {
    order_number: '257690',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. QUAD. 2 - 6,00 M - 1045',
    material_description: 'B. QUAD. 2 - 6,00 M - 1045',
    freight_value: 640,
    credit_limit: 70000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-05',
    delivery_week: '32.2026',
    desired_date: '2026-08-05',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 1.115,
    q_dias: 24,
    production_status: 'Pronto',
    customer_name: 'FORTALEZA SIDERURGIA CE',
    customer_code: 'CLI-257690',
    total_value: 7900,
  },
  {
    order_number: '257817',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. QUAD. 2" - 6,00 M - 102',
    material_description: 'B. QUAD. 2" - 6,00 M - 102',
    freight_value: 640,
    credit_limit: 50000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-07',
    delivery_week: '32.2026',
    desired_date: '2026-08-07',
    itinerary_code: 'CE001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 94.142,
    q_dias: 22,
    production_status: 'Pronto',
    customer_name: 'CEARA PERFIS INDUSTRIAIS',
    customer_code: 'CLI-257817',
    total_value: 7800,
  },
  {
    order_number: '257818',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. CH. 2.1/2 X 3/4 - 6,00 M',
    material_description: 'B. CH. 2.1/2 X 3/4 - 6,00 M',
    freight_value: 640,
    credit_limit: 50000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-07',
    delivery_week: '32.2026',
    desired_date: '2026-08-07',
    itinerary_code: 'CE001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 2.435,
    q_dias: 22,
    production_status: 'Pronto',
    customer_name: 'CEARA PERFIS INDUSTRIAIS',
    customer_code: 'CLI-257818',
    total_value: 8100,
  },
  {
    order_number: '258090',
    uf: 'CE',
    destination_city: 'JAGUARUANA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. RED. 1/2 - 6,00 M - 1006',
    material_description: 'B. RED. 1/2 - 6,00 M - 1006',
    freight_value: 630,
    credit_limit: 1.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-13',
    delivery_week: '33.2026',
    desired_date: '2026-08-13',
    itinerary_code: 'CE001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 138.002,
    q_dias: 16,
    production_status: 'Pronto',
    customer_name: 'AGROVILA JAGUARUANA ME',
    customer_code: 'CLI-258090',
    total_value: 6200,
  },
  {
    order_number: '258090',
    uf: 'CE',
    destination_city: 'JAGUARUANA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    material_description: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    freight_value: 630,
    credit_limit: 1.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-13',
    delivery_week: '33.2026',
    desired_date: '2026-08-13',
    itinerary_code: 'CE001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 320.474,
    q_dias: 16,
    production_status: 'Pronto',
    customer_name: 'AGROVILA JAGUARUANA ME',
    customer_code: 'CLI-258090',
    total_value: 6900,
  },
  {
    order_number: '258090',
    uf: 'CE',
    destination_city: 'JAGUARUANA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 1.1/2 X 3/16 - 6,00 M',
    material_description: 'CANT. 1.1/2 X 3/16 - 6,00 M',
    freight_value: 630,
    credit_limit: 1.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-13',
    delivery_week: '33.2026',
    desired_date: '2026-08-13',
    itinerary_code: 'CE001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 253.15,
    q_dias: 16,
    production_status: 'Pronto',
    customer_name: 'AGROVILA JAGUARUANA ME',
    customer_code: 'CLI-258090',
    total_value: 7000,
  },
  {
    order_number: '258270',
    uf: 'CE',
    destination_city: 'JUAZEIRO DO NORTE',
    weight_kg: 785,
    stock_sider: 0.0,
    material: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    material_description: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    freight_value: 600,
    credit_limit: -28435.25,
    balance_quantity_kg: 785,
    order_date: '2026-08-17',
    delivery_week: '34.2026',
    desired_date: '2026-08-17',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 320.474,
    q_dias: 12,
    production_status: 'Pronto',
    customer_name: 'CARIRI METALICA EIRELI',
    customer_code: 'CLI-258270',
    total_value: 5400,
  },
  {
    order_number: '258270',
    uf: 'CE',
    destination_city: 'JUAZEIRO DO NORTE',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'CANT. 2 X 1/8 - 6,00 M - 10',
    material_description: 'CANT. 2 X 1/8 - 6,00 M - 10',
    freight_value: 600,
    credit_limit: -28435.25,
    balance_quantity_kg: 2000,
    order_date: '2026-08-17',
    delivery_week: '34.2026',
    desired_date: '2026-08-17',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 123.344,
    q_dias: 12,
    production_status: 'Pronto',
    customer_name: 'CARIRI METALICA EIRELI',
    customer_code: 'CLI-258270',
    total_value: 13800,
  },
  {
    order_number: '258591',
    uf: 'CE',
    destination_city: 'JUAZEIRO DO NORTE',
    weight_kg: 1000,
    stock_sider: 135.835,
    material: 'B.CH. 1.1/4 X 1/8- 6,00 M-',
    material_description: 'B.CH. 1.1/4 X 1/8- 6,00 M-',
    freight_value: 600,
    credit_limit: -28435.25,
    balance_quantity_kg: 1000,
    order_date: '2026-08-24',
    delivery_week: '35.2026',
    desired_date: '2026-08-24',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 147.438,
    q_dias: 5,
    production_status: 'Pronto',
    customer_name: 'SERRARIA JUAZEIRO DO NORTE',
    customer_code: 'CLI-258591',
    total_value: 6900,
  },
  {
    order_number: '258855',
    uf: 'DF',
    destination_city: 'BRASILIA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 3/4 X 1/8 - 6,00 M -',
    material_description: 'CANT. 3/4 X 1/8 - 6,00 M -',
    freight_value: 360,
    credit_limit: 20000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-27',
    delivery_week: '35.2026',
    desired_date: '2026-08-27',
    itinerary_code: 'DF001B',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 117.632,
    q_dias: 2,
    production_status: 'Pronto',
    customer_name: 'PLANALTO CONSTRUCOES S.A.',
    customer_code: 'CLI-258855',
    total_value: 7200,
  },
  {
    order_number: '258855',
    uf: 'DF',
    destination_city: 'BRASILIA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 1 X 1/8 - 6,00 M - 10',
    material_description: 'CANT. 1 X 1/8 - 6,00 M - 10',
    freight_value: 360,
    credit_limit: 20000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-27',
    delivery_week: '35.2026',
    desired_date: '2026-08-27',
    itinerary_code: 'DF001B',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 328.232,
    q_dias: 2,
    production_status: 'Pronto',
    customer_name: 'PLANALTO CONSTRUCOES S.A.',
    customer_code: 'CLI-258855',
    total_value: 7100,
  },
  {
    order_number: '258503',
    uf: 'DF',
    destination_city: 'BRASILIA',
    weight_kg: 1200,
    stock_sider: 0.0,
    material: 'B. RED. 5/8 - 6,00 M - 1020',
    material_description: 'B. RED. 5/8 - 6,00 M - 1020',
    freight_value: 360,
    credit_limit: 1.0,
    balance_quantity_kg: 1200,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'DF001B',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 199.468,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CAPITAL ESTRUTURAS MET.',
    customer_code: 'CLI-258503',
    total_value: 8400,
  },
  {
    order_number: '258503',
    uf: 'DF',
    destination_city: 'BRASILIA',
    weight_kg: 1200,
    stock_sider: 0.0,
    material: 'B. RED. 3/4 - 6,00 M - 1020',
    material_description: 'B. RED. 3/4 - 6,00 M - 1020',
    freight_value: 360,
    credit_limit: 1.0,
    balance_quantity_kg: 1200,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'DF001B',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 278.341,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CAPITAL ESTRUTURAS MET.',
    customer_code: 'CLI-258503',
    total_value: 8350,
  },
  {
    order_number: '258503',
    uf: 'DF',
    destination_city: 'BRASILIA',
    weight_kg: 1200,
    stock_sider: 0.0,
    material: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    material_description: 'CANT. 1.1/2 X 1/8 - 6,00 M',
    freight_value: 360,
    credit_limit: 1.0,
    balance_quantity_kg: 1200,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'DF001B',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 320.474,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CAPITAL ESTRUTURAS MET.',
    customer_code: 'CLI-258503',
    total_value: 8200,
  },
  {
    order_number: '258713',
    uf: 'ES',
    destination_city: 'CACHOEIRO DE ITAPEMIRIM',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. RED.3/8 - 6,00 M - 1006',
    material_description: 'B. RED.3/8 - 6,00 M - 1006',
    freight_value: 300,
    credit_limit: 7963.94,
    balance_quantity_kg: 1000,
    order_date: '2026-08-25',
    delivery_week: '35.2026',
    desired_date: '2026-08-25',
    itinerary_code: 'ES001A',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 175.929,
    q_dias: 4,
    production_status: 'Pronto',
    customer_name: 'MARMORES & SIDERURGIA ITAPEMIRIM',
    customer_code: 'CLI-258713',
    total_value: 6900,
  },
]

export const SalesWalletPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterCredit, setFilterCredit] = useState('ALL')
  const [filterProduction, setFilterProduction] = useState('ALL')
  const [filterStockIntersection, setFilterStockIntersection] = useState('ALL')
  const [filterWalletTime, setFilterWalletTime] = useState('ALL')
  const [filterOverdue, setFilterOverdue] = useState('ALL')
  const [viewMode, setViewMode] = useState<'png_order' | 'detailed'>('png_order')

  // Stock & Credit Request Modals
  const [stockModalOrder, setStockModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [stockReason, setStockReason] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [isSubmittingStock, setIsSubmittingStock] = useState(false)

  const [creditModalOrder, setCreditModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [creditReason, setCreditReason] = useState('')
  const [creditRequestedVal, setCreditRequestedVal] = useState<number>(0)
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ords, itins] = await Promise.all([
        TmsService.getSapSalesOrders(),
        TmsService.getSapItineraries(),
      ])

      // Se o banco estiver vazio no primeiro boot, mescla com os 25 registros do espelho PNG
      if (ords.length === 0) {
        const seededFromPng = INITIAL_PREVIEW_RECORDS.map((rec, idx) => ({
          id: `seed-png-${idx}`,
          order_number: rec.order_number || `PED-${idx}`,
          item_number: '000010',
          customer_code: rec.customer_code || `CLI-${rec.order_number}`,
          customer_name: rec.customer_name || 'CLIENTE CIAFAL',
          customer_tier: 'B (Corporativo)',
          destination_city: rec.destination_city || 'SÃO PAULO',
          uf: rec.uf || 'SP',
          itinerary_code: rec.itinerary_code || 'SP001A',
          weight_kg: rec.weight_kg || 2000,
          total_value: rec.total_value || 10000,
          material: rec.material || 'LAMINADO DE AÇO',
          material_description: rec.material_description || rec.material || 'LAMINADO',
          order_date: rec.order_date || '2026-08-20',
          desired_date: rec.desired_date || '2026-08-20',
          delivery_week: rec.delivery_week || '34.2026',
          credit_status: rec.credit_status || 'Liberado',
          credit_reason: rec.credit_reason || 'CRÉDITO OK',
          credit_limit: rec.credit_limit || 100000,
          freight_value: rec.freight_value || 500,
          stock_sider: rec.stock_sider || 0,
          stock_total: rec.stock_total || 100,
          production_status: rec.production_status || 'Pronto',
          q_dias: rec.q_dias || 5,
          status: 'disponivel' as const,
        }))
        setOrders(seededFromPng as SapSalesOrderEntity[])
      } else {
        // Enriquecer registros do banco com campos padrão se nulos
        const mapped = ords.map((o) => ({
          ...o,
          q_dias: o.q_dias !== undefined ? o.q_dias : o.raw_q_dias || 5,
          freight_value: o.freight_value || 500,
          credit_limit: o.credit_limit || 50000,
          credit_reason:
            o.credit_reason || (o.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE'),
          stock_total: o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 120.5),
          stock_sider: o.stock_sider || (o.is_sidercentro ? 50.0 : 0.0),
        }))
        setOrders(mapped)
      }

      setItineraries(itins)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar Carteira SAP',
        description: err?.message || 'Falha ao buscar ZSD35.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Processamento e Indicadores Calculados
  const processedOrders = useMemo(() => {
    const today = new Date()
    return orders.map((o) => {
      // 1. Tempo em Carteira (hoje - data pedido)
      let walletDays = o.q_dias || 0
      if (o.order_date) {
        const d = new Date(o.order_date + (o.order_date.includes('T') ? '' : 'T12:00:00'))
        const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (!isNaN(diff) && diff >= 0) {
          walletDays = diff
        }
      }
      if (o.q_dias && o.q_dias > 0) {
        walletDays = o.q_dias
      }

      // 2. Atraso (comparação remessa vs atual)
      let overdueDays = 0
      let delayText = 'No prazo'
      let isOverdue = false
      if (o.desired_date) {
        const desired = new Date(o.desired_date + (o.desired_date.includes('T') ? '' : 'T12:00:00'))
        const diffDays = Math.floor((today.getTime() - desired.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0) {
          overdueDays = diffDays
          delayText = `${diffDays}d atraso`
          isOverdue = true
        } else if (diffDays === 0) {
          delayText = 'Vence hoje'
        } else {
          delayText = `Faltam ${Math.abs(diffDays)}d`
        }
      }

      // 3. Cruzamentos Visuais com Estoque DP34 e PCP Robotizado
      let stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO' =
        'ESTOQUE_ATUAL'
      const stockTotalVal = o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 0)
      const reqWeightTon = (o.weight_kg || 0) / 1000

      if (stockTotalVal >= reqWeightTon && stockTotalVal > 0) {
        stockIntersectionType = 'ESTOQUE_ATUAL'
      } else if (
        o.production_status === 'Em Produção' ||
        o.production_status === 'Programado' ||
        o.production_status === 'Aguardando PCP'
      ) {
        stockIntersectionType = 'PRODUCAO_FUTURA'
      } else {
        stockIntersectionType = 'SEM_PREVISAO'
      }

      const priority = calculateOrderPriorityScore(o)

      return {
        ...o,
        walletDays,
        overdueDays,
        delayText,
        isOverdue,
        stockIntersectionType,
        priorityScore: priority.totalScore,
        priorityClass: priority.classification,
        priorityExplanation: priority.explanation,
      }
    })
  }, [orders])

  // Lista Filtrada
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.material && o.material.toLowerCase().includes(q)) ||
          (o.destination_city && o.destination_city.toLowerCase().includes(q)) ||
          (o.credit_reason && o.credit_reason.toLowerCase().includes(q)) ||
          (o.itinerary_code && o.itinerary_code.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterItinerary !== 'ALL' && o.itinerary_code !== filterItinerary) return false
      if (filterUf !== 'ALL' && o.uf !== filterUf) return false
      if (filterCredit !== 'ALL' && o.credit_status !== filterCredit) return false
      if (filterProduction !== 'ALL' && o.production_status !== filterProduction) return false
      if (filterStockIntersection !== 'ALL' && o.stockIntersectionType !== filterStockIntersection)
        return false

      if (filterWalletTime !== 'ALL') {
        if (filterWalletTime === '0-4' && (o.walletDays < 0 || o.walletDays > 4)) return false
        if (filterWalletTime === '5-15' && (o.walletDays < 5 || o.walletDays > 15)) return false
        if (filterWalletTime === '16-30' && (o.walletDays < 16 || o.walletDays > 30)) return false
        if (filterWalletTime === '>30' && o.walletDays <= 30) return false
      }

      if (filterOverdue !== 'ALL') {
        if (filterOverdue === 'atrasado' && !o.isOverdue) return false
        if (filterOverdue === 'no_prazo' && o.isOverdue) return false
      }

      return true
    })
  }, [
    processedOrders,
    search,
    filterItinerary,
    filterUf,
    filterCredit,
    filterProduction,
    filterStockIntersection,
    filterWalletTime,
    filterOverdue,
  ])

  // KPIs
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const totalWeightTons = filteredOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0) / 1000
    const totalFrete = filteredOrders.reduce((acc, o) => acc + (o.freight_value || 0), 0)
    const estoqueAtualCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'ESTOQUE_ATUAL',
    ).length
    const producaoFuturaCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'PRODUCAO_FUTURA',
    ).length
    const semPrevisaoCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'SEM_PREVISAO',
    ).length

    return {
      totalOrders,
      totalWeightTons: Math.round(totalWeightTons * 10) / 10,
      totalFrete,
      estoqueAtualCount,
      producaoFuturaCount,
      semPrevisaoCount,
    }
  }, [filteredOrders])

  // Exportação CSV
  const handleExportCsv = () => {
    const headers = [
      'Q.Dias',
      'Documento de vendas',
      'Região',
      'Cidade',
      'Qtde Real',
      'Est. Sider',
      'Texto breve de material',
      'Valor do Frete',
      'Limite de Crédito',
      'Saldo',
      'Data do Pedido',
      'Data Remessa(Semana)',
      'Itinerário',
      'Motivo Crédito',
      'Estoque Total',
      'Cruzamento DP34/PCP',
    ]

    const rows = filteredOrders.map((o) => [
      o.q_dias || o.walletDays || 0,
      o.order_number,
      o.uf,
      o.destination_city,
      (o.weight_kg / 1000).toFixed(3),
      (o.stock_sider || 0).toFixed(3),
      o.material || o.material_description || '',
      o.freight_value || 0,
      o.credit_limit || 0,
      (o.balance_quantity_kg ? o.balance_quantity_kg / 1000 : o.weight_kg / 1000).toFixed(3),
      o.order_date || '',
      o.delivery_week || o.desired_date || '',
      o.itinerary_code,
      o.credit_reason || o.credit_status || '',
      (o.stock_total || 0).toFixed(3),
      o.stockIntersectionType,
    ])

    exportToCsv(`Carteira_ZSD35_CIAFAL_${new Date().toISOString().split('T')[0]}`, headers, rows)
  }

  // Ações Operacionais
  const handleOpenStockModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestStockConfirmation) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar confirmação de estoque.',
        variant: 'destructive',
      })
      return
    }
    setStockModalOrder(order)
    setStockReason('Confirmação de saldo físico em estoque para carregamento')
    setStockNotes(
      `Pedido ${order.order_number} (${order.material}). Solicitado saldo para liberação de transporte.`,
    )
  }

  const handleSubmitStockRequest = async () => {
    if (!stockModalOrder) return
    setIsSubmittingStock(true)
    try {
      const res = await TmsService.createStockConfirmationRequest(
        {
          order_number: stockModalOrder.order_number,
          item_number: stockModalOrder.item_number || '000010',
          material_code: stockModalOrder.material || 'MAT-GEN',
          material_description: stockModalOrder.material_description || stockModalOrder.material,
          required_quantity: stockModalOrder.weight_kg / 1000,
          stock_informed: stockModalOrder.weight_kg / 1000,
          unit: 'TON',
          reason: stockReason,
          notes: stockNotes,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Solicitação de Confirmação Enviada',
          description: `Workflow iniciado para o pedido ${stockModalOrder.order_number}. Responsável do Pátio/Estoque notificado.`,
        })
        setStockModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar confirmação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingStock(false)
    }
  }

  const handleOpenCreditModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestCreditReassessment) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar reavaliação de crédito.',
        variant: 'destructive',
      })
      return
    }
    setCreditModalOrder(order)
    setCreditRequestedVal(order.total_value || 0)
    setCreditReason('Liberação de crédito para composição e fechamento de carga completa')
  }

  const handleSubmitCreditRequest = async () => {
    if (!creditModalOrder) return
    setIsSubmittingCredit(true)
    try {
      const res = await TmsService.createCreditReassessmentRequest(
        {
          customer_code: creditModalOrder.customer_code,
          customer_name: creditModalOrder.customer_name,
          order_number: creditModalOrder.order_number,
          order_value: creditModalOrder.total_value,
          requested_value: creditRequestedVal,
          logistic_reason: creditReason,
          desired_delivery_date: creditModalOrder.desired_date,
          days_overdue: (creditModalOrder as any).overdueDays || 0,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Reavaliação de Crédito Enviada',
          description: `Solicitação encaminhada ao setor Financeiro/Crédito para o cliente ${creditModalOrder.customer_name}.`,
        })
        setCreditModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar reavaliação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingCredit(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header com Identidade CIAFAL Pantone 2945 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Carteira de Pedidos (SAP ZSD35)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              ESTRUTURA OFICIAL 28 CAMPOS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Espelho da transação SAP ZSD35 da CIAFAL. Colunas e ordenação alinhadas aos registros
            reais da siderúrgica com indicadores de estoque DP34, PCP Robotizado e tempo em
            carteira.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Exportar CSV
          </Button>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar ZSD35
          </Button>
        </div>
      </div>

      {/* KPI Cards & Indicadores Cruzados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Itens em Carteira
            </span>
            <div className="text-lg font-black font-mono text-slate-900">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Volume Total (Qtde Real)
            </span>
            <div className="text-lg font-black font-mono text-sky-700">
              {metrics.totalWeightTons} t
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              ✓ Estoque Atual (DP34)
            </span>
            <div className="text-lg font-black font-mono text-emerald-700">
              {metrics.estoqueAtualCount}{' '}
              <span className="text-xs font-normal text-slate-400">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-sky-600 block">
              ⚙ Produção Futura (PCP)
            </span>
            <div className="text-lg font-black font-mono text-sky-700">
              {metrics.producaoFuturaCount}{' '}
              <span className="text-xs font-normal text-slate-400">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-amber-500 block">
              ⚠ Sem Previsão Estoque
            </span>
            <div className="text-lg font-black font-mono text-amber-600">
              {metrics.semPrevisaoCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total Frete Previsto
            </span>
            <div className="text-lg font-black font-mono text-slate-800">
              R$ {metrics.totalFrete.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por Doc. Vendas, Cidade, Material, Itinerário, Motivo Crédito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* UF */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Região / UF:</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Regiões</SelectItem>
                  <SelectItem value="AL">AL (Alagoas)</SelectItem>
                  <SelectItem value="AM">AM (Amazonas)</SelectItem>
                  <SelectItem value="BA">BA (Bahia)</SelectItem>
                  <SelectItem value="CE">CE (Ceará)</SelectItem>
                  <SelectItem value="DF">DF (Distrito Federal)</SelectItem>
                  <SelectItem value="ES">ES (Espírito Santo)</SelectItem>
                  <SelectItem value="MG">MG (Minas Gerais)</SelectItem>
                  <SelectItem value="SP">SP (São Paulo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Itinerário */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Itinerário:</label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Itinerários</SelectItem>
                  <SelectItem value="AL001C">AL001C (Maceió)</SelectItem>
                  <SelectItem value="AM001C">AM001C (Manaus)</SelectItem>
                  <SelectItem value="BA001C">BA001C (Mucuri)</SelectItem>
                  <SelectItem value="CE001C">CE001C (Fortaleza/Juazeiro)</SelectItem>
                  <SelectItem value="DF001B">DF001B (Brasília)</SelectItem>
                  <SelectItem value="ES001A">ES001A (Cachoeiro)</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} ({it.uf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cruzamento Estoque DP34 vs PCP */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Cruzamento DP34 x PCP:
              </label>
              <Select value={filterStockIntersection} onValueChange={setFilterStockIntersection}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Cruzamentos</SelectItem>
                  <SelectItem value="ESTOQUE_ATUAL">Estoque Atual (DP34)</SelectItem>
                  <SelectItem value="PRODUCAO_FUTURA">Produção Futura (PCP)</SelectItem>
                  <SelectItem value="SEM_PREVISAO">Sem Previsão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tempo em Carteira (Q.Dias) */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Q.Dias em Carteira:
              </label>
              <Select value={filterWalletTime} onValueChange={setFilterWalletTime}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Faixas</SelectItem>
                  <SelectItem value="0-4">0 a 4 dias (Verde)</SelectItem>
                  <SelectItem value="5-15">5 a 15 dias (Amarelo)</SelectItem>
                  <SelectItem value="16-30">16 a 30 dias (Laranja)</SelectItem>
                  <SelectItem value=">30">&gt; 30 dias (Vermelho)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Crédito */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Crédito:</label>
              <Select value={filterCredit} onValueChange={setFilterCredit}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Créditos</SelectItem>
                  <SelectItem value="Liberado">Liberado / OK</SelectItem>
                  <SelectItem value="Em Análise">Em Análise / Checar Limite</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atraso / Prazo Remessa */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Atraso / Remessa:
              </label>
              <Select value={filterOverdue} onValueChange={setFilterOverdue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos os Prazos</SelectItem>
                  <SelectItem value="atrasado">Apenas Atrasados</SelectItem>
                  <SelectItem value="no_prazo">No Prazo / Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Principal da Carteira ZSD35 (Espelho Exato da Imagem de Referência) */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800">
              Visualização da Carteira ZSD35 ({filteredOrders.length} registros)
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-white text-slate-700">
              Ordem das Colunas: Idêntica ao Relatório SAP CIAFAL
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Estoque
              Atual
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Produção Futura
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Sem Previsão
            </span>
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
            <thead>
              {/* As 15 Colunas Exatas da Imagem de Referência + Cruzamentos */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <th className="p-2.5 text-center font-mono w-16">Q.Dias</th>
                <th className="p-2.5 font-mono">Documento de vendas</th>
                <th className="p-2.5 text-center font-mono">Região</th>
                <th className="p-2.5">Cidade</th>
                <th className="p-2.5 text-right font-mono">Qtde Real</th>
                <th className="p-2.5 text-right font-mono">Est. Sider</th>
                <th className="p-2.5">Texto breve de material</th>
                <th className="p-2.5 text-right font-mono">Valor do Frete</th>
                <th className="p-2.5 text-right font-mono">Limite de Crédito</th>
                <th className="p-2.5 text-right font-mono">Saldo</th>
                <th className="p-2.5 text-center font-mono">Data do Pedido</th>
                <th className="p-2.5 text-center font-mono">Data Remessa(Semana)</th>
                <th className="p-2.5 text-center font-mono">Itinerário</th>
                <th className="p-2.5">Motivo Crédito</th>
                <th className="p-2.5 text-right font-mono">Estoque Total</th>
                <th className="p-2.5 text-center">Cruzamento DP34/PCP</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px] font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-slate-400 font-sans">
                    Nenhum registro ZSD35 encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  // Badge de Q.Dias / Tempo em carteira
                  let qDiasClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  const dias = order.q_dias || order.walletDays || 0
                  if (dias > 30) {
                    qDiasClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                  } else if (dias >= 16) {
                    qDiasClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold'
                  } else if (dias >= 5) {
                    qDiasClass = 'bg-amber-100 text-amber-800 border-amber-300'
                  }

                  // Badge de Cruzamento DP34 x PCP
                  let intersectionBadge = (
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                      Estoque Atual
                    </Badge>
                  )
                  if (order.stockIntersectionType === 'PRODUCAO_FUTURA') {
                    intersectionBadge = (
                      <Badge className="bg-sky-600 text-white text-[9px] px-1.5 py-0">
                        Produção Futura
                      </Badge>
                    )
                  } else if (order.stockIntersectionType === 'SEM_PREVISAO') {
                    intersectionBadge = (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                        Sem Previsão
                      </Badge>
                    )
                  }

                  // Formatadores
                  const qtdeRealFormatted = (order.weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estSiderFormatted = (order.stock_sider || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const saldoFormatted = (
                    order.balance_quantity_kg
                      ? order.balance_quantity_kg / 1000
                      : order.weight_kg / 1000
                  ).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estoqueTotalFormatted = (order.stock_total || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })

                  const orderDateFormatted = order.order_date
                    ? order.order_date.includes(' ')
                      ? order.order_date
                      : `${order.order_date} 00:00:00`
                    : '2026-08-20 00:00:00'

                  return (
                    <tr
                      key={order.id || `${order.order_number}-${idx}`}
                      className="hover:bg-sky-50/50 transition-colors"
                    >
                      {/* 1. Q.Dias */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 ${qDiasClass}`}
                          title={`Tempo em carteira calculado: ${dias} dias`}
                        >
                          {dias}
                        </Badge>
                      </td>

                      {/* 2. Documento de vendas */}
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                        </div>
                      </td>

                      {/* 3. Região */}
                      <td className="p-2.5 text-center font-bold text-slate-700">{order.uf}</td>

                      {/* 4. Cidade */}
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        {order.destination_city}
                      </td>

                      {/* 5. Qtde Real */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {qtdeRealFormatted}
                      </td>

                      {/* 6. Est. Sider */}
                      <td className="p-2.5 text-right text-slate-600 font-mono">
                        {estSiderFormatted}
                      </td>

                      {/* 7. Texto breve de material */}
                      <td className="p-2.5 font-sans text-slate-800 max-w-[220px] truncate">
                        <span className="font-medium text-[#005596] font-mono text-xs">
                          {order.material}
                        </span>
                      </td>

                      {/* 8. Valor do Frete */}
                      <td className="p-2.5 text-right text-slate-800">
                        {order.freight_value !== undefined ? order.freight_value : 500}
                      </td>

                      {/* 9. Limite de Crédito */}
                      <td
                        className={`p-2.5 text-right font-mono ${
                          (order.credit_limit || 0) < 0
                            ? 'text-rose-600 font-bold'
                            : (order.credit_limit || 0) <= 1
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {(order.credit_limit || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* 10. Saldo */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {saldoFormatted}
                      </td>

                      {/* 11. Data do Pedido */}
                      <td className="p-2.5 text-center text-[10px] text-slate-600">
                        {orderDateFormatted}
                      </td>

                      {/* 12. Data Remessa(Semana) */}
                      <td className="p-2.5 text-center">
                        <div className="font-semibold text-slate-800">
                          {order.delivery_week ||
                            (order.desired_date
                              ? `${order.desired_date} (${order.delayText})`
                              : '34.2026')}
                        </div>
                        {order.isOverdue && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 mt-0.5">
                            {order.delayText}
                          </Badge>
                        )}
                      </td>

                      {/* 13. Itinerário */}
                      <td className="p-2.5 text-center">
                        <Badge className="bg-[#005596] text-white text-[10px] font-mono px-1.5 py-0">
                          {order.itinerary_code}
                        </Badge>
                      </td>

                      {/* 14. Motivo Crédito */}
                      <td className="p-2.5 font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            order.credit_reason?.includes('DATA SEGUINTE')
                              ? 'bg-amber-100 text-amber-900'
                              : order.credit_reason?.includes('CHECAR')
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {order.credit_reason ||
                            (order.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE')}
                        </span>
                      </td>

                      {/* 15. Estoque Total */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {estoqueTotalFormatted}
                      </td>

                      {/* 16. Cruzamento DP34 / PCP */}
                      <td className="p-2.5 text-center font-sans">{intersectionBadge}</td>

                      {/* 17. Ações Operacionais */}
                      <td className="p-2.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStockModal(order)}
                            className="h-6 px-1.5 text-[10px] text-sky-700 hover:bg-sky-50 border-slate-200"
                            title="Solicitar Confirmação de Estoque"
                          >
                            DP34
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreditModal(order)}
                            className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50 border-slate-200"
                            title="Solicitar Reavaliação de Crédito"
                          >
                            Crédito
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Stock Confirmation Request Modal */}
      <Dialog open={!!stockModalOrder} onOpenChange={(open) => !open && setStockModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#005596]" />
              Solicitar Confirmação de Estoque DP34
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal para verificação física de saldo de laminados. Não altera o SAP
              diretamente.
            </DialogDescription>
          </DialogHeader>

          {stockModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">Pedido / Item</span>
                  <strong>{stockModalOrder.order_number}</strong> (Item{' '}
                  {stockModalOrder.item_number || '000010'})
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Material</span>
                  <strong className="text-[#005596]">{stockModalOrder.material}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Quantidade Necessária</span>
                  <strong>{(stockModalOrder.weight_kg / 1000).toFixed(1)} TON</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Estoque Total Informado</span>
                  <strong>
                    {(stockModalOrder.stock_total || 0).toFixed(3)} t (
                    {stockModalOrder.production_status})
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Motivo da Solicitação:
                </label>
                <Input
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Observações / Detalhes:
                </label>
                <Textarea
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingStock}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitStockRequest}
              disabled={isSubmittingStock}
              className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold"
            >
              {isSubmittingStock ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Reassessment Request Modal */}
      <Dialog open={!!creditModalOrder} onOpenChange={(open) => !open && setCreditModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Solicitar Reavaliação de Crédito
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal Logística → Financeiro para liberação ou desbloqueio de valor de
              pedido.
            </DialogDescription>
          </DialogHeader>

          {creditModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 grid grid-cols-2 gap-2 text-amber-950">
                <div>
                  <span className="text-amber-700 text-[10px] block">Cliente</span>
                  <strong>{creditModalOrder.customer_name}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Pedido SAP</span>
                  <strong>{creditModalOrder.order_number}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Limite Atual / Saldo</span>
                  <strong>
                    R${' '}
                    {(creditModalOrder.credit_limit || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Motivo Atual</span>
                  <Badge className="bg-amber-600 text-white text-[9px]">
                    {creditModalOrder.credit_reason || creditModalOrder.credit_status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Valor Solicitado para Desbloqueio (R$):
                </label>
                <Input
                  type="number"
                  value={creditRequestedVal}
                  onChange={(e) => setCreditRequestedVal(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Justificativa Logística:
                </label>
                <Textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingCredit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCreditRequest}
              disabled={isSubmittingCredit}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              {isSubmittingCredit ? 'Enviando...' : 'Encaminhar ao Financeiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalesWalletPage
