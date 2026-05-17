/**
 * useSearch Hook
 * 使用 Fuse.js 实现全局跨类型模糊搜索
 */
import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useWorldData } from './useWorldData';
import type { SearchResult } from '../types';

export function useSearch(query: string): SearchResult[] {
  const { characters, cities, events, mapPins, factions } = useWorldData();

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.trim().length === 0) return [];

    const allItems: SearchResult[] = [
      ...characters.map((c) => ({
        type: 'character' as const,
        id: c.id,
        label: c.name,
        highlight: c.title ? `${c.title} · ${c.bio.slice(0, 40)}` : c.bio.slice(0, 50),
        path: `/characters`,
      })),
      ...cities.map((c) => ({
        type: 'city' as const,
        id: c.id,
        label: c.name,
        highlight: `${c.type === 'capital' ? '首都' : c.type === 'fortress' ? '要塞' : c.type === 'port' ? '港口' : c.type === 'holy_site' ? '圣地' : '村庄'} · 人口 ${c.population ?? '?'}`,
        path: `/factions?expand=${c.factionId}`,
      })),
      ...events.map((e) => ({
        type: 'event' as const,
        id: e.id,
        label: e.title,
        highlight: `${e.year} 年 ${e.location ? `· ${e.location}` : ''} · ${e.description.slice(0, 40)}`,
        path: `/timeline`,
      })),
      ...mapPins.map((p) => ({
        type: 'mapPin' as const,
        id: p.id,
        label: p.label,
        highlight: p.description ? `地图标记 · ${p.description.slice(0, 30)}` : '地图标记',
        path: `/factions`,
      })),
      ...factions.map((f) => ({
        type: 'faction' as const,
        id: f.id,
        label: f.name,
        highlight: f.description.slice(0, 50),
        path: `/factions`,
      })),
    ];

    const fuse = new Fuse(allItems, {
      keys: ['label', 'highlight'],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(query).map((r) => r.item);
  }, [query, characters, cities, events, mapPins, factions]);

  return results;
}
