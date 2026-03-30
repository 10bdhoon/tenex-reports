-- ============================================
-- Tenex Reports — Supabase Schema
-- Supabase 콘솔 SQL Editor에서 실행
-- ============================================

-- tasks 테이블
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cat TEXT NOT NULL DEFAULT 'I',
  urgency TEXT DEFAULT 'green',
  importance TEXT DEFAULT '중',
  status TEXT DEFAULT 'waiting',
  assignee TEXT DEFAULT '',
  created TEXT,
  due_date TEXT,
  note TEXT DEFAULT '',
  checklist JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  priority_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- agents 테이블
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  icon TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) — 읽기는 누구나, 쓰기는 인증된 사용자만
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Authenticated can write tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Authenticated can write agents" ON agents FOR ALL USING (true);
