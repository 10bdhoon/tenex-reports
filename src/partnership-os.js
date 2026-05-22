async function loadPartnershipOS() {
  const res = await fetch('./data/partnership-os-data.json');
  if (!res.ok) throw new Error('Failed to load partnership OS data');
  return res.json();
}

function formatNumber(v) {
  return typeof v === 'number' ? v.toLocaleString('ko-KR') : v;
}

function candidateCard(c) {
  const pillClass = c.grade === 'S' ? 'green' : 'blue';
  return `
    <div class="candidate">
      <div class="candidate-top">
        <div>
          <h4>${c.name}</h4>
          <div class="meta">${c.platform} · 팔로워 ${formatNumber(c.followers)} · 평균조회 ${formatNumber(c.avgViews)}</div>
        </div>
        <div class="score">${c.score}</div>
      </div>
      <div class="candidate-tags">
        <span class="pill ${pillClass}">${c.grade} 등급</span>
        <span class="pill blue">${c.model}</span>
        <span class="pill amber">명예 민감도 ${c.honor}</span>
      </div>
      <p class="reason">${c.reason}</p>
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
  return rows.map(r => `<tr><td>${r.partner}</td><td>${r.model}</td><td>${r.cost}</td><td>${r.revenue}</td><td>${r.type}</td></tr>`).join('');
}

function reuseRows(rows) {
  return rows.map(r => `<div class="task"><div class="name">${r.name}</div><div class="desc">${r.desc}</div></div>`).join('');
}

function dmQueueRows(rows) {
  return rows.map((r, idx) => `
    <tr>
      <td>${r.accountName}</td>
      <td>${r.handle}</td>
      <td>${r.template}</td>
      <td>${r.status}</td>
      <td><button class="send-dm-btn" data-index="${idx}">1차 DM 보내기</button></td>
    </tr>
  `).join('');
}

function creatorRows(rows) {
  return rows.map(r => `
    <tr>
      <td>${r.accountName}<div class="small">${r.handle}</div></td>
      <td>${r.category}</td>
      <td>${formatNumber(r.followers)}</td>
      <td>${formatNumber(r.avgViews10)}</td>
      <td>${formatNumber(r.avgComments10)}</td>
      <td>${formatNumber(r.avgSaves10)}</td>
      <td>${r.engagementScore}</td>
      <td>${r.recommendedModel}</td>
      <td>${r.status}</td>
      <td>${r.lastContacted}</td>
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
  if (first) {
    document.getElementById('outreachTemplateBox').innerHTML = fillTemplate(data.outreachTemplate.honor, first).replaceAll('\n', '<br/>');
  }
}

function renderOperations(ops) {
  const labels = { discovered: 'Discovered', contacted: 'Contacted', negotiating: 'Negotiating', scheduled: 'Scheduled', tracking: 'Tracking' };
  document.getElementById('operationsBoard').innerHTML = Object.entries(labels).map(([key, label]) => operationLane(label, ops[key] || [])).join('');
}

function renderInstagramDB(creators) {
  document.getElementById('creatorCount').textContent = `${creators.length}개 계정`;
  document.getElementById('creatorTableBody').innerHTML = creatorRows(creators);
}

function renderDmQueue(rows) {
  document.getElementById('dmQueueBody').innerHTML = dmQueueRows(rows);
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
  document.getElementById('dmQueueBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.send-dm-btn');
    if (!btn) return;
    btn.textContent = '발송 완료';
    btn.disabled = true;
    btn.style.opacity = '.6';
  });
}

loadPartnershipOS()
  .then(data => {
    renderSummary(data.summary);
    renderCandidates(data);
    renderOperations(data.operations);
    renderInstagramDB(data.instagramCreators);
    renderDmQueue(data.dmQueue);
    document.getElementById('performanceBody').innerHTML = performanceRows(data.performance);
    document.getElementById('reuseQueue').innerHTML = reuseRows(data.reuseQueue);
    bindControls(data);
  })
  .catch(err => {
    console.error(err);
    document.getElementById('candidateList').innerHTML = `<div class="note">데이터를 불러오지 못했습니다. ${err.message}</div>`;
  });
