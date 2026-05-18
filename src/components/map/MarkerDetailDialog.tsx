/**
 * MarkerDetailDialog - 地图标记详情弹窗
 *
 * 当用户在仪表盘地图上点击城市/势力/事件/图钉时，
 * 弹出此对话框显示该标记的详细信息。
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import FlagIcon from '@mui/icons-material/Flag';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useWorldStore } from '../../store/worldStore';
import type { City, Faction, HistoryEvent, MapPin } from '../../types';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export type MarkerType = 'city' | 'faction' | 'event' | 'pin';

export interface MarkerInfo {
  type: MarkerType;
  id: string;
}

interface MarkerDetailDialogProps {
  marker: MarkerInfo | null;
  onClose: () => void;
}

// ─── 子组件：城市详情 ─────────────────────────────────────────────────────────

const CityDetail: React.FC<{ city: City }> = ({ city }) => {
  const factions = useWorldStore((s) => s.data.factions);
  const events = useWorldStore((s) => s.data.events);
  const characters = useWorldStore((s) => s.data.characters);
  const faction = factions.find((f) => f.id === city.factionId);
  const relatedEvents = events.filter((e) => city.eventIds.includes(e.id) || e.cityId === city.id);
  const relatedCharacters = characters.filter((c) => c.factionId === city.factionId);

  const cityTypeLabel: Record<string, string> = {
    capital: '首都',
    fortress: '要塞',
    port: '港口',
    village: '村落',
    holy_site: '圣地',
  };

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <LocationCityIcon sx={{ color: faction?.color ?? '#8B4513', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'LXGW WenKai TC', serif", lineHeight: 1.2 }}>
            {city.name}
            {city.isCapital && (
              <Typography component="span" sx={{ ml: 1, color: '#FFD700', fontSize: '0.85rem', fontWeight: 700 }}>
                ★ 首都
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {cityTypeLabel[city.type] ?? city.type}
            {faction && ` · ${faction.name}`}
          </Typography>
        </Box>
      </Box>

      {/* Description */}
      {city.description && (
        <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
          {city.description}
        </Typography>
      )}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        {city.population != null && (
          <Chip size="small" label={`人口 ${city.population.toLocaleString()}`} variant="outlined" />
        )}
        <Chip size="small" label={`坐标 (${city.gridX}, ${city.gridY})`} variant="outlined" />
      </Box>

      {/* Related events */}
      {relatedEvents.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            相关事件（{relatedEvents.length}）
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 150, overflow: 'auto' }}>
            {relatedEvents.map((evt) => (
              <Box key={evt.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#C0392B', fontWeight: 700, minWidth: 40 }}>
                  {evt.year}
                </Typography>
                <Typography variant="caption">{evt.title}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Related characters */}
      {relatedCharacters.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            所属势力人物（{relatedCharacters.length}）
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {relatedCharacters.slice(0, 10).map((c) => (
              <Chip key={c.id} size="small" label={c.name} sx={{ fontSize: '0.7rem' }} />
            ))}
            {relatedCharacters.length > 10 && (
              <Chip size="small" label={`+${relatedCharacters.length - 10}`} />
            )}
          </Box>
        </>
      )}
    </>
  );
};

// ─── 子组件：势力详情 ─────────────────────────────────────────────────────────

const FactionDetail: React.FC<{ faction: Faction }> = ({ faction }) => {
  const cities = useWorldStore((s) => s.data.cities);
  const characters = useWorldStore((s) => s.data.characters);
  const events = useWorldStore((s) => s.data.events);

  const factionCities = cities.filter((c) => c.factionId === faction.id);
  const factionCharacters = characters.filter((c) => c.factionId === faction.id);
  const factionEvents = events.filter((e) => e.factionIds.includes(faction.id));

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: faction.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FlagIcon sx={{ color: '#fff', fontSize: 16 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'LXGW WenKai TC', serif", lineHeight: 1.2 }}>
            {faction.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {faction.foundedYear != null && `建于 ${faction.foundedYear} 年`}
            {faction.dissolvedYear != null && ` · 灭于 ${faction.dissolvedYear} 年`}
          </Typography>
        </Box>
      </Box>

      {/* Description */}
      {faction.description && (
        <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
          {faction.description}
        </Typography>
      )}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Chip size="small" label={`${factionCities.length} 城市`} variant="outlined" />
        <Chip size="small" label={`${factionCharacters.length} 人物`} variant="outlined" />
        <Chip size="small" label={`${factionEvents.length} 事件`} variant="outlined" />
      </Box>

      {/* Cities */}
      {factionCities.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            城市
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {factionCities.map((c) => (
              <Chip
                key={c.id}
                size="small"
                label={`${c.isCapital ? '★ ' : ''}${c.name}`}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </>
      )}

      {/* Characters */}
      {factionCharacters.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            人物（{factionCharacters.length}）
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {factionCharacters.slice(0, 12).map((c) => (
              <Chip key={c.id} size="small" label={c.name} sx={{ fontSize: '0.7rem' }} />
            ))}
            {factionCharacters.length > 12 && (
              <Chip size="small" label={`+${factionCharacters.length - 12}`} />
            )}
          </Box>
        </>
      )}
    </>
  );
};

// ─── 子组件：事件详情 ─────────────────────────────────────────────────────────

const EventDetail: React.FC<{ event: HistoryEvent }> = ({ event }) => {
  const factions = useWorldStore((s) => s.data.factions);
  const characters = useWorldStore((s) => s.data.characters);
  const cities = useWorldStore((s) => s.data.cities);

  const relatedFactions = factions.filter((f) => event.factionIds.includes(f.id));
  const relatedCharacters = characters.filter((c) => event.characterIds.includes(c.id));
  const relatedCity = event.cityId ? cities.find((c) => c.id === event.cityId) : null;

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <AutoStoriesIcon sx={{ color: '#C0392B', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'LXGW WenKai TC', serif", lineHeight: 1.2 }}>
            {event.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {event.year} 年{event.month ? ` ${event.month} 月` : ''}
            {relatedCity && ` · ${relatedCity.name}`}
          </Typography>
        </Box>
      </Box>

      {/* Description */}
      {event.description && (
        <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
          {event.description}
        </Typography>
      )}

      {/* Location */}
      {event.location && (
        <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
          地点：{event.location}
        </Typography>
      )}

      {/* Tags */}
      {event.tags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          {event.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} sx={{ fontSize: '0.7rem' }} />
          ))}
        </Box>
      )}

      {/* Factions */}
      {relatedFactions.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            涉及势力
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {relatedFactions.map((f) => (
              <Chip
                key={f.id}
                size="small"
                label={f.name}
                sx={{ fontSize: '0.7rem', borderColor: f.color, color: f.color }}
                variant="outlined"
              />
            ))}
          </Box>
        </>
      )}

      {/* Characters */}
      {relatedCharacters.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            涉及人物（{relatedCharacters.length}）
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {relatedCharacters.map((c) => (
              <Chip key={c.id} size="small" label={c.name} sx={{ fontSize: '0.7rem' }} />
            ))}
          </Box>
        </>
      )}
    </>
  );
};

// ─── 子组件：图钉详情 ─────────────────────────────────────────────────────────

const PinDetail: React.FC<{ pin: MapPin }> = ({ pin }) => {
  const faction = useWorldStore((s) => s.data.factions.find((f) => f.id === pin.factionId));

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <PushPinIcon sx={{ color: '#f39c12', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'LXGW WenKai TC', serif", lineHeight: 1.2 }}>
            {pin.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            地图标注
            {faction && ` · ${faction.name}`}
          </Typography>
        </Box>
      </Box>

      {/* Description */}
      {pin.description && (
        <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
          {pin.description}
        </Typography>
      )}

      {/* Details */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Chip size="small" label={`位置 (${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%)`} variant="outlined" />
      </Box>
    </>
  );
};

// ─── 主弹窗组件 ───────────────────────────────────────────────────────────────

const MarkerDetailDialog: React.FC<MarkerDetailDialogProps> = ({ marker, onClose }) => {
  const cities = useWorldStore((s) => s.data.cities);
  const factions = useWorldStore((s) => s.data.factions);
  const events = useWorldStore((s) => s.data.events);
  const mapPins = useWorldStore((s) => s.data.mapPins);

  if (!marker) return null;

  // Resolve the entity
  let content: React.ReactNode = null;
  let title = '';

  switch (marker.type) {
    case 'city': {
      const city = cities.find((c) => c.id === marker.id);
      if (!city) return null;
      title = city.name;
      content = <CityDetail city={city} />;
      break;
    }
    case 'faction': {
      const faction = factions.find((f) => f.id === marker.id);
      if (!faction) return null;
      title = faction.name;
      content = <FactionDetail faction={faction} />;
      break;
    }
    case 'event': {
      const event = events.find((e) => e.id === marker.id);
      if (!event) return null;
      title = event.title;
      content = <EventDetail event={event} />;
      break;
    }
    case 'pin': {
      const pin = mapPins.find((p) => p.id === marker.id);
      if (!pin) return null;
      title = pin.label;
      content = <PinDetail pin={pin} />;
      break;
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          color: '#fff',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 0.5,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "'LXGW WenKai TC', serif" }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            mt: 0.5,
            // 让 MUI 子组件在深蓝背景上清晰可读
            '& .MuiChip-root': {
              color: 'rgba(255,255,255,0.9)',
              borderColor: 'rgba(255,255,255,0.35)',
              '&.MuiChip-outlined': {
                borderColor: 'rgba(255,255,255,0.35)',
              },
            },
            '& .MuiDivider-root': {
              borderColor: 'rgba(255,255,255,0.15)',
            },
          }}
        >
          {content}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)' }}
        >
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarkerDetailDialog;
