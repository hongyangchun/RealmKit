/**
 * Backup Tracker
 * 追踪上次备份时间，提醒用户定期导出
 */
const BACKUP_TIME_KEY = 'zzworld_last_backup';
const REMIND_THRESHOLD_DAYS = 7;

export function markBackupTime(): void {
  try {
    localStorage.setItem(BACKUP_TIME_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function getLastBackupTime(): string | null {
  try {
    return localStorage.getItem(BACKUP_TIME_KEY);
  } catch {
    return null;
  }
}

export function getDaysSinceLastBackup(): number | null {
  const last = getLastBackupTime();
  if (!last) return null;
  try {
    const diff = Date.now() - new Date(last).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function shouldRemindBackup(): boolean {
  const days = getDaysSinceLastBackup();
  if (days === null) return false; // 从未备份不提醒（新用户）
  return days >= REMIND_THRESHOLD_DAYS;
}

export function formatLastBackupTime(): string {
  const last = getLastBackupTime();
  if (!last) return '从未备份';
  try {
    const days = getDaysSinceLastBackup();
    if (days === 0) return '今天已备份';
    if (days === 1) return '昨天已备份';
    if (days !== null && days < 30) return `${days} 天前备份`;
    return new Date(last).toLocaleDateString('zh-CN');
  } catch {
    return '未知';
  }
}
