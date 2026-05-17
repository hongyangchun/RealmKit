/**
 * useDirtyCheck - 表单脏检查 hook
 *
 * 跟踪表单是否有未保存的修改，并在取消/关闭前弹确认。
 *
 * 用法（在表单组件内部）：
 *   const { isDirty, markDirty, resetDirty, handleCancel } = useDirtyCheck(onCancel);
 *   // 任何字段变更时调用 markDirty()
 *   // 保存成功后调用 resetDirty()
 *   // 取消按钮用 handleCancel 代替 onCancel
 */
import { useState, useCallback } from 'react';

export interface DirtyHandle {
  isDirty: boolean;
  markDirty: () => void;
  resetDirty: () => void;
  /** 包装后的 onCancel：脏时弹确认，不脏时直接关闭 */
  handleCancel: () => void;
}

export function useDirtyCheck(onCancel: () => void): DirtyHandle {
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const resetDirty = useCallback(() => setIsDirty(false), []);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('表单有未保存的修改，确定要关闭吗？');
      if (!ok) return;
    }
    onCancel();
  }, [isDirty, onCancel]);

  return { isDirty, markDirty, resetDirty, handleCancel };
}
