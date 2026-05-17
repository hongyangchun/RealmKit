/**
 * FactionForm - 势力编辑表单
 * 用于创建和编辑势力信息
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import type { Faction } from '../../types';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';

interface FactionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (faction: Omit<Faction, 'id'> | Faction) => void;
  initialData?: Faction;
  mode: 'create' | 'edit';
}

// 预设颜色
const PRESET_COLORS = [
  '#C41E3A', // 深红
  '#8B4513', // 棕色
  '#1a237e', // 深蓝
  '#2E7D32', // 绿色
  '#7B1FA2', // 紫色
  '#F57C00', // 橙色
  '#00838F', // 青色
  '#37474F', // 深灰
  '#B71C1C', // 暗红
  '#0D47A1', // 靛蓝
  '#E65100', // 深橙
  '#1B5E20', // 森林绿
];

const FactionForm: React.FC<FactionFormProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode,
}) => {
  const { markDirty, resetDirty, handleCancel: handleClose } = useDirtyCheck(onClose);

  const [name, setNameRaw] = useState('');
  const [color, setColorRaw] = useState(PRESET_COLORS[0]);
  const [description, setDescriptionRaw] = useState('');
  const [foundedYear, setFoundedYearRaw] = useState<string>('');
  const [dissolvedYear, setDissolvedYearRaw] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };
  const setName = d(setNameRaw);
  const setColor = d(setColorRaw);
  const setDescription = d(setDescriptionRaw);
  const setFoundedYear = d(setFoundedYearRaw);
  const setDissolvedYear = d(setDissolvedYearRaw);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setColor(initialData.color);
        setDescription(initialData.description);
        setFoundedYear(initialData.foundedYear?.toString() ?? '');
        setDissolvedYear(initialData.dissolvedYear?.toString() ?? '');
      } else {
        setName('');
        setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
        setDescription('');
        setFoundedYear('');
        setDissolvedYear('');
      }
      resetDirty();
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const factionData = {
      name: name.trim(),
      color,
      description: description.trim(),
      foundedYear: foundedYear ? parseInt(foundedYear, 10) : undefined,
      dissolvedYear: dissolvedYear ? parseInt(dissolvedYear, 10) : undefined,
    };

    if (mode === 'edit' && initialData) {
      onSave({ ...initialData, ...factionData });
    } else {
      onSave(factionData);
    }
    resetDirty();
    onClose();
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: '#fffef8',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700 }}>
          {mode === 'edit' ? '编辑势力' : '新建势力'}
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          {/* Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="势力名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：魏国、蜀汉、东晋..."
              required
              autoFocus
              InputProps={{
                sx: { fontFamily: "'LXGW WenKai TC', serif" },
              }}
            />
          </Grid>

          {/* Color */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
                势力颜色
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: color,
                    border: '2px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <Button
                  size="small"
                  startIcon={<ColorLensIcon />}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  variant={showColorPicker ? 'contained' : 'outlined'}
                >
                  {showColorPicker ? '收起' : '选择颜色'}
                </Button>
              </Box>

              {/* Color presets */}
              {showColorPicker && (
                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 1,
                  }}
                >
                  {PRESET_COLORS.map((c) => (
                    <Box
                      key={c}
                      onClick={() => setColor(c)}
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 1,
                        background: c,
                        cursor: 'pointer',
                        border:
                          color === c
                            ? '3px solid #1a237e'
                            : '2px solid rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Custom color input */}
              <Box sx={{ mt: 2 }}>
                <TextField
                  size="small"
                  label="自定义颜色"
                  value={color}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setColor(val);
                    }
                  }}
                  placeholder="#C41E3A"
                  sx={{ width: 150 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="势力简介"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述势力的历史、文化、特点..."
              multiline
              rows={3}
            />
          </Grid>

          {/* Founded/Dissolved Year */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="建立年份"
              type="number"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              placeholder="如：220"
              inputProps={{ min: -10000, max: 10000 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="灭亡年份"
              type="number"
              value={dissolvedYear}
              onChange={(e) => setDissolvedYear(e.target.value)}
              placeholder="留空表示存续中"
              inputProps={{ min: -10000, max: 10000 }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid}
          sx={{
            background: '#1a237e',
            '&:hover': { background: '#0d1642' },
          }}
        >
          {mode === 'edit' ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FactionForm;
