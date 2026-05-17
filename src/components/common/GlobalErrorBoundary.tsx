/**
 * GlobalErrorBoundary - 全局错误边界
 * 兜底所有未预期的渲染崩溃，显示友好的错误页面。
 * 提供「重试」和「重置世界数据」两个恢复选项。
 */
import React, { Component } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetData = () => {
    const confirmed = window.confirm(
      '这将清除所有本地存储的世界数据，此操作不可撤销。\n确定要重置吗？'
    );
    if (confirmed) {
      // IndexedDB 数据库名来自 store 的 persist 配置
      indexedDB.deleteDatabase('zzworld-storage');
      localStorage.removeItem('zzworld-storage');
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#faf3e0',
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(26,35,126,0.12)',
          }}
        >
          <Typography
            sx={{
              fontSize: 56,
              mb: 2,
            }}
          >
            ⚠️
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: '#1a237e',
              mb: 1,
            }}
          >
            页面出了点问题
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(26,35,126,0.5)',
              mb: 0.5,
              maxWidth: 360,
              mx: 'auto',
            }}
          >
            应用遇到了一个未预期的错误。你可以尝试刷新页面，或者重置数据后重新开始。
          </Typography>
          {this.state.error && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'rgba(26,35,126,0.3)',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                mt: 1,
                mb: 2,
                wordBreak: 'break-all',
                maxHeight: 60,
                overflow: 'auto',
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              mt: 3,
            }}
          >
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
              sx={{
                background: '#1a237e',
                textTransform: 'none',
                '&:hover': { background: '#283593' },
              }}
            >
              刷新页面
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteSweepIcon />}
              onClick={this.handleResetData}
              sx={{
                borderColor: '#C0392B',
                color: '#C0392B',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#a93226',
                  background: 'rgba(192,57,43,0.04)',
                },
              }}
            >
              重置数据
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }
}

export default GlobalErrorBoundary;
