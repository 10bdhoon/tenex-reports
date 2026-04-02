import type { VercelRequest, VercelResponse } from "@vercel/node";

interface KakaoSkillRequest {
  userRequest: {
    utterance: string;
  };
}

interface FAQ {
  keywords: string[];
  answer: string;
  quickReplies?: { label: string; message: string }[];
}

const FAQ_LIST: FAQ[] = [
  {
    keywords: ["배송", "얼마나", "언제", "도착"],
    answer:
      "주문 확인 후 평균 1~2일 이내 출고됩니다. 주말/공휴일은 다음 영업일 처리.",
  },
  {
    keywords: ["교환", "환불", "반품", "취소"],
    answer:
      "제품 수령 후 7일 이내 교환/환불 가능. 단순 변심은 왕복 배송비 고객 부담. 제품 하자는 무료 처리.",
  },
  {
    keywords: ["es808", "도수펜", "저주파", "사용법", "크림", "젤"],
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
  {
    keywords: ["가격", "얼마", "할인", "카드", "결제", "무이자"],
    answer:
      "카카오 플러스친구(@키네메디칼)로 문의하시면 최신 프로모션 안내드립니다.",
  },
  {
    keywords: ["병원", "납품", "b2b", "입점", "대량", "도매"],
    answer:
      "병원/기업 납품 문의는 카카오 플러스친구(@키네메디칼)로 연락주세요.",
  },
];

const DEFAULT_QUICK_REPLIES = [
  { label: "배송 문의", message: "배송 문의" },
  { label: "교환/환불", message: "교환/환불" },
  { label: "제품 사용법", message: "제품 사용법" },
  { label: "A/S 문의", message: "A/S 문의" },
  { label: "상담원 연결", message: "상담원 연결" },
];

function buildResponse(
  text: string,
  quickReplies?: { label: string; message: string }[]
) {
  const template: Record<string, unknown> = {
    outputs: [{ simpleText: { text } }],
  };
  if (quickReplies) {
    template.quickReplies = quickReplies.map((qr) => ({
      action: "message",
      label: qr.label,
      messageText: qr.message,
    }));
  }
  return { version: "2.0", template };
}

function matchFAQ(utterance: string): string | null {
  const lower = utterance.toLowerCase().replace(/[\s\-]/g, "");
  for (const faq of FAQ_LIST) {
    for (const kw of faq.keywords) {
      if (lower.includes(kw.replace(/[\s\-]/g, ""))) {
        return faq.answer;
      }
    }
  }
  return null;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const body = req.body as KakaoSkillRequest;
  const utterance = body?.userRequest?.utterance?.trim() ?? "";

  // 상담원 연결
  if (utterance.includes("상담원") || utterance.includes("상담 연결")) {
    return res.json(
      buildResponse(
        "카카오 플러스친구(@키네메디칼)로 연결합니다 💬\n링크: https://pf.kakao.com/_CwrSn"
      )
    );
  }

  // FAQ 키워드 매칭
  const answer = matchFAQ(utterance);
  if (answer) {
    return res.json(buildResponse(answer));
  }

  // 매칭 실패
  return res.json(
    buildResponse(
      "죄송해요, 조금 더 자세히 말씀해주시면 빠르게 안내드릴게요 😊\n카카오 플러스친구(@키네메디칼)로 직접 문의도 가능합니다.",
      DEFAULT_QUICK_REPLIES
    )
  );
}
