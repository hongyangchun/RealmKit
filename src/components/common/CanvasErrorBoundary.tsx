/**
 * CanvasErrorBoundary - Canvas 渲染错误边界
 * 包裹 GridCanvas / TimelineCanvas 等 Canvas 组件，
 * 渲染崩溃时显示内联降级 UI 而非白屏整个页面。
 */
import React, { Component } from 'react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  /** 降级 UI 显示的标题 */
  label?: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[CanvasErrorBoundary${this.props.label ? ` - ${this.props.label}` : ''}] Error:`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f0e8',
          color: 'rgba(26,35,126,0.4)',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: 32, mb: 0.5 }}>🗺</Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(26,35,126,0.5)', fontFamily: "'LXGW WenKai TC', serif" }}
        >
          {this.props.label ?? '画布'}渲染遇到问题
        </Typography>
        <Tooltip title="重试渲染">
          <IconButton
            size="small"
            onClick={this.handleRetry}
            sx={{
              color: '#1a237e',
              background: 'rgba(26,35,126,0.06)',
              '&:hover': { background: 'rgba(26,35,126,0.12)' },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }
}

export default CanvasErrorBoundary;
