(function(){
  var CATEGORY_LABELS = [
    { href: '/product/list.html?cate_no=74', text: '회복 기기' },
    { href: '/product/list.html?cate_no=74', text: '교정 기기' },
    { href: '/product/list.html?cate_no=74', text: '고정 기기' }
  ];

  // CSS 삽입: sub-cate 라운드 박스 제거 + pointbox 숨김
  var style = document.createElement('style');
  style.textContent = [
    '#category .sub-cate { display:none !important; }',
    '#category .wp-dropdown-menu { display:none; position:absolute; top:100%; left:0; background:#fff; min-width:160px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:999; }',
    '#category:hover .wp-dropdown-menu { display:block; }',
    '#category .wp-dropdown-menu a { display:block; padding:12px 20px; font-size:14px; color:#333; text-decoration:none; white-space:nowrap; }',
    '#category .wp-dropdown-menu a:hover { background:#f5f5f5; color:#002855; }',
    '.pointbox { display:none !important; }'
  ].join('\n');
  document.head.appendChild(style);

  function setProductInfoTitle() {
    var targets = document.querySelectorAll('#titleArea h2, #contents h2, .titleArea h2');
    targets.forEach(function(node) {
      if (node && node.textContent && node.textContent.trim() === '솔루션') {
        node.textContent = '제품정보';
      }
    });

    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"], title').forEach(function(node) {
      if (node.tagName === 'TITLE') {
        if (node.textContent && node.textContent.indexOf('솔루션') !== -1) {
          node.textContent = node.textContent.replace(/솔루션/g, '제품정보');
        }
      } else {
        var content = node.getAttribute('content');
        if (content && content.indexOf('솔루션') !== -1) {
          node.setAttribute('content', content.replace(/솔루션/g, '제품정보'));
        }
      }
    });
  }

  function replaceCategoryChips() {
    var containers = document.querySelectorAll('.sub-cate, .xans-product-normalmenu .function, .menuCategory');
    containers.forEach(function(container) {
      var text = (container.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (text.indexOf('1. 운동') === -1 && text.indexOf('1분도수') === -1 && text.indexOf('회복') === -1) return;

      container.innerHTML = '';
      CATEGORY_LABELS.forEach(function(item) {
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.text;
        container.appendChild(a);
      });
    });
  }

  function applyFixes() {
    var catOverride = document.getElementById('category');
    if (catOverride) {
      var subCate = catOverride.querySelector('.sub-cate');
      if (subCate) subCate.remove();
      var li = catOverride.querySelector('li');
      if (li) {
        var topLink = li.querySelector('a');
        if (topLink && topLink.textContent.trim() === '솔루션') {
          topLink.textContent = '제품정보';
        }
        if (!li.querySelector('.wp-dropdown-menu')) {
          var dm = document.createElement('div');
          dm.className = 'wp-dropdown-menu';
          dm.innerHTML = CATEGORY_LABELS.map(function(item) {
            return '<a href="' + item.href + '">' + item.text + '</a>';
          }).join('');
          li.appendChild(dm);
          catOverride.classList.add('wp-dropdown');
        }
      }
    }

    setProductInfoTitle();
    replaceCategoryChips();

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
  setTimeout(applyFixes, 2500);
})();
