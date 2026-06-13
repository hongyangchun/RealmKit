/**
 * CharacterDetailPanel - 统一人物详情面板
 * 融合 CharacterDrawer 和 CharacterStoryCard 的全部功能
 * 用于主从联动布局的右侧面板
 *
 * v2.0: 显示内容与 CharacterForm 编辑表单完全对齐
 * 新增: 称号/体力勾玉/稀有度/立绘/卡牌编号/技能完整描述
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import StarIcon from '@mui/icons-material/Star';
import SkillChip from './SkillChip';
import JadeTokens from './JadeTokens';
import ConflictBadge from '../common/ConflictBadge';
import StorySeedDialog from '../common/StorySeedDialog';
import RelationForm from '../relation/RelationForm';
import ConfirmDialog from '../common/ConfirmDialog';
import { graphNarrativeService } from '../../services/graphNarrativeService';
import { storySeedService } from '../../services/storySeedService';
import type { Character, Relation, StorySeedData, CardRarity } from '../../types';
import { RELATION_COLORS } from '../../constants/relationTypes';
import { useWorldStore } from '../../store/worldStore';
import { calcRarityForCharacter, RARITY_LABEL } from '../../utils/rarity';

// ── 稀有度视觉配置 ──
const RARITY_CONFIG: Record<CardRarity, { label: string; color: string; bg: string }> = {
  common:    { label: '普通', color: '#a0a0a0', bg: 'rgba(160,160,160,0.12)' },
  rare:      { label: '稀有', color: '#4a90d9', bg: 'rgba(74,144,217,0.12)' },
  epic:      { label: '史诗', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  legendary: { label: '传说', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

// ── 技能类型图标 ──
const SKILL_TYPE_ICON: Record<string, React.ReactNode> = {
  active:  <BoltIcon sx={{ fontSize: 14 }} />,
  passive: <ShieldIcon sx={{ fontSize: 14 }} />,
  special: <StarIcon sx={{ fontSize: 14 }} />,
};
const SKILL_TYPE_LABEL: Record<string, string> = {
  active: '主动', passive: '被动', special: '特殊',
};
const SKILL_TYPE_COLOR: Record<string, string> = {
  active: '#c0392b', passive: '#1a6a8a', special: '#6a3a8a',
};

// ── Props ──
interface CharacterDetailPanelProps {
  characterId: string | null;
  onClose: () => void;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  /** 是否处于编辑态；为 true 时隐藏「人物总评」模块 */
  isEditing?: boolean;
}

const CharacterDetailPanel: React.FC<CharacterDetailPanelProps> = ({
  characterId,
  onClose,
  onEdit,
  onDelete,
  isEditing = false,
}) => {
  const data = useWorldStore((s) => s.data);
  const updateRelation = useWorldStore((s) => s.updateRelation);
  const deleteRelation = useWorldStore((s) => s.deleteRelation);
  const addRelation = useWorldStore((s) => s.addRelation);

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

  // 自动计算推荐稀有度
  const autoRarity = useMemo(() => {
    if (!character) return null;
    return calcRarityForCharacter({
      skills: character.skills,
      bio: character.bio,
      relatedEventIds: character.relatedEventIds ?? [],
    });
  }, [character]);

  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Relation | null>(null);
  const [newRelationOpen, setNewRelationOpen] = useState(false);
  const [storySeedOpen, setStorySeedOpen] = useState(false);
  const [selectedStorySeed, setSelectedStorySeed] = useState<StorySeedData | null>(null);

  if (!character) {
    return (
      <Box sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#aaa', p: 3,
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
    if (deleteTarget) { deleteRelation(deleteTarget.id); setDeleteTarget(null); }
  };
  const handleConflictClick = () => {
    if (conflicts.length > 0) {
      setSelectedStorySeed(storySeedService.toStorySeed(conflicts[0], data));
      setStorySeedOpen(true);
    }
  };

  const lifespan =
    character.birthYear !== undefined
      ? `${character.birthYear}${character.deathYear !== undefined ? ` - ${character.deathYear}` : ' - 至今'}`
      : '未知';

  const neighbors = storyData?.neighbors ?? [];
  const overallNarrative = storyData?.overallNarrative ?? '';
  const factionColor = faction?.color ?? '#8B4513';
  const rarityCfg = RARITY_CONFIG[character.rarity ?? 'common'];
  const rarityMismatch = autoRarity && autoRarity !== (character.rarity ?? 'common');

  return (
    <Box
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: '#fffef8', borderLeft: '1px solid rgba(26,35,126,0.12)',
        overflowY: 'auto', overflowX: 'hidden',
      }}
    >
      {/* ════════════════════════════════════════════════════════
          Header — 与 CharacterForm 字段完全对齐
          ════════════════════════════════════════════════════════ */}
      <Box sx={{ p: 2.5, pb: 1.5, position: 'relative' }}>
        <IconButton
          size="small" onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#666', '&:hover': { color: '#1a237e' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* ── 立绘缩略图（若有）── */}
        {character.portrait && (
          <Box sx={{ mb: 1.5, textAlign: 'center' }}>
            <Box
              component="img"
              src={character.portrait}
              alt={`${character.name}立绘`}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              sx={{
                width: '100%', maxHeight: 220, objectFit: 'cover',
                borderRadius: '8px', border: `1px solid ${factionColor}30`,
              }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Avatar */}
          <Avatar
            src={character.avatar}
            sx={{
              width: 56, height: 56, flexShrink: 0,
              border: `2px solid ${factionColor}`,
              fontSize: '1.4rem', bgcolor: 'rgba(26,35,126,0.08)',
            }}
          >
            {character.name.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* ── 称号（对应 CharacterForm nickname 字段）── */}
            {character.nickname && (
              <Typography
                sx={{
                  fontSize: '0.75rem', color: factionColor, fontWeight: 600,
                  fontFamily: "'LXGW WenKai TC', serif",
                  letterSpacing: '0.08em', lineHeight: 1.3,
                }}
              >
                「{character.nickname}」
              </Typography>
            )}

            {/* Name + Rarity */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700,
                  color: '#1a237e', fontSize: '1.2rem', lineHeight: 1.2,
                }}
              >
                {character.name}
              </Typography>
              {/* 稀有度角标（对应 CharacterForm rarity 字段） */}
              <Chip
                label={rarityCfg.label}
                size="small"
                sx={{
                  height: 20, fontSize: '0.58rem',
                  fontWeight: 600, fontFamily: "'LXGW WenKai TC', serif",
                  backgroundColor: rarityCfg.bg, color: rarityCfg.color,
                  border: `1px solid ${rarityCfg.color}60`,
                  '& .MuiChip-label': { px: 0.8 },
                }}
              />
              {/* 稀有度不匹配提示 */}
              {rarityMismatch && (
                <Typography variant="caption" sx={{ color: 'warning.main', fontStyle: 'italic' }}>
                  推荐: {RARITY_LABEL[autoRarity!]}
                </Typography>
              )}
            </Box>

            {/* Row 1: Title + Faction */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
              {character.title && (
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {character.title}
                </Typography>
              )}
              {faction && (
                <Chip
                  label={faction.name}
                  size="small"
                  sx={{
                    fontSize: '0.65rem', height: 20, fontWeight: 600,
                    backgroundColor: factionColor, color: '#fff',
                    '& .MuiChip-label': { px: 0.8 },
                  }}
                />
              )}
            </Box>

            {/* Row 2: Lifespan + HP (勾玉) + Card Number + Conflict */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
              {/* 生卒年 */}
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                生卒：{lifespan}
              </Typography>

              {/* HP 体力 — 勾玉可视化（对应 CharacterForm hp 字段）*/}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 12, color: '#c0392b' }} />
                <JadeTokens count={character.hp ?? 4} size={14} color={factionColor} />
              </Box>

              {/* 卡牌编号（对应 CharacterForm cardNumber 字段）*/}
              {character.cardNumber && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#999', fontFamily: 'monospace',
                    fontSize: '0.65rem', letterSpacing: '0.04em',
                  }}
                >
                  #{character.cardNumber}
                </Typography>
              )}

              {/* Conflict */}
              {conflicts.length > 0 && (
                <ConflictBadge conflicts={conflicts} onClick={handleConflictClick} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />

      {/* ════════════════════════════════════════════════════════
          Skills — 完整显示技能名称+类型+描述（与 Form 对齐）
          ════════════════════════════════════════════════════════ */}
      {character.skills.length > 0 && (
        <>
          <Box sx={{ px: 2.5, pt: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 1 }}>
              技能（{character.skills.length}）
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              {character.skills.map((skill, idx) => {
                const skColor = SKILL_TYPE_COLOR[skill.type] ?? '#8B4513';
                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.2, border: `1px solid ${skColor}30`,
                      borderRadius: '6px', background: `${skColor}08`,
                    }}
                  >
                    {/* Skill header: name + type chip */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: skill.description ? 0.5 : 0 }}>
                      <Box sx={{ color: skColor, display: 'flex', alignItems: 'center' }}>
                        {SKILL_TYPE_ICON[skill.type]}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '0.82rem', fontWeight: 700,
                          color: '#1a237e', fontFamily: "'LXGW WenKai TC', serif",
                        }}
                      >
                        {skill.name}
                      </Typography>
                      <Chip
                        label={SKILL_TYPE_LABEL[skill.type]}
                        size="small"
                        sx={{
                          height: 18, fontSize: '0.55rem', fontWeight: 600,
                          backgroundColor: `${skColor}20`, color: skColor,
                          border: `0.5px solid ${skColor}40`,
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    </Box>
                    {/* Skill description — 完整显示 */}
                    {skill.description && (
                      <Typography
                        sx={{
                          fontSize: '0.72rem', color: '#555',
                          lineHeight: 1.65, pl: 0.3,
                          fontFamily: "'LXGW WenKai TC', serif",
                        }}
                      >
                        {skill.description}
                      </Typography>
                    )}
                  </Box>
                );
              })}
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
          sx={{ color: '#555', fontSize: '0.82rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
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
              size="small" startIcon={<AddIcon />}
              onClick={() => setNewRelationOpen(true)}
              sx={{ fontSize: '0.7rem', color: '#1a237e', textTransform: 'none', minWidth: 0, p: 0.3 }}
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
                    <Avatar src={n.character.avatar}
                      sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'rgba(26,35,126,0.08)' }}
                    >
                      {n.character.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" sx={{
                      fontWeight: 600, color: '#1a237e', fontSize: '0.8rem', flex: 1, minWidth: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {n.character.name}
                    </Typography>
                    <Chip label={n.relation.type} size="small" sx={{
                      fontSize: '0.6rem', height: 18, backgroundColor: relColor, color: '#fff',
                      fontWeight: 600, '& .MuiChip-label': { px: 0.6 }, flexShrink: 0,
                    }} />
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
                  <Typography variant="caption" sx={{
                    color: '#777', fontSize: '0.72rem', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', pl: 4,
                  }}>
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
                <Chip key={ev.id} label={`${ev.year}年 · ${ev.title}`}
                  variant="outlined" size="small" sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* ── Overall Narrative ── 编辑态时隐藏 */}
      {overallNarrative && !isEditing && (
        <>
          <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.8 }}>
              人物总评
            </Typography>
            <Typography variant="body2" sx={{
              fontFamily: "'LXGW WenKai TC', serif", color: '#554433',
              fontSize: '0.82rem', lineHeight: 1.8, fontStyle: 'italic',
            }}>
              {overallNarrative}
            </Typography>
          </Box>
        </>
      )}


      {/* ── Action Buttons ── */}
      <Divider sx={{ mx: 2, borderColor: 'rgba(139,69,19,0.15)' }} />
      <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
        {onEdit && (
          <Button fullWidth variant="contained" startIcon={<EditIcon sx={{ fontSize: 16 }} />}
            onClick={() => onEdit(character)}
            sx={{
              background: '#1a237e', color: '#faf3e0', borderRadius: 2,
              textTransform: 'none', '&:hover': { background: '#283593' },
            }}
          >
            编辑
          </Button>
        )}
        {onDelete && (
          <Button fullWidth variant="contained" startIcon={<DeleteForeverIcon sx={{ fontSize: 16 }} />}
            onClick={() => onDelete(character)}
            sx={{
              background: '#C0392B', color: '#fff', borderRadius: 2,
              textTransform: 'none', '&:hover': { background: '#E74C3C' },
            }}
          >
            删除
          </Button>
        )}
      </Box>

      {/* ── Sub-dialogs ── */}
      <RelationForm
        open={!!editingRelation}
        onClose={() => setEditingRelation(null)}
        onSave={handleSaveRelation}
        initialData={editingRelation}
      />
      <RelationForm
        open={newRelationOpen}
        onClose={() => setNewRelationOpen(false)}
        onSave={handleCreateRelation}
        defaultSourceId={character.id}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除关系？"
        message={deleteTarget ? `将删除「${deleteTarget.type}」关系，此操作不可撤销。` : ''}
        confirmLabel="删除" cancelLabel="取消" severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      <StorySeedDialog
        open={storySeedOpen}
        storySeed={selectedStorySeed}
        onClose={() => setStorySeedOpen(false)}
      />
    </Box>
  );
};

export default CharacterDetailPanel;
