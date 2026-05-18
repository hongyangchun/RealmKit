/**
 * CharacterPage - 统一人物页面
 * 主从联动布局：左侧主视图（网络图/卡片网格）+ 右侧详情面板
 * 合并了原人物卡片库、人物关系、关系网络图三个页面
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DownloadIcon from '@mui/icons-material/Download';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import HubIcon from '@mui/icons-material/Hub';
import GridViewIcon from '@mui/icons-material/GridView';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { useWorldStore } from '../store/worldStore';
import RelationGraph from '../components/graph/RelationGraph';
import CharacterCard from '../components/character/CharacterCard';
import CharacterForm from '../components/character/CharacterForm';
import CharacterDetailPanel from '../components/character/CharacterDetailPanel';
import { exportCharacterCard } from '../components/character/CharacterCardExporter';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import StorySeedDialog from '../components/common/StorySeedDialog';
import { storySeedService } from '../services/storySeedService';
import type { Character } from '../types';
import type { StorySeedData } from '../services/storySeedService';

type ViewMode = 'graph' | 'cards';

const CharacterPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const data = useWorldStore((s) => s.data);
  const characters = useWorldStore((s) => s.data.characters);
  const factions = useWorldStore((s) => s.data.factions);
  const events = useWorldStore((s) => s.data.events);
  const conflicts = useWorldStore((s) => s.conflicts);
  const addCharacter = useWorldStore((s) => s.addCharacter);
  const updateCharacter = useWorldStore((s) => s.updateCharacter);
  const deleteCharacter = useWorldStore((s) => s.deleteCharacter);

  // ── 视图模式 ──
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  // ── 选中人物 ──
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // ── 搜索 & 筛选 ──
  const [searchText, setSearchText] = useState('');
  const [filterFaction, setFilterFaction] = useState<string>('all');

  // ── 网络图可见节点计数 ──
  const [graphVisibleCount, setGraphVisibleCount] = useState(characters.length);

  // ── 角色表单 ──
  const [showForm, setShowForm] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);

  // ── 删除确认 ──
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  // ── 多选（卡片模式） ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchToast, setBatchToast] = useState<{ open: boolean; msg: string; ok: boolean }>({
    open: false, msg: '', ok: true,
  });

  // ── 故事种子 ──
  const [storySeedDialogOpen, setStorySeedDialogOpen] = useState(false);
  const [storySeed, setStorySeed] = useState<StorySeedData | null>(null);
  const [seedConflictIndex, setSeedConflictIndex] = useState(0);

  // 计算全局年份范围（用于人物生命周期条）
  const worldYearRange = useMemo(() => {
    const years = [
      ...events.map((e) => e.year),
      ...characters.flatMap((c) =>
        [c.birthYear, c.deathYear].filter((y): y is number => y !== undefined)
      ),
    ];
    if (years.length === 0) return { min: 0, max: 100 };
    return { min: years.reduce((a, b) => Math.min(a, b), Infinity) - 10, max: years.reduce((a, b) => Math.max(a, b), -Infinity) + 10 };
  }, [events, characters]);

  // 过滤后的人物列表
  const filteredCharacters = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();
    return characters.filter((c) => {
      if (filterFaction !== 'all' && c.factionId !== filterFaction) return false;
      if (lowerSearch) {
        const haystack = [
          c.name,
          c.bio,
          c.title ?? '',
          ...c.traits,
          ...c.skills.map((s) => s.name),
        ].join(' ').toLowerCase();
        if (!haystack.includes(lowerSearch)) return false;
      }
      return true;
    });
  }, [characters, filterFaction, searchText]);

  // ── Handlers ──

  const handleConflictClick = useCallback((charId: string) => {
    const charConflicts = conflicts.filter((c) => c.characterId === charId);
    if (charConflicts.length === 0) return;
    const seeds = charConflicts.map((c) => storySeedService.toStorySeed(c, data));
    setStorySeed(seeds[0]);
    setSeedConflictIndex(0);
    setStorySeedDialogOpen(true);
  }, [conflicts, data]);

  const handleNextSeed = useCallback(() => {
    if (!storySeed) return;
    const charConflicts = conflicts.filter((c) => {
      const char = characters.find((ch) => ch.name === storySeed.characterName);
      return char && c.characterId === char.id;
    });
    const seeds = charConflicts.map((c) => storySeedService.toStorySeed(c, data));
    const nextIndex = (seedConflictIndex + 1) % seeds.length;
    setStorySeed(seeds[nextIndex]);
    setSeedConflictIndex(nextIndex);
  }, [storySeed, conflicts, characters, data, seedConflictIndex]);

  const handleSave = useCallback((formData: Omit<Character, 'id'>) => {
    if (editingChar) {
      updateCharacter(editingChar.id, formData as Partial<Character>);
    } else {
      addCharacter(formData as Omit<Character, 'id'>);
    }
    setEditingChar(null);
    setShowForm(false);
  }, [editingChar, addCharacter, updateCharacter]);

  const handleEdit = useCallback((char: Character) => {
    setEditingChar(char);
    setShowForm(true);
  }, []);

  const handleDeleteCharacter = useCallback(() => {
    if (deleteTarget) {
      deleteCharacter(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedCharId(null);
    }
  }, [deleteTarget, deleteCharacter]);

  // 多选操作
  const handleSelectionChange = useCallback((charId: string, isSelected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(charId);
      else next.delete(charId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredCharacters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCharacters.map((c) => c.id)));
    }
  }, [selectedIds.size, filteredCharacters]);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDeleteConfirm = useCallback(() => {
    const count = selectedIds.size;
    selectedIds.forEach((id) => deleteCharacter(id));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setBatchDeleteOpen(false);
    setBatchToast({ open: true, msg: `已批量删除 ${count} 位人物`, ok: true });
  }, [selectedIds, deleteCharacter]);

  const handleBatchExport = useCallback(async () => {
    const selectedChars = characters.filter((c) => selectedIds.has(c.id));
    let successCount = 0;
    for (const char of selectedChars) {
      try {
        const faction = factions.find((f) => f.id === char.factionId);
        await exportCharacterCard(char, faction);
        successCount++;
      } catch (e) {
        console.error(`导出「${char.name}」失败:`, e);
      }
    }
    setBatchToast({ open: true, msg: `已导出 ${successCount} 张人物卡牌`, ok: true });
  }, [characters, factions, selectedIds]);

  // 预构建 eventsByChar Map 以加速按人物查找事件
  const eventsByChar = useMemo(() => {
    const m = new Map<string, typeof events>();
    events.forEach((e) => e.characterIds.forEach((cid) => {
      const arr = m.get(cid);
      if (arr) { arr.push(e); } else { m.set(cid, [e]); }
    }));
    return m;
  }, [events]);

  // ── Detail panel content (shared between desktop sidebar and mobile drawer) ──
  const detailPanel = (
    <CharacterDetailPanel
      characterId={selectedCharId}
      onClose={() => setSelectedCharId(null)}
      onEdit={handleEdit}
      onDelete={(c) => setDeleteTarget(c)}
    />
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header Toolbar ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          pb: 1,
          flexShrink: 0,
          borderBottom: '1px solid rgba(26,35,126,0.08)',
          flexWrap: 'wrap',
        }}
      >
        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              borderColor: 'rgba(26,35,126,0.3)',
              color: '#1a237e',
              px: 1.5,
              py: 0.5,
              fontSize: '0.8rem',
              '&.Mui-selected': {
                background: '#1a237e',
                color: '#faf3e0',
                borderColor: '#1a237e',
                '&:hover': { background: '#283593' },
              },
            },
          }}
        >
          <ToggleButton value="graph">
            <HubIcon sx={{ fontSize: 16, mr: 0.5 }} /> 网络图
          </ToggleButton>
          <ToggleButton value="cards">
            <GridViewIcon sx={{ fontSize: 16, mr: 0.5 }} /> 卡片
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Search */}
        <TextField
          size="small"
          placeholder="搜索人物…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#888', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 180,
            maxWidth: 320,
            flex: isMobile ? 1 : '1 1 auto',
            '& .MuiOutlinedInput-root': {
              background: '#fff',
              borderRadius: 2,
              fontSize: '0.875rem',
            },
          }}
        />

        {/* Faction filter (cards mode only, graph has its own controls) */}
        {viewMode === 'cards' && (
          <TextField
            select
            label="势力筛选"
            value={filterFaction}
            onChange={(e) => setFilterFaction(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
            SelectProps={{
              MenuProps: { sx: { zIndex: 10001 }, disablePortal: false },
            }}
          >
            <MenuItem value="all">全部势力</MenuItem>
            {factions.map((f) => (
              <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
            ))}
          </TextField>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Batch operations (cards mode only) */}
        {viewMode === 'cards' && (
          <>
            <Button
              startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
              variant={selectionMode ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                if (selectionMode) handleExitSelectionMode();
                else setSelectionMode(true);
              }}
              sx={{
                borderColor: '#1a237e',
                color: selectionMode ? '#fff' : '#1a237e',
                background: selectionMode ? '#1a237e' : 'transparent',
                textTransform: 'none',
              }}
            >
              {selectionMode ? '退出多选' : '多选'}
            </Button>
          </>
        )}

        {/* Character count */}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {viewMode === 'graph' ? graphVisibleCount : filteredCharacters.length} 位人物
        </Typography>

        {/* New character button */}
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => {
            setEditingChar(null);
            setShowForm(true);
          }}
          sx={{ background: '#1a237e', textTransform: 'none' }}
        >
          新建人物
        </Button>
      </Box>

      {/* ── Multi-select toolbar (cards mode) ── */}
      {viewMode === 'cards' && selectionMode && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 1,
            borderBottom: '1px solid rgba(26,35,126,0.08)',
            background: 'rgba(26,35,126,0.04)',
          }}
        >
          <Button size="small" onClick={handleSelectAll} sx={{ color: '#1a237e', textTransform: 'none' }}>
            {selectedIds.size === filteredCharacters.length && filteredCharacters.length > 0 ? '取消全选' : '全选'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            已选 {selectedIds.size} 项
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={selectedIds.size === 0}
            onClick={handleBatchExport}
            sx={{
              borderColor: '#1a237e',
              color: '#1a237e',
              textTransform: 'none',
              '&.Mui-disabled': { borderColor: '#ccc', color: '#aaa' },
            }}
          >
            批量导出图片
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            disabled={selectedIds.size === 0}
            onClick={() => setBatchDeleteOpen(true)}
            sx={{ textTransform: 'none', '&.Mui-disabled': { borderColor: '#ccc', color: '#aaa' } }}
          >
            批量删除
          </Button>
          <IconButton size="small" onClick={handleExitSelectionMode}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* ── Content Area ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Main View */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {viewMode === 'graph' ? (
            <RelationGraph
              onNodeSelect={setSelectedCharId}
              selectedNodeId={selectedCharId}
              searchText={searchText}
              onVisibleCountChange={setGraphVisibleCount}
            />
          ) : filteredCharacters.length > 0 ? (
            <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
              <Grid container spacing={2}>
                {filteredCharacters.map((char) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={char.id}>
                    <CharacterCard
                      character={char}
                      onEdit={handleEdit}
                      onClick={() => setSelectedCharId(char.id)}
                      characterEvents={eventsByChar.get(char.id) ?? []}
                      worldYearMin={worldYearRange.min}
                      worldYearMax={worldYearRange.max}
                      onConflictClick={handleConflictClick}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(char.id)}
                      onSelectionChange={handleSelectionChange}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <EmptyState
                title="暂无人物数据"
                description={
                  filterFaction !== 'all'
                    ? '该势力下暂无人物'
                    : searchText
                      ? `未找到匹配「${searchText}」的人物`
                      : '点击「新建人物」开始创建你的架空历史人物'
                }
                actionLabel="新建人物"
                onAction={() => {
                  setEditingChar(null);
                  setShowForm(true);
                }}
              />
            </Box>
          )}
        </Box>

        {/* Detail Panel - Desktop sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: selectedCharId ? 380 : 0,
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'width 0.25s ease',
              borderLeft: selectedCharId ? '1px solid rgba(26,35,126,0.12)' : 'none',
            }}
          >
            {selectedCharId && detailPanel}
          </Box>
        )}
      </Box>

      {/* Detail Panel - Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={!!selectedCharId}
          onClose={() => setSelectedCharId(null)}
          PaperProps={{
            sx: {
              height: '85vh',
              borderRadius: '16px 16px 0 0',
              overflow: 'hidden',
            },
          }}
        >
          {detailPanel}
        </Drawer>
      )}

      {/* ── Form dialog ── */}
      <Dialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingChar(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: "'LXGW WenKai TC', serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>{editingChar ? '编辑人物' : '新建人物'}</Box>
          <IconButton onClick={() => { setShowForm(false); setEditingChar(null); }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <CharacterForm
          initialData={editingChar ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingChar(null);
          }}
        />
      </Dialog>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`确认删除「${deleteTarget?.name ?? ''}」？`}
        message="此操作不可撤销，与该人物相关的所有关系也将被删除。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        severity="error"
        onConfirm={handleDeleteCharacter}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Batch delete confirm ── */}
      <ConfirmDialog
        open={batchDeleteOpen}
        title={`确认批量删除 ${selectedIds.size} 位人物？`}
        message="此操作不可撤销，与这些人物相关的所有关系也将被删除。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        severity="error"
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteOpen(false)}
      />

      {/* ── Batch toast ── */}
      <Snackbar
        open={batchToast.open}
        autoHideDuration={3000}
        onClose={() => setBatchToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setBatchToast((t) => ({ ...t, open: false }))}
          severity={batchToast.ok ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {batchToast.msg}
        </Alert>
      </Snackbar>

      {/* ── Story Seed Dialog ── */}
      <StorySeedDialog
        open={storySeedDialogOpen}
        storySeed={storySeed}
        onClose={() => setStorySeedDialogOpen(false)}
      />
    </Box>
  );
};

export default CharacterPage;
