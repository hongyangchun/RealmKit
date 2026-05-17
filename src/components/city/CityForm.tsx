/**
 * CityForm - 城市编辑表单
 * 用于创建和编辑城市信息
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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import type { City } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';

const CITY_TYPES = [
  { value: 'capital', label: '首都' },
  { value: 'fortress', label: '要塞' },
  { value: 'port', label: '港口' },
  { value: 'village', label: '村庄' },
  { value: 'holy_site', label: '圣地' },
] as const;

interface CityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (city: Omit<City, 'id'> | City) => void;
  initialData?: City;
  mode: 'create' | 'edit';
  /** 从地图点击创建时预填的网格坐标 */
  defaultGridPos?: { gridX: number; gridY: number };
}

const CityForm: React.FC<CityFormProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  mode,
  defaultGridPos,
}) => {
  const factions = useWorldStore((s) => s.data.factions);

  const { markDirty, resetDirty, handleCancel: handleClose } = useDirtyCheck(onClose);

  const [name, setNameRaw] = useState('');
  const [factionId, setFactionIdRaw] = useState('');
  const [type, setTypeRaw] = useState<City['type']>('village');
  const [gridX, setGridXRaw] = useState<string>('50');
  const [gridY, setGridYRaw] = useState<string>('50');
  const [population, setPopulationRaw] = useState<string>('');
  const [description, setDescriptionRaw] = useState('');
  const [isCapital, setIsCapitalRaw] = useState(false);

  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };
  const setName = d(setNameRaw);
  const setFactionId = d(setFactionIdRaw);
  const setType = d(setTypeRaw);
  const setGridX = d(setGridXRaw);
  const setGridY = d(setGridYRaw);
  const setPopulation = d(setPopulationRaw);
  const setDescription = d(setDescriptionRaw);
  const setIsCapital = d(setIsCapitalRaw);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setFactionId(initialData.factionId);
        setType(initialData.type);
        setGridX(initialData.gridX.toString());
        setGridY(initialData.gridY.toString());
        setPopulation(initialData.population?.toString() ?? '');
        setDescription(initialData.description ?? '');
        setIsCapital(initialData.isCapital ?? false);
      } else {
        setName('');
        setFactionId(factions.length > 0 ? factions[0].id : '');
        setType('village');
        setGridX(defaultGridPos ? defaultGridPos.gridX.toString() : '50');
        setGridY(defaultGridPos ? defaultGridPos.gridY.toString() : '50');
        setPopulation('');
        setDescription('');
        setIsCapital(false);
      }
      resetDirty();
    }
  }, [open, initialData, factions, defaultGridPos]);

  const handleSubmit = () => {
    if (!name.trim() || !factionId) return;

    const cityData = {
      name: name.trim(),
      factionId,
      type: isCapital ? 'capital' as const : type,
      gridX: parseInt(gridX, 10) || 0,
      gridY: parseInt(gridY, 10) || 0,
      population: population ? parseInt(population, 10) : undefined,
      description: description.trim() || undefined,
      isCapital,
      eventIds: initialData?.eventIds ?? [],
    };

    if (mode === 'edit' && initialData) {
      onSave({ ...initialData, ...cityData });
    } else {
      onSave(cityData);
    }
    resetDirty();
    onClose();
  };

  const isValid = name.trim().length > 0 && factionId.length > 0;

  const selectedFaction = factions.find((f) => f.id === factionId);
  const bannerColor = selectedFaction?.color ?? '#8B4513';

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
          background: bannerColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationCityIcon />
          <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700 }}>
            {mode === 'edit' ? '编辑城市' : '新建城市'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          {/* Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="城市名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：长安、翡翠城..."
              required
              autoFocus
              InputProps={{
                sx: { fontFamily: "'LXGW WenKai TC', serif" },
              }}
            />
          </Grid>

          {/* Faction */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>所属势力</InputLabel>
              <Select
                value={factionId}
                label="所属势力"
                onChange={(e) => setFactionId(e.target.value)}
              >
                {factions.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: f.color,
                        }}
                      />
                      {f.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>城市类型</InputLabel>
              <Select
                value={type}
                label="城市类型"
                onChange={(e) => setType(e.target.value as City['type'])}
              >
                {CITY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Is Capital */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isCapital}
                  onChange={(e) => setIsCapital(e.target.checked)}
                  color="primary"
                />
              }
              label="首都"
            />
          </Grid>

          {/* Grid X/Y */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="网格 X"
              type="number"
              value={gridX}
              onChange={(e) => setGridX(e.target.value)}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="网格 Y"
              type="number"
              value={gridY}
              onChange={(e) => setGridY(e.target.value)}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>

          {/* Population */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="人口（选填）"
              type="number"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              placeholder="如：50000"
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="城市简介"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述城市的历史、特点..."
              multiline
              rows={3}
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

export default CityForm;
