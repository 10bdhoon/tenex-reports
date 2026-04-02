(function () {
  "use strict";

  var KAKAO_LINK = "https://pf.kakao.com/_CwrSn";
  var PRIMARY = "#22C55E";
  var KAKAO_BG = "#FEE500";

  var FAQ = [
    {
      keywords: ["배송", "얼마나", "언제", "도착", "배송 조회"],
      answer:
        "주문 확인 후 평균 1~2일 이내 출고됩니다. 주말/공휴일은 다음 영업일 처리.",
    },
    {
      keywords: ["교환", "환불", "반품", "취소"],
      answer:
        "제품 수령 후 7일 이내 교환/환불 가능. 단순 변심은 왕복 배송비 고객 부담. 제품 하자는 무료 처리.",
    },
    {
      keywords: ["es808", "es-808", "도수펜", "저주파", "사용법", "크림", "젤"],
      answer:
        "부스터젤/크림을 반드시 바른 후, 크롬 팁을 통증 부위에 밀착. 목은 1~4단계, 전신은 5단계~. 반드시 1단계부터 시작하세요.",
    },
    {
      keywords: ["cs25", "cs-25", "도수넥", "경추", "목", "견인"],
      answer:
        "어댑터 연결 후 전원 버튼. 목 아래 놓고 경추지압→경추당김 순서로 자동 진행. 1회 15~20분, 하루 2회 권장.",
    },
    {
      keywords: ["ws200", "ws-200", "찜질", "워머", "적외선"],
      answer:
        "벨크로로 고정 후 원하는 온도 설정. 목, 어깨, 허리 어디든 사용 가능. 1회 20~30분, 피부 이상 시 즉시 중단.",
    },
    {
      keywords: ["고장", "as", "a/s", "수리", "작동", "안됨", "불량"],
      answer:
        "구매 후 1년 이내 무상 A/S. 카카오 플러스친구(@키네메디칼)로 사진/영상 첨부 후 문의해주세요.",
    },
  ];

  var QUICK_REPLIES = [
    { label: "📦 배송 조회", message: "배송 조회" },
    { label: "🔄 교환/환불", message: "교환/환불" },
    { label: "🔧 제품 사용법", message: "제품 사용법" },
    { label: "🛠️ A/S 문의", message: "A/S 문의" },
    { label: "💬 1:1 상담", message: "1:1 상담" },
  ];

  function matchFAQ(text) {
    var lower = text.toLowerCase().replace(/[\s\-]/g, "");
    for (var i = 0; i < FAQ.length; i++) {
      for (var j = 0; j < FAQ[i].keywords.length; j++) {
        if (lower.indexOf(FAQ[i].keywords[j].replace(/[\s\-]/g, "")) !== -1) {
          return FAQ[i].answer;
        }
      }
    }
    return null;
  }

  // Inject styles
  var style = document.createElement("style");
  style.textContent =
    "#km-chatbot-fab{position:fixed;bottom:24px;right:24px;z-index:99999;width:60px;height:60px;border-radius:50%;background:" +
    KAKAO_BG +
    ";border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;transition:transform .2s}" +
    "#km-chatbot-fab:hover{transform:scale(1.08)}" +
    "#km-chatbot-fab svg{width:30px;height:30px}" +
    "#km-chatbot-popup{position:fixed;bottom:96px;right:24px;z-index:100000;width:340px;height:480px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
    "@media(max-width:480px){#km-chatbot-popup{width:100%;height:100%;bottom:0;right:0;border-radius:0}}" +
    "#km-chatbot-popup.km-open{display:flex}" +
    ".km-header{background:" +
    PRIMARY +
    ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}" +
    ".km-header-title{font-size:15px;font-weight:700}" +
    ".km-close{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0 4px;line-height:1}" +
    ".km-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}" +
    ".km-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word;white-space:pre-wrap}" +
    ".km-msg.km-bot{background:#f1f3f5;color:#222;align-self:flex-start;border-bottom-left-radius:4px}" +
    ".km-msg.km-user{background:" +
    PRIMARY +
    ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".km-qr-wrap{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}" +
    ".km-qr{background:#fff;border:1px solid " +
    PRIMARY +
    ";color:" +
    PRIMARY +
    ";border-radius:18px;padding:6px 14px;font-size:12.5px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}" +
    ".km-qr:hover{background:" +
    PRIMARY +
    ";color:#fff}" +
    ".km-input-wrap{display:flex;border-top:1px solid #e5e7eb;flex-shrink:0}" +
    ".km-input{flex:1;border:none;outline:none;padding:12px 14px;font-size:14px}" +
    ".km-send{background:" +
    PRIMARY +
    ";color:#fff;border:none;padding:0 16px;cursor:pointer;font-size:15px;font-weight:700}";

  document.head.appendChild(style);

  // FAB button
  var fab = document.createElement("button");
  fab.id = "km-chatbot-fab";
  fab.setAttribute("aria-label", "채팅 상담");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="#3C1E1E"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';
  document.body.appendChild(fab);

  // Popup
  var popup = document.createElement("div");
  popup.id = "km-chatbot-popup";
  popup.innerHTML =
    '<div class="km-header"><span class="km-header-title">키네메디칼 CS 도우미</span><button class="km-close" aria-label="닫기">&times;</button></div>' +
    '<div class="km-messages" id="km-msgs"></div>' +
    '<div class="km-qr-wrap" id="km-qr"></div>' +
    '<div class="km-input-wrap"><input class="km-input" id="km-input" placeholder="메시지를 입력하세요..." /><button class="km-send" id="km-send">전송</button></div>';
  document.body.appendChild(popup);

  var msgsEl = document.getElementById("km-msgs");
  var qrEl = document.getElementById("km-qr");
  var inputEl = document.getElementById("km-input");
  var sendBtn = document.getElementById("km-send");
  var closeBtn = popup.querySelector(".km-close");

  function scrollToBottom() {
    setTimeout(function () {
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }, 50);
  }

  function addMsg(text, isUser) {
    var div = document.createElement("div");
    div.className = "km-msg " + (isUser ? "km-user" : "km-bot");
    div.textContent = text;
    msgsEl.appendChild(div);
    scrollToBottom();
  }

  function showQuickReplies(items) {
    qrEl.innerHTML = "";
    items.forEach(function (qr) {
      var btn = document.createElement("button");
      btn.className = "km-qr";
      btn.textContent = qr.label;
      btn.addEventListener("click", function () {
        handleInput(qr.message);
      });
      qrEl.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    qrEl.innerHTML = "";
  }

  function handleInput(text) {
    if (!text.trim()) return;
    addMsg(text, true);
    clearQuickReplies();

    // 1:1 상담
    if (text.indexOf("1:1") !== -1 || text.indexOf("상담") !== -1) {
      addMsg(
        "카카오 플러스친구(@키네메디칼)로 연결합니다 💬",
        false
      );
      window.open(KAKAO_LINK, "_blank");
      return;
    }

    // 제품 사용법 -> 세부 선택
    if (text === "제품 사용법") {
      addMsg("어떤 제품 사용법이 궁금하신가요?", false);
      showQuickReplies([
        { label: "ES-808 사용법", message: "ES-808 사용법" },
        { label: "CS-25 사용법", message: "CS-25 사용법" },
        { label: "WS-200 사용법", message: "WS-200 사용법" },
      ]);
      return;
    }

    var answer = matchFAQ(text);
    if (answer) {
      addMsg(answer, false);
    } else {
      addMsg(
        "죄송해요, 조금 더 자세히 말씀해주시면 빠르게 안내드릴게요 😊\n카카오 플러스친구(@키네메디칼)로 직접 문의도 가능합니다.\n👉 " +
          KAKAO_LINK,
        false
      );
      showQuickReplies(QUICK_REPLIES);
    }
  }

  // Toggle popup
  var isOpen = false;
  var initialized = false;

  fab.addEventListener("click", function () {
    isOpen = !isOpen;
    if (isOpen) {
      popup.classList.add("km-open");
      if (!initialized) {
        initialized = true;
        addMsg(
          "안녕하세요 👋 키네메디칼 고객 도우미입니다!\n무엇이 궁금하신가요?",
          false
        );
        showQuickReplies(QUICK_REPLIES);
      }
      inputEl.focus();
    } else {
      popup.classList.remove("km-open");
    }
  });

  closeBtn.addEventListener("click", function () {
    isOpen = false;
    popup.classList.remove("km-open");
  });

  sendBtn.addEventListener("click", function () {
    handleInput(inputEl.value);
    inputEl.value = "";
  });

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      handleInput(inputEl.value);
      inputEl.value = "";
    }
  });
})();
