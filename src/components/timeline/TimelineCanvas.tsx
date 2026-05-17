/**
 * TimelineCanvas - 时间轴主画布
 * 横向滚动，顶部年份刻度，按势力分行，事件节点
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { useWorldStore } from '../../store/worldStore';
import EventNode from './EventNode';
import EventForm from './EventForm';
import type { ConflictWarning, HistoryEvent } from '../../types';
import type { TimelineFilter } from './TimelineFilterBar';

const YEAR_STEP = 10; // default year spacing in px

interface TimelineCanvasProps {
  onEventClick?: (event: HistoryEvent) => void;
  filter?: TimelineFilter;
}

const TimelineCanvas: React.FC<TimelineCanvasProps> = ({ onEventClick, filter }) => {
  const factions = useWorldStore((s) => s.data.factions);
  const characters = useWorldStore((s) => s.data.characters);
  const allEvents = useWorldStore((s) => s.data.events);
  const addEvent = useWorldStore((s) => s.addEvent);
  const conflicts = useWorldStore((s) => s.conflicts);
  const [scale, setScale] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Apply filter to events
  const events = useMemo(() => {
    let filtered = allEvents;
    if (filter) {
      if (filter.factionId) {
        filtered = filtered.filter((e) => e.factionIds.includes(filter.factionId));
      }
      if (filter.characterId) {
        filtered = filtered.filter((e) => e.characterIds?.includes(filter.characterId));
      }
      if (filter.yearFrom) {
        const y = Number(filter.yearFrom);
        if (!isNaN(y)) filtered = filtered.filter((e) => e.year >= y);
      }
      if (filter.yearTo) {
        const y = Number(filter.yearTo);
        if (!isNaN(y)) filtered = filtered.filter((e) => e.year <= y);
      }
    }
    return filtered;
  }, [allEvents, filter]);

  // Compute year range
  const yearRange = useMemo(() => {
    if (events.length === 0) return { min: 0, max: 100 };
    const years = events.map((e) => e.year);
    const min = Math.min(...years) - 5;
    const max = Math.max(...years) + 5;
    return { min, max };
  }, [events]);

  const totalYears = Math.max(yearRange.max - yearRange.min, 1);

  const getConflictsForEvent = (eventId: string) =>
    conflicts.filter((c) => c.eventId === eventId);

  // Position an event on the timeline (x coordinate)
  const getEventX = (year: number): string => {
    const pct = ((year - yearRange.min) / totalYears) * 100;
    return `${pct}%`;
  };

  // Group events by faction for row display
  const eventsByFaction = useMemo(() => {
    // Create a "global" row + one per faction
    const rows: Array<{ factionId: string | null; label: string; evts: HistoryEvent[] }> = [
      { factionId: null, label: '全部事件', evts: [] },
    ];
    for (const f of factions) {
      rows.push({ factionId: f.id, label: f.name, evts: [] });
    }
    // Assign events to rows
    for (const e of [...events].sort((a, b) => a.year - b.year)) {
      rows[0].evts.push(e); // always in "all" row
      if (e.factionIds.length > 0) {
        for (const fid of e.factionIds) {
          const row = rows.find((r) => r.factionId === fid);
          if (row) row.evts.push(e);
        }
      }
    }
    return rows;
  }, [events, factions]);

  const handleAddEvent = useCallback(
    (data: Omit<HistoryEvent, 'id'>) => {
      addEvent(data as Omit<HistoryEvent, 'id'>);
      setShowForm(false);
    },
    [addEvent]
  );

  // Compute vertical lanes per row to avoid label overlap
  const ROW_HEIGHT = 24; // px per lane
  const MIN_PCT_GAP = 8; // minimum % gap between events in the same lane

  const computeRowLanes = (evts: HistoryEvent[]): Record<string, number> => {
    const laneMap: Record<string, number> = {};
    const laneEnds: number[] = []; // last used % position per lane
    for (const ev of evts) {
      const pct = ((ev.year - yearRange.min) / totalYears) * 100;
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (pct > laneEnds[i] + MIN_PCT_GAP) {
          laneEnds[i] = pct;
          laneMap[ev.id] = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        laneMap[ev.id] = laneEnds.length;
        laneEnds.push(pct);
      }
    }
    return laneMap;
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", color: '#1a237e' }}>历史时间轴</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="缩小">
            <IconButton size="small" onClick={() => setScale(Math.max(0.5, scale - 0.2))}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="caption">{Math.round(scale * 100)}%</Typography>
          <Tooltip title="放大">
            <IconButton size="small" onClick={() => setScale(Math.min(2.5, scale + 0.2))}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<AddIcon />}
            size="small"
            variant="contained"
            onClick={() => setShowForm(true)}
            sx={{ ml: 2, background: '#1a237e' }}
          >
            新增事件
          </Button>
        </Box>
      </Box>

      {/* Event Form Dialog */}
      {showForm && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <Box sx={{ background: '#fff', borderRadius: 2, boxShadow: 24, maxWidth: 520, width: '90%' }}>
            <EventForm onSave={handleAddEvent} onCancel={() => setShowForm(false)} />
          </Box>
        </Box>
      )}

      {/* Timeline content */}
      <Box
        sx={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          border: '1px solid rgba(26,35,126,0.15)',
          borderRadius: 2,
          background: '#fffef8',
        }}
      >
        <Box
          sx={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: scale !== 1 ? `${100 / scale}%` : '100%',
            height: scale !== 1 ? `${100 / scale}%` : '100%',
          }}
        >
          {/* Year ruler */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(250,243,224,0.95)',
              borderBottom: '2px solid #1a237e',
              py: 1,
              pl: 120,
              pr: 4,
              minWidth: `${totalYears * YEAR_STEP}px`,
            }}
          >
            {Array.from(
              { length: Math.ceil(totalYears / YEAR_STEP) + 1 },
              (_, i) => {
                const y = yearRange.min + i * YEAR_STEP;
                return (
                  <span
                    key={y}
                    style={{ position: 'absolute', left: getEventX(y), transform: 'translateX(-50%)' }}
                  >
                    <Typography variant="caption" color="#1a237e" fontWeight={700}>
                      {y}
                    </Typography>
                  </span>
                );
              }
            )}
          </Box>

          {/* Rows per faction */}
          {eventsByFaction.length > 0 ? (
            eventsByFaction.map((row, idx) => {
              const laneMap = computeRowLanes(row.evts);
              const maxLane = row.evts.length > 0
                ? Math.max(...Object.values(laneMap)) + 1
                : 1;
              const rowPx = Math.max(64, maxLane * ROW_HEIGHT + 16);

              return (
                <Box
                  key={row.factionId ?? 'all'}
                  sx={{
                    display: 'flex',
                    minHeight: rowPx,
                    borderBottom: '1px solid rgba(139,69,19,0.15)',
                  }}
                >
                  {/* Row label */}
                  <Box
                    sx={{
                      width: 110,
                      minWidth: 110,
                      display: 'flex',
                      alignItems: 'center',
                      pr: 2,
                      justifyContent: 'flex-end',
                      fontWeight: idx === 0 ? 700 : 600,
                      fontSize: '0.85rem',
                      color: row.factionId
                        ? factions.find((f) => f.id === row.factionId)?.color ?? '#555'
                        : '#1a237e',
                      borderRight: `2px solid ${
                        row.factionId
                          ? factions.find((f) => f.id === row.factionId)?.color ??
                            '#ccc'
                          : '#1a237e'
                      }`,
                      mr: 8,
                    }}
                  >
                    {row.label}
                  </Box>

                  {/* Events area */}
                  <Box sx={{ flex: 1, position: 'relative', minHeight: rowPx }}>
                    {row.evts.map((ev: HistoryEvent) => (
                      <Box
                        key={ev.id}
                        sx={{
                          position: 'absolute',
                          left: getEventX(ev.year),
                          transform: 'translateX(-50%)',
                          top: (laneMap[ev.id] ?? 0) * ROW_HEIGHT + 8,
                        }}
                      >
                        <EventNode
                          event={ev}
                          conflicts={getConflictsForEvent(ev.id)}
                          onClick={() => onEventClick?.(ev)}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: '#aaa' }}>
              <Typography>暂无事件数据，点击「新增事件」开始记录</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineCanvas;
