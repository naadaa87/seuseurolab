#!/usr/bin/env python3
"""내부 링크·대표 주소·사이트맵에서 .html 을 떼어 낸다.

Cloudflare Pages 는 /about.html 을 /about 으로 넘긴다(308). 링크·대표 주소·사이트맵이 .html 로 적혀 있으면
구글 서치 콘솔에 '리디렉션이 포함된 페이지'로 잡히므로, 실제로 열리는 주소(확장자 없는 주소)로 맞춘다.

사용: python3 tools/clean_urls.py [사이트 폴더] [도메인 ...]
      예) python3 tools/clean_urls.py . guspace.kr
"""
import os, re, sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'
hosts = [h.lower() for h in sys.argv[2:]]
SKIP_DIR = {'node_modules', '.git', 'tools', 'functions', 'admin', '_source', 'src', 'scripts', 'build', 'docs', 'notify', 'fragments'}
KEEP = re.compile(r'(^|/)(google[0-9a-f]+|naver[0-9a-f]+|404)\.html$')

def clean_path(p):
    """경로?쿼리#해시 에서 경로 끝의 .html 을 뗀다."""
    m = re.match(r'^([^?#]*)(.*)$', p)
    path, tail = m.group(1), m.group(2)
    if not path.endswith('.html') or KEEP.search(path):
        return p
    if path == 'index.html':
        return './' + tail
    if path.endswith('/index.html'):
        return path[:-len('index.html')] + tail
    return path[:-5] + tail

def clean_url(u):
    u2 = u.strip()
    if re.match(r'^(mailto:|tel:|sms:|javascript:|data:|#)', u2, re.I):
        return u
    m = re.match(r'^((?:https?:)?//([^/?#]+))(.*)$', u2)
    if m:
        if m.group(2).lower() not in hosts:
            return u
        rest = m.group(3) or ''
        if rest in ('/index.html',):
            return m.group(1) + '/'
        return m.group(1) + clean_path(rest)
    return clean_path(u2)

def fix_html(s):
    s = re.sub(r'(<a\b[^>]*?\bhref=)(["\'])([^"\']*)\2', lambda m: m.group(1) + m.group(2) + clean_url(m.group(3)) + m.group(2), s, flags=re.I)
    s = re.sub(r'(<link\b[^>]*?\brel=["\'](?:canonical|alternate)["\'][^>]*?\bhref=)(["\'])([^"\']*)\2', lambda m: m.group(1) + m.group(2) + clean_url(m.group(3)) + m.group(2), s, flags=re.I)
    s = re.sub(r'(<link\b[^>]*?\bhref=)(["\'])([^"\']*)\2([^>]*?\brel=["\'](?:canonical|alternate)["\'])', lambda m: m.group(1) + m.group(2) + clean_url(m.group(3)) + m.group(2) + m.group(4), s, flags=re.I)
    for h in hosts:  # og:url · 구조화 데이터 등 자기 도메인의 절대 주소
        s = re.sub(r'(https?://' + re.escape(h) + r')(/[^"\'\s<>\\]*?)?(/index)?\.html(?=["\'#?\s<\\])',
                   lambda m: m.group(0) if KEEP.search((m.group(2) or '') + (m.group(3) or '') + '.html') else m.group(1) + (m.group(2) or '') + ('/' if m.group(3) else ''), s)
    return s

changed = 0
for d, dirs, files in os.walk(root):
    dirs[:] = [x for x in dirs if x not in SKIP_DIR and not x.startswith('.')]
    for f in files:
        p = os.path.join(d, f)
        if f.endswith('.html'):
            s = open(p, encoding='utf-8').read()
            t = fix_html(s)
        elif re.fullmatch(r'sitemap[^/]*\.xml', f) or f in ('rss.xml', 'feed.xml'):
            s = open(p, encoding='utf-8').read()
            t = re.sub(r'(<(?:loc|link|guid)[^>]*>\s*)([^<\s]+)(\s*</)', lambda m: m.group(1) + clean_url(m.group(2)) + m.group(3), s)
            t = re.sub(r'(<xhtml:link\b[^>]*?\bhref=)(["\'])([^"\']*)\2', lambda m: m.group(1) + m.group(2) + clean_url(m.group(3)) + m.group(2), t)
        else:
            continue
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            changed += 1
print(f'clean_urls: {changed}개 파일 정리')
