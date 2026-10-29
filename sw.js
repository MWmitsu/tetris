// ============================================================
//  Service Worker (PWA / オフライン対応) — テトリス練習ツール
// ------------------------------------------------------------
//  方針: network-first。オンライン時は常に最新を取得して表示し(取得時にキャッシュも更新)、
//  オフライン時のみキャッシュから配信する。これにより更新が確実に届き、かつオフラインでも起動できる。
//  キャッシュ名(バージョン)を変えると旧キャッシュは activate 時に破棄される。
// ============================================================
const CACHE = 'tetris-practice-v80';

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
  './js/templates_practice.js',
  './js/templates_midgame.js',
  './js/templates_lst.js',
  './js/finesse.js',
  './js/app.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll は1件でも失敗すると全件保存されないため、1件ずつ保存して失敗した分だけ諦める
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
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

// ページからの skipWaiting 要求で即時有効化（保険。install でも skipWaiting 済み）
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 外部オリジンには介入しない
  let sameOrigin = true;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (_) {}
  if (!sameOrigin) return;

  // network-first: 最新を優先。cache:'reload' でブラウザHTTPキャッシュを迂回し、更新を確実に取得。
  // 成功したらSWキャッシュ更新。失敗(オフライン)時はキャッシュ→なければ(画面遷移のときだけ)index.html。
  // ignoreSearch: ページは js/xxx.js?v=NN で読むが CORE は ?v なしで保存するため、クエリを無視して照合する
  // （無いと初回訪問直後のオフライン起動でスクリプトに index.html が返り、アプリが動かない）。
  e.respondWith(
    fetch(req, { cache: 'reload' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          // 保存完了まで SW を終了させない（waitUntil）。万一 waitUntil が使えない時も応答は返す
          const saving = caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          try { e.waitUntil(saving); } catch (_) {}
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
