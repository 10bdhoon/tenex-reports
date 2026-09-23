(function(){
  // ── 상세 상단 리뷰 요약 (2026-09-23) ─────────────────────────────
  //   · 평점: 4.9 하드코딩 (별 4.9칸 + 숫자 4.9). 실측 표본평균 4.93
  //   · 건수: 알파리뷰 "리뷰목록" 위젯 총계와 동기화 (상단 1,051 ≠ 목록 1,053 불일치 제거)
  var KM_SCORE = '4.9';
  var KM_SCORE_PCT = '98%';                 // 4.9 / 5
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
      '.detail-review-box .review-avg .jq-star{display:none !important;}' +
      '.detail-review-box .km-stars{position:relative;display:inline-block;vertical-align:middle;font-size:18px;line-height:1;letter-spacing:2px;font-family:Arial,Helvetica,sans-serif;color:#dfe3ea;}' +
      '.detail-review-box .km-stars:before{content:"\\2605\\2605\\2605\\2605\\2605";}' +
      '.detail-review-box .km-stars i{position:absolute;left:0;top:0;width:' + KM_SCORE_PCT + ';overflow:hidden;white-space:nowrap;font-style:normal;color:#1e44dd;}' +
      '.detail-review-box .km-stars i:before{content:"\\2605\\2605\\2605\\2605\\2605";}' +
      '.detail-review-box .grp_review point{display:inline-block !important;margin:0 2px 0 6px;font-weight:700;color:#111;vertical-align:middle;}' +
      '.xans-product-detail .infoArea .icon img[src*="/upload/benefit/"]{display:none !important;}';
    (document.head || document.documentElement).appendChild(starCss);
  }

  // 0-1. 별 4.9칸 + 숫자 4.9 고정
  function kmApplyScore() {
    var grp = document.querySelector('.detail-review-box .grp_review');
    if (!grp) return;
    var avg = grp.querySelector('.review-avg');
    if (avg && !avg.querySelector('.km-stars')) {
      var stars = document.createElement('span');
      stars.className = 'km-stars';
      stars.appendChild(document.createElement('i'));
      avg.appendChild(stars);
    }
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

  function applyFixes() {
    // 0-4. 상단 리뷰 요약 (평점 4.9 고정 + 건수 동기화)
    kmApplyScore();
    kmFetchCount();
    kmApplyCount();
    kmWatch();

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
})();
