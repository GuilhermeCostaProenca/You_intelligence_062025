'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Lead } from '@/app/types/lead'
import { useMemo } from 'react'

export default function LeadsPorDistribuidoraChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    leads.forEach((l) => {
      const dist = l.codigoDistribuidora?.toString()
      if (!dist) return
      map.set(dist, (map.get(dist) ?? 0) + 1)

    })
    return Array.from(map.entries()).map(([distribuidora, count]) => ({ distribuidora, count }))
  }, [leads])

  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <p className="text-sm text-zinc-400 mb-2">Leads por Distribuidora</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="codigoDistribuidora" />
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="count" fill="#F76C6C" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
