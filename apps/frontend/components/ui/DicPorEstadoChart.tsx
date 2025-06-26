'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Lead } from '@/app/types/lead'
import { useMemo } from 'react'

export default function DicPorEstadoChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number[]>()
    leads.forEach((l) => {
      if (!l.estado || l.dicMed == null) return
      map.set(l.estado, [...(map.get(l.estado) ?? []), l.dicMed])
    })
    return Array.from(map.entries()).map(([estado, valores]) => ({
      estado,
      dic: +(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2),
    }))
  }, [leads])

  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <p className="text-sm text-zinc-400 mb-2">DIC médio por Estado</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="estado" stroke="#ccc" />
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="dic" fill="#66CCFF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}