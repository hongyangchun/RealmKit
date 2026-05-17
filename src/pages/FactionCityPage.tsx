/**
 * FactionCityPage - 势力疆域管理页面
 * 手风琴模式：势力卡片展开显示子城市列表
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactionCard from '../components/faction/FactionCard';
import FactionForm from '../components/faction/FactionForm';
import CityForm from '../components/city/CityForm';
import type { Faction, City } from '../types';
import { useWorldStore } from '../store/worldStore';
import { useSearchParams } from 'react-router-dom';

const FactionCityPage: React.FC = () => {
  const factions = useWorldStore((s) => s.data.factions);
  const cities = useWorldStore((s) => s.data.cities);
  const addFaction = useWorldStore((s) => s.addFaction);
  const updateFaction = useWorldStore((s) => s.updateFaction);
  const deleteFaction = useWorldStore((s) => s.deleteFaction);
  const addCity = useWorldStore((s) => s.addCity);
  const updateCity = useWorldStore((s) => s.updateCity);
  const deleteCity = useWorldStore((s) => s.deleteCity);

  // 势力表单
  const [factionFormOpen, setFactionFormOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | undefined>();

  // 城市表单
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | undefined>();
  const [cityFormFactionId, setCityFormFactionId] = useState<string>('');

  // 展开状态（默认全部展开；URL 参数 expand 指定单独展开某个势力）
  const [searchParams] = useSearchParams();
  const expandParam = searchParams.get('expand');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (expandParam) return new Set([expandParam]);
    return new Set(factions.map((f) => f.id));
  });

  // 搜索
  const [searchQuery, setSearchQuery] = useState('');

  // ========== 势力操作 ==========

  const handleCreateFaction = () => {
    setEditingFaction(undefined);
    setFactionFormOpen(true);
  };

  const handleEditFaction = (faction: Faction) => {
    setEditingFaction(faction);
    setFactionFormOpen(true);
  };

  const handleSaveFaction = (factionData: Omit<Faction, 'id'> | Faction) => {
    if ('id' in factionData) {
      updateFaction(factionData.id, factionData);
    } else {
      addFaction(factionData);
    }
  };

  const handleDeleteFaction = (faction: Faction) => {
    if (window.confirm(`确定要删除势力「${faction.name}」吗？该势力下的城市将失去归属。此操作不可撤销。`)) {
      deleteFaction(faction.id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(faction.id);
        return next;
      });
    }
  };

  const handleToggleExpand = (factionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(factionId)) {
        next.delete(factionId);
      } else {
        next.add(factionId);
      }
      return next;
    });
  };

  // ========== 城市操作 ==========

  const handleAddCity = (factionId: string) => {
    setCityFormFactionId(factionId);
    setEditingCity(undefined);
    setCityFormOpen(true);
  };

  const handleEditCity = (city: City) => {
    setEditingCity(city);
    setCityFormFactionId(city.factionId);
    setCityFormOpen(true);
  };

  const handleSaveCity = (cityData: Omit<City, 'id'> | City) => {
    if ('id' in cityData) {
      updateCity(cityData.id, cityData);
    } else {
      addCity(cityData);
    }
  };

  const handleDeleteCity = (city: City) => {
    if (window.confirm(`确定要删除城市「${city.name}」吗？此操作不可撤销。`)) {
      deleteCity(city.id);
    }
  };

  // ========== 搜索过滤 ==========

  const lowerQuery = searchQuery.toLowerCase();

  // 每个势力下匹配到的城市ID集合
  const matchedCityIdsByFaction = useMemo(() => {
    if (!lowerQuery) return {} as Record<string, Set<string>>;
    const map: Record<string, Set<string>> = {};
    cities.forEach((c) => {
      if (
        c.name.toLowerCase().includes(lowerQuery) ||
        (c.description ?? '').toLowerCase().includes(lowerQuery)
      ) {
        if (!map[c.factionId]) map[c.factionId] = new Set();
        map[c.factionId].add(c.id);
      }
    });
    return map;
  }, [cities, lowerQuery]);

  const filteredFactions = useMemo(() => {
    if (!lowerQuery) return factions;
    return factions.filter((f) => {
      // 势力自身匹配
      const selfMatch =
        f.name.toLowerCase().includes(lowerQuery) ||
        (f.description ?? '').toLowerCase().includes(lowerQuery);
      // 势力下有城市匹配
      const cityMatch = (matchedCityIdsByFaction[f.id]?.size ?? 0) > 0;
      return selfMatch || cityMatch;
    });
  }, [factions, lowerQuery, matchedCityIdsByFaction]);

  // 搜索时自动展开包含匹配城市的势力
  useEffect(() => {
    if (!lowerQuery) return;
    const factionsWithCityMatches = filteredFactions.filter(
      (f) => (matchedCityIdsByFaction[f.id]?.size ?? 0) > 0
    );
    if (factionsWithCityMatches.length === 1) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(factionsWithCityMatches[0].id);
        return next;
      });
    }
  }, [lowerQuery, filteredFactions, matchedCityIdsByFaction]);

  // 匹配结果统计
  const matchedCityCount = useMemo(() => {
    let count = 0;
    Object.values(matchedCityIdsByFaction).forEach((set) => {
      count += set.size;
    });
    return count;
  }, [matchedCityIdsByFaction]);

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
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <AccountBalanceIcon sx={{ fontSize: 28, color: '#1a237e' }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#1a237e',
            }}
          >
            势力疆域
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="搜索势力或城市..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#888', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 200,
            maxWidth: 320,
            flex: '1 1 auto',
            '& .MuiOutlinedInput-root': {
              background: '#fff',
              borderRadius: 2,
              fontSize: '0.875rem',
            },
          }}
        />

        <Box sx={{ flex: 1 }} />

        {/* Stats */}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {searchQuery
            ? `${filteredFactions.length} 个势力${matchedCityCount > 0 ? ` · ${matchedCityCount} 座城市` : ''}`
            : `${factions.length} 个势力 · ${cities.length} 座城市`
          }
        </Typography>

        {/* New faction button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={handleCreateFaction}
          sx={{
            background: '#1a237e',
            '&:hover': { background: '#0d1642' },
            textTransform: 'none',
          }}
        >
          新建势力
        </Button>
      </Box>

      {/* ── Content Area ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {filteredFactions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              color: '#888',
            }}
          >
            <AccountBalanceIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {searchQuery ? '没有找到匹配的结果' : '还没有势力'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {searchQuery
                ? '尝试调整搜索关键词'
                : '点击右上角「新建势力」开始创建'}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateFaction}
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
            {filteredFactions.map((faction) => {
              const hasCityMatch = (matchedCityIdsByFaction[faction.id]?.size ?? 0) > 0;
              return (
                <Grid item key={faction.id} xs={12} sm={6} md={4}>
                  <FactionCard
                    faction={faction}
                    expanded={expandedIds.has(faction.id) || (hasCityMatch && !!lowerQuery)}
                    onEdit={handleEditFaction}
                    onDelete={handleDeleteFaction}
                    onToggleExpand={handleToggleExpand}
                    onEditCity={handleEditCity}
                    onDeleteCity={handleDeleteCity}
                    onAddCity={handleAddCity}
                    highlightedCityIds={matchedCityIdsByFaction[faction.id]}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleCreateFaction}
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
        open={factionFormOpen}
        onClose={() => setFactionFormOpen(false)}
        onSave={handleSaveFaction}
        initialData={editingFaction}
        mode={editingFaction ? 'edit' : 'create'}
      />

      {/* City Form Dialog */}
      <CityForm
        open={cityFormOpen}
        onClose={() => setCityFormOpen(false)}
        onSave={handleSaveCity}
        initialData={
          editingCity ?? {
            name: '',
            factionId: cityFormFactionId,
            gridX: 50,
            gridY: 50,
            type: 'village',
            eventIds: [],
          }
        }
        mode={editingCity ? 'edit' : 'create'}
      />
    </Box>
  );
};

export default FactionCityPage;
