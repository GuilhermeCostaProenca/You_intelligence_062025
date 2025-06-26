'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Lead } from '@/app/types/lead'
import { useMemo } from 'react'

export default function LeadsPorEstadoChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    leads.forEach((l) => {
      if (!l.estado) return
      map.set(l.estado, (map.get(l.estado) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([estado, count]) => ({ estado, count }))
  }, [leads])

  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <p className="text-sm text-zinc-400 mb-2">Leads por Estado</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="estado" stroke="#ccc" />
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="count" fill="#C7EA46" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
