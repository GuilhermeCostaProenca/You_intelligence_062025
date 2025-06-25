import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

console.log('🟢 Script TS iniciado');

const inputPath = path.resolve(__dirname, '../frontend/public/mock/leads.json');
const outputPath = path.resolve(__dirname, '../frontend/public/mock/leads_com_endereco.json');

let leads: any[] = [];

try {
  const raw = fs.readFileSync(inputPath, 'utf8');
  leads = JSON.parse(raw);
  console.log('🟡 Arquivo carregado com sucesso');
  console.log('📦 Total de leads encontrados:', leads.length);
} catch (err) {
  console.error('❌ Erro ao ler o arquivo de leads:', err);
  process.exit(1);
}

async function getEndereco(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'You.On-PlataformaInterna (tattoraphaela@gmail.com)',
    },
  });
  const data = (await res.json()) as { display_name?: string };
  return data.display_name || '';
}

async function processar() {
  for (const lead of leads) {
    console.log(`🌍 Buscando endereço para ${lead.nome} (${lead.lat}, ${lead.lng})`);
    const endereco = await getEndereco(lead.lat, lead.lng);
    lead.endereco = endereco;
    console.log(`✓ ${lead.nome} → ${endereco}`);
    await new Promise((r) => setTimeout(r, 1100));
  }

  fs.writeFileSync(outputPath, JSON.stringify(leads, null, 2));
  console.log(`\n✅ Arquivo salvo em: ${outputPath}`);
}

processar();
