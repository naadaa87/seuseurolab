/**
 * 네이버 서치어드바이저 사이트 소유확인 (HTML 파일 방식 · 예비용)
 * 기본 방식은 모든 페이지 <head>의 naver-site-verification 메타 태그입니다.
 * Cloudflare Pages는 /파일.html 주소를 /파일 로 자동 이동시키므로, 정적 파일 대신 이 함수가 정확한 주소에서 바로 응답합니다.
 */
export function onRequestGet() {
  return new Response('naver-site-verification: naver9d5d670f48aa820b6806d0303f15bcc4.html', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
