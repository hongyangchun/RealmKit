/**
 * CityPage - 城市管理页面
 * 城市列表 + 创建/编辑城市
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
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CityCard from '../components/city/CityCard';
import CityForm from '../components/city/CityForm';
import type { City } from '../types';
import { useWorldStore } from '../store/worldStore';

const CityPage: React.FC = () => {
  const cities = useWorldStore((s) => s.data.cities);
  const addCity = useWorldStore((s) => s.addCity);
  const updateCity = useWorldStore((s) => s.updateCity);
  const deleteCity = useWorldStore((s) => s.deleteCity);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = () => {
    setEditingCity(undefined);
    setFormOpen(true);
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormOpen(true);
  };

  const handleSave = (cityData: Omit<City, 'id'> | City) => {
    if ('id' in cityData) {
      updateCity(cityData.id, cityData);
    } else {
      addCity(cityData);
    }
  };

  const handleDelete = (city: City) => {
    if (window.confirm(`确定要删除城市「${city.name}」吗？此操作不可撤销。`)) {
      deleteCity(city.id);
    }
  };

  // Filter cities by search
  const filteredCities = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <LocationCityIcon sx={{ fontSize: 36 }} />
            城市管理
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
            管理世界中的城市、要塞、港口
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${cities.length} 座城市`}
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
            新建城市
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="搜索城市..."
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

      {/* City Grid */}
      {filteredCities.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: '#888',
          }}
        >
          <LocationCityIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {searchQuery ? '没有找到匹配的城市' : '还没有城市'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            {searchQuery
              ? '尝试调整搜索关键词'
              : '点击右上角"新建城市"开始创建，或使用世界种子自动生成'}
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
              创建第一座城市
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredCities.map((city) => (
            <Grid item key={city.id} xs={12} sm={6} md={4} lg={3}>
              <CityCard city={city} onEdit={handleEdit} onDelete={handleDelete} />
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

      {/* City Form Dialog */}
      <CityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingCity}
        mode={editingCity ? 'edit' : 'create'}
      />
    </Box>
  );
};

export default CityPage;
