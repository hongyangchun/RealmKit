/**
 * CharacterForm - 人物新建/编辑表单
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  IconButton,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Character, Skill } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import AvatarUploader from './AvatarUploader';
import { generateAvatar } from './AvatarGenerator';
import { useDirtyCheck } from '../../hooks/useDirtyCheck';

interface CharacterFormProps {
  initialData?: Character;
  onSave: (data: Omit<Character, 'id'>) => void;
  onCancel: () => void;
}

const EMPTY_SKILL: Skill = { name: '', description: '', type: 'active' };

const CharacterForm: React.FC<CharacterFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const factions = useWorldStore((s) => s.data.factions);
  const { markDirty, resetDirty, handleCancel } = useDirtyCheck(onCancel);

  const [name, setNameRaw] = useState('');
  const [factionId, setFactionIdRaw] = useState(factions[0]?.id ?? '');
  const [avatar, setAvatarRaw] = useState<string | undefined>();
  const [birthYear, setBirthYearRaw] = useState<number | string>('');
  const [deathYear, setDeathYearRaw] = useState<number | string>('');
  const [title, setTitleRaw] = useState('');
  const [skills, setSkillsRaw] = useState<Skill[]>([]);
  const [traitsInput, setTraitsInputRaw] = useState('');
  const [bio, setBioRaw] = useState('');

  // 包装 setter：值变化时自动标记 dirty
  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };

  const setName = d(setNameRaw);
  const setFactionId = d(setFactionIdRaw);
  const setAvatar = d(setAvatarRaw);
  const setBirthYear = d(setBirthYearRaw);
  const setDeathYear = d(setDeathYearRaw);
  const setTitle = d(setTitleRaw);
  const setSkills = d(setSkillsRaw);
  const setTraitsInput = d(setTraitsInputRaw);
  const setBio = d(setBioRaw);

  // 当前势力颜色
  const factionColor = useMemo(
    () => factions.find((f) => f.id === factionId)?.color ?? '#8B4513',
    [factions, factionId]
  );

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setFactionId(initialData.factionId);
      setAvatar(initialData.avatar);
      setBirthYear(initialData.birthYear ?? '');
      setDeathYear(initialData.deathYear ?? '');
      setTitle(initialData.title ?? '');
      setSkills(initialData.skills.length > 0 ? initialData.skills : [{ ...EMPTY_SKILL }]);
      setTraitsInput(initialData.traits.join(', '));
      setBio(initialData.bio);
    }
    // 初始化数据触发的 markDirty 需要清除
    resetDirty();
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const traits = traitsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // 新建角色且没有头像时，自动生成
    const finalAvatar = avatar || (
      !initialData ? generateAvatar(name.trim(), factionColor) : undefined
    );

    onSave({
      name: name.trim(),
      factionId,
      avatar: finalAvatar,
      birthYear: typeof birthYear === 'string' ? (birthYear === '' ? undefined : Number(birthYear)) : birthYear,
      deathYear: typeof deathYear === 'string' ? (deathYear === '' ? undefined : Number(deathYear)) : deathYear,
      title: title.trim() || undefined,
      skills: skills.filter((s) => s.name.trim()),
      traits,
      bio: bio.trim(),
      relatedEventIds: initialData?.relatedEventIds ?? [],
    });
    resetDirty();
  };

  const updateSkill = (index: number, patch: Partial<Skill>) => {
    setSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const addSkill = () => setSkills((prev) => [...prev, { ...EMPTY_SKILL }]);

  const removeSkill = (index: number) =>
    setSkills((prev) => prev.filter((_, i) => i !== index));

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogContent sx={{ pt: 1 }}>
        {/* Avatar */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <AvatarUploader
            currentAvatar={avatar}
            onAvatarChange={setAvatar}
            characterName={name}
            factionColor={factionColor}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="职衔"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
              placeholder="如：大将军、丞相"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="所属势力/国家"
              value={factionId}
              onChange={(e) => setFactionId(e.target.value)}
              select
              fullWidth
              required
              size="small"
              SelectProps={{
                MenuProps: { sx: { zIndex: 10001 }, disablePortal: false },
              }}
            >
              {factions.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="出生年份"
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="去世年份（留空=在世）"
              type="number"
              value={deathYear}
              onChange={(e) => setDeathYear(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="传记"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Skills */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>技能</Typography>
            {skills.map((skill, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  label="技能名"
                  value={skill.name}
                  onChange={(e) => updateSkill(idx, { name: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  select
                  label="类型"
                  value={skill.type}
                  onChange={(e) =>
                    updateSkill(idx, { type: e.target.value as Skill['type'] })
                  }
                  size="small"
                  sx={{ width: 100 }}
                  SelectProps={{
                    MenuProps: { sx: { zIndex: 10001 }, disablePortal: false },
                  }}
                >
                  <MenuItem value="active">主动</MenuItem>
                  <MenuItem value="passive">被动</MenuItem>
                  <MenuItem value="special">特殊</MenuItem>
                </TextField>
                <IconButton
                  onClick={() => removeSkill(idx)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} size="small" onClick={addSkill}>
              添加技能
            </Button>
          </Grid>

          {/* Traits */}
          <Grid item xs={12}>
            <TextField
              label="特质标签（逗号分隔）"
              value={traitsInput}
              onChange={(e) => setTraitsInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="如：勇敢、智谋、忠义"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel}>取消</Button>
        <Button variant="contained" type="submit" sx={{ background: '#1a237e' }}>
          保存
        </Button>
      </DialogActions>
    </Box>
  );
};

export default CharacterForm;
