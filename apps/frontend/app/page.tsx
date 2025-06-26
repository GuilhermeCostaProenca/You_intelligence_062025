'use client';

import CardKPI from '@/components/ui/CardKPI';
import { Bolt, Users } from 'lucide-react';
import { useLeads } from '@/services/leads';
import { countByEstado, calcularEnergiaMapeada } from '@/utils/analytics';
import BarLeadsEstado from '@/components/charts/BarLeadsEstados';
import LeadsPorDistribuidoraChart from '@/components/ui/LeadsPorDistribuidora';
import LeadsPorCnaeChart from '@/components/ui/LeadsPorCnaeChart';

export default function Dashboard() {
  // ex: src/app/leads/page.tsx
  const { leads, isLoading, error } = useLeads();
  const dataEstado = countByEstado(leads);
  const energiaTotal = calcularEnergiaMapeada(leads);
  
  if (isLoading) return <p>Carregando…</p>;
  if (error) return <p>Erro: {error.message}</p>;
  return (
    <section className="space-y-8 px-6 lg:px-12 py-10 bg-black text-white">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard Interno - You.On</h1>
        <p className="text-muted-foreground text-sm">
          Mapeamento de leads e oportunidades no mercado de energia.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
        <CardKPI
          title="Energia mapeada (MWh)"
          value={energiaTotal.toFixed(1)}
          icon={<Bolt className="text-yellow-400" />}
          className="bg-[#1a1a1a] border border-white/10"
        />
        <CardKPI
          title="Leads qualificados"
          value={leads.length.toString()}
          icon={<Users className="text-green-400" />}
          className="bg-[#1a1a1a] border border-white/10"
        />
        <CardKPI
          title="% com CNAE"
          value={`${Math.round((leads.filter(l => l.CNAE).length / leads.length) * 100)}%`}
          icon={<Users className="text-blue-400" />}
          className="bg-[#1a1a1a] border border-white/10"
        />
        <CardKPI
          title="Última atualização"
          value={new Date().toLocaleDateString('pt-BR')}
          icon={<Bolt className="text-pink-400" />}
          className="bg-[#1a1a1a] border border-white/10"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121212] rounded-xl p-6 shadow-lg border border-white/10">
          <h2 className="text-lg font-semibold mb-3">Leads por Estado</h2>
          <BarLeadsEstado data={dataEstado} />
        </div>

        <div className="bg-[#121212] rounded-xl p-6 shadow-lg border border-white/10">
          <LeadsPorDistribuidoraChart leads={leads} />
        </div>

        <div className="bg-[#121212] rounded-xl p-6 shadow-lg border border-white/10">
          <LeadsPorCnaeChart leads={leads} />
        </div>
      </div>
    </section>
  );
}
