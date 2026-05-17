/**
 * TimelineFilterBar - 时间轴筛选栏
 *
 * 支持按势力、角色、年份范围筛选事件。
 * 浮动在时间轴顶部，紧凑的横向布局。
 */
import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import type { Faction, Character } from '../../types';

export interface TimelineFilter {
  factionId: string;
  characterId: string;
  yearFrom: string;
  yearTo: string;
}

interface TimelineFilterBarProps {
  filter: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
  factions: Faction[];
  characters: Character[];
}

const TimelineFilterBar: React.FC<TimelineFilterBarProps> = ({
  filter,
  onChange,
  factions,
  characters,
}) => {
  const hasFilter =
    filter.factionId !== '' ||
    filter.characterId !== '' ||
    filter.yearFrom !== '' ||
    filter.yearTo !== '';

  const clear = () =>
    onChange({ factionId: '', characterId: '', yearFrom: '', yearTo: '' });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderRadius: 2,
        background: 'rgba(245, 240, 232, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(26,35,126,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <FilterListIcon sx={{ fontSize: '1.1rem', color: 'rgba(26,35,126,0.5)' }} />

      {/* 势力筛选 */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel sx={{ fontSize: '0.8rem' }}>势力</InputLabel>
        <Select
          value={filter.factionId}
          label="势力"
          onChange={(e) => onChange({ ...filter, factionId: e.target.value })}
          sx={{ fontSize: '0.8rem', background: '#fff', borderRadius: 1 }}
        >
          <MenuItem value="">全部</MenuItem>
          {factions.map((f) => (
            <MenuItem key={f.id} value={f.id} sx={{ fontSize: '0.8rem' }}>
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: f.color,
                  mr: 1,
                }}
              />
              {f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 角色筛选 */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel sx={{ fontSize: '0.8rem' }}>角色</InputLabel>
        <Select
          value={filter.characterId}
          label="角色"
          onChange={(e) => onChange({ ...filter, characterId: e.target.value })}
          sx={{ fontSize: '0.8rem', background: '#fff', borderRadius: 1 }}
        >
          <MenuItem value="">全部</MenuItem>
          {characters.map((c) => (
            <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.8rem' }}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 年份范围 */}
      <TextField
        size="small"
        type="number"
        label="从"
        value={filter.yearFrom}
        onChange={(e) => onChange({ ...filter, yearFrom: e.target.value })}
        sx={{ width: 90, '& input': { fontSize: '0.8rem', py: 0.7 } }}
        placeholder="年份"
      />
      <TextField
        size="small"
        type="number"
        label="至"
        value={filter.yearTo}
        onChange={(e) => onChange({ ...filter, yearTo: e.target.value })}
        sx={{ width: 90, '& input': { fontSize: '0.8rem', py: 0.7 } }}
        placeholder="年份"
      />

      {/* 清除筛选 */}
      {hasFilter && (
        <Tooltip title="清除筛选">
          <IconButton size="small" onClick={clear}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default TimelineFilterBar;
