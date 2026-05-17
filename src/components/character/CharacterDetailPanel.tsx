/**
 * CharacterDetailPanel - 统一人物详情面板
 * 融合 CharacterDrawer 和 CharacterStoryCard 的全部功能
 * 用于主从联动布局的右侧面板
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Divider,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import SkillChip from './SkillChip';
import ConflictBadge from '../common/ConflictBadge';
import StorySeedDialog from '../common/StorySeedDialog';
import PlotSuggestionPanel from './PlotSuggestionPanel';
import RelationForm from '../relation/RelationForm';
import ConfirmDialog from '../common/ConfirmDialog';
import { graphNarrativeService } from '../../services/graphNarrativeService';
import { storySeedService } from '../../services/storySeedService';
import type { Character, Relation, StorySeedData, HistoryEvent } from '../../types';
import { RELATION_COLORS } from '../../constants/relationTypes';
import { useWorldStore } from '../../store/worldStore';

interface CharacterDetailPanelProps {
  characterId: string | null;
  onClose: () => void;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
}

const CharacterDetailPanel: React.FC<CharacterDetailPanelProps> = ({
  characterId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const data = useWorldStore((s) => s.data);
  const updateRelation = useWorldStore((s) => s.updateRelation);
  const deleteRelation = useWorldStore((s) => s.deleteRelation);
  const addRelation = useWorldStore((s) => s.addRelation);
  const addEvent = useWorldStore((s) => s.addEvent);
  const updateCharacter = useWorldStore((s) => s.updateCharacter);

  const character = useWorldStore((s) =>
    s.data.characters.find((c) => c.id === characterId) ?? null
  );
  const faction = useWorldStore((s) =>
    character?.factionId
      ? s.data.factions.find((f) => f.id === character.factionId)
      : undefined
  );
  const conflicts = useWorldStore((s) =>
    characterId ? s.conflicts.filter((c) => c.characterId === characterId) : []
  );
  const relatedEvents = useWorldStore((s) =>
    character?.relatedEventIds
      ? s.data.events.filter((e) => character.relatedEventIds.includes(e.id))
      : []
  );

  const storyData = useMemo(() => {
    if (!characterId) return null;
    return graphNarrativeService.buildCharacterStory(
      characterId, data.characters, data.factions, data.relations
    );
  }, [characterId, data.characters, data.factions, data.relations]);

  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Relation | null>(null);
  const [newRelationOpen, setNewRelationOpen] = useState(false);

  const [storySeedOpen, setStorySeedOpen] = useState(false);
  const [selectedStorySeed, setSelectedStorySeed] = useState<StorySeedData | null>(null);
  const [eventSnackbar, setEventSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  if (!character) {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        p: 3,
      }}>
        <Typography variant="body2" sx={{ textAlign: 'center', lineHeight: 1.8 }}>
          选择一个人物查看详情
        </Typography>
      </Box>
    );
  }

  const handleSaveRelation = (relData: Omit<Relation, 'id'>) => {
    if (editingRelation) {
      updateRelation(editingRelation.id, relData);
      setEditingRelation(null);
    } else {
      addRelation(relData);
      setNewRelationOpen(false);
    }
  };

  const handleCreateRelation = (relData: Omit<Relation, 'id'>) => {
    addRelation(relData);
    setNewRelationOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteRelation(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleConflictClick = () => {
    if (conflicts.length > 0) {
      const seed = storySeedService.toStorySeed(conflicts[0], data);
      setSelectedStorySeed(seed);
      setStorySeedOpen(true);
    }
  };

  const handleCreateEvent = (prefilled: {
    title: string;
    description: string;
    tags: string[];
    characterId: string;
  }) => {
    const eventYear = character.birthYear ?? (data.events.length > 0 ? data.events.reduce((min, e) => Math.min(min, e.year), Infinity) : 1);
    const newEvent: Omit<HistoryEvent, 'id'> = {
      title: prefilled.title,
      year: eventYear,
      description: prefilled.description,
      tags: prefilled.tags,
      factionIds: [character.factionId],
      characterIds: [character.id],
    };
    const newEventId = addEvent(newEvent);
    updateCharacter(character.id, {
      relatedEventIds: [...character.relatedEventIds, newEventId],
    });
    setEventSnackbar({ open: true, message: `事件「${prefilled.title}」已创建！` });
  };

  const lifespan =
    character.birthYear !== undefined
      ? `${character.birthYear}${character.deathYear !== undefined ? ` - ${character.deathYear}` : ' - 至今'}`
      : '未知';

  const neighbors = storyData?.neighbors ?? [];
  const overallNarrative = storyData?.overallNarrative ?? '';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fffef8',
        borderLeft: '1px solid rgba(26,35,126,0.12)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ p: 2.5, pb: 1.5, position: 'relative' }}>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#666',
            '&:hover': { color: '#1a237e' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={character.avatar}
            sx={{
              width: 52,
              height: 52,
              border: `2px solid ${faction?.color ?? '#8B4513'}`,
              fontSize: '1.4rem',
              bgcolor: 'rgba(26,35,126,0.08)',
            }}
          >
            {character.name.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontWeight: 700,
                color: '#1a237e',
                fontSize: '1.15rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {character.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
              {faction && (
                <Chip
                  label={faction.name}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 20,
                    backgroundColor: faction.color,
                    color: '#fff',
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 0.8 },
                  }}
                />
              )}
              {character.title && (
                <Typography variant="caption" sx={{ color: '#888', fontStyle: 'italic' }}>
                  {character.title}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Lifespan & Conflict */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            生卒：{lifespan}
          </Typography>
          {conflicts.length > 0 && (
            <ConflictBadge conflicts={conflicts} onClick={handleConflictClick} />
          )}
        </Box>
      </Box>

      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />

      {/* ── Skills ── */}
      {character.skills.length > 0 && (
        <>
          <Box sx={{ px: 2.5, pt: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.8 }}>
              技能
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {character.skills.map((skill, idx) => (
                <SkillChip key={idx} skill={skill} size="small" />
              ))}
            </Box>
          </Box>
          <Divider sx={{ mx: 2, mt: 1.5, borderColor: 'rgba(139,69,19,0.15)' }} />
        </>
      )}

      {/* ── Traits ── */}
      {character.traits.length > 0 && (
        <>
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.8 }}>
              特质
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {character.traits.map((t) => (
                <Chip key={t} label={t} size="small" sx={{ background: '#f5f0e6', color: '#554433' }} />
              ))}
            </Box>
          </Box>
          <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
        </>
      )}

      {/* ── Biography ── */}
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.5 }}>
          人物传记
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#555',
            fontSize: '0.82rem',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {character.bio || '暂无传记'}
        </Typography>
      </Box>

      {/* ── Relationships ── */}
      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>
            人物关系（{neighbors.length}）
          </Typography>
          {data.characters.length >= 2 && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setNewRelationOpen(true)}
              sx={{
                fontSize: '0.7rem',
                color: '#1a237e',
                textTransform: 'none',
                minWidth: 0,
                p: 0.3,
              }}
            >
              添加
            </Button>
          )}
        </Box>

        {neighbors.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {neighbors.map((n, idx) => {
              const relColor = RELATION_COLORS[n.relation.type] ?? '#1a237e';
              return (
                <Box key={`${n.character.id}-${idx}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                    <Avatar
                      src={n.character.avatar}
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.7rem',
                        bgcolor: 'rgba(26,35,126,0.08)',
                      }}
                    >
                      {n.character.name.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#1a237e',
                        fontSize: '0.8rem',
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {n.character.name}
                    </Typography>
                    <Chip
                      label={n.relation.type}
                      size="small"
                      sx={{
                        fontSize: '0.6rem',
                        height: 18,
                        backgroundColor: relColor,
                        color: '#fff',
                        fontWeight: 600,
                        '& .MuiChip-label': { px: 0.6 },
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 0, ml: 'auto', flexShrink: 0 }}>
                      <Tooltip title="编辑关系">
                        <IconButton size="small" onClick={() => setEditingRelation(n.relation)} sx={{ p: 0.3 }}>
                          <EditIcon sx={{ fontSize: 14, color: '#1a237e' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除关系">
                        <IconButton size="small" onClick={() => setDeleteTarget(n.relation)} sx={{ p: 0.3 }}>
                          <DeleteForeverIcon sx={{ fontSize: 14, color: '#C62828' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#777',
                      fontSize: '0.72rem',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      pl: 4,
                    }}
                  >
                    {n.narrative}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#aaa', fontStyle: 'italic' }}>
            暂无关系记录
          </Typography>
        )}
      </Box>

      {/* ── Related Events ── */}
      {relatedEvents.length > 0 && (
        <>
          <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.8 }}>
              <EventIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.3 }} />
              关联事件
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {relatedEvents.map((ev) => (
                <Chip
                  key={ev.id}
                  label={`${ev.year}年 · ${ev.title}`}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* ── Overall Narrative ── */}
      {overallNarrative && (
        <>
          <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.8 }}>
              人物总评
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                color: '#554433',
                fontSize: '0.82rem',
                lineHeight: 1.8,
                fontStyle: 'italic',
              }}
            >
              {overallNarrative}
            </Typography>
          </Box>
        </>
      )}

      {/* ── Plot Suggestion ── */}
      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <PlotSuggestionPanel character={character} onCreateEvent={handleCreateEvent} />
      </Box>

      {/* ── Action Buttons ── */}
      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
      <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
        {onEdit && (
          <Button
            fullWidth
            variant="contained"
            startIcon={<EditIcon sx={{ fontSize: 16 }} />}
            onClick={() => onEdit(character)}
            sx={{
              background: '#1a237e',
              color: '#faf3e0',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { background: '#283593' },
            }}
          >
            编辑
          </Button>
        )}
        {onDelete && (
          <Button
            fullWidth
            variant="contained"
            startIcon={<DeleteForeverIcon sx={{ fontSize: 16 }} />}
            onClick={() => onDelete(character)}
            sx={{
              background: '#C0392B',
              color: '#fff',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { background: '#E74C3C' },
            }}
          >
            删除
          </Button>
        )}
      </Box>

      {/* ── Edit Relation Dialog ── */}
      <RelationForm
        open={!!editingRelation}
        onClose={() => setEditingRelation(null)}
        onSave={handleSaveRelation}
        initialData={editingRelation}
      />

      {/* ── New Relation Dialog ── */}
      <RelationForm
        open={newRelationOpen}
        onClose={() => setNewRelationOpen(false)}
        onSave={handleCreateRelation}
        defaultSourceId={character.id}
      />

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除关系？"
        message={
          deleteTarget
            ? `将删除「${deleteTarget.type}」关系，此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Story Seed Dialog ── */}
      <StorySeedDialog
        open={storySeedOpen}
        storySeed={selectedStorySeed}
        onClose={() => setStorySeedOpen(false)}
      />

      {/* ── Event Snackbar ── */}
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
    </Box>
  );
};

export default CharacterDetailPanel;
