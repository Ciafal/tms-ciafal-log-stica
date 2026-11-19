// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { DriverHelenaLink, linkAtendimentoMotorista } from '../components/common/DriverHelenaLink'

afterEach(cleanup)

it('normaliza o DDD brasileiro e mantém destino interno sem abrir WhatsApp pessoal', () => {
  expect(linkAtendimentoMotorista('(37) 99999-1234')).toBe('/tms/conversas?telefone=5537999991234')
  expect(linkAtendimentoMotorista('+55|37999991234')).toBe('/tms/conversas?telefone=5537999991234')
  expect(linkAtendimentoMotorista('5537999991234')).toBe('/tms/conversas?telefone=5537999991234')
  for (const telefone of ['', 'Não informado', '0', '123']) expect(linkAtendimentoMotorista(telefone)).toBeNull()
})

it('repetir o clique apenas navega para o atendimento, sem enviar mensagem', () => {
  function Destino() { return <output>{useLocation().pathname + useLocation().search}</output> }
  render(<MemoryRouter><DriverHelenaLink telefone="(37) 99999-1234">WhatsApp do motorista</DriverHelenaLink>
    <Routes><Route path="*" element={<Destino />} /></Routes></MemoryRouter>)
  const link = screen.getByRole('link')
  expect(link.getAttribute('target')).toBeNull()
  fireEvent.click(link)
  fireEvent.click(link)
  expect(screen.getByRole('status').textContent).toBe('/tms/conversas?telefone=5537999991234')
})

it('não oferece link para telefone ausente', () => {
  render(<MemoryRouter><DriverHelenaLink telefone="">Não informado</DriverHelenaLink></MemoryRouter>)
  expect(screen.queryByRole('link')).toBeNull()
})
