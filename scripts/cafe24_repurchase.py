#!/usr/bin/env python3
"""
키네메디칼 재구매율 집계 (카페24 주문 기준)

두 가지 입력 경로를 지원한다.

1) 카페24 Admin API에서 직접 주문을 당겨온다.
   필요한 환경변수:
     CAFE24_MALL_ID        (기본값 bdhoon10)
     CAFE24_SHOP_NO        (기본값 5, 키네메디칼)
     CAFE24_CLIENT_ID
     CAFE24_CLIENT_SECRET
     CAFE24_REFRESH_TOKEN  (또는 CAFE24_ACCESS_TOKEN)
   예)
     python3 scripts/cafe24_repurchase.py --since 2026-01-01 --until 2026-09-17

2) 카페24 관리자 > 주문관리 > 엑셀 다운로드 파일(.csv / .xlsx)을 읽는다.
   예)
     python3 scripts/cafe24_repurchase.py --input orders.csv

집계 내용
  - 고객 식별: 회원ID > 이메일 > 이름+휴대폰(안심번호 050x 제외) > 이름+우편번호
  - 월별 첫 구매 코호트의 D+90 / D+180 재구매율
  - 전체 재구매율(첫 구매 후 90일 이상 지난 고객만 분모)
  - 세 가지 변형: 전체 / 키네펜 주문 제외 / 키네펜 구매자 제외
  - 주간 주문 중 재구매 고객 주문 비중 (주간 Mixpanel 리포트의 "신규 vs 재구매"와 대조용)

외부 패키지 없이 표준 라이브러리만 사용한다. (.xlsx 입력만 openpyxl 필요)
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

API_VERSION = "2025-12-01"
KINEPEN_PATTERNS = ("키네펜", "ES-808 PRO", "ES-808 Pro", "es-808 pro", "KINEPEN")


# ----------------------------------------------------------------------------
# 데이터 모델
# ----------------------------------------------------------------------------
@dataclass
class Order:
    order_id: str
    order_date: date
    member_id: str = ""
    email: str = ""
    name: str = ""
    phone: str = ""
    zipcode: str = ""
    amount: int = 0
    paid: bool = True
    canceled: bool = False
    products: list[str] = field(default_factory=list)

    @property
    def is_kinepen(self) -> bool:
        return any(any(p in name for p in KINEPEN_PATTERNS) for name in self.products)

    def customer_key(self) -> str:
        if self.member_id:
            return f"m:{self.member_id.strip().lower()}"
        if self.email and "@" in self.email:
            return f"e:{self.email.strip().lower()}"
        phone = re.sub(r"\D", "", self.phone or "")
        if phone and not phone.startswith("050"):  # 네이버페이 안심번호 제외
            return f"p:{self.name.strip()}|{phone}"
        if self.zipcode:
            return f"z:{self.name.strip()}|{self.zipcode.strip()}"
        return f"o:{self.order_id}"  # 식별 불가 → 단독 고객으로 취급


# ----------------------------------------------------------------------------
# 입력 1: 카페24 Admin API
# ----------------------------------------------------------------------------
class Cafe24Client:
    def __init__(self, mall_id: str, shop_no: int):
        self.mall_id = mall_id
        self.shop_no = shop_no
        self.base = f"https://{mall_id}.cafe24api.com/api/v2"
        self.access_token = os.environ.get("CAFE24_ACCESS_TOKEN", "")

    def refresh(self) -> None:
        cid = os.environ.get("CAFE24_CLIENT_ID")
        sec = os.environ.get("CAFE24_CLIENT_SECRET")
        rt = os.environ.get("CAFE24_REFRESH_TOKEN")
        if not (cid and sec and rt):
            raise SystemExit(
                "CAFE24_CLIENT_ID / CAFE24_CLIENT_SECRET / CAFE24_REFRESH_TOKEN 환경변수가 필요합니다."
            )
        body = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": rt}).encode()
        req = urllib.request.Request(f"{self.base}/oauth/token", data=body, method="POST")
        req.add_header("Authorization", "Basic " + base64.b64encode(f"{cid}:{sec}".encode()).decode())
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        self.access_token = data["access_token"]
        new_rt = data.get("refresh_token")
        if new_rt and new_rt != rt:
            print(f"[token] refresh_token이 갱신됨. 환경변수 업데이트 필요: {new_rt}", file=sys.stderr)

    def get(self, path: str, params: dict) -> dict:
        if not self.access_token:
            self.refresh()
        url = f"{self.base}{path}?{urllib.parse.urlencode(params)}"
        for attempt in range(2):
            req = urllib.request.Request(url)
            req.add_header("Authorization", f"Bearer {self.access_token}")
            req.add_header("Content-Type", "application/json")
            req.add_header("X-Cafe24-Api-Version", API_VERSION)
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                if e.code == 401 and attempt == 0:
                    self.refresh()
                    continue
                raise SystemExit(f"API 오류 {e.code}: {e.read().decode(errors='ignore')[:500]}")
        raise SystemExit("API 호출 실패")

    def orders(self, since: date, until: date) -> list[Order]:
        """카페24는 조회 구간을 최대 3개월로 제한하므로 월 단위로 나눠 호출한다."""
        out: list[Order] = []
        cur = since
        while cur <= until:
            end = min(cur + timedelta(days=30), until)
            offset = 0
            while True:
                data = self.get(
                    "/admin/orders",
                    {
                        "shop_no": self.shop_no,
                        "start_date": cur.isoformat(),
                        "end_date": end.isoformat(),
                        "date_type": "order_date",
                        "embed": "items,receivers",
                        "limit": 1000,
                        "offset": offset,
                    },
                )
                batch = data.get("orders", [])
                for o in batch:
                    out.append(self._parse(o))
                print(f"[api] {cur}~{end} offset={offset} → {len(batch)}건", file=sys.stderr)
                if len(batch) < 1000:
                    break
                offset += 1000
            cur = end + timedelta(days=1)
        return out

    @staticmethod
    def _parse(o: dict) -> Order:
        receivers = o.get("receivers") or []
        zipcode = receivers[0].get("zipcode", "") if receivers else ""
        items = o.get("items") or []
        return Order(
            order_id=o.get("order_id", ""),
            order_date=datetime.fromisoformat(o["order_date"][:19]).date(),
            member_id=o.get("member_id") or "",
            email=o.get("buyer_email") or o.get("member_email") or "",
            name=o.get("buyer_name") or "",
            phone=o.get("buyer_cellphone") or o.get("buyer_phone") or "",
            zipcode=zipcode,
            amount=int(float(o.get("payment_amount") or 0)),
            paid=(o.get("paid") == "T"),
            canceled=(o.get("canceled") == "T"),
            products=[it.get("product_name", "") for it in items],
        )


# ----------------------------------------------------------------------------
# 입력 2: 관리자 엑셀 다운로드 (.csv / .xlsx)
# ----------------------------------------------------------------------------
COLUMN_HINTS = {
    "order_id": ["주문번호"],
    "order_date": ["주문일시", "주문일", "결제일시", "결제일"],
    "member_id": ["회원아이디", "회원 아이디", "주문자아이디", "주문자 아이디", "아이디"],
    "email": ["주문자 이메일", "주문자이메일", "이메일"],
    "name": ["주문자명", "주문자 이름", "주문자"],
    "phone": ["주문자 휴대전화", "주문자휴대전화", "주문자 휴대폰", "휴대전화", "휴대폰"],
    "zipcode": ["우편번호"],
    "amount": ["실결제금액", "결제금액", "총 결제금액", "총결제금액"],
    "product": ["주문상품명", "상품명", "주문 상품명"],
    "status": ["주문상태", "처리상태"],
}


def _pick(header: list[str], hints: list[str]) -> int | None:
    norm = [h.strip() for h in header]
    for hint in hints:
        for i, h in enumerate(norm):
            if h == hint:
                return i
    for hint in hints:
        for i, h in enumerate(norm):
            if hint in h:
                return i
    return None


def _read_rows(path: str) -> list[list[str]]:
    if path.lower().endswith(".xlsx"):
        try:
            import openpyxl  # type: ignore
        except ImportError:
            raise SystemExit("xlsx 입력에는 openpyxl이 필요합니다: pip install openpyxl (또는 CSV로 저장)")
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb.active
        return [["" if c is None else str(c) for c in row] for row in ws.iter_rows(values_only=True)]
    with open(path, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",\t")
        except csv.Error:
            dialect = csv.excel
        return [row for row in csv.reader(f, dialect)]


def _parse_date(s: str) -> date | None:
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y.%m.%d %H:%M", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[: len(fmt) + 2], fmt).date()
        except ValueError:
            continue
    m = re.match(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})", s)
    if m:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


def load_export(path: str) -> list[Order]:
    rows = _read_rows(path)
    # 헤더 행 찾기 (주문번호 컬럼이 있는 첫 행)
    hidx = next((i for i, r in enumerate(rows) if any("주문번호" in c for c in r)), None)
    if hidx is None:
        raise SystemExit("헤더에서 '주문번호' 컬럼을 찾지 못했습니다.")
    header = rows[hidx]
    col = {k: _pick(header, v) for k, v in COLUMN_HINTS.items()}
    if col["order_id"] is None or col["order_date"] is None:
        raise SystemExit(f"필수 컬럼(주문번호/주문일시)을 찾지 못했습니다. 헤더: {header}")

    def g(r: list[str], k: str) -> str:
        i = col.get(k)
        return r[i].strip() if i is not None and i < len(r) else ""

    orders: dict[str, Order] = {}
    for r in rows[hidx + 1 :]:
        oid = g(r, "order_id")
        if not oid:
            continue
        d = _parse_date(g(r, "order_date"))
        if d is None:
            continue
        status = g(r, "status")
        canceled = any(k in status for k in ("취소", "환불", "반품"))
        amt = re.sub(r"[^\d]", "", g(r, "amount")) or "0"
        # 관리자 엑셀은 상품 단위로 행이 나뉘므로 주문번호로 합친다
        o = orders.get(oid)
        if o is None:
            o = Order(
                order_id=oid,
                order_date=d,
                member_id=g(r, "member_id"),
                email=g(r, "email"),
                name=g(r, "name"),
                phone=g(r, "phone"),
                zipcode=g(r, "zipcode"),
                amount=int(amt),
                paid=True,
                canceled=canceled,
            )
            orders[oid] = o
        prod = g(r, "product")
        if prod:
            o.products.append(prod)
        o.canceled = o.canceled and canceled  # 한 상품이라도 유효하면 유효 주문
    return list(orders.values())


# ----------------------------------------------------------------------------
# 집계
# ----------------------------------------------------------------------------
def analyze(orders: list[Order], asof: date, label: str) -> dict:
    valid = [o for o in orders if o.paid and not o.canceled]
    by_cust: dict[str, list[Order]] = defaultdict(list)
    for o in valid:
        by_cust[o.customer_key()].append(o)
    for lst in by_cust.values():
        lst.sort(key=lambda x: x.order_date)

    # 코호트별 D+90 / D+180
    cohorts: dict[str, dict] = defaultdict(lambda: {"customers": 0, "d90": 0, "d180": 0, "any": 0})
    mature90 = mature180 = 0
    rep90 = rep180 = 0
    for lst in by_cust.values():
        first = lst[0].order_date
        key = first.strftime("%Y-%m")
        c = cohorts[key]
        c["customers"] += 1
        later = [o.order_date for o in lst[1:]]
        if later:
            c["any"] += 1
        if (asof - first).days >= 90:
            mature90 += 1
            if any((d - first).days <= 90 for d in later):
                c["d90"] += 1
                rep90 += 1
        if (asof - first).days >= 180:
            mature180 += 1
            if any((d - first).days <= 180 for d in later):
                c["d180"] += 1
                rep180 += 1

    # 주간: 재구매 고객 주문 비중
    first_date = {k: v[0].order_date for k, v in by_cust.items()}
    weekly: dict[str, dict] = defaultdict(lambda: {"orders": 0, "repeat": 0})
    for o in valid:
        wk = (o.order_date - timedelta(days=o.order_date.weekday())).isoformat()
        w = weekly[wk]
        w["orders"] += 1
        if o.order_date > first_date[o.customer_key()]:
            w["repeat"] += 1

    def pct(a: int, b: int) -> float | None:
        return round(a / b * 100, 1) if b else None

    return {
        "label": label,
        "asof": asof.isoformat(),
        "valid_orders": len(valid),
        "customers": len(by_cust),
        "customers_2plus": sum(1 for v in by_cust.values() if len(v) >= 2),
        "repeat_rate_lifetime_pct": pct(sum(1 for v in by_cust.values() if len(v) >= 2), len(by_cust)),
        "repeat_rate_d90_pct": pct(rep90, mature90),
        "repeat_rate_d90_base": mature90,
        "repeat_rate_d180_pct": pct(rep180, mature180),
        "repeat_rate_d180_base": mature180,
        "cohorts": {
            k: {
                "customers": v["customers"],
                "d90_pct": pct(v["d90"], v["customers"]) if (asof - date.fromisoformat(k + "-01")).days >= 120 else None,
                "d180_pct": pct(v["d180"], v["customers"]) if (asof - date.fromisoformat(k + "-01")).days >= 210 else None,
                "any_repeat_pct": pct(v["any"], v["customers"]),
            }
            for k, v in sorted(cohorts.items())
        },
        "weekly_repeat_order_share": {
            k: {"orders": v["orders"], "repeat_orders": v["repeat"], "repeat_pct": pct(v["repeat"], v["orders"])}
            for k, v in sorted(weekly.items())
        },
    }


def render_markdown(results: list[dict]) -> str:
    lines = ["# 키네메디칼 재구매율", ""]
    lines.append(f"기준일: {results[0]['asof']}  ")
    lines.append("고객 식별: 회원ID > 이메일 > 이름+휴대폰(안심번호 제외) > 이름+우편번호")
    lines.append("")
    lines.append("| 변형 | 유효주문 | 고객수 | 2회이상 | 누적 재구매율 | D+90 재구매율 (분모) | D+180 재구매율 (분모) |")
    lines.append("|---|---|---|---|---|---|---|")
    for r in results:
        lines.append(
            f"| {r['label']} | {r['valid_orders']:,} | {r['customers']:,} | {r['customers_2plus']:,} | "
            f"{r['repeat_rate_lifetime_pct']}% | {r['repeat_rate_d90_pct']}% ({r['repeat_rate_d90_base']:,}) | "
            f"{r['repeat_rate_d180_pct']}% ({r['repeat_rate_d180_base']:,}) |"
        )
    for r in results:
        lines += ["", f"## 월별 첫구매 코호트 — {r['label']}", "", "| 코호트 | 고객수 | D+90 | D+180 | 현재까지 |", "|---|---|---|---|---|"]
        for k, v in r["cohorts"].items():
            d90 = "-" if v["d90_pct"] is None else f"{v['d90_pct']}%"
            d180 = "-" if v["d180_pct"] is None else f"{v['d180_pct']}%"
            lines.append(f"| {k} | {v['customers']:,} | {d90} | {d180} | {v['any_repeat_pct']}% |")
    r = results[0]
    lines += ["", "## 주간 주문 중 재구매 고객 주문 비중 (전체)", "", "| 주 시작 | 주문 | 재구매 주문 | 비중 |", "|---|---|---|---|"]
    for k, v in r["weekly_repeat_order_share"].items():
        lines.append(f"| {k} | {v['orders']} | {v['repeat_orders']} | {v['repeat_pct']}% |")
    return "\n".join(lines) + "\n"


# ----------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", help="카페24 관리자 주문 엑셀(.csv/.xlsx). 없으면 API 호출")
    ap.add_argument("--since", default="2026-01-01")
    ap.add_argument("--until", default=date.today().isoformat())
    ap.add_argument("--out", default="repurchase-report.md")
    ap.add_argument("--json", dest="json_out", default="repurchase-report.json")
    args = ap.parse_args()

    since, until = date.fromisoformat(args.since), date.fromisoformat(args.until)
    if args.input:
        orders = load_export(args.input)
        orders = [o for o in orders if since <= o.order_date <= until]
        print(f"[input] {args.input}: 주문 {len(orders)}건", file=sys.stderr)
    else:
        client = Cafe24Client(os.environ.get("CAFE24_MALL_ID", "bdhoon10"), int(os.environ.get("CAFE24_SHOP_NO", "5")))
        orders = client.orders(since, until)
        print(f"[api] 주문 {len(orders)}건", file=sys.stderr)

    kinepen_customers = {o.customer_key() for o in orders if o.is_kinepen}
    results = [
        analyze(orders, until, "전체"),
        analyze([o for o in orders if not o.is_kinepen], until, "키네펜 주문 제외"),
        analyze([o for o in orders if o.customer_key() not in kinepen_customers], until, "키네펜 구매자 제외"),
    ]
    md = render_markdown(results)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(md)
    with open(args.json_out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print(md)
    print(f"[done] {args.out}, {args.json_out}", file=sys.stderr)


if __name__ == "__main__":
    main()
