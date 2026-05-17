/**
 * AvatarUploader - 头像上传 + 自动生成组件
 * 支持：图片上传、自动生成头像、预览、压缩至 200x200 base64
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Avatar,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { generateAvatar } from './AvatarGenerator';

interface AvatarUploaderProps {
  currentAvatar?: string;
  onAvatarChange: (base64: string) => void;
  /** 角色名字（用于自动生成头像种子） */
  characterName?: string;
  /** 势力颜色（自动生成头像主色调） */
  factionColor?: string;
}

const MAX_SIZE = 200;

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  onAvatarChange,
  characterName = '',
  factionColor = '#8B4513',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // 变体计数器：每次点击随机生成时递增，产生不同图案
  const [variant, setVariant] = useState(0);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = (height * MAX_SIZE) / width;
              width = MAX_SIZE;
            } else {
              width = (width * MAX_SIZE) / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          onAvatarChange(base64);
        };
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        } else {
          return;
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onAvatarChange]
  );

  const handleAutoGenerate = useCallback(() => {
    const name = characterName.trim();
    if (!name) return;
    // 使用当前 variant 作为 salt，然后递增，保证每次点击都不同
    const salt = variant;
    setVariant((v) => v + 1);
    const avatar = generateAvatar(name, factionColor, 200, salt);
    onAvatarChange(avatar);
  }, [characterName, factionColor, onAvatarChange, variant]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Avatar
        src={currentAvatar}
        sx={{
          width: 80,
          height: 80,
          border: '2px solid rgba(26,35,126,0.3)',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
      />
      <Typography variant="caption" sx={{ color: '#888' }}>
        点击头像上传图片
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          startIcon={<CloudUploadIcon />}
          onClick={() => inputRef.current?.click()}
          variant="outlined"
        >
          上传
        </Button>
        <Button
          size="small"
          startIcon={<ShuffleIcon />}
          onClick={handleAutoGenerate}
          variant="outlined"
          disabled={!characterName.trim()}
          sx={{
            borderColor: '#c9a84c',
            color: '#a08030',
            '&:hover': { borderColor: '#a08030', bgcolor: 'rgba(201,168,76,0.08)' },
          }}
        >
          随机生成
        </Button>
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Box>
  );
};

export default AvatarUploader;
