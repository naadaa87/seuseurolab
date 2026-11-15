/**
 * 주소 하나로 모으기
 * www.seuseurolab.com, seuseurolab.pages.dev, http:// 로 들어온 요청을
 * https://seuseurolab.com 같은 경로로 301 이동시킵니다.
 * 미리보기 배포 주소(xxxx.seuseurolab.pages.dev)는 그대로 둡니다.
 * 정적 파일(/assets/*)은 _routes.json에서 제외해 이 함수를 거치지 않습니다.
 */
const CANONICAL_HOST = 'seuseurolab.com';
const MOVE_HOSTS = new Set(['www.seuseurolab.com', 'seuseurolab.pages.dev']);

export async function onRequest({ request, next }) {
  const method = request.method;
  if (method === 'GET' || method === 'HEAD') {
    const url = new URL(request.url);
    const moveHost = MOVE_HOSTS.has(url.hostname);
    const toHttps = url.hostname === CANONICAL_HOST && url.protocol === 'http:';
    if (moveHost || toHttps) {
      url.protocol = 'https:';
      url.hostname = CANONICAL_HOST;
      url.port = '';
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=3600' },
      });
    }
  }
  return next();
}
