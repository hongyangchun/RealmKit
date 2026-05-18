/**
 * useSFX - 组件级音效触发 Hook
 *
 * 用法：
 * ```tsx
 * const sfx = useSFX();
 * <Button onClick={() => sfx.play('ui/click')}>保存</Button>
 * ```
 *
 * 提供：
 * - play(eventId): 播放指定音效
 * - playClick(): 快捷方法，播放 ui/click
 * - playSuccess(): 快捷方法，播放 ui/success
 * - playError(): 快捷方法，播放 ui/error
 */
import { useCallback } from 'react';
import { audioManager } from '../services/audio/AudioManager';

export function useSFX() {
  const play = useCallback((eventId: string) => {
    audioManager.playSFX(eventId);
  }, []);

  const playClick = useCallback(() => {
    audioManager.playSFX('ui/click');
  }, []);

  const playHover = useCallback(() => {
    audioManager.playSFX('ui/hover');
  }, []);

  const playSuccess = useCallback(() => {
    audioManager.playSFX('ui/success');
  }, []);

  const playError = useCallback(() => {
    audioManager.playSFX('ui/error');
  }, []);

  const playDelete = useCallback(() => {
    audioManager.playSFX('ui/delete');
  }, []);

  const playDialogOpen = useCallback(() => {
    audioManager.playSFX('ui/dialog_open');
  }, []);

  const playDialogClose = useCallback(() => {
    audioManager.playSFX('ui/dialog_close');
  }, []);

  const playDrawerOpen = useCallback(() => {
    audioManager.playSFX('ui/drawer_open');
  }, []);

  const playDrawerClose = useCallback(() => {
    audioManager.playSFX('ui/drawer_close');
  }, []);

  const playTabSwitch = useCallback(() => {
    audioManager.playSFX('ui/tab_switch');
  }, []);

  return {
    play,
    playClick,
    playHover,
    playSuccess,
    playError,
    playDelete,
    playDialogOpen,
    playDialogClose,
    playDrawerOpen,
    playDrawerClose,
    playTabSwitch,
  };
}
