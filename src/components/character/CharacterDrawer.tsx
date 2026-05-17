/**
 * CharacterDrawer - 人物详情对话框（居中弹窗）
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EventIcon from '@mui/icons-material/Event';
import SkillChip from './SkillChip';
import ConflictBadge from '../common/ConflictBadge';
import StorySeedDialog from '../common/StorySeedDialog';
import PlotSuggestionPanel from './PlotSuggestionPanel';
import { storySeedService } from '../../services/storySeedService';
import type { Character, StorySeedData, HistoryEvent } from '../../types';
import { useWorldStore } from '../../store/worldStore';

interface CharacterDrawerProps {
  character: Character | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
}

const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
  character,
  open,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [storySeedOpen, setStorySeedOpen] = useState(false);
  const [selectedStorySeed, setSelectedStorySeed] = useState<StorySeedData | null>(null);
  const [eventSnackbar, setEventSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const data = useWorldStore((s) => s.data);
  const addEvent = useWorldStore((s) => s.addEvent);
  const updateCharacter = useWorldStore((s) => s.updateCharacter);

  // Hooks must be called unconditionally (Rules of Hooks)
  const charId = character?.id ?? '';
  const factionId = character?.factionId ?? '';
  const relatedEventIds = character?.relatedEventIds ?? [];
  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === factionId)
  );
  const conflicts = useWorldStore((s) =>
    s.conflicts.filter((c) => c.characterId === charId)
  );
  const relatedEvents = useWorldStore((s) =>
    s.data.events.filter((e) => relatedEventIds.includes(e.id))
  );

  if (!character) return null;

  const handleConflictClick = () => {
    if (conflicts.length > 0) {
      const seed = storySeedService.toStorySeed(conflicts[0], data);
      setSelectedStorySeed(seed);
      setStorySeedOpen(true);
    }
  };

  // 处理创建事件（来自剧情建议面板）
  const handleCreateEvent = (prefilled: {
    title: string;
    description: string;
    tags: string[];
    characterId: string;
  }) => {
    if (!character) return;

    // 生成新事件，默认为角色的出生年或第一年
    const eventYear = character.birthYear ?? (data.events.length > 0 ? data.events.reduce((min, e) => Math.min(min, e.year), Infinity) : 1);

    const newEvent: Omit<HistoryEvent, 'id'> = {
      title: prefilled.title,
      year: eventYear,
      description: prefilled.description,
      tags: prefilled.tags,
      factionIds: [character.factionId],
      characterIds: [character.id],
    };

    // addEvent 现在返回新事件的 ID
    const newEventId = addEvent(newEvent);

    // 更新角色的关联事件
    updateCharacter(character.id, {
      relatedEventIds: [...character.relatedEventIds, newEventId],
    });

    setEventSnackbar({
      open: true,
      message: `事件「${prefilled.title}」已创建！`,
    });
  };

  const lifespan =
    character.birthYear !== undefined
      ? `${character.birthYear}${character.deathYear !== undefined ? ` - ${character.deathYear}` : ' - 至今'}`
      : '未知';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: '#fffef8',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={character.avatar}
            sx={{
              width: 56,
              height: 56,
              border: `3px solid ${faction?.color ?? '#8B4513'}`,
              fontSize: '1.5rem',
            }}
          >
            {character.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700, color: '#1a237e', lineHeight: 1.2 }}>
              {character.name}
            </Typography>
            {character.title && (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                {character.title}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }} dividers>
        {/* Faction + Lifespan + Conflict */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {faction && (
            <Chip label={faction.name} size="small" sx={{ backgroundColor: faction.color, color: '#fff' }} />
          )}
          <Typography variant="caption" color="text.secondary">
            生卒：{lifespan}
          </Typography>
          {conflicts.length > 0 && (
            <ConflictBadge
              conflicts={conflicts}
              onClick={handleConflictClick}
            />
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Skills */}
        {character.skills.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>技能</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
              {character.skills.map((skill, idx) => (
                <SkillChip key={idx} skill={skill} size="medium" />
              ))}
            </Box>
          </>
        )}

        {/* Traits */}
        {character.traits.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>特质</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {character.traits.map((t) => (
                <Chip key={t} label={t} size="small" sx={{ background: '#f5f0e6', color: '#554433' }} />
              ))}
            </Box>
          </>
        )}

        {/* Bio */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>传记</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.8, color: '#444', mb: 2 }}>
          {character.bio || '暂无传记'}
        </Typography>

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EventIcon sx={{ fontSize: 16 }} /> 关联事件
            </Typography>
            {relatedEvents.map((ev) => (
              <Chip
                key={ev.id}
                label={`${ev.year}年 · ${ev.title}`}
                variant="outlined"
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </>
        )}

        {/* Plot Suggestion Panel */}
        <PlotSuggestionPanel
          character={character}
          onCreateEvent={handleCreateEvent}
        />

        <Divider sx={{ my: 2 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onEdit && (
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
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
              onClick={() => onEdit(character)}
            >
              <EditIcon sx={{ fontSize: 16 }} /> 编辑
            </button>
          )}
          {onDelete && (
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
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
              onClick={() => onDelete(character)}
            >
              <DeleteForeverIcon sx={{ fontSize: 16 }} /> 删除
            </button>
          )}
        </Box>
      </DialogContent>

      {/* 未解之谜对话框 */}
      <StorySeedDialog
        open={storySeedOpen}
        storySeed={selectedStorySeed}
        onClose={() => setStorySeedOpen(false)}
      />

      {/* 事件创建成功提示 */}
      <Snackbar
        open={eventSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })}
          severity="success"
          sx={{ width: '100%', backgroundColor: '#e8f5e9', color: '#2e7d32' }}
        >
          {eventSnackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CharacterDrawer;
