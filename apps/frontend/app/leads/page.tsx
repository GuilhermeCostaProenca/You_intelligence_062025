'use client';

import { useMemo, useState } from 'react';
import LeadsTable from '@/components/leads/LeadsTable';
import FiltroDistribuidora from '@/components/leads/FiltroDistribuidora';
import FiltroSegmento from '@/components/leads/FiltroSegmento';
import { useFilters } from '@/store/filters';
import { useSort } from '@/store/sort';
import { useLeads } from '@/services/leads';
import { CNAE_SEGMENTOS } from '@/utils/cnae';
import { DISTRIBUIDORAS_MAP } from '@/utils/distribuidoras';
import { stripDiacritics } from '@/utils/stripDiacritics';
import { Download, FileDown } from 'lucide-react';
import * as XLSX from "xlsx";

function exportarParaExcel(leadsParaExportar: any[], nomeArquivo = 'leads.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(leadsParaExportar);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  XLSX.writeFile(workbook, nomeArquivo);
}

export default function LeadsPage() {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaInput, setBuscaInput] = useState('');
  const { estado, distribuidora, segmento, clearFilters, setEstado, setBusca, busca } = useFilters();
  const { order, setOrder } = useSort();

  const { leads = [], isLoading, error } = useLeads();

  const estados = useMemo<string[]>(() => {
    return Array.from(new Set(leads.map((l) => l.estado))).sort();
  }, [leads]);

  const rows = useMemo(() => {
    let arr = [...leads];

    if (estado) arr = arr.filter((l) => l.estado === estado);
    if (distribuidora) arr = arr.filter((l) => l.codigoDistribuidora === Number(distribuidora));
    if (segmento) arr = arr.filter((l) => l.CNAE === segmento);

    if (busca) {
      const search = stripDiacritics(busca.toLowerCase());
      arr = arr.filter((l) => {
        const nome = stripDiacritics(l.nome?.toLowerCase() || '');
        const estado = stripDiacritics(l.estado?.toLowerCase() || '');
        const cnae = stripDiacritics(l.CNAE?.toLowerCase() || '');
        const descricao = stripDiacritics(l.descricao?.toLowerCase() || '');
        const distribuidoraNome = stripDiacritics(
          String(DISTRIBUIDORAS_MAP[l.codigoDistribuidora] || l.codigoDistribuidora).toLowerCase()
        );
        const segmentoNome = stripDiacritics((l.CNAE && CNAE_SEGMENTOS[l.CNAE]?.toLowerCase()) || '');

        return (
          nome.includes(search) ||
          estado.includes(search) ||
          cnae.includes(search) ||
          descricao.includes(search) ||
          distribuidoraNome.includes(search) ||
          segmentoNome.includes(search)
        );
      });
    }

    switch (order) {
      case 'dic-asc':
        arr.sort((a, b) => (a.dicMed ?? 0) - (b.dicMed ?? 0));
        break;
      case 'dic-desc':
        arr.sort((a, b) => (b.dicMed ?? 0) - (a.dicMed ?? 0));
        break;
      case 'fic-asc':
        arr.sort((a, b) => (a.ficMed ?? 0) - (b.ficMed ?? 0));
        break;
      case 'fic-desc':
        arr.sort((a, b) => (b.ficMed ?? 0) - (a.ficMed ?? 0));
        break;
    }

    return arr;
  }, [leads, estado, distribuidora, segmento, order, busca]);

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Leads ({rows.length})</h1>

      {/* Botão para mostrar/ocultar filtros */}
      <button
        onClick={() => setMostrarFiltros((prev) => !prev)}
        className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm transition"
      >
        {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
      </button>

      {/* Filtros agrupados */}
      {mostrarFiltros && (
        <div className="flex flex-wrap items-end gap-4 mb-6 bg-zinc-900 border border-zinc-700 rounded-xl px-6 py-4">
          <div className="flex gap-4 items-center">
            <label className="text-sm text-white flex items-center gap-2">
              Estado:
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="text-xs text-white bg-zinc-800 border border-zinc-600 px-3 py-1.5 rounded-md shadow-sm hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition"

              >
                <option value="">Todos</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-white flex items-center gap-2">
              Ordenar por:
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as any)}
                className="text-xs text-white bg-zinc-800 border border-zinc-600 px-3 py-1.5 rounded-md shadow-sm hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition"
              >
                <option value="none">–</option>
                <option value="dic-asc">DIC Crescente</option>
                <option value="dic-desc">DIC Decrescente</option>
                <option value="fic-asc">FIC Crescente</option>
                <option value="fic-desc">FIC Decrescente</option>
              </select>
            </label>

            <input
              type="text"
              placeholder="Buscar..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              className="text-xs text-white bg-zinc-800 border border-zinc-600 px-3 py-1.5 rounded-md shadow-sm hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition"
              spellCheck={false}
            />
            <button
              onClick={() => setBusca(buscaInput)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm transition"
            >
              Buscar
            </button>
          </div>

          <FiltroDistribuidora />
          <FiltroSegmento />

          <button
            onClick={clearFilters}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm transition"
          >
            Limpar filtros
          </button>
        </div>
      )}
      <div className="flex justify-end gap-2 mb-4">
      <button
        onClick={() => exportarParaExcel(rows, 'leads-filtrados.xlsx')}
        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm transition"
      >
        <FileDown size={14} />
        Exportar Filtrados
      </button>

      <button
        onClick={() => exportarParaExcel(leads, 'leads-todos.xlsx')}
        className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-sm transition"
      >
        <Download size={14} />
        Exportar Todos
      </button>
    </div>
    <LeadsTable rows={rows} />
    </section>
  );
}
