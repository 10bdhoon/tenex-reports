#!/usr/bin/env node
/**
 * project-status.json → Supabase 마이그레이션 스크립트
 *
 * 사용법:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/migrate-to-supabase.js
 *
 * 한 번만 실행하면 됩니다.
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수를 설정하세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  // JSON 파일 읽기
  const jsonPath = path.join(__dirname, "..", "src", "data", "project-status.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  // tasks 마이그레이션
  if (data.tasks && data.tasks.length > 0) {
    const dbTasks = data.tasks.map((t) => ({
      id: t.id,
      title: t.title || "(제목 없음)",
      cat: t.cat || "I",
      urgency: t.urgency || "green",
      importance: t.importance || "중",
      status: t.status || "waiting",
      assignee: t.assignee || "",
      created: t.created || null,
      due_date: t.due || null,
      note: t.desc || "",
      checklist: t.checklist || [],
      sort_order: t.sortOrder || 0,
      priority_order: t.priorityOrder || 0,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("tasks").upsert(dbTasks, { onConflict: "id" });
    if (error) {
      console.error("❌ tasks 마이그레이션 실패:", error.message);
      process.exit(1);
    }
    console.log(`✅ tasks ${dbTasks.length}건 마이그레이션 완료`);
  }

  // agents 마이그레이션
  if (data.agents && data.agents.length > 0) {
    const dbAgents = data.agents.map((a) => ({
      id: a.id,
      icon: a.icon || "",
      name: a.name || "",
      role: a.role || "",
      tasks: a.tasks || [],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("agents").upsert(dbAgents, { onConflict: "id" });
    if (error) {
      console.error("❌ agents 마이그레이션 실패:", error.message);
      process.exit(1);
    }
    console.log(`✅ agents ${dbAgents.length}건 마이그레이션 완료`);
  }

  console.log("🎉 마이그레이션 완료!");
}

migrate().catch((err) => {
  console.error("❌ 마이그레이션 에러:", err);
  process.exit(1);
});
