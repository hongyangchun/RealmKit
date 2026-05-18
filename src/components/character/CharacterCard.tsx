/**
 * CharacterCard - 三国杀风格人物卡片
 * 左侧色带 + 头像/姓名/技能/特质/传记
 * 支持多选模式
 */
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  Chip,
  Tooltip,
  Checkbox,
  keyframes,
} from '@mui/material';
import ConflictBadge from '../common/ConflictBadge';
import SkillChip from './SkillChip';
import LifecycleBar from './LifecycleBar';
import CharacterCardExporter from './CharacterCardExporter';
import type { Character, HistoryEvent } from '../../types';
import { useWorldStore } from '../../store/worldStore';

// ─── 叙事化装饰动画 ───────────────────────────────────────

/** 金色光晕脉冲 — 悬停时在边框上显现 */
const borderGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 4px rgba(255,213,79,0.0), inset 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 12px rgba(255,213,79,0.25), inset 0 0 12px rgba(255,213,79,0.05);
  }
`;

// ─── 势力纹样装饰 SVG ─────────────────────────────────────

/** 生成势力色带纹样 — 根据势力颜色生成古典花纹 */
function FactionPattern({ color }: { color: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 3px,
            ${color}33 3px,
            ${color}33 6px
          )`,
        },
      }}
    />
  );
}

interface CharacterCardProps {
  character: Character;
  onEdit?: (character: Character) => void;
  onClick?: (character: Character) => void;
  characterEvents?: HistoryEvent[];
  worldYearMin?: number;
  worldYearMax?: number;
  /** 点击冲突/故事种子徽章时触发（传入人物ID） */
  onConflictClick?: (charId: string) => void;
  /** 是否处于多选模式 */
  selectionMode?: boolean;
  /** 是否已被选中 */
  selected?: boolean;
  /** 选中状态变化回调 */
  onSelectionChange?: (characterId: string, selected: boolean) => void;
}

const CharacterCard = React.memo<CharacterCardProps>(({
  character,
  onEdit,
  onClick,
  characterEvents = [],
  worldYearMin = 0,
  worldYearMax = 100,
  onConflictClick,
  selectionMode = false,
  selected = false,
  onSelectionChange,
}) => {
  const [hovered, setHovered] = useState(false);
  const conflicts = useWorldStore((s) =>
    s.conflicts.filter((c) => c.characterId === character.id)
  );
  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === character.factionId)
  );
  const factionColor = faction?.color ?? '#8B4513';

  // Compute lifespan string
  const lifespan =
    character.birthYear !== undefined
      ? `${character.birthYear}${character.deathYear !== undefined ? ` - ${character.deathYear}` : ' - 至今'}`
      : undefined;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionMode) {
      e.stopPropagation();
      onSelectionChange?.(character.id, !selected);
    } else {
      onClick?.(character);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectionChange?.(character.id, e.target.checked);
  };

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      sx={{
        position: 'relative',
        maxWidth: 300,
        width: '100%',
        borderLeft: `4px solid ${factionColor}`,
        borderRadius: '0 12px 12px 0',
        background: selected ? '#e8edf8' : '#fffef8',
        cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 8px 24px rgba(26,35,126,0.15), 0 0 0 1px ${factionColor}20`
          : '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'visible',
        outline: selected ? '2px solid #1a237e' : 'none',
        outlineOffset: -2,
        // 叙事层：悬停时触发金色光晕
        animation: hovered ? `${borderGlow} 2s ease-in-out infinite` : 'none',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 60,
          height: 60,
          background: `radial-gradient(circle at top right, ${factionColor}10 0%, transparent 70%)`,
          pointerEvents: 'none',
          borderRadius: '0 12px 0 0',
        },
      }}
    >
      {/* 势力纹样装饰 — 左侧色带叠加斜纹 */}
      <FactionPattern color={factionColor} />
      {/* 多选 Checkbox - 左上角 */}
      {selectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 8,
            zIndex: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={handleCheckboxChange}
            size="small"
            sx={{
              color: '#1a237e',
              '&.Mui-checked': { color: '#1a237e' },
              p: 0.5,
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 1,
            }}
          />
        </Box>
      )}

      {/* 导出按钮 - 右上角悬浮（非多选模式才显示） */}
      {!selectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <CharacterCardExporter character={character} faction={faction} />
        </Box>
      )}

      {/* Header: Avatar + Name + Faction */}
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Avatar
            src={character.avatar}
            sx={{
              width: 64,
              height: 64,
              mr: 1.5,
              border: `2px solid ${factionColor}`,
              fontSize: '1.5rem',
              boxShadow: hovered
                ? `0 0 12px ${factionColor}40, 0 2px 8px rgba(0,0,0,0.1)`
                : 'none',
              transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {character.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontWeight: 700,
                color: '#1a237e',
                fontSize: '1.1rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {character.name}
            </Typography>
            {character.title && (
              <Typography
                variant="caption"
                sx={{ color: '#666', display: 'block', fontStyle: 'italic' }}
              >
                {character.title}
              </Typography>
            )}
            {faction && (
              <Chip
                label={faction.name}
                size="small"
                sx={{
                  mt: 0.5,
                  fontSize: '0.7rem',
                  backgroundColor: faction.color,
                  color: '#fff',
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
            {lifespan && (
              <Typography variant="caption" sx={{ color: '#999', ml: 1 }}>
                {lifespan}
              </Typography>
            )}
            {/* Conflict badge - 故事种子风格 */}
            {conflicts.length > 0 && (
              <Box sx={{ ml: 'auto', pl: 1 }}>
                <ConflictBadge
                  conflicts={conflicts}
                  size="small"
                  onClick={(e) => {
                    e?.stopPropagation();
                    onConflictClick?.(character.id);
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Skills section */}
        {character.skills.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.5 }}>
              技能
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {character.skills.map((skill, idx) => (
                <SkillChip key={idx} skill={skill} size="small" />
              ))}
            </Box>
          </Box>
        )}

        {/* Traits chips */}
        {character.traits.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.3 }}>
              特质
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {character.traits.map((trait) => (
                <Chip
                  key={trait}
                  label={trait}
                  size="small"
                  variant="filled"
                  sx={{
                    fontSize: '0.7rem',
                    background: '#f5f0e6',
                    color: '#554433',
                    height: 22,
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Bio summary (2-line ellipsis) */}
        {character.bio && (
          <Tooltip title={character.bio} placement="top" arrow>
            <Typography
              variant="body2"
              sx={{
                color: '#555',
                fontSize: '0.8rem',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderTop: '1px dashed rgba(139,69,19,0.2)',
                pt: 1,
              }}
            >
              {character.bio}
            </Typography>
          </Tooltip>
        )}

        {/* 生命周期时间条 */}
        {(character.birthYear !== undefined || characterEvents.length > 0) && (
          <LifecycleBar
            character={character}
            characterEvents={characterEvents}
            worldYearMin={worldYearMin}
            worldYearMax={worldYearMax}
            factionColor={factionColor}
          />
        )}
      </CardContent>
    </Card>
  );
});

export default CharacterCard;
