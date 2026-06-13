/**
 * CardPackPanel — 卡片包内嵌面板
 * 网格列表 + 新建/编辑/删除 + 包内人物管理（添加/移除）
 * 删除卡片包不级联删除人物
 * 作为 CharacterPage 的第三个视图模式使用，无外层页壳
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions,
  Autocomplete,
  Avatar,
  Tooltip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import StyleIcon from '@mui/icons-material/Style';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PeopleIcon from '@mui/icons-material/People';
import { useWorldStore } from '../../store/worldStore';
import { useSFX } from '../../hooks/useSFX';
import EmptyState from '../common/EmptyState';
import ConfirmDialog from '../common/ConfirmDialog';
import type { CardPack, Character, Faction } from '../../types';

// ─── 稀有度颜色 ──────────────────────────────────────────
const RARITY_COLORS: Record<string, string> = {
  legendary: '#ffd700',
  epic: '#c084fc',
  rare: '#60a5fa',
  common: '#9ca3af',
};

const RARITY_LABELS: Record<string, string> = {
  legendary: '传说',
  epic: '史诗',
  rare: '稀有',
  common: '普通',
};

// ─── Component ────────────────────────────────────────────

const CardPackPanel: React.FC = () => {
  const sfx = useSFX();
  const cardPacks = useWorldStore((s) => s.data.cardPacks);
  const characters = useWorldStore((s) => s.data.characters);
  const factions = useWorldStore((s) => s.data.factions);
  const addCardPack = useWorldStore((s) => s.addCardPack);
  const updateCardPack = useWorldStore((s) => s.updateCardPack);
  const deleteCardPack = useWorldStore((s) => s.deleteCardPack);
  const addCharacterToPack = useWorldStore((s) => s.addCharacterToPack);
  const removeCharacterFromPack = useWorldStore((s) => s.removeCharacterFromPack);

  // ── 新建/编辑对话框 ──
  const [formOpen, setFormOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<CardPack | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // ── 包详情对话框 ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPackId, setDetailPackId] = useState<string | null>(null);

  // ── 删除确认 ──
  const [deleteTarget, setDeleteTarget] = useState<CardPack | null>(null);

  const detailPack = useMemo(
    () => cardPacks.find((p) => p.id === detailPackId) ?? null,
    [cardPacks, detailPackId],
  );

  const packCharacters = useMemo(() => {
    if (!detailPack) return [];
    return detailPack.characterIds
      .map((cid) => characters.find((c) => c.id === cid))
      .filter((c): c is Character => c != null);
  }, [detailPack, characters]);

  const availableCharacters = useMemo(() => {
    if (!detailPack) return characters;
    const inPack = new Set(detailPack.characterIds);
    return characters.filter((c) => !inPack.has(c.id));
  }, [characters, detailPack]);

  const factionMap = useMemo(() => {
    const m: Record<string, Faction> = {};
    factions.forEach((f) => { m[f.id] = f; });
    return m;
  }, [factions]);

  // ── Handlers ──────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingPack(null);
    setFormName('');
    setFormDesc('');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((pack: CardPack) => {
    setEditingPack(pack);
    setFormName(pack.name);
    setFormDesc(pack.description);
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formName.trim()) return;
    if (editingPack) {
      updateCardPack(editingPack.id, { name: formName.trim(), description: formDesc.trim() });
    } else {
      addCardPack(formName.trim(), formDesc.trim());
      sfx.playClick();
    }
    setFormOpen(false);
  }, [formName, formDesc, editingPack, updateCardPack, addCardPack, sfx]);

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      deleteCardPack(deleteTarget.id);
      setDeleteTarget(null);
      if (detailPackId === deleteTarget.id) {
        setDetailOpen(false);
        setDetailPackId(null);
      }
    }
  }, [deleteTarget, deleteCardPack, detailPackId]);

  const openDetail = useCallback((packId: string) => {
    setDetailPackId(packId);
    setDetailOpen(true);
  }, []);

  const handleAddChar = useCallback(
    (_e: unknown, char: Character | null) => {
      if (char && detailPackId) {
        addCharacterToPack(detailPackId, char.id);
        sfx.playClick();
      }
    },
    [detailPackId, addCharacterToPack, sfx],
  );

  const handleRemoveChar = useCallback(
    (charId: string) => {
      if (detailPackId) {
        removeCharacterFromPack(detailPackId, charId);
      }
    },
    [detailPackId, removeCharacterFromPack],
  );

  // ── Render ────────────────────────────────────────

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Empty State */}
      {cardPacks.length === 0 && (
        <EmptyState
          icon={<StyleIcon sx={{ fontSize: 64, color: '#c9a050' }} />}
          title="尚无卡片包"
          description="创建一个卡片包来收纳你的英灵卡片——删除卡片包不会影响任何人物。"
          action={
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                borderColor: '#c9a050',
                color: '#c9a050',
                textTransform: 'none',
                '&:hover': { borderColor: '#daa520', background: 'rgba(201,160,80,0.06)' },
              }}
            >
              创建第一个卡片包
            </Button>
          }
        />
      )}

      {/* Card Pack Grid */}
      <Grid container spacing={2.5}>
        {cardPacks.map((pack) => {
          const charCount = pack.characterIds.length;
          const previewChars = pack.characterIds
            .slice(0, 4)
            .map((cid) => characters.find((c) => c.id === cid))
            .filter((c): c is Character => c != null);
          const createdAt = new Date(pack.createdAt).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pack.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '1px solid rgba(139,69,19,0.12)',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  background: '#fdf8f0',
                  '&:hover': {
                    borderColor: '#c9a050',
                    boxShadow: '0 4px 16px rgba(139,69,19,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => openDetail(pack.id)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: "'LXGW WenKai TC', serif",
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#1a237e',
                        lineHeight: 1.3,
                      }}
                    >
                      {pack.name}
                    </Typography>
                    <Chip
                      icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                      label={charCount}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        background: charCount > 0 ? 'rgba(26,35,126,0.08)' : 'rgba(0,0,0,0.04)',
                        color: charCount > 0 ? '#1a237e' : '#999',
                        minWidth: 40,
                        flexShrink: 0,
                        ml: 1,
                      }}
                    />
                  </Box>

                  {pack.description && (
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: '#7f6b5c',
                        lineHeight: 1.5,
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {pack.description}
                    </Typography>
                  )}

                  {previewChars.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      {previewChars.map((ch) => {
                        const faction = factionMap[ch.factionId];
                        return (
                          <Tooltip key={ch.id} title={ch.name} arrow>
                            <Avatar
                              src={ch.avatar}
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: '0.7rem',
                                border: `2px solid ${faction?.color ?? '#8B4513'}40`,
                                background: faction?.color ?? '#8B4513',
                              }}
                            >
                              {ch.name[0]}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                      {charCount > 4 && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#999', ml: 0.5 }}>
                          +{charCount - 4}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Typography sx={{ fontSize: '0.7rem', color: '#bbb' }}>
                    {createdAt} 创建
                  </Typography>
                </CardContent>

                <CardActions sx={{ pt: 0, px: 1, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openEdit(pack); }}
                    sx={{ color: '#8B4513' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(pack); }}
                    sx={{ color: '#c62828' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Create/Edit Dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, background: '#fdf8f0' },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'LXGW WenKai TC', serif",
            fontSize: '1.2rem',
            color: '#1a237e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {editingPack ? '编辑卡片包' : '新建卡片包'}
          <IconButton onClick={() => setFormOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            label="包名称"
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            autoFocus
            inputProps={{ maxLength: 30 }}
          />
          <TextField
            label="描述（可选）"
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            inputProps={{ maxLength: 200 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} sx={{ textTransform: 'none', color: '#666' }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formName.trim()}
            sx={{ background: '#1a237e', textTransform: 'none' }}
          >
            {editingPack ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Pack Detail Dialog ── */}
      <Dialog
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailPackId(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, background: '#fdf8f0', minHeight: 400 },
        }}
      >
        {detailPack && (
          <>
            <DialogTitle
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontSize: '1.3rem',
                color: '#1a237e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(139,69,19,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StyleIcon sx={{ color: '#c9a050' }} />
                {detailPack.name}
                <Chip
                  label={`${detailPack.characterIds.length} 人`}
                  size="small"
                  sx={{
                    background: 'rgba(26,35,126,0.08)',
                    color: '#1a237e',
                    fontWeight: 500,
                  }}
                />
              </Box>
              <IconButton onClick={() => { setDetailOpen(false); setDetailPackId(null); }} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {detailPack.description && (
                <Typography sx={{ fontSize: '0.85rem', color: '#7f6b5c', mb: 2, fontStyle: 'italic' }}>
                  {detailPack.description}
                </Typography>
              )}

              {/* Add character search */}
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={availableCharacters}
                  getOptionLabel={(c) => c.name}
                  onChange={handleAddChar}
                  noOptionsText="所有人物已在包中"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="搜索人物并添加到卡片包…"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <PersonAddIcon sx={{ color: '#c9a050', mr: 0.5, fontSize: 20 }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          background: '#fff',
                          borderRadius: 1.5,
                        },
                      }}
                    />
                  )}
                  renderOption={(props, ch) => {
                    const { key, ...rest } = props;
                    const faction = factionMap[ch.factionId];
                    return (
                      <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                        <Avatar
                          src={ch.avatar}
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.7rem',
                            background: faction?.color ?? '#8B4513',
                          }}
                        >
                          {ch.name[0]}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{ch.name}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: '#999' }}>
                            {faction?.name ?? '—'} {ch.title ? `· ${ch.title}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ mb: 2, borderColor: 'rgba(139,69,19,0.1)' }} />

              {/* Pack characters grid */}
              {packCharacters.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: '#ddd', mb: 1 }} />
                  <Typography sx={{ color: '#aaa', fontSize: '0.9rem' }}>
                    包内尚无人物，使用上方搜索栏添加
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {packCharacters.map((ch) => {
                    const faction = factionMap[ch.factionId];
                    const rarityColor = RARITY_COLORS[ch.rarity ?? 'common'];
                    return (
                      <Grid item xs={6} sm={4} md={4} key={ch.id}>
                        <Card
                          sx={{
                            background: '#fff',
                            border: '1px solid rgba(139,69,19,0.1)',
                            borderRadius: 2,
                            transition: 'all 0.15s',
                            '&:hover': { borderColor: faction?.color ?? '#c9a050', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                          }}
                        >
                          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={ch.avatar}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  fontSize: '0.8rem',
                                  background: faction?.color ?? '#8B4513',
                                  border: `2px solid ${rarityColor}60`,
                                }}
                              >
                                {ch.name[0]}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#1a237e',
                                    fontFamily: "'LXGW WenKai TC', serif",
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {ch.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                  <Typography sx={{ fontSize: '0.65rem', color: '#999' }}>
                                    {faction?.name ?? '—'}
                                  </Typography>
                                  {ch.rarity && (
                                    <Chip
                                      label={RARITY_LABELS[ch.rarity]}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: '0.55rem',
                                        background: `${rarityColor}20`,
                                        color: rarityColor,
                                        '& .MuiChip-label': { px: 0.5 },
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                              <Tooltip title="从包中移除" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveChar(ch.id)}
                                  sx={{ color: '#c62828', p: 0.5 }}
                                >
                                  <PersonRemoveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除卡片包？"
        message={
          deleteTarget
            ? `确定要删除「${deleteTarget.name}」吗？其中的 ${deleteTarget.characterIds.length} 张人物卡片不会被删除，仅移除此卡片包本身。`
            : ''
        }
        confirmLabel="删除卡片包"
        cancelLabel="取消"
        severity="warning"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default CardPackPanel;
