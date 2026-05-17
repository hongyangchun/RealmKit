/**
 * TimelinePage - 历史时间轴页面
 */
import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  IconButton,
  Button,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import TimelineCanvas from '../components/timeline/TimelineCanvas';
import TimelineFilterBar from '../components/timeline/TimelineFilterBar';
import EventForm from '../components/timeline/EventForm';
import CanvasErrorBoundary from '../components/common/CanvasErrorBoundary';
import { useWorldStore } from '../store/worldStore';
import type { HistoryEvent } from '../types';
import type { TimelineFilter } from '../components/timeline/TimelineFilterBar';

const TimelinePage: React.FC = () => {
  const addEvent = useWorldStore((s) => s.addEvent);
  const updateEvent = useWorldStore((s) => s.updateEvent);
  const deleteEvent = useWorldStore((s) => s.deleteEvent);
  const characters = useWorldStore((s) => s.data.characters);
  const factions = useWorldStore((s) => s.data.factions);

  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<TimelineFilter>({
    factionId: '',
    characterId: '',
    yearFrom: '',
    yearTo: '',
  });

  const handleEventClick = (event: HistoryEvent) => {
    setSelectedEvent(event);
    setShowEditForm(true);
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setShowCreateForm(true);
  };

  const handleSave = (data: Omit<HistoryEvent, 'id'>) => {
    if (selectedEvent) {
      // Update existing event
      updateEvent(selectedEvent.id, data as Partial<HistoryEvent>);
      setShowEditForm(false);
      setSelectedEvent(null);
    } else {
      // Create new event
      addEvent(data);
      setShowCreateForm(false);
    }
  };

  const handleDelete = () => {
    if (selectedEvent && window.confirm(`确定要删除事件「${selectedEvent.title}」吗？此操作不可撤销。`)) {
      deleteEvent(selectedEvent.id);
      setShowEditForm(false);
      setSelectedEvent(null);
    }
  };

  const handleFormCancel = () => {
    setShowEditForm(false);
    setShowCreateForm(false);
    setSelectedEvent(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 筛选栏 */}
      <TimelineFilterBar
        filter={filter}
        onChange={setFilter}
        factions={factions}
        characters={characters}
      />

      <CanvasErrorBoundary label="历史时间轴">
        <TimelineCanvas onEventClick={handleEventClick} filter={filter} />
      </CanvasErrorBoundary>

      {/* 编辑事件对话框 */}
      <Dialog
        open={showEditForm}
        onClose={handleFormCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: "'LXGW WenKai TC', serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>编辑事件</Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              color="error"
              size="small"
            >
              删除
            </Button>
            <IconButton onClick={handleFormCancel} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedEvent && (
          <EventForm
            initialData={selectedEvent}
            onSave={handleSave}
            onCancel={handleFormCancel}
          />
        )}
      </Dialog>

      {/* 新建事件对话框 */}
      <Dialog
        open={showCreateForm}
        onClose={handleFormCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: "'LXGW WenKai TC', serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>新建事件</Box>
          <IconButton onClick={handleFormCancel} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <EventForm
          onSave={handleSave}
          onCancel={handleFormCancel}
          defaultFactionId={factions[0]?.id}
          defaultCharacterId={characters[0]?.id}
        />
      </Dialog>
    </Box>
  );
};

export default TimelinePage;
