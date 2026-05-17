/**
 * SearchBar - 全局搜索框 + 下拉结果
 */
import React, { useRef, useEffect } from 'react';
import {
  Box,
  InputBase,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  ClickAwayListener,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import GroupsIcon from '@mui/icons-material/Groups';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../../store/searchStore';
import { useSearch } from '../../hooks/useSearch';
import type { SearchResult } from '../../types';

const TYPE_ICONS: Record<SearchResult['type'], React.ReactNode> = {
  character: <PersonIcon sx={{ fontSize: 18 }} />,
  city: <LocationCityIcon sx={{ fontSize: 18 }} />,
  event: <EventIcon sx={{ fontSize: 18 }} />,
  mapPin: <PlaceIcon sx={{ fontSize: 18 }} />,
  faction: <GroupsIcon sx={{ fontSize: 18 }} />,
};

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  character: '人物',
  city: '城市',
  event: '事件',
  mapPin: '地点',
  faction: '势力',
};

const SearchBar: React.FC = () => {
  const { query, isOpen, setQuery, setOpen, reset } = useSearchStore();
  const results = useSearch(query);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    reset();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            background: 'rgba(250,243,224,0.15)',
            borderRadius: 2,
            border: '1px solid rgba(250,243,224,0.3)',
          }}
          elevation={0}
        >
          <SearchIcon sx={{ color: 'rgba(250,243,224,0.7)', mr: 1, fontSize: 18 }} />
          <InputBase
            inputRef={inputRef}
            placeholder="搜索人物、事件、地点… (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setOpen(true)}
            sx={{
              color: '#faf3e0',
              fontSize: '0.85rem',
              width: '100%',
              '& input::placeholder': { color: 'rgba(250,243,224,0.5)' },
            }}
          />
        </Paper>

        {isOpen && results.length > 0 && (
          <Paper
            sx={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              zIndex: 9999,
              maxHeight: 360,
              overflow: 'auto',
              border: '1px solid rgba(26,35,126,0.2)',
              boxShadow: '0 4px 20px rgba(26,35,126,0.15)',
            }}
          >
            <List dense disablePadding>
              {results.slice(0, 10).map((r) => (
                <ListItem
                  key={`${r.type}-${r.id}`}
                  button
                  onClick={() => handleSelect(r)}
                  sx={{
                    '&:hover': { background: 'rgba(26,35,126,0.06)' },
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <ListItemIcon
                    sx={{ minWidth: 32, color: '#1a237e' }}
                  >
                    {TYPE_ICONS[r.type]}
                  </ListItemIcon>
                  <ListItemText
                    primary={r.label}
                    secondary={r.highlight}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      background: 'rgba(26,35,126,0.1)',
                      color: '#1a237e',
                      fontSize: '0.7rem',
                      ml: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {TYPE_LABELS[r.type]}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBar;
