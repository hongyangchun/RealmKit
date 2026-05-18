/**
 * PinForm - 标注新建/编辑表单
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
} from '@mui/material';
import type { MapPin as MapPinType } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';

interface PinFormProps {
  initialData?: MapPinType;
  defaultX: number;
  defaultY: number;
  onSave: (data: Omit<MapPinType, 'id'>) => void;
  onCancel: () => void;
}

const PinForm: React.FC<PinFormProps> = ({
  initialData,
  defaultX,
  defaultY,
  onSave,
  onCancel,
}) => {
  const factions = useWorldStore((s) => s.data.factions);

  const { markDirty, resetDirty, handleCancel } = useDirtyCheck(onCancel);

  const [label, setLabelRaw] = useState('');
  const [description, setDescriptionRaw] = useState('');
  const [factionId, setFactionIdRaw] = useState<string | undefined>();

  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };
  const setLabel = d(setLabelRaw);
  const setDescription = d(setDescriptionRaw);
  const setFactionId = d(setFactionIdRaw);

  useEffect(() => {
    if (initialData) {
      setLabelRaw(initialData.label);
      setDescriptionRaw(initialData.description ?? '');
      setFactionIdRaw(initialData.factionId ?? undefined);
    }
    resetDirty();
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave({
      label: label.trim(),
      description: description.trim() || undefined,
      x: initialData?.x ?? defaultX,
      y: initialData?.y ?? defaultY,
      factionId: factionId || undefined,
    });
    resetDirty();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 280 }}>
      <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", mb: 2 }}>
        {initialData ? '编辑标注' : '新增标注'}
      </Typography>

      <TextField
        label="名称"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />

      <TextField
        label="描述（选填）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        rows={2}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />

      <TextField
        select
        label="所属势力（选填）"
        value={factionId ?? ''}
        onChange={(e) =>
          setFactionId(e.target.value === '' ? undefined : e.target.value)
        }
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        SelectProps={{
          MenuProps: { sx: { zIndex: 10001 }, disablePortal: false },
        }}
      >
        <MenuItem value="">无</MenuItem>
        {factions.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name}
          </MenuItem>
        ))}
      </TextField>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={handleCancel}>取消</Button>
        <Button variant="contained" type="submit" sx={{ background: '#1a237e' }}>
          保存
        </Button>
      </Box>
    </Box>
  );
};

export default PinForm;
