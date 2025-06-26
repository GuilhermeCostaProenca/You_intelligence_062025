import useSWR from 'swr';
import type { Lead } from '@/app/types/lead';

const base = process.env.NEXT_PUBLIC_API_BASE ?? '';

const fetcher = (url: string) =>
  fetch(base + url).then((r) => {
    if (!r.ok) throw new Error('Erro ao carregar leads da API');
    return r.json();
  });
// src/services/leads.ts
export function useLeads() {
  const { data, error, isLoading } = useSWR<Lead[]>('/mock/leads.json', fetcher, {
    revalidateOnFocus: false,
    onErrorRetry: () => {},
  });

  return {
    leads: data ?? [],     // ✅ retorna como leads
    error,
    isLoading,
  };
}
