async function loadPartnershipOS() {
  const res = await fetch('./data/partnership-os-data.json');
  if (!res.ok) throw new Error('Failed to load partnership OS data');
  return res.json();
}

let creatorState = { query: '', category: 'all', status: 'all', sort: 'engagement_desc', data: [] };
let partnershipData = null;

async function savePartnershipState() {
  console.warn('Persistence disabled on current Vercel Hobby deployment. State is session-only for now.');
  return true;
}

function formatNumber(v) { return typeof v === 'number' ? v.toLocaleString('ko-KR') : v; }
function percent(num, denom) { if (!denom) return '-'; return `${((num / denom) * 100).toFixed(2)}%`; }
function candidateCard(c) { const pillClass = c.grade === 'S' ? 'green' : 'blue'; return `<div class="candidate"><div class="candidate-top"><div><h4>${c.name}</h4><div class="meta">${c.platform} · 팔로워 ${formatNumber(c.followers)} · 평균조회 ${formatNumber(c.avgViews)}</div></div><div class="score">${c.score}</div></div><div class="candidate-tags"><span class="pill ${pillClass}">${c.grade} 등급</span><span class="pill blue">${c.model}</span><span class="pill amber">명예 민감도 ${c.honor}</span></div><p class="reason">${c.reason}</p></div>`; }
function operationLane(title, items) { return `<div class="lane"><h4>${title}</h4>${items.map(item => `<div class="task"><div class="name">${item.name}</div><div class="desc">${item.desc}</div></div>`).join('')}</div>`; }
function performanceRows(rows) { return rows.map(r => `<tr><td>${r.partner}</td><td>${r.model}</td><td>${r.cost}</td><td>${r.revenue}</td><td>${r.type}</td></tr>`).join(''); }
function reuseRows(rows) { return rows.map(r => `<div class="task"><div class="name">${r.name}</div><div class="desc">${r.desc}</div></div>`).join(''); }
function dmQueueRows(rows) { return rows.map((r, idx) => `<tr><td>${r.accountName}</td><td>${r.handle}</td><td>${r.template}</td><td>${r.status}</td><td><button class="send-dm-btn" data-index="${idx}">1차 DM 보내기</button></td></tr>`).join(''); }
function dmLogRows(rows) { return rows.map(r => `<tr><td>${r.accountName}<div class="small">${r.handle}</div></td><td>${r.sentAt}</td><td>${r.template}</td><td>${r.result}</td><td>${r.duplicateBlocked ? '차단됨' : '허용'}</td></tr>`).join(''); }
function creatorRows(rows) {
  return rows.map(r => {
    const commentRate = percent(r.avgComments10, r.avgViews10);
    const saveRate = percent(r.avgSaves10, r.avgViews10);
    const viewFollowerRate = percent(r.avgViews10, r.followers);
    return `<tr class="creator-row" data-id="${r.id}"><td>${r.accountName}<div class="small">${r.handle}</div></td><td>${r.category}</td><td>${formatNumber(r.followers)}</td><td>${formatNumber(r.avgViews10)}<div class="small">조회/팔로워 ${viewFollowerRate}</div></td><td>${formatNumber(r.avgComments10)}<div class="small">댓글률 ${commentRate}</div></td><td>${formatNumber(r.avgSaves10)}<div class="small">저장률 ${saveRate}</div></td><td>${r.engagementScore}</td><td>${r.recommendedModel}</td><td>${r.status}${r.duplicateBlocked ? '<div class="small">중복방지 ON</div>' : ''}</td><td>${r.lastContacted}</td></tr>`;
  }).join('');
}
function followupRows(rows) { return rows.map((r, idx) => `<tr><td>${r.accountName}<div class="small">${r.handle}</div></td><td>${r.nextAction}</td><td>${r.due}</td><td>${r.status}</td><td><button class="next-step-btn" data-index="${idx}">다음 단계</button></td></tr>`).join(''); }
function historyRows(rows) { return rows.map(r => `<div class="task"><div class="name">${r.event}</div><div class="desc">${r.date} · ${r.detail}</div></div>`).join(''); }
function humanReviewRows(rows) { return rows.map((r, idx) => `<tr><td>${r.accountName}<div class="small">${r.handle}</div></td><td>${r.reply}</td><td>${r.recommendedAction}</td><td>${r.status}</td><td><button class="review-btn" data-index="${idx}">검토 완료</button></td></tr>`).join(''); }
function contentPostRows(rows) { return rows.map(r => `<tr><td>${r.creator}</td><td>${r.platform}</td><td><a href="${r.url}" target="_blank">링크 보기</a></td><td>${r.publishedAt}</td><td>${formatNumber(r.views)}</td><td>${formatNumber(r.comments)}</td><td>${formatNumber(r.saves)}</td><td>${r.revenue}</td><td>${r.note}</td></tr>`).join(''); }
function fillTemplate(template, candidate) { return template.replaceAll('{name}', candidate.name || candidate.accountName).replaceAll('{recent_content_reference}', `${candidate.category} 관련 최근 콘텐츠`).replaceAll('{honor_frame}', '초기 파트너 포지션').replaceAll('{reason_fit}', candidate.reason || candidate.note || '').replaceAll('{product}', candidate.campaignId === 'camp-cs25-parenting' ? 'CS-25' : 'ES-808'); }
function renderSummary(summary) {
  document.getElementById('stat-activeCampaigns').textContent = formatNumber(summary.activeCampaigns);
  document.getElementById('stat-priorityCandidates').textContent = formatNumber(summary.priorityCandidates);
  document.getElementById('stat-contactToday').textContent = formatNumber(summary.contactToday);
  document.getElementById('stat-zeroFixedCostRatio').textContent = `${summary.zeroFixedCostRatio}%`;
  document.getElementById('stat-groupbuyCandidates').textContent = formatNumber(summary.groupbuyCandidates);
}
function renderCandidates(data, campaignId = 'all', grade = 'all') {
  let list = data.candidates;
  if (campaignId !== 'all') list = list.filter(c => c.campaignId === campaignId);
  if (grade !== 'all') list = list.filter(c => c.grade === grade);
  document.getElementById('candidateCount').textContent = `${list.length}명`;
  document.getElementById('candidateList').innerHTML = list.map(candidateCard).join('');
  const first = list[0] || data.candidates[0];
  if (first) document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.honor, first).replaceAll('\n', '<br/>');
}
function renderOperations(ops) {
  const labels = { discovered: 'Discovered', contacted: 'Contacted', negotiating: 'Negotiating', scheduled: 'Scheduled', tracking: 'Tracking' };
  document.getElementById('operationsBoard').innerHTML = Object.entries(labels).map(([key, label]) => operationLane(label, ops[key] || [])).join('');
}
function applyCreatorFilters() {
  let rows = [...creatorState.data];
  if (creatorState.query) {
    const q = creatorState.query.toLowerCase();
    rows = rows.filter(r => r.accountName.toLowerCase().includes(q) || r.handle.toLowerCase().includes(q));
  }
  if (creatorState.category !== 'all') rows = rows.filter(r => r.category === creatorState.category);
  if (creatorState.status !== 'all') rows = rows.filter(r => r.status === creatorState.status);
  const sorters = { engagement_desc: (a, b) => b.engagementScore - a.engagementScore, followers_desc: (a, b) => b.followers - a.followers, views_desc: (a, b) => b.avgViews10 - a.avgViews10, saves_desc: (a, b) => b.avgSaves10 - a.avgSaves10, comments_desc: (a, b) => b.avgComments10 - a.avgComments10 };
  rows.sort(sorters[creatorState.sort]);
  document.getElementById('creatorCount').textContent = `${rows.length}개 계정`;
  document.getElementById('creatorTableBody').innerHTML = creatorRows(rows);
}
function renderInstagramDB(creators) {
  creatorState.data = creators;
  const categories = [...new Set(creators.map(c => c.category))];
  const statuses = [...new Set(creators.map(c => c.status))];
  document.getElementById('creatorCategoryFilter').innerHTML = `<option value="all">전체 카테고리</option>` + categories.map(v => `<option value="${v}">${v}</option>`).join('');
  document.getElementById('creatorStatusFilter').innerHTML = `<option value="all">전체 상태</option>` + statuses.map(v => `<option value="${v}">${v}</option>`).join('');
  applyCreatorFilters();
}
function renderDmQueue(rows) { document.getElementById('dmQueueBody').innerHTML = dmQueueRows(rows); }
function renderCreatorDetail(creator) {
  if (!creator) return;
  document.getElementById('creatorDetailBody').innerHTML = `<div class="detail-grid"><div><strong>계정명</strong><div>${creator.accountName}</div></div><div><strong>핸들</strong><div>${creator.handle}</div></div><div><strong>카테고리</strong><div>${creator.category}</div></div><div><strong>상태</strong><div>${creator.status}</div></div><div><strong>추천모델</strong><div>${creator.recommendedModel}</div></div><div><strong>중복 방지</strong><div>${creator.duplicateBlocked ? 'ON' : 'OFF'}</div></div><div><strong>추천코드 상태</strong><div>${creator.codeStatus}</div></div><div><strong>공동구매 상태</strong><div>${creator.groupbuyStatus}</div></div><div><strong>메모</strong><div>${creator.note}</div></div></div>`;
  const history = partnershipData.creatorHistories[creator.id] || [];
  document.getElementById('creatorHistoryBody').innerHTML = historyRows(history);
}
function rerenderPersistedSections() {
  renderInstagramDB(partnershipData.instagramCreators);
  renderDmQueue(partnershipData.dmQueue);
  document.getElementById('dmLogBody').innerHTML = dmLogRows(partnershipData.dmLogs);
  document.getElementById('followupBody').innerHTML = followupRows(partnershipData.followupQueue);
  document.getElementById('reviewInboxBody').innerHTML = humanReviewRows(partnershipData.humanReviewInbox);
}
function appendHistory(creatorId, event, detail) {
  if (!partnershipData.creatorHistories[creatorId]) partnershipData.creatorHistories[creatorId] = [];
  partnershipData.creatorHistories[creatorId].unshift({
    date: new Date().toLocaleString('sv-SE').replace('T', ' '),
    event,
    detail,
  });
}
function bindControls(data) {
  const campaignSelect = document.getElementById('campaignFilter');
  const gradeSelect = document.getElementById('gradeFilter');
  const render = () => renderCandidates(data, campaignSelect.value, gradeSelect.value);
  campaignSelect.innerHTML = `<option value="all">전체 캠페인</option>` + data.campaigns.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  campaignSelect.addEventListener('change', render);
  gradeSelect.addEventListener('change', render);
  document.getElementById('templateHonorBtn').addEventListener('click', () => {
    const candidate = data.candidates[0];
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.honor, candidate).replaceAll('\n', '<br/>');
  });
  document.getElementById('templatePerformanceBtn').addEventListener('click', () => {
    const candidate = data.candidates[1] || data.candidates[0];
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.performance, candidate).replaceAll('\n', '<br/>');
  });
  document.getElementById('generateBtn').addEventListener('click', render);
  document.getElementById('creatorSearch').addEventListener('input', (e) => { creatorState.query = e.target.value; applyCreatorFilters(); });
  document.getElementById('creatorCategoryFilter').addEventListener('change', (e) => { creatorState.category = e.target.value; applyCreatorFilters(); });
  document.getElementById('creatorStatusFilter').addEventListener('change', (e) => { creatorState.status = e.target.value; applyCreatorFilters(); });
  document.getElementById('creatorSort').addEventListener('change', (e) => { creatorState.sort = e.target.value; applyCreatorFilters(); });
  document.getElementById('creatorTableBody').addEventListener('click', (e) => {
    const row = e.target.closest('.creator-row');
    if (!row) return;
    const creator = creatorState.data.find(c => c.id === row.dataset.id);
    renderCreatorDetail(creator);
  });
  document.getElementById('dmQueueBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.send-dm-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    const target = partnershipData.dmQueue[idx];
    const creator = partnershipData.instagramCreators.find(c => c.handle === target.handle);
    if (!creator || creator.duplicateBlocked) return;
    creator.status = 'dm_sent';
    creator.lastContacted = new Date().toLocaleDateString('sv-SE');
    creator.duplicateBlocked = true;
    partnershipData.dmLogs.unshift({ accountName: target.accountName, handle: target.handle, sentAt: new Date().toLocaleString('sv-SE').replace('T', ' '), template: target.template, result: 'sent', duplicateBlocked: true });
    appendHistory(creator.id, 'dm_sent', `${target.template} 1차 DM 발송`);
    await savePartnershipState();
    rerenderPersistedSections();
    renderCreatorDetail(creator);
  });
  document.getElementById('reviewInboxBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.review-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    partnershipData.humanReviewInbox[idx].status = 'review_completed';
    await savePartnershipState();
    rerenderPersistedSections();
  });
  document.getElementById('followupBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.next-step-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    const item = partnershipData.followupQueue[idx];
    item.status = 'completed';
    const creator = partnershipData.instagramCreators.find(c => c.handle === item.handle);
    if (creator) {
      creator.status = 'negotiating';
      appendHistory(creator.id, 'next_step', item.nextAction);
    }
    await savePartnershipState();
    rerenderPersistedSections();
    if (creator) renderCreatorDetail(creator);
  });
}

loadPartnershipOS().then(data => {
  partnershipData = data;
  renderSummary(data.summary);
  renderCandidates(data);
  renderOperations(data.operations);
  renderInstagramDB(data.instagramCreators);
  renderDmQueue(data.dmQueue);
  document.getElementById('dmLogBody').innerHTML = dmLogRows(data.dmLogs);
  document.getElementById('followupBody').innerHTML = followupRows(data.followupQueue);
  document.getElementById('reviewInboxBody').innerHTML = humanReviewRows(data.humanReviewInbox);
  document.getElementById('contentPostBody').innerHTML = contentPostRows(data.contentPosts);
  document.getElementById('performanceBody').innerHTML = performanceRows(data.performance);
  document.getElementById('reuseQueue').innerHTML = reuseRows(data.reuseQueue);
  renderCreatorDetail(data.instagramCreators[0]);
  bindControls(data);
}).catch(err => {
  console.error(err);
  document.getElementById('candidateList').innerHTML = `<div class="note">데이터를 불러오지 못했습니다. ${err.message}</div>`;
});
