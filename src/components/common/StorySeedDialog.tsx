/**
 * StorySeedDialog - 未解之谜对话框
 * 点击冲突徽章后弹出，将时间矛盾以"神秘故事种子"的方式呈现
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { StorySeedData } from '../../services/storySeedService';

interface StorySeedDialogProps {
  open: boolean;
  storySeed: StorySeedData | null;
  onClose: () => void;
}

const StorySeedDialog: React.FC<StorySeedDialogProps> = ({
  open,
  storySeed,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, #fffef8 0%, #fdf6e3 100%)',
          border: '2px solid #ffd54f',
          borderRadius: 3,
        },
      }}
    >
      {storySeed ? (
        <>
          {/* Header */}
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 0,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontWeight: 700,
                color: '#1a237e',
              }}
            >
              <Box
                component="span"
                sx={{ mr: 1, fontSize: '1.4em' }}
              >
                🔮
              </Box>
              {storySeed.mysteryTitle}
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: '#999' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            {/* Mystery prompt — 叙事化的问题 */}
            <Box
              sx={{
                position: 'relative',
                pl: 2,
                borderLeft: '3px solid #ffd54f',
                my: 2,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontFamily: "'LXGW WenKai TC', serif",
                  lineHeight: 2,
                  color: '#333',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                }}
              >
                {storySeed.mysteryPrompt}
              </Typography>
            </Box>

            {/* Context info chips */}
            <Box sx={{ display: 'flex', gap: 1, my: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`👤 ${storySeed.characterName}`}
                size="small"
                sx={{
                  backgroundColor: '#e8eaf6',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              />
              <Chip
                label={`📜 ${storySeed.eventName}`}
                size="small"
                sx={{
                  backgroundColor: '#fff3e0',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              />
              <Chip
                label={
                  storySeed.eventType === 'death_violation'
                    ? '💀 死亡疑云'
                    : '🗺️ 空间矛盾'
                }
                size="small"
                sx={{
                  backgroundColor: '#fce4ec',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              />
            </Box>

            {/* Divider with decorative text */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                my: 3,
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #d4a017, transparent)' }} />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'LXGW WenKai TC', serif",
                  color: '#b8860b',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                }}
              >
                ✦ 可能的真相 ✦
              </Typography>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #d4a017, transparent)' }} />
            </Box>

            {/* Suggestions as chips */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {storySeed.suggestions.map((suggestion, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    borderRadius: 1.5,
                    transition: 'background 0.15s',
                    '&:hover': {
                      background: 'rgba(255,213,79,0.12)',
                    },
                    cursor: 'default',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#d4a017',
                      fontWeight: 700,
                      fontFamily: "'LXGW WenKai TC', serif",
                      fontSize: '1.1rem',
                      lineHeight: 1,
                    }}
                  >
                    {idx === 0 ? '壹' : idx === 1 ? '贰' : '叁'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#555',
                      lineHeight: 1.6,
                      fontSize: '0.88rem',
                    }}
                  >
                    {suggestion}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Bottom hint */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                mt: 3,
                color: '#b8860b',
                fontStyle: 'italic',
              }}
            >
              最好的故事，往往藏在看似矛盾的地方。
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={onClose}
              sx={{
                color: '#1a237e',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'rgba(26,35,126,0.06)' },
              }}
            >
              我知道了
            </Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
};

export default StorySeedDialog;
