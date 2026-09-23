// 德扑助手 Service Worker —— 缓存优先，版本号手更：
// 更新静态资源后把 CACHE 名升版（如 texas-web-v2），activate 时会自动清理旧缓存；
// 每次发布改内容都应升版，否则用户会一直命中旧缓存。
const CACHE = 'texas-web-v5'; // 批次16：引擎预热+报错信息真实化
const ASSETS = ['./', './index.html', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  // 页面导航：网络优先（部署后刷新即见新版），离线回退缓存。
  // cache:'no-cache'（批次11）：绕过浏览器 HTTP 缓存（Pages index.html max-age=600），
  // 否则陈旧 index.html 引用旧 hash 入口 → 静态资源缓存优先命中旧版 → 迟迟不更新
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // 静态资源（文件名含 hash，内容不变）：缓存优先
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    if (e.request.method === 'GET' && res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
