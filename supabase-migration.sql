-- ============================================
-- Supabase Migration: tenex-reports tasks system
-- Project: rideqnrytpgvxgqbvsyk (1min-dosu-ver4)
-- Created: 2026-03-30
-- ============================================

-- 1. tasks 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  cat text NOT NULL CHECK (cat IN ('A','B','C','D','E','F','G','H','I','K')),
  urgency text DEFAULT 'green' CHECK (urgency IN ('green','yellow','red')),
  importance text DEFAULT '중' CHECK (importance IN ('상','중')),
  status text DEFAULT 'waiting' CHECK (status IN ('done','doing','waiting','delay','pending')),
  assignee text DEFAULT '',
  due_date date,
  note text DEFAULT '',
  sort_order integer DEFAULT 0,
  priority_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. checklists 테이블 (별도 분리 — 개별 항목 CRUD 가능)
CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. agents 테이블 (실장 업무 현황용)
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  icon text DEFAULT '',
  name text DEFAULT '',
  role text DEFAULT '',
  tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. task_history 테이블 (변경 이력)
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text REFERENCES tasks(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_by text DEFAULT 'system',
  changed_at timestamptz DEFAULT now()
);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. 변경 이력 자동 기록 트리거
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_history (task_id, field, old_value, new_value)
    VALUES (NEW.id, 'status', OLD.status, NEW.status);
  END IF;
  IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN
    INSERT INTO task_history (task_id, field, old_value, new_value)
    VALUES (NEW.id, 'assignee', OLD.assignee, NEW.assignee);
  END IF;
  IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
    INSERT INTO task_history (task_id, field, old_value, new_value)
    VALUES (NEW.id, 'urgency', OLD.urgency, NEW.urgency);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_log_changes
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_changes();

-- 7. RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- 읽기: anon + authenticated 모두 허용
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (true);
CREATE POLICY "checklists_select" ON checklists FOR SELECT USING (true);
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "task_history_select" ON task_history FOR SELECT USING (true);

-- 쓰기: service_role만 (API 서버에서 service key 사용)
-- (RLS가 service_role에는 자동 bypass되므로 별도 정책 불필요)

-- 8. 인덱스
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_cat ON tasks(cat);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_checklists_task_id ON checklists(task_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_changed_at ON task_history(changed_at);
