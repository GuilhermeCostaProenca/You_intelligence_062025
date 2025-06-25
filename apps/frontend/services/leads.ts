import useSWR from 'swr';
import type { Lead } from '@/app/types/lead';

const base = process.env.NEXT_PUBLIC_API_BASE ?? '';

const fetcher = (url: string) =>
  fetch(base + url).then((r) => {
    if (!r.ok) throw new Error('Erro ao carregar leads da API');
    return r.json();
  });

export function useLeads() {
  return useSWR<Lead[]>('/mock/leads.json', fetcher, {
    revalidateOnFocus: false,
    onErrorRetry: () => {}, 
  });
}