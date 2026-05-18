/**
 * RelationForm - 新建/编辑关系表单
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Relation } from '../../types';
import { RELATION_TYPES, RELATION_COLORS } from '../../constants/relationTypes';
import { useWorldStore } from '../../store/worldStore';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';
import { useSFX } from '../../hooks/useSFX';

interface RelationFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Relation, 'id'>) => void;
  initialData?: Relation | null;
  defaultSourceId?: string;
}

const RelationForm: React.FC<RelationFormProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  defaultSourceId,
}) => {
  const characters = useWorldStore((s) => s.data.characters);
  const { markDirty, resetDirty, handleCancel: handleClose } = useDirtyCheck(onClose);
  const sfx = useSFX();

  const [sourceId, setSourceIdRaw] = useState('');
  const [targetId, setTargetIdRaw] = useState('');
  const [relationType, setRelationTypeRaw] = useState<string>(RELATION_TYPES[0]);
  const [description, setDescriptionRaw] = useState('');

  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };
  const setSourceId = d(setSourceIdRaw);
  const setTargetId = d(setTargetIdRaw);
  const setRelationType = d(setRelationTypeRaw);
  const setDescription = d(setDescriptionRaw);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setSourceId(initialData.sourceId);
        setTargetId(initialData.targetId);
        setRelationType(initialData.type);
        setDescription(initialData.description ?? '');
      } else {
        setSourceId(defaultSourceId ?? '');
        setTargetId('');
        setRelationType(RELATION_TYPES[0]);
        setDescription('');
      }
    }
    resetDirty();
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) return;
    onSave({
      sourceId,
      targetId,
      type: relationType,
      description: description.trim() || undefined,
    });
    sfx.play('sfx/graph_link');
    resetDirty();
  };

  const isValid = sourceId && targetId && sourceId !== targetId;

  /** 高 z-index 确保下拉菜单不被浮层/Modal 遮挡 */
  const selectMenuProps = { sx: { zIndex: 10001 }, disablePortal: false };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: '#fffef8',
          border: '2px solid rgba(26,35,126,0.3)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'LXGW WenKai TC', serif",
          color: '#1a237e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700 }}>
          {initialData ? '编辑关系' : '新建人物关系'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            select
            label="人物 A"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            SelectProps={{ MenuProps: selectMenuProps }}
          >
            <MenuItem value="">请选择</MenuItem>
            {characters.map((c) => (
              <MenuItem key={c.id} value={c.id} disabled={c.id === targetId}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ textAlign: 'center', my: 1 }}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              ↓ 关系方向 ↓
            </Typography>
          </Box>

          <TextField
            select
            label="人物 B"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            SelectProps={{ MenuProps: selectMenuProps }}
          >
            <MenuItem value="">请选择</MenuItem>
            {characters.map((c) => (
              <MenuItem key={c.id} value={c.id} disabled={c.id === sourceId}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="关系类型"
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            SelectProps={{ MenuProps: selectMenuProps }}
          >
            {RELATION_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: RELATION_COLORS[type] ?? '#1a237e',
                    }}
                  />
                  {type}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="描述（选填）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="描述这段关系..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ color: '#1a237e' }}>
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid}
            sx={{
              background: '#1a237e',
              '&:hover': { background: '#0d1642' },
            }}
          >
            {initialData ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RelationForm;
