/**
 * cityTypes.ts - 城市类型常量
 *
 * 集中管理城市类型的中文标签和图标映射，
 * 供 CityCard、CompactCityCard、MapCityMarker 等组件共用。
 */

import type { City } from '../types';

/** 城市类型 → 中文标签 */
export const CITY_TYPE_LABELS: Record<City['type'], string> = {
  capital: '首都',
  fortress: '要塞',
  port: '港口',
  village: '村庄',
  holy_site: '圣地',
};

/** 城市类型 → Material Icon 名称 */
export const CITY_TYPE_ICONS: Record<City['type'], string> = {
  capital: 'star',
  fortress: 'shield',
  port: 'anchor',
  village: 'home',
  holy_site: 'church',
};
