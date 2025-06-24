'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature, Point } from 'geojson';

export default function MapaHeat() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const timeout = setTimeout(() => {
    if (!containerRef.current || mapRef.current) {
      console.log('⚠️ Mapa já inicializado ou container não disponível');
      return;
    }

    console.log('🗺️ Inicializando mapa...');

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
      center: [-46.63, -23.55],
      zoom: 5.5,
    });

    mapRef.current = map;

    map.on('load', async () => {
      try {
        console.log('📡 Mapa carregado! Buscando leads...');
        const res = await fetch('/mock/leads.json');

        if (!res.ok) throw new Error(`Erro no fetch: ${res.status}`);

        const leads = await res.json();
        console.log('✅ Leads carregados:', leads);

        const geojson: FeatureCollection<Point> = {
          type: 'FeatureCollection',
          features: leads.map((l: any): Feature<Point> => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [l.lng, l.lat],
            },
            properties: {
              peso: l.dicMed ?? 1,
            },
          })),
        };

        map.addSource('leads', {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer({
          id: 'heatmap-leads',
          type: 'heatmap',
          source: 'leads',
          maxzoom: 14,
          paint: {
            'heatmap-weight': ['get', 'peso'],
            'heatmap-intensity': 1,
            'heatmap-radius': 20,
            'heatmap-opacity': 0.7,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, '#00f',
              0.4, '#0f0',
              0.6, '#ff0',
              0.8, '#f90',
              1, '#f00',
            ],
          },
        });

        console.log('✅ Camada de heatmap adicionada');
      } catch (err) {
        console.error('❌ Erro no mapa de calor:', err);
      }
    });
  }, 0);

  return () => {
    mapRef.current?.remove();
    console.log('🧹 Mapa desmontado');
    clearTimeout(timeout);
  };
}, []);


  return <div ref={containerRef} className="w-full h-[600px] rounded-lg" />;
}
