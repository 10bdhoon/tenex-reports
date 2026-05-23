async function loadPartnershipOS() {
  const res = await fetch('/api/tasks/read');
  if (!res.ok) throw new Error('Failed to load partnership OS data');
  const payload = await res.json();
  if (payload?.partnershipState) return payload.partnershipState;
  const fallback = await fetch('./data/partnership-os-data.json');
  if (!fallback.ok) throw new Error('Failed to load fallback partnership OS data');
  return fallback.json();
}

let creatorState = { query: '', category: 'all', status: 'all', sort: 'engagement_desc', data: [] };
let partnershipData = null;

function setSaveStatus(message, type = '') {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.className = `save-status ${type}`.trim();
  el.textContent = message;
}

async function savePartnershipState() {
  const res = await fetch('/api/tasks/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partnershipState: partnershipData }),
    credentials: 'include',
  });
  if (!res.ok) {
    setSaveStatus('저장 실패, 로그인/권한 또는 서버 상태 확인 필요', 'error');
    throw new Error('Failed to persist partnership state');
  }
  setSaveStatus('저장 완료', 'ok');
  return true;
}

function formatNumber(v) {
  return typeof v === 'number' ? v.toLocaleString('ko-KR') : v;
}

function percent(num, denom) {
  if (!denom) return '-';
  return `${((num / denom) * 100).toFixed(2)}%`;
}

function getStatusPill(status) {
  const map = {
    ready_to_dm: { label: 'DM 준비', cls: 'blue' },
    dm_sent: { label: 'DM 발송', cls: 'green' },
    human_review: { label: '검토 필요', cls: 'amber' },
    negotiating: { label: '협상중', cls: 'amber' },
    reply_received: { label: '답장 수신', cls: 'green' },
    review_needed: { label: '리뷰 필요', cls: 'amber' },
    waiting_reply: { label: '답장 대기', cls: 'blue' },
    completed: { label: '완료', cls: 'green' }
  };
  return map[status] || { label: status, cls: 'blue' };
}

function candidateCard(c) {
  const pillClass = c.grade === 'S' ? 'green' : c.grade === 'A' ? 'blue' : 'amber';
  return `
    <div class="candidate">
      <div class="candidate-top">
        <div>
          <h4>${c.name}</h4>
          <div class="candidate-meta">${c.platform} · ${c.category} · 팔로워 ${formatNumber(c.followers)} · 평균조회 ${formatNumber(c.avgViews)}</div>
        </div>
        <div class="score">${c.score}</div>
      </div>
      <div class="candidate-tags">
        <span class="pill ${pillClass}">${c.grade} 등급</span>
        <span class="pill blue">${c.model}</span>
        <span class="pill amber">명예 민감도 ${c.honor}</span>
      </div>
      <div class="candidate-body">${c.reason}</div>
      <div class="candidate-footer">
        <div class="candidate-focus">추천 방향: ${c.tags.join(' · ')}</div>
        <button class="send-dm-btn">우선 검토</button>
      </div>
    </div>
  `;
}

function operationLane(title, items) {
  return `
    <div class="lane">
      <h4>${title}</h4>
      ${items.map(item => `<div class="task"><div class="name">${item.name}</div><div class="desc">${item.desc}</div></div>`).join('')}
    </div>
  `;
}

function performanceRows(rows) {
  return rows.map(r => `
    <tr>
      <td>${r.partner}</td>
      <td>${r.model}</td>
      <td>${r.cost}</td>
      <td>${r.revenue}</td>
      <td>${r.type}</td>
    </tr>
  `).join('');
}

function reuseRows(rows) {
  return rows.map(r => `
    <div class="reuse-item">
      <strong>${r.name}</strong>
      <p>${r.desc}</p>
    </div>
  `).join('');
}

function dmQueueRows(rows) {
  return rows.map((r, idx) => `
    <tr>
      <td>${r.accountName}</td>
      <td>${r.handle}</td>
      <td>${r.template}</td>
      <td><span class="pill ${getStatusPill(r.status).cls}">${getStatusPill(r.status).label}</span></td>
      <td><button class="send-dm-btn" data-index="${idx}">1차 DM 보내기</button></td>
    </tr>
  `).join('');
}

function dmLogRows(rows) {
  return rows.map(r => `
    <tr>
      <td>${r.accountName}<div class="small">${r.handle}</div></td>
      <td>${r.sentAt}</td>
      <td>${r.template}</td>
      <td>${r.result}</td>
      <td>${r.duplicateBlocked ? '<span class="pill red">차단됨</span>' : '<span class="pill green">허용</span>'}</td>
    </tr>
  `).join('');
}

function creatorRows(rows) {
  return rows.map(r => {
    const commentRate = percent(r.avgComments10, r.avgViews10);
    const saveRate = percent(r.avgSaves10, r.avgViews10);
    const viewFollowerRate = percent(r.avgViews10, r.followers);
    const status = getStatusPill(r.status);
    return `
      <tr class="creator-row" data-id="${r.id}">
        <td>${r.accountName}<div class="small">${r.handle}</div></td>
        <td>${r.category}</td>
        <td>${formatNumber(r.followers)}</td>
        <td>${formatNumber(r.avgViews10)}<div class="small">조회/팔로워 ${viewFollowerRate}</div></td>
        <td>${formatNumber(r.avgComments10)}<div class="small">댓글률 ${commentRate}</div></td>
        <td>${formatNumber(r.avgSaves10)}<div class="small">저장률 ${saveRate}</div></td>
        <td>${r.engagementScore}</td>
        <td>${r.recommendedModel}</td>
        <td><span class="pill ${status.cls}">${status.label}</span>${r.duplicateBlocked ? '<div class="small">중복방지 ON</div>' : ''}</td>
        <td>${r.lastContacted}</td>
      </tr>
    `;
  }).join('');
}

function followupRows(rows) {
  return rows.map((r, idx) => `
    <tr>
      <td>${r.accountName}<div class="small">${r.handle}</div></td>
      <td>${r.nextAction}</td>
      <td>${r.due}</td>
      <td><span class="pill ${getStatusPill(r.status).cls}">${getStatusPill(r.status).label}</span></td>
      <td><button class="next-step-btn" data-index="${idx}">다음 단계</button></td>
    </tr>
  `).join('');
}

function historyRows(rows) {
  if (!rows.length) return '<div class="history-item"><strong>이력 없음</strong><span>아직 기록된 작업이 없어.</span></div>';
  return rows.map(r => `
    <div class="history-item">
      <strong>${r.event}</strong>
      <span>${r.date} · ${r.detail}</span>
    </div>
  `).join('');
}

function humanReviewRows(rows) {
  return rows.map((r, idx) => `
    <tr>
      <td>${r.accountName}<div class="small">${r.handle}</div></td>
      <td>${r.reply}</td>
      <td>${r.recommendedAction}</td>
      <td><span class="pill ${getStatusPill(r.status).cls}">${getStatusPill(r.status).label}</span></td>
      <td><button class="review-btn" data-index="${idx}">검토 완료</button></td>
    </tr>
  `).join('');
}

function contentPostRows(rows) {
  return rows.map(r => `
    <tr>
      <td>${r.creator}</td>
      <td>${r.platform}</td>
      <td><a href="${r.url}" target="_blank" rel="noreferrer" style="color:#8fc5ff;">링크 보기</a></td>
      <td>${r.publishedAt}</td>
      <td>${formatNumber(r.views)}</td>
      <td>${formatNumber(r.comments)}</td>
      <td>${formatNumber(r.saves)}</td>
      <td>${r.revenue}</td>
      <td>${r.note}</td>
    </tr>
  `).join('');
}

function fillTemplate(template, candidate) {
  return template
    .replaceAll('{name}', candidate.name || candidate.accountName)
    .replaceAll('{recent_content_reference}', `${candidate.category} 관련 최근 콘텐츠`)
    .replaceAll('{honor_frame}', '초기 파트너 포지션')
    .replaceAll('{reason_fit}', candidate.reason || candidate.note || '')
    .replaceAll('{product}', candidate.campaignId === 'camp-cs25-parenting' ? 'CS-25' : 'ES-808');
}

function updateSidebar(summary) {
  const priority = summary.priorityCandidates || 0;
  const contact = summary.contactToday || 0;
  const creatorCount = creatorState.data.length || partnershipData.instagramCreators.length || 0;
  document.getElementById('sidebarPriority').textContent = `A/S급 후보 ${priority}명`;
  document.getElementById('sidebarContact').textContent = `오늘 컨택 ${contact}건`;
  document.getElementById('creatorCountNav').textContent = `${creatorCount}`;
  document.getElementById('pipelineBadge').textContent = `${partnershipData.dmQueue.length}`;
}

function updateHero(summary) {
  document.getElementById('heroActiveCampaigns').textContent = formatNumber(summary.activeCampaigns);
  document.getElementById('heroPriorityCandidates').textContent = formatNumber(summary.priorityCandidates);
  document.getElementById('heroContactToday').textContent = formatNumber(summary.contactToday);
}

function updateQueueSnapshot() {
  const readyDm = partnershipData.dmQueue.filter(item => item.status === 'ready_to_send').length;
  const reviewNeeded = partnershipData.humanReviewInbox.filter(item => item.status !== 'review_completed').length;
  const followup = partnershipData.followupQueue.filter(item => item.status !== 'completed').length;
  document.getElementById('queueReadyDm').textContent = readyDm;
  document.getElementById('queueReviewNeeded').textContent = reviewNeeded;
  document.getElementById('queueFollowup').textContent = followup;
  document.getElementById('queuePrimaryMessage').textContent = readyDm > 0
    ? `지금 1차 DM ${readyDm}건 먼저 보내고, 리뷰 필요 ${reviewNeeded}건은 바로 사람 검토로 넘기면 돼.`
    : `지금은 후속 협상 ${followup}건과 리뷰 필요 ${reviewNeeded}건 처리 우선.`;
}

function renderSummary(summary) {
  document.getElementById('stat-activeCampaigns').textContent = formatNumber(summary.activeCampaigns);
  document.getElementById('stat-priorityCandidates').textContent = formatNumber(summary.priorityCandidates);
  document.getElementById('stat-contactToday').textContent = formatNumber(summary.contactToday);
  document.getElementById('stat-zeroFixedCostRatio').textContent = `${summary.zeroFixedCostRatio}%`;
  document.getElementById('stat-groupbuyCandidates').textContent = formatNumber(summary.groupbuyCandidates);
  updateSidebar(summary);
  updateHero(summary);
}

function renderCandidates(data, campaignId = 'all', grade = 'all') {
  let list = data.candidates;
  if (campaignId !== 'all') list = list.filter(c => c.campaignId === campaignId);
  if (grade !== 'all') list = list.filter(c => c.grade === grade);
  document.getElementById('candidateCount').textContent = `${list.length}명`;
  document.getElementById('candidateList').innerHTML = list.map(candidateCard).join('');
  const first = list[0] || data.candidates[0];
  if (first) {
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.honor, first).replaceAll('\n', '<br/>');
  }
}

function renderOperations(ops) {
  const labels = {
    discovered: 'Discovered',
    contacted: 'Contacted',
    negotiating: 'Negotiating',
    scheduled: 'Scheduled',
    tracking: 'Tracking'
  };
  document.getElementById('operationsBoard').innerHTML = Object.entries(labels)
    .map(([key, label]) => operationLane(label, ops[key] || []))
    .join('');
}

function applyCreatorFilters() {
  let rows = [...creatorState.data];
  if (creatorState.query) {
    const q = creatorState.query.toLowerCase();
    rows = rows.filter(r => r.accountName.toLowerCase().includes(q) || r.handle.toLowerCase().includes(q));
  }
  if (creatorState.category !== 'all') rows = rows.filter(r => r.category === creatorState.category);
  if (creatorState.status !== 'all') rows = rows.filter(r => r.status === creatorState.status);

  const sorters = {
    engagement_desc: (a, b) => b.engagementScore - a.engagementScore,
    followers_desc: (a, b) => b.followers - a.followers,
    views_desc: (a, b) => b.avgViews10 - a.avgViews10,
    saves_desc: (a, b) => b.avgSaves10 - a.avgSaves10,
    comments_desc: (a, b) => b.avgComments10 - a.avgComments10,
  };
  rows.sort(sorters[creatorState.sort]);
  document.getElementById('creatorCount').textContent = `${rows.length}개 계정`;
  document.getElementById('creatorTableBody').innerHTML = creatorRows(rows);
}

function renderInstagramDB(creators) {
  creatorState.data = creators;
  const categories = [...new Set(creators.map(c => c.category))];
  const statuses = [...new Set(creators.map(c => c.status))];
  document.getElementById('creatorCategoryFilter').innerHTML = `<option value="all">전체 카테고리</option>` + categories.map(v => `<option value="${v}">${v}</option>`).join('');
  document.getElementById('creatorStatusFilter').innerHTML = `<option value="all">전체 상태</option>` + statuses.map(v => `<option value="${v}">${getStatusPill(v).label}</option>`).join('');
  applyCreatorFilters();
}

function renderDmQueue(rows) {
  document.getElementById('dmQueueBody').innerHTML = dmQueueRows(rows);
}

function renderCreatorDetail(creator) {
  if (!creator) return;
  const status = getStatusPill(creator.status);
  document.getElementById('creatorDetailBody').innerHTML = `
    <div class="detail-shell">
      <div class="detail-overview">
        <div>
          <h3>${creator.accountName}</h3>
          <p>${creator.handle} · ${creator.category}</p>
          <div class="candidate-tags" style="margin-top:12px;">
            <span class="pill ${status.cls}">${status.label}</span>
            <span class="pill blue">${creator.recommendedModel}</span>
            ${creator.duplicateBlocked ? '<span class="pill red">중복방지 ON</span>' : '<span class="pill green">중복방지 OFF</span>'}
          </div>
        </div>
        <div class="detail-score">
          <strong>${creator.engagementScore}</strong>
          <span>Engagement score</span>
        </div>
      </div>
      <div class="detail-grid">
        <div><strong>팔로워</strong>${formatNumber(creator.followers)}</div>
        <div><strong>최근 10개 평균조회</strong>${formatNumber(creator.avgViews10)}</div>
        <div><strong>최근 10개 평균저장</strong>${formatNumber(creator.avgSaves10)}</div>
        <div><strong>Trust Score</strong>${creator.trustScore}</div>
        <div><strong>Cost Efficiency</strong>${creator.costEfficiency}</div>
        <div><strong>Honor Sensitivity</strong>${creator.honorSensitivity}</div>
        <div><strong>코드 상태</strong>${creator.codeStatus}</div>
        <div><strong>공동구매 상태</strong>${creator.groupbuyStatus}</div>
        <div><strong>마지막 접촉</strong>${creator.lastContacted}</div>
      </div>
      <div class="mini-card"><strong>운영 메모</strong><p>${creator.note}</p></div>
    </div>
  `;
  const history = partnershipData.creatorHistories[creator.id] || [];
  document.getElementById('creatorHistoryBody').innerHTML = historyRows(history);
}

function rerenderPersistedSections() {
  renderInstagramDB(partnershipData.instagramCreators);
  renderDmQueue(partnershipData.dmQueue);
  document.getElementById('dmLogBody').innerHTML = dmLogRows(partnershipData.dmLogs);
  document.getElementById('followupBody').innerHTML = followupRows(partnershipData.followupQueue);
  document.getElementById('reviewInboxBody').innerHTML = humanReviewRows(partnershipData.humanReviewInbox);
  updateQueueSnapshot();
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

  const rerenderButtons = [document.getElementById('generateBtn'), document.getElementById('generateBtnTop')].filter(Boolean);
  rerenderButtons.forEach(btn => btn.addEventListener('click', render));

  document.getElementById('templateHonorBtn').addEventListener('click', () => {
    const candidate = data.candidates[0];
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.honor, candidate).replaceAll('\n', '<br/>');
  });

  document.getElementById('templatePerformanceBtn').addEventListener('click', () => {
    const candidate = data.candidates[1] || data.candidates[0];
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.performance, candidate).replaceAll('\n', '<br/>');
  });

  document.getElementById('creatorSearch').addEventListener('input', e => {
    creatorState.query = e.target.value;
    applyCreatorFilters();
  });
  document.getElementById('creatorCategoryFilter').addEventListener('change', e => {
    creatorState.category = e.target.value;
    applyCreatorFilters();
  });
  document.getElementById('creatorStatusFilter').addEventListener('change', e => {
    creatorState.status = e.target.value;
    applyCreatorFilters();
  });
  document.getElementById('creatorSort').addEventListener('change', e => {
    creatorState.sort = e.target.value;
    applyCreatorFilters();
  });

  document.getElementById('creatorTableBody').addEventListener('click', e => {
    const row = e.target.closest('.creator-row');
    if (!row) return;
    const creator = creatorState.data.find(c => c.id === row.dataset.id);
    renderCreatorDetail(creator);
  });

  document.getElementById('dmQueueBody').addEventListener('click', async e => {
    const btn = e.target.closest('.send-dm-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    const target = partnershipData.dmQueue[idx];
    const creator = partnershipData.instagramCreators.find(c => c.handle === target.handle);
    if (!creator || creator.duplicateBlocked) return;

    creator.status = 'dm_sent';
    creator.lastContacted = new Date().toLocaleDateString('sv-SE');
    creator.duplicateBlocked = true;
    target.status = 'waiting_reply';
    partnershipData.dmLogs.unshift({
      accountName: target.accountName,
      handle: target.handle,
      sentAt: new Date().toLocaleString('sv-SE').replace('T', ' '),
      template: target.template,
      result: 'sent',
      duplicateBlocked: true,
    });
    appendHistory(creator.id, 'dm_sent', `${target.template} 1차 DM 발송`);

    try { await savePartnershipState(); } catch (err) { console.error(err); }
    rerenderPersistedSections();
    renderCreatorDetail(creator);
  });

  document.getElementById('reviewInboxBody').addEventListener('click', async e => {
    const btn = e.target.closest('.review-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    partnershipData.humanReviewInbox[idx].status = 'completed';
    try { await savePartnershipState(); } catch (err) { console.error(err); }
    rerenderPersistedSections();
  });

  document.getElementById('followupBody').addEventListener('click', async e => {
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
    try { await savePartnershipState(); } catch (err) { console.error(err); }
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
  updateQueueSnapshot();
  bindControls(data);
}).catch(err => {
  console.error(err);
  const fallback = `<div class="note">데이터를 불러오지 못했습니다. ${err.message}</div>`;
  const candidateList = document.getElementById('candidateList');
  if (candidateList) candidateList.innerHTML = fallback;
});
