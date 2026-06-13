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
  Slider,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Character, Skill, CardRarity } from '../../types';
import { calcRarityForCharacter, RARITY_LABEL } from '../../utils/rarity';
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
  const [portrait, setPortraitRaw] = useState<string | undefined>();  // 全身立绘
  const [birthYear, setBirthYearRaw] = useState<number | string>('');
  const [deathYear, setDeathYearRaw] = useState<number | string>('');
  const [title, setTitleRaw] = useState('');           // 职衔
  const [nickname, setNicknameRaw] = useState('');     // 称号
  const [hp, setHpRaw] = useState<number>(4);         // 体力值
  const [cardNumber, setCardNumberRaw] = useState(''); // 卡牌编号
  const [rarity, setRarityRaw] = useState<CardRarity>('common'); // 稀有度
  const [skills, setSkillsRaw] = useState<Skill[]>([]);
  const [traitsInput, setTraitsInputRaw] = useState('');
  const [bio, setBioRaw] = useState('');

  // 包装 setter：值变化时自动标记 dirty
  const d = <T,>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => { fn(v); markDirty(); };

  const setName = d(setNameRaw);
  const setFactionId = d(setFactionIdRaw);
  const setAvatar = d(setAvatarRaw);
  const setPortrait = d(setPortraitRaw);
  const setBirthYear = d(setBirthYearRaw);
  const setDeathYear = d(setDeathYearRaw);
  const setTitle = d(setTitleRaw);
  const setNickname = d(setNicknameRaw);
  const setHp = d(setHpRaw);
  const setCardNumber = d(setCardNumberRaw);
  const setRarity = d(setRarityRaw);
  const setSkills = d(setSkillsRaw);
  const setTraitsInput = d(setTraitsInputRaw);
  const setBio = d(setBioRaw);

  // 当前势力颜色
  const factionColor = useMemo(
    () => factions.find((f) => f.id === factionId)?.color ?? '#8B4513',
    [factions, factionId]
  );

  // 自动计算推荐稀有度
  const autoRarity = useMemo(() => {
    return calcRarityForCharacter({
      skills: skills.filter((s) => s.name.trim()),
      bio: bio.trim(),
      relatedEventIds: initialData?.relatedEventIds ?? [],
    });
  }, [skills, bio, initialData?.relatedEventIds]);
  const rarityMismatch = autoRarity !== rarity;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setFactionId(initialData.factionId);
      setAvatar(initialData.avatar);
      setPortrait(initialData.portrait ?? '');
      setBirthYear(initialData.birthYear ?? '');
      setDeathYear(initialData.deathYear ?? '');
      setTitle(initialData.title ?? '');
      setNickname(initialData.nickname ?? '');
      setHp(initialData.hp ?? 4);
      setCardNumber(initialData.cardNumber ?? '');
      setRarity(initialData.rarity ?? 'common');
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
      portrait: portrait?.trim() || undefined,
      birthYear: typeof birthYear === 'string' ? (birthYear === '' ? undefined : Number(birthYear)) : birthYear,
      deathYear: typeof deathYear === 'string' ? (deathYear === '' ? undefined : Number(deathYear)) : deathYear,
      title: title.trim() || undefined,
      nickname: nickname.trim() || undefined,
      hp,
      cardNumber: cardNumber.trim() || undefined,
      rarity,
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
          <Grid item xs={12} sm={6}>
            <TextField
              label="称号"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              fullWidth
              size="small"
              placeholder="如：美髯公、卧龙"
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
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">体力值 (HP)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
              <Slider
                value={hp}
                onChange={(_, v) => setHp(v as number)}
                min={1}
                max={8}
                step={1}
                marks
                sx={{ flex: 1 }}
              />
              <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                {hp}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>稀有度</InputLabel>
              <Select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as CardRarity)}
                label="稀有度"
              >
                <MenuItem value="common">普通 (Common)</MenuItem>
                <MenuItem value="rare">稀有 (Rare)</MenuItem>
                <MenuItem value="epic">史诗 (Epic)</MenuItem>
                <MenuItem value="legendary">传说 (Legendary)</MenuItem>
              </Select>
            </FormControl>
            {rarityMismatch && (
              <Typography variant="caption" sx={{ color: 'warning.main', mt: 0.3, display: 'block' }}>
                系统推荐: {RARITY_LABEL[autoRarity]}
              </Typography>
            )}
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
          <Grid item xs={12}>
            <TextField
              label="立绘 URL（全身照）"
              value={portrait}
              onChange={(e) => setPortrait(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://... (区别于头像的全身立绘)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="卡牌编号"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              fullWidth
              size="small"
              placeholder="如：WEI 001、SHU 023"
            />
          </Grid>

          {/* Skills */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>技能</Typography>
            {skills.map((skill, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.8,
                  mb: 1.2,
                  p: 1,
                  border: '1px dashed rgba(26,35,126,0.18)',
                  borderRadius: 1,
                  background: 'rgba(250,243,224,0.4)',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                    aria-label="删除技能"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <TextField
                  label="技能描述（选填）"
                  value={skill.description ?? ''}
                  onChange={(e) => updateSkill(idx, { description: e.target.value })}
                  size="small"
                  multiline
                  minRows={1}
                  maxRows={4}
                  fullWidth
                  placeholder="如：每回合限一次，可令一名角色摸两张牌。"
                />
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
