(function(){
  // ── 상세 상단 리뷰 요약 (2026-09-23) ─────────────────────────────
  //   · 평점: 숫자 4.9 하드코딩 (별은 테마 기본 5개 풀). 실측 표본평균 4.93
  //   · 건수: 알파리뷰 "리뷰목록" 위젯 총계와 동기화 (상단 1,051 ≠ 목록 1,053 불일치 제거)
  var KM_SCORE = '4.9';
  var KM_BOARD_WIDGET = '02a605b0';         // 알파리뷰 리뷰목록 위젯 코드 (건수 SSOT)
  var KM_COUNT_SEL = '.detail-review-box .alpha_review_count'
                   + ', a[href="#prdReview"] .alpha_review_count'
                   + ', .actionCartAndReview .alpha_review_count';
  var kmTotal = null;
  var kmFetched = false;

  // 0. 상세페이지 우측 상단 별점 스타일
  if (!document.getElementById('km-star-fix')) {
    var starCss = document.createElement('style');
    starCss.id = 'km-star-fix';
    starCss.textContent =
      '.detail-review-box .review-avg .jq-star svg path{fill:#1e44dd !important;stroke:none !important;}' +
      '.detail-review-box .grp_review point{display:inline-block !important;margin:0 2px 0 6px;font-weight:700;color:#111;vertical-align:middle;}' +
      '.xans-product-detail .infoArea .icon img[src*="/upload/benefit/"]{display:none !important;}' +
      // 네이버페이 영역: 컨테이너 폭 꽉 채우고 초록 구매버튼만 가변, 바깥 여백 축소 (메아리셋 레퍼런스)
      '.naver-kakao-pay{margin:8px 0 !important;}' +
      '.naver-kakao-pay #NaverChk_Button{flex:1 1 auto;width:100%;min-width:0;margin-top:4px !important;}' +
      '.naver-kakao-pay .npay_storebtn_bx{display:block !important;width:100% !important;}' +
      '.naver-kakao-pay .npay_btn_list{width:100% !important;table-layout:fixed;}' +
      '.naver-kakao-pay .npay_btn_item.btn_width{width:40px;}' +
      // 리뷰 탭 영역 상단 여백 축소 (72px → 24px)
      '#prdReview{margin-top:24px !important;}' +
      // 상단 리뷰영역은 포토리뷰만 (같은 위젯 세트라 게시판이 함께 렌더됨 → 상단에서만 숨김)
      '#prdReview review-board-widget{display:none !important;}' +
      // 상품 간략설명(🎁 …) 2px 확대: PC 16→18, 모바일 14→16 (테마 변수 --pc/m-detail-simple-size 덮어씀)
      '.xans-product-detail .headingArea .simple_desc_css{font-size:18px !important;}' +
      '@media (max-width:1024px){.xans-product-detail .headingArea .simple_desc_css{font-size:16px !important;}}' +
      // kp2 실험군(448 2층 구조, SEO 블록이 html에 kp2-exp를 붙임) 전용 — 일반 접속엔 클래스가 없어 무영향
      //  · 상단 여백 축소: #detailTab 기본 margin 39px 제거 + 상세 맨 앞 빈 줄(<div data-empty><br>) 숨김 (첫 이미지 127→73px)
      'html.kp2-exp #detailTab{margin-top:0 !important;}' +
      'html.kp2-exp #prdDetail .cont > div[data-empty]{display:none !important;}' +
      //  · 스크롤 업 시 헤더 복귀: 스킨이 스크롤 중 #header>.inner를 숨기고 상세 탭바를 상단 고정하는데,
      //    kp2가 탭바를 숨겨 아무것도 안 남음 → 위로 스크롤하는 동안만 고정 헤더를 다시 보여준다
      'html.kp2-exp.kp2-hdr #header.fixed > .inner{display:block !important;}';
    (document.head || document.documentElement).appendChild(starCss);
  }

  // 0-1. 별은 테마 기본(5개 풀 블루), 숫자만 4.9 고정
  function kmApplyScore() {
    var grp = document.querySelector('.detail-review-box .grp_review');
    if (!grp) return;
    var avg = grp.querySelector('.review-avg');
    var pt = grp.querySelector('point');
    if (!pt && avg && avg.parentNode) {
      pt = document.createElement('point');
      avg.parentNode.insertBefore(pt, avg.nextSibling);
    }
    if (pt && pt.textContent !== KM_SCORE) pt.textContent = KM_SCORE;
  }

  // 0-2. 리뷰 건수 = 리뷰목록 위젯 총계
  function kmApplyCount() {
    if (!kmTotal) return;
    var txt = kmTotal.toLocaleString('ko-KR');
    document.querySelectorAll(KM_COUNT_SEL).forEach(function(el) {
      if (el.textContent !== txt) el.textContent = txt;
    });
  }

  function kmFetchCount() {
    if (kmFetched) return;
    var no = window.iProductNo;
    if (!no || !document.querySelector('.detail-review-box')) return;
    kmFetched = true;
    var board = document.querySelector('review-board-widget');
    var code = (board && board.getAttribute('data-widget-code')) || KM_BOARD_WIDGET;
    fetch('https://review-widget.alphwidget.com/v2/api-widget/meta?device=w&page=1&page_size=3'
          + '&product_no=' + no + '&widget_code=' + code)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var n = d && (d.total_review_count || d.total_count);
        if (n > 0) {
          kmTotal = n;
          [0, 500, 1500, 3000, 6000].forEach(function(ms) { setTimeout(kmApplyCount, ms); });
        }
      })
      .catch(function() {});
  }

  // 0-2-1. 리뷰목록 위젯 헤더 "리뷰 1,053" 옆에 평점 (4.9) 표기 (shadow DOM)
  function kmReviewHeader() {
    var w = document.querySelector('#kmReviewBelow review-board-widget') || document.querySelector('review-board-widget');
    if (!w || !w.shadowRoot) return;
    var sr = w.shadowRoot;
    if (!sr.__kmObserved) {
      sr.__kmObserved = true;
      new MutationObserver(function() { kmReviewHeader(); }).observe(sr, { childList: true, subtree: true });
    }
    var ps = sr.querySelectorAll('p');
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!/^리뷰\s*[\d,]+/.test(p.textContent.trim())) continue;
      if (p.querySelector('.km-avg')) return;
      var s = document.createElement('span');
      s.className = 'km-avg';
      s.textContent = '(' + KM_SCORE + ')';
      s.style.cssText = 'margin-left:6px;color:#1e44dd;font-weight:700;';
      p.appendChild(s);
      return;
    }
  }

  // 0-2-2. 리뷰 배치: 포토리뷰+게시판 블록(#kmReviewBelow)을 제품상세(#prdDetail) 바로 뒤로
  //        (스킨에서는 다른 컨테이너에 렌더돼 '상품구매안내' 뒤로 밀리기 때문)
  function kmMoveReviewBelow() {
    var b = document.getElementById('kmReviewBelow');
    var d = document.getElementById('prdDetail');
    if (!b || !d) return;
    if (d.nextElementSibling === b) return;
    d.parentNode.insertBefore(b, d.nextElementSibling);
  }

  // 0-2-3. 포토리뷰: 모바일에서 한 페이지에 2x2(4개)만 노출
  //        알파리뷰가 일부 페이지를 PC 기준(2x5=10개)으로 렌더하는 현상 보정 (shadow DOM에 직접 주입)
  function kmPhotoGridFix() {
    var css = '@media (max-width:768px){.photo-swiper-slide > *:nth-child(n+5){display:none !important;}}';
    var list = document.querySelectorAll('review-photo-widget');
    for (var i = 0; i < list.length; i++) {
      var sr = list[i].shadowRoot;
      if (!sr) continue;
      try {
        // adoptedStyleSheets에 얹어야 Lit 재렌더에도 살아남는다 (style 태그는 지워짐)
        var sheets = sr.adoptedStyleSheets || [];
        var has = false;
        for (var j = 0; j < sheets.length; j++) { if (sheets[j].__kmGrid) { has = true; break; } }
        if (has) continue;
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        sheet.__kmGrid = true;
        sr.adoptedStyleSheets = sheets.concat(sheet);
      } catch (e) {
        var exists = false, st2 = sr.querySelectorAll('style');
        for (var k = 0; k < st2.length; k++) { if ((st2[k].textContent || '').indexOf('nth-child(n+5)') >= 0) { exists = true; break; } }
        if (exists) continue;
        var st = document.createElement('style');
        st.textContent = css;
        sr.appendChild(st);
      }
    }
  }

  // 0-3. 알파리뷰 스크립트가 나중에 값을 덮어써도 되돌리기
  function kmWatch() {
    var box = document.querySelector('.detail-review-box');
    if (!box || box.__kmWatched) return;
    box.__kmWatched = true;
    new MutationObserver(function() {
      kmApplyScore();
      kmApplyCount();
    }).observe(box, { childList: true, subtree: true, characterData: true });
  }

  // 0-5. 모바일 사이드바 기업소개 드롭다운 (PC 헤더 .wp-dropdown-menu와 동일한 3개)
  var KM_BRAND_SUB = [
    ['기업소개', '/brand/index.html', ''],
    ['블로그', 'https://blog.kinemedical.co.kr', '_blank'],
    ['기업소식', '/front/php/b/board_list.php?board_no=2&is_pcver=T', '']
  ];
  function kmAsideBrandMenu() {
    var list = document.querySelector('#aside .categoryList');
    if (!list) return;
    var li = null, kids = list.children;
    for (var i = 0; i < kids.length; i++) {
      var a = kids[i].querySelector('a');
      if (a && (a.getAttribute('href') || '').indexOf('/brand/index') === 0) { li = kids[i]; break; }
    }
    if (!li || li.querySelector('.km-aside-sub')) return;

    // 하위 목록: 스킨 기본 클래스(sub02) 재사용 → 제품정보 하위메뉴와 동일한 서체/색/들여쓰기
    var ul = document.createElement('ul');
    ul.className = 'sub02 sub02_brand km-aside-sub';
    ul.style.display = 'none';
    KM_BRAND_SUB.forEach(function(it) {
      var l = document.createElement('li'), a2 = document.createElement('a');
      a2.href = it[1];
      a2.textContent = it[0];
      if (it[2]) { a2.target = it[2]; a2.rel = 'noopener'; }
      l.appendChild(a2);
      ul.appendChild(l);
    });

    // 펼침 화살표: 스킨 기본 클래스(cate view toggle-cate) 재사용 → 화살표 모양/회전 CSS 그대로 적용
    var tg = document.createElement('a');
    tg.href = '#none';
    tg.className = 'cate view toggle-cate km-aside-toggle';
    tg.setAttribute('data-expand-target', 'sub02_brand');
    tg.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var open = ul.classList.contains('active');
      ul.classList.toggle('active', !open);
      tg.classList.toggle('expand', !open);
      li.classList.toggle('selected', !open);
      if (window.jQuery) window.jQuery(ul).stop(true, true).slideToggle(200);
      else ul.style.display = open ? 'none' : 'block';
    });

    li.appendChild(tg);
    li.appendChild(ul);
  }

  function applyFixes() {
    // 0-4. 상단 리뷰 요약 (평점 4.9 고정 + 건수 동기화)
    kmApplyScore();
    kmFetchCount();
    kmApplyCount();
    kmWatch();
    kmReviewHeader();
    kmMoveReviewBelow();
    kmPhotoGridFix();

    // 1. 제품정보(솔루션) 드롭다운: cate-override → wp-dropdown 스타일
    var catOverride = document.getElementById('category');
    if (catOverride && catOverride.classList.contains('cate-override')) {
      var subCate = catOverride.querySelector('.sub-cate');
      if (subCate) subCate.remove();
      var li = catOverride.querySelector('li');
      if (li && !li.querySelector('.wp-dropdown-menu')) {
        var dropMenu = document.createElement('div');
        dropMenu.className = 'wp-dropdown-menu';
        dropMenu.innerHTML = '<a href="/product/list.html?cate_no=74">회복 기기</a>' +
                             '<a href="/product/list.html?cate_no=74">교정 기기</a>' +
                             '<a href="/product/list.html?cate_no=74">고정 기기</a>';
        li.appendChild(dropMenu);
        catOverride.classList.add('wp-dropdown');
      }
    }

      // 1-1. 모바일 사이드바(#aside) "기업소개" 하위메뉴 — PC 헤더 드롭다운과 동일 구성
    //      스킨 JS의 .toggle-cate 핸들러는 로드시점 바인딩이라 동적 추가분은 잡지 못함 → 클릭 핸들러 직접 부착
    kmAsideBrandMenu();

    // 2. +20,000P (join_point) 완전 제거
    document.querySelectorAll('.pointbox').forEach(function(el) {
      el.style.display = 'none';
    });

    // 3. SEO JSON-LD: 평점 4.9 고정 + 리뷰수는 알파리뷰 라이브 값으로 동기화
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s) {
      try {
        var data = JSON.parse(s.textContent);
        if (data && data['@type'] === 'Product' && data.aggregateRating) {
          var cnt = document.querySelector('.alpha_review_count');
          var n = kmTotal || (cnt ? parseInt(cnt.textContent.replace(/[^0-9]/g, ''), 10) : NaN);
          if (data.aggregateRating.ratingValue !== 4.9 || (n > 0 && data.aggregateRating.reviewCount !== n)) {
            data.aggregateRating.ratingValue = 4.9;
            if (n > 0) data.aggregateRating.reviewCount = n;
            s.textContent = JSON.stringify(data);
          }
        }
      } catch (e) {}
    });

    // 4. 기업소식 + 블로그 썸네일 교정
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

  // 0-6. kp2 실험군: 스크롤 방향 감지 → 위로 올릴 때만 kp2-hdr 부착 (헤더 복귀는 위 CSS가 담당)
  //      kp2-exp 클래스는 SEO 코드직접입력의 kp2 스크립트가 붙인다 — 없으면 매 스크롤 즉시 반환
  var kmHdrLastY = window.scrollY || 0;
  window.addEventListener('scroll', function () {
    var html = document.documentElement;
    if (!html.classList.contains('kp2-exp')) return;
    var y = window.scrollY;
    if (y < kmHdrLastY - 5 && y > 80) html.classList.add('kp2-hdr');
    else if (y > kmHdrLastY + 5 || y <= 80) html.classList.remove('kp2-hdr');
    kmHdrLastY = y;
  }, { passive: true });

  // 즉시 실행 + DOMContentLoaded 양쪽 대비
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  } else {
    applyFixes();
  }
  // 안전장치: 100ms 후에도 한번 더
  setTimeout(applyFixes, 200);
  setTimeout(applyFixes, 1000);
  // 알파리뷰 카운트가 늦게 뜨는 경우 대비 (JSON-LD 리뷰수 동기화용)
  setTimeout(applyFixes, 3000);
  // 리뷰목록 위젯은 스크롤 진입 시점에 렌더되므로 20초간 폴링 (이후는 MutationObserver가 담당)
  var kmTries = 0;
  var kmTimer = setInterval(function() {
    kmReviewHeader();
    kmMoveReviewBelow();
    kmPhotoGridFix();
    if (++kmTries > 40) clearInterval(kmTimer);
  }, 500);
})();
