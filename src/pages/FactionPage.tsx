/**
 * FactionPage - 势力管理页面
 * 势力列表 + 创建/编辑势力
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Fab,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import FactionCard from '../components/faction/FactionCard';
import FactionForm from '../components/faction/FactionForm';
import type { Faction } from '../types';
import { useWorldStore } from '../store/worldStore';

const FactionPage: React.FC = () => {
  const factions = useWorldStore((s) => s.data.factions);
  const addFaction = useWorldStore((s) => s.addFaction);
  const updateFaction = useWorldStore((s) => s.updateFaction);
  const deleteFaction = useWorldStore((s) => s.deleteFaction);
  const characters = useWorldStore((s) => s.data.characters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = () => {
    setEditingFaction(undefined);
    setFormOpen(true);
  };

  const handleEdit = (faction: Faction) => {
    setEditingFaction(faction);
    setFormOpen(true);
  };

  const handleSave = (factionData: Omit<Faction, 'id'> | Faction) => {
    if ('id' in factionData) {
      updateFaction(factionData.id, factionData);
    } else {
      addFaction(factionData);
    }
  };

  const handleDelete = (faction: Faction) => {
    if (window.confirm(`确定要删除势力「${faction.name}」吗？此操作不可撤销。`)) {
      deleteFaction(faction.id);
    }
  };

  // Filter factions by search
  const filteredFactions = factions.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group characters by faction
  const characterCountByFaction = characters.reduce(
    (acc, char) => {
      acc[char.factionId] = (acc[char.factionId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#1a237e',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <GroupsIcon sx={{ fontSize: 36 }} />
            势力管理
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
            管理世界中的各个势力、国家、派系
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${factions.length} 个势力`}
            sx={{
              background: '#f5f0e6',
              color: '#554433',
              fontWeight: 600,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{
              background: '#1a237e',
              '&:hover': { background: '#0d1642' },
            }}
          >
            新建势力
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="搜索势力..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#888' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 3,
          maxWidth: 400,
          '& .MuiOutlinedInput-root': {
            background: '#fff',
            borderRadius: 2,
          },
        }}
      />

      {/* Faction Grid */}
      {filteredFactions.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: '#888',
          }}
        >
          <GroupsIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {searchQuery ? '没有找到匹配的势力' : '还没有势力'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            {searchQuery
              ? '尝试调整搜索关键词'
              : '点击右上角"新建势力"开始创建'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{
                background: '#1a237e',
                '&:hover': { background: '#0d1642' },
              }}
            >
              创建第一个势力
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredFactions.map((faction) => (
            <Grid item key={faction.id} xs={12} sm={6} md={4} lg={3}>
              <FactionCard faction={faction} onEdit={handleEdit} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleCreate}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#1a237e',
          '&:hover': { background: '#0d1642' },
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Faction Form Dialog */}
      <FactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingFaction}
        mode={editingFaction ? 'edit' : 'create'}
      />
    </Box>
  );
};

export default FactionPage;
