# 스스로연구소 · SEUSEURO LAB — 웹사이트

상업공간 셀프시공을 핵심으로 한 점포 생애주기 의사결정 플랫폼의 공식 사이트입니다.
빌드 도구 없이 동작하는 **순수 HTML/CSS/JS** 구조라서, GitHub에 올리고 Cloudflare Pages에 연결하면 바로 배포됩니다.

---

## 1. 폴더 구조

```
/
├── index.html            홈
├── mall.html             스스로몰 — 공정별 키트·도구·자재·구매 목록 (제휴 링크 연결)
├── kit-*.html            공정별 키트 15종 (도장·데코타일·필름·템바보드·레일조명·LED·유리시트·실리콘·흡음·보안·진열·사인·입문 공구·원상복구·오픈 점검)
├── diagnosis.html        7분 공사비 절감 진단 (핵심 도구 · 규칙 엔진)
├── sigongso.html         스스로시공소
├── wonsang.html          스스로원상복구 (복구 범위 간이진단 포함)
├── changup.html          스스로창업
├── gonggan.html          스스로공간
├── guide.html            공정 판정 가이드 (27개 공정 · 5축) + 법규·안전 체크
├── resources.html        셀프시공 자료실 허브
├── catalog.html          셀프시공 총정리 315 항목 (필터·검색·구매 링크)
├── tools.html            도구 총정리 46
├── materials.html        자재·부자재 총정리 132
├── stores.html           구매처 디렉토리 92
├── calc.html             산출 계산기 11 + 공식 18 + 설계 기준값 45
├── budget.html           예산 템플릿 (브라우저 저장)
├── checklist.html        공정 순서 17 · 오픈 체크리스트 · 행정·개통 · 검수
├── estimate.html         견적서 검증 신청
├── pricing.html          상품·가격
├── about.html            연구소 소개
├── contact.html          문의·상담 · 파트너 등록
├── admin.html            관리자 — 스스로몰 제휴 링크 등록·클릭 통계·접수 내역 CSV
├── privacy.html / terms.html   개인정보처리방침 · 이용약관
├── 404.html
├── assets/
│   ├── css/style.css     디자인 시스템 (브랜드 컬러 #0D1B2A / #FF6A00)
│   ├── js/data.js        공정 판정 데이터 (27개 공정 · L/S/K/R/E · 업종별 세트)
│   ├── js/diagnosis.js   진단 위저드 + 규칙 엔진
│   ├── js/guide.js       가이드 필터·검색
│   ├── js/catalog-data.js  315개 항목 데이터 (엑셀 '셀프시공총정리'·'출처' 시트에서 생성)
│   ├── js/library-data.js  도구·자재·구매처·법규·체크리스트·기준값·공식 데이터
│   ├── js/library.js     자료실 렌더링·계산기·예산표·체크리스트
│   ├── js/main.js        공통 (내비, 폼 제출, 폴백)
│   ├── js/mall-data.js   스스로몰 상품 160·키트 15 데이터
│   ├── js/mall-links.js  제휴 링크 정적 백업본 (관리 화면에서 내보낸 파일로 교체)
│   ├── js/aff.js         구매 버튼·제휴 링크 적용·'제휴' 표시·구매 목록·클릭 기록
│   ├── js/mall.js        스스로몰 메인 렌더링
│   ├── js/admin.js       관리자 화면
│   └── img/              로고(SVG), 최적화된 사진
├── functions/api/        Cloudflare Pages Functions (서버 API)
│   ├── lead.js           POST /api/lead   — 문의·리포트·견적검증 접수 → D1 저장
│   ├── health.js         GET  /api/health — 배포·DB 연결 상태
│   ├── leads-export.js   GET  /api/leads-export?key= — 리드 CSV (ADMIN_KEY 필요)
│   ├── aff-links.js      GET/POST /api/aff-links — 스스로몰 제휴 링크 조회·저장
│   ├── click.js          POST /api/click — 구매 버튼 클릭 기록 (개인 식별 정보 없음)
│   ├── aff-stats.js      GET  /api/aff-stats — 최근 30일 클릭 통계 (관리자)
│   └── coupang-deeplink.js POST /api/coupang-deeplink — 쿠팡 파트너스 API 일괄 변환 (관리자)
├── docs/스스로몰_운영가이드.md  제휴 프로그램·링크 등록·표시 의무·성과 보는 법
├── schema.sql            D1 데이터베이스 스키마
├── wrangler.toml         (선택) D1 바인딩 설정
├── _headers / _redirects Cloudflare Pages 설정
├── robots.txt / sitemap.xml
└── README.md
```

---

## 2. 배포 — GitHub → Cloudflare Pages (터미널 없이)

### 2-1. GitHub에 올리기
1. github.com 로그인 → **New repository** → 이름 `seuseuro-lab` (Private 권장) → Create.
2. 저장소 화면에서 **Add file → Upload files**.
3. 이 폴더의 **모든 파일과 폴더**를 드래그해서 올립니다. (`assets`, `functions` 폴더 포함. `.gitignore`도 함께)
4. 아래 **Commit changes** 클릭.

> 폴더째 드래그가 안 되면 GitHub Desktop 앱을 쓰거나, 폴더를 열어 안의 파일들을 올린 뒤 같은 방식으로 `assets/css`, `assets/js`, `assets/img`, `functions/api` 를 각각 만들어 올리면 됩니다.

### 2-2. Cloudflare Pages 연결
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. GitHub 연결 후 `seuseuro-lab` 저장소 선택.
3. 빌드 설정:
   - Framework preset: **None**
   - Build command: **(비워 둠)**
   - Build output directory: **`/`** (또는 `.` )
4. **Save and Deploy**. 1~2분 후 `https://seuseuro-lab.pages.dev` 같은 주소가 나옵니다.

이 시점에 사이트는 모두 동작합니다. 7분 진단, 가이드, 원상복구 간이진단은 서버 없이 브라우저에서 돌아갑니다.
문의·리포트 폼은 **DB를 연결하기 전까지** "접수 시스템에 연결하지 못했습니다" 안내와 함께 이메일로 보내도록 폴백합니다.

### 2-3. 이후 수정 방법
GitHub에서 파일을 열어 연필 아이콘으로 수정 → Commit 하면 Cloudflare가 자동으로 재배포합니다.

---

## 3. 데이터베이스(D1) 연결 — 폼 접수를 저장하려면

1. Cloudflare 대시보드 → **Workers & Pages** → **D1 SQL Database** → **Create database** → 이름 `seuseuro-db`.
2. (선택) 만들어진 DB의 **Console** 탭에 `schema.sql` 내용을 붙여넣고 **Execute**. 실행하지 않아도 각 테이블은 처음 사용할 때 자동으로 만들어집니다.
3. **Workers & Pages** → `seuseuro-lab` 프로젝트 → **Settings** → **Bindings** (또는 Functions) → **Add** → **D1 database**
   - Variable name: **`DB`** (반드시 대문자 DB)
   - D1 database: `seuseuro-db`
   - Production / Preview 모두 추가.
4. 같은 Settings → **Environment variables** → **Add**
   - `ADMIN_KEY` = 아무 긴 문자열 (예: 32자 랜덤). 관리자 CSV 다운로드에 씁니다.
5. **Deployments** 탭에서 최신 배포를 **Retry deployment** (바인딩은 재배포 후 적용).
6. 확인: `https://내주소/api/health` 를 열어 `"db":"ok"` 가 보이면 성공.

이후 문의·리포트 신청·견적 검증 신청이 모두 D1의 `leads` 테이블에 저장됩니다.
접수 내역은 `https://내주소/admin` 에서 관리 키를 넣고 CSV로 내려받습니다.

---

## 3-1. 스스로몰 제휴 링크 운영

1. 쿠팡 파트너스에 가입하고 이 홈페이지를 채널로 등록합니다.
2. `https://내주소/admin` → **스스로몰 링크** 탭 → '검색 URL 복사' → 쿠팡 파트너스 '링크 생성'에 붙여넣기 → 만들어진 `link.coupang.com` 주소를 칸에 넣고 **변경 저장**.
3. 저장 즉시 스스로몰·키트·자료실의 같은 검색어 버튼에 적용되고 '제휴' 표시가 붙습니다(방문자 브라우저 캐시 때문에 최대 5~10분).
4. 최종 승인 후 API 키를 받으면 환경변수 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`(Encrypt)를 추가하고 재배포 → '쿠팡 API로 미등록 일괄 변환'.
5. 가끔 **링크 파일 내보내기**로 `mall-links.js`를 받아 `assets/js/` 에 덮어써 두면 D1 없이도 링크가 유지됩니다.

표시 의무, 금지 행위, 판매처별 제휴 수단은 `docs/스스로몰_운영가이드.md`에 정리했습니다.

---

## 4. 배포 후 꼭 바꿀 것

| 항목 | 위치 | 내용 |
|---|---|---|
| 사업자 정보 | 모든 `.html` 하단 footer | `[등록번호 입력]`, `[신고번호 입력]`, `[사업장 주소 입력]` 세 곳을 실제 값으로 |
| 사이트 주소 | 모든 `.html`의 `<link rel="canonical">`, `og:image`, `sitemap.xml`, `robots.txt` | `https://seuseuro.pages.dev` → 실제 도메인으로 찾아바꾸기 |
| 연락처 | footer, contact.html, privacy.html, terms.html, `main.js`(SSR.contactEmail) | 이메일·전화 확인 |
| 가격 | pricing.html, diagnosis.html | 실험 범위 → 확정가로 |
| 공정 판정표 | `assets/js/data.js` | 법무 검토 후 L/S/K/R/E 값·문구 갱신. guide.html 의 "최종 갱신" 날짜도 함께 |
| 스스로몰 데이터 | `assets/js/mall-data.js`, `kit-*.html` | 자료실 엑셀을 고치면 함께 다시 생성해야 합니다 |
| 자료실 데이터 | `assets/js/catalog-data.js`, `library-data.js` | 엑셀(셀프시공 총정리)을 고치면 이 두 파일을 다시 생성해야 합니다. 요청하시면 변환해 드립니다. 가격은 2026.09 조사 시점 참고값 |

> 찾아바꾸기는 GitHub에서 파일마다 편집해도 되고, 로컬에서 텍스트 편집기(VS Code 등)의 "폴더 전체 바꾸기"를 쓰면 한 번에 됩니다.

---

## 5. 커스텀 도메인
Cloudflare Pages 프로젝트 → **Custom domains** → **Set up a custom domain** → 도메인 입력.
도메인이 Cloudflare에 등록돼 있으면 자동으로 연결되고, 아니면 안내되는 CNAME 을 도메인 업체에 등록합니다.

---

## 6. 다음 단계(2차)에서 붙일 것
- **파일 업로드(견적서·현장 사진)**: Cloudflare R2 + `functions/api/upload.js`
- **접수 알림 메일**: Resend 등 메일 API 연동 (`lead.js` 저장 직후 호출)
- **결제**: 토스페이먼츠·포트원 결제 링크 → 리포트 신청 흐름에 삽입
- **관리 화면**: 상태(new/contacted/quoted/closed)·메모 편집 UI
- **진단 정확도 보정**: `leads.payload` 에 쌓이는 진단 답변·결과와 실제 비용을 비교해 `data.js` 갱신

---

## 7. 자주 묻는 것
- **로컬에서 열면 링크가 `.html`로 끝나는데 배포하면 `/sigongso` 처럼 보여요.** 정상입니다. Cloudflare Pages가 자동으로 깔끔한 주소로 바꿔 줍니다.
- **폼을 보냈는데 "연결하지 못했습니다"가 떠요.** D1 바인딩(3번)이 아직 안 된 상태입니다. `api/health` 로 확인하세요.
- **디자인을 바꾸고 싶어요.** `assets/css/style.css` 상단 `:root` 의 색상 변수만 바꾸면 사이트 전체에 적용됩니다.
