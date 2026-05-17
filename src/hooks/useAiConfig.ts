/**
 * useAiConfig Hook
 * 管理 AI 配置的读写（独立存储，不随世界数据导出）
 */
import { useState, useCallback, useMemo } from 'react';
import type { AiConfig } from '../types';

const STORAGE_KEY = 'zzworld_ai_config';

const DEFAULT_CONFIG: AiConfig = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  maxTokens: 2000,
};

export interface AiConfigHook {
  config: AiConfig;
  isConfigured: boolean;
  saveConfig: (patch: Partial<AiConfig>) => void;
  clearConfig: () => void;
}

function loadConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfigToStorage(config: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useAiConfig(): AiConfigHook {
  const [config, setConfig] = useState<AiConfig>(loadConfig);

  const isConfigured = useMemo(
    () => Boolean(config.apiKey?.trim() && config.apiEndpoint?.trim()),
    [config.apiKey, config.apiEndpoint]
  );

  const saveConfig = useCallback((patch: Partial<AiConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfigToStorage(next);
      return next;
    });
  }, []);

  const clearConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { config, isConfigured, saveConfig, clearConfig };
}
