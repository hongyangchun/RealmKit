/**
 * WorldSeedPreview - 预览生成的世界数据
 * 显示势力、人物、历史事件的摘要预览
 */
import React from 'react';
import { Box, Typography, Chip, Divider } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import type { WorldSeedResult } from '../../types';

interface WorldSeedPreviewProps {
  result: WorldSeedResult;
  skipFactions?: boolean;
  skipCharacters?: boolean;
  skipCities?: boolean;
  skipEvents?: boolean;
}

const WorldSeedPreview: React.FC<WorldSeedPreviewProps> = ({
  result,
  skipFactions = false,
  skipCharacters = false,
  skipCities = false,
  skipEvents = false,
}) => {
  // 判断各区块是否有内容可展示
  const hasFactions = !skipFactions && result.factions.length > 0;
  const hasCharacters = !skipCharacters && result.characters.length > 0;
  const hasCities = !skipCities && (result as WorldSeedResult & { cities?: unknown[] }).cities && ((result as WorldSeedResult & { cities?: unknown[] }).cities?.length ?? 0) > 0;
  const hasEvents = !skipEvents && result.events.length > 0;
  const nothingToShow = !hasFactions && !hasCharacters && !hasCities && !hasEvents;

  return (
    <Box
      sx={{
        maxHeight: 400,
        overflowY: 'auto',
        pr: 1,
      }}
    >
      {nothingToShow && (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            color: '#888',
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            仅生成地图 — 未生成势力、人物和事件
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#aaa' }}>
            可在编辑器中手动添加内容
          </Typography>
        </Box>
      )}

      {/* 势力部分 */}
      {hasFactions && (<Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <GroupsIcon sx={{ color: '#1a237e', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#1a237e',
            }}
          >
            势力 ({result.factions.length})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {result.factions.map((faction, idx) => (
            <Chip
              key={idx}
              label={faction.name}
              sx={{
                backgroundColor: faction.color,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                height: 28,
              }}
            />
          ))}
        </Box>
      </Box>)}

      {hasFactions && hasCharacters && <Divider sx={{ borderColor: 'rgba(26,35,126,0.15)', mb: 2 }} />}

      {/* 城市部分 */}
      {hasCities && (<Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <LocationCityIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#7b1fa2',
            }}
          >
            城市 ({((result as WorldSeedResult & { cities?: unknown[] }).cities?.length) ?? 0})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {((result as WorldSeedResult & { cities?: Array<{ name: string; type: string; isCapital?: boolean }> }).cities ?? []).slice(0, 12).map((city, idx) => (
            <Chip
              key={idx}
              label={`${city.isCapital ? '⭐ ' : ''}${city.name}`}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: 24,
                backgroundColor: '#f3e5f5',
                color: '#4a148c',
              }}
            />
          ))}
          {(((result as WorldSeedResult & { cities?: unknown[] }).cities?.length) ?? 0) > 12 && (
            <Typography variant="caption" sx={{ color: '#888', alignSelf: 'center' }}>
              ...还有 {((result as WorldSeedResult & { cities?: unknown[] }).cities!.length) - 12} 座城市
            </Typography>
          )}
        </Box>
      </Box>)}

      {/* 人物部分 */}
      {hasCharacters && (<Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PeopleIcon sx={{ color: '#8B4513', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#8B4513',
            }}
          >
            人物 ({result.characters.length})
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
          }}
        >
          {result.characters.slice(0, 9).map((char, idx) => {
            // factionId 格式为 'faction_${i}'，通过提取索引匹配对应势力
            const factionIdx = char.factionId.startsWith('faction_')
              ? parseInt(char.factionId.replace('faction_', ''), 10)
              : -1;
            const faction = factionIdx >= 0 ? result.factions[factionIdx] : undefined;
            return (
              <Box
                key={idx}
                sx={{
                  background: '#fff',
                  borderRadius: 1,
                  borderLeft: `3px solid ${faction?.color || '#8B4513'}`,
                  p: 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: '#1a237e',
                    fontSize: '0.85rem',
                    mb: 0.3,
                    lineHeight: 1.2,
                  }}
                >
                  {char.name}
                  {char.title && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: '#666', ml: 0.5, fontStyle: 'italic' }}
                    >
                      · {char.title}
                    </Typography>
                  )}
                </Typography>
                {char.traits.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mt: 0.5 }}>
                    {char.traits.slice(0, 2).map((trait, tIdx) => (
                      <Chip
                        key={tIdx}
                        label={trait}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 18,
                          backgroundColor: '#f5f0e6',
                          color: '#554433',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
          {result.characters.length > 9 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '0.8rem',
              }}
            >
              ...还有 {result.characters.length - 9} 人
            </Box>
          )}
        </Box>
      </Box>)}

      {(hasCharacters || hasFactions) && hasEvents && <Divider sx={{ borderColor: 'rgba(26,35,126,0.15)', mb: 2 }} />}

      {/* 事件部分 */}
      {hasEvents && (<Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <EventIcon sx={{ color: '#C0392B', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#C0392B',
            }}
          >
            历史事件 ({result.events.length})
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0.75,
          }}
        >
          {result.events.slice(0, 8).map((event, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 0.75,
                background: '#fff',
                borderRadius: 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: '#C0392B',
                  fontSize: '0.8rem',
                  minWidth: 40,
                  flexShrink: 0,
                }}
              >
                {event.year}年
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#333',
                  fontSize: '0.8rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {event.title}
              </Typography>
            </Box>
          ))}
          {result.events.length > 8 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '0.8rem',
              }}
            >
              ...还有 {result.events.length - 8} 个事件
            </Box>
          )}
        </Box>
      </Box>)}
    </Box>
  );
};

export default WorldSeedPreview;
