'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Lead } from '@/app/types/lead'
import { useMemo } from 'react'

export default function LeadsPorCnaeChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    leads.forEach((l) => {
      const cnae = l.CNAE // <-- Corrigido aqui
      if (!cnae) return
      map.set(cnae, (map.get(cnae) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([CNAE, count]) => ({ CNAE, count })) // <-- Mantém nome original
  }, [leads])

  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <p className="text-sm text-zinc-400 mb-2">Leads por CNAE</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="CNAE" stroke="#ccc" /> {/* <-- Nome correto aqui também */}
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="count" fill="#FFD166" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
