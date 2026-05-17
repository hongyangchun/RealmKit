/**
 * StatCard - 统计数字卡片
 */
import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = '#1a237e',
}) => {
  return (
    <Card
      sx={{
        background: '#fffef8',
        borderLeft: `4px solid ${color}`,
        borderRadius: '0 12px 12px 0',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: 24,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a237e', lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
