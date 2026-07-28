/* =========================================================
   WorkBuddy 个人工作台 —— Service Worker
   功能：缓存应用外壳（app shell），支持离线打开；
        注册后用户添加到手机桌面即可全屏离线使用。
   ========================================================= */
const CACHE_NAME = 'workbuddy-pwa-v1';

// 需要预缓存的核心资源（部署后路径需与仓库根目录一致）
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

/* 安装：预缓存所有静态资源 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // 立即激活，跳过等待
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* 请求拦截：缓存优先（cache first），离线时回退到缓存页 */
self.addEventListener('fetch', (event) => {
  // 仅处理同源 GET 请求，避免干扰外部资源
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // 动态缓存成功响应，扩大离线可用范围
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => {
          // 离线且未缓存：导航请求回退到首页
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
