(function(){
  document.addEventListener('DOMContentLoaded', function() {
    // 1. 제품정보(솔루션) 드롭다운: cate-override 구조를 wp-dropdown과 동일하게 변경
    var catOverride = document.getElementById('category');
    if (catOverride && catOverride.classList.contains('cate-override')) {
      // sub-cate 제거
      var subCate = catOverride.querySelector('.sub-cate');
      if (subCate) subCate.remove();
      // wp-dropdown-menu 생성 (회복/교정/고정 기기)
      var li = catOverride.querySelector('li');
      if (li) {
        var dropMenu = document.createElement('div');
        dropMenu.className = 'wp-dropdown-menu';
        dropMenu.innerHTML = '<a href="/product/list.html?cate_no=74">회복 기기</a>' +
                             '<a href="/product/list.html?cate_no=74">교정 기기</a>' +
                             '<a href="/product/list.html?cate_no=74">고정 기기</a>';
        li.appendChild(dropMenu);
        // cate-override를 wp-dropdown 스타일로 변경
        catOverride.classList.add('wp-dropdown');
      }
    }

    // 2. +20,000P (join_point) 완전 제거
    document.querySelectorAll('.pointbox').forEach(function(el) {
      el.style.display = 'none';
    });

    // 3. 기업소식 + 블로그 썸네일 교정
    document.querySelectorAll('.km-info-card').forEach(function(card) {
      var title = card.querySelector('.km-info-card__title');
      if (!title) return;
      var items = card.querySelectorAll('.km-info-card__item');
      var t = title.textContent.trim();

      if (t === '기업소식') {
        // 1번: ksilbo
        var img0 = items[0] && items[0].querySelector('.km-info-card__thumb img');
        if (img0) img0.src = 'https://cdn.ksilbo.co.kr/news/thumbnail/202602/1049823_630919_4136_v150.jpg';
        // 2번: nbntv
        var img1 = items[1] && items[1].querySelector('.km-info-card__thumb img');
        if (img1) img1.src = 'https://www.nbntv.kr/news/thumbnail/202511/338143_362280_4230_v150.jpg';
      }

      if (t === '공식 블로그') {
        // 2번: 목디스크 관리법
        var img1b = items[1] && items[1].querySelector('.km-info-card__thumb img');
        if (img1b) img1b.src = 'https://source.inblog.dev/featured_image/2026-02-25T04:52:20.161Z-ff86ab91-cee7-4d03-93dc-d10260ac5ee0';
      }
    });
  });
})();
