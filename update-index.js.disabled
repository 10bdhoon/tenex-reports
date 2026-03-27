#!/usr/bin/env node
/**
 * update-index.js — A~Z 업무별 구조로 index.html 자동 생성
 * launchd(com.taehoon.tenex-reports-deploy)가 10분마다 실행
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const INDEX_FILE = path.join(SRC_DIR, 'index.html');

const CATS = [
  { key: 'A', label: 'A 📦 제품',        color: '#f0883e', bg: 'rgba(240,136,62,0.08)',  border: 'rgba(240,136,62,0.2)' },
  { key: 'B', label: 'B 🎬 콘텐츠/채널', color: '#f85149', bg: 'rgba(248,81,73,0.08)',   border: 'rgba(248,81,73,0.2)' },
  { key: 'D', label: 'D 📣 마케팅/광고',  color: '#d29922', bg: 'rgba(210,153,34,0.08)',  border: 'rgba(210,153,34,0.2)' },
  { key: 'E', label: 'E 📬 앱/CRM',       color: '#e91e8c', bg: 'rgba(233,30,140,0.08)',  border: 'rgba(233,30,140,0.2)' },
  { key: 'F', label: 'F 💰 자금조달',     color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   border: 'rgba(63,185,80,0.2)' },
  { key: 'G', label: 'G 🧑 채용',         color: '#79c0ff', bg: 'rgba(121,192,255,0.08)', border: 'rgba(121,192,255,0.2)' },
  { key: 'H', label: 'H ⚙️ 운영',         color: '#ffa657', bg: 'rgba(255,166,87,0.08)',  border: 'rgba(255,166,87,0.2)' },
  { key: 'I', label: 'I 🧠 AI 시스템',    color: '#58a6ff', bg: 'rgba(88,166,255,0.08)',  border: 'rgba(88,166,255,0.2)' },
  { key: 'J', label: 'J 🌏 해외진출',     color: '#1abc9c', bg: 'rgba(26,188,156,0.08)',  border: 'rgba(26,188,156,0.2)' },
  { key: 'Z', label: 'Z 🎓 교육',         color: '#bc8cff', bg: 'rgba(188,140,255,0.08)', border: 'rgba(188,140,255,0.2)' },
  { key: 'other', label: '📄 기타',       color: '#8b949e', bg: 'rgba(139,148,158,0.08)', border: 'rgba(139,148,158,0.2)' },
];

const META = {
  // A 제품
  'product-roadmap':      { title: '제품 로드맵',              desc: '제품 개발 및 출시 타임라인',                    icon: '🗓️', cat: 'A' },
  'brand-design-system':  { title: '키네메디칼 디자인 시스템', desc: '브랜드 컬러, 로고, 패키지 가이드',              icon: '🎨', cat: 'A' },
  'es808':                { title: 'ES-808',                   desc: '커리큘럼 · 문자 안내',                          icon: '⚡', cat: 'A' },

  // B 콘텐츠/채널
  'youtube':              { title: 'YouTube',                  desc: '채널 허브 · 트래커 · 리서치 · 영상 목록',       icon: '▶️', cat: 'B' },

  // D 마케팅/광고
  'tenex-strategy':       { title: 'TENEX 핵심전략 2026',      desc: '테넥스 전체 사업 전략',                         icon: '🚀', cat: 'D' },

  // E 앱/CRM
  'kinemedical-app':      { title: '키네메디칼 앱',            desc: '앱 스펙 · 마일스톤 · 데모',                     icon: '📱', cat: 'E' },
  '1min-dosu-app':        { title: '1분도수 앱',               desc: '앱 기획 · ver4 화면 · 기능 스펙',               icon: '💪', cat: 'E' },
  'crm':                  { title: 'CRM',                      desc: 'CRM 전략 v2 · 고객 페르소나',                   icon: '📊', cat: 'E' },

  // F 자금조달
  'funding':              { title: '자금조달',                  desc: '지분 구조 · 스톡옵션 · 초창패 인터뷰',          icon: '💰', cat: 'F' },

  // G 채용
  '2026-team-structure':  { title: '팀 구조 & 채용 로드맵',    desc: '2026 팀 구성 및 채용 계획',                     icon: '👥', cat: 'G' },

  // H 운영
  'system-status':        { title: '자동화 시스템 현황',       desc: '테넥스 자동화 시스템 현황',                     icon: '🖥️', cat: 'H' },

  // I AI 시스템
  'ai-system':            { title: 'AI 시스템',                desc: '카리나 · OpenClaw · 시스템 구조 · Brain.db · 에이전트팀', icon: '🧠', cat: 'I' },

  // J 해외진출
  'global-strategy':      { title: '글로벌 진출 전략',         desc: '미국 전략 · APR 벤치마크 · 국가별 우선순위 · 전략 요약', icon: '🌏', cat: 'J' },

  // Z 교육
  'education':            { title: '교육',                     desc: '교육 허브 · 수제자 2기 요약 · 자사교 5기 메타', icon: '🎓', cat: 'Z' },
};

function scanFiles(dir, baseRel) {
  let result = [];
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    const rel = baseRel ? baseRel + '/' + f : f;
    if (fs.statSync(full).isDirectory()) {
      result = result.concat(scanFiles(full, rel));
    } else if (f.endsWith('.html') && f !== 'index.html') {
      if (!/^edu-\d/.test(f)) result.push(rel);
    }
  });
  return result;
}

function getMeta(filename) {
  const slug = path.basename(filename, '.html');
  const isMarketing = filename.includes('reports/marketing/');
  if (META[slug]) return { ...META[slug], slug, filename };
  const fullPath = path.join(SRC_DIR, filename);
  const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  return { title: titleMatch ? titleMatch[1].trim() : slug, desc: '', icon: isMarketing ? '🌏' : '📄', cat: isMarketing ? 'D' : 'other', slug, filename };
}

function getFileDate(filename) {
  try {
    const mtime = fs.statSync(path.join(SRC_DIR, filename)).mtime;
    return (mtime.getMonth()+1) + '/' + String(mtime.getDate()).padStart(2,'0');
  } catch { return ''; }
}

const files = scanFiles(SRC_DIR, '').sort();
const grouped = {};
CATS.forEach(c => grouped[c.key] = []);
files.forEach(f => {
  const m = getMeta(f);
  const key = grouped[m.cat] !== undefined ? m.cat : 'other';
  grouped[key].push({ ...m, date: getFileDate(f) });
});

const activeCats = CATS.filter(c => grouped[c.key] && grouped[c.key].length > 0);
const totalDocs = files.length;

function renderCard(item) {
  const date = item.date ? ` <span style="font-size:10px;color:#484f58;">· ${item.date}</span>` : '';
  const href = '/' + item.filename;
  return `<a href="${href}" class="card"><div class="card-icon">${item.icon}</div><div class="card-title">${item.title}${date}</div><div class="card-desc">${item.desc}</div></a>`;
}

function renderSection(cat) {
  const items = grouped[cat.key];
  if (!items || !items.length) return '';
  return `
    <div class="section">
      <div class="section-header" style="border-left-color:${cat.color}">
        <span class="section-label" style="color:${cat.color}">${cat.label}</span>
        <span class="section-count" style="background:${cat.bg};color:${cat.color};border-color:${cat.border}">${items.length}개</span>
      </div>
      <div class="grid">
        ${items.map(renderCard).join('\n        ')}
      </div>
    </div>`;
}

const now = new Date();
const dateLabel = now.getFullYear() + '. ' + (now.getMonth()+1) + '. ' + now.getDate() + '.';

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>테넥스 리포트</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0d1117; color:#e0e0e0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; min-height:100vh; }
  .hero { background:linear-gradient(135deg,#0d1117 0%,#161b22 100%); border-bottom:1px solid #21262d; padding:40px 40px 32px; }
  .hero-inner { max-width:1100px; margin:0 auto; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap; }
  .hero-badge { font-size:11px; font-weight:600; color:#58a6ff; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px; }
  .hero h1 { font-size:28px; font-weight:700; color:#fff; letter-spacing:-0.5px; margin-bottom:4px; }
  .hero-sub { color:#8b949e; font-size:14px; }
  .hero-stats { display:flex; gap:16px; flex-shrink:0; }
  .stat { text-align:center; background:#161b22; border:1px solid #30363d; border-radius:8px; padding:10px 18px; }
  .stat-num { font-size:22px; font-weight:700; color:#e6edf3; }
  .stat-label { font-size:11px; color:#8b949e; margin-top:2px; }
  .container { max-width:1100px; margin:0 auto; padding:32px 40px 48px; }
  .section { margin-bottom:36px; }
  .section-header { display:flex; align-items:center; gap:10px; border-left:3px solid; padding-left:12px; margin-bottom:16px; }
  .section-label { font-size:15px; font-weight:700; }
  .section-count { font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; border:1px solid; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
  .card { background:#161b22; border:1px solid #21262d; border-radius:10px; padding:16px 18px; text-decoration:none; color:inherit; display:block; transition:all 0.15s; }
  .card:hover { border-color:#58a6ff; background:#1c2128; transform:translateY(-1px); }
  .card-icon { font-size:22px; margin-bottom:8px; }
  .card-title { font-size:13px; font-weight:600; color:#e6edf3; margin-bottom:4px; line-height:1.4; }
  .card-desc { font-size:11px; color:#8b949e; line-height:1.4; }
  .footer { text-align:center; padding:24px; color:#484f58; font-size:11px; border-top:1px solid #21262d; }
</style>
</head>
<body>
<div class="hero">
  <div class="hero-inner">
    <div>
      <div class="hero-badge">🎯 테넥스 | 카리나</div>
      <h1>테넥스 리포트</h1>
      <div class="hero-sub">전략 · 시스템 · 제품 · CRM — 전체 문서 모음</div>
    </div>
    <div class="hero-stats">
      <div class="stat"><div class="stat-num">${totalDocs}</div><div class="stat-label">총 문서</div></div>
      <div class="stat"><div class="stat-num">${activeCats.length}</div><div class="stat-label">카테고리</div></div>
    </div>
  </div>
</div>
<div class="container">
${activeCats.map(renderSection).join('\n')}
</div>
<div class="footer">마지막 업데이트: ${dateLabel} | tenex-reports.vercel.app</div>
</body>
</html>`;

fs.writeFileSync(INDEX_FILE, html, 'utf8');
console.log('OK: ' + totalDocs + '개 문서, ' + activeCats.length + '개 카테고리');
