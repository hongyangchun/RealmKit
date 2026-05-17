/**
 * useWorldData Hook
 * 统一读取世界数据的入口，不直接暴露 store 内部结构
 */
import { useCallback } from 'react';
import { useWorldStore } from '../store/worldStore';
import type {
  WorldData,
  Character,
  City,
  Faction,
  Relation,
  HistoryEvent,
  MapPin,
} from '../types';

export interface WorldDataHook {
  data: WorldData;
  characters: Character[];
  cities: City[];
  factions: Faction[];
  relations: Relation[];
  events: HistoryEvent[];
  mapPins: MapPin[];
  eras: string[];
  mapImage: string | undefined;
  getFactionById: (id: string) => Faction | undefined;
  getCharacterById: (id: string) => Character | undefined;
  getCityById: (id: string) => City | undefined;
  getEventById: (id: string) => HistoryEvent | undefined;
}

export function useWorldData(): WorldDataHook {
  const data = useWorldStore((s) => s.data);

  const getFactionById = useCallback(
    (id: string) => data.factions.find((f) => f.id === id),
    [data.factions]
  );

  const getCharacterById = useCallback(
    (id: string) => data.characters.find((c) => c.id === id),
    [data.characters]
  );

  const getEventById = useCallback(
    (id: string) => data.events.find((e) => e.id === id),
    [data.events]
  );

  const getCityById = useCallback(
    (id: string) => data.cities.find((c) => c.id === id),
    [data.cities]
  );

  return {
    data,
    characters: data.characters,
    cities: data.cities,
    factions: data.factions,
    relations: data.relations,
    events: data.events,
    mapPins: data.mapPins,
    eras: data.eras,
    mapImage: data.mapImage,
    getFactionById,
    getCharacterById,
    getCityById,
    getEventById,
  };
}
