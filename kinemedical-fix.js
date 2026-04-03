(function(){
  // CSS 삽입: sub-cate 라운드 박스 제거 + pointbox 숨김
  var style = document.createElement('style');
  style.textContent = [
    /* 제품정보(솔루션) sub-cate 라운드 박스 완전 제거 */
    '#category .sub-cate { display:none !important; }',
    /* 제품정보 wp-dropdown-menu 스타일 (다른 메뉴와 동일하게) */
    '#category .wp-dropdown-menu { display:none; position:absolute; top:100%; left:0; background:#fff; min-width:160px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:999; }',
    '#category:hover .wp-dropdown-menu { display:block; }',
    '#category .wp-dropdown-menu a { display:block; padding:12px 20px; font-size:14px; color:#333; text-decoration:none; white-space:nowrap; }',
    '#category .wp-dropdown-menu a:hover { background:#f5f5f5; color:#002855; }',
    /* +20,000P 완전 제거 */
    '.pointbox { display:none !important; }'
  ].join('\n');
  document.head.appendChild(style);

  function applyFixes() {
    // 1. 제품정보(솔루션) 드롭다운 추가: 회복/교정/고정 기기
    var catOverride = document.getElementById('category');
    if (catOverride) {
      // sub-cate 제거
      var subCate = catOverride.querySelector('.sub-cate');
      if (subCate) subCate.remove();
      var li = catOverride.querySelector('li');
      if (li && !li.querySelector('.wp-dropdown-menu')) {
        var dm = document.createElement('div');
        dm.className = 'wp-dropdown-menu';
        dm.innerHTML =
          '<a href="/product/list.html?cate_no=74">회복 기기</a>' +
          '<a href="/product/list.html?cate_no=74">교정 기기</a>' +
          '<a href="/product/list.html?cate_no=74">고정 기기</a>';
        li.appendChild(dm);
        catOverride.classList.add('wp-dropdown');
      }
    }

    // 2. 메인용 km-info-card 썸네일 수정 (메인에서만 존재)
    document.querySelectorAll('.km-info-card').forEach(function(card) {
      var title = card.querySelector('.km-info-card__title');
      if (!title) return;
      var items = card.querySelectorAll('.km-info-card__item');
      var t = title.textContent.trim();
      if (t === '기업소식') {
        var img0 = items[0] && items[0].querySelector('.km-info-card__thumb img');
        if (img0) img0.src = 'https://cdn.ksilbo.co.kr/news/thumbnail/202602/1049823_630919_4136_v150.jpg';
        var img1 = items[1] && items[1].querySelector('.km-info-card__thumb img');
        if (img1) img1.src = 'https://www.nbntv.kr/news/thumbnail/202511/338143_362280_4230_v150.jpg';
      }
      if (t === '공식 블로그') {
        var img1b = items[1] && items[1].querySelector('.km-info-card__thumb img');
        if (img1b) img1b.src = 'https://source.inblog.dev/featured_image/2026-02-25T04:52:20.161Z-ff86ab91-cee7-4d03-93dc-d10260ac5ee0';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  } else {
    applyFixes();
  }
  setTimeout(applyFixes, 300);
  setTimeout(applyFixes, 1200);
})();
