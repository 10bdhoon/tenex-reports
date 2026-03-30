/**
 * JSON → Supabase 마이그레이션 스크립트
 * 실행: npx tsx scripts/migrate-json-to-supabase.ts
 *
 * 환경변수 필요:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface JsonTask {
  id: string;
  title: string;
  cat: string;
  urgency: string;
  importance: string;
  status: string;
  assignee: string;
  due: string | null;
  dueDate?: string;
  desc: string;
  checklist: { text: string; done: boolean }[];
  memo: string;
  note?: string;
  sortOrder?: number;
  priorityOrder?: number;
}

async function migrate() {
  // 1. JSON 읽기
  const jsonPath = path.join(__dirname, "..", "src", "data", "project-status.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  console.log(`📄 JSON 로드: ${data.tasks.length}개 태스크`);

  // 2. tasks 마이그레이션 (checklist은 jsonb로 포함)
  const dbTasks = data.tasks.map((t: JsonTask) => ({
    id: t.id,
    title: t.title,
    cat: t.cat,
    urgency: t.urgency,
    importance: t.importance,
    status: t.status,
    assignee: t.assignee || "",
    due_date: t.due || t.dueDate || null,
    note: t.desc || t.note || "",
    checklist: t.checklist || [],
    sort_order: t.sortOrder ?? 0,
    priority_order: t.priorityOrder ?? 0,
  }));

  const { error: tasksError } = await supabase
    .from("tasks")
    .upsert(dbTasks, { onConflict: "id" });

  if (tasksError) {
    console.error("❌ tasks upsert 실패:", tasksError);
    process.exit(1);
  }
  console.log(`✅ tasks: ${dbTasks.length}개 upsert 완료`);

  // 3. agents 마이그레이션
  const agents = [
    {
      id: "개실장",
      icon: "🔧",
      name: "개실장",
      role: "개발실 총괄",
      tasks: [
        { id: "a1", name: "모사모 강의 통합", status: "done" },
        { id: "a2", name: "앱 탭 UI 통합", status: "doing" },
        { id: "a3", name: "SPA 카테고리 구조", status: "doing" },
        { id: "a4", name: "정품등록 + 메타픽셀", status: "doing" },
        { id: "a5", name: "tenex-reports UI 리뉴얼", status: "done" },
      ],
    },
    {
      id: "마실장",
      icon: "📣",
      name: "마실장",
      role: "마케팅실 총괄",
      tasks: [
        { id: "b1", name: "Mixpanel 시각화 대시보드", status: "doing" },
        { id: "b2", name: "메타 광고 성과 리포트", status: "waiting" },
        { id: "b3", name: "CRM 알림톡 자동화", status: "waiting" },
      ],
    },
    {
      id: "고실장",
      icon: "🎯",
      name: "고실장",
      role: "고객성공 총괄",
      tasks: [
        { id: "c1", name: "CS 기획안", status: "delay" },
        { id: "c2", name: "VOC 분석 리포트", status: "waiting" },
      ],
    },
    {
      id: "콘실장",
      icon: "🎬",
      name: "콘실장",
      role: "콘텐츠 총괄",
      tasks: [
        { id: "d1", name: "YouTube 댓글 자동화", status: "doing" },
        { id: "d2", name: "콘텐츠 기획 캘린더", status: "waiting" },
      ],
    },
  ];

  const { error: agentsError } = await supabase
    .from("agents")
    .upsert(agents, { onConflict: "id" });

  if (agentsError) {
    console.error("❌ agents upsert 실패:", agentsError);
    process.exit(1);
  }
  console.log(`✅ agents: ${agents.length}개 upsert 완료`);

  // 4. 검증
  const { data: vTasks } = await supabase.from("tasks").select("id");
  const { data: vAgents } = await supabase.from("agents").select("id");

  console.log(`\n🔍 검증:`);
  console.log(`   tasks: ${vTasks?.length}개 (원본: ${data.tasks.length}개)`);
  console.log(`   agents: ${vAgents?.length}개 (원본: ${agents.length}개)`);

  if (vTasks?.length === data.tasks.length) {
    console.log(`\n✅ 마이그레이션 완료!`);
  } else {
    console.log(`\n⚠️ 개수 불일치 — 확인 필요`);
  }
}

migrate().catch(console.error);
