/**
 * LifecycleBar - 人物生命周期迷你时间条
 * 显示在 CharacterCard 底部：出生/死亡标记 + 参与事件的时间点
 */
import React, { useMemo, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import type { Character, HistoryEvent } from '../../types';

interface LifecycleBarProps {
  character: Character;
  characterEvents: HistoryEvent[];
  worldYearMin: number;
  worldYearMax: number;
  factionColor: string;
}

const LifecycleBar: React.FC<LifecycleBarProps> = ({
  character,
  characterEvents,
  worldYearMin,
  worldYearMax,
  factionColor,
}) => {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  const yearRange = worldYearMax - worldYearMin;
  const effectiveRange = yearRange === 0 ? 1 : yearRange;

  // 计算位置百分比
  const getPositionPercent = (year: number): number => {
    const pct = ((year - worldYearMin) / effectiveRange) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // 出生位置
  const birthPct = character.birthYear !== undefined
    ? getPositionPercent(character.birthYear)
    : null;

  // 死亡位置
  const deathPct = character.deathYear !== undefined
    ? getPositionPercent(character.deathYear)
    : null;

  // 活跃期起止（用于绘制色条）
  const activeStart = birthPct ?? 0;
  const activeEnd = deathPct ?? 100;

  // 事件点位置
  const eventPositions = useMemo(() => {
    return characterEvents.map((event) => ({
      event,
      pct: getPositionPercent(event.year),
    }));
  }, [characterEvents, worldYearMin, worldYearMax]);

  // 没有生卒年且没有事件，不显示（必须在所有 hooks 之后）
  if (character.birthYear === undefined && characterEvents.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: 28,
        position: 'relative',
        mt: 1,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* 时间条轨道背景 */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: `${factionColor}30`,
          borderRadius: 1,
        }}
      />

      {/* 活跃期色条 */}
      {activeEnd > activeStart && (
        <Box
          sx={{
            position: 'absolute',
            left: `${activeStart}%`,
            width: `${activeEnd - activeStart}%`,
            height: 4,
            backgroundColor: `${factionColor}60`,
            borderRadius: 1,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* 出生标记 */}
      {birthPct !== null && (
        <Box
          sx={{
            position: 'absolute',
            left: `${birthPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          {/* 出生圆点 */}
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: factionColor,
              border: '1px solid white',
              boxShadow: `0 0 0 1px ${factionColor}`,
            }}
          />
          {/* 竖线 */}
          <Box
            sx={{
              width: 1,
              height: 8,
              backgroundColor: `${factionColor}80`,
            }}
          />
        </Box>
      )}

      {/* 死亡标记 */}
      {deathPct !== null && (
        <Box
          sx={{
            position: 'absolute',
            left: `${deathPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          {/* 死亡叉号 */}
          <Box
            sx={{
              width: 8,
              height: 8,
              position: 'relative',
              '&::before, &::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 8,
                height: 1.5,
                backgroundColor: '#C0392B',
                borderRadius: 1,
              },
              '&::before': {
                transform: 'translate(-50%, -50%) rotate(45deg)',
              },
              '&::after': {
                transform: 'translate(-50%, -50%) rotate(-45deg)',
              },
            }}
          />
          {/* 竖线 */}
          <Box
            sx={{
              width: 1,
              height: 8,
              backgroundColor: `${factionColor}80`,
            }}
          />
        </Box>
      )}

      {/* 至今标记（如果有生年但无死年） */}
      {birthPct !== null && deathPct === null && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 1,
            height: 8,
            backgroundColor: `${factionColor}50`,
          }}
        />
      )}

      {/* 事件点 */}
      {eventPositions.map(({ event, pct }) => (
        <Tooltip
          key={event.id}
          title={`${event.year}年 · ${event.title}`}
          placement="top"
          arrow
        >
          <Box
            onMouseEnter={() => setHoveredEvent(event.id)}
            onMouseLeave={() => setHoveredEvent(null)}
            sx={{
              position: 'absolute',
              left: `${pct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: hoveredEvent === event.id ? 8 : 5,
              height: hoveredEvent === event.id ? 8 : 5,
              borderRadius: '50%',
              backgroundColor: '#1a237e',
              border: `1.5px solid ${factionColor}`,
              cursor: 'pointer',
              transition: 'width 0.15s, height 0.15s',
              zIndex: 3,
              '&:hover': {
                width: 8,
                height: 8,
              },
            }}
          />
        </Tooltip>
      ))}

      {/* 年份标签（仅在有数据时显示在两端） */}
      {character.birthYear !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: -14,
            fontSize: '0.6rem',
            color: 'text.disabled',
            fontFamily: 'monospace',
          }}
        >
          {character.birthYear}
        </Box>
      )}
      {character.deathYear !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            bottom: -14,
            fontSize: '0.6rem',
            color: 'text.disabled',
            fontFamily: 'monospace',
          }}
        >
          {character.deathYear}
        </Box>
      )}
    </Box>
  );
};

export default LifecycleBar;
