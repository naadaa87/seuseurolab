# 스스로연구소 · SEUSEURO LAB — 웹사이트

상업공간 셀프시공을 핵심으로 한 점포 생애주기 의사결정 플랫폼의 공식 사이트입니다.
빌드 도구 없이 동작하는 **순수 HTML/CSS/JS** 구조라서, GitHub에 올리고 Cloudflare Pages에 연결하면 바로 배포됩니다.

---

## 1. 폴더 구조

```
/
├── index.html            홈
├── diagnosis.html        7분 공사비 절감 진단 (핵심 도구 · 규칙 엔진)
├── sigongso.html         스스로시공소
├── wonsang.html          스스로원상복구 (복구 범위 간이진단 포함)
├── changup.html          스스로창업
├── gonggan.html          스스로공간
├── guide.html            공정 판정 가이드 (28개 공정 · 5축)
├── estimate.html         견적서 검증 신청
├── pricing.html          상품·가격
├── about.html            연구소 소개
├── contact.html          문의·상담 · 파트너 등록
├── admin.html            접수 내역 CSV 다운로드 (관리자)
├── privacy.html / terms.html   개인정보처리방침 · 이용약관
├── 404.html
├── assets/
│   ├── css/style.css     디자인 시스템 (브랜드 컬러 #0D1B2A / #FF6A00)
│   ├── js/data.js        공정 판정 데이터 (28개 공정 · L/S/K/R/E · 업종별 세트)
│   ├── js/diagnosis.js   진단 위저드 + 규칙 엔진
│   ├── js/guide.js       가이드 필터·검색
│   ├── js/main.js        공통 (내비, 폼 제출, 폴백)
│   └── img/              로고(SVG), 최적화된 사진
├── functions/api/        Cloudflare Pages Functions (서버 API)
│   ├── lead.js           POST /api/lead   — 문의·리포트·견적검증 접수 → D1 저장
│   ├── health.js         GET  /api/health — 배포·DB 연결 상태
│   └── leads-export.js   GET  /api/leads-export?key= — 리드 CSV (ADMIN_KEY 필요)
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
2. 만들어진 DB의 **Console** 탭에 `schema.sql` 내용을 붙여넣고 **Execute**.
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

## 4. 배포 후 꼭 바꿀 것

| 항목 | 위치 | 내용 |
|---|---|---|
| 사업자 정보 | 모든 `.html` 하단 footer | `[등록번호 입력]`, `[신고번호 입력]`, `[사업장 주소 입력]` 세 곳을 실제 값으로 |
| 사이트 주소 | 모든 `.html`의 `<link rel="canonical">`, `og:image`, `sitemap.xml`, `robots.txt` | `https://seuseuro.pages.dev` → 실제 도메인으로 찾아바꾸기 |
| 연락처 | footer, contact.html, privacy.html, terms.html, `main.js`(SSR.contactEmail) | 이메일·전화 확인 |
| 가격 | pricing.html, diagnosis.html | 실험 범위 → 확정가로 |
| 공정 판정표 | `assets/js/data.js` | 법무 검토 후 L/S/K/R/E 값·문구 갱신. guide.html 의 "최종 갱신" 날짜도 함께 |

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
