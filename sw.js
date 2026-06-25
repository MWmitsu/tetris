// ============================================================
//  Service Worker (PWA / オフライン対応) — テトリス練習ツール
// ------------------------------------------------------------
//  方針: network-first。オンライン時は常に最新を取得して表示し(取得時にキャッシュも更新)、
//  オフライン時のみキャッシュから配信する。これにより更新が確実に届き、かつオフラインでも起動できる。
//  キャッシュ名(バージョン)を変えると旧キャッシュは activate 時に破棄される。
// ============================================================
const CACHE = 'tetris-practice-v41';

const CORE = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './js/engine.js',
  './js/templates.js',
  './js/catalog.js',
  './js/catalog_data.js',
  './js/fumen.js',
  './js/honeycup.js',
  './js/honeycup_patterns.js',
  './js/honeycup_simple.js',
  './js/finesse.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .catch(() => {}) // 一部取得失敗でもインストールは継続
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 外部オリジンには介入しない
  let sameOrigin = true;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (_) {}
  if (!sameOrigin) return;

  // network-first: 最新を優先。cache:'reload' でブラウザHTTPキャッシュを迂回し、更新を確実に取得。
  // 成功したらSWキャッシュ更新。失敗(オフライン)時はキャッシュ→なければindex.html。
  e.respondWith(
    fetch(req, { cache: 'reload' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
