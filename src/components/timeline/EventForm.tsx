/**
 * EventForm - 事件新建/编辑表单
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { HistoryEvent } from '../../types';
import { useSFX } from '../../hooks/useSFX';
import { useWorldStore } from '../../store/worldStore';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';

interface EventFormProps {
  initialData?: HistoryEvent;
  onSave: (data: Omit<HistoryEvent, 'id'>) => void;
  onCancel: () => void;
  /** 新建事件时的默认势力ID */
  defaultFactionId?: string;
  /** 新建事件时的默认人物ID */
  defaultCharacterId?: string;
}

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onCancel,
  defaultFactionId,
  defaultCharacterId,
}) => {
  const factions = useWorldStore((s) => s.data.factions);
  const characters = useWorldStore((s) => s.data.characters);
  const cities = useWorldStore((s) => s.data.cities);
  const sfx = useSFX();
  const events = useWorldStore((s) => s.data.events);

  const { markDirty, resetDirty, handleCancel } = useDirtyCheck(onCancel);

  // 计算默认年份（取所有事件年份的中间值或当前年份）
  const getDefaultYear = () => {
    if (events.length > 0) {
      const years = events.map((e) => e.year);
      const min = Math.min(...years);
      const max = Math.max(...years);
      return Math.floor((min + max) / 2);
    }
    return 1;
  };

  const [title, setTitleRaw] = useState('');
  const [year, setYearRaw] = useState<number | string>('');
  const [month, setMonthRaw] = useState<number | string>('');
  const [location, setLocationRaw] = useState('');
  const [description, setDescriptionRaw] = useState('');
  const [tagsInput, setTagsInputRaw] = useState('');
  const [selectedFactionIds, setSelectedFactionIdsRaw] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIdsRaw] = useState<string[]>([]);
  const [selectedCityId, setSelectedCityIdRaw] = useState<string>('');

  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };
  const setTitle = d(setTitleRaw);
  const setYear = d(setYearRaw);
  const setMonth = d(setMonthRaw);
  const setLocation = d(setLocationRaw);
  const setDescription = d(setDescriptionRaw);
  const setTagsInput = d(setTagsInputRaw);
  const setSelectedFactionIds = d(setSelectedFactionIdsRaw);
  const setSelectedCharacterIds = d(setSelectedCharacterIdsRaw);
  const setSelectedCityId = d(setSelectedCityIdRaw);

  useEffect(() => {
    if (initialData) {
      // 编辑模式：使用初始数据
      setTitle(initialData.title);
      setYear(initialData.year);
      setMonth(initialData.month ?? '');
      setLocation(initialData.location ?? '');
      setDescription(initialData.description);
      setTagsInput(initialData.tags.join(', '));
      setSelectedFactionIds(initialData.factionIds);
      setSelectedCharacterIds(initialData.characterIds);
      setSelectedCityId(initialData.cityId ?? '');
    } else {
      // 新建模式：使用默认值
      setTitle('');
      setYear(getDefaultYear());
      setMonth('');
      setLocation('');
      setDescription('');
      setTagsInput('');
      setSelectedFactionIds(defaultFactionId ? [defaultFactionId] : []);
      setSelectedCharacterIds(defaultCharacterId ? [defaultCharacterId] : []);
      setSelectedCityId('');
    }
    resetDirty();
  }, [initialData, defaultFactionId, defaultCharacterId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !year) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      year: Number(year),
      month: month === '' ? undefined : Number(month),
      location: location.trim() || undefined,
      description: description.trim(),
      tags,
      factionIds: selectedFactionIds,
      characterIds: selectedCharacterIds,
      cityId: selectedCityId || undefined,
    });
    sfx.play('sfx/event_create');
    resetDirty();
  };

  /** 高 z-index 确保下拉菜单不被浮层/Modal 遮挡 */
  const menuProps = {
    sx: { zIndex: 10001 },
    disablePortal: false,
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 480 }}>
      <DialogContent sx={{ pt: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="事件标题" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="年份" type="number" value={year} onChange={(e) => setYear(e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="月份（选填）" type="number" value={month} onChange={(e) => setMonth(e.target.value)} fullWidth size="small" inputProps={{ min: 1, max: 12 }} />
          </Grid>
          <Grid item xs={4}>
            <TextField label="地点" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="事件描述" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="关联势力"
              SelectProps={{ multiple: true, MenuProps: menuProps }}
              value={selectedFactionIds}
              onChange={(e) =>
                setSelectedFactionIds(
                  typeof e.target.value === 'string' ? [] : e.target.value
                )
              }
              fullWidth
              size="small"
            >
              {factions.length === 0 && <MenuItem disabled>暂无势力</MenuItem>}
              {factions.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="关联人物"
              SelectProps={{ multiple: true, MenuProps: menuProps }}
              value={selectedCharacterIds}
              onChange={(e) =>
                setSelectedCharacterIds(
                  typeof e.target.value === 'string' ? [] : e.target.value
                )
              }
              fullWidth
              size="small"
            >
              {characters.length === 0 && <MenuItem disabled>暂无人物</MenuItem>}
              {characters.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="关联城市"
              SelectProps={{ MenuProps: menuProps }}
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">无</MenuItem>
              {cities.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name} ({c.type === 'capital' ? '首都' : c.type === 'fortress' ? '要塞' : c.type === 'port' ? '港口' : c.type === 'holy_site' ? '圣地' : '村庄'})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="标签（逗号分隔）" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} fullWidth size="small" placeholder="如：战争、政治、外交" />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel}>取消</Button>
        <Button variant="contained" type="submit" sx={{ background: '#1a237e' }}>保存</Button>
      </DialogActions>
    </Box>
  );
};

export default EventForm;
