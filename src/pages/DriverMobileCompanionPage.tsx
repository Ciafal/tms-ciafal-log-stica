import React from 'react'
import {useParams} from 'react-router-dom'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'

export const DriverMobileCompanionPage: React.FC = () => {
  const {sapNumber} = useParams<{sapNumber:string}>()
  return <Card><CardHeader><CardTitle>Acompanhamento do motorista</CardTitle></CardHeader><CardContent className="space-y-3">{sapNumber&&<p>Transporte SAP: <strong>{sapNumber}</strong></p>}<p role="status">Aguardando integração dos dados reais da viagem e do motorista.</p></CardContent></Card>
}
