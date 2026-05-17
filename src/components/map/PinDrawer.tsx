/**
 * PinDrawer - 标注信息抽屉
 */
import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import type { MapPin as MapPinType } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import PinForm from './PinForm';

interface PinDrawerProps {
  pin: MapPinType | null;
  open: boolean;
  onClose: () => void;
}

const PinDrawer: React.FC<PinDrawerProps> = ({ pin, open, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateMapPin = useWorldStore((s) => s.updateMapPin);
  const deleteMapPin = useWorldStore((s) => s.deleteMapPin);
  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === pin?.factionId)
  );

  if (!pin) return null;

  const handleSave = (data: Omit<MapPinType, 'id'>) => {
    updateMapPin(pin.id, data);
    setEditing(false);
    onClose();
  };

  const handleDelete = () => {
    deleteMapPin(pin.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: 360, background: '#fffef8' } }}
      >
        <Box sx={{ p: 3, position: 'relative' }}>
          <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CloseIcon />
          </IconButton>

          {!editing ? (
            <>
              <Typography
                variant="h5"
                sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700, color: '#1a237e', mb: 0.5 }}
              >
                {pin.label}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  坐标
                </Typography>
                <Typography variant="body2">
                  X: {pin.x.toFixed(1)}% &nbsp; Y: {pin.y.toFixed(1)}%
                </Typography>
              </Box>

              {pin.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    描述
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
                  >
                    {pin.description}
                  </Typography>
                </Box>
              )}

              {faction && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    所属势力
                  </Typography>
                  <Typography variant="body2">{faction.name}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#1a237e',
                    color: '#faf3e0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  onClick={() => setEditing(true)}
                >
                  <EditIcon sx={{ fontSize: 16 }} /> 编辑
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#C0392B',
                    color: '#fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  onClick={() => setConfirmDelete(true)}
                >
                  <DeleteForeverIcon sx={{ fontSize: 16 }} /> 删除
                </button>
              </Box>
            </>
          ) : (
            <PinForm
              initialData={pin}
              defaultX={pin.x}
              defaultY={pin.y}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          )}
        </Box>
      </Drawer>

      {/* 删除确认弹窗 */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除标注「{pin.label}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PinDrawer;
