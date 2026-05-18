-- ============================================================
-- 世界圣典 ZZWorld Chronicle — D1 Database Schema
-- ============================================================

-- 世界数据表：每个用户一个世界
CREATE TABLE IF NOT EXISTS worlds (
  user_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  data TEXT NOT NULL,           -- JSON blob (完整 WorldData)
  updated_at TEXT NOT NULL,     -- ISO 8601
  created_at TEXT NOT NULL
);

-- 编年史表
CREATE TABLE IF NOT EXISTS chronicles (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,           -- JSON blob (ChronicleEntry[])
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 同步元数据
CREATE TABLE IF NOT EXISTS sync_meta (
  user_id TEXT PRIMARY KEY,
  last_sync_at TEXT NOT NULL,
  device_id TEXT
);
