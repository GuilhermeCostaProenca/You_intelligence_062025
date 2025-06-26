import type { Lead } from '@/app/types/lead';

export function enrichLeads(raw: Lead[]): Lead[] {
  return raw.map((l) => ({
    ...l,
    dicMed: +(l.dicMed.reduce((s, v) => s + v, 0) / l.dicMed.length).toFixed(2),
    ficMed: +(l.ficMed.reduce((s, v) => s + v, 0) / l.ficMed.length).toFixed(2),
  }));
}
