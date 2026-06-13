/**
 * CharacterCard - 三国杀武将卡牌风格人物卡片 (v2.0)
 * 5:7 竖版比例 + 称号+姓名 + 大尺寸插画区 + 勾玉体力 + 技能完整描述
 */
import React, { useState } from 'react';
import {
  CardContent,
  Avatar,
  Typography,
  Box,
  Chip,
  Checkbox,
  keyframes,
} from '@mui/material';
import JadeTokens from './JadeTokens';
import CharacterCardExporter from './CharacterCardExporter';
import type { Character, HistoryEvent, CardRarity } from '../../types';
import { useWorldStore } from '../../store/worldStore';

// ─── 稀有度配色 ─────────────────────────────────────

const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; text: string }> = {
  common:    { bg: '#2a2a2a', border: '#666', text: '#999' },
  rare:      { bg: '#1a3a5c', border: '#4a9eff', text: '#4a9eff' },
  epic:      { bg: '#3a1a5c', border: '#9a4aff', text: '#9a4aff' },
  legendary: { bg: '#5c3a1a', border: '#ff9a4a', text: '#ff9a4a' },
};

// ─── Props ─────────────────────────────────────────────────────

/** 悬停时金色边框光晕脉冲 */
const borderPulse = keyframes`
  0%, 100% { box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,160,80,0.4); }
  50%       { box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,160,80,0.9), 0 0 16px rgba(201,160,80,0.25); }
`;

/** 卡片浮起动画 */
const cardLift = keyframes`
  0%   { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-6px) rotate(0.3deg); }
`;

// ─── 势力配色方案（三国杀魏/蜀/吴/无）────────────────────

function getFactionTheme(baseColor: string) {
  // 将势力原色暗化，生成三国杀风的深色系
  return {
    borderColor: baseColor,
    headerBg: baseColor,
    portraitBg: adjustColorDark(baseColor, 0.35),
    cardBg: '#1a100a',
    cornerColor: '#c9a050',
  };
}

/** 将颜色叠加深色（简单混合 — 不依赖外部库）*/
function adjustColorDark(hex: string, darkenRatio: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - darkenRatio));
    const dg = Math.round(g * (1 - darkenRatio));
    const db = Math.round(b * (1 - darkenRatio));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  } catch {
    return '#2a1a0a';
  }
}

// ─── 四角 L 纹装饰组件 ────────────────────────────────────

function CornerBrackets({ color }: { color: string }) {
  const size = 14;
  const thickness = 1.5;
  const offset = 5;
  const corners = [
    { top: offset, left: offset, borderTop: thickness, borderLeft: thickness, borderRight: 0, borderBottom: 0 },
    { top: offset, right: offset, borderTop: thickness, borderRight: thickness, borderLeft: 0, borderBottom: 0 },
    { bottom: offset, left: offset, borderBottom: thickness, borderLeft: thickness, borderTop: 0, borderRight: 0 },
    { bottom: offset, right: offset, borderBottom: thickness, borderRight: thickness, borderTop: 0, borderLeft: 0 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: size,
            height: size,
            top: c.top !== undefined ? c.top : undefined,
            bottom: c.bottom !== undefined ? c.bottom : undefined,
            left: c.left !== undefined ? c.left : undefined,
            right: c.right !== undefined ? c.right : undefined,
            borderTop: c.borderTop ? `${c.borderTop}px solid ${color}` : undefined,
            borderBottom: c.borderBottom ? `${c.borderBottom}px solid ${color}` : undefined,
            borderLeft: c.borderLeft ? `${c.borderLeft}px solid ${color}` : undefined,
            borderRight: c.borderRight ? `${c.borderRight}px solid ${color}` : undefined,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}
    </>
  );
}

// ─── 分割线（带菱形中心装饰）────────────────────────────────

function GoldDivider({ color = '#c9a050' }: { color?: string }) {
  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', my: 0.8 }}>
      <Box sx={{ flex: 1, height: '1px', background: `${color}55` }} />
      <Box sx={{
        width: 5, height: 5,
        transform: 'rotate(45deg)',
        background: color,
        mx: 0.8,
        flexShrink: 0,
        opacity: 0.8,
      }} />
      <Box sx={{ flex: 1, height: '1px', background: `${color}55` }} />
    </Box>
  );
}

// ─── Props ───────────────────────────────────────────────

interface CharacterCardProps {
  character: Character;
  onEdit?: (character: Character) => void;
  onClick?: (character: Character) => void;
  characterEvents?: HistoryEvent[];
  worldYearMin?: number;
  worldYearMax?: number;
  onConflictClick?: (charId: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (characterId: string, selected: boolean) => void;
}

// ─── 主组件 ──────────────────────────────────────────────

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
  const theme = getFactionTheme(factionColor);

  const lifespan =
    character.birthYear !== undefined
      ? `${character.birthYear}${character.deathYear !== undefined ? ` — ${character.deathYear}` : ' — 至今'}`
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
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: '8px',
        border: `2px solid`,
        borderColor: selected ? '#f5d58a' : `${theme.borderColor}cc`,
        background: theme.cardBg,
        cursor: 'pointer',
        animation: hovered
          ? `${cardLift} 0.2s ease forwards, ${borderPulse} 2s ease-in-out 0.2s infinite`
          : 'none',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px ${theme.cornerColor}60`
          : `0 3px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)`,
        outline: selected ? `2px solid #f5d58a` : 'none',
        outlineOffset: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        aspectRatio: '5/7',  // 三国杀卡牌比例
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            -55deg,
            transparent,
            transparent 18px,
            rgba(255,255,255,0.012) 18px,
            rgba(255,255,255,0.012) 19px
          )`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {/* 四角 L 纹装饰 */}
      <CornerBrackets color={selected ? '#f5d58a' : theme.cornerColor} />

      {/* 多选 Checkbox */}
      {selectionMode && (
        <Box
          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={handleCheckboxChange}
            size="small"
            sx={{
              color: '#c9a050',
              '&.Mui-checked': { color: '#f5d58a' },
              p: 0.25,
              background: 'rgba(20,10,5,0.75)',
              borderRadius: 1,
            }}
          />
        </Box>
      )}

      {/* 导出按钮（非多选模式） */}
      {!selectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 4,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <CharacterCardExporter character={character} faction={faction} />
        </Box>
      )}

      <CardContent sx={{ p: 0, position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 0 } }}>

        {/* Z1-Z2: 称号 + 姓名栏 */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${adjustColorDark(factionColor, 0.15)} 0%, ${adjustColorDark(factionColor, 0.4)} 100%)`,
            borderBottom: `1px solid ${theme.cornerColor}60`,
            px: 1.5,
            py: 0.7,
            textAlign: 'center',
          }}
        >
          {character.nickname && (
            <Typography
              sx={{
                fontFamily: "'LXGW WenKai TC', 'Noto Serif SC', serif",
                color: `${theme.cornerColor}cc`,
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                mb: 0.2,
                display: 'block',
              }}
            >
              「{character.nickname}」
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: "'LXGW WenKai TC', 'Noto Serif SC', serif",
              fontWeight: 700,
              color: '#f5e6c0',
              fontSize: '1.3rem',
              lineHeight: 1.2,
              letterSpacing: '0.08em',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {character.name}
          </Typography>
          {character.title && (
            <Typography
              sx={{
                color: `${theme.cornerColor}99`,
                fontSize: '0.65rem',
                fontFamily: "'LXGW WenKai TC', serif",
                mt: 0.2,
                display: 'block',
              }}
            >
              {character.title}
            </Typography>
          )}
        </Box>

        {/* Z3-Z5: 插画区（大尺寸） */}
        <Box
          sx={{
            background: theme.portraitBg,
            flex: '0 0 auto',
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderBottom: `1px solid ${theme.cornerColor}40`,
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at center, transparent 30%, ${theme.cardBg}cc 100%)`,
              pointerEvents: 'none',
            },
          }}
        >
          {character.portrait ? (
            <img
              src={character.portrait}
              alt={character.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Avatar
              src={character.avatar}
              sx={{
                width: 100,
                height: 100,
                border: `2px solid ${theme.cornerColor}80`,
                borderRadius: '4px',
                fontSize: '2.5rem',
                background: adjustColorDark(factionColor, 0.5),
                color: '#f5e6c0',
                fontFamily: "'LXGWenKai TC', serif",
                zIndex: 1,
                boxShadow: `0 4px 16px rgba(0,0,0,0.6)`,
              }}
            >
              {character.name.charAt(0)}
            </Avatar>
          )}

          {/* 卡牌编号 */}
          {character.cardNumber && (
            <Typography
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                fontSize: '0.6rem',
                color: `${theme.cornerColor}99`,
                fontFamily: "'LXGWenKai TC', serif",
                zIndex: 2,
                background: 'rgba(0,0,0,0.5)',
                px: 0.5,
                py: 0.2,
                borderRadius: '2px',
              }}
            >
              {character.cardNumber}
            </Typography>
          )}

          {/* 稀有度标志 */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              px: 0.8,
              py: 0.2,
              borderRadius: '2px',
              background: (RARITY_COLORS[character.rarity ?? 'common']).bg,
              border: `1px solid ${(RARITY_COLORS[character.rarity ?? 'common']).border}`,
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: (RARITY_COLORS[character.rarity ?? 'common']).text,
                fontFamily: "'LXGWenKai TC', serif",
                letterSpacing: '0.05em',
              }}
            >
              {character.rarity === 'common' ? '普通' :
               character.rarity === 'rare' ? '稀有' :
               character.rarity === 'epic' ? '史诗' : '传说'}
            </Typography>
          </Box>
        </Box>

        {/* Z6: 勾玉体力 */}
        <Box
          sx={{
            px: 1.5,
            py: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.cornerColor}25`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: `${theme.cornerColor}aa`,
              fontFamily: "'LXGWenKai TC', serif",
              mr: 1,
              flexShrink: 0,
            }}
          >
            体力
          </Typography>
          <JadeTokens count={character.hp ?? 4} size={22} />
        </Box>

        {/* Z7-Z10: 技能完整描述区 */}
        <Box sx={{ px: 1.5, pt: 1, pb: 1, flex: 1, overflow: 'auto', minHeight: 0 }}>
          {character.skills.map((skill, idx) => (
            <Box
              key={idx}
              sx={{
                mb: 1,
                p: 1,
                border: `1px solid ${theme.cornerColor}35`,
                borderRadius: '4px',
                background: 'rgba(201,160,80,0.06)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#f5e6c0',
                    fontFamily: "'LXGWenKai TC', serif",
                  }}
                >
                  {skill.name}
                </Typography>
                <Chip
                  label={skill.type === 'active' ? '主动' : skill.type === 'passive' ? '被动' : '特殊'}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.58rem',
                    background: `${factionColor}40`,
                    color: factionColor,
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              </Box>
              {skill.description && (
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: '#c9a050',
                    lineHeight: 1.6,
                    fontFamily: "'LXGWenKai TC', serif",
                    letterSpacing: '0.02em',
                  }}
                >
                  {skill.description}
                </Typography>
              )}
            </Box>
          ))}

          {/* 特质标签 */}
          {character.traits.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mt: 0.5 }}>
              {character.traits.map((trait) => (
                <Chip
                  key={trait}
                  label={trait}
                  size="small"
                  sx={{
                    fontSize: '0.63rem',
                    background: 'rgba(201,160,80,0.12)',
                    color: '#d4a84a',
                    border: `0.5px solid ${theme.cornerColor}60`,
                    borderRadius: '3px',
                    height: 20,
                    fontFamily: "'LXGWenKai TC', serif",
                    '& .MuiChip-label': { px: 0.8 },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Z11-Z12: 底部信息栏 */}
        <Box
          sx={{
            px: 1.5,
            py: 0.6,
            borderTop: `1px solid ${theme.cornerColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {lifespan && (
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: `${theme.cornerColor}99`,
                fontFamily: "'LXGWenKai TC', serif",
                letterSpacing: '0.04em',
              }}
            >
              {lifespan}
            </Typography>
          )}
          {faction && (
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: factionColor,
                fontFamily: "'LXGWenKai TC', serif",
                letterSpacing: '0.05em',
              }}
            >
              {faction.name}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Box>
  );
});

export default CharacterCard;
